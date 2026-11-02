"use server";

import { revalidatePath } from "next/cache";

import { requireCurrentUser } from "@/lib/app-data";
import {
  defaultBrainstormActivity,
  defaultFinalActivity,
  defaultResearchEntry,
  ensureWorkspaceState,
  normalizeActivities,
  normalizeFeeEntry,
  normalizeRecommendationSlots,
  normalizeRecommenders,
  normalizeRequirementsChecklist,
  normalizeResearchData,
  updateCollegeExtras,
  updateWorkspaceState,
} from "@/lib/workspace-state";

export async function updateRequirements(formData: FormData) {
  const user = await requireCurrentUser();
  const collegeSlug = String(formData.get("collegeSlug") ?? "");
  const key = String(formData.get("key") ?? "");
  const value = String(formData.get("value") ?? "");
  const rawCurrent = String(formData.get("current") ?? "{}");
  const current = normalizeRequirementsChecklist(JSON.parse(rawCurrent));

  current[key] = value === "true" ? true : value === "false" ? false : value;
  await updateCollegeExtras(user.id, collegeSlug, { requirementsChecklist: current });
  revalidatePath(`/colleges/${collegeSlug}`);
}

export async function updateResearchEntry(formData: FormData) {
  const user = await requireCurrentUser();
  const workspace = await ensureWorkspaceState(user.id);
  const researchData = normalizeResearchData(workspace.researchData);
  const collegeSlug = String(formData.get("collegeSlug") ?? "");
  const current = researchData[collegeSlug] ?? defaultResearchEntry();

  current.location = String(formData.get("location") ?? current.location);
  current.reach_level = String(formData.get("reach_level") ?? current.reach_level);
  current.visit_status = String(formData.get("visit_status") ?? current.visit_status);
  current.priority_level = String(formData.get("priority_level") ?? current.priority_level);
  current.general_notes = String(formData.get("general_notes") ?? current.general_notes);
  current.academic_programs = String(formData.get("academic_programs") ?? current.academic_programs);
  current.campus_culture = String(formData.get("campus_culture") ?? current.campus_culture);
  current.why_us_material = String(formData.get("why_us_material") ?? current.why_us_material);
  current.personal_reflections = String(formData.get("personal_reflections") ?? current.personal_reflections);
  researchData[collegeSlug] = current;

  await updateWorkspaceState(user.id, { researchData });
  revalidatePath("/research");
  revalidatePath(`/research/${collegeSlug}`);
  revalidatePath(`/colleges/${collegeSlug}`);
}

export async function addRecommender(formData: FormData) {
  const user = await requireCurrentUser();
  const workspace = await ensureWorkspaceState(user.id);
  const recommenders = normalizeRecommenders(workspace.recommenders);
  const name = String(formData.get("name") ?? "").trim();
  if (!name) {
    return;
  }
  recommenders.push({
    name,
    role: String(formData.get("role") ?? "Teacher"),
    subject: String(formData.get("subject") ?? ""),
    notes: String(formData.get("notes") ?? ""),
  });
  await updateWorkspaceState(user.id, { recommenders });
  revalidatePath("/colleges");
  revalidatePath("/settings");
}

export async function deleteRecommender(formData: FormData) {
  const user = await requireCurrentUser();
  const workspace = await ensureWorkspaceState(user.id);
  const recommenders = normalizeRecommenders(workspace.recommenders);
  const name = String(formData.get("name") ?? "");
  await updateWorkspaceState(user.id, {
    recommenders: recommenders.filter((rec) => rec.name !== name),
  });
  revalidatePath("/colleges");
  revalidatePath("/settings");
}

export async function addActivity(formData: FormData) {
  const user = await requireCurrentUser();
  const workspace = await ensureWorkspaceState(user.id);
  const kind = String(formData.get("kind") ?? "brainstorm") as "brainstorm" | "final";
  const entries = normalizeActivities(
    kind === "brainstorm" ? workspace.brainstormActivities : workspace.finalActivities,
    kind,
  );
  entries.push(kind === "brainstorm" ? defaultBrainstormActivity() : defaultFinalActivity());
  await updateWorkspaceState(
    user.id,
    kind === "brainstorm"
      ? { brainstormActivities: entries }
      : { finalActivities: entries },
  );
  revalidatePath("/activities");
}

export async function saveActivity(formData: FormData) {
  const user = await requireCurrentUser();
  const workspace = await ensureWorkspaceState(user.id);
  const kind = String(formData.get("kind") ?? "brainstorm") as "brainstorm" | "final";
  const index = Number(formData.get("index") ?? 0);
  const entries = normalizeActivities(
    kind === "brainstorm" ? workspace.brainstormActivities : workspace.finalActivities,
    kind,
  );

  if (!entries[index]) {
    return;
  }

  const current = entries[index] as Record<string, unknown>;
  current.activity_name = String(formData.get("activity_name") ?? current.activity_name ?? "").trim();
  current.category = String(formData.get("category") ?? current.category ?? "Other").trim() || "Other";
  current.years_involved = String(formData.get("years_involved") ?? current.years_involved ?? "").trim();
  current.hours_per_week = Number(formData.get("hours_per_week") ?? current.hours_per_week ?? 0) || 0;

  if (kind === "brainstorm") {
    current.notes = String(formData.get("notes") ?? current.notes ?? "").trim();
  } else {
    current.role_position = String(formData.get("role_position") ?? current.role_position ?? "").trim();
    current.organization = String(formData.get("organization") ?? current.organization ?? "").trim();
    current.weeks_per_year = Number(formData.get("weeks_per_year") ?? current.weeks_per_year ?? 0) || 0;
    current.description = String(formData.get("description") ?? current.description ?? "").trim();
  }

  await updateWorkspaceState(
    user.id,
    kind === "brainstorm"
      ? { brainstormActivities: entries }
      : { finalActivities: entries },
  );
  revalidatePath("/activities");
}

