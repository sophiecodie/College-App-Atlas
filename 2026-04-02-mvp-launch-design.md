# MVP Launch Plan

Date: 2026-04-02
Mode: Startup
Status: DONE

## Goal

Launch a real MVP with:
- production hosting
- persistent database
- authentication
- user data storage
- a path from the current JSON files to a real database of colleges, prompts, and user work

You said:
- hosting on Vercel
- database on Neon Postgres
- auth added now

That is a solid target. But there is one hard truth first.

## The Real Constraint

Your current app is a Python NiceGUI app in [main.py](/Users/sophie/Documents/CollegeApplicationAtlas/clawyapp1/main.py).

Vercel’s Python runtime is built around HTTP functions, not a long-running Python app server. Vercel’s own docs describe Python as a singular HTTP handler/function model, and Vercel’s WebSocket guidance points people to third-party realtime providers rather than native serverless WebSocket support.

That means the question is not "can I bolt Neon onto the current app tomorrow?"

The question is:

Do you want to:
1. launch this exact Python app quickly on a Python host, or
2. launch on Vercel specifically, which means moving the app shape toward a Vercel-native architecture.

Because you explicitly want Vercel, I recommend option 2.

## Recommendation

### Recommended architecture

Build a Vercel-native web app and treat the current NiceGUI app plus JSON files as the prototype and seed data source.

Use:
- **Vercel** for hosting
- **Neon Postgres** for the database
- **Auth.js** for authentication
- **Drizzle ORM** or **Prisma** for schema + migrations

My recommendation: **Auth.js + Drizzle + Neon + Vercel**

Why this stack:
- Vercel-native
- simple enough for an MVP
- no vendor lock-in on auth data shape
- clean path from fake JSON to normalized Postgres tables
- easier to reason about than trying to use Neon Auth plus a Vercel-created Neon database plus a Python UI at the same time

## Strong Opinion

Do **not** make tomorrow “deploy the existing NiceGUI app to Vercel.”

That is the trap.

It sounds faster, but it creates an awkward architecture immediately.

If the goal is a real launch stack, tomorrow should be:
- stand up the real platform skeleton
- move core data out of JSON
- wire up auth
- keep feature scope small

That is the right MVP move.

## Best Path Tomorrow

### Approach A: Recommended

Create a new Vercel-native app, probably Next.js, and migrate the MVP into it in slices.

#### Day-1 deliverable
- landing page or app shell deployed on Vercel
- Neon connected
- Auth.js sign-in working
- user can create an account and save basic state
- college + prompt data seeded from your JSON
- one working authenticated flow, for example:
  - user signs in
  - sees selected colleges
  - opens essays
  - saves essay draft data to Postgres

This is the right MVP skeleton.

### Approach B: Fastest launch, not your requested stack

Deploy the current Python app to Render/Railway/Fly.io and add Neon separately.

This is probably the fastest way to get the current app live.

But it is **not** aligned with your stated Vercel goal.

### Approach C: Force the current app into Vercel

Not recommended.

You would spend time fighting runtime shape instead of building product.

## Accounts You’ll Need

### 1. Vercel

Create:
- Vercel account
- linked GitHub repo/project

You will need:
- project import from GitHub
- environment variables configured in Vercel project settings

### 2. Neon

Create:
- Neon account
- one project
- one production database

You will need:
- connection string
- separate local/dev and production environment values

### 3. Auth Provider Credentials

If you use Auth.js with OAuth, create at least one provider:
- Google is usually the fastest for MVP
- GitHub is fine too if your audience is more technical

You will need:
- client ID
- client secret
- callback URL configured for local and production

### 4. Optional domain

Not required for tomorrow, but if you want a “real” launch:
- buy/attach custom domain in Vercel

## Auth Recommendation

Use **Auth.js**, not Neon Auth, for the first MVP.

Why:
- cleaner docs and broader adoption for app-level auth
- straightforward with Vercel
- lets Neon just be Postgres
- avoids coupling database choice to auth choice

Also, there is at least one recent community report indicating Neon Auth may not work on Neon databases created through Vercel. I would not bet tomorrow’s launch on that ambiguity.

So:
- Neon = database
- Auth.js = auth/session layer

That separation is cleaner.

## Database Design

You want two categories of data:

### 1. Platform data

This is mostly shared, admin-owned, and rarely changed by end users.

Examples:
- colleges
- essay prompts
- prompt source metadata
- application requirements
- tags

### 2. User data

This is per-user and changes constantly.

Examples:
- user profile
- selected colleges
- application plan selections
- prompt selections
- essay drafts
- completion status
- notes

## Recommended Schema Shape

Do not keep everything as one giant denormalized blob.

Use a split like this:

### Core tables

- `users`
- `accounts`
- `sessions`
- `verification_tokens`

These are for Auth.js.

### Product tables

- `colleges`
- `prompts`
- `prompt_sources`

### User state tables

- `user_colleges`
- `user_prompt_preferences`
- `essay_drafts`
- `essay_comments`
- `user_profile`

### Why this shape works

- `colleges` and `prompts` become reusable platform data
- user tables stay small and user-scoped
- prompt catalog can grow to hundreds or thousands of prompts later
- future admin tooling becomes possible

