# College database

Shared catalog data (colleges, cycles, deadlines, essay prompts, official sources) lives alongside, but
separate from, per-user rows (`user_colleges`, `user_prompt_preferences`, `essay_drafts`). Imports never write
user rows.

## First-time setup on an existing database

```bash
cd web
# 1. Back up first (see "Backups" below).
npm run db:migrate                     # applies migrations/*.sql in order; safe to rerun
npm run db:seed                        # optional: legacy prompts.jsonl rows; idempotent
npm run catalog:import-directory       # downloads IPEDS HD2024 + Scorecard, upserts ~5,700 colleges
npm run catalog:ingest-admissions      # validates data/admissions/<cycle>/*.json against live official pages
npm run catalog:report                 # totals and per-college coverage
```

Use `npm run db:migrate` instead of `drizzle-kit push` from now on. The migrations include trigram indexes,
partial unique indexes and guarded constraints that `push` cannot express, and `push` may try to drop them.

To try everything locally without Neon, set `ATLAS_PGLITE_DIR=./.local-db/atlas` (embedded Postgres on disk).

## Verification model

Every deadline and prompt has a `verification_status`:

| Status | Meaning | Shown to students |
| --- | --- | --- |
| `verified` | An admin checked it against the source in `/admin` | As authoritative |
| `pending_review` | Found verbatim on an official page, not yet checked by a person | With an "awaiting verification" notice and the official link |
| `conflicting` | Two sources disagree | With a notice |
| `outdated` | Replaced by a newer verified record (kept as history) | Only if the student already has a draft for it |
| `unavailable` | The school no longer publishes it, or it can't be captured | No |
| `rejected` | An admin rejected it | No |

Only verified deadlines feed the dashboard and the "your deadline" box. A changed prompt or deadline is stored as a
new row that `supersedes` the verified one; the verified row is only retired when an admin approves the change.
Editing a prompt keeps its `prompt_id`, so drafts stay attached.

## Adding a college's requirements

1. `npm run catalog:curate -- --unitids <UNITID> --links` lists essay/deadline links on the official site.
2. `npm run catalog:curate -- --url <page> --text` prints the page text as the validator sees it.
3. Write `data/admissions/<cycle>/<slug>.json` (schema: `src/lib/ingest/manifest.ts`). Copy text exactly. Every
   limit needs `limitEvidence` (a verbatim snippet containing the number), and every deadline needs an `excerpt`
   that contains the date.
4. `npm run catalog:ingest-admissions -- --only <slug>`. Anything not found verbatim on the live page is logged
   and skipped, never stored.
5. Review and verify in `/admin` (requires your email in `ADMIN_EMAILS`).

The fetcher identifies itself, follows robots.txt, waits between requests to the same host, and does not retry
401/403/429 or bot-challenge responses.

## Scheduled refresh

`GET /api/cron/admissions-refresh` re-checks registered official pages (default 25 per run). It is disabled unless
`ADMISSIONS_REFRESH_ENABLED=true` and `CRON_SECRET` are set. To schedule it on Vercel, add to `vercel.json`:

```json
{ "crons": [{ "path": "/api/cron/admissions-refresh", "schedule": "0 9 * * 1" }] }
```

Changed pages flag affected records as stale (status unchanged) and re-queue the college's manifest.
Concurrent runs are prevented by a row lock in `import_locks`.

New cycle each year: `npm run catalog:cycle-rollover -- --to 2027-2028`, then add `data/admissions/2027-2028/`.

## Access control

- Every user query filters by the signed-in user's id (`user_colleges`, drafts, preferences).
- `/admin` and its server actions require an email listed in `ADMIN_EMAILS`. Nobody is an admin by default.
- The app connects as a single database role. If you expose the database to other roles (e.g. Neon Data API),
  enable row-level security on `user_colleges`, `user_prompt_preferences`, `essay_drafts` and
  `user_workspace_state` before doing so. The migration does not enable RLS, because enabling it under the app's
  role could lock the app out.

## Backups

Before `db:migrate` on production, create a Neon branch (Console → Branches → Create branch from main) or run
`pg_dump "$DATABASE_URL" > atlas-$(date +%F).sql`. The migrations are additive (no drops, renames or retypes), and
each file runs in its own transaction.

## Data sources

- NCES IPEDS Institutional Characteristics, HD2024 (public domain).
- U.S. Department of Education College Scorecard, Most-Recent-Cohorts-Institution (public data), matched by UNITID.
- Official college admissions pages, captured as described above.
