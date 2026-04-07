import { sql } from "drizzle-orm";
import {
  boolean,
  integer,
  jsonb,
  pgTable,
  text,
  timestamp,
  uniqueIndex,
  uuid,
} from "drizzle-orm/pg-core";

const timestamps = {
  createdAt: timestamp("created_at", { withTimezone: true }).defaultNow().notNull(),
  updatedAt: timestamp("updated_at", { withTimezone: true }).defaultNow().notNull(),
};

export const users = pgTable("users", {
  id: uuid("id").defaultRandom().primaryKey(),
  name: text("name"),
  email: text("email").notNull().unique(),
  emailVerified: timestamp("email_verified", { withTimezone: true }),
  image: text("image"),
  ...timestamps,
});

export const accounts = pgTable(
  "accounts",
  {
    userId: uuid("user_id")
      .notNull()
      .references(() => users.id, { onDelete: "cascade" }),
    type: text("type").notNull(),
    provider: text("provider").notNull(),
    providerAccountId: text("provider_account_id").notNull(),
    refresh_token: text("refresh_token"),
    access_token: text("access_token"),
    expires_at: integer("expires_at"),
    token_type: text("token_type"),
    scope: text("scope"),
    id_token: text("id_token"),
    session_state: text("session_state"),
  },
  (table) => ({
    providerAccountIdx: uniqueIndex("accounts_provider_account_idx").on(
      table.provider,
      table.providerAccountId,
    ),
  }),
);

export const sessions = pgTable("sessions", {
  sessionToken: text("session_token").primaryKey(),
  userId: uuid("user_id")
    .notNull()
    .references(() => users.id, { onDelete: "cascade" }),
  expires: timestamp("expires", { withTimezone: true }).notNull(),
});

export const verificationTokens = pgTable(
  "verification_tokens",
  {
    identifier: text("identifier").notNull(),
    token: text("token").notNull(),
    expires: timestamp("expires", { withTimezone: true }).notNull(),
  },
  (table) => ({
    tokenIdx: uniqueIndex("verification_tokens_token_idx").on(table.token),
    identifierTokenIdx: uniqueIndex("verification_tokens_identifier_token_idx").on(
      table.identifier,
      table.token,
    ),
  }),
);

export const colleges = pgTable("colleges", {
  id: uuid("id").defaultRandom().primaryKey(),
  slug: text("slug").notNull().unique(),
  name: text("name").notNull(),
  applicationCycle: text("application_cycle"),
  ...timestamps,
});

export const promptSources = pgTable("prompt_sources", {
  id: uuid("id").defaultRandom().primaryKey(),
  collegeSlug: text("college_slug").notNull(),
  sourceUrl: text("source_url").notNull(),
  sourceType: text("source_type").notNull(),
  applicationCycle: text("application_cycle"),
  notes: text("notes"),
  ...timestamps,
});

export const prompts = pgTable("prompts", {
  id: uuid("id").defaultRandom().primaryKey(),
  promptId: text("prompt_id").notNull().unique(),
  collegeSlug: text("college_slug").notNull(),
  collegeName: text("college_name").notNull(),
  cycle: text("cycle"),
  promptText: text("prompt_text").notNull(),
  promptType: text("prompt_type"),
  required: boolean("required").default(false).notNull(),
  isOptionalChoice: boolean("is_optional_choice").default(false).notNull(),
  wordLimit: integer("word_limit"),
  wordMin: integer("word_min"),
  characterLimit: integer("character_limit"),
  primaryTag: text("primary_tag"),
  programScope: text("program_scope").array().default([]).notNull(),
  sourceUrl: text("source_url"),
  sourceType: text("source_type"),
  extractionStatus: text("extraction_status"),
  lastUpdated: text("last_updated"),
  ...timestamps,
});

export const userColleges = pgTable("user_colleges", {
  id: uuid("id").defaultRandom().primaryKey(),
  userId: uuid("user_id")
    .notNull()
    .references(() => users.id, { onDelete: "cascade" }),
  collegeSlug: text("college_slug").notNull(),
  selectedApplicationType: text("selected_application_type"),
  programSelection: text("program_selection"),
  status: text("status"),
  quickNotes: text("quick_notes"),
  requirementsChecklist: jsonb("requirements_checklist")
    .default(sql`'{}'::jsonb`)
    .notNull(),
  fees: jsonb("fees")
    .default(sql`'{}'::jsonb`)
    .notNull(),
  requiredRecommendations: jsonb("required_recommendations")
    .default(sql`'[]'::jsonb`)
    .notNull(),
  optionalRecommendations: jsonb("optional_recommendations")
    .default(sql`'[]'::jsonb`)
    .notNull(),
  ...timestamps,
});

export const userPromptPreferences = pgTable("user_prompt_preferences", {
  id: uuid("id").defaultRandom().primaryKey(),
  userId: uuid("user_id")
    .notNull()
    .references(() => users.id, { onDelete: "cascade" }),
  promptId: text("prompt_id").notNull(),
  selected: boolean("selected").default(false).notNull(),
  completed: boolean("completed").default(false).notNull(),
  ...timestamps,
});

export const essayDrafts = pgTable("essay_drafts", {
  id: uuid("id").defaultRandom().primaryKey(),
  userId: uuid("user_id")
    .notNull()
    .references(() => users.id, { onDelete: "cascade" }),
  promptId: text("prompt_id").notNull(),
  title: text("title"),
  content: text("content").default("").notNull(),
  status: text("status").default("not_started").notNull(),
  ...timestamps,
});

export const userWorkspaceState = pgTable("user_workspace_state", {
  id: uuid("id").defaultRandom().primaryKey(),
  userId: uuid("user_id")
    .notNull()
    .references(() => users.id, { onDelete: "cascade" })
    .unique(),
  homeTasks: jsonb("home_tasks")
    .default(sql`'[]'::jsonb`)
    .notNull(),
  researchData: jsonb("research_data")
    .default(sql`'{}'::jsonb`)
    .notNull(),
  recommenders: jsonb("recommenders")
    .default(sql`'[]'::jsonb`)
    .notNull(),
  brainstormActivities: jsonb("brainstorm_activities")
    .default(sql`'[]'::jsonb`)
    .notNull(),
  finalActivities: jsonb("final_activities")
    .default(sql`'[]'::jsonb`)
    .notNull(),
  settingsState: jsonb("settings_state")
    .default(sql`'{}'::jsonb`)
    .notNull(),
  ...timestamps,
});
