import { and, asc, desc, eq } from "drizzle-orm";
import { z } from "zod";

import type { AtlasDb } from "@/db/connect";
import { essayDrafts, PERSONAL_STATEMENT_PROMPT_ID, personalStatements, prompts } from "@/db/schema";
import { jsonArray, jsonObject, jsonString, type ModelCaller, runStructured } from "@/lib/ai/client";

export const PERSONAL_STATEMENT_WORD_LIMIT = 650;

export async function getPersonalStatement(db: AtlasDb, userId: string) {
  let [statement] = await db.select().from(personalStatements).where(eq(personalStatements.userId, userId)).limit(1);
  if (!statement) {
    [statement] = await db.insert(personalStatements).values({ userId }).onConflictDoNothing().returning();
    statement ??= (await db.select().from(personalStatements).where(eq(personalStatements.userId, userId)))[0];
  }
  const versions = await db
    .select({
      id: essayDrafts.id,
      title: essayDrafts.title,
      content: essayDrafts.content,
      status: essayDrafts.status,
      createdAt: essayDrafts.createdAt,
      updatedAt: essayDrafts.updatedAt,
    })
    .from(essayDrafts)
    .where(and(eq(essayDrafts.userId, userId), eq(essayDrafts.promptId, PERSONAL_STATEMENT_PROMPT_ID)))
    .orderBy(asc(essayDrafts.createdAt));
  return { statement: statement!, versions };
}

/** Autosave target: updates the given version (owned by the user) or creates the first one. */
export async function savePersonalStatementDraft(db: AtlasDb, userId: string, draftId: string | null, content: string, title?: string) {
  const text = content.slice(0, 40_000);
  if (draftId) {
    const rows = await db
      .update(essayDrafts)
      // Autosave passes no title, so a version's name is never wiped while typing.
      .set({
        content: text,
        ...(title !== undefined ? { title: title.slice(0, 120) } : {}),
        status: text.trim() ? "drafting" : "not_started",
        updatedAt: new Date(),
      })
      .where(and(eq(essayDrafts.id, draftId), eq(essayDrafts.userId, userId), eq(essayDrafts.promptId, PERSONAL_STATEMENT_PROMPT_ID)))
      .returning({ id: essayDrafts.id, updatedAt: essayDrafts.updatedAt });
    if (rows[0]) return rows[0];
  }
  return createPersonalStatementVersion(db, userId, text, title ?? "");
}

export async function createPersonalStatementVersion(db: AtlasDb, userId: string, content: string, title = "") {
  const [row] = await db
    .insert(essayDrafts)
    .values({
      userId,
      promptId: PERSONAL_STATEMENT_PROMPT_ID,
      title: title.slice(0, 120),
      content: content.slice(0, 40_000),
      status: content.trim() ? "drafting" : "not_started",
    })
    .returning({ id: essayDrafts.id, updatedAt: essayDrafts.updatedAt });
  return row!;
}

/** Restoring never overwrites: the old text becomes a new, latest version. */
export async function restorePersonalStatementVersion(db: AtlasDb, userId: string, versionId: string) {
  const [source] = await db
    .select({ title: essayDrafts.title, content: essayDrafts.content })
    .from(essayDrafts)
    .where(and(eq(essayDrafts.id, versionId), eq(essayDrafts.userId, userId), eq(essayDrafts.promptId, PERSONAL_STATEMENT_PROMPT_ID)))
    .limit(1);
  if (!source) throw new Error("Version not found.");
  return createPersonalStatementVersion(db, userId, source.content, `Restored: ${source.title || "earlier version"}`);
}

export async function savePersonalStatementNotes(db: AtlasDb, userId: string, notes: string, selectedPrompt: string | null) {
  await getPersonalStatement(db, userId);
  await db
    .update(personalStatements)
    .set({ notes: notes.slice(0, 20_000), selectedPrompt, updatedAt: new Date() })
    .where(eq(personalStatements.userId, userId));
}

// ---------------------------------------------------------------------------
// AI feedback: observations and questions only. The student does all the writing.
// ---------------------------------------------------------------------------

export const feedbackSchema = z.object({
  overview: z.string().min(5),
  strengths: z.array(z.object({ observation: z.string(), quote: z.string() })).max(4),
  questions: z.array(z.string().min(5)).min(1).max(6),
  specificityGaps: z.array(z.object({ quote: z.string(), suggestion: z.string() })).max(5),
  structureNotes: z.array(z.string()).max(4),
  promptFit: z.string(),
});
export type EssayFeedback = z.infer<typeof feedbackSchema>;

export const FEEDBACK_INSTRUCTIONS = [
  "You are a careful writing coach giving feedback on a student's college essay draft.",
  "Do NOT rewrite sentences, draft new paragraphs, or supply replacement wording. The student writes every word.",
  "Every quote must be copied exactly from the draft (a short phrase, under 20 words).",
  "Point to places where a concrete detail, decision, or reflection is missing and ask what actually happened, without guessing the answer.",
  "Never invent facts about the student or the college. If a college claim can't be verified from the draft, suggest the student check it.",
  "Be warm, specific, and brief. Avoid generic advice like 'show, don't tell' without pointing to a passage.",
].join(" ");