export async function updateActivity(formData: FormData) {
  const user = await requireCurrentUser();
  const workspace = await ensureWorkspaceState(user.id);
  const kind = String(formData.get("kind") ?? "brainstorm") as "brainstorm" | "final";
  const index = Number(formData.get("index") ?? 0);
  const field = String(formData.get("field") ?? "");
  const value = String(formData.get("value") ?? "");
  const entries = normalizeActivities(
    kind === "brainstorm" ? workspace.brainstormActivities : workspace.finalActivities,
    kind,
  );
  if (entries[index]) {
    (entries[index] as Record<string, unknown>)[field] = value;
  }
  await updateWorkspaceState(
    user.id,
    kind === "brainstorm"
      ? { brainstormActivities: entries }
      : { finalActivities: entries },
  );
  revalidatePath("/activities");
}

export async function moveActivity(formData: FormData) {
  const user = await requireCurrentUser();
  const workspace = await ensureWorkspaceState(user.id);
  const kind = String(formData.get("kind") ?? "final") as "brainstorm" | "final";
  const index = Number(formData.get("index") ?? 0);
  const direction = Number(formData.get("direction") ?? 0);
  const entries = normalizeActivities(
    kind === "brainstorm" ? workspace.brainstormActivities : workspace.finalActivities,
    kind,
  );
  const nextIndex = index + direction;

  if (index < 0 || index >= entries.length || nextIndex < 0 || nextIndex >= entries.length) {
    return;
  }

  const [entry] = entries.splice(index, 1);
  entries.splice(nextIndex, 0, entry);

  await updateWorkspaceState(
    user.id,
    kind === "brainstorm"
      ? { brainstormActivities: entries }
      : { finalActivities: entries },
  );
  revalidatePath("/activities");
}

export async function deleteActivity(formData: FormData) {
  const user = await requireCurrentUser();
  const workspace = await ensureWorkspaceState(user.id);
  const kind = String(formData.get("kind") ?? "brainstorm") as "brainstorm" | "final";
  const index = Number(formData.get("index") ?? 0);
  const entries = normalizeActivities(
    kind === "brainstorm" ? workspace.brainstormActivities : workspace.finalActivities,
    kind,
  );
  entries.splice(index, 1);
  await updateWorkspaceState(
    user.id,
    kind === "brainstorm"
      ? { brainstormActivities: entries }
      : { finalActivities: entries },
  );
  revalidatePath("/activities");
}

export async function updateCollegeFees(formData: FormData) {
  const user = await requireCurrentUser();
  const collegeSlug = String(formData.get("collegeSlug") ?? "");
  const current = normalizeFeeEntry(JSON.parse(String(formData.get("current") ?? "{}")), "");
  const money = (key: string) => {
    const value = Number(formData.get(key));
    return Number.isFinite(value) && value >= 0 ? value : 0;
  };

  await updateCollegeExtras(user.id, collegeSlug, {
    fees: {
      ...current,
      application_fee: money("application_fee"),
      fee_waiver_status: String(formData.get("fee_waiver_status") ?? current.fee_waiver_status),
      payment_status: String(formData.get("payment_status") ?? current.payment_status),
      notes: String(formData.get("notes") ?? ""),
      css_profile_required: formData.get("css_profile_required") === "on",
      css_profile_cost: money("css_profile_cost"),
      sat_score_send_required: formData.get("sat_score_send_required") === "on",
      sat_score_send_cost: money("sat_score_send_cost"),
      ap_score_send_required: formData.get("ap_score_send_required") === "on",
      ap_score_send_cost: money("ap_score_send_cost"),
    },
  });
  revalidatePath(`/colleges/${collegeSlug}`);
}

export async function updateRecommendationSlots(formData: FormData) {
  const user = await requireCurrentUser();
  const collegeSlug = String(formData.get("collegeSlug") ?? "");
  const slots = (kind: "required" | "optional") => {
    const labels = formData.getAll(`${kind}_label`).map(String);
    const assigned = formData.getAll(`${kind}_assigned`).map(String);
    return labels.map((label, index) => ({ label, assigned_recommender: assigned[index] ?? "" }));
  };

  await updateCollegeExtras(user.id, collegeSlug, {
    requiredRecommendations: normalizeRecommendationSlots(slots("required"), "required"),
    optionalRecommendations: normalizeRecommendationSlots(slots("optional"), "optional"),
  });
  revalidatePath(`/colleges/${collegeSlug}`);
}
