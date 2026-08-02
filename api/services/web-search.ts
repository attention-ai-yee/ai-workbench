// Local SearXNG metasearch (self-hosted, free, no API key).
// Replaces the old Kimi agent-gw dependency which had no working key.
// SearXNG runs as a systemd service on 127.0.0.1:8888, aggregates
// Google/Bing/Brave etc. and exposes a JSON API.

type SearchResult = {
  title?: string;
  url?: string;
  content?: string;
  authority?: string;
};

const SEARXNG_URL =
  process.env.SEARXNG_URL || "http://127.0.0.1:8888";

export function webSearchAvailable(): boolean {
  // Local service is always available by construction (systemd unit).
  return true;
}

/** 联网搜索；失败时抛错由调用方兜底。 */
export async function webSearch(
  query: string,
  limit = 5,
): Promise<SearchResult[] | null> {
  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), 20000);
  try {
    const url = new URL("/search", SEARXNG_URL);
    url.searchParams.set("q", query);
    url.searchParams.set("format", "json");
    url.searchParams.set("language", "zh-CN");
    const res = await fetch(url.toString(), {
      signal: controller.signal,
      headers: {
        // SearXNG bot-detection requires these when not behind a real proxy
        "X-Forwarded-For": "127.0.0.1",
        "X-Real-IP": "127.0.0.1",
        "User-Agent":
          "Mozilla/5.0 (compatible; AIWorkbenchBot/1.0; +local-search)",
      },
    });
    if (!res.ok) throw new Error(`search HTTP ${res.status}`);
    const data = (await res.json()) as {
      results?: Array<{
        title?: string;
        url?: string;
        content?: string;
        engine?: string;
      }>;
    };
    const out: SearchResult[] = [];
    for (const r of data.results ?? []) {
      if (!r.url) continue;
      out.push({
        title: r.title,
        url: r.url,
        content: r.content,
        authority: Array.isArray(r.engine) ? r.engine.join(",") : r.engine,
      });
      if (out.length >= limit) break;
    }
    return out;
  } finally {
    clearTimeout(timer);
  }
}
