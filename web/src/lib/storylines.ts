export type StorylineFact = {
  id: string;
  text: string;
};

export type StorylineCard = {
  id: string;
  title: string;
  connection: string;
  sharedValues: string[];
  supportingFactIds: string[];
  possiblePromptTypes: string[];
  confidence: "high" | "medium" | "low";
  saved: boolean;
};

export function normalizeStorylineFacts(raw: unknown): StorylineFact[] {
  if (!Array.isArray(raw)) {
    return [];
  }

  return raw
    .map((item) => {
      if (!item || typeof item !== "object" || Array.isArray(item)) {
        return null;
      }

      const record = item as Record<string, unknown>;
      const id = String(record.id ?? "").trim();
      const text = String(record.text ?? "").trim();

      if (!id || !text) {
        return null;
      }

      return { id, text };
    })
    .filter((item): item is StorylineFact => Boolean(item));
}

export function normalizeStorylineCards(raw: unknown): StorylineCard[] {
  if (!Array.isArray(raw)) {
    return [];
  }

  return raw
    .map((item) => {
      if (!item || typeof item !== "object" || Array.isArray(item)) {
        return null;
      }

      const record = item as Record<string, unknown>;
      const id = String(record.id ?? "").trim();
      const title = String(record.title ?? "").trim();
      const connection = String(record.connection ?? "").trim();
      const fallbackType = String(record.type ?? "").trim();

      if (!id || !title || !connection) {
        return null;
      }

      const sharedValues = Array.isArray(record.sharedValues)
        ? record.sharedValues.map((value) => String(value ?? "").trim()).filter(Boolean)
        : [];
      const supportingFactIds = Array.isArray(record.supportingFactIds)
        ? record.supportingFactIds.map((value) => String(value ?? "").trim()).filter(Boolean)
        : [];
      const possiblePromptTypes = Array.isArray(record.possiblePromptTypes)
        ? record.possiblePromptTypes.map((value) => String(value ?? "").trim()).filter(Boolean)
        : typeof record.type === "string" && record.type.trim()
          ? [record.type.trim()]
        : [];
      const confidence = record.confidence === "high" || record.confidence === "medium" || record.confidence === "low"
        ? record.confidence
        : "medium";

      return {
        id,
        title,
        connection,
        sharedValues: sharedValues.length > 0 ? sharedValues : fallbackType ? [fallbackType] : [],
        supportingFactIds,
        possiblePromptTypes,
        confidence,
        saved: Boolean(record.saved),
      } satisfies StorylineCard;
    })
    .filter((item): item is StorylineCard => Boolean(item));
}