## Migration Strategy From JSON

This part matters a lot.

Do **not** try to convert everything at once.

### Phase 1: Treat JSON as seed data

Your current files:
- [prompts.jsonl](/Users/sophie/Documents/CollegeApplicationAtlas/clawyapp1/prompts.jsonl)
- [prompt_sources.json](/Users/sophie/Documents/CollegeApplicationAtlas/clawyapp1/prompt_sources.json)
- [college_plans.json](/Users/sophie/Documents/CollegeApplicationAtlas/clawyapp1/college_plans.json)

Use them like this:

- `prompts.jsonl` → seed `prompts`
- `prompt_sources.json` → seed `prompt_sources`
- `college_plans.json` → use selectively, not as a one-to-one schema source

Important:
- `college_plans.json` mixes product catalog data and user/workspace state
- that should be split during migration, not copied directly

### Phase 2: Separate static from user-owned data

Map fields like this:

#### Static / shared
- college name
- prompt text
- prompt limits
- source URL
- tag

#### User-owned
- completed
- selected
- draft text
- quick notes
- deadlines chosen
- program selection

That split is the backbone of the real database.

### Phase 3: Build import scripts

Create three seed/import scripts:

1. `seed_colleges`
2. `seed_prompts`
3. `migrate_local_user_state` for your own initial account only

Do not write a general migration for every hypothetical future user yet.

Tomorrow’s goal is one clean seeded database plus one working user account.

## What Tomorrow Should Actually Include

### Must-have

1. Create Vercel project
2. Create Neon project/database
3. Create OAuth app for sign-in
4. Build app shell with auth
5. Create schema + run first migration
6. Seed colleges and prompts
7. Save at least one piece of user-specific data to Neon

### Nice-to-have

1. Migrate your own current essay state from JSON
2. Add production domain
3. Add admin-only seed refresh workflow

### Not tomorrow

1. Full admin CMS for prompts
2. Fancy role-based permissions
3. Bulk collaborative editing
4. Perfect migration of every current JSON nuance

That is ocean-boiling.

## MVP User Flow

This is the version I would ship first:

1. User lands on app
2. User signs in with Google
3. User selects colleges
4. App pulls prompts for those colleges from Postgres
5. User selects optional prompts where needed
6. User writes essay drafts
7. Drafts save to database

That’s enough to be real.

## Environment Variables You’ll Need

### Vercel

At minimum:
- `DATABASE_URL`
- `AUTH_SECRET`
- OAuth provider keys, for example:
  - `AUTH_GOOGLE_ID`
  - `AUTH_GOOGLE_SECRET`

And likely:
- `NEXTAUTH_URL` or the current Auth.js equivalent depending on framework version/config

You should set them in:
- local dev
- preview
- production

## Workflow For Expanding the Database Later

Once the MVP is live, the system should evolve like this:

### Prompt catalog workflow

1. Add or verify official source
2. Insert/update prompt source record
3. Insert/update prompt rows
4. Mark previous prompt version archived if needed

That gives you history instead of destructive overwrites.

### College expansion workflow

1. Add `college`
2. Add `prompt_sources`
3. Add `prompts`
4. Publish

### User-data workflow

Keep catalog data separate from user state forever.

That means:
- you can refresh prompt catalog without destroying user drafts
- you can add new schools cleanly
- you can later build an internal admin view

## Concrete Product Direction

Tomorrow’s launch plan should **not** be:
- “add database to current fake app”

It should be:
- “stand up the real app platform and migrate the smallest meaningful slice”

That is the move that gets you to a real startup architecture instead of a prototype with hosting bolted on.

## Recommended Tomorrow Plan

### Morning

1. Create Vercel account/project
2. Create Neon account/project
3. Create Google OAuth credentials
4. Scaffold Vercel-native app

### Midday

1. Add Auth.js
2. Add Drizzle or Prisma
3. Create schema
4. Run initial migration

### Afternoon

1. Seed colleges
2. Seed prompts
3. Build authenticated user dashboard shell
4. Save first user-owned records

### End of day

1. Deploy production preview
2. Test login
3. Test data write/read
4. Test one essay draft save flow

If that works, you have an actual MVP backbone.

## Final Recommendation

Use:
- **Vercel**
- **Neon Postgres**
- **Auth.js**
- **Drizzle** if you want lighter-weight SQL control

And treat the current NiceGUI app as the prototype and seed-data source, not the thing you are deploying.

That is the cleanest path to a real launch.

## Sources

- Vercel Python runtime docs: https://vercel.com/docs/functions/runtimes/python
- Vercel runtimes overview: https://vercel.com/docs/functions/runtimes
- Vercel WebSocket guidance: https://vercel.com/guides/do-vercel-serverless-functions-support-websocket-connections
- Vercel environment variables: https://vercel.com/docs/environment-variables
- Auth.js home/docs: https://authjs.dev/
- Neon API/auth reference: https://api-docs.neon.tech/
- Neon branch auth endpoint reference: https://api-docs.neon.tech/reference/getneonauth

Community caveat I would keep in mind, but not treat as primary product truth:
- Vercel community thread on Neon Auth with Vercel-created DBs: https://community.vercel.com/t/neon-auth-never-enabled/30481
