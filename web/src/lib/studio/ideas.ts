import { randomUUID } from "node:crypto";

import { and, asc, desc, eq, inArray, isNull } from "drizzle-orm";
import { z } from "zod";

import type { AtlasDb } from "@/db/connect";
import { essayOutlines, generatedThemes, ideaCards, ideaConnections } from "@/db/schema";
import { jsonArray, jsonEnum, jsonObject, jsonString, type ModelCaller, runStructured } from "@/lib/ai/client";
import { IDEA_CATEGORIES, type IdeaCategory, type OutlineSection, type ThemePayload, type Exploration } from "@/lib/studio/ideas-shared";

export { IDEA_CATEGORIES, type IdeaCategory, type OutlineSection, type ThemePayload, type Exploration };

const CATEGORY_IDS = IDEA_CATEGORIES.map((category) => category.id) as [IdeaCategory, ...IdeaCategory[]];

export const ideaCardInput = z.object({
  category: z.enum(CATEGORY_IDS),
  title: z.string().trim().min(1).max(120),
  detail: z.string().trim().max(1500).default(""),
});

export async function listIdeaCards(db: AtlasDb, userId: string) {
  return db.select().from(ideaCards).where(eq(ideaCards.userId, userId)).orderBy(asc(ideaCards.createdAt));
}

export async function createIdeaCard(db: AtlasDb, userId: string, input: z.input<typeof ideaCardInput>, position?: { x: number; y: number }) {
  const data = ideaCardInput.parse(input);
  const count = (await listIdeaCards(db, userId)).length;
  const [card] = await db
    .insert(ideaCards)
    .values({
      userId,
      ...data,
      posX: position?.x ?? 40 + (count % 4) * 240,
      posY: position?.y ?? 40 + Math.floor(count / 4) * 170,
    })
    .returning();
  return card!;
}

export async function updateIdeaCard(db: AtlasDb, userId: string, cardId: string, input: z.input<typeof ideaCardInput>) {
  const data = ideaCardInput.parse(input);
  const rows = await db
    .update(ideaCards)
    .set({ ...data, updatedAt: new Date() })
    .where(and(eq(ideaCards.id, cardId), eq(ideaCards.userId, userId)))
    .returning({ id: ideaCards.id });
  return rows.length > 0;
}

export async function moveIdeaCard(db: AtlasDb, userId: string, cardId: string, x: number, y: number) {
  if (!Number.isFinite(x) || !Number.isFinite(y)) return false;
  const rows = await db
    .update(ideaCards)
    .set({ posX: x, posY: y })
    .where(and(eq(ideaCards.id, cardId), eq(ideaCards.userId, userId)))
    .returning({ id: ideaCards.id });
  return rows.length > 0;
}

export async function deleteIdeaCard(db: AtlasDb, userId: string, cardId: string) {
  await db.delete(ideaCards).where(and(eq(ideaCards.id, cardId), eq(ideaCards.userId, userId)));
}

export async function listConnections(db: AtlasDb, userId: string) {
  return db.select().from(ideaConnections).where(and(eq(ideaConnections.userId, userId), isNull(ideaConnections.themeId)));
}

/** A link the student drew by hand. Both cards must belong to the user. */
export async function createConnection(db: AtlasDb, userId: string, sourceId: string, targetId: string, label = "") {
  if (sourceId === targetId) return null;
  const owned = await db
    .select({ id: ideaCards.id })
    .from(ideaCards)
    .where(and(eq(ideaCards.userId, userId), inArray(ideaCards.id, [sourceId, targetId])));
  if (owned.length !== 2) return null;
  const [row] = await db
    .insert(ideaConnections)
    .values({ userId, sourceCardId: sourceId, targetCardId: targetId, label: label.slice(0, 120) })
    .onConflictDoNothing()
    .returning();
  return row ?? null;
}

export async function deleteConnection(db: AtlasDb, userId: string, connectionId: string) {
  await db.delete(ideaConnections).where(and(eq(ideaConnections.id, connectionId), eq(ideaConnections.userId, userId)));
}

// ---------------------------------------------------------------------------
// Discover Connections
// ---------------------------------------------------------------------------

const RATING = ["strong", "promising", "needs_more_detail"] as const;

