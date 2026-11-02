import { htmlToText } from "@/lib/ingest/html-text";

export const CRAWLER_TOKEN = "CollegeAtlasBot";

export function crawlerUserAgent() {
  const contact = process.env.ATLAS_CRAWLER_CONTACT ?? "https://github.com/sophiecodie/Common-App-Atlas";
  return `${CRAWLER_TOKEN}/0.1 (+${contact}; low-volume admissions requirements checker)`;
}

export type FetchResult = {
  url: string;
  ok: boolean;
  status: number | null;
  contentType: string | null;
  text: string;
  byteLength: number;
  /** Set when the page was not retrieved: robots.txt disallow, HTTP error, network failure, or unsupported type. */
  error: string | null;
  blockedByRobots: boolean;
  /** Address after redirects, when different from the requested `url`. */
  finalUrl?: string;
  /** Raw HTML, only kept when requested (used by the curation tool to list links). */
  html?: string;
};

type RobotsRules = Array<{ allow: boolean; path: string }>;

/** Parses robots.txt and returns the rules for our token, falling back to "*" (RFC 9309 group selection). */
export function parseRobots(body: string, token = CRAWLER_TOKEN): RobotsRules {
  const groups: Array<{ agents: string[]; rules: RobotsRules }> = [];
  let current: { agents: string[]; rules: RobotsRules } | null = null;
  let lastWasAgent = false;

  for (const rawLine of body.split(/\r?\n/)) {
    const line = rawLine.replace(/#.*$/, "").trim();
    const separator = line.indexOf(":");
    if (separator < 0) {
      continue;
    }
    const key = line.slice(0, separator).trim().toLowerCase();
    const value = line.slice(separator + 1).trim();
    if (key === "user-agent") {
      if (!current || !lastWasAgent) {
        current = { agents: [], rules: [] };
        groups.push(current);
      }
      current.agents.push(value.toLowerCase());
      lastWasAgent = true;
    } else if ((key === "allow" || key === "disallow") && current) {
      if (value) {
        current.rules.push({ allow: key === "allow", path: value });
      }
      lastWasAgent = false;
    } else {
      lastWasAgent = false;
    }
  }

  const lowered = token.toLowerCase();
  const specific = groups.filter((group) => group.agents.some((agent) => agent !== "*" && lowered.includes(agent)));
  const chosen = specific.length > 0 ? specific : groups.filter((group) => group.agents.includes("*"));
  return chosen.flatMap((group) => group.rules);
}

function ruleMatches(rulePath: string, path: string) {
  const anchored = rulePath.endsWith("$");
  const pattern = (anchored ? rulePath.slice(0, -1) : rulePath)
    .split("*")
    .map((part) => part.replace(/[.+?^${}()|[\]\\]/g, "\\$&"))
    .join(".*");
  return new RegExp(`^${pattern}${anchored ? "$" : ""}`).test(path);
}

/** Longest matching rule wins; Allow wins ties. No rules means allowed. */
export function robotsAllows(rules: RobotsRules, pathWithQuery: string) {
  let best: { allow: boolean; length: number } | null = null;
  for (const rule of rules) {
    if (ruleMatches(rule.path, pathWithQuery)) {
      const length = rule.path.length;
      if (!best || length > best.length || (length === best.length && rule.allow)) {
        best = { allow: rule.allow, length };
      }
    }
  }
  return best ? best.allow : true;
}

export type PoliteFetcherOptions = {
  fetchImpl?: typeof fetch;
  /** Minimum gap between requests to the same host. */
  minDelayMs?: number;
  timeoutMs?: number;
  maxBytes?: number;
};

/**
 * Fetches public pages politely: identifies itself, honours robots.txt, rate-limits per host,
 * follows only ordinary redirects, and never retries around 401/403/429 or CAPTCHA responses.
 */
export class PoliteFetcher {
  private readonly robots = new Map<string, Promise<RobotsRules>>();
  private readonly lastRequestAt = new Map<string, number>();
  private readonly fetchImpl: typeof fetch;
  private readonly minDelayMs: number;
  private readonly timeoutMs: number;
  private readonly maxBytes: number;

  constructor(options: PoliteFetcherOptions = {}) {
    this.fetchImpl = options.fetchImpl ?? fetch;
    this.minDelayMs = options.minDelayMs ?? 1500;
    this.timeoutMs = options.timeoutMs ?? 20_000;
    this.maxBytes = options.maxBytes ?? 5_000_000;
  }

  private async throttle(host: string) {
    const last = this.lastRequestAt.get(host) ?? 0;
    const wait = last + this.minDelayMs - Date.now();
    if (wait > 0) {
      await new Promise((resolve) => setTimeout(resolve, wait));
    }
    this.lastRequestAt.set(host, Date.now());
  }

  private async request(url: string, accept: string) {
    const host = new URL(url).host;
    await this.throttle(host);
    return this.fetchImpl(url, {
      headers: { "User-Agent": crawlerUserAgent(), Accept: accept },
      redirect: "follow",
      signal: AbortSignal.timeout(this.timeoutMs),
    });
  }

  private rulesFor(origin: string) {
    let rules = this.robots.get(origin);
    if (!rules) {
      rules = this.request(`${origin}/robots.txt`, "text/plain")
        .then(async (response) => {
          // RFC 9309: 4xx means no restrictions; 5xx / network failure means assume full disallow.
          if (response.status >= 500) {
            return [{ allow: false, path: "/" }];
          }
          return response.ok ? parseRobots(await response.text()) : [];
        })
        .catch(() => [{ allow: false, path: "/" }]);
      this.robots.set(origin, rules);
    }
    return rules;
  }

  async fetchPage(url: string, options: { keepHtml?: boolean } = {}): Promise<FetchResult> {
    const base: FetchResult = {
      url,
      ok: false,
      status: null,
      contentType: null,
      text: "",
      byteLength: 0,
      error: null,
      blockedByRobots: false,
    };
    let parsed: URL;
    try {
      parsed = new URL(url);
    } catch {
      return { ...base, error: "Invalid URL" };
    }
    if (parsed.protocol !== "https:" && parsed.protocol !== "http:") {
      return { ...base, error: "Only http(s) URLs are fetched" };
    }

    const rules = await this.rulesFor(parsed.origin);
    if (!robotsAllows(rules, parsed.pathname + parsed.search)) {
      return { ...base, error: "Disallowed by robots.txt", blockedByRobots: true };
    }

    try {
      const response = await this.request(url, "text/html,application/xhtml+xml;q=0.9,text/plain;q=0.8");
      const contentType = response.headers.get("content-type");
      if (!response.ok) {
        const reason =
          response.status === 401 || response.status === 403 || response.status === 429
            ? "access restricted; not retried"
            : "HTTP error";
        return { ...base, status: response.status, contentType, error: `HTTP ${response.status} (${reason})` };
      }
      if (contentType && !/html|text\/plain/i.test(contentType)) {
        return { ...base, status: response.status, contentType, error: `Unsupported content type ${contentType}` };
      }
      const body = await response.text();
      if (body.length > this.maxBytes) {
        return { ...base, status: response.status, contentType, error: "Response too large" };
      }
      if (/captcha|cf-challenge|challenge-platform|verify you are human/i.test(body.slice(0, 20_000)) && body.length < 50_000) {
        return { ...base, status: response.status, contentType, error: "Bot challenge page; not bypassed" };
      }
      const text = /html/i.test(contentType ?? "html") ? htmlToText(body) : body;
      return {
        ...base,
        finalUrl: response.url || url,
        ok: true,
        status: response.status,
        contentType,
        text,
        byteLength: body.length,
        ...(options.keepHtml ? { html: body } : {}),
      };
    } catch (error) {
      return { ...base, error: `Network error: ${(error as Error).message}` };
    }
  }
}
