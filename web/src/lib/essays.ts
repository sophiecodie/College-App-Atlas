import "server-only";

import { and, eq, inArray } from "drizzle-orm";

import { db } from "@/db/client";
import { essayDrafts } from "@/db/schema";
import { getCollegePromptsForUser, promptIsActive } from "@/lib/prompts";
import { getUserColleges } from "@/lib/app-data";
import {
  type EssayDraftRecord,
  type EssayStatus,
  type EssayWorkspaceGroup,
  type EssayWorkspacePrompt,
  draftLengthForPrompt,
  normalizeEssayStatus,
  promptLimitValue,
} from "@/lib/essays-shared";

export async function getEssayWorkspaceForUser(userId: string): Promise<EssayWorkspaceGroup[]> {
  const colleges = await getUserColleges(userId);

  const groups = await Promise.all(
    colleges.map(async (college) => {
      const prompts = (await getCollegePromptsForUser(userId, college.slug)).filter((prompt) =>
        promptIsActive(college.programSelection, prompt),
      );

      if (prompts.length === 0) {
        return {
          college,
          prompts: [] as EssayWorkspacePrompt[],
        };
      }

      const promptIds = prompts.map((prompt) => prompt.promptId);
      const draftRows = await db
        .select({
          id: essayDrafts.id,
          promptId: essayDrafts.promptId,
          title: essayDrafts.title,
          content: essayDrafts.content,
          status: essayDrafts.status,
          createdAt: essayDrafts.createdAt,
          updatedAt: essayDrafts.updatedAt,
        })
        .from(essayDrafts)
        .where(
          and(
            eq(essayDrafts.userId, userId),
            inArray(essayDrafts.promptId, promptIds),
          ),
        );

      const versionsByPrompt = new Map<string, EssayDraftRecord[]>();
      for (const row of draftRows.sort((a, b) => {
        const left = a.createdAt ? new Date(a.createdAt).getTime() : 0;
        const right = b.createdAt ? new Date(b.createdAt).getTime() : 0;
        return left - right;
      })) {
        const current = versionsByPrompt.get(row.promptId) ?? [];
        current.push({
          id: row.id,
          title: row.title ?? "",
          content: row.content ?? "",
          status: normalizeEssayStatus(row.status, row.content ?? ""),
          updatedAt: row.updatedAt ? row.updatedAt.toISOString() : null,
        });
        versionsByPrompt.set(row.promptId, current);
      }

      return {
        college,
        prompts: prompts.map((prompt) => {
          const versions = versionsByPrompt.get(prompt.promptId) ?? [{
            id: `draft-${prompt.promptId}`,
            title: "",
            content: "",
            status: "not_started" as EssayStatus,
            updatedAt: null,
          }];
          const activeDraft = versions[versions.length - 1]!;
          const { value, unit } = promptLimitValue(prompt);
          const length = draftLengthForPrompt(prompt, activeDraft.content);
          return {
            ...prompt,
            versions,
            activeDraft,
            length,
            limitValue: value,
            limitUnit: unit,
            overLimit: value !== null && length > value,
          };
        }),
      };
    }),
  );

  return groups.filter((group) => group.prompts.length > 0);
}
