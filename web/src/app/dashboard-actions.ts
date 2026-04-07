"use server";

import { revalidatePath } from "next/cache";

import { requireCurrentUser } from "@/lib/app-data";
import { ensureWorkspaceState, normalizeHomeTasks, normalizeSettingsState, updateWorkspaceState } from "@/lib/workspace-state";

export async function addHomeTask(formData: FormData) {
  const user = await requireCurrentUser();
  const workspace = await ensureWorkspaceState(user.id);
  const tasks = normalizeHomeTasks(workspace.homeTasks);
  const title = String(formData.get("title") ?? "").trim();
  const dueDate = String(formData.get("dueDate") ?? "").trim();
  const priority = String(formData.get("priority") ?? "").trim();

  if (!title) {
    return;
  }

  const nextId = Math.max(0, ...tasks.map((task) => task.id)) + 1;
  tasks.push({
    id: nextId,
    title,
    completed: false,
    due_date: dueDate,
    priority,
  });

  await updateWorkspaceState(user.id, { homeTasks: tasks });
  revalidatePath("/app");
}

export async function toggleHomeTask(formData: FormData) {
  const user = await requireCurrentUser();
  const workspace = await ensureWorkspaceState(user.id);
  const tasks = normalizeHomeTasks(workspace.homeTasks);
  const taskId = Number(formData.get("taskId") ?? 0);

  const nextTasks = tasks.map((task) =>
    task.id === taskId ? { ...task, completed: !task.completed } : task,
  );

  await updateWorkspaceState(user.id, { homeTasks: nextTasks });
  revalidatePath("/app");
}

export async function deleteHomeTask(formData: FormData) {
  const user = await requireCurrentUser();
  const workspace = await ensureWorkspaceState(user.id);
  const tasks = normalizeHomeTasks(workspace.homeTasks);
  const taskId = Number(formData.get("taskId") ?? 0);

  await updateWorkspaceState(user.id, {
    homeTasks: tasks.filter((task) => task.id !== taskId),
  });
  revalidatePath("/app");
}

export async function saveSettings(formData: FormData) {
  const user = await requireCurrentUser();
  const workspace = await ensureWorkspaceState(user.id);
  const current = normalizeSettingsState(workspace.settingsState);

  const nextState = {
    profile: {
      student_name: String(formData.get("student_name") ?? current.profile.student_name),
      graduation_year: String(formData.get("graduation_year") ?? current.profile.graduation_year),
      high_school: String(formData.get("high_school") ?? current.profile.high_school),
      intended_major: String(formData.get("intended_major") ?? current.profile.intended_major),
      time_zone: String(formData.get("time_zone") ?? current.profile.time_zone),
    },
    appearance: {
      accent_theme: String(formData.get("accent_theme") ?? current.appearance.accent_theme),
      layout_density: String(formData.get("layout_density") ?? current.appearance.layout_density),
      dark_mode: String(formData.get("dark_mode") ?? "") === "on",
    },
  };

  await updateWorkspaceState(user.id, { settingsState: nextState });
  revalidatePath("/settings");
  revalidatePath("/app");
}
