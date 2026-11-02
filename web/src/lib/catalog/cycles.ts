import type { AdmissionRound } from "@/db/schema";

/**
 * The application cycle a student is working on at `date`. Cycles open around August 1
 * (Common App launch), so August 2026 onward is "2026-2027". `APPLICATION_CYCLE` overrides it.
 */
export function currentAcademicYear(date = new Date(), override = process.env.APPLICATION_CYCLE) {
  if (override && /^\d{4}-\d{4}$/.test(override)) {
    return override;
  }
  const year = date.getUTCFullYear();
  const start = date.getUTCMonth() >= 7 ? year : year - 1;
  return `${start}-${start + 1}`;
}

export function nextAcademicYear(academicYear: string) {
  const [start] = academicYear.split("-").map(Number);
  if (!start) {
    throw new Error(`Invalid academic year: ${academicYear}`);
  }
  return `${start + 1}-${start + 2}`;
}

export const ROUND_LABELS: Record<AdmissionRound, string> = {
  ED: "Early Decision",
  ED2: "Early Decision II",
  EA: "Early Action",
  EA2: "Early Action II",
  REA: "Restrictive Early Action",
  RD: "Regular Decision",
  ROLLING: "Rolling",
};

/** Labels shown in the round picker; stored in user_colleges.selected_application_type as before. */
export const APPLICATION_TYPE_OPTIONS = [
  "Regular Decision",
  "Early Action",
  "Early Action II",
  "Early Decision",
  "Early Decision II",
  "Restrictive Early Action",
  "Rolling",
];

const LABEL_TO_ROUND = new Map<string, AdmissionRound>(
  Object.entries(ROUND_LABELS).map(([round, label]) => [label.toLowerCase(), round as AdmissionRound]),
);

/** Maps the stored application-type label (or a round code) to a round code. */
export function roundFromApplicationType(value: string | null | undefined): AdmissionRound | null {
  const normalized = String(value ?? "").trim().toLowerCase();
  if (!normalized) {
    return null;
  }
  const upper = normalized.toUpperCase();
  if (upper in ROUND_LABELS) {
    return upper as AdmissionRound;
  }
  if (normalized === "single-choice early action" || normalized === "scea") {
    return "REA";
  }
  return LABEL_TO_ROUND.get(normalized) ?? null;
}
