-- Writing Studio, Idea Garden and AI Research.
-- Additive only. Every personal table carries user_id and is deleted with its user; all reads and writes
-- in the app are scoped by user_id (see src/lib/studio/*, src/lib/research/*).
-- Personal statement versions reuse essay_drafts with prompt_id = 'personal-statement'.

CREATE TABLE IF NOT EXISTS ai_usage (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  feature text NOT NULL,
  status text NOT NULL DEFAULT 'ok' CHECK (status IN ('ok', 'error', 'invalid_output')),
  input_tokens integer,
  output_tokens integer,
  created_at timestamptz NOT NULL DEFAULT now()
);
CREATE INDEX IF NOT EXISTS ai_usage_user_created_idx ON ai_usage (user_id, created_at DESC);

CREATE TABLE IF NOT EXISTS personal_statements (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL UNIQUE REFERENCES users(id) ON DELETE CASCADE,
  notes text NOT NULL DEFAULT '',
  selected_prompt text,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

CREATE TABLE IF NOT EXISTS idea_cards (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  category text NOT NULL,
  title text NOT NULL,
  detail text NOT NULL DEFAULT '',
  pos_x real NOT NULL DEFAULT 0,
  pos_y real NOT NULL DEFAULT 0,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);
CREATE INDEX IF NOT EXISTS idea_cards_user_idx ON idea_cards (user_id);

CREATE TABLE IF NOT EXISTS generated_themes (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  run_id uuid NOT NULL,
  title text NOT NULL,
  card_ids uuid[] NOT NULL DEFAULT '{}',
  payload jsonb NOT NULL,
  saved boolean NOT NULL DEFAULT false,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);
CREATE INDEX IF NOT EXISTS generated_themes_user_idx ON generated_themes (user_id, created_at DESC);

CREATE TABLE IF NOT EXISTS idea_connections (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  source_card_id uuid NOT NULL REFERENCES idea_cards(id) ON DELETE CASCADE,
  target_card_id uuid NOT NULL REFERENCES idea_cards(id) ON DELETE CASCADE,
  label text NOT NULL DEFAULT '',
  theme_id uuid REFERENCES generated_themes(id) ON DELETE CASCADE,
  created_at timestamptz NOT NULL DEFAULT now(),
  CHECK (source_card_id <> target_card_id)
);
CREATE UNIQUE INDEX IF NOT EXISTS idea_connections_user_pair_idx
  ON idea_connections (user_id, source_card_id, target_card_id) WHERE theme_id IS NULL;

CREATE TABLE IF NOT EXISTS essay_outlines (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  title text NOT NULL,
  target_kind text NOT NULL DEFAULT 'personal_statement' CHECK (target_kind IN ('personal_statement', 'supplemental')),
  prompt_id text,
  theme_id uuid REFERENCES generated_themes(id) ON DELETE SET NULL,
  sections jsonb NOT NULL DEFAULT '[]'::jsonb,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);
CREATE INDEX IF NOT EXISTS essay_outlines_user_idx ON essay_outlines (user_id, target_kind);

-- Shared: a source page is public information, checked by URL. Findings that cite it are per user.
CREATE TABLE IF NOT EXISTS research_sources (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  url text NOT NULL UNIQUE,
  title text NOT NULL DEFAULT '',
  domain text NOT NULL,
  is_official boolean NOT NULL DEFAULT false,
  content_hash text,
  checked_at timestamptz NOT NULL DEFAULT now(),
  created_at timestamptz NOT NULL DEFAULT now()
);

CREATE TABLE IF NOT EXISTS research_interests (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  college_slug text NOT NULL,
  interests text[] NOT NULL DEFAULT '{}',
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now(),
  UNIQUE (user_id, college_slug)
);

CREATE TABLE IF NOT EXISTS research_findings (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  college_slug text NOT NULL,
  section text NOT NULL CHECK (section IN (
    'academic_programs', 'courses', 'labs_faculty', 'clubs', 'culture',
    'interdisciplinary', 'career', 'why_college'
  )),
  title text NOT NULL,
  summary text NOT NULL,
  relevance text NOT NULL DEFAULT '',
  evidence text,
  source_id uuid REFERENCES research_sources(id) ON DELETE SET NULL,
  related_finding_ids uuid[] NOT NULL DEFAULT '{}',
  verification_status text NOT NULL DEFAULT 'source_matched'
    CHECK (verification_status IN ('source_matched', 'source_changed', 'source_unreachable', 'user_added')),
  saved boolean NOT NULL DEFAULT false,
  user_edited boolean NOT NULL DEFAULT false,
  notes text NOT NULL DEFAULT '',
  checked_at timestamptz NOT NULL DEFAULT now(),
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);
CREATE INDEX IF NOT EXISTS research_findings_user_college_idx ON research_findings (user_id, college_slug, section);

CREATE TABLE IF NOT EXISTS essay_research_links (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  prompt_id text NOT NULL,
  finding_id uuid NOT NULL REFERENCES research_findings(id) ON DELETE CASCADE,
  created_at timestamptz NOT NULL DEFAULT now(),
  UNIQUE (user_id, prompt_id, finding_id)
);
