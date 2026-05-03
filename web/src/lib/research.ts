import { defaultResearchEntry } from "@/lib/workspace-state";

import type { UserCollegeRecord } from "@/lib/app-data";

export const RESEARCH_SORT_OPTIONS = [
  { value: "alphabetical", label: "Alphabetical" },
] as const;

export type SortMode = (typeof RESEARCH_SORT_OPTIONS)[number]["value"];
export type ResearchEntry = ReturnType<typeof defaultResearchEntry>;

export type ResearchRow = {
  college: UserCollegeRecord;
  entry: ResearchEntry;
};

export function getSortMode(sort: string | undefined): SortMode {
  return RESEARCH_SORT_OPTIONS.some((option) => option.value === sort)
    ? (sort as SortMode)
    : "alphabetical";
}

export function sortResearchCards(rows: ResearchRow[], sortBy: SortMode) {
  return [...rows].sort((left, right) => {
    return left.college.name.localeCompare(right.college.name);
  });
}

export function reachDotClass(reachLevel: string) {
  return {
    "High Reach": "dot-reach-high",
    Reach: "dot-reach",
    Target: "dot-target",
    Safety: "dot-safety",
  }[reachLevel] ?? "dot-neutral";
}

export function priorityDotClass(priorityLevel: string) {
  return {
    High: "dot-priority-high",
    Medium: "dot-priority-medium",
    Low: "dot-priority-low",
  }[priorityLevel] ?? "dot-neutral";
}
