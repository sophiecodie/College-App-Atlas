"use server";

import { revalidatePath } from "next/cache";

import { db } from "@/db/client";
import { friendlyAiError } from "@/lib/ai/client";
import { requireCurrentUser } from "@/lib/app-data";
import {
  appendToPromptOutline,
  clearUnsavedThemes,
  createConnection,
  createIdeaCard,
  createOutlineFromTheme,
  deleteConnection,
  deleteIdeaCard,
  deleteOutline,
  deleteTheme,
  discoverConnections,
  exploreTheme,
  moveIdeaCard,
  type OutlineSection,
  saveOutline,
  setThemeSaved,
  updateIdeaCard,
} from "@/lib/studio/ideas";
import {
  copyDraftToPrompt,
  createPersonalStatementVersion,
  getEssayFeedback,
  restorePersonalStatementVersion,
  savePersonalStatementDraft,
  savePersonalStatementNotes,
} from "@/lib/studio/writing";

export type ActionResult<T = undefined> = { ok: true; data: T } | { ok: false; error: string };

async function attempt<T>(work: (userId: string) => Promise<T>, paths: string[] = ["/essays"]): Promise<ActionResult<T>> {
  const user = await requireCurrentUser();
  try {
    const data = await work(user.id);
    paths.forEach((path) => revalidatePath(path));
    return { ok: true, data };
  } catch (error) {
    return { ok: false, error: friendlyAiError(error) };
  }
}

// Idea cards and connections
export async function addIdeaCardAction(input: { category: string; title: string; detail: string; x?: number; y?: number }) {
  return attempt(async (userId) => {
    const card = await createIdeaCard(db, userId, input as never, input.x !== undefined ? { x: input.x, y: input.y ?? 0 } : undefined);
    return { ...card, createdAt: card.createdAt.toISOString(), updatedAt: card.updatedAt.toISOString() };
  }, []);
}

export async function updateIdeaCardAction(cardId: string, input: { category: string; title: string; detail: string }) {
  return attempt(async (userId) => {
    if (!(await updateIdeaCard(db, userId, cardId, input as never))) throw new Error("Card not found.");
  }, []);
}

export async function moveIdeaCardAction(cardId: string, x: number, y: number) {
  return attempt(async (userId) => {
    await moveIdeaCard(db, userId, cardId, x, y);
  }, []);
}

export async function deleteIdeaCardAction(cardId: string) {
  return attempt((userId) => deleteIdeaCard(db, userId, cardId), []);
}

export async function connectIdeasAction(sourceId: string, targetId: string) {
  return attempt(async (userId) => {
    const row = await createConnection(db, userId, sourceId, targetId);
    return row ? { id: row.id } : null;
  }, []);
}

export async function deleteConnectionAction(connectionId: string) {
  return attempt((userId) => deleteConnection(db, userId, connectionId), []);
}

// Themes
export async function discoverConnectionsAction(cardIds: string[]) {
  return attempt(async (userId) => {
    const themes = await discoverConnections(db, userId, cardIds);
    return themes.map((theme) => ({ ...theme, createdAt: theme.createdAt.toISOString(), updatedAt: theme.updatedAt.toISOString() }));
  });
}

export async function exploreThemeAction(themeId: string, note: string) {
  return attempt((userId) => exploreTheme(db, userId, themeId, note));
}

export async function setThemeSavedAction(themeId: string, saved: boolean) {
  return attempt((userId) => setThemeSaved(db, userId, themeId, saved));
}

export async function deleteThemeAction(themeId: string) {
  return attempt((userId) => deleteTheme(db, userId, themeId));
}

export async function clearUnsavedThemesAction() {
  return attempt((userId) => clearUnsavedThemes(db, userId));
}

export async function createOutlineFromThemeAction(themeId: string) {
  return attempt(async (userId) => (await createOutlineFromTheme(db, userId, themeId)).id);
}

// Outlines
export async function saveOutlineAction(outlineId: string, title: string, sections: OutlineSection[]) {
  return attempt((userId) => saveOutline(db, userId, outlineId, title, sections), []);
}

export async function deleteOutlineAction(outlineId: string) {
  return attempt((userId) => deleteOutline(db, userId, outlineId));
}

export async function addToPromptOutlineAction(promptId: string, section: OutlineSection) {
  return attempt((userId) => appendToPromptOutline(db, userId, promptId, section));
}

// Personal statement
export async function autosavePersonalStatementAction(draftId: string | null, content: string) {
  return attempt(async (userId) => {
    const row = await savePersonalStatementDraft(db, userId, draftId, content);
    return { id: row.id, savedAt: row.updatedAt.toISOString() };
  }, []);
}

export async function newPersonalStatementVersionAction(content: string, title: string) {
  return attempt(async (userId) => (await createPersonalStatementVersion(db, userId, content, title)).id);
}

export async function restorePersonalStatementVersionAction(versionId: string) {
  return attempt(async (userId) => (await restorePersonalStatementVersion(db, userId, versionId)).id);
}

export async function savePersonalStatementNotesAction(notes: string, selectedPrompt: string | null) {
  return attempt((userId) => savePersonalStatementNotes(db, userId, notes, selectedPrompt), []);
}

// Feedback (personal statement or supplemental)
export async function essayFeedbackAction(draft: string, promptText: string, wordLimit: number | null) {
  return attempt((userId) => getEssayFeedback(db, userId, { draft, promptText, wordLimit }), []);
}

export async function reuseDraftAction(sourceDraftId: string, targetPromptId: string) {
  return attempt((userId) => copyDraftToPrompt(db, userId, sourceDraftId, targetPromptId));
}
