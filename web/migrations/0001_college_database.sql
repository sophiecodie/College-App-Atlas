-- College database expansion.
-- Additive only: no existing column is dropped, renamed or retyped, and no user row is deleted.
-- Shared catalog data (colleges, cycles, deadlines, prompts, sources) stays separate from per-user rows.

CREATE EXTENSION IF NOT EXISTS pg_trgm;

-- ---------------------------------------------------------------------------
-- Import observability: runs, per-row errors, and a lock that stops concurrent runs.
-- ---------------------------------------------------------------------------

CREATE TABLE IF NOT EXISTS import_runs (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  kind text NOT NULL,
  status text NOT NULL DEFAULT 'running'
    CHECK (status IN ('running', 'succeeded', 'partial', 'failed')),
  params jsonb NOT NULL DEFAULT '{}'::jsonb,
  stats jsonb NOT NULL DEFAULT '{}'::jsonb,
  error text,
  started_at timestamptz NOT NULL DEFAULT now(),
  finished_at timestamptz
);
CREATE INDEX IF NOT EXISTS import_runs_kind_started_idx ON import_runs (kind, started_at DESC);

CREATE TABLE IF NOT EXISTS import_run_errors (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  run_id uuid NOT NULL REFERENCES import_runs(id) ON DELETE CASCADE,
  row_ref text,
  message text NOT NULL,
  created_at timestamptz NOT NULL DEFAULT now()
);
CREATE INDEX IF NOT EXISTS import_run_errors_run_idx ON import_run_errors (run_id);

CREATE TABLE IF NOT EXISTS import_locks (
  name text PRIMARY KEY,
  run_id uuid REFERENCES import_runs(id) ON DELETE SET NULL,
  acquired_at timestamptz NOT NULL DEFAULT now(),
  expires_at timestamptz NOT NULL
);

-- ---------------------------------------------------------------------------
-- Colleges: extend the existing table so slugs (referenced by user rows and prompts) never change.
-- ---------------------------------------------------------------------------

ALTER TABLE colleges
  ADD COLUMN IF NOT EXISTS ipeds_unitid integer,
  ADD COLUMN IF NOT EXISTS opeid text,
  ADD COLUMN IF NOT EXISTS opeid6 text,
  ADD COLUMN IF NOT EXISTS alternative_names text[] NOT NULL DEFAULT '{}',
  ADD COLUMN IF NOT EXISTS normalized_name text,
  ADD COLUMN IF NOT EXISTS search_text text,
  ADD COLUMN IF NOT EXISTS city text,
  ADD COLUMN IF NOT EXISTS state text,
  ADD COLUMN IF NOT EXISTS country text NOT NULL DEFAULT 'US',
  ADD COLUMN IF NOT EXISTS institution_level text,
  ADD COLUMN IF NOT EXISTS control text,
  ADD COLUMN IF NOT EXISTS sector integer,
  ADD COLUMN IF NOT EXISTS carnegie_basic integer,
  ADD COLUMN IF NOT EXISTS degree_granting boolean,
  ADD COLUMN IF NOT EXISTS hbcu boolean,
  ADD COLUMN IF NOT EXISTS system_name text,
  ADD COLUMN IF NOT EXISTS is_branch_campus boolean NOT NULL DEFAULT false,
  ADD COLUMN IF NOT EXISTS website_url text,
  ADD COLUMN IF NOT EXISTS admissions_url text,
  ADD COLUMN IF NOT EXISTS application_url text,
  ADD COLUMN IF NOT EXISTS admission_rate numeric(6, 4),
  ADD COLUMN IF NOT EXISTS undergrad_enrollment integer,
  ADD COLUMN IF NOT EXISTS sat_average integer,
  ADD COLUMN IF NOT EXISTS is_active boolean NOT NULL DEFAULT true,
  ADD COLUMN IF NOT EXISTS merged_into_unitid integer,
  ADD COLUMN IF NOT EXISTS origin text NOT NULL DEFAULT 'manual',
  ADD COLUMN IF NOT EXISTS data_sources text[] NOT NULL DEFAULT '{}',
  ADD COLUMN IF NOT EXISTS source_updated_at timestamptz;

