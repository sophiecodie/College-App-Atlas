import { and, eq } from "drizzle-orm";

import { db } from "@/db/client";
import { userColleges, userWorkspaceState } from "@/db/schema";

export const TASK_PRIORITY_OPTIONS = ["", "High", "Medium", "Low"] as const;
export const TESTING_POLICY_OPTIONS = [
  "Not required",
  "Self-report",
  "Official report required",
] as const;

export const REQUIREMENT_SECTIONS = [
  {
    title: "Application",
    items: [
      { key: "common_app_submitted", label: "Common App submitted", type: "checkbox" },
      { key: "supplement_submitted", label: "Supplement submitted", type: "checkbox" },
    ],
  },
  {
    title: "Testing",
    items: [
      { key: "sat_requirement", label: "SAT requirement", type: "select", completionKey: "sat_requirement_completed" },
      { key: "act_accepted", label: "ACT accepted", type: "select", completionKey: "act_accepted_completed" },
      { key: "ap_requirement", label: "AP score requirement", type: "select", completionKey: "ap_requirement_completed" },
    ],
  },
  {
    title: "Documents",
    items: [
      { key: "transcript", label: "Transcript", type: "checkbox" },
      { key: "school_report", label: "School report", type: "checkbox" },
      { key: "counselor_recommendation", label: "Counselor recommendation", type: "checkbox" },
      { key: "teacher_recommendations", label: "Teacher recommendations", type: "checkbox" },
      { key: "midyear_report", label: "Midyear report", type: "checkbox" },
    ],
  },
  {
    title: "Financial Aid",
    items: [
      { key: "fafsa", label: "FAFSA", type: "checkbox" },
      { key: "css_profile", label: "CSS Profile", type: "checkbox" },
    ],
  },
  {
    title: "Extras",
    items: [
      { key: "interview", label: "Interview", type: "checkbox" },
      { key: "portfolio", label: "Portfolio", type: "checkbox" },
    ],
  },
] as const;

export function defaultRequirementsChecklist() {
  const result: Record<string, string | boolean> = {};
  for (const section of REQUIREMENT_SECTIONS) {
    for (const item of section.items) {
      result[item.key] = item.type === "checkbox" ? false : TESTING_POLICY_OPTIONS[0];
      if (item.type === "select" && item.completionKey) {
        result[item.completionKey] = false;
      }
    }
  }
  return result;
}

export function normalizeRequirementsChecklist(
  raw: unknown,
): Record<string, string | boolean> {
  const base = defaultRequirementsChecklist();
  if (!raw || typeof raw !== "object" || Array.isArray(raw)) {
    return base;
  }

  const source = raw as Record<string, unknown>;
  for (const section of REQUIREMENT_SECTIONS) {
    for (const item of section.items) {
      if (item.type === "checkbox") {
        base[item.key] = Boolean(source[item.key]);
      } else if (typeof source[item.key] === "string" && TESTING_POLICY_OPTIONS.includes(source[item.key] as (typeof TESTING_POLICY_OPTIONS)[number])) {
        base[item.key] = source[item.key] as string;
      }
      if (item.type === "select" && item.completionKey) {
        base[item.completionKey] = Boolean(source[item.completionKey]);
      }
    }
  }
  return base;
}

export function defaultFeeEntry() {
  return {
    college_name: "",
    application_fee: 0,
    fee_waiver_status: "Not requested",
    payment_status: "Not paid",
    notes: "",
    css_profile_required: false,
    css_profile_cost: 0,
    fafsa_required: false,
    fafsa_cost: 0,
    sat_score_send_required: false,
    sat_score_send_cost: 0,
    ap_score_send_required: false,
    ap_score_send_cost: 0,
  };
}

export function normalizeFeeEntry(raw: unknown, collegeName: string) {
  const base = defaultFeeEntry();
  if (raw && typeof raw === "object" && !Array.isArray(raw)) {
    Object.assign(base, raw);
  }
  base.college_name = String(base.college_name || collegeName);
  return base;
}

export function defaultRecommendationSlots(kind: "required" | "optional") {
  const count = kind === "required" ? 2 : 1;
  const prefix = kind === "required" ? "Required Recommender" : "Optional Recommender";
  return Array.from({ length: count }, (_, index) => ({
    label: `${prefix} ${index + 1}`,
    assigned_recommender: "",
  }));
}

