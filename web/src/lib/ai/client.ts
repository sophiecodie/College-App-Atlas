import { and, eq, gte, sql } from "drizzle-orm";
import type { z } from "zod";

import type { AtlasDb } from "@/db/connect";
import { aiUsage } from "@/db/schema";
import { ClaudeRequestError, claudeConfig, createClaudeCaller } from "@/lib/ai/claude";

/**
 * Server-side structured AI calls. Secrets stay on the server; every call is per-user rate limited,
 * validated against a schema, and sent with `store: false` so prompts are not retained for training.
 */

export type ModelRequest = {
  instructions: string;
  input: string;
  schemaName: string;
  jsonSchema: Record<string, unknown>;
  maxOutputTokens?: number;
};

export type ModelResponse = { text: string; inputTokens?: number; outputTokens?: number };
export type ModelCaller = (request: ModelRequest) => Promise<ModelResponse>;

export class AiUnavailableError extends Error {
  constructor() {
    super("AI features are turned off: no AI provider key (ANTHROPIC_API_KEY or OPENAI_API_KEY) is configured on the server.");
  }
}

export class AiLimitError extends Error {
  constructor(limit: number) {
    super(`You've reached today's limit of ${limit} AI requests. It resets over the next 24 hours.`);
  }
}

export class AiOutputError extends Error {}

export function aiConfig(env = process.env) {
  return {
    apiKey: env.OPENAI_API_KEY ?? "",
    baseUrl: (env.OPENAI_API_BASE_URL ?? "https://api.openai.com/v1").replace(/\/$/, ""),
    model: env.OPENAI_STUDIO_MODEL ?? env.OPENAI_STORYLINES_MODEL ?? "gpt-5.2",
    dailyLimit: Math.max(1, Number(env.AI_DAILY_REQUEST_LIMIT ?? 40) || 40),
    // Local models (e.g. oMLX) can need minutes for long answers; hosted APIs are usually much faster.
    timeoutMs: Math.max(10_000, Number(env.AI_REQUEST_TIMEOUT_MS ?? 90_000) || 90_000),
  };
}

/** "claude" when AI_PROVIDER=claude, or when only an Anthropic key is set; otherwise the OpenAI-compatible path. */
export function aiProvider(env = process.env): "claude" | "openai" {
  const requested = (env.AI_PROVIDER ?? "").toLowerCase();
  if (requested === "claude" || requested === "anthropic") return "claude";
  if (requested === "openai") return "openai";
  return claudeConfig(env).apiKey && !aiConfig(env).apiKey ? "claude" : "openai";
}

export function aiConfigured(env = process.env) {
  return aiProvider(env) === "claude" ? Boolean(claudeConfig(env).apiKey) : Boolean(aiConfig(env).apiKey);
}

/** The model caller for the configured provider. */
export function activeCaller(env = process.env): ModelCaller {
  return aiProvider(env) === "claude" ? createClaudeCaller(aiConfig(env).timeoutMs) : openAiCaller;
}

function extractText(payload: unknown): string {
  if (payload && typeof payload === "object") {
    const record = payload as Record<string, unknown>;
    if (typeof record.output_text === "string" && record.output_text.trim()) {
      return record.output_text;
    }
    if (Array.isArray(record.output)) {
      for (const item of record.output as Array<Record<string, unknown>>) {
        for (const part of (item.content as Array<Record<string, unknown>> | undefined) ?? []) {
          if (typeof part.text === "string" && part.text.trim()) {
            return part.text;
          }
        }
      }
    }
  }
  return "";
}

