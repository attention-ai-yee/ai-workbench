import type { Agent, Task } from "@db/schema";
import {
  createTask,
  deleteTask,
  listTasks,
  taskStats,
  updateTask,
} from "../queries/tasks";
import { listAgents } from "../queries/agents";
import { ensureFreshNews, listNews } from "../queries/news";
import { webSearch, webSearchAvailable } from "./web-search";
import { aihotReply } from "./aihot";

// ── 日期解析 ──────────────────────────────────────────────────
function parseDueDate(text: string): Date | null {
  const now = new Date();
  const at = (dayOffset: number, h: number, m = 0) => {
    const d = new Date(now);
    d.setDate(d.getDate() + dayOffset);
    d.setHours(h, m, 0, 0);
    return d;
  };
  if (/今天|今日/.test(text)) {
    if (/今晚|晚上/.test(text)) return at(0, 20);
    if (/下午/.test(text)) return at(0, 14);
    return at(0, 18);
  }
  if (/明天|明日/.test(text)) {
    if (/早上|早晨|上午/.test(text)) return at(1, 9);
    if (/晚上|今晚/.test(text)) return at(1, 20);
    return at(1, 18);
  }
  if (/后天/.test(text)) return at(2, 18);
  const weekMatch = text.match(/下周([一二三四五六日天])/);
  if (weekMatch) {
    const map: Record<string, number> = {
      一: 1, 二: 2, 三: 3, 四: 4, 五: 5, 六: 6, 日: 0, 天: 0,
    };
    const target = map[weekMatch[1]];
    const d = new Date(now);
    const diff = ((target + 7 - d.getDay()) % 7 || 7) + (d.getDay() === target ? 7 : 0);
    d.setDate(d.getDate() + diff);
    d.setHours(18, 0, 0, 0);
    return d;
  }
  return null;
}

function fmtDate(d: Date): string {
  return `${d.getMonth() + 1}月${d.getDate()}日 ${String(d.getHours()).padStart(2, "0")}:${String(d.getMinutes()).padStart(2, "0")}`;
}

// ── 意图：创建事项 ────────────────────────────────────────────
function extractTaskTitle(message: string): string | null {
  const patterns = [
    /(?:提醒我|记一下|帮我记|记录一下)[：:，,]?\s*(.+)/,
    /(?:添加|新增|新建|创建)(?:一个)?(?:事项|任务|待办|备忘)[：:，,]?\s*(.+)/,
    /^(?:事项|任务|待办|备忘)[：:]\s*(.+)/,
  ];
  for (const p of patterns) {
    const m = message.match(p);
    if (m?.[1]?.trim()) return m[1].trim();
  }
  return null;
}

// ── 意图：完成/删除事项 ───────────────────────────────────────
function matchTaskByName(tasks: Task[], name: string): Task | undefined {
  const clean = name.replace(/[的了把「」""''\s]/g, "");
  if (!clean) return undefined;
  return tasks.find((t) => t.title.replace(/\s/g, "").includes(clean));
}

const PRIORITY_LABEL = { low: "低", medium: "中", high: "高" } as const;

function renderTaskLine(t: Task): string {
  const pri = t.priority === "high" ? " 🔴" : t.priority === "low" ? " ⚪" : " 🟡";
  const due = t.dueDate ? ` · 截止 ${fmtDate(t.dueDate)}` : "";
  return `- ${t.title}${pri}${due}`;
}

