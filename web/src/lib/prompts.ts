import { and, asc, eq } from "drizzle-orm";

import { db } from "@/db/client";
import { prompts, userPromptPreferences } from "@/db/schema";

export type PromptRecord = {
  id: string;
  promptId: string;
  collegeSlug: string;
  collegeName: string;
  cycle: string | null;
  promptText: string;
  promptType: string | null;
  required: boolean;
  isOptionalChoice: boolean;
  wordLimit: number | null;
  wordMin: number | null;
  characterLimit: number | null;
  primaryTag: string | null;
  programScope: string[];
  selected: boolean;
  completed: boolean;
};

export function promptProgramScopes(prompt: Pick<PromptRecord, "programScope">): string[] {
  return Array.isArray(prompt.programScope)
    ? prompt.programScope
        .map((scope) => String(scope ?? "").trim().toLowerCase())
        .filter(Boolean)
    : [];
}

export function activeProgramSelection(programSelection: string | null) {
  return String(programSelection ?? "").trim().toLowerCase() || "general";
}

export function promptIsApplicable(
  programSelection: string | null,
  prompt: Pick<PromptRecord, "programScope">,
) {
  const scopes = promptProgramScopes(prompt);
  if (scopes.length === 0) {
    return true;
  }
  return scopes.includes(activeProgramSelection(programSelection));
}

export function promptIsActive(
  programSelection: string | null,
  prompt: Pick<PromptRecord, "required" | "isOptionalChoice" | "selected" | "programScope">,
) {
  if (!promptIsApplicable(programSelection, prompt)) {
    return false;
  }

  if (prompt.required && !prompt.isOptionalChoice) {
    return true;
  }

  return Boolean(prompt.selected);
}

export function promptLimitLabel(prompt: Pick<PromptRecord, "wordLimit" | "wordMin" | "characterLimit">) {
  if (prompt.characterLimit && prompt.characterLimit > 0) {
    return `${prompt.characterLimit} characters`;
  }

  if (prompt.wordLimit && prompt.wordLimit > 0) {
    if (prompt.wordMin && prompt.wordMin > 0) {
      return `${prompt.wordMin}-${prompt.wordLimit} words`;
    }
    return `${prompt.wordLimit} words`;
  }

  return "No limit listed";
}

export async function getCollegePromptsForUser(userId: string, collegeSlug: string): Promise<PromptRecord[]> {
  const rows = await db
    .select({
      id: prompts.id,
      promptId: prompts.promptId,
      collegeSlug: prompts.collegeSlug,
      collegeName: prompts.collegeName,
      cycle: prompts.cycle,
      promptText: prompts.promptText,
      promptType: prompts.promptType,
      required: prompts.required,
      isOptionalChoice: prompts.isOptionalChoice,
      wordLimit: prompts.wordLimit,
      wordMin: prompts.wordMin,
      characterLimit: prompts.characterLimit,
      primaryTag: prompts.primaryTag,
      programScope: prompts.programScope,
      selected: userPromptPreferences.selected,
      completed: userPromptPreferences.completed,
    })
    .from(prompts)
    .leftJoin(
      userPromptPreferences,
      and(
        eq(userPromptPreferences.userId, userId),
        eq(userPromptPreferences.promptId, prompts.promptId),
      ),
    )
    .where(eq(prompts.collegeSlug, collegeSlug))
    .orderBy(asc(prompts.promptId));

  return rows.map((row) => ({
    ...row,
    selected: row.required ? true : Boolean(row.selected),
    completed: Boolean(row.completed),
    programScope: row.programScope ?? [],
  }));
}