/** OpenAI Responses API with a strict JSON schema. */
export const openAiCaller: ModelCaller = async (request) => {
  const config = aiConfig();
  if (!config.apiKey) {
    throw new AiUnavailableError();
  }
  const response = await fetch(`${config.baseUrl}/responses`, {
    method: "POST",
    headers: { "Content-Type": "application/json", Authorization: `Bearer ${config.apiKey}` },
    body: JSON.stringify({
      model: config.model,
      store: false,
      instructions: request.instructions,
      input: [{ role: "user", content: [{ type: "input_text", text: request.input }] }],
      max_output_tokens: request.maxOutputTokens ?? 4000,
      text: { format: { type: "json_schema", name: request.schemaName, strict: true, schema: request.jsonSchema } },
    }),
    signal: AbortSignal.timeout(config.timeoutMs),
  });
  if (!response.ok) {
    const detail = (await response.text()).slice(0, 240);
    throw new Error(`AI request failed (${response.status}). ${detail}`);
  }
  const payload = (await response.json()) as Record<string, unknown>;
  const usage = (payload.usage ?? {}) as Record<string, number>;
  return { text: extractText(payload), inputTokens: usage.input_tokens, outputTokens: usage.output_tokens };
};

export async function usageToday(db: AtlasDb, userId: string) {
  const since = new Date(Date.now() - 24 * 60 * 60 * 1000);
  const [row] = await db
    .select({ count: sql<number>`count(*)::int` })
    .from(aiUsage)
    .where(and(eq(aiUsage.userId, userId), gte(aiUsage.createdAt, since)));
  return row?.count ?? 0;
}

/**
 * Runs one structured request for a user: enforces the daily limit, validates the output with `schema`,
 * retries once on invalid output, and records usage. `postValidate` can reject outputs that are well-formed
 * but unsupported (for example, citing a source that was not provided).
 */
export async function runStructured<T>(
  db: AtlasDb,
  userId: string,
  feature: string,
  schema: z.ZodType<T>,
  request: ModelRequest,
  options: { caller?: ModelCaller; dailyLimit?: number; postValidate?: (value: T) => string | null } = {},
): Promise<T> {
  const caller = options.caller ?? activeCaller();
  if (!options.caller && !aiConfigured()) {
    throw new AiUnavailableError();
  }
  const limit = options.dailyLimit ?? aiConfig().dailyLimit;
  if ((await usageToday(db, userId)) >= limit) {
    throw new AiLimitError(limit);
  }

  let lastProblem = "";
  for (let attempt = 0; attempt < 2; attempt += 1) {
    const response = await caller(
      attempt === 0
        ? request
        : { ...request, instructions: `${request.instructions}\n\nYour previous answer was rejected: ${lastProblem}. Follow the schema and rules exactly.` },
    ).catch(async (error: unknown) => {
      await db.insert(aiUsage).values({ userId, feature, status: "error" });
      throw error;
    });

    let parsed: unknown;
    try {
      parsed = JSON.parse(response.text);
    } catch {
      lastProblem = "the output was not valid JSON";
      await db.insert(aiUsage).values({ userId, feature, status: "invalid_output", inputTokens: response.inputTokens, outputTokens: response.outputTokens });
      continue;
    }
    const result = schema.safeParse(parsed);
    const problem = result.success ? options.postValidate?.(result.data) ?? null : result.error.issues[0]?.message ?? "schema mismatch";
    await db.insert(aiUsage).values({
      userId,
      feature,
      status: problem ? "invalid_output" : "ok",
      inputTokens: response.inputTokens,
      outputTokens: response.outputTokens,
    });
    if (!problem && result.success) {
      return result.data;
    }
    lastProblem = problem ?? "invalid output";
  }
  throw new AiOutputError(`The AI response couldn't be validated (${lastProblem}). Please try again.`);
}

/** Helpers for strict JSON schemas (every property required, no extras). */
export function jsonObject(properties: Record<string, unknown>) {
  return { type: "object", additionalProperties: false, properties, required: Object.keys(properties) };
}
export const jsonString = { type: "string" };
export function jsonArray(items: unknown, maxItems?: number) {
  return { type: "array", items, ...(maxItems ? { maxItems } : {}) };
}
export function jsonEnum(values: readonly string[]) {
  return { type: "string", enum: values };
}

export function friendlyAiError(error: unknown) {
  if (error instanceof AiUnavailableError || error instanceof AiLimitError || error instanceof AiOutputError || error instanceof ClaudeRequestError) {
    return error.message;
  }
  return `Something went wrong talking to the AI service. ${(error as Error)?.message ?? ""}`.trim();
}
