import { mkdirSync } from "node:fs";
import path from "node:path";
import Database from "better-sqlite3";
import { drizzle } from "drizzle-orm/better-sqlite3";
import * as schema from "@db/schema";

let instance: ReturnType<typeof drizzle<typeof schema>>;

function resolveDbPath(): string {
  const p = process.env.DATABASE_PATH || path.resolve(process.cwd(), "data", "app.db");
  mkdirSync(path.dirname(p), { recursive: true });
  return p;
}

export function getDb() {
  if (!instance) {
    const sqlite = new Database(resolveDbPath());
    sqlite.pragma("journal_mode = WAL");
    sqlite.pragma("foreign_keys = ON");
    instance = drizzle(sqlite, { schema });
  }
  return instance;
}
