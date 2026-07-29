import { integer, sqliteTable, text } from "drizzle-orm/sqlite-core";

// ── 用户（单用户工作台） ──────────────────────────────────────
export const users = sqliteTable("users", {
  id: integer("id").primaryKey({ autoIncrement: true }),
  name: text("name").notNull().default("我"),
  createdAt: integer("createdAt", { mode: "timestamp_ms" })
    .notNull()
    .$defaultFn(() => new Date()),
  lastSignInAt: integer("lastSignInAt", { mode: "timestamp_ms" })
    .notNull()
    .$defaultFn(() => new Date()),
});

export type User = typeof users.$inferSelect;
export type InsertUser = typeof users.$inferInsert;

// ── 登录会话 ──────────────────────────────────────────────────
export const sessions = sqliteTable("sessions", {
  token: text("token").primaryKey(),
  userId: integer("userId").notNull(),
  expiresAt: integer("expiresAt", { mode: "timestamp_ms" }).notNull(),
  createdAt: integer("createdAt", { mode: "timestamp_ms" })
    .notNull()
    .$defaultFn(() => new Date()),
});

export type Session = typeof sessions.$inferSelect;

// ── 事项（任务/笔记） ─────────────────────────────────────────
export const tasks = sqliteTable("tasks", {
  id: integer("id").primaryKey({ autoIncrement: true }),
  userId: integer("userId").notNull(),
  title: text("title").notNull(),
  note: text("note"),
  status: text("status", { enum: ["todo", "doing", "done"] })
    .notNull()
    .default("todo"),
  priority: text("priority", { enum: ["low", "medium", "high"] })
    .notNull()
    .default("medium"),
  tags: text("tags").notNull().default(""),
  dueDate: integer("dueDate", { mode: "timestamp_ms" }),
  completedAt: integer("completedAt", { mode: "timestamp_ms" }),
  createdAt: integer("createdAt", { mode: "timestamp_ms" })
    .notNull()
    .$defaultFn(() => new Date()),
  updatedAt: integer("updatedAt", { mode: "timestamp_ms" })
    .notNull()
    .$defaultFn(() => new Date())
    .$onUpdate(() => new Date()),
});

export type Task = typeof tasks.$inferSelect;
export type InsertTask = typeof tasks.$inferInsert;

// ── AI Agent ──────────────────────────────────────────────────
export const agents = sqliteTable("agents", {
  id: integer("id").primaryKey({ autoIncrement: true }),
  userId: integer("userId").notNull(),
  name: text("name").notNull(),
  description: text("description"),
  emoji: text("emoji").notNull().default("🤖"),
  focus: text("focus").notNull().default(""),
  systemPrompt: text("systemPrompt"),
  status: text("status", { enum: ["active", "paused"] })
    .notNull()
    .default("active"),
  isBuiltin: integer("isBuiltin", { mode: "boolean" }).notNull().default(false),
  createdAt: integer("createdAt", { mode: "timestamp_ms" })
    .notNull()
    .$defaultFn(() => new Date()),
  updatedAt: integer("updatedAt", { mode: "timestamp_ms" })
    .notNull()
    .$defaultFn(() => new Date())
    .$onUpdate(() => new Date()),
});

export type Agent = typeof agents.$inferSelect;
export type InsertAgent = typeof agents.$inferInsert;

// ── 对话会话与消息 ────────────────────────────────────────────
export const chatSessions = sqliteTable("chat_sessions", {
  id: integer("id").primaryKey({ autoIncrement: true }),
  userId: integer("userId").notNull(),
  agentId: integer("agentId"),
  title: text("title").notNull().default("新对话"),
  createdAt: integer("createdAt", { mode: "timestamp_ms" })
    .notNull()
    .$defaultFn(() => new Date()),
  updatedAt: integer("updatedAt", { mode: "timestamp_ms" })
    .notNull()
    .$defaultFn(() => new Date())
    .$onUpdate(() => new Date()),
});

export type ChatSession = typeof chatSessions.$inferSelect;

export const chatMessages = sqliteTable("chat_messages", {
  id: integer("id").primaryKey({ autoIncrement: true }),
  sessionId: integer("sessionId").notNull(),
  role: text("role", { enum: ["user", "assistant"] }).notNull(),
  content: text("content").notNull(),
  createdAt: integer("createdAt", { mode: "timestamp_ms" })
    .notNull()
    .$defaultFn(() => new Date()),
});

export type ChatMessage = typeof chatMessages.$inferSelect;

// ── 资讯缓存（全局共享） ──────────────────────────────────────
export const newsItems = sqliteTable("news_items", {
  id: integer("id").primaryKey({ autoIncrement: true }),
  source: text("source").notNull(),
  category: text("category").notNull().default("科技"),
  title: text("title").notNull(),
  url: text("url").notNull(),
  summary: text("summary"),
  publishedAt: integer("publishedAt", { mode: "timestamp_ms" }),
  fetchedAt: integer("fetchedAt", { mode: "timestamp_ms" })
    .notNull()
    .$defaultFn(() => new Date()),
});

export type NewsItem = typeof newsItems.$inferSelect;
