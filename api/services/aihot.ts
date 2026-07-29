// AI HOT 公开 API v1 封装（只读、无需认证）
// 文档：https://aihot.virxact.com/openapi-v1.json
// 用途：为「AI HOT」Agent 提供实时 AI 资讯数据。

const BASE = "https://aihot.virxact.com";
const UA =
  "Mozilla/5.0 (compatible; AIWorkbenchBot/1.0; +aihot-agent)";
const TIMEOUT_MS = 12000;

async function fetchJson<T>(path: string): Promise<T> {
  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), TIMEOUT_MS);
  try {
    const res = await fetch(`${BASE}${path}`, {
      signal: controller.signal,
      headers: { "User-Agent": UA, Accept: "application/json" },
    });
    if (!res.ok) throw new Error(`AI HOT ${path} -> HTTP ${res.status}`);
    return (await res.json()) as T;
  } finally {
    clearTimeout(timer);
  }
}

type HotTopic = {
  id: string;
  title: string;
  source?: { name?: string };
  links?: { aihot?: string; original?: string };
  sourceCount?: number;
  signalCount?: number;
};

type LatestItem = {
  id: string;
  title: string;
  originalTitle?: string;
  summary?: string;
  source?: { name?: string };
  links?: { aihot?: string; original?: string };
  publishedAt?: string;
};

type DailyReport = {
  date?: string;
  sections?: Array<{
    label?: string;
    items?: Array<{ title?: string; summary?: string }>;
  }>;
};

function fmtDate(v?: string): string {
  if (!v) return "";
  const d = new Date(v);
  if (Number.isNaN(d.getTime())) return v;
  return `${d.getMonth() + 1}月${d.getDate()}日`;
}

/** 实时热点（正在火） */
export async function fetchHotTopics(): Promise<HotTopic[]> {
  const data = await fetchJson<{ items?: HotTopic[] }>(
    "/api/v1/hot-topics",
  );
  return data.items ?? [];
}

/** 最近精选资讯 */
export async function fetchLatestItems(limit = 6): Promise<LatestItem[]> {
  const data = await fetchJson<{ items?: LatestItem[] }>("/api/v1/items");
  return (data.items ?? []).slice(0, limit);
}

/** 最新 AI 日报 */
export async function fetchDaily(): Promise<DailyReport | null> {
  try {
    return await fetchJson<{ report?: DailyReport }>(
      "/api/v1/dailies/latest",
    ).then((d) => d.report ?? null);
  } catch {
    return null;
  }
}

/** 是否可按意图提供 AI HOT 数据。 */
export function aihotAvailable(): boolean {
  return true;
}

/**
 * AI HOT Agent 的回复引擎：按消息意图选择数据源，
 * 失败时降级为引导文案。返回 Markdown。
 */
export async function aihotReply(message: string): Promise<string> {
  const text = message.trim();

  // 帮助
  if (/帮助|你能做什么|会什么|怎么用|使用说明|功能介绍/.test(text)) {
    return [
      "📡 我是「AI HOT」资讯助手，数据来自 [AI HOT](https://aihot.virxact.com)，能为你提供实时 AI 行业动态：",
      "",
      "**🔥 实时热点**",
      "- 「现在有什么热点？」「AI 圈正在火什么？」- 当下最受关注的 AI 话题",
      "",
      "**📰 最新资讯**",
      "- 「最新 AI 资讯」「最近有什么大模型新闻？」- 近期精选动态（带摘要）",
      "",
      "**📋 AI 日报**",
      "- 「今天的 AI 日报」「昨天发生了什么？」- 每日 AI 大事记，按主题分类",
      "",
      "直接提问即可，例如「Kimi K3 有什么新消息？」「最近大模型行业动态」。",
    ].join("\n");
  }

  // AI 日报
  if (/日报|今天.*发生|今日.*大事|昨日|昨天.*大事|每日|daily|每天/.test(text)) {
    const daily = await fetchDaily();
    if (!daily) {
      return "AI 日报暂时获取失败，请稍后再试，或改问「最新 AI 资讯」查看近期动态。";
    }
    const lines: string[] = [`📋 AI 日报 · ${daily.date ?? "最新"}`, ""];
    for (const section of daily.sections ?? []) {
      const items = (section.items ?? []).slice(0, 4);
      if (!items.length) continue;
      lines.push(`**${section.label ?? "动态"}**`);
      for (const it of items) {
        lines.push(`- ${it.title ?? ""}`);
      }
      lines.push("");
    }
    lines.push("完整日报见「资讯」页面或 [AI HOT 日报](https://aihot.virxact.com/daily)。");
    return lines.join("\n");
  }

  // 实时热点
  if (/热点|趋势|正在火|热门|trending|上榜|热议|火什么/.test(text)) {
    const topics = await fetchHotTopics();
    if (!topics.length) {
      return "实时热点暂时获取失败，请稍后再试。";
    }
    const lines = ["🔥 当下 AI 热点：", ""];
    topics.forEach((t, i) => {
      const signals = t.signalCount ? ` · ${t.signalCount} 个信号` : "";
      const src = t.source?.name ? ` _${t.source.name}_` : "";
      lines.push(`${i + 1}. **[${t.title}](${t.links?.aihot ?? t.links?.original ?? ""})**${src}${signals}`);
    });
    lines.push("", "数据来自 AI HOT，更多内容见「资讯」页面。");
    return lines.join("\n");
  }

  // 默认：最新资讯
  const items = await fetchLatestItems(6);
  if (!items.length) {
    return "最新资讯暂时获取失败，请稍后再试，或说「帮助」查看我能做什么。";
  }
  const lines = ["📰 最新 AI 资讯：", ""];
  items.forEach((it, i) => {
    const src = it.source?.name ? ` _${it.source.name}_` : "";
    lines.push(`**${i + 1}. [${it.title}](${it.links?.aihot ?? it.links?.original ?? ""})**${src}`);
    if (it.summary) {
      const s = it.summary.length > 120 ? it.summary.slice(0, 120) + "…" : it.summary;
      lines.push(`   ${s}`);
    }
  });
  lines.push("", `数据来自 [AI HOT](https://aihot.virxact.com)，${fmtDate(items[0]?.publishedAt)} 更新。`);
  return lines.join("\n");
}