DO $$ BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conname = 'colleges_institution_level_check') THEN
    ALTER TABLE colleges ADD CONSTRAINT colleges_institution_level_check
      CHECK (institution_level IS NULL OR institution_level IN ('four_year', 'two_year', 'less_than_two_year', 'unknown'));
  END IF;
  IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conname = 'colleges_control_check') THEN
    ALTER TABLE colleges ADD CONSTRAINT colleges_control_check
      CHECK (control IS NULL OR control IN ('public', 'private_nonprofit', 'private_for_profit', 'unknown'));
  END IF;
  IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conname = 'colleges_origin_check') THEN
    ALTER TABLE colleges ADD CONSTRAINT colleges_origin_check CHECK (origin IN ('manual', 'ipeds'));
  END IF;
END $$;

UPDATE colleges
SET normalized_name = lower(name), search_text = lower(name)
WHERE search_text IS NULL;

CREATE UNIQUE INDEX IF NOT EXISTS colleges_ipeds_unitid_idx ON colleges (ipeds_unitid) WHERE ipeds_unitid IS NOT NULL;
CREATE INDEX IF NOT EXISTS colleges_search_text_trgm_idx ON colleges USING gin (search_text gin_trgm_ops);
CREATE INDEX IF NOT EXISTS colleges_state_idx ON colleges (state);
CREATE INDEX IF NOT EXISTS colleges_level_control_idx ON colleges (institution_level, control);
CREATE INDEX IF NOT EXISTS colleges_opeid6_idx ON colleges (opeid6);

-- ---------------------------------------------------------------------------
-- Application cycles: one row per college per academic year. Old years are kept as history.
-- ---------------------------------------------------------------------------

CREATE TABLE IF NOT EXISTS application_cycles (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  college_id uuid NOT NULL REFERENCES colleges(id) ON DELETE CASCADE,
  academic_year text NOT NULL CHECK (academic_year ~ '^[0-9]{4}-[0-9]{4}$'),
  platforms text[] NOT NULL DEFAULT '{}',
  publication_status text NOT NULL DEFAULT 'unknown'
    CHECK (publication_status IN ('published', 'not_yet_published', 'unknown')),
  notes text,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now(),
  UNIQUE (college_id, academic_year)
);

-- ---------------------------------------------------------------------------
-- Source registry and fetched snapshots (history of what an official page said, and when).
-- ---------------------------------------------------------------------------

CREATE TABLE IF NOT EXISTS admissions_sources (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  college_id uuid NOT NULL REFERENCES colleges(id) ON DELETE CASCADE,
  url text NOT NULL,
  kind text NOT NULL DEFAULT 'both' CHECK (kind IN ('essay_prompts', 'deadlines', 'both')),
  adapter text NOT NULL DEFAULT 'curated-official',
  enabled boolean NOT NULL DEFAULT true,
  last_checked_at timestamptz,
  last_changed_at timestamptz,
  last_status integer,
  last_error text,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now(),
  UNIQUE (college_id, url)
);

CREATE TABLE IF NOT EXISTS source_snapshots (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  college_id uuid REFERENCES colleges(id) ON DELETE CASCADE,
  source_url text NOT NULL,
  run_id uuid REFERENCES import_runs(id) ON DELETE SET NULL,
  http_status integer,
  content_type text,
  content_hash text,
  text_content text,
  byte_length integer,
  fetched_at timestamptz NOT NULL DEFAULT now(),
  last_checked_at timestamptz NOT NULL DEFAULT now()
);
CREATE INDEX IF NOT EXISTS source_snapshots_url_fetched_idx ON source_snapshots (source_url, fetched_at DESC);

-- ---------------------------------------------------------------------------
-- Deadlines. Only `verified` rows are authoritative. A changed deadline is a new row that
-- `supersedes` the old one and waits for review; the verified row is never overwritten in place.
-- ---------------------------------------------------------------------------

