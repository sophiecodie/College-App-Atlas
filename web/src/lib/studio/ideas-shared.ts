// Client-safe Idea Garden constants and types (no server imports).

export const IDEA_CATEGORIES = [
  { id: "hobby", label: "Hobby", tint: "#F6DCD8" },
  { id: "activity", label: "Activity", tint: "#E3ECDC" },
  { id: "trait", label: "Personality trait", tint: "#F3E6CF" },
  { id: "memory", label: "Important memory", tint: "#E4E0F1" },
  { id: "family", label: "Family experience", tint: "#F5E1EA" },
  { id: "value", label: "Personal value", tint: "#DDEBEA" },
  { id: "interest", label: "Interest", tint: "#EFE7D8" },
  { id: "contradiction", label: "Contradiction", tint: "#F1DED1" },
  { id: "challenge", label: "Challenge", tint: "#E6E6EE" },
  { id: "observation", label: "Unusual observation", tint: "#E7EEDB" },
  { id: "object_place", label: "Meaningful object or place", tint: "#F2E3D5" },
] as const;
export type IdeaCategory = (typeof IDEA_CATEGORIES)[number]["id"];

export type Rating = "strong" | "promising" | "needs_more_detail";

export type Exploration = {
  deeperQuestions: string[];
  alternativeAngles: string[];
  detailsToGather: string[];
  createdAt: string;
};

export type ThemePayload = {
  title: string;
  connectedCardIds: string[];
  connection: string;
  whyMeaningful: string;
  narrativeApproach: string;
  structure: string[];
  openingScenes: string[];
  reflectiveQuestions: string[];
  ratings: { authenticity: Rating; specificity: Rating; narrativePotential: Rating; originality: Rating };
  missingDetails: string[];
  explorations?: Exploration[];
};

export type OutlineSection = { heading: string; notes: string; sourceUrl?: string };