export const themeSchema = z.object({
  title: z.string().min(3).max(140),
  connectedCardIds: z.array(z.string()).min(2).max(8),
  connection: z.string().min(10),
  whyMeaningful: z.string().min(10),
  narrativeApproach: z.string().min(10),
  structure: z.array(z.string().min(3)).min(3).max(7),
  openingScenes: z.array(z.string().min(5)).min(1).max(3),
  reflectiveQuestions: z.array(z.string().min(5)).min(3).max(6),
  ratings: z.object({
    authenticity: z.enum(RATING),
    specificity: z.enum(RATING),
    narrativePotential: z.enum(RATING),
    originality: z.enum(RATING),
  }),
  missingDetails: z.array(z.string()).max(5),
});

const discoverSchema = z.object({ themes: z.array(themeSchema).min(1).max(5) });

const ratingJson = jsonEnum(RATING);
const discoverJsonSchema = jsonObject({
  themes: jsonArray(
    jsonObject({
      title: jsonString,
      connectedCardIds: jsonArray(jsonString),
      connection: jsonString,
      whyMeaningful: jsonString,
      narrativeApproach: jsonString,
      structure: jsonArray(jsonString),
      openingScenes: jsonArray(jsonString),
      reflectiveQuestions: jsonArray(jsonString),
      ratings: jsonObject({
        authenticity: ratingJson,
        specificity: ratingJson,
        narrativePotential: ratingJson,
        originality: ratingJson,
      }),
      missingDetails: jsonArray(jsonString),
    }),
    5,
  ),
});

export const DISCOVER_INSTRUCTIONS = [
  "You help a high school student find personal-essay themes by connecting their own idea cards.",
  "Use ONLY what the cards say. Never invent memories, people, events, feelings, achievements, or outcomes, and never exaggerate.",
  "If a connection depends on details the cards don't give, say so in missingDetails and rate specificity 'needs_more_detail' instead of filling the gap.",
  "Prefer surprising links between cards that look unrelated over obvious ones. Avoid admissions clichés: no 'passion for helping others', 'overcoming adversity made me stronger', sports-injury comebacks, mission-trip epiphanies, or 'this taught me hard work' framings.",
  "Each theme must cite at least two card ids exactly as given in connectedCardIds.",
  "structure is a list of narrative beats (not prose). openingScenes describe a moment the student would need to recall, framed as 'Begin with the moment you...' using only card details.",
  "reflectiveQuestions must be specific to the cards and ask for concrete sensory details, decisions, or changes in thinking.",
  "Ratings are qualitative: authenticity (grounded in the student's own words), specificity, narrativePotential, originality.",
  "Do not write essay paragraphs. Return 2 to 4 themes.",
].join(" ");

export async function discoverConnections(db: AtlasDb, userId: string, cardIds: string[], options: { caller?: ModelCaller } = {}) {
  const uniqueIds = [...new Set(cardIds)].slice(0, 16);
  if (uniqueIds.length < 2) {
    throw new Error("Select at least two idea cards to discover connections.");
  }
  const cards = await db
    .select({ id: ideaCards.id, category: ideaCards.category, title: ideaCards.title, detail: ideaCards.detail })
    .from(ideaCards)
    .where(and(eq(ideaCards.userId, userId), inArray(ideaCards.id, uniqueIds)));
  if (cards.length < 2) {
    throw new Error("Select at least two of your own idea cards.");
  }
  const allowed = new Set(cards.map((card) => card.id));
  const input = cards
    .map((card) => `- id: ${card.id}\n  category: ${card.category}\n  title: ${card.title}\n  detail: ${card.detail || "(no detail given)"}`)
    .join("\n");

  const result = await runStructured(
    db,
    userId,
    "discover_connections",
    discoverSchema,
    {
      instructions: DISCOVER_INSTRUCTIONS,
      input: `Idea cards:\n${input}`,
      schemaName: "idea_garden_themes",
      jsonSchema: discoverJsonSchema,
      maxOutputTokens: 5000,
    },
    {
      caller: options.caller,
      postValidate: (value) => {
        for (const theme of value.themes) {
          const cited = new Set(theme.connectedCardIds);
          if ([...cited].some((id) => !allowed.has(id))) return `theme "${theme.title}" cites a card id that was not provided`;
          if (cited.size < 2) return `theme "${theme.title}" must connect at least two different cards`;
        }
        return null;
      },
    },
  );

  const runId = randomUUID();
  const stored = [];
  for (const theme of result.themes) {
    const ids = [...new Set(theme.connectedCardIds)];
    const [row] = await db
      .insert(generatedThemes)
      .values({ userId, runId, title: theme.title, cardIds: ids, payload: { ...theme, connectedCardIds: ids } })
      .returning();
    stored.push(row!);
  }
  return stored;
}

