"use server";

import { notFound } from "next/navigation";
import { revalidatePath } from "next/cache";

import { db } from "@/db/client";
import { isAdminEmail } from "@/lib/admin";
import { requireCurrentUser } from "@/lib/app-data";
import {
  approve,
  clearStale,
  editDeadline,
  editPrompt,
  isVerificationStatus,
  type ReviewEntity,
  setStatus,
} from "@/lib/catalog/review";

async function requireAdmin() {
  const user = await requireCurrentUser();
  if (!isAdminEmail(user.email)) {
    notFound();
  }
  return user;
}

function entityFrom(formData: FormData): { entity: ReviewEntity; id: string } {
  const entity = String(formData.get("entity") ?? "");
  const id = String(formData.get("id") ?? "").trim();
  if ((entity !== "prompt" && entity !== "deadline") || !id) {
    throw new Error("Invalid review target");
  }
  return { entity, id };
}

function intOrNull(value: FormDataEntryValue | null) {
  const parsed = Number.parseInt(String(value ?? "").trim(), 10);
  return Number.isFinite(parsed) && parsed > 0 ? parsed : null;
}

function textOrNull(value: FormDataEntryValue | null) {
  return String(value ?? "").trim() || null;
}

function refresh() {
  revalidatePath("/admin");
  revalidatePath("/colleges", "layout");
  revalidatePath("/essays");
  revalidatePath("/app");
}

export async function reviewAction(formData: FormData) {
  const user = await requireAdmin();
  const { entity, id } = entityFrom(formData);
  const decision = String(formData.get("decision") ?? "");
  const note = textOrNull(formData.get("note")) ?? undefined;

  if (decision === "approve") {
    await approve(db, entity, id, user.email);
  } else if (decision === "still_valid") {
    await clearStale(db, entity, id, user.email);
  } else if (isVerificationStatus(decision)) {
    await setStatus(db, entity, id, decision, user.email, note);
  } else {
    throw new Error("Unknown decision");
  }
  refresh();
}

export async function editPromptAction(formData: FormData) {
  const user = await requireAdmin();
  const id = String(formData.get("id") ?? "").trim();
  const text = String(formData.get("text") ?? "").trim();
  if (!id || text.length < 8) {
    throw new Error("Prompt text is required");
  }
  await editPrompt(
    db,
    id,
    {
      text,
      wordLimit: intOrNull(formData.get("wordLimit")),
      wordMin: intOrNull(formData.get("wordMin")),
      characterLimit: intOrNull(formData.get("characterLimit")),
      required: formData.get("required") === "on",
      optionalChoice: formData.get("optionalChoice") === "on",
      category: textOrNull(formData.get("category")),
      programScope: String(formData.get("programScope") ?? "")
        .split(",")
        .map((scope) => scope.trim().toLowerCase())
        .filter(Boolean),
    },
    user.email,
  );
  refresh();
}

export async function editDeadlineAction(formData: FormData) {
  const user = await requireAdmin();
  const id = String(formData.get("id") ?? "").trim();
  const date = textOrNull(formData.get("date"));
  if (!id || (date && !/^\d{4}-\d{2}-\d{2}$/.test(date))) {
    throw new Error("Invalid deadline");
  }
  await editDeadline(
    db,
    id,
    {
      date,
      time: textOrNull(formData.get("time")),
      timezone: textOrNull(formData.get("timezone")),
      conditions: textOrNull(formData.get("conditions")),
    },
    user.email,
  );
  refresh();
}
