import "server-only";

import { and, asc, eq } from "drizzle-orm";

import { db } from "@/db/client";
import { prompts, userPromptPreferences } from "@/db/schema";
import {
  type PromptRecord,
} from "@/lib/prompts-shared";

export {
  activeProgramSelection,
  promptIsActive,
  promptIsApplicable,
  promptLimitLabel,
  promptProgramScopes,
} from "@/lib/prompts-shared";

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
