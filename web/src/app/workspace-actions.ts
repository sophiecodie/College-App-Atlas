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

export async function updateFees(formData: FormData) {
  const user = await requireCurrentUser();
  const collegeSlug = String(formData.get("collegeSlug") ?? "");
  const collegeName = String(formData.get("collegeName") ?? "");
  const rawCurrent = String(formData.get("current") ?? "{}");
  const current = normalizeFeeEntry(JSON.parse(rawCurrent), collegeName);

  current.application_fee = Number(formData.get("application_fee") ?? 0);
  current.fee_waiver_status = String(formData.get("fee_waiver_status") ?? current.fee_waiver_status);
  current.payment_status = String(formData.get("payment_status") ?? current.payment_status);
  current.notes = String(formData.get("notes") ?? "");
  current.css_profile_required = String(formData.get("css_profile_required") ?? "") === "on";
  current.css_profile_cost = Number(formData.get("css_profile_cost") ?? 0);
  current.fafsa_required = String(formData.get("fafsa_required") ?? "") === "on";
  current.fafsa_cost = Number(formData.get("fafsa_cost") ?? 0);
  current.sat_score_send_required = String(formData.get("sat_score_send_required") ?? "") === "on";
  current.sat_score_send_cost = Number(formData.get("sat_score_send_cost") ?? 0);
  current.ap_score_send_required = String(formData.get("ap_score_send_required") ?? "") === "on";
  current.ap_score_send_cost = Number(formData.get("ap_score_send_cost") ?? 0);

  await updateCollegeExtras(user.id, collegeSlug, { fees: current });
  revalidatePath(`/colleges/${collegeSlug}`);
  revalidatePath("/fees");
}

export async function updateCollegeRecommendations(formData: FormData) {
  const user = await requireCurrentUser();
  const collegeSlug = String(formData.get("collegeSlug") ?? "");
  const kind = String(formData.get("kind") ?? "required") as "required" | "optional";
  const index = Number(formData.get("index") ?? 0);
  const assigned = String(formData.get("assigned_recommender") ?? "");
  const rawCurrent = String(formData.get("current") ?? "[]");
  const current = normalizeRecommendationSlots(JSON.parse(rawCurrent), kind);
  if (index >= 0 && index < current.length) {
    current[index].assigned_recommender = assigned;
  }
  await updateCollegeExtras(
    user.id,
    collegeSlug,
    kind === "required"
      ? { requiredRecommendations: current }
      : { optionalRecommendations: current },
  );
  revalidatePath(`/colleges/${collegeSlug}`);
  revalidatePath("/recs");
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
  revalidatePath("/recs");
  revalidatePath("/colleges");
}

export async function deleteRecommender(formData: FormData) {
  const user = await requireCurrentUser();
  const workspace = await ensureWorkspaceState(user.id);
  const recommenders = normalizeRecommenders(workspace.recommenders);
  const name = String(formData.get("name") ?? "");
  await updateWorkspaceState(user.id, {
    recommenders: recommenders.filter((rec) => rec.name !== name),
  });
  revalidatePath("/recs");
  revalidatePath("/colleges");
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
