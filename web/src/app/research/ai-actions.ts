"use server";

import { revalidatePath } from "next/cache";

import { db } from "@/db/client";
import { aiConfigured, friendlyAiError } from "@/lib/ai/client";
import { requireCurrentUser } from "@/lib/app-data";
import { PoliteFetcher } from "@/lib/ingest/fetcher";
import {
  buildWhyCollegeConnections,
  deleteFinding,
  deleteUnsavedFindings,
  isResearchSection,
  linkFindingToPrompt,
  parseInterests,
  recheckFinding,
  researchSection,
  saveInterests,
  setFindingSaved,
  unlinkFindingFromPrompt,
  updateFinding,
} from "@/lib/research/findings";
import { searchConfigured, webSearch } from "@/lib/research/search";
import { defaultResearchEntry, ensureWorkspaceState, normalizeResearchData, updateWorkspaceState } from "@/lib/workspace-state";

type Result<T = undefined> = { ok: true; data: T } | { ok: false; error: string };

async function attempt<T>(work: (userId: string) => Promise<T>, paths: string[]): Promise<Result<T>> {
  const user = await requireCurrentUser();
  try {
    const data = await work(user.id);
    paths.forEach((path) => revalidatePath(path));
    return { ok: true, data };
  } catch (error) {
    return { ok: false, error: friendlyAiError(error) };
  }
}

export async function saveInterestsAction(collegeSlug: string, raw: string) {
  return attempt(async (userId) => {
    const interests = parseInterests(raw);
    await saveInterests(db, userId, collegeSlug, interests);
    return interests;
  }, []);
}

/** Runs one research section. The client calls this once per selected section. */
export async function runResearchSectionAction(collegeSlug: string, section: string, rawInterests: string) {
  return attempt(async (userId) => {
    if (!isResearchSection(section)) throw new Error("Unknown research section.");
    if (!aiConfigured()) throw new Error("AI research needs an AI provider key (ANTHROPIC_API_KEY or OPENAI_API_KEY) on the server.");
    const interests = parseInterests(rawInterests);
    await saveInterests(db, userId, collegeSlug, interests);
    if (section === "why_college") {
      return buildWhyCollegeConnections(db, userId, collegeSlug, interests);
    }
    if (!searchConfigured()) throw new Error("AI research needs a web search provider: use Claude as the AI provider, or set TAVILY_API_KEY or BRAVE_SEARCH_API_KEY.");
    const fetcher = new PoliteFetcher({ minDelayMs: 800 });
    return researchSection(db, userId, collegeSlug, section, interests, {
      search: webSearch,
      loadPage: (url) => fetcher.fetchPage(url),
    });
  }, ["/research"]);
}

export async function saveFindingAction(findingId: string, saved: boolean) {
  return attempt((userId) => setFindingSaved(db, userId, findingId, saved), ["/research", "/essays"]);
}

export async function editFindingAction(findingId: string, edit: { title: string; summary: string; relevance: string; notes: string }) {
  return attempt((userId) => updateFinding(db, userId, findingId, edit), ["/research", "/essays"]);
}

export async function deleteFindingAction(findingId: string) {
  return attempt((userId) => deleteFinding(db, userId, findingId), ["/research", "/essays"]);
}

export async function clearUnsavedFindingsAction() {
  return attempt((userId) => deleteUnsavedFindings(db, userId), ["/research"]);
}

export async function recheckFindingAction(findingId: string) {
  return attempt((userId) => recheckFinding(db, userId, findingId, (url) => new PoliteFetcher().fetchPage(url)), ["/research"]);
}

export async function linkFindingAction(findingId: string, promptId: string, linked: boolean) {
  return attempt(async (userId) => {
    if (linked) await linkFindingToPrompt(db, userId, findingId, promptId);
    else await unlinkFindingFromPrompt(db, userId, findingId, promptId);
  }, ["/research", "/essays"]);
}

/** Appends a finding to the college's existing "Why us" research notes; existing notes are kept. */
export async function addFindingToNotesAction(collegeSlug: string, text: string) {
  return attempt(async (userId) => {
    const workspace = await ensureWorkspaceState(userId);
    const researchData = normalizeResearchData(workspace.researchData);
    const entry = researchData[collegeSlug] ?? defaultResearchEntry();
    entry.why_us_material = [entry.why_us_material.trim(), text.trim()].filter(Boolean).join("\n\n").slice(0, 20_000);
    researchData[collegeSlug] = entry;
    await updateWorkspaceState(userId, { researchData });
  }, ["/research", `/research/${collegeSlug}`, `/colleges/${collegeSlug}`]);
}
