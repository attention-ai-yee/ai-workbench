import { desc, lt } from "drizzle-orm";
import * as schema from "@db/schema";
import type { NewsItem } from "@db/schema";
import { getDb } from "./connection";
import { fetchAllNews } from "../services/news-fetcher";

const REFRESH_INTERVAL_MS = 20 * 60 * 1000; // 20 分钟缓存
const KEEP_DAYS = 3;

export async function listNews(limit = 100): Promise<NewsItem[]> {
  return getDb()
    .select()
    .from(schema.newsItems)
    .orderBy(desc(schema.newsItems.publishedAt), desc(schema.newsItems.id))
    .limit(limit);
}

export async function latestFetchedAt(): Promise<Date | null> {
  const rows = await getDb()
    .select({ fetchedAt: schema.newsItems.fetchedAt })
    .from(schema.newsItems)
    .orderBy(desc(schema.newsItems.fetchedAt))
    .limit(1);
  return rows.at(0)?.fetchedAt ?? null;
}

/** 从各资讯源抓取最新内容并重建缓存。返回抓取条数。 */
export async function refreshNews(): Promise<number> {
  const items = await fetchAllNews();
  const db = getDb();
  // 清理过期数据
  const cutoff = new Date(Date.now() - KEEP_DAYS * 24 * 60 * 60 * 1000);
  await db.delete(schema.newsItems).where(lt(schema.newsItems.fetchedAt, cutoff));
  if (items.length > 0) {
    // 全量重建：保证内容新鲜
    await db.delete(schema.newsItems);
    await db.insert(schema.newsItems).values(
      items.map((n) => ({
        source: n.source,
        category: n.category,
        title: n.title.slice(0, 900),
        url: n.url.slice(0, 1900),
        summary: n.summary,
        publishedAt: n.publishedAt,
      })),
    );
  }
  return items.length;
}

/** 缓存过期或为空时自动刷新。 */
export async function ensureFreshNews(): Promise<void> {
  const latest = await latestFetchedAt();
  const stale =
    !latest || Date.now() - latest.getTime() > REFRESH_INTERVAL_MS;
  if (stale) {
    await refreshNews();
  }
}
