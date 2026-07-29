import { authRouter } from "./auth-router";
import { tasksRouter } from "./tasks-router";
import { newsRouter } from "./news-router";
import { agentsRouter } from "./agents-router";
import { chatRouter } from "./chat-router";
import { createRouter, publicQuery } from "./middleware";

export const appRouter = createRouter({
  ping: publicQuery.query(() => ({ ok: true, ts: Date.now() })),
  auth: authRouter,
  tasks: tasksRouter,
  news: newsRouter,
  agents: agentsRouter,
  chat: chatRouter,
});

export type AppRouter = typeof appRouter;
