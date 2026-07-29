import { XMLParser } from "fast-xml-parser";

export type FetchedNews = {
  source: string;
  category: string;
  title: string;
  url: string;
  summary: string;
  publishedAt: Date | null;
};

const parser = new XMLParser();

function asText(node: unknown): string {
  if (node == null) return "";
  if (typeof node === "string" || typeof node === "number") return String(node);
  if (typeof node === "object") {
    const obj = node as Record<string, unknown>;
    if (typeof obj["#text"] === "string") return obj["#text"];
  }
  return "";
}

function stripHtml(html: string): string {
  return html
    .replace(/<[^>]*>/g, " ")
    .replace(/&nbsp;/g, " ")
    .replace(/&amp;/g, "&")
    .replace(/&lt;/g, "<")
    .replace(/&gt;/g, ">")
    .replace(/&quot;/g, '"')
    .replace(/&#39;|&apos;/g, "'")
    .replace(/\s+/g, " ")
    .trim();
}

function truncate(s: string, n: number): string {
  return s.length > n ? s.slice(0, n) + "…" : s;
}

function parseDate(v: unknown): Date | null {
  const s = asText(v);
  if (!s) return null;
  const d = new Date(s);
  return Number.isNaN(d.getTime()) ? null : d;
}

async function fetchText(url: string, timeoutMs = 12000): Promise<string> {
  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), timeoutMs);
  try {
    const res = await fetch(url, {
      signal: controller.signal,
      headers: {
        "User-Agent":
          "Mozilla/5.0 (compatible; AIWorkbenchBot/1.0; +news-aggregator)",
        Accept: "application/rss+xml, application/xml, text/xml, */*",
      },
    });
    if (!res.ok) throw new Error(`HTTP ${res.status}`);
    return await res.text();
  } finally {
    clearTimeout(timer);
  }
}

type RssSource = {
  name: string;
  category: string;
  url: string;
  limit: number;
};

const RSS_SOURCES: RssSource[] = [
  { name: "36氪", category: "科技", url: "https://36kr.com/feed", limit: 15 },
  {
    name: "机器之心",
    category: "AI",
    url: "https://www.jiqizhixin.com/rss",
    limit: 15,
  },
  { name: "少数派", category: "科技", url: "https://sspai.com/feed", limit: 10 },
  { name: "爱范儿", category: "科技", url: "https://www.ifanr.com/feed", limit: 10 },
];

async function fetchRss(src: RssSource): Promise<FetchedNews[]> {
  const xml = await fetchText(src.url);
  const doc = parser.parse(xml);
  const channel = doc?.rss?.channel;
  if (!channel) return [];
  let items = channel.item ?? [];
  if (!Array.isArray(items)) items = [items];
  const out: FetchedNews[] = [];
  for (const item of items.slice(0, src.limit)) {
    const title = stripHtml(asText(item?.title));
    const url = asText(item?.link).trim();
    if (!title || !url) continue;
    const summary = truncate(
      stripHtml(asText(item?.description) || asText(item?.["content:encoded"])),
      160,
    );
    out.push({
      source: src.name,
      category: src.category,
      title,
      url,
      summary,
      publishedAt: parseDate(item?.pubDate) ?? parseDate(item?.["dc:date"]),
    });
  }
  return out;
}

async function fetchHackerNews(): Promise<FetchedNews[]> {
  const queries: Array<{ q: string; category: string }> = [
    { q: "AI", category: "AI" },
    { q: "LLM", category: "AI" },
  ];
  const out: FetchedNews[] = [];
  for (const { q, category } of queries) {
    const url = `https://hn.algolia.com/api/v1/search?query=${encodeURIComponent(q)}&tags=story&hitsPerPage=10`;
    const text = await fetchText(url);
    const data = JSON.parse(text) as {
      hits?: Array<{
        title?: string;
        url?: string;
        story_text?: string;
        created_at?: string;
        objectID?: string;
      }>;
    };
    for (const hit of data.hits ?? []) {
      if (!hit.title) continue;
      out.push({
        source: "Hacker News",
        category,
        title: hit.title,
        url:
          hit.url ?? `https://news.ycombinator.com/item?id=${hit.objectID}`,
        summary: truncate(stripHtml(hit.story_text ?? ""), 160),
        publishedAt: hit.created_at ? new Date(hit.created_at) : null,
      });
    }
  }
  return out;
}

/** 聚合所有资讯源；单个源失败不影响整体。 */
export async function fetchAllNews(): Promise<FetchedNews[]> {
  const tasks: Array<Promise<FetchedNews[]>> = [
    fetchHackerNews(),
    ...RSS_SOURCES.map((s) => fetchRss(s)),
  ];
  const settled = await Promise.allSettled(tasks);
  const all: FetchedNews[] = [];
  for (const r of settled) {
    if (r.status === "fulfilled") all.push(...r.value);
  }
  // 按 URL 去重
  const seen = new Set<string>();
  return all.filter((n) => {
    const key = n.url.replace(/[?#].*$/, "");
    if (seen.has(key)) return false;
    seen.add(key);
    return true;
  });
}
