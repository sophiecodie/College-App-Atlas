# NiceGUI to Web Migration Plan

Date: 2026-04-07
Mode: Builder
Status: ACTIVE

## Goal

Rebuild the current NiceGUI app as a real web product in `web/` without breaking the existing prototype in [main.py](/Users/sophie/Documents/CollegeApplicationAtlas/clawyapp1/main.py).

This is not a literal UI port.

This is a controlled migration of:
- product behavior
- user data model
- prompt-selection logic
- essays workflow
- authenticated user state

The NiceGUI app stays alive as the reference implementation until the web app is good enough to replace it.

## The Main Decision

Do not migrate page-by-page by copying widgets.

Migrate by product surface and data ownership.

That is the whole game.

The current NiceGUI app mixes:
- catalog data loading
- user state persistence
- prompt inference
- page rendering
- UI interaction logic

all inside [main.py](/Users/sophie/Documents/CollegeApplicationAtlas/clawyapp1/main.py).

That worked for the prototype. It is the wrong shape for the launch app.

The web rewrite should separate:
- shared catalog data in Neon
- authenticated user state in Neon
- domain logic in reusable server helpers
- frontend routes and components in Next.js

## What Exists Today

### NiceGUI source of truth

The old app already defines the real product behavior:
- college dashboard and college list in [main.py](/Users/sophie/Documents/CollegeApplicationAtlas/clawyapp1/main.py#L4495)
- single-college command center in [main.py](/Users/sophie/Documents/CollegeApplicationAtlas/clawyapp1/main.py#L3683)
- essay prompt sync and normalization in [main.py](/Users/sophie/Documents/CollegeApplicationAtlas/clawyapp1/main.py#L1263)
- prompt applicability and optional-selection logic in [main.py](/Users/sophie/Documents/CollegeApplicationAtlas/clawyapp1/main.py#L1741)
- per-college essay prompt selection UI in [main.py](/Users/sophie/Documents/CollegeApplicationAtlas/clawyapp1/main.py#L3795)

### Web app foundation

The new web app already has:
- auth via [auth.ts](/Users/sophie/Documents/CollegeApplicationAtlas/clawyapp1/web/src/auth.ts)
- Neon connection via [client.ts](/Users/sophie/Documents/CollegeApplicationAtlas/clawyapp1/web/src/db/client.ts)
- initial schema in [schema.ts](/Users/sophie/Documents/CollegeApplicationAtlas/clawyapp1/web/src/db/schema.ts)
- seeded catalog data from `prompts.jsonl` and `prompt_sources.json`

That means the rewrite is no longer blocked on infrastructure.

## Migration Principle

Preserve the catalog. Replace the user state.

Your JSON files were fine for the prototype, but the launch app should stop treating user work like local app memory.

Shared catalog:
- colleges
- prompts
- prompt_sources

User-owned state:
- saved colleges
- selected application type
- selected program track
- prompt selections
- prompt completion
- essay drafts
- notes

The migration should move user-owned state first, because that is what makes the product real.

## CEO Review

The plan is good.

The main thing to tighten is the wedge.

Right now the doc risks reading like "we will slowly migrate the prototype." That is not the right framing. The first real milestone is much narrower:

- signed-in user
- adds a college
- configures that college
- comes back later and the state is still there

That loop is the first thing that makes the new app more real than NiceGUI.

So the migration should optimize for one clean replacement slice at a time, not broad parity.

The first slice is:
- dashboard
- colleges list
- single college setup page

Not essays yet. Not every tab. Not all legacy surfaces.

That cut line matters because it keeps the rewrite from turning into an endless shadow project.

## Product Surfaces to Rebuild

There are five actual surfaces in the NiceGUI app worth preserving.

### 1. Signed-in dashboard

Current behavior:
- show colleges in progress
- show status/deadline/progress
- give the student a place to resume work

NiceGUI reference:
- [main.py](/Users/sophie/Documents/CollegeApplicationAtlas/clawyapp1/main.py#L4495)
- [main.py](/Users/sophie/Documents/CollegeApplicationAtlas/clawyapp1/main.py#L4561)

Web target:
- `/app`
- user sees only their saved colleges
- cards show deadline, application type, status, and progress
- one primary action: continue

### 2. College command center

Current behavior:
- overview
- essays
- research
- requirements
- fees
- recommendations

NiceGUI reference:
- [main.py](/Users/sophie/Documents/CollegeApplicationAtlas/clawyapp1/main.py#L3683)

Web target:
- `/colleges/[slug]`
- same conceptual tabs, but not all on day one

### 3. Essay prompt selection

Current behavior:
- per-college prompt list
- required vs optional prompts
- program-specific prompts
- include/exclude optional prompts
- mark completed

NiceGUI reference:
- [main.py](/Users/sophie/Documents/CollegeApplicationAtlas/clawyapp1/main.py#L3795)
- [main.py](/Users/sophie/Documents/CollegeApplicationAtlas/clawyapp1/main.py#L3841)

Web target:
- this should live on the college page first
- changes save immediately to Neon
- this state drives the essays workspace

### 4. Essays workspace

Current behavior:
- only active prompts should appear
- prompts grouped meaningfully
- show correct limit units
- manage draft text and status

NiceGUI reference:
- [main.py](/Users/sophie/Documents/CollegeApplicationAtlas/clawyapp1/main.py#L1579)
- [main.py](/Users/sophie/Documents/CollegeApplicationAtlas/clawyapp1/main.py#L1677)
- [main.py](/Users/sophie/Documents/CollegeApplicationAtlas/clawyapp1/main.py#L4616)

Web target:
- `/essays`
- read from catalog prompts + user prompt preferences + essay drafts
- this is the highest-leverage screen after the college dashboard

### 5. Supporting systems

Current behavior:
- requirements
- fees
- recommendations
- research notes
- activities

These matter, but they are not the first blocker for MVP replacement.

## Recommended Build Order

### Phase 1. Establish the real app shell

Build:
- signed-in layout
- app navigation
- dashboard route
- colleges index route
- single-college route
- add-college flow
- persisted college setup flow

Do not build:
- every legacy page
- every settings surface
- admin tools

Definition of done:
- signed-in user lands inside the app, adds a college, configures it, and sees that state survive refresh/logout

### Phase 2. Move user college state into Neon

Use the existing `user_colleges` table in [schema.ts](/Users/sophie/Documents/CollegeApplicationAtlas/clawyapp1/web/src/db/schema.ts).

Implement:
- add college to my list
- choose application type
- choose program track
- update status
- save quick notes

This replaces the most important part of `college_plans.json`.

Definition of done:
- a user can build their own college list in the web app and come back to it later

### Phase 3. Rebuild prompt selection logic

Port the actual domain rules from NiceGUI:
- `prompt_program_scopes`
- `active_program_selection`
- `prompt_is_applicable`
- `prompt_is_active`

NiceGUI references:
- [main.py](/Users/sophie/Documents/CollegeApplicationAtlas/clawyapp1/main.py#L1731)
- [main.py](/Users/sophie/Documents/CollegeApplicationAtlas/clawyapp1/main.py#L1741)

Persist this in:
- `user_prompt_preferences`

Implement:
- required prompts auto-active
- optional prompts selectable
- program-specific prompts shown only when applicable
- prompt completion state stored per user

Definition of done:
- the college page can determine exactly which prompts belong in the essays workspace

### Phase 4. Rebuild the essays workspace

This is the emotional center of the product.

Implement:
- active prompt list
- prompt detail panel
- correct word/character counter
- draft saving
- draft status

Persist this in:
- `essay_drafts`

Important rule:
- do not bring over the internal NiceGUI `essay_data` shape as-is
- model drafts around prompt id + user id + current content

Start simpler than NiceGUI:
- one current draft per prompt
- one status per prompt

Later:
- version history
- comments
- compare views

Definition of done:
- a student can actually draft essays in the new app without touching the Python app

### Phase 5. Rebuild the remaining command-center tabs

In order:
1. requirements
2. research
3. fees
4. recommendations
5. activities

Why this order:
- requirements and research support the application workflow directly
- fees and recommendations matter, but they are less central to daily drafting
- activities can become its own better experience later

## What Not to Port 1:1

Some prototype patterns should die in the migration.

Do not port:
- giant in-memory globals
- one-file rendering logic
- UI-coupled persistence
- fake local references like `research://college-name`
- any placeholder catalog entries pretending to be real prompt data

Also do not port every micro-feature before the core flow works.

The new app wins when:
- auth works
- state persists
- prompts are accurate
- drafting works

Not when every tab from the prototype exists.

## Data Migration Plan

### Shared catalog

Keep using:
- `prompts.jsonl`
- `prompt_sources.json`

as the seed source for now.

This is good enough while the catalog is still edited by hand.

Later, introduce:
- internal admin import script
- maybe an admin UI

But not now.

### User data

Do not import old user-specific JSON into Neon automatically unless you really need the historical data.

Reason:
- the prototype schema evolved a lot
- the launch app is now authenticated
- per-user import logic will be messy relative to the value

Recommendation:
- keep historical JSON as a reference
- start fresh user state in the web app

That is cleaner for MVP.

## Route Plan

Recommended first route structure:

```text
/
  marketing or signed-in redirect
/app
  signed-in dashboard
/colleges
  my colleges
/colleges/[slug]
  college command center
/essays
  active essay workspace
```

Add later:

```text
/requirements
/research
/settings
```

## Code Organization Plan

Do not let the new app turn into `main.py` in TypeScript clothing.

Recommended shape:

```text
web/src/
  app/
    (app)/
      app/page.tsx
      colleges/page.tsx
      colleges/[slug]/page.tsx
      essays/page.tsx
  components/
    dashboard/
    colleges/
    essays/
  lib/
    auth/
    colleges/
    prompts/
    essays/
  db/
    client.ts
    schema.ts
```

Use server-side helpers for:
- catalog reads
- prompt filtering
- progress calculations
- user-owned writes

Keep the React components focused on display and interaction.

## Execution Plan For The Next Few Sessions

### Session 1

Build:
- signed-in app layout
- dashboard route
- colleges list route
- add/save user college flow
- single-college overview page with persisted application type, status, track, and quick notes

### Session 2

Build:
- prompt selection logic on the college page
- required vs optional prompt handling
- program-specific prompt applicability

### Session 3

Build:
- essay prompt selection UI
- required/optional/program-specific filtering
- save prompt preferences

### Session 4

Build:
- essays workspace
- draft editor
- save drafts
- counters and prompt metadata

### Session 5

Build:
- requirements and research tabs
- then fees and recommendations if still needed for MVP

## MVP Replacement Line

The web app is ready to replace NiceGUI for real users when all of this is true:

- users can sign in
- users can create and maintain a college list
- users can configure application type and program track
- users can select optional prompts
- users can see only active prompts
- users can draft and save essays
- prompt limits are accurate
- progress survives refresh and logout

Until then, NiceGUI stays as the reference product.

## Recommendation

Start with the authenticated dashboard and user college persistence now.

That is the narrowest wedge that actually moves the product from prototype to real app.

Do not start with pixel-perfect essay UI. Do not start with admin tools. Do not start with settings.

Get the signed-in data loop working:
- add college
- configure college
- select prompts
- draft essay

That loop is the product.

## Tomorrow's Implementation Target

If we start coding this next, the first concrete milestone should be:

1. signed-in app layout
2. dashboard fed by `user_colleges`
3. colleges index page
4. add-college flow from the seeded `colleges` catalog
5. per-college overview page with persisted `application type`, `status`, `program selection`, and `quick notes`

That gives the web app a real spine.
