import { z } from "zod";
import { TRPCError } from "@trpc/server";
import { authedQuery, createRouter } from "./middleware";
import {
  addMessage,
  createSession,
  deleteSession,
  findSessionById,
  listMessages,
  listSessions,
  touchSession,
} from "./queries/chat";
import { findAgentById } from "./queries/agents";
import { generateReply } from "./services/assistant";

export const chatRouter = createRouter({
  listSessions: authedQuery.query(({ ctx }) => listSessions(ctx.user.id)),

  createSession: authedQuery
    .input(z.object({ agentId: z.number().int().positive().optional() }))
    .mutation(async ({ ctx, input }) => {
      const id = await createSession(ctx.user.id, input.agentId ?? null, "新对话");
      return { id };
    }),

  messages: authedQuery
    .input(z.object({ sessionId: z.number().int().positive() }))
    .query(async ({ ctx, input }) => {
      const session = await findSessionById(ctx.user.id, input.sessionId);
      if (!session) throw new TRPCError({ code: "NOT_FOUND" });
      return listMessages(input.sessionId);
    }),

  send: authedQuery
    .input(
      z.object({
        sessionId: z.number().int().positive(),
        agentId: z.number().int().positive(),
        content: z.string().min(1).max(4000),
      }),
    )
    .mutation(async ({ ctx, input }) => {
      const session = await findSessionById(ctx.user.id, input.sessionId);
      if (!session) throw new TRPCError({ code: "NOT_FOUND" });
      const agent = await findAgentById(ctx.user.id, input.agentId);
      if (!agent) throw new TRPCError({ code: "NOT_FOUND" });

      await addMessage(input.sessionId, "user", input.content);
      const reply = await generateReply(ctx.user.id, agent, input.content);
      await addMessage(input.sessionId, "assistant", reply);

      // 首条消息后用内容概括会话标题
      if (session.title === "新对话") {
        const title =
          input.content.length > 20
            ? input.content.slice(0, 20) + "…"
            : input.content;
        await touchSession(input.sessionId, title);
      } else {
        await touchSession(input.sessionId);
      }

      return { reply };
    }),

  removeSession: authedQuery
    .input(z.object({ id: z.number().int().positive() }))
    .mutation(async ({ ctx, input }) => {
      await deleteSession(ctx.user.id, input.id);
      return { ok: true };
    }),
});
