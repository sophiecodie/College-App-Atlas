import type { PromptRecord } from "@/lib/prompts-shared";

export const ESSAY_STATUS_OPTIONS = [
  "not_started",
  "brainstorming",
  "drafting",
  "revising",
  "ready_for_review",
  "complete",
] as const;

export type EssayStatus = (typeof ESSAY_STATUS_OPTIONS)[number];

export type EssayDraftRecord = {
  id: string;
  title: string;
  content: string;
  status: EssayStatus;
  updatedAt: string | null;
};

export type EssayWorkspacePrompt = PromptRecord & {
  versions: EssayDraftRecord[];
  activeDraft: EssayDraftRecord;
  length: number;
  limitValue: number | null;
  limitUnit: "words" | "characters" | null;
  overLimit: boolean;
};

export type EssayWorkspaceCollege = {
  id: string;
  slug: string;
  name: string;
  applicationCycle: string | null;
  selectedApplicationType: string | null;
  programSelection: string | null;
  status: string | null;
  quickNotes: string | null;
  promptCount: number;
  requirementsChecklist: Record<string, string | boolean>;
  fees: Record<string, unknown>;
  requiredRecommendations: Array<{ label: string; assigned_recommender: string }>;
  optionalRecommendations: Array<{ label: string; assigned_recommender: string }>;
};

export type EssayWorkspaceGroup = {
  college: EssayWorkspaceCollege;
  prompts: EssayWorkspacePrompt[];
};

export function countWords(text: string) {
  const normalized = String(text ?? "").trim();
  return normalized ? normalized.split(/\s+/).length : 0;
}

export function countCharacters(text: string) {
  return String(text ?? "").length;
}

export function normalizeEssayStatus(status: string | null | undefined, content = ""): EssayStatus {
  const normalized = String(status ?? "").trim().toLowerCase();
  const nextStatus = ESSAY_STATUS_OPTIONS.includes(normalized as EssayStatus)
    ? (normalized as EssayStatus)
    : "not_started";

  if (!String(content ?? "").trim()) {
    return "not_started";
  }

  return nextStatus;
}

export function essayStatusLabel(status: EssayStatus) {
  return status
    .split("_")
    .map((part) => part.charAt(0).toUpperCase() + part.slice(1))
    .join(" ");
}

export function promptLimitValue(
  prompt: Pick<PromptRecord, "wordLimit" | "characterLimit">,
): { value: number | null; unit: "words" | "characters" | null } {
  if (prompt.characterLimit && prompt.characterLimit > 0) {
    return { value: prompt.characterLimit, unit: "characters" };
  }

  if (prompt.wordLimit && prompt.wordLimit > 0) {
    return { value: prompt.wordLimit, unit: "words" };
  }

  return { value: null, unit: null };
}

export function draftLengthForPrompt(
  prompt: Pick<PromptRecord, "wordLimit" | "characterLimit">,
  content: string,
) {
  const { unit } = promptLimitValue(prompt);
  return unit === "characters" ? countCharacters(content) : countWords(content);
}