CREATE TABLE IF NOT EXISTS application_deadlines (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  cycle_id uuid NOT NULL REFERENCES application_cycles(id) ON DELETE CASCADE,
  college_id uuid NOT NULL REFERENCES colleges(id) ON DELETE CASCADE,
  round text NOT NULL CHECK (round IN ('ED', 'ED2', 'EA', 'EA2', 'REA', 'RD', 'ROLLING')),
  deadline_date date,
  deadline_time time,
  timezone text,
  program_scope text[] NOT NULL DEFAULT '{}',
  conditions text,
  natural_key text NOT NULL,
  content_hash text NOT NULL,
  source_url text,
  source_excerpt text,
  snapshot_id uuid REFERENCES source_snapshots(id) ON DELETE SET NULL,
  ingest_source text,
  verification_status text NOT NULL DEFAULT 'pending_review'
    CHECK (verification_status IN ('verified', 'pending_review', 'unavailable', 'outdated', 'conflicting', 'rejected')),
  supersedes_id uuid REFERENCES application_deadlines(id) ON DELETE SET NULL,
  collected_at timestamptz,
  last_verified_at timestamptz,
  verified_by text,
  review_note text,
  stale_reason text,
  stale_detected_at timestamptz,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);
CREATE UNIQUE INDEX IF NOT EXISTS application_deadlines_dedupe_idx
  ON application_deadlines (cycle_id, natural_key, content_hash);
CREATE UNIQUE INDEX IF NOT EXISTS application_deadlines_one_verified_idx
  ON application_deadlines (cycle_id, natural_key) WHERE verification_status = 'verified';
CREATE INDEX IF NOT EXISTS application_deadlines_status_idx ON application_deadlines (verification_status);
CREATE INDEX IF NOT EXISTS application_deadlines_college_idx ON application_deadlines (college_id);

-- ---------------------------------------------------------------------------
-- Essay prompts: extend the existing `prompts` table so essay drafts keep pointing at the same prompt_id.
-- ---------------------------------------------------------------------------

ALTER TABLE prompts
  ADD COLUMN IF NOT EXISTS college_id uuid REFERENCES colleges(id) ON DELETE SET NULL,
  ADD COLUMN IF NOT EXISTS cycle_id uuid REFERENCES application_cycles(id) ON DELETE SET NULL,
  ADD COLUMN IF NOT EXISTS category text,
  ADD COLUMN IF NOT EXISTS conditional_rules jsonb NOT NULL DEFAULT '{}'::jsonb,
  ADD COLUMN IF NOT EXISTS display_order integer,
  ADD COLUMN IF NOT EXISTS slot_key text,
  ADD COLUMN IF NOT EXISTS content_hash text,
  ADD COLUMN IF NOT EXISTS source_excerpt text,
  ADD COLUMN IF NOT EXISTS snapshot_id uuid REFERENCES source_snapshots(id) ON DELETE SET NULL,
  ADD COLUMN IF NOT EXISTS ingest_source text,
  ADD COLUMN IF NOT EXISTS verification_status text NOT NULL DEFAULT 'pending_review',
  ADD COLUMN IF NOT EXISTS supersedes_id uuid REFERENCES prompts(id) ON DELETE SET NULL,
  ADD COLUMN IF NOT EXISTS collected_at timestamptz,
  ADD COLUMN IF NOT EXISTS last_verified_at timestamptz,
  ADD COLUMN IF NOT EXISTS verified_by text,
  ADD COLUMN IF NOT EXISTS review_note text,
  ADD COLUMN IF NOT EXISTS stale_reason text,
  ADD COLUMN IF NOT EXISTS stale_detected_at timestamptz;

DO $$ BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conname = 'prompts_verification_status_check') THEN
    ALTER TABLE prompts ADD CONSTRAINT prompts_verification_status_check
      CHECK (verification_status IN ('verified', 'pending_review', 'unavailable', 'outdated', 'conflicting', 'rejected'));
  END IF;
END $$;

-- Link legacy prompts to their college and cycle without touching prompt_id or text.
UPDATE prompts p SET college_id = c.id
FROM colleges c
WHERE c.slug = p.college_slug AND p.college_id IS NULL;

INSERT INTO application_cycles (college_id, academic_year)
SELECT DISTINCT p.college_id, p.cycle
FROM prompts p
WHERE p.college_id IS NOT NULL AND p.cycle ~ '^[0-9]{4}-[0-9]{4}$'
ON CONFLICT (college_id, academic_year) DO NOTHING;

