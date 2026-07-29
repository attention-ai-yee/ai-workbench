import { and, asc, desc, eq } from "drizzle-orm";
import * as schema from "@db/schema";
import type { ChatMessage, ChatSession } from "@db/schema";
import { getDb } from "./connection";

export async function listSessions(userId: number): Promise<ChatSession[]> {
  return getDb()
    .select()
    .from(schema.chatSessions)
    .where(eq(schema.chatSessions.userId, userId))
    .orderBy(desc(schema.chatSessions.updatedAt));
}

export async function findSessionById(
  userId: number,
  id: number,
): Promise<ChatSession | undefined> {
  const rows = await getDb()
    .select()
    .from(schema.chatSessions)
    .where(
      and(eq(schema.chatSessions.id, id), eq(schema.chatSessions.userId, userId)),
    )
    .limit(1);
  return rows.at(0);
}

export async function createSession(
  userId: number,
  agentId: number | null,
  title: string,
): Promise<number> {
  const rows = await getDb()
    .insert(schema.chatSessions)
    .values({ userId, agentId, title })
    .returning({ id: schema.chatSessions.id });
  return rows[0].id;
}

export async function touchSession(id: number, title?: string): Promise<void> {
  await getDb()
    .update(schema.chatSessions)
    .set({ updatedAt: new Date(), ...(title ? { title } : {}) })
    .where(eq(schema.chatSessions.id, id));
}

export async function deleteSession(userId: number, id: number): Promise<void> {
  await getDb()
    .delete(schema.chatMessages)
    .where(eq(schema.chatMessages.sessionId, id));
  await getDb()
    .delete(schema.chatSessions)
    .where(
      and(eq(schema.chatSessions.id, id), eq(schema.chatSessions.userId, userId)),
    );
}

export async function listMessages(sessionId: number): Promise<ChatMessage[]> {
  return getDb()
    .select()
    .from(schema.chatMessages)
    .where(eq(schema.chatMessages.sessionId, sessionId))
    .orderBy(asc(schema.chatMessages.createdAt), asc(schema.chatMessages.id));
}

export async function addMessage(
  sessionId: number,
  role: "user" | "assistant",
  content: string,
): Promise<number> {
  const rows = await getDb()
    .insert(schema.chatMessages)
    .values({ sessionId, role, content })
    .returning({ id: schema.chatMessages.id });
  return rows[0].id;
}
