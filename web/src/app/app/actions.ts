"use server";

import { and, eq } from "drizzle-orm";
import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";

import { db } from "@/db/client";
import { userColleges, userPromptPreferences } from "@/db/schema";
import { requireCurrentUser } from "@/lib/app-data";
import { addCollegeForUser, removeCollegeForUser, setPersonalDeadline } from "@/lib/catalog/user-colleges";

export async function addCollegeToDashboard(formData: FormData) {
  const user = await requireCurrentUser();
  const collegeSlug = String(formData.get("collegeSlug") ?? "").trim();

  if (!collegeSlug) {
    return;
  }

  await addCollegeForUser(
    db,
    user.id,
    collegeSlug,
    String(formData.get("selectedApplicationType") ?? "").trim() || null,
  );

  revalidatePath("/app");
  revalidatePath("/colleges");
  revalidatePath(`/colleges/${collegeSlug}`);
  revalidatePath("/essays");

  const returnTo = String(formData.get("returnTo") ?? "");
  if (returnTo.startsWith("/colleges")) {
    redirect(returnTo);
  }
}

export async function updateUserCollege(formData: FormData) {
  const user = await requireCurrentUser();
  const collegeSlug = String(formData.get("collegeSlug") ?? "").trim();

  if (!collegeSlug) {
    return;
  }

  await db
    .update(userColleges)
    .set({
      selectedApplicationType: String(formData.get("selectedApplicationType") ?? "").trim() || null,
      programSelection: String(formData.get("programSelection") ?? "").trim() || null,
      status: String(formData.get("status") ?? "").trim() || null,
      quickNotes: String(formData.get("quickNotes") ?? ""),
      updatedAt: new Date(),
    })
    .where(and(eq(userColleges.userId, user.id), eq(userColleges.collegeSlug, collegeSlug)));

  revalidatePath("/app");
  revalidatePath("/colleges");
  revalidatePath(`/colleges/${collegeSlug}`);
  revalidatePath("/essays");
}

export async function removeCollegeFromDashboard(formData: FormData) {
  const user = await requireCurrentUser();
  const collegeSlug = String(formData.get("collegeSlug") ?? "").trim();

  if (!collegeSlug) {
    return;
  }

  // Archived, not deleted: re-adding the college restores its notes, checklist and prompt choices.
  await removeCollegeForUser(db, user.id, collegeSlug);

  revalidatePath("/app");
  revalidatePath("/colleges");
  revalidatePath(`/colleges/${collegeSlug}`);
  revalidatePath("/research");
  revalidatePath(`/research/${collegeSlug}`);
  revalidatePath("/essays");

  redirect("/colleges");
}

export async function updatePersonalDeadline(formData: FormData) {
  const user = await requireCurrentUser();
  const collegeSlug = String(formData.get("collegeSlug") ?? "").trim();

  if (!collegeSlug) {
    return;
  }

  await setPersonalDeadline(
    db,
    user.id,
    collegeSlug,
    String(formData.get("personalDeadline") ?? "").trim() || null,
    String(formData.get("personalDeadlineNote") ?? ""),
  );

  revalidatePath("/app");
  revalidatePath(`/colleges/${collegeSlug}`);
}

export async function updatePromptPreference(formData: FormData) {
  const user = await requireCurrentUser();
  const promptId = String(formData.get("promptId") ?? "").trim();
  const collegeSlug = String(formData.get("collegeSlug") ?? "").trim();

  if (!promptId || !collegeSlug) {
    return;
  }

  const selected = String(formData.get("selected") ?? "").trim() === "true";
  const completed = String(formData.get("completed") ?? "").trim() === "true";

  const [existing] = await db
    .select({ id: userPromptPreferences.id })
    .from(userPromptPreferences)
    .where(and(eq(userPromptPreferences.userId, user.id), eq(userPromptPreferences.promptId, promptId)))
    .limit(1);

  if (existing) {
    await db
      .update(userPromptPreferences)
      .set({
        selected,
        completed,
        updatedAt: new Date(),
      })
      .where(eq(userPromptPreferences.id, existing.id));
  } else {
    await db.insert(userPromptPreferences).values({
      userId: user.id,
      promptId,
      selected,
      completed,
    });
  }

  revalidatePath(`/colleges/${collegeSlug}`);
  revalidatePath("/essays");
}
