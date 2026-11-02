"use server";

import { activeCaller, aiProvider } from "@/lib/ai/client";

import { and, eq } from "drizzle-orm";
import { revalidatePath } from "next/cache";

import { db } from "@/db/client";
import { essayDrafts } from "@/db/schema";
import { normalizeEssayStatus } from "@/lib/essays-shared";
import { requireCurrentUser } from "@/lib/app-data";
import {
  ensureWorkspaceState,
  normalizeEssayWorkspaceSettings,
  normalizeSettingsState,
  updateWorkspaceState,
} from "@/lib/workspace-state";
import {
  type StorylineFact,
  normalizeStorylineCards,
} from "@/lib/storylines";

function normalizeTags(raw: string) {
  return Array.from(
    new Set(
      raw
        .split(",")
        .map((tag) => tag.trim())
        .filter(Boolean),
    ),
  );
}

function normalizeFacts(raw: string): StorylineFact[] {
  const lines = raw
    .split(/\r?\n/)
    .map((line) => line.trim())
    .filter(Boolean);

  const uniqueFacts = Array.from(new Set(lines)).slice(0, 21);
  return uniqueFacts.map((text) => ({
    id: crypto.randomUUID(),
    text,
  }));
}

function storylineSchema() {
  return {
    type: "object",
    additionalProperties: false,
    properties: {
      storylines: {
        type: "array",
        minItems: 3,
        maxItems: 3,
        items: {
          type: "object",
          additionalProperties: false,
          properties: {
            title: { type: "string" },
            connection: { type: "string" },
            sharedValues: {
              type: "array",
              minItems: 2,
              maxItems: 4,
              items: { type: "string" },
            },
            supportingFactIds: {
              type: "array",
              minItems: 2,
              maxItems: 4,
              items: { type: "string" },
            },
            possiblePromptTypes: {
              type: "array",
              minItems: 1,
              maxItems: 3,
              items: { type: "string" },
            },
            confidence: {
              type: "string",
              enum: ["high", "medium", "low"],
            },
          },
          required: [
            "title",
            "connection",
            "sharedValues",
            "supportingFactIds",
            "possiblePromptTypes",
            "confidence",
          ],
        },
      },
    },
    required: ["storylines"],
  };
}

function extractStorylineJsonCandidate(payload: unknown): string | null {
  if (!payload || typeof payload !== "object" || Array.isArray(payload)) {
    return null;
  }

  const record = payload as Record<string, unknown>;

  if (typeof record.output_text === "string" && record.output_text.trim()) {
    return record.output_text.trim();
  }

  if (typeof record.text === "string" && record.text.trim()) {
    return record.text.trim();
  }

  if (Array.isArray(record.output)) {
    for (const outputItem of record.output) {
      if (!outputItem || typeof outputItem !== "object" || Array.isArray(outputItem)) {
        continue;
      }

      const outputRecord = outputItem as Record<string, unknown>;
      if (typeof outputRecord.text === "string" && outputRecord.text.trim()) {
        return outputRecord.text.trim();
      }

      if (Array.isArray(outputRecord.content)) {
        for (const contentItem of outputRecord.content) {
          if (!contentItem || typeof contentItem !== "object" || Array.isArray(contentItem)) {
            continue;
          }

          const contentRecord = contentItem as Record<string, unknown>;
          if (typeof contentRecord.text === "string" && contentRecord.text.trim()) {
            return contentRecord.text.trim();
          }
        }
      }
    }
  }

  return null;
}

