import { z } from "zod";
import { TRPCError } from "@trpc/server";
import { authedQuery, createRouter } from "./middleware";
import {
  createTask,
  deleteTask,
  findTaskById,
  listTasks,
  taskStats,
  updateTask,
} from "./queries/tasks";

const taskInput = z.object({
  title: z.string().min(1).max(500),
  note: z.string().max(5000).optional(),
  status: z.enum(["todo", "doing", "done"]).optional(),
  priority: z.enum(["low", "medium", "high"]).optional(),
  tags: z.string().max(500).optional(),
  dueDate: z.date().nullish(),
});

export const tasksRouter = createRouter({
  list: authedQuery.query(({ ctx }) => listTasks(ctx.user.id)),

  stats: authedQuery.query(({ ctx }) => taskStats(ctx.user.id)),

  create: authedQuery.input(taskInput).mutation(async ({ ctx, input }) => {
    const id = await createTask({
      userId: ctx.user.id,
      title: input.title,
      note: input.note ?? null,
      status: input.status ?? "todo",
      priority: input.priority ?? "medium",
      tags: input.tags ?? "",
      dueDate: input.dueDate ?? null,
    });
    return { id };
  }),

  update: authedQuery
    .input(z.object({ id: z.number().int().positive(), patch: taskInput.partial() }))
    .mutation(async ({ ctx, input }) => {
      const existing = await findTaskById(ctx.user.id, input.id);
      if (!existing) throw new TRPCError({ code: "NOT_FOUND" });
      const patch = { ...input.patch };
      if (patch.status === "done" && existing.status !== "done") {
        patch.dueDate = patch.dueDate ?? existing.dueDate;
        await updateTask(ctx.user.id, input.id, {
          ...patch,
          completedAt: new Date(),
        });
        return { ok: true };
      }
      if (patch.status && patch.status !== "done") {
        await updateTask(ctx.user.id, input.id, { ...patch, completedAt: null });
        return { ok: true };
      }
      await updateTask(ctx.user.id, input.id, patch);
      return { ok: true };
    }),

  remove: authedQuery
    .input(z.object({ id: z.number().int().positive() }))
    .mutation(async ({ ctx, input }) => {
      await deleteTask(ctx.user.id, input.id);
      return { ok: true };
    }),
});