// ── 主入口 ────────────────────────────────────────────────────
export async function generateReply(
  userId: number,
  agent: Agent,
  message: string,
): Promise<string> {
  const text = message.trim();
  const persona = agent.isBuiltin ? "" : `（${agent.name}）`;

  // AI HOT 资讯助手：走专用数据回复，不进入事项/通用规则
  if (agent.name === "AI HOT") {
    return aihotReply(text);
  }

  // 1. 创建事项
  const taskTitle = extractTaskTitle(text);
  if (taskTitle) {
    const due = parseDueDate(text);
    const priority = /紧急|重要|尽快|加急/.test(text)
      ? "high"
      : (/不急|有空|低优先级/.test(text) ? "low" : "medium");
    const title = taskTitle
      .replace(/^(今天|明天|后天|今晚|下周[一二三四五六日天])+/, "")
      .replace(/(之前|以前)?$/, "")
      .trim() || taskTitle;
    await createTask({
      userId,
      title,
      priority,
      dueDate: due,
      status: "todo",
      tags: "",
    });
    return [
      `✅ 已为你记录事项${persona}：`,
      "",
      `> **${title}**`,
      `- 优先级：${PRIORITY_LABEL[priority]}`,
      due ? `- 截止时间：${fmtDate(due)}` : "- 未设置截止时间",
      "",
      "你可以在「事项」页面查看和管理它。",
    ].join("\n");
  }

  // 2. 完成事项
  const doneMatch = text.match(
    /(?:完成了|做完了|搞定|标记完成|完成)[：:，,]?\s*(.+)/,
  );
  if (doneMatch?.[1]) {
    const candidates = (await listTasks(userId)).filter(
      (t) => t.status !== "done",
    );
    const target = matchTaskByName(candidates, doneMatch[1]);
    if (target) {
      await updateTask(userId, target.id, {
        status: "done",
        completedAt: new Date(),
      });
      return `🎉 已将「**${target.title}**」标记为完成，干得漂亮！`;
    }
    return `没有找到名称包含「${doneMatch[1].trim()}」的待完成事项，可以说「查看我的事项」确认一下。`;
  }

  // 3. 删除事项
  const delMatch = text.match(/(?:删除|取消|移除)(?:这个)?(?:事项|任务|待办)[：:，,]?\s*(.+)/);
  if (delMatch?.[1]) {
    const all = await listTasks(userId);
    const target = matchTaskByName(all, delMatch[1]);
    if (target) {
      await deleteTask(userId, target.id);
      return `🗑️ 已删除事项「**${target.title}**」。`;
    }
    return `没有找到名称包含「${delMatch[1].trim()}」的事项。`;
  }

  // 4. 查询事项
  if (
    /事项|任务|待办|todo/i.test(text) &&
    /什么|哪些|多少|列表|汇总|查看|今天|本周|进展|一下|吗|？|\?/.test(text)
  ) {
    const all = await listTasks(userId);
    const stats = await taskStats(userId);
    const todo = all.filter((t) => t.status === "todo");
    const doing = all.filter((t) => t.status === "doing");
    const lines: string[] = [
      `📋 你的事项概览：共 **${stats.total}** 条（待办 ${stats.todo} · 进行中 ${stats.doing} · 已完成 ${stats.done}）`,
      "",
    ];
    if (doing.length > 0) {
      lines.push("**进行中**", ...doing.slice(0, 5).map(renderTaskLine), "");
    }
    if (todo.length > 0) {
      lines.push("**待办**", ...todo.slice(0, 8).map(renderTaskLine), "");
    }
    if (doing.length === 0 && todo.length === 0) {
      lines.push("当前没有未完成的事项，可以享受一下闲暇，或对我说「记一下 …」添加新事项。");
    }
    return lines.join("\n");
  }

  // 5. 资讯汇总
  if (/资讯|新闻|动态|头条|热点|最新消息/.test(text)) {
    try {
      await ensureFreshNews();
    } catch {
      // 抓取失败时仍用缓存
    }
    const news = await listNews(6);
    if (news.length === 0) {
      return "资讯源暂时不可用，请稍后再试，或直接到「资讯」页面手动刷新。";
    }
    const lines = ["🗞️ 最新科技 / AI 资讯：", ""];
    news.forEach((n, i) => {
      lines.push(`${i + 1}. [${n.title}](${n.url})`);
      lines.push(`   _${n.source}${n.publishedAt ? ` · ${fmtDate(n.publishedAt)}` : ""}_`);
    });
    lines.push("", "更多内容见「资讯」页面。");
    return lines.join("\n");
  }

  // 6. Agent 查询
  if (/agent|助手|智能体/i.test(text) && /哪些|几个|多少|列表|管理/.test(text)) {
    const agents = await listAgents(userId);
    const lines = [`🤖 你当前有 **${agents.length}** 个 Agent：`, ""];
    for (const a of agents) {
      lines.push(
        `- ${a.emoji} **${a.name}**（${a.status === "active" ? "运行中" : "已暂停"}）${a.description ? ` — ${a.description}` : ""}`,
      );
    }
    lines.push("", "在「Agent 中心」可以新建、配置或暂停它们。");
    return lines.join("\n");
  }

  // 7. 帮助
  if (/帮助|你能做什么|会什么|怎么用|使用说明|功能介绍/.test(text)) {
    return [
      agent.isBuiltin
        ? "👋 我是工作台助手，以下是我的核心能力："
        : `👋 我是「${agent.name}」，以下是我的核心能力：`,
      "",
      "**📝 事项管理**",
      "- 「记一下 明天下午和产品组开会」— 快速记录事项",
      "- 「我今天有哪些事项？」— 查看待办与进展",
      "- 「完成了 写周报」— 标记完成",
      "",
      "**🗞️ 资讯服务**",
      "- 「有什么最新 AI 资讯？」— 聚合 36氪、机器之心、Hacker News 等来源",
      "",
      "**🌐 联网问答**",
      "- 直接提问即可，例如「最近大模型行业有什么动态？」",
      "",
      "也可以直接在页面上操作：事项、资讯、Agent 中心都有完整的管理界面。",
    ].join("\n");
  }

  // 8. 兜底：联网搜索问答
  if (webSearchAvailable()) {
    try {
      const results = await webSearch(text, 5);
      if (results && results.length > 0) {
        const lines = [`🌐 我联网检索了「${text}」，为你整理如下：`, ""];
        results.slice(0, 3).forEach((r, i) => {
          const snippet = (r.content ?? "").replace(/\s+/g, " ").trim();
          const short =
            snippet.length > 180 ? snippet.slice(0, 180) + "…" : snippet;
          lines.push(`**${i + 1}. ${r.title ?? "检索结果"}**`);
          if (short) lines.push(short);
          lines.push("");
        });
        const sources = results
          .slice(0, 4)
          .filter((r) => r.url)
          .map((r) => `- [${r.title ?? r.url}](${r.url})`);
        if (sources.length > 0) {
          lines.push("**参考来源**", ...sources);
        }
        return lines.join("\n");
      }
    } catch {
      // fallthrough
    }
    return `抱歉，联网检索暂时不可用。你可以换个说法再试，或者说「帮助」看看我能做什么。`;
  }

  return [
    `我收到了你的消息：「${text}」。`,
    "",
    "我目前擅长：记录/查询/完成事项、汇总最新资讯。试试说「记一下 …」「我今天有哪些事项？」或「最新 AI 资讯」。",
  ].join("\n");
}