export async function listThemes(db: AtlasDb, userId: string, options: { savedOnly?: boolean } = {}) {
  const conditions = [eq(generatedThemes.userId, userId)];
  if (options.savedOnly) conditions.push(eq(generatedThemes.saved, true));
  return db.select().from(generatedThemes).where(and(...conditions)).orderBy(desc(generatedThemes.createdAt)).limit(40);
}

export async function setThemeSaved(db: AtlasDb, userId: string, themeId: string, saved: boolean) {
  await db
    .update(generatedThemes)
    .set({ saved, updatedAt: new Date() })
    .where(and(eq(generatedThemes.id, themeId), eq(generatedThemes.userId, userId)));
}

export async function deleteTheme(db: AtlasDb, userId: string, themeId: string) {
  await db.delete(generatedThemes).where(and(eq(generatedThemes.id, themeId), eq(generatedThemes.userId, userId)));
}

/** Clears AI results the student hasn't saved. */
export async function clearUnsavedThemes(db: AtlasDb, userId: string) {
  await db.delete(generatedThemes).where(and(eq(generatedThemes.userId, userId), eq(generatedThemes.saved, false)));
}

// ---------------------------------------------------------------------------
// Explore further: deeper questions for one theme, appended to its history
// ---------------------------------------------------------------------------

const explorationSchema = z.object({
  deeperQuestions: z.array(z.string().min(5)).min(3).max(6),
  alternativeAngles: z.array(z.string().min(5)).max(3),
  detailsToGather: z.array(z.string().min(3)).max(5),
});

export async function exploreTheme(db: AtlasDb, userId: string, themeId: string, studentNote: string, options: { caller?: ModelCaller } = {}) {
  const [theme] = await db
    .select()
    .from(generatedThemes)
    .where(and(eq(generatedThemes.id, themeId), eq(generatedThemes.userId, userId)))
    .limit(1);
  if (!theme) throw new Error("Theme not found.");
  const payload = theme.payload as ThemePayload;
  const cards = await db
    .select({ id: ideaCards.id, title: ideaCards.title, detail: ideaCards.detail })
    .from(ideaCards)
    .where(and(eq(ideaCards.userId, userId), inArray(ideaCards.id, theme.cardIds)));

  const exploration = await runStructured(
    db,
    userId,
    "explore_theme",
    explorationSchema,
    {
      instructions: [
        "Help the student dig deeper into one essay theme drawn from their own idea cards.",
        "Ask questions that surface a specific moment, decision, or change in thinking. Never supply answers, invent details, or write essay prose.",
        "alternativeAngles are different ways to frame the same real experiences. detailsToGather lists concrete things the student should recall or write down.",
      ].join(" "),
      input: [
        `Theme: ${payload.title}`,
        `Connection: ${payload.connection}`,
        `Cards:\n${cards.map((card) => `- ${card.title}: ${card.detail || "(no detail)"}`).join("\n")}`,
        studentNote.trim() ? `What the student added: ${studentNote.trim().slice(0, 1500)}` : "",
      ].join("\n\n"),
      schemaName: "theme_exploration",
      jsonSchema: jsonObject({
        deeperQuestions: jsonArray(jsonString),
        alternativeAngles: jsonArray(jsonString),
        detailsToGather: jsonArray(jsonString),
      }),
      maxOutputTokens: 2000,
    },
    { caller: options.caller },
  );

  const next: ThemePayload = {
    ...payload,
    explorations: [...(payload.explorations ?? []), { ...exploration, createdAt: new Date().toISOString() }].slice(-5),
  };
  await db.update(generatedThemes).set({ payload: next, updatedAt: new Date() }).where(eq(generatedThemes.id, themeId));
  return next;
}

