-- Baseline: the tables that existed before versioned migrations (previously created by `drizzle-kit push`).
-- Every statement is IF NOT EXISTS, so this is a no-op on an existing database and bootstraps a fresh one.

CREATE TABLE IF NOT EXISTS users (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  name text,
  email text NOT NULL UNIQUE,
  email_verified timestamptz,
  image text,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

CREATE TABLE IF NOT EXISTS accounts (
  user_id uuid NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  type text NOT NULL,
  provider text NOT NULL,
  provider_account_id text NOT NULL,
  refresh_token text,
  access_token text,
  expires_at integer,
  token_type text,
  scope text,
  id_token text,
  session_state text
);
CREATE UNIQUE INDEX IF NOT EXISTS accounts_provider_account_idx ON accounts (provider, provider_account_id);

CREATE TABLE IF NOT EXISTS sessions (
  session_token text PRIMARY KEY,
  user_id uuid NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  expires timestamptz NOT NULL
);

CREATE TABLE IF NOT EXISTS verification_tokens (
  identifier text NOT NULL,
  token text NOT NULL,
  expires timestamptz NOT NULL
);
CREATE UNIQUE INDEX IF NOT EXISTS verification_tokens_token_idx ON verification_tokens (token);
CREATE UNIQUE INDEX IF NOT EXISTS verification_tokens_identifier_token_idx ON verification_tokens (identifier, token);

CREATE TABLE IF NOT EXISTS colleges (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  slug text NOT NULL UNIQUE,
  name text NOT NULL,
  application_cycle text,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

CREATE TABLE IF NOT EXISTS prompt_sources (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  college_slug text NOT NULL,
  source_url text NOT NULL,
  source_type text NOT NULL,
  application_cycle text,
  notes text,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

CREATE TABLE IF NOT EXISTS prompts (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  prompt_id text NOT NULL UNIQUE,
  college_slug text NOT NULL,
  college_name text NOT NULL,
  cycle text,
  prompt_text text NOT NULL,
  prompt_type text,
  required boolean NOT NULL DEFAULT false,
  is_optional_choice boolean NOT NULL DEFAULT false,
  word_limit integer,
  word_min integer,
  character_limit integer,
  primary_tag text,
  program_scope text[] NOT NULL DEFAULT '{}',
  source_url text,
  source_type text,
  extraction_status text,
  last_updated text,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

CREATE TABLE IF NOT EXISTS user_colleges (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  college_slug text NOT NULL,
  selected_application_type text,
  program_selection text,
  status text,
  quick_notes text,
  requirements_checklist jsonb NOT NULL DEFAULT '{}'::jsonb,
  fees jsonb NOT NULL DEFAULT '{}'::jsonb,
  required_recommendations jsonb NOT NULL DEFAULT '[]'::jsonb,
  optional_recommendations jsonb NOT NULL DEFAULT '[]'::jsonb,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

CREATE TABLE IF NOT EXISTS user_prompt_preferences (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  prompt_id text NOT NULL,
  selected boolean NOT NULL DEFAULT false,
  completed boolean NOT NULL DEFAULT false,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

CREATE TABLE IF NOT EXISTS essay_drafts (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  prompt_id text NOT NULL,
  title text,
  content text NOT NULL DEFAULT '',
  status text NOT NULL DEFAULT 'not_started',
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

CREATE TABLE IF NOT EXISTS user_workspace_state (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL UNIQUE REFERENCES users(id) ON DELETE CASCADE,
  home_tasks jsonb NOT NULL DEFAULT '[]'::jsonb,
  research_data jsonb NOT NULL DEFAULT '{}'::jsonb,
  recommenders jsonb NOT NULL DEFAULT '[]'::jsonb,
  brainstorm_activities jsonb NOT NULL DEFAULT '[]'::jsonb,
  final_activities jsonb NOT NULL DEFAULT '[]'::jsonb,
  settings_state jsonb NOT NULL DEFAULT '{}'::jsonb,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);
