import { and, desc, eq } from "drizzle-orm";
import * as schema from "@db/schema";
import type { InsertTask, Task } from "@db/schema";
import { getDb } from "./connection";

export async function listTasks(userId: number): Promise<Task[]> {
  return getDb()
    .select()
    .from(schema.tasks)
    .where(eq(schema.tasks.userId, userId))
    .orderBy(desc(schema.tasks.updatedAt));
}

export async function findTaskById(
  userId: number,
  id: number,
): Promise<Task | undefined> {
  const rows = await getDb()
    .select()
    .from(schema.tasks)
    .where(and(eq(schema.tasks.id, id), eq(schema.tasks.userId, userId)))
    .limit(1);
  return rows.at(0);
}

export async function createTask(data: InsertTask): Promise<number> {
  const rows = await getDb()
    .insert(schema.tasks)
    .values(data)
    .returning({ id: schema.tasks.id });
  return rows[0].id;
}

export async function updateTask(
  userId: number,
  id: number,
  patch: Partial<InsertTask>,
): Promise<void> {
  await getDb()
    .update(schema.tasks)
    .set({ ...patch, updatedAt: new Date() })
    .where(and(eq(schema.tasks.id, id), eq(schema.tasks.userId, userId)));
}

export async function deleteTask(userId: number, id: number): Promise<void> {
  await getDb()
    .delete(schema.tasks)
    .where(and(eq(schema.tasks.id, id), eq(schema.tasks.userId, userId)));
}

export async function taskStats(userId: number) {
  const all = await getDb()
    .select()
    .from(schema.tasks)
    .where(eq(schema.tasks.userId, userId));
  const today = new Date();
  today.setHours(0, 0, 0, 0);
  const tomorrow = new Date(today);
  tomorrow.setDate(tomorrow.getDate() + 1);
  return {
    total: all.length,
    todo: all.filter((t) => t.status === "todo").length,
    doing: all.filter((t) => t.status === "doing").length,
    done: all.filter((t) => t.status === "done").length,
    dueToday: all.filter(
      (t) =>
        t.status !== "done" &&
        t.dueDate &&
        t.dueDate >= today &&
        t.dueDate < tomorrow,
    ).length,
  };
}