function parseBracketList(raw: string) {
  return raw
    .replace(/^\[/, "")
    .replace(/\]$/, "")
    .split(",")
    .map((item) => item.trim().replace(/^["']|["']$/g, ""))
    .filter(Boolean);
}

function parseStorylinesFromPlainText(text: string) {
  const normalized = text.replace(/\r/g, "").trim();
  if (!normalized) {
    return [];
  }

  const sectionRegex =
    /(?:^|\n)(?:\d+\.\s*)?(?:\*\*)?([^*\n:]+?)(?:\*\*)?\s*(?:\n|$)([\s\S]*?)(?=(?:\n(?:\d+\.\s*)?(?:\*\*)?[^*\n:]+?(?:\*\*)?\s*(?:\n|$))|$)/g;

  const sections: Array<Record<string, unknown>> = [];

  for (const match of normalized.matchAll(sectionRegex)) {
    const title = String(match[1] ?? "").trim();
    const block = String(match[2] ?? "").trim();

    if (!title || !block) {
      continue;
    }

    const connectionMatch = block.match(/connection\s*:\s*([^\n]+)/i);
    const sharedValuesMatch = block.match(/shared values?\s*:\s*([^\n]+)/i);
    const supportingFactIdsMatch = block.match(/supportingFactIds\s*:\s*(\[[^\]]*\])/i);
    const promptTypesMatch = block.match(/possible prompt types?\s*:\s*([^\n]+)/i);
    const confidenceMatch = block.match(/confidence\s*:\s*(high|medium|low)/i);

    const connection = connectionMatch?.[1]?.trim() ?? "";
    const sharedValues = sharedValuesMatch?.[1]
      ? sharedValuesMatch[1].split(",").map((item) => item.trim()).filter(Boolean)
      : [];
    const supportingFactIds = supportingFactIdsMatch?.[1]
      ? parseBracketList(supportingFactIdsMatch[1])
      : [];
    const possiblePromptTypes = promptTypesMatch?.[1]
      ? promptTypesMatch[1].split(",").map((item) => item.trim()).filter(Boolean)
      : [];

    if (!connection) {
      continue;
    }

    sections.push({
      id: crypto.randomUUID(),
      title,
      connection,
      sharedValues,
      supportingFactIds,
      possiblePromptTypes,
      confidence: confidenceMatch?.[1]?.toLowerCase() ?? "medium",
      saved: false,
    });
  }

  return normalizeStorylineCards(sections);
}

function buildStorylineCards(raw: unknown) {
  const candidates: unknown[] = Array.isArray(raw)
    ? raw
    : raw && typeof raw === "object" && !Array.isArray(raw) && Array.isArray((raw as Record<string, unknown>).storylines)
      ? ((raw as Record<string, unknown>).storylines as unknown[])
      : [];

  const cards = normalizeStorylineCards(
    candidates.map((item: unknown) => ({
      ...(item as Record<string, unknown>),
      id: String((item as Record<string, unknown>)?.id ?? "").trim() || crypto.randomUUID(),
      saved: false,
    })),
  );

  return cards.slice(0, 3);
}

async function generateStorylinesWithOpenAI(facts: StorylineFact[]) {
  const apiKey = process.env.OPENAI_API_KEY;
  const baseUrl = (process.env.OPENAI_API_BASE_URL ?? "https://api.openai.com/v1").replace(/\/$/, "");
  const useClaude = aiProvider() === "claude";

  if (!useClaude && !apiKey) {
    throw new Error("Add an AI provider key (ANTHROPIC_API_KEY or OPENAI_API_KEY) to generate storylines.");
  }

  const model = process.env.OPENAI_STORYLINES_MODEL ?? "gpt-5.2";
  const factList = facts.map((fact) => `- ${fact.id}: ${fact.text}`).join("\n");

  const storylineInstructions = [
        "You generate compact essay storyline cards for a college application app.",
        "Return exactly 3 cards.",
        "Be creative but evidence-based.",
        "Make the output very succinct.",
        "Prefer surprising cross-category connections over generic leadership summaries.",
        "Each title should be 2-5 words.",
        "Each connection should be one short line, not a paragraph.",
        "Shared values should be concise nouns or short phrases.",
        "Only use supportingFactIds from the provided list.",
        "Do not invent facts.",
      ].join(" ");
  const storylineInput = [
                "Create 3 compact storyline cards from these student facts.",
        "Facts:",
        factList,
        "Good directions sound like: Tracing, Fit and fluency, Expression through structure, Translation.",
        "Avoid generic phrasing like 'you are creative and resilient.'",
        "Possible prompt types should be short labels like Identity, Community, Leadership, Intellectual Curiosity, Why Major, Activity, Values.",
        "Return at least 3 ideas.",
        "Preferred format: a JSON array of 3 objects.",
        'Each object should look like {"title":"...","type":"Why Major","connection":"...","sharedValues":["..."],"supportingFactIds":["..."]}.',
      ].join("\n\n");

  let jsonCandidate: string | null;
  if (useClaude) {
    jsonCandidate = (
      await activeCaller()({
        instructions: storylineInstructions,
        input: storylineInput,
        schemaName: "essay_storylines",
        jsonSchema: storylineSchema() as Record<string, unknown>,
      })
    ).text;
  } else {
  const response = await fetch(`${baseUrl}/responses`, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      Authorization: `Bearer ${apiKey}`,
    },
    body: JSON.stringify({
      model,
      instructions: storylineInstructions,
      input: [
        {
          role: "user",
          content: [
            {
              type: "input_text",
              text: storylineInput,
    },
  ],
        },
      ],
      text: {
        format: {
          type: "json_schema",
          name: "essay_storylines",
          strict: true,
          schema: storylineSchema(),
        },
      },
    }),
  });

  if (!response.ok) {
    const errorText = (await response.text()).trim();
    const details = errorText ? ` ${errorText.slice(0, 240)}` : "";
    throw new Error(`Storyline generation failed (${response.status} ${response.statusText}).${details}`);
  }

  const payload = (await response.json()) as unknown;
    jsonCandidate = extractStorylineJsonCandidate(payload);
  }

  if (!jsonCandidate) {
    throw new Error("The model returned no readable text. Please try again.");
  }

  let parsed: unknown;
  try {
    parsed = JSON.parse(jsonCandidate) as unknown;
  } catch {
    const fencedMatch = jsonCandidate.match(/```(?:json)?\s*([\s\S]*?)```/i);
    const fallbackJson = fencedMatch?.[1]?.trim() ?? jsonCandidate;
    try {
      parsed = JSON.parse(fallbackJson) as unknown;
    } catch {
      const textStorylines = parseStorylinesFromPlainText(fallbackJson);
      if (textStorylines.length > 0) {
        return textStorylines;
      }
      throw new Error(`The model returned text, but not valid JSON. ${fallbackJson.slice(0, 280)}`);
    }
  }

  const storylines = buildStorylineCards(parsed);

  if (storylines.length === 0) {
    throw new Error(`The model returned no valid storyline cards. ${JSON.stringify(parsed).slice(0, 280)}`);
  }

  if (storylines.length < 3) {
    throw new Error(`The model returned only ${storylines.length} valid storyline card(s). ${JSON.stringify(parsed).slice(0, 280)}`);
  }

  return storylines;
}

