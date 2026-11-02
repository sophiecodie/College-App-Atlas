import Anthropic from "@anthropic-ai/sdk";

import type { ModelCaller, ModelRequest } from "@/lib/ai/client";

/**
 * Claude (Anthropic) provider for runStructured. Uses structured outputs (`output_config.format`) so the reply
 * is JSON matching the schema; runStructured still validates it with zod afterwards.
 */

export function claudeConfig(env = process.env) {
  return {
    apiKey: env.ANTHROPIC_API_KEY ?? "",
    model: env.ANTHROPIC_MODEL ?? "claude-opus-5-5",
    // Opus 5.5 always thinks; effort controls how much. Its API default is "medium", set explicitly here.
    effort: (env.ANTHROPIC_EFFORT ?? "medium") as "low" | "medium" | "high" | "xhigh" | "max",
  };
}

let client: Anthropic | null = null;
function getClient(apiKey: string, timeoutMs: number) {
  client ??= new Anthropic({ apiKey, timeout: timeoutMs, maxRetries: 2 });
  return client;
}

// Structured outputs don't accept length/size constraints; zod re-checks them after the reply arrives.
const UNSUPPORTED_KEYS = new Set(["maxItems", "minItems", "minLength", "maxLength", "minimum", "maximum", "multipleOf"]);

export function toClaudeSchema(schema: unknown): unknown {
  if (Array.isArray(schema)) return schema.map(toClaudeSchema);
  if (schema && typeof schema === "object") {
    return Object.fromEntries(
      Object.entries(schema as Record<string, unknown>)
        .filter(([key]) => !UNSUPPORTED_KEYS.has(key))
        .map(([key, value]) => [key, toClaudeSchema(value)]),
    );
  }
  return schema;
}

export class ClaudeRequestError extends Error {}

export function createClaudeCaller(timeoutMs: number): ModelCaller {
  return async (request: ModelRequest) => {
    const config = claudeConfig();
    if (!config.apiKey) {
      throw new ClaudeRequestError("AI features are turned off: ANTHROPIC_API_KEY is not configured on the server.");
    }
    try {
      const response = await getClient(config.apiKey, timeoutMs).beta.messages.create({
        model: config.model,
        // Room for thinking plus the JSON answer; non-streaming requests stay under SDK timeouts at this size.
        max_tokens: 16000,
        // If a safety classifier declines, the API reruns the request on Anthropic's recommended fallback model.
        betas: ["server-side-fallback-2026-07-01"],
        fallbacks: "default",
        system: request.instructions,
        messages: [{ role: "user", content: request.input }],
        output_config: {
          effort: config.effort,
          format: { type: "json_schema", schema: toClaudeSchema(request.jsonSchema) as Record<string, unknown> },
        },
      });

      if (response.stop_reason === "refusal") {
        throw new ClaudeRequestError("Claude declined this request. Try rephrasing, or remove anything that might read as unsafe.");
      }
      const text = response.content.flatMap((block) => (block.type === "text" ? [block.text] : [])).join("");
      return { text, inputTokens: response.usage.input_tokens, outputTokens: response.usage.output_tokens };
    } catch (error) {
      if (error instanceof ClaudeRequestError) throw error;
      if (error instanceof Anthropic.AuthenticationError) throw new ClaudeRequestError("The Claude API key was rejected. Check ANTHROPIC_API_KEY.");
      if (error instanceof Anthropic.PermissionDeniedError) throw new ClaudeRequestError("This Claude API key doesn't have access to the configured model.");
      if (error instanceof Anthropic.RateLimitError) throw new ClaudeRequestError("Claude is busy right now (rate limited). Please try again in a minute.");
      if (error instanceof Anthropic.BadRequestError) throw new ClaudeRequestError(`Claude rejected the request: ${error.message.slice(0, 200)}`);
      if (error instanceof Anthropic.APIConnectionError) throw new ClaudeRequestError("Couldn't reach Claude. Check the server's internet connection.");
      if (error instanceof Anthropic.APIError) throw new ClaudeRequestError(`Claude returned an error (${error.status}). Please try again.`);
      throw error;
    }
  };
}

export type ClaudeSearchResult = { title: string; url: string; snippet: string };

/**
 * Finds pages with Claude's server-side web search, restricted to `domain`. Only URLs and titles are used:
 * the research pipeline fetches each page itself and checks quotes against that text.
 */
export async function claudeWebSearch(
  query: string,
  options: { domain: string | null; maxResults?: number; timeoutMs: number },
): Promise<ClaudeSearchResult[]> {
  const config = claudeConfig();
  if (!config.apiKey) {
    throw new ClaudeRequestError("Web search needs ANTHROPIC_API_KEY on the server.");
  }
  try {
    const response = await getClient(config.apiKey, options.timeoutMs).messages.create({
      model: config.model,
      max_tokens: 4000,
      output_config: { effort: "low" },
      tools: [
        {
          type: "web_search_20260209",
          name: "web_search",
          max_uses: 2,
          ...(options.domain ? { allowed_domains: [options.domain] } : {}),
        },
      ],
      system: "Use the web_search tool to find official pages that answer the query. After searching, reply with the single word: done.",
      messages: [{ role: "user", content: query }],
    });

    const results = new Map<string, ClaudeSearchResult>();
    let lastError: string | null = null;
    for (const block of response.content) {
      if (block.type !== "web_search_tool_result") continue;
      // Errors come back as an object in `content` (HTTP 200), results as a list.
      if (!Array.isArray(block.content)) {
        lastError = block.content.error_code;
        continue;
      }
      for (const result of block.content) {
        if (!results.has(result.url)) results.set(result.url, { title: result.title, url: result.url, snippet: "" });
      }
    }
    if (results.size === 0 && lastError) {
      throw new ClaudeRequestError(`Web search failed (${lastError}). Please try again.`);
    }
    return [...results.values()].slice(0, options.maxResults ?? 6);
  } catch (error) {
    if (error instanceof ClaudeRequestError) throw error;
    if (error instanceof Anthropic.AuthenticationError) throw new ClaudeRequestError("The Claude API key was rejected. Check ANTHROPIC_API_KEY.");
    if (error instanceof Anthropic.RateLimitError) throw new ClaudeRequestError("Claude is busy right now (rate limited). Please try again in a minute.");
    if (error instanceof Anthropic.BadRequestError) throw new ClaudeRequestError(`Web search request was rejected: ${error.message.slice(0, 200)}`);
    if (error instanceof Anthropic.APIError) throw new ClaudeRequestError(`Claude returned an error (${error.status}) during web search.`);
    throw error;
  }
}
