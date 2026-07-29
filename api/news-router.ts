import { z } from "zod";
import { authedQuery, createRouter } from "./middleware";
import { ensureFreshNews, listNews, refreshNews } from "./queries/news";

export const newsRouter = createRouter({
  list: authedQuery
    .input(z.object({ limit: z.number().int().min(1).max(200).default(100) }).optional())
    .query(async ({ input }) => {
      try {
        await ensureFreshNews();
      } catch {
        // 抓取失败时返回已有缓存
      }
      return listNews(input?.limit ?? 100);
    }),

  refresh: authedQuery.mutation(async () => {
    const count = await refreshNews();
    return { count, items: await listNews(100) };
  }),
});