export async function saveEssayDraft(formData: FormData) {
  const user = await requireCurrentUser();
  const draftId = String(formData.get("draftId") ?? "").trim();
  const promptId = String(formData.get("promptId") ?? "").trim();
  const collegeSlug = String(formData.get("collegeSlug") ?? "").trim();
  const title = String(formData.get("title") ?? "").trim();
  const content = String(formData.get("content") ?? "");
  const status = normalizeEssayStatus(String(formData.get("status") ?? ""), content);

  if (!promptId || !collegeSlug) {
    return null;
  }

  let savedId: string | null = null;
  if (draftId && !draftId.startsWith("draft-")) {
    const updated = await db
      .update(essayDrafts)
      .set({
        title,
        content,
        status,
        updatedAt: new Date(),
      })
      .where(and(eq(essayDrafts.id, draftId), eq(essayDrafts.userId, user.id)))
      .returning({ id: essayDrafts.id });
    savedId = updated[0]?.id ?? null;
  } else {
    const [inserted] = await db.insert(essayDrafts).values({
      userId: user.id,
      promptId,
      title,
      content,
      status,
    }).returning({ id: essayDrafts.id });
    savedId = inserted?.id ?? null;
  }

  revalidatePath("/essays");
  revalidatePath(`/colleges/${collegeSlug}`);
  return savedId ? { id: savedId, savedAt: new Date().toISOString() } : null;
}

export async function createEssayVersion(formData: FormData) {
  const user = await requireCurrentUser();
  const promptId = String(formData.get("promptId") ?? "").trim();
  const collegeSlug = String(formData.get("collegeSlug") ?? "").trim();
  const title = String(formData.get("title") ?? "").trim();
  const content = String(formData.get("content") ?? "");
  const status = normalizeEssayStatus(String(formData.get("status") ?? ""), content);

  if (!promptId || !collegeSlug) {
    return;
  }

  await db.insert(essayDrafts).values({
    userId: user.id,
    promptId,
    title,
    content,
    status,
  });

  revalidatePath("/essays");
  revalidatePath(`/colleges/${collegeSlug}`);
}

export async function deleteEssayVersion(formData: FormData) {
  const user = await requireCurrentUser();
  const draftId = String(formData.get("draftId") ?? "").trim();
  const collegeSlug = String(formData.get("collegeSlug") ?? "").trim();

  if (!draftId || !collegeSlug || draftId.startsWith("draft-")) {
    return;
  }

  await db
    .delete(essayDrafts)
    .where(and(eq(essayDrafts.id, draftId), eq(essayDrafts.userId, user.id)));

  revalidatePath("/essays");
  revalidatePath(`/colleges/${collegeSlug}`);
}

