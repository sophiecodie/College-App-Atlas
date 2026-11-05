<p align="center">
  <img src="web/public/illustrations/campus-panorama.svg" alt="College App Atlas illustrated campus banner" width="100%">
</p>

<h1 align="center">College App Atlas</h1>

<p align="center">
  <strong>Your college journey, mapped out.</strong><br>
  Brainstorm, write, research and track your applications in one cozy place.
</p>

<p align="center">
  <a href="https://collegeappatlas.sophieshih.com"><strong>🌐 Try it live → collegeappatlas.sophieshih.com</strong></a>
</p>

<p align="center">
  <img alt="Next.js" src="https://img.shields.io/badge/Next.js-15-black?logo=next.js">
  <img alt="React" src="https://img.shields.io/badge/React-19-61DAFB?logo=react&logoColor=white">
  <img alt="TypeScript" src="https://img.shields.io/badge/TypeScript-5-3178C6?logo=typescript&logoColor=white">
  <img alt="Postgres" src="https://img.shields.io/badge/Postgres-Neon-4169E1?logo=postgresql&logoColor=white">
  <img alt="Deployed on Vercel" src="https://img.shields.io/badge/Deployed%20on-Vercel-000?logo=vercel">
</p>

---

## Why I built this

Applying to college means juggling a dozen portals, spreadsheets, Google Docs and half-remembered essay ideas, and
most tools either write the essay *for* you or just list deadlines. College App Atlas is built around the
hardest part, **finding your own story**, with research and tracking alongside it. It's free, and you can try it
as a guest without signing up.

## Features

| | |
| --- | --- |
| 🌱 **Discover your story** | Plant memories, hobbies and quirks in the **Idea Garden**, then let AI surface surprising connections between them and turn a theme into an essay outline. |
| ✍️ **Write better essays** | A calm editor with autosave, version history and outlines. AI feedback **asks questions instead of rewriting you**. |
| 🧭 **Explore colleges** | Search **5,700+ colleges** (IPEDS + College Scorecard) and research programs, labs and clubs, with sources you can check. |
| 🗺️ **Track your journey** | Deadlines, checklists and progress for every school on one illustrated journey map. |
| ✅ **Verified prompts & deadlines** | Essay prompts and deadlines are pulled **verbatim from official admissions pages** and reviewed before students see them as authoritative. Nothing is guessed or paraphrased. |

## How it works

1. **Tell us about you:** your grade, the schools on your mind, and what you want help with.
2. **Find your story:** brainstorm in the Idea Garden and shape a theme into an outline.
3. **Write and research:** draft essays beside sourced research about each college.
4. **Track and submit:** watch deadlines and progress for every school in one place.

## Tech stack

- **Frontend:** Next.js 15 (App Router), React 19, TypeScript, Motion, React Flow for the idea map
- **Backend:** Next.js route handlers, Auth.js (Google sign-in plus guest sessions)
- **Database:** Postgres on Neon with Drizzle ORM; PGlite for local development and tests
- **AI:** pluggable provider, either Claude (Anthropic) or any OpenAI-compatible server, with per-user and global daily limits
- **Data pipeline:** an IPEDS/Scorecard importer plus a polite crawler (follows robots.txt, rate-limited) that only stores prompt and deadline text it finds verbatim on official pages
- **Hosting:** Vercel

## Project structure

```
web/                      Next.js app (what's deployed)
├── src/app/              Pages: landing, dashboard, essays, colleges, research, activities, admin
├── src/lib/studio/       Idea Garden + writing studio logic
├── src/lib/research/     College research and source findings
├── src/lib/ingest/       Official-page admissions ingestion + validation
├── src/lib/ai/           Claude / OpenAI provider clients
├── scripts/              Migrations, seeding, catalog import and refresh
├── migrations/           SQL migrations
├── tests/                Node test runner suites
└── docs/                 College database & verification docs
docs/                     Product plans and design notes
main.py                   Original NiceGUI prototype (MVP v0)
```

## Run it locally

```bash
cd web
cp .env.example .env.local     # fill in DATABASE_URL, AUTH_SECRET, and an AI key
npm install
npm run db:migrate
npm run db:seed                # optional sample prompts
npm run dev                    # http://localhost:3000
```

No Neon database? Set `ATLAS_PGLITE_DIR=./.local-db/atlas` in `.env.local` to use embedded Postgres on disk.
See [`web/docs/college-database.md`](web/docs/college-database.md) for importing the full college catalog and the
verification workflow.

```bash
npm test          # run the test suites
npm run typecheck
```

<details>
<summary>Original Python prototype</summary>

The first MVP was built in Python with NiceGUI and is kept in `main.py` for reference.

```bash
python3 -m venv .venv && source .venv/bin/activate
pip install -r requirements.txt
python main.py    # http://localhost:8080
```
</details>

## Roadmap

- Animated "storylines" view where idea bubbles connect live as the AI finds patterns
- More colleges with verified prompts and deadlines

## About

Built by **[Sophie Shih](https://sophieshih.com)**, a student at Duke. Feedback and ideas are welcome:
[open an issue](https://github.com/sophiecodie/College-App-Atlas/issues).

<p align="center"><em>Small steps, brighter futures. ♡</em></p>
