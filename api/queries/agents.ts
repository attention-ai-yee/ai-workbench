import { and, desc, eq } from "drizzle-orm";
import * as schema from "@db/schema";
import type { Agent, InsertAgent } from "@db/schema";
import { getDb } from "./connection";

export async function listAgents(userId: number): Promise<Agent[]> {
  return getDb()
    .select()
    .from(schema.agents)
    .where(eq(schema.agents.userId, userId))
    .orderBy(desc(schema.agents.isBuiltin), desc(schema.agents.createdAt));
}

export async function findAgentById(
  userId: number,
  id: number,
): Promise<Agent | undefined> {
  const rows = await getDb()
    .select()
    .from(schema.agents)
    .where(and(eq(schema.agents.id, id), eq(schema.agents.userId, userId)))
    .limit(1);
  return rows.at(0);
}

export async function createAgent(data: InsertAgent): Promise<number> {
  const rows = await getDb()
    .insert(schema.agents)
    .values(data)
    .returning({ id: schema.agents.id });
  return rows[0].id;
}

export async function updateAgent(
  userId: number,
  id: number,
  patch: Partial<InsertAgent>,
): Promise<void> {
  await getDb()
    .update(schema.agents)
    .set({ ...patch, updatedAt: new Date() })
    .where(and(eq(schema.agents.id, id), eq(schema.agents.userId, userId)));
}

export async function deleteAgent(userId: number, id: number): Promise<void> {
  await getDb()
    .delete(schema.agents)
    .where(and(eq(schema.agents.id, id), eq(schema.agents.userId, userId)));
}

/** 确保用户拥有内置的「工作台助手」。 */
export async function ensureBuiltinAgent(userId: number): Promise<Agent> {
  const existing = await getDb()
    .select()
    .from(schema.agents)
    .where(
      and(
        eq(schema.agents.userId, userId),
        eq(schema.agents.isBuiltin, true),
        eq(schema.agents.name, "工作台助手"),
      ),
    )
    .limit(1);
  if (existing.length > 0) return existing[0];
  const id = await createAgent({
    userId,
    name: "工作台助手",
    description:
      "内置智能助手：帮你记录事项、查询待办、汇总最新资讯，并能联网搜索回答问题。",
    emoji: "✨",
    focus: "工作台效率与资讯问答",
    systemPrompt:
      "你是 AI 工作台的智能助手，擅长事项管理、资讯汇总与联网问答，回答简洁、有条理。",
    status: "active",
    isBuiltin: true,
  });
  const created = await findAgentById(userId, id);
  return created!;
}

/** 确保用户拥有内置的「AI HOT」资讯助手（接入 aihot.virxact.com 公开 API）。 */
export async function ensureAihotAgent(userId: number): Promise<Agent> {
  const existing = await getDb()
    .select()
    .from(schema.agents)
    .where(
      and(
        eq(schema.agents.userId, userId),
        eq(schema.agents.isBuiltin, true),
        eq(schema.agents.name, "AI HOT"),
      ),
    )
    .limit(1);
  if (existing.length > 0) return existing[0];
  const id = await createAgent({
    userId,
    name: "AI HOT",
    description:
      "AI 资讯助手：接入 AI HOT 实时数据，提供 AI 行业热点、最新资讯与每日日报。",
    emoji: "📡",
    focus: "AI 资讯实时热点",
    systemPrompt:
      "你是基于 AI HOT (aihot.virxact.com) 公开 API 的 AI 资讯助手，能提供实时热点、最新资讯与每日日报，回答简洁、带来源链接。",
    status: "active",
    isBuiltin: true,
  });
  const created = await findAgentById(userId, id);
  return created!;
}