export async function saveEssayTags(formData: FormData) {
  const user = await requireCurrentUser();
  const promptId = String(formData.get("promptId") ?? "").trim();
  const tags = normalizeTags(String(formData.get("tags") ?? ""));

  if (!promptId) {
    return;
  }

  const workspace = await ensureWorkspaceState(user.id);
  const settings = normalizeSettingsState(workspace.settingsState);
  const essayWorkspace = normalizeEssayWorkspaceSettings(settings.essayWorkspace);

  await updateWorkspaceState(user.id, {
    settingsState: {
      ...settings,
      essayWorkspace: {
        ...essayWorkspace,
        promptTags: {
          ...essayWorkspace.promptTags,
          [promptId]: tags,
        },
      },
    },
  });

  revalidatePath("/essays");
}

export async function saveStorylineFacts(formData: FormData) {
  const user = await requireCurrentUser();
  const facts = normalizeFacts(String(formData.get("facts") ?? ""));
  const workspace = await ensureWorkspaceState(user.id);
  const settings = normalizeSettingsState(workspace.settingsState);
  const essayWorkspace = normalizeEssayWorkspaceSettings(settings.essayWorkspace);

  await updateWorkspaceState(user.id, {
    settingsState: {
      ...settings,
      essayWorkspace: {
        ...essayWorkspace,
        storylineFacts: facts,
        storylineCards: [],
        storylineGeneratedAt: null,
      },
    },
  });

  revalidatePath("/essays");
}

export async function generateEssayStorylines(formData: FormData) {
  const user = await requireCurrentUser();
  const facts = normalizeFacts(String(formData.get("facts") ?? ""));

  if (facts.length < 3) {
    throw new Error("Add at least 3 facts before generating storylines.");
  }

  const workspace = await ensureWorkspaceState(user.id);
  const settings = normalizeSettingsState(workspace.settingsState);
  const essayWorkspace = normalizeEssayWorkspaceSettings(settings.essayWorkspace);
  const storylineCards = await generateStorylinesWithOpenAI(facts);

  await updateWorkspaceState(user.id, {
    settingsState: {
      ...settings,
      essayWorkspace: {
        ...essayWorkspace,
        storylineFacts: facts,
        storylineCards,
        storylineGeneratedAt: new Date().toISOString(),
      },
    },
  });

  revalidatePath("/essays");
}

export async function toggleSavedStoryline(formData: FormData) {
  const user = await requireCurrentUser();
  const storylineId = String(formData.get("storylineId") ?? "").trim();

  if (!storylineId) {
    return;
  }

  const workspace = await ensureWorkspaceState(user.id);
  const settings = normalizeSettingsState(workspace.settingsState);
  const essayWorkspace = normalizeEssayWorkspaceSettings(settings.essayWorkspace);
  const storylineCards = essayWorkspace.storylineCards.map((storyline) =>
    storyline.id === storylineId
      ? { ...storyline, saved: !storyline.saved }
      : storyline,
  );

  await updateWorkspaceState(user.id, {
    settingsState: {
      ...settings,
      essayWorkspace: {
        ...essayWorkspace,
        storylineCards,
      },
    },
  });

  revalidatePath("/essays");
}

export async function applyStorylineToPrompt(formData: FormData) {
  const user = await requireCurrentUser();
  const storylineId = String(formData.get("storylineId") ?? "").trim();
  const promptId = String(formData.get("promptId") ?? "").trim();

  if (!storylineId || !promptId) {
    return;
  }

  const workspace = await ensureWorkspaceState(user.id);
  const settings = normalizeSettingsState(workspace.settingsState);
  const essayWorkspace = normalizeEssayWorkspaceSettings(settings.essayWorkspace);
  const storyline = essayWorkspace.storylineCards.find((item) => item.id === storylineId);

  if (!storyline) {
    return;
  }

  const existingTags = essayWorkspace.promptTags[promptId] ?? [];
  const nextTags = Array.from(
    new Set([storyline.title, ...storyline.sharedValues, ...existingTags].filter(Boolean)),
  );

  await updateWorkspaceState(user.id, {
    settingsState: {
      ...settings,
      essayWorkspace: {
        ...essayWorkspace,
        promptTags: {
          ...essayWorkspace.promptTags,
          [promptId]: nextTags,
        },
        storylineCards: essayWorkspace.storylineCards.map((item) =>
          item.id === storylineId ? { ...item, saved: true } : item,
        ),
      },
    },
  });

  revalidatePath("/essays");
}
