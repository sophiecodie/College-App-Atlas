import type { UserCollegeRecord } from "@/lib/app-data";
import { REQUIREMENT_SECTIONS, TESTING_POLICY_OPTIONS } from "@/lib/workspace-state";

/** Share of a college's setup checkpoints done: checklist items plus round, track and status. */
export function getCollegeProgress(college: Pick<UserCollegeRecord, "requirementsChecklist" | "selectedApplicationType" | "programSelection" | "status">) {
  let total = 0;
  let done = 0;
  for (const section of REQUIREMENT_SECTIONS) {
    for (const item of section.items) {
      total += 1;
      const value = college.requirementsChecklist[item.key];
      if (item.type === "checkbox" && Boolean(value)) done += 1;
      if (item.type === "select" && typeof value === "string" && value !== TESTING_POLICY_OPTIONS[0]) done += 1;
    }
  }
  total += 3;
  if (college.selectedApplicationType) done += 1;
  if (college.programSelection) done += 1;
  if (college.status && college.status !== "In Progress") done += 1;
  if (college.status === "Submitted") done = total;
  return { completedSteps: done, totalSteps: total, percent: Math.round((done / total) * 100) };
}

/** "Due today", "Due in 3 days", "Due Nov 1", or null; urgent when within two weeks. */
export function dueLabel(isoDate: string | null, today = new Date()) {
  if (!isoDate) return null;
  const due = new Date(`${isoDate}T12:00:00Z`).getTime();
  const now = Date.UTC(today.getUTCFullYear(), today.getUTCMonth(), today.getUTCDate(), 12);
  const days = Math.round((due - now) / 86_400_000);
  if (days < 0) return { label: "Past due", urgent: true, days };
  if (days === 0) return { label: "Due today", urgent: true, days };
  if (days <= 14) return { label: `Due in ${days} day${days === 1 ? "" : "s"}`, urgent: true, days };
  return {
    label: `Due ${new Date(due).toLocaleDateString("en-US", { month: "short", day: "numeric", timeZone: "UTC" })}`,
    urgent: false,
    days,
  };
}

export function greetingFor(timeZone: string, now = new Date()) {
  let hour = now.getUTCHours();
  try {
    hour = Number(new Intl.DateTimeFormat("en-US", { hour: "numeric", hour12: false, timeZone }).format(now)) % 24;
  } catch {
    // Unknown time zone: fall back to UTC.
  }
  return hour < 12 ? "Good morning" : hour < 18 ? "Good afternoon" : "Good evening";
}
