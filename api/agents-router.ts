import { z } from "zod";
import { TRPCError } from "@trpc/server";
import { authedQuery, createRouter } from "./middleware";
import {
  createAgent,
  deleteAgent,
  ensureBuiltinAgent,
  findAgentById,
  listAgents,
  updateAgent,
} from "./queries/agents";

const agentInput = z.object({
  name: z.string().min(1).max(255),
  description: z.string().max(2000).optional(),
  emoji: z.string().max(16).optional(),
  focus: z.string().max(255).optional(),
  systemPrompt: z.string().max(5000).optional(),
});

export const agentsRouter = createRouter({
  list: authedQuery.query(async ({ ctx }) => {
    await ensureBuiltinAgent(ctx.user.id);
    return listAgents(ctx.user.id);
  }),

  get: authedQuery
    .input(z.object({ id: z.number().int().positive() }))
    .query(async ({ ctx, input }) => {
      const agent = await findAgentById(ctx.user.id, input.id);
      if (!agent) throw new TRPCError({ code: "NOT_FOUND" });
      return agent;
    }),

  create: authedQuery.input(agentInput).mutation(async ({ ctx, input }) => {
    const id = await createAgent({
      userId: ctx.user.id,
      name: input.name,
      description: input.description ?? null,
      emoji: input.emoji ?? "🤖",
      focus: input.focus ?? "",
      systemPrompt: input.systemPrompt ?? null,
      status: "active",
      isBuiltin: false,
    });
    return { id };
  }),

  update: authedQuery
    .input(z.object({ id: z.number().int().positive(), patch: agentInput.partial() }))
    .mutation(async ({ ctx, input }) => {
      const existing = await findAgentById(ctx.user.id, input.id);
      if (!existing) throw new TRPCError({ code: "NOT_FOUND" });
      await updateAgent(ctx.user.id, input.id, input.patch);
      return { ok: true };
    }),

  toggle: authedQuery
    .input(z.object({ id: z.number().int().positive() }))
    .mutation(async ({ ctx, input }) => {
      const existing = await findAgentById(ctx.user.id, input.id);
      if (!existing) throw new TRPCError({ code: "NOT_FOUND" });
      const next = existing.status === "active" ? "paused" : "active";
      await updateAgent(ctx.user.id, input.id, { status: next });
      return { status: next };
    }),

  remove: authedQuery
    .input(z.object({ id: z.number().int().positive() }))
    .mutation(async ({ ctx, input }) => {
      const existing = await findAgentById(ctx.user.id, input.id);
      if (!existing) throw new TRPCError({ code: "NOT_FOUND" });
      if (existing.isBuiltin) {
        throw new TRPCError({
          code: "BAD_REQUEST",
          message: "内置助手不能删除",
        });
      }
      await deleteAgent(ctx.user.id, input.id);
      return { ok: true };
    }),
});
