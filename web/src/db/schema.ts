import { sql } from "drizzle-orm";
import {
  type AnyPgColumn,
  boolean,
  date,
  integer,
  jsonb,
  numeric,
  real,
  pgTable,
  text,
  time,
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

// Verification states shared by deadlines and prompts. Only "verified" is shown as authoritative.
export const VERIFICATION_STATUSES = [
  "verified",
  "pending_review",
  "unavailable",
  "outdated",
  "conflicting",
  "rejected",
] as const;
export type VerificationStatus = (typeof VERIFICATION_STATUSES)[number];

export const ADMISSION_ROUNDS = ["ED", "ED2", "EA", "EA2", "REA", "RD", "ROLLING"] as const;
export type AdmissionRound = (typeof ADMISSION_ROUNDS)[number];

export const importRuns = pgTable("import_runs", {
  id: uuid("id").defaultRandom().primaryKey(),
  kind: text("kind").notNull(),
  status: text("status").default("running").notNull(),
  params: jsonb("params").default(sql`'{}'::jsonb`).notNull(),
  stats: jsonb("stats").default(sql`'{}'::jsonb`).notNull(),
  error: text("error"),
  startedAt: timestamp("started_at", { withTimezone: true }).defaultNow().notNull(),
  finishedAt: timestamp("finished_at", { withTimezone: true }),
});

export const importRunErrors = pgTable("import_run_errors", {
  id: uuid("id").defaultRandom().primaryKey(),
  runId: uuid("run_id")
    .notNull()
    .references(() => importRuns.id, { onDelete: "cascade" }),
  rowRef: text("row_ref"),
  message: text("message").notNull(),
  createdAt: timestamp("created_at", { withTimezone: true }).defaultNow().notNull(),
});

export const importLocks = pgTable("import_locks", {
  name: text("name").primaryKey(),
  runId: uuid("run_id").references(() => importRuns.id, { onDelete: "set null" }),
  acquiredAt: timestamp("acquired_at", { withTimezone: true }).defaultNow().notNull(),
  expiresAt: timestamp("expires_at", { withTimezone: true }).notNull(),
});

export const colleges = pgTable("colleges", {
  id: uuid("id").defaultRandom().primaryKey(),
  slug: text("slug").notNull().unique(),
  name: text("name").notNull(),
  applicationCycle: text("application_cycle"),
  ipedsUnitid: integer("ipeds_unitid"),
  opeid: text("opeid"),
  opeid6: text("opeid6"),
  alternativeNames: text("alternative_names").array().default([]).notNull(),
  normalizedName: text("normalized_name"),
  searchText: text("search_text"),
  city: text("city"),
  state: text("state"),
  country: text("country").default("US").notNull(),
  institutionLevel: text("institution_level"),
  control: text("control"),
  sector: integer("sector"),
  carnegieBasic: integer("carnegie_basic"),
  degreeGranting: boolean("degree_granting"),
  hbcu: boolean("hbcu"),
  systemName: text("system_name"),
  isBranchCampus: boolean("is_branch_campus").default(false).notNull(),
  websiteUrl: text("website_url"),
  admissionsUrl: text("admissions_url"),
  applicationUrl: text("application_url"),
  admissionRate: numeric("admission_rate", { precision: 6, scale: 4 }),
  undergradEnrollment: integer("undergrad_enrollment"),
  satAverage: integer("sat_average"),
  isActive: boolean("is_active").default(true).notNull(),
  mergedIntoUnitid: integer("merged_into_unitid"),
  origin: text("origin").default("manual").notNull(),
  dataSources: text("data_sources").array().default([]).notNull(),
  sourceUpdatedAt: timestamp("source_updated_at", { withTimezone: true }),
  ...timestamps,
});

export const applicationCycles = pgTable(
  "application_cycles",
  {
    id: uuid("id").defaultRandom().primaryKey(),
    collegeId: uuid("college_id")
      .notNull()
      .references(() => colleges.id, { onDelete: "cascade" }),
    academicYear: text("academic_year").notNull(),
    platforms: text("platforms").array().default([]).notNull(),
    publicationStatus: text("publication_status").default("unknown").notNull(),
    notes: text("notes"),
    ...timestamps,
  },
  (table) => ({
    collegeYearIdx: uniqueIndex("application_cycles_college_id_academic_year_key").on(
      table.collegeId,
      table.academicYear,
    ),
  }),
);

export const admissionsSources = pgTable(
  "admissions_sources",
  {
    id: uuid("id").defaultRandom().primaryKey(),
    collegeId: uuid("college_id")
      .notNull()
      .references(() => colleges.id, { onDelete: "cascade" }),
    url: text("url").notNull(),
    kind: text("kind").default("both").notNull(),
    adapter: text("adapter").default("curated-official").notNull(),
    enabled: boolean("enabled").default(true).notNull(),
    lastCheckedAt: timestamp("last_checked_at", { withTimezone: true }),
    lastChangedAt: timestamp("last_changed_at", { withTimezone: true }),
    lastStatus: integer("last_status"),
    lastError: text("last_error"),
    ...timestamps,
  },
  (table) => ({
    collegeUrlIdx: uniqueIndex("admissions_sources_college_id_url_key").on(table.collegeId, table.url),
  }),
);

export const sourceSnapshots = pgTable("source_snapshots", {
  id: uuid("id").defaultRandom().primaryKey(),
  collegeId: uuid("college_id").references(() => colleges.id, { onDelete: "cascade" }),
  sourceUrl: text("source_url").notNull(),
  runId: uuid("run_id").references(() => importRuns.id, { onDelete: "set null" }),
  httpStatus: integer("http_status"),
  contentType: text("content_type"),
  contentHash: text("content_hash"),
  textContent: text("text_content"),
  byteLength: integer("byte_length"),
  fetchedAt: timestamp("fetched_at", { withTimezone: true }).defaultNow().notNull(),
  lastCheckedAt: timestamp("last_checked_at", { withTimezone: true }).defaultNow().notNull(),
});

export const applicationDeadlines = pgTable(
  "application_deadlines",
  {
    id: uuid("id").defaultRandom().primaryKey(),
    cycleId: uuid("cycle_id")
      .notNull()
      .references(() => applicationCycles.id, { onDelete: "cascade" }),
    collegeId: uuid("college_id")
      .notNull()
      .references(() => colleges.id, { onDelete: "cascade" }),
    round: text("round").notNull(),
    deadlineDate: date("deadline_date"),
    deadlineTime: time("deadline_time"),
    timezone: text("timezone"),
    programScope: text("program_scope").array().default([]).notNull(),
    conditions: text("conditions"),
    naturalKey: text("natural_key").notNull(),
    contentHash: text("content_hash").notNull(),
    sourceUrl: text("source_url"),
    sourceExcerpt: text("source_excerpt"),
    snapshotId: uuid("snapshot_id").references(() => sourceSnapshots.id, { onDelete: "set null" }),
    ingestSource: text("ingest_source"),
    verificationStatus: text("verification_status").default("pending_review").notNull(),
    supersedesId: uuid("supersedes_id").references((): AnyPgColumn => applicationDeadlines.id, {
      onDelete: "set null",
    }),
    collectedAt: timestamp("collected_at", { withTimezone: true }),
    lastVerifiedAt: timestamp("last_verified_at", { withTimezone: true }),
    verifiedBy: text("verified_by"),
    reviewNote: text("review_note"),
    staleReason: text("stale_reason"),
    staleDetectedAt: timestamp("stale_detected_at", { withTimezone: true }),
    ...timestamps,
  },
  (table) => ({
    dedupeIdx: uniqueIndex("application_deadlines_dedupe_idx").on(
      table.cycleId,
      table.naturalKey,
      table.contentHash,
    ),
  }),
);

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
  collegeId: uuid("college_id").references(() => colleges.id, { onDelete: "set null" }),
  cycleId: uuid("cycle_id").references(() => applicationCycles.id, { onDelete: "set null" }),
  category: text("category"),
  conditionalRules: jsonb("conditional_rules")
    .default(sql`'{}'::jsonb`)
    .notNull(),
  displayOrder: integer("display_order"),
  slotKey: text("slot_key"),
  contentHash: text("content_hash"),
  sourceExcerpt: text("source_excerpt"),
  snapshotId: uuid("snapshot_id").references(() => sourceSnapshots.id, { onDelete: "set null" }),
  ingestSource: text("ingest_source"),
  verificationStatus: text("verification_status").default("pending_review").notNull(),
  supersedesId: uuid("supersedes_id").references((): AnyPgColumn => prompts.id, { onDelete: "set null" }),
  collectedAt: timestamp("collected_at", { withTimezone: true }),
  lastVerifiedAt: timestamp("last_verified_at", { withTimezone: true }),
  verifiedBy: text("verified_by"),
  reviewNote: text("review_note"),
  staleReason: text("stale_reason"),
  staleDetectedAt: timestamp("stale_detected_at", { withTimezone: true }),
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
  collegeId: uuid("college_id").references(() => colleges.id, { onDelete: "set null" }),
  personalDeadline: date("personal_deadline"),
  personalDeadlineNote: text("personal_deadline_note"),
  archivedAt: timestamp("archived_at", { withTimezone: true }),
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

// ---------------------------------------------------------------------------
// Writing Studio, Idea Garden and AI Research (migration 0002). All personal rows are scoped by userId.
// ---------------------------------------------------------------------------

export const PERSONAL_STATEMENT_PROMPT_ID = "personal-statement";

export const aiUsage = pgTable("ai_usage", {
  id: uuid("id").defaultRandom().primaryKey(),
  userId: uuid("user_id").notNull().references(() => users.id, { onDelete: "cascade" }),
  feature: text("feature").notNull(),
  status: text("status").default("ok").notNull(),
  inputTokens: integer("input_tokens"),
  outputTokens: integer("output_tokens"),
  createdAt: timestamp("created_at", { withTimezone: true }).defaultNow().notNull(),
});

export const personalStatements = pgTable("personal_statements", {
  id: uuid("id").defaultRandom().primaryKey(),
  userId: uuid("user_id").notNull().unique().references(() => users.id, { onDelete: "cascade" }),
  notes: text("notes").default("").notNull(),
  selectedPrompt: text("selected_prompt"),
  ...timestamps,
});

export const ideaCards = pgTable("idea_cards", {
  id: uuid("id").defaultRandom().primaryKey(),
  userId: uuid("user_id").notNull().references(() => users.id, { onDelete: "cascade" }),
  category: text("category").notNull(),
  title: text("title").notNull(),
  detail: text("detail").default("").notNull(),
  posX: real("pos_x").default(0).notNull(),
  posY: real("pos_y").default(0).notNull(),
  ...timestamps,
});

export const generatedThemes = pgTable("generated_themes", {
  id: uuid("id").defaultRandom().primaryKey(),
  userId: uuid("user_id").notNull().references(() => users.id, { onDelete: "cascade" }),
  runId: uuid("run_id").notNull(),
  title: text("title").notNull(),
  cardIds: uuid("card_ids").array().default([]).notNull(),
  payload: jsonb("payload").notNull(),
  saved: boolean("saved").default(false).notNull(),
  ...timestamps,
});

export const ideaConnections = pgTable("idea_connections", {
  id: uuid("id").defaultRandom().primaryKey(),
  userId: uuid("user_id").notNull().references(() => users.id, { onDelete: "cascade" }),
  sourceCardId: uuid("source_card_id").notNull().references(() => ideaCards.id, { onDelete: "cascade" }),
  targetCardId: uuid("target_card_id").notNull().references(() => ideaCards.id, { onDelete: "cascade" }),
  label: text("label").default("").notNull(),
  themeId: uuid("theme_id").references(() => generatedThemes.id, { onDelete: "cascade" }),
  createdAt: timestamp("created_at", { withTimezone: true }).defaultNow().notNull(),
});

export const essayOutlines = pgTable("essay_outlines", {
  id: uuid("id").defaultRandom().primaryKey(),
  userId: uuid("user_id").notNull().references(() => users.id, { onDelete: "cascade" }),
  title: text("title").notNull(),
  targetKind: text("target_kind").default("personal_statement").notNull(),
  promptId: text("prompt_id"),
  themeId: uuid("theme_id").references(() => generatedThemes.id, { onDelete: "set null" }),
  sections: jsonb("sections").default(sql`'[]'::jsonb`).notNull(),
  ...timestamps,
});

export const researchSources = pgTable("research_sources", {
  id: uuid("id").defaultRandom().primaryKey(),
  url: text("url").notNull().unique(),
  title: text("title").default("").notNull(),
  domain: text("domain").notNull(),
  isOfficial: boolean("is_official").default(false).notNull(),
  contentHash: text("content_hash"),
  checkedAt: timestamp("checked_at", { withTimezone: true }).defaultNow().notNull(),
  createdAt: timestamp("created_at", { withTimezone: true }).defaultNow().notNull(),
});

export const researchInterests = pgTable(
  "research_interests",
  {
    id: uuid("id").defaultRandom().primaryKey(),
    userId: uuid("user_id").notNull().references(() => users.id, { onDelete: "cascade" }),
    collegeSlug: text("college_slug").notNull(),
    interests: text("interests").array().default([]).notNull(),
    ...timestamps,
  },
  (table) => ({
    userCollegeIdx: uniqueIndex("research_interests_user_id_college_slug_key").on(table.userId, table.collegeSlug),
  }),
);

export const RESEARCH_SECTIONS = [
  "academic_programs",
  "courses",
  "labs_faculty",
  "clubs",
  "culture",
  "interdisciplinary",
  "career",
  "why_college",
] as const;
export type ResearchSection = (typeof RESEARCH_SECTIONS)[number];

export const researchFindings = pgTable("research_findings", {
  id: uuid("id").defaultRandom().primaryKey(),
  userId: uuid("user_id").notNull().references(() => users.id, { onDelete: "cascade" }),
  collegeSlug: text("college_slug").notNull(),
  section: text("section").notNull(),
  title: text("title").notNull(),
  summary: text("summary").notNull(),
  relevance: text("relevance").default("").notNull(),
  evidence: text("evidence"),
  sourceId: uuid("source_id").references(() => researchSources.id, { onDelete: "set null" }),
  relatedFindingIds: uuid("related_finding_ids").array().default([]).notNull(),
  verificationStatus: text("verification_status").default("source_matched").notNull(),
  saved: boolean("saved").default(false).notNull(),
  userEdited: boolean("user_edited").default(false).notNull(),
  notes: text("notes").default("").notNull(),
  checkedAt: timestamp("checked_at", { withTimezone: true }).defaultNow().notNull(),
  ...timestamps,
});

export const essayResearchLinks = pgTable(
  "essay_research_links",
  {
    id: uuid("id").defaultRandom().primaryKey(),
    userId: uuid("user_id").notNull().references(() => users.id, { onDelete: "cascade" }),
    promptId: text("prompt_id").notNull(),
    findingId: uuid("finding_id").notNull().references(() => researchFindings.id, { onDelete: "cascade" }),
    createdAt: timestamp("created_at", { withTimezone: true }).defaultNow().notNull(),
  },
  (table) => ({
    userPromptFindingIdx: uniqueIndex("essay_research_links_user_id_prompt_id_finding_id_key").on(
      table.userId,
      table.promptId,
      table.findingId,
    ),
  }),
);