UPDATE prompts p SET cycle_id = ac.id
FROM application_cycles ac
WHERE ac.college_id = p.college_id AND ac.academic_year = p.cycle AND p.cycle_id IS NULL;

UPDATE prompts
SET content_hash = md5(lower(btrim(regexp_replace(prompt_text, '\s+', ' ', 'g'))))
WHERE content_hash IS NULL;

UPDATE prompts
SET category = primary_tag
WHERE category IS NULL AND primary_tag IS NOT NULL;

-- Legacy seed rows were captured before their labelled cycle opened, so they are queued for review
-- rather than presented as verified.
UPDATE prompts
SET review_note = 'Legacy seed row (extraction_status=' || coalesce(extraction_status, 'unknown')
  || ', captured ' || coalesce(last_updated, 'unknown date') || '). Re-check against the official page before verifying.'
WHERE review_note IS NULL AND ingest_source IS NULL;

DO $$ BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM prompts WHERE cycle_id IS NOT NULL
    GROUP BY cycle_id, content_hash HAVING count(*) > 1
  ) THEN
    CREATE UNIQUE INDEX IF NOT EXISTS prompts_cycle_content_idx ON prompts (cycle_id, content_hash)
      WHERE cycle_id IS NOT NULL;
  ELSE
    RAISE NOTICE 'prompts_cycle_content_idx skipped: duplicate prompt text in one cycle. Resolve and rerun.';
  END IF;
END $$;
CREATE INDEX IF NOT EXISTS prompts_college_slug_idx ON prompts (college_slug);
CREATE INDEX IF NOT EXISTS prompts_status_idx ON prompts (verification_status);

-- Seed the source registry from the legacy prompt_sources table.
INSERT INTO admissions_sources (college_id, url, kind)
SELECT DISTINCT c.id, ps.source_url, 'essay_prompts'
FROM prompt_sources ps
JOIN colleges c ON c.slug = ps.college_slug
ON CONFLICT (college_id, url) DO NOTHING;

-- ---------------------------------------------------------------------------
-- User application records: per-user, never written by imports.
-- ---------------------------------------------------------------------------

ALTER TABLE user_colleges
  ADD COLUMN IF NOT EXISTS college_id uuid REFERENCES colleges(id) ON DELETE SET NULL,
  ADD COLUMN IF NOT EXISTS personal_deadline date,
  ADD COLUMN IF NOT EXISTS personal_deadline_note text,
  ADD COLUMN IF NOT EXISTS archived_at timestamptz;

UPDATE user_colleges uc SET college_id = c.id
FROM colleges c
WHERE c.slug = uc.college_slug AND uc.college_id IS NULL;

CREATE INDEX IF NOT EXISTS user_colleges_user_idx ON user_colleges (user_id);
CREATE INDEX IF NOT EXISTS user_prompt_preferences_user_idx ON user_prompt_preferences (user_id);
CREATE INDEX IF NOT EXISTS essay_drafts_user_prompt_idx ON essay_drafts (user_id, prompt_id);

-- Unique constraints on user rows are only added when existing data already satisfies them,
-- so the migration can never fail on (or delete) duplicate user records.
DO $$ BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM user_colleges GROUP BY user_id, college_slug HAVING count(*) > 1
  ) THEN
    CREATE UNIQUE INDEX IF NOT EXISTS user_colleges_user_college_idx ON user_colleges (user_id, college_slug);
  ELSE
    RAISE NOTICE 'user_colleges_user_college_idx skipped: duplicate (user_id, college_slug) rows exist.';
  END IF;
  IF NOT EXISTS (
    SELECT 1 FROM user_prompt_preferences GROUP BY user_id, prompt_id HAVING count(*) > 1
  ) THEN
    CREATE UNIQUE INDEX IF NOT EXISTS user_prompt_preferences_user_prompt_idx ON user_prompt_preferences (user_id, prompt_id);
  ELSE
    RAISE NOTICE 'user_prompt_preferences_user_prompt_idx skipped: duplicate (user_id, prompt_id) rows exist.';
  END IF;
END $$;
