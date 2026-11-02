import "server-only";

import { and, asc, eq, inArray, isNull, or, sql } from "drizzle-orm";

import { db } from "@/db/client";
import { essayDrafts, prompts, userPromptPreferences } from "@/db/schema";
import { currentAcademicYear } from "@/lib/catalog/cycles";
import {
  type PromptConditionalRules,
  type PromptRecord,
} from "@/lib/prompts-shared";

export {
  activeProgramSelection,
  promptIsActive,
  promptIsApplicable,
  promptIsVerified,
  promptLimitLabel,
  promptProgramScopes,
  VERIFICATION_LABELS,
} from "@/lib/prompts-shared";

/** Statuses that describe a prompt students may currently need to answer. */
const LIVE_STATUSES = ["verified", "pending_review", "conflicting"];

/**
 * Prompts for one college in the current cycle (live statuses only), plus any prompt from any cycle or status
 * that the user has already written a draft for, so no writing ever disappears from the workspace.
 */
export async function getCollegePromptsForUser(userId: string, collegeSlug: string): Promise<PromptRecord[]> {
  const academicYear = currentAcademicYear();
  const hasDraft = sql<boolean>`exists (select 1 from ${essayDrafts} d where d.user_id = ${userId} and d.prompt_id = ${prompts.promptId})`;

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
      verificationStatus: prompts.verificationStatus,
      sourceUrl: prompts.sourceUrl,
      conditionalRules: prompts.conditionalRules,
      staleReason: prompts.staleReason,
      lastVerifiedAt: prompts.lastVerifiedAt,
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
    .where(
      and(
        eq(prompts.collegeSlug, collegeSlug),
        or(
          and(
            inArray(prompts.verificationStatus, LIVE_STATUSES),
            or(eq(prompts.cycle, academicYear), isNull(prompts.cycle)),
          ),
          hasDraft,
        ),
      ),
    )
    .orderBy(sql`${prompts.displayOrder} asc nulls last`, asc(prompts.promptId));

  return rows.map((row) => ({
    ...row,
    selected: row.required ? true : Boolean(row.selected),
    completed: Boolean(row.completed),
    programScope: row.programScope ?? [],
    conditionalRules: (row.conditionalRules ?? {}) as PromptConditionalRules,
    lastVerifiedAt: row.lastVerifiedAt ? row.lastVerifiedAt.toISOString() : null,
  }));
}
