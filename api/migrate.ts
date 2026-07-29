import { getDb } from "./queries/connection";

const DDL = `
CREATE TABLE IF NOT EXISTS users (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  name TEXT NOT NULL DEFAULT '我',
  createdAt INTEGER NOT NULL,
  lastSignInAt INTEGER NOT NULL
);
CREATE TABLE IF NOT EXISTS sessions (
  token TEXT PRIMARY KEY,
  userId INTEGER NOT NULL,
  expiresAt INTEGER NOT NULL,
  createdAt INTEGER NOT NULL
);
CREATE TABLE IF NOT EXISTS tasks (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  userId INTEGER NOT NULL,
  title TEXT NOT NULL,
  note TEXT,
  status TEXT NOT NULL DEFAULT 'todo',
  priority TEXT NOT NULL DEFAULT 'medium',
  tags TEXT NOT NULL DEFAULT '',
  dueDate INTEGER,
  completedAt INTEGER,
  createdAt INTEGER NOT NULL,
  updatedAt INTEGER NOT NULL
);
CREATE TABLE IF NOT EXISTS agents (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  userId INTEGER NOT NULL,
  name TEXT NOT NULL,
  description TEXT,
  emoji TEXT NOT NULL DEFAULT '🤖',
  focus TEXT NOT NULL DEFAULT '',
  systemPrompt TEXT,
  status TEXT NOT NULL DEFAULT 'active',
  isBuiltin INTEGER NOT NULL DEFAULT 0,
  createdAt INTEGER NOT NULL,
  updatedAt INTEGER NOT NULL
);
CREATE TABLE IF NOT EXISTS chat_sessions (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  userId INTEGER NOT NULL,
  agentId INTEGER,
  title TEXT NOT NULL DEFAULT '新对话',
  createdAt INTEGER NOT NULL,
  updatedAt INTEGER NOT NULL
);
CREATE TABLE IF NOT EXISTS chat_messages (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  sessionId INTEGER NOT NULL,
  role TEXT NOT NULL,
  content TEXT NOT NULL,
  createdAt INTEGER NOT NULL
);
CREATE TABLE IF NOT EXISTS news_items (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  source TEXT NOT NULL,
  category TEXT NOT NULL DEFAULT '科技',
  title TEXT NOT NULL,
  url TEXT NOT NULL,
  summary TEXT,
  publishedAt INTEGER,
  fetchedAt INTEGER NOT NULL
);
CREATE INDEX IF NOT EXISTS idx_tasks_user ON tasks(userId);
CREATE INDEX IF NOT EXISTS idx_agents_user ON agents(userId);
CREATE INDEX IF NOT EXISTS idx_sessions_user ON chat_sessions(userId);
CREATE INDEX IF NOT EXISTS idx_messages_session ON chat_messages(sessionId);
CREATE INDEX IF NOT EXISTS idx_news_published ON news_items(publishedAt);
CREATE INDEX IF NOT EXISTS idx_sessions_token ON sessions(token);
`;

let ran = false;

/** 幂等建表：服务启动时执行一次。 */
export function ensureTables(): void {
  if (ran) return;
  const db = getDb();
  db.$client.exec(DDL);
  ran = true;
}
