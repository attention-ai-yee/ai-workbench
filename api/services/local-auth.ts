import { randomBytes, randomUUID, timingSafeEqual } from "node:crypto";
import { and, eq, gt } from "drizzle-orm";
import * as schema from "@db/schema";
import type { User } from "@db/schema";
import { getDb } from "../queries/connection";

const SESSION_TTL_MS = 30 * 24 * 60 * 60 * 1000; // 30 天

/** 访问令牌：优先取环境变量 ACCESS_TOKEN，缺省为 ai-workbench。 */
export function configuredAccessToken(): string {
  return process.env.ACCESS_TOKEN || "ai-workbench";
}

export function verifyAccessToken(token: string): boolean {
  const expected = configuredAccessToken();
  const a = Buffer.from(token);
  const b = Buffer.from(expected);
  return a.length === b.length && timingSafeEqual(a, b);
}

// ── 单用户 ────────────────────────────────────────────────────
/** 确保唯一的用户记录存在，返回该用户。 */
export function ensureOwner(): User {
  const existing = getDb().select().from(schema.users).limit(1).get();
  if (existing) return existing;
  getDb().insert(schema.users).values({ name: "我" }).run();
  return getDb().select().from(schema.users).limit(1).get()!;
}

export function touchSignIn(userId: number): void {
  getDb()
    .update(schema.users)
    .set({ lastSignInAt: new Date() })
    .where(eq(schema.users.id, userId))
    .run();
}

// ── 会话 ──────────────────────────────────────────────────────
export function createSession(userId: number): { token: string; expiresAt: Date } {
  const token = randomUUID() + randomBytes(16).toString("hex");
  const expiresAt = new Date(Date.now() + SESSION_TTL_MS);
  getDb()
    .insert(schema.sessions)
    .values({ token, userId, expiresAt })
    .run();
  return { token, expiresAt };
}

export function findSessionUser(token: string): User | undefined {
  const row = getDb()
    .select({ user: schema.users })
    .from(schema.sessions)
    .innerJoin(schema.users, eq(schema.sessions.userId, schema.users.id))
    .where(
      and(
        eq(schema.sessions.token, token),
        gt(schema.sessions.expiresAt, new Date()),
      ),
    )
    .limit(1)
    .get();
  return row?.user;
}

export function deleteSession(token: string): void {
  getDb().delete(schema.sessions).where(eq(schema.sessions.token, token)).run();
}