export function normalizeRecommendationSlots(raw: unknown, kind: "required" | "optional") {
  const base = defaultRecommendationSlots(kind);
  if (!Array.isArray(raw)) {
    return base;
  }
  return base.map((slot, index) => {
    const source = raw[index];
    if (!source || typeof source !== "object" || Array.isArray(source)) {
      return slot;
    }
    const record = source as Record<string, unknown>;
    return {
      label: String(record.label || slot.label),
      assigned_recommender: String(record.assigned_recommender || ""),
    };
  });
}

export function defaultWorkspaceSettings() {
  return {
    profile: {
      student_name: "Student Name",
      graduation_year: "2027",
      high_school: "High School",
      intended_major: "Undeclared",
      time_zone: "America/New_York",
    },
    appearance: {
      accent_theme: "Rosewood",
      layout_density: "Cozy",
      dark_mode: false,
    },
    essayWorkspace: {
      selectedPromptId: null as string | null,
      promptTags: {} as Record<string, string[]>,
    },
  };
}

export function defaultWorkspaceState() {
  return {
    homeTasks: [] as Array<Record<string, unknown>>,
    researchData: {} as Record<string, unknown>,
    recommenders: [] as Array<Record<string, unknown>>,
    brainstormActivities: [] as Array<Record<string, unknown>>,
    finalActivities: [] as Array<Record<string, unknown>>,
    settingsState: defaultWorkspaceSettings(),
  };
}

export function normalizeHomeTasks(raw: unknown) {
  if (!Array.isArray(raw)) {
    return [] as Array<{
      id: number;
      title: string;
      completed: boolean;
      due_date: string;
      priority: string;
    }>;
  }

  return raw
    .map((item, index) => {
      if (!item || typeof item !== "object" || Array.isArray(item)) {
        return null;
      }
      const row = item as Record<string, unknown>;
      const priority = String(row.priority || "");
      return {
        id: Number(row.id || index + 1),
        title: String(row.title || "").trim(),
        completed: Boolean(row.completed),
        due_date: String(row.due_date || ""),
        priority: TASK_PRIORITY_OPTIONS.includes(priority as (typeof TASK_PRIORITY_OPTIONS)[number]) ? priority : "",
      };
    })
    .filter((item): item is NonNullable<typeof item> => Boolean(item && item.title));
}

export function normalizeSettingsState(raw: unknown) {
  const base = defaultWorkspaceSettings();
  if (!raw || typeof raw !== "object" || Array.isArray(raw)) {
    return base;
  }
  const source = raw as Record<string, unknown>;
  const profile = source.profile && typeof source.profile === "object" && !Array.isArray(source.profile)
    ? (source.profile as Record<string, unknown>)
    : {};
  const appearance = source.appearance && typeof source.appearance === "object" && !Array.isArray(source.appearance)
    ? (source.appearance as Record<string, unknown>)
    : {};

  return {
    profile: {
      student_name: String(profile.student_name || base.profile.student_name),
      graduation_year: String(profile.graduation_year || base.profile.graduation_year),
      high_school: String(profile.high_school || base.profile.high_school),
      intended_major: String(profile.intended_major || base.profile.intended_major),
      time_zone: String(profile.time_zone || base.profile.time_zone),
    },
    appearance: {
      accent_theme: String(appearance.accent_theme || base.appearance.accent_theme),
      layout_density: String(appearance.layout_density || base.appearance.layout_density),
      dark_mode: Boolean(appearance.dark_mode),
    },
    essayWorkspace: normalizeEssayWorkspaceSettings(source.essayWorkspace),
  };
}

export function normalizeEssayWorkspaceSettings(raw: unknown) {
  const base = defaultWorkspaceSettings().essayWorkspace;
  if (!raw || typeof raw !== "object" || Array.isArray(raw)) {
    return base;
  }

  const source = raw as Record<string, unknown>;
  const rawPromptTags =
    source.promptTags && typeof source.promptTags === "object" && !Array.isArray(source.promptTags)
      ? (source.promptTags as Record<string, unknown>)
      : {};

  const promptTags: Record<string, string[]> = {};
  for (const [promptId, value] of Object.entries(rawPromptTags)) {
    if (!Array.isArray(value)) {
      continue;
    }
    const tags = value
      .map((tag) => String(tag ?? "").trim())
      .filter(Boolean);
    if (tags.length > 0) {
      promptTags[promptId] = tags;
    }
  }

  return {
    selectedPromptId: source.selectedPromptId ? String(source.selectedPromptId) : null,
    promptTags,
  };
}

