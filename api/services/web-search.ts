import { readFileSync } from "node:fs";
import { homedir } from "node:os";
import { join } from "node:path";

type SearchResult = {
  title?: string;
  url?: string;
  content?: string;
  authority?: string;
};

type GwConfig = { apiKey: string; baseUrl: string };

let cached: GwConfig | null | undefined;

/** 从环境变量或本机 agent-gw 配置中读取联网搜索凭证；不可用时返回 null。 */
function resolveConfig(): GwConfig | null {
  if (cached !== undefined) return cached;
  const envKey = process.env.KIMI_GW_API_KEY;
  const envBase = process.env.KIMI_GW_BASE_URL;
  if (envKey) {
    cached = {
      apiKey: envKey,
      baseUrl: (envBase || "https://agent-gw.kimi.com/coding").replace(/\/$/, ""),
    };
    return cached;
  }
  try {
    const raw = readFileSync(join(homedir(), ".kimi", "agent-gw.json"), "utf8");
    const cfg = JSON.parse(raw) as { api_key?: string; base_url?: string };
    if (cfg.api_key) {
      cached = {
        apiKey: cfg.api_key,
        baseUrl: (cfg.base_url || "https://agent-gw.kimi.com/coding").replace(
          /\/$/,
          "",
        ),
      };
      return cached;
    }
  } catch {
    // ignore
  }
  cached = null;
  return null;
}

export function webSearchAvailable(): boolean {
  return resolveConfig() !== null;
}

/** 联网搜索；不可用时返回 null，失败时抛错由调用方兜底。 */
export async function webSearch(
  query: string,
  limit = 5,
): Promise<SearchResult[] | null> {
  const cfg = resolveConfig();
  if (!cfg) return null;
  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), 20000);
  try {
    const res = await fetch(`${cfg.baseUrl}/v1/search`, {
      method: "POST",
      signal: controller.signal,
      headers: {
        "Content-Type": "application/json",
        Authorization: `Bearer ${cfg.apiKey}`,
      },
      body: JSON.stringify({ text_query: query, limit }),
    });
    if (!res.ok) throw new Error(`search HTTP ${res.status}`);
    const data = (await res.json()) as { search_results?: SearchResult[] };
    return data.search_results ?? [];
  } finally {
    clearTimeout(timer);
  }
}