const feedbackJsonSchema = jsonObject({
  overview: jsonString,
  strengths: jsonArray(jsonObject({ observation: jsonString, quote: jsonString }), 4),
  questions: jsonArray(jsonString, 6),
  specificityGaps: jsonArray(jsonObject({ quote: jsonString, suggestion: jsonString }), 5),
  structureNotes: jsonArray(jsonString, 4),
  promptFit: jsonString,
});

function normalizeQuote(text: string) {
  return text.toLowerCase().replace(/[‘’]/g, "'").replace(/[“”]/g, '"').replace(/\s+/g, " ").trim();
}

export async function getEssayFeedback(
  db: AtlasDb,
  userId: string,
  input: { draft: string; promptText: string; wordLimit: number | null },
  options: { caller?: ModelCaller } = {},
) {
  const draft = input.draft.trim();
  if (draft.split(/\s+/).filter(Boolean).length < 40) {
    throw new Error("Write at least 40 words before asking for feedback.");
  }
  const clipped = draft.split(/\s+/).slice(0, 1500).join(" ");
  const normalizedDraft = normalizeQuote(clipped);
  return runStructured(
    db,
    userId,
    "essay_feedback",
    feedbackSchema,
    {
      instructions: FEEDBACK_INSTRUCTIONS,
      input: [
        `Prompt: ${input.promptText.slice(0, 1500)}`,
        input.wordLimit ? `Word limit: ${input.wordLimit}` : "",
        `Draft:\n${clipped}`,
      ].join("\n\n"),
      schemaName: "essay_feedback",
      jsonSchema: feedbackJsonSchema,
      maxOutputTokens: 2500,
    },
    {
      caller: options.caller,
      postValidate: (value) => {
        const quotes = [...value.strengths.map((row) => row.quote), ...value.specificityGaps.map((row) => row.quote)];
        const missing = quotes.find((quote) => quote.trim() && !normalizedDraft.includes(normalizeQuote(quote)));
        return missing ? `quote "${missing.slice(0, 60)}" is not in the draft` : null;
      },
    },
  );
}

// ---------------------------------------------------------------------------
// Essay library
// ---------------------------------------------------------------------------

export type LibraryEntry = {
  draftId: string;
  promptId: string;
  promptText: string;
  collegeName: string;
  collegeSlug: string | null;
  category: string;
  content: string;
  words: number;
  updatedAt: string;
  sharedWith: string[];
};

/** Latest non-empty version of every prompt the user has written for, grouped later by category. */
export async function getEssayLibrary(db: AtlasDb, userId: string): Promise<LibraryEntry[]> {
  const rows = await db
    .select({
      draftId: essayDrafts.id,
      promptId: essayDrafts.promptId,
      content: essayDrafts.content,
      updatedAt: essayDrafts.updatedAt,
      promptText: prompts.promptText,
      collegeName: prompts.collegeName,
      collegeSlug: prompts.collegeSlug,
      category: prompts.category,
      primaryTag: prompts.primaryTag,
      hash: prompts.contentHash,
    })
    .from(essayDrafts)
    .leftJoin(prompts, eq(prompts.promptId, essayDrafts.promptId))
    .where(eq(essayDrafts.userId, userId))
    .orderBy(desc(essayDrafts.createdAt));

  const latest = new Map<string, (typeof rows)[number]>();
  for (const row of rows) {
    if (!latest.has(row.promptId) && row.content.trim()) latest.set(row.promptId, row);
  }
  const entries = [...latest.values()];
  return entries.map((row) => ({
    draftId: row.draftId,
    promptId: row.promptId,
    promptText: row.promptId === PERSONAL_STATEMENT_PROMPT_ID ? "Common App personal statement" : row.promptText ?? "(prompt no longer listed)",
    collegeName: row.promptId === PERSONAL_STATEMENT_PROMPT_ID ? "Common App" : row.collegeName ?? "",
    collegeSlug: row.collegeSlug,
    category: row.promptId === PERSONAL_STATEMENT_PROMPT_ID ? "Personal Statement" : row.category ?? row.primaryTag ?? "Other",
    content: row.content,
    words: row.content.trim().split(/\s+/).filter(Boolean).length,
    updatedAt: row.updatedAt.toISOString(),
    // The same prompt text at several schools: point the student at drafts they can share.
    sharedWith: row.hash
      ? entries.filter((other) => other.hash === row.hash && other.promptId !== row.promptId).map((other) => other.collegeName ?? "")
      : [],
  }));
}

/** Copies a draft into another prompt as a NEW version there; nothing existing is overwritten. */
export async function copyDraftToPrompt(db: AtlasDb, userId: string, sourceDraftId: string, targetPromptId: string) {
  const [source] = await db
    .select({ content: essayDrafts.content, promptId: essayDrafts.promptId })
    .from(essayDrafts)
    .where(and(eq(essayDrafts.id, sourceDraftId), eq(essayDrafts.userId, userId)))
    .limit(1);
  if (!source) throw new Error("Draft not found.");
  if (targetPromptId !== PERSONAL_STATEMENT_PROMPT_ID) {
    const [target] = await db.select({ id: prompts.id }).from(prompts).where(eq(prompts.promptId, targetPromptId)).limit(1);
    if (!target) throw new Error("Target prompt not found.");
  }
  const [row] = await db
    .insert(essayDrafts)
    .values({ userId, promptId: targetPromptId, title: "Reused from library", content: source.content, status: "drafting" })
    .returning({ id: essayDrafts.id });
  return row!.id;
}