export function defaultResearchEntry(deadline = "TBD") {
  return {
    location: "TBD",
    application_deadline: deadline,
    reach_level: "--",
    visit_status: "No Visit",
    priority_level: "--",
    general_notes: "",
    academic_programs: "",
    campus_culture: "",
    why_us_material: "",
    personal_reflections: "",
  };
}

export function normalizeResearchData(raw: unknown) {
  if (!raw || typeof raw !== "object" || Array.isArray(raw)) {
    return {} as Record<string, ReturnType<typeof defaultResearchEntry>>;
  }
  const source = raw as Record<string, unknown>;
  const result: Record<string, ReturnType<typeof defaultResearchEntry>> = {};
  for (const [slug, value] of Object.entries(source)) {
    const base = defaultResearchEntry();
    if (value && typeof value === "object" && !Array.isArray(value)) {
      Object.assign(base, value);
    }
    result[slug] = base;
  }
  return result;
}

export function normalizeRecommenders(raw: unknown) {
  if (!Array.isArray(raw)) {
    return [] as Array<{
      name: string;
      role: string;
      subject: string;
      notes: string;
    }>;
  }
  return raw
    .map((item) => {
      if (!item || typeof item !== "object" || Array.isArray(item)) {
        return null;
      }
      const row = item as Record<string, unknown>;
      const name = String(row.name || "").trim();
      if (!name) {
        return null;
      }
      return {
        name,
        role: String(row.role || "Teacher"),
        subject: String(row.subject || ""),
        notes: String(row.notes || ""),
      };
    })
    .filter((item): item is NonNullable<typeof item> => Boolean(item));
}

export function defaultBrainstormActivity() {
  return {
    activity_name: "",
    category: "Other",
    notes: "",
    years_involved: "",
    hours_per_week: 0,
  };
}

export function defaultFinalActivity() {
  return {
    activity_name: "",
    role_position: "",
    organization: "",
    description: "",
    years_involved: "",
    hours_per_week: 0,
    weeks_per_year: 0,
    category: "Other",
  };
}

export function normalizeActivities(raw: unknown, kind: "brainstorm" | "final") {
  const baseFactory = kind === "brainstorm" ? defaultBrainstormActivity : defaultFinalActivity;
  if (!Array.isArray(raw)) {
    return [] as Array<Record<string, unknown>>;
  }
  return raw
    .map((item) => {
      if (!item || typeof item !== "object" || Array.isArray(item)) {
        return null;
      }
      return { ...baseFactory(), ...(item as Record<string, unknown>) };
    })
    .filter((item): item is NonNullable<typeof item> => Boolean(item));
}

export async function ensureWorkspaceState(userId: string) {
  const [existing] = await db
    .select()
    .from(userWorkspaceState)
    .where(eq(userWorkspaceState.userId, userId))
    .limit(1);

  if (existing) {
    return existing;
  }

  const [created] = await db
    .insert(userWorkspaceState)
    .values({
      userId,
      homeTasks: [],
      researchData: {},
      recommenders: [],
      brainstormActivities: [],
      finalActivities: [],
      settingsState: defaultWorkspaceSettings(),
    })
    .returning();

  return created;
}

export async function updateWorkspaceState(
  userId: string,
  updates: Partial<{
    homeTasks: unknown;
    researchData: unknown;
    recommenders: unknown;
    brainstormActivities: unknown;
    finalActivities: unknown;
    settingsState: unknown;
  }>,
) {
  const current = await ensureWorkspaceState(userId);
  await db
    .update(userWorkspaceState)
    .set({
      ...updates,
      updatedAt: new Date(),
    })
    .where(eq(userWorkspaceState.id, current.id));
}

export async function updateCollegeExtras(
  userId: string,
  collegeSlug: string,
  updates: Partial<{
    requirementsChecklist: unknown;
    fees: unknown;
    requiredRecommendations: unknown;
    optionalRecommendations: unknown;
  }>,
) {
  await db
    .update(userColleges)
    .set({
      ...updates,
      updatedAt: new Date(),
    })
    .where(and(eq(userColleges.userId, userId), eq(userColleges.collegeSlug, collegeSlug)));
}
