import { aiConfig, aiProvider } from "@/lib/ai/client";
import { claudeConfig, claudeWebSearch } from "@/lib/ai/claude";

/**
 * Server-side web search used by AI Research. Provider is chosen by SEARCH_PROVIDER ("tavily", "brave" or
 * "claude"). Without one, a configured Tavily/Brave key is used, else Claude's web search when Claude is the
 * AI provider. Keys never reach the browser.
 */

export type SearchResult = { title: string; url: string; snippet: string };
export type WebSearch = (query: string, options: { domain: string | null; maxResults?: number }) => Promise<SearchResult[]>;

export function searchProvider(env = process.env): { name: "tavily" | "brave" | "claude"; key: string } | null {
  const requested = (env.SEARCH_PROVIDER ?? "").toLowerCase();
  if ((requested === "tavily" || !requested) && env.TAVILY_API_KEY) return { name: "tavily", key: env.TAVILY_API_KEY };
  if ((requested === "brave" || !requested) && env.BRAVE_SEARCH_API_KEY) return { name: "brave", key: env.BRAVE_SEARCH_API_KEY };
  const claudeKey = claudeConfig(env).apiKey;
  if (claudeKey && (requested === "claude" || (!requested && aiProvider(env) === "claude"))) return { name: "claude", key: claudeKey };
  return null;
}

export function searchConfigured(env = process.env) {
  return searchProvider(env) !== null;
}

export const webSearch: WebSearch = async (query, { domain, maxResults = 6 }) => {
  const provider = searchProvider();
  if (!provider) {
    throw new Error("Web search is not configured. Use Claude as the AI provider, or set TAVILY_API_KEY or BRAVE_SEARCH_API_KEY.");
  }

  if (provider.name === "claude") {
    return claudeWebSearch(query, { domain, maxResults, timeoutMs: aiConfig().timeoutMs });
  }

  if (provider.name === "tavily") {
    const response = await fetch("https://api.tavily.com/search", {
      method: "POST",
      headers: { "Content-Type": "application/json", Authorization: `Bearer ${provider.key}` },
      body: JSON.stringify({
        query,
        max_results: maxResults,
        search_depth: "basic",
        ...(domain ? { include_domains: [domain] } : {}),
      }),
      signal: AbortSignal.timeout(30_000),
    });
    if (!response.ok) throw new Error(`Search failed (Tavily HTTP ${response.status}).`);
    const body = (await response.json()) as { results?: Array<{ title?: string; url?: string; content?: string }> };
    return (body.results ?? [])
      .filter((row) => row.url)
      .map((row) => ({ title: row.title ?? "", url: row.url!, snippet: row.content ?? "" }));
  }

  const url = new URL("https://api.search.brave.com/res/v1/web/search");
  url.searchParams.set("q", domain ? `${query} site:${domain}` : query);
  url.searchParams.set("count", String(maxResults));
  const response = await fetch(url, {
    headers: { Accept: "application/json", "X-Subscription-Token": provider.key },
    signal: AbortSignal.timeout(30_000),
  });
  if (!response.ok) throw new Error(`Search failed (Brave HTTP ${response.status}).`);
  const body = (await response.json()) as { web?: { results?: Array<{ title?: string; url?: string; description?: string }> } };
  return (body.web?.results ?? [])
    .filter((row) => row.url)
    .map((row) => ({ title: row.title ?? "", url: row.url!, snippet: (row.description ?? "").replace(/<[^>]+>/g, "") }));
};

/** "https://www.admissions.duke.edu/" → "duke.edu" (last two labels; three for *.ac.uk-style hosts). */
export function officialDomain(websiteUrl: string | null | undefined) {
  if (!websiteUrl) return null;
  try {
    const host = new URL(websiteUrl.startsWith("http") ? websiteUrl : `https://${websiteUrl}`).hostname.toLowerCase();
    const labels = host.split(".");
    const keep = labels.length > 2 && labels.at(-2)!.length <= 3 && labels.at(-1)!.length === 2 ? 3 : 2;
    return labels.slice(-keep).join(".");
  } catch {
    return null;
  }
}

export function isOnDomain(url: string, domain: string | null) {
  if (!domain) return false;
  try {
    const host = new URL(url).hostname.toLowerCase();
    return host === domain || host.endsWith(`.${domain}`);
  } catch {
    return false;
  }
}
