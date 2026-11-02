import { defaultResearchEntry } from "@/lib/workspace-state";

import type { UserCollegeRecord } from "@/lib/app-data";

// Same sort choices as the NiceGUI research database.
export const RESEARCH_SORT_OPTIONS = [
  { value: "priority_level", label: "Priority" },
  { value: "application_deadline", label: "Deadline" },
  { value: "college", label: "College name" },
  { value: "reach_level", label: "Reach level" },
] as const;

export type SortMode = (typeof RESEARCH_SORT_OPTIONS)[number]["value"];
export type ResearchEntry = ReturnType<typeof defaultResearchEntry>;

export type ResearchRow = {
  college: UserCollegeRecord;
  entry: ResearchEntry;
  /** Verified official deadline for the selected round, else the student's own date (ISO), else null. */
  deadline?: string | null;
};

export function getSortMode(sort: string | undefined): SortMode {
  return RESEARCH_SORT_OPTIONS.some((option) => option.value === sort)
    ? (sort as SortMode)
    : "priority_level";
}

const PRIORITY_ORDER: Record<string, number> = { High: 0, Medium: 1, Low: 2 };
const REACH_ORDER: Record<string, number> = { "High Reach": 0, Reach: 1, Target: 2, Safety: 3 };

export function sortResearchCards(rows: ResearchRow[], sortBy: SortMode) {
  const byName = (left: ResearchRow, right: ResearchRow) => left.college.name.localeCompare(right.college.name);
  return [...rows].sort((left, right) => {
    if (sortBy === "priority_level") {
      return (PRIORITY_ORDER[left.entry.priority_level] ?? 9) - (PRIORITY_ORDER[right.entry.priority_level] ?? 9) || byName(left, right);
    }
    if (sortBy === "reach_level") {
      return (REACH_ORDER[left.entry.reach_level] ?? 9) - (REACH_ORDER[right.entry.reach_level] ?? 9) || byName(left, right);
    }
    if (sortBy === "application_deadline") {
      return (left.deadline ?? "9999").localeCompare(right.deadline ?? "9999") || byName(left, right);
    }
    return byName(left, right);
  });
}

/** NiceGUI status pills: [label, css class]. */
export function reachPill(reachLevel: string): [string, string] {
  return (
    {
      "High Reach": ["🔴 High Reach", "pill-reach-high"],
      Reach: ["🟠 Reach", "pill-reach"],
      Target: ["🔵 Target", "pill-target"],
      Safety: ["🟢 Safety", "pill-safety"],
    } as Record<string, [string, string]>
  )[reachLevel] ?? ["Reach Level: --", "pill-priority-medium"];
}

export function priorityPill(priorityLevel: string): [string, string] {
  return (
    {
      High: ["★ High Priority", "pill-priority-high"],
      Medium: ["○ Medium Priority", "pill-priority-medium"],
      Low: ["○ Low Priority", "pill-priority-low"],
    } as Record<string, [string, string]>
  )[priorityLevel] ?? ["Priority Level: --", "pill-priority-medium"];
}

export function visitPill(visitStatus: string) {
  return ({ Visited: "✓ Visited", Planned: "✈ Planned", "No Visit": "— No Visit" } as Record<string, string>)[visitStatus] ?? visitStatus;
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