// ---------------------------------------------------------------------------
// Outlines
// ---------------------------------------------------------------------------


export function normalizeSections(raw: unknown): OutlineSection[] {
  if (!Array.isArray(raw)) return [];
  return raw
    .map((item) => {
      const row = (item ?? {}) as Record<string, unknown>;
      const heading = String(row.heading ?? "").slice(0, 200);
      if (!heading.trim()) return null;
      return {
        heading,
        notes: String(row.notes ?? "").slice(0, 4000),
        ...(row.sourceUrl ? { sourceUrl: String(row.sourceUrl) } : {}),
      };
    })
    .filter((row): row is OutlineSection => row !== null)
    .slice(0, 30);
}

export async function createOutlineFromTheme(db: AtlasDb, userId: string, themeId: string) {
  const [theme] = await db
    .select()
    .from(generatedThemes)
    .where(and(eq(generatedThemes.id, themeId), eq(generatedThemes.userId, userId)))
    .limit(1);
  if (!theme) throw new Error("Theme not found.");
  const payload = theme.payload as ThemePayload;
  const sections: OutlineSection[] = [
    { heading: "Opening scene", notes: payload.openingScenes[0] ?? "" },
    ...payload.structure.map((beat) => ({ heading: beat, notes: "" })),
  ];
  await db.update(generatedThemes).set({ saved: true, updatedAt: new Date() }).where(eq(generatedThemes.id, themeId));
  const [outline] = await db
    .insert(essayOutlines)
    .values({ userId, title: payload.title, targetKind: "personal_statement", themeId, sections })
    .returning();
  return outline!;
}

export async function listOutlines(db: AtlasDb, userId: string, filter: { targetKind?: string; promptId?: string } = {}) {
  const conditions = [eq(essayOutlines.userId, userId)];
  if (filter.targetKind) conditions.push(eq(essayOutlines.targetKind, filter.targetKind));
  if (filter.promptId) conditions.push(eq(essayOutlines.promptId, filter.promptId));
  const rows = await db.select().from(essayOutlines).where(and(...conditions)).orderBy(desc(essayOutlines.updatedAt));
  return rows.map((row) => ({ ...row, sections: normalizeSections(row.sections) }));
}

export async function saveOutline(db: AtlasDb, userId: string, outlineId: string, title: string, sections: unknown) {
  await db
    .update(essayOutlines)
    .set({ title: title.trim().slice(0, 200) || "Untitled outline", sections: normalizeSections(sections), updatedAt: new Date() })
    .where(and(eq(essayOutlines.id, outlineId), eq(essayOutlines.userId, userId)));
}

/** A blank personal-statement outline the student fills in themselves. */
export async function createBlankOutline(db: AtlasDb, userId: string, title: string) {
  const [outline] = await db
    .insert(essayOutlines)
    .values({
      userId,
      title: title.trim().slice(0, 200) || "New outline idea",
      targetKind: "personal_statement",
      sections: [
        { heading: "Opening moment", notes: "" },
        { heading: "What changed", notes: "" },
        { heading: "What it means now", notes: "" },
      ],
    })
    .returning();
  return outline!;
}

export async function deleteOutline(db: AtlasDb, userId: string, outlineId: string) {
  await db.delete(essayOutlines).where(and(eq(essayOutlines.id, outlineId), eq(essayOutlines.userId, userId)));
}

/** Appends a point to the outline for a supplemental prompt, creating that outline if needed. */
export async function appendToPromptOutline(db: AtlasDb, userId: string, promptId: string, section: OutlineSection, title = "Supplement outline") {
  const [existing] = await listOutlines(db, userId, { targetKind: "supplemental", promptId });
  if (existing) {
    if (existing.sections.some((row) => row.heading === section.heading && row.sourceUrl === section.sourceUrl)) {
      return existing.id;
    }
    await saveOutline(db, userId, existing.id, existing.title, [...existing.sections, section]);
    return existing.id;
  }
  const [created] = await db
    .insert(essayOutlines)
    .values({ userId, title, targetKind: "supplemental", promptId, sections: normalizeSections([section]) })
    .returning({ id: essayOutlines.id });
  return created!.id;
}
