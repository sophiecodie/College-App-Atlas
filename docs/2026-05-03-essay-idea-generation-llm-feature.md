# Essay Idea Generation Feature

Date: 2026-05-03
Mode: Builder
Status: PROPOSED

## What This Should Do

Build an LLM feature inside the essays workspace that helps a student turn scattered facts about themselves into strong essay angles.

Not a generic chatbot.

Not "write my essay for me."

The job is:
- collect raw facts, quirks, hobbies, habits, values, and moments
- identify hidden connections across them
- generate a few promising storylines
- make those storylines reusable across multiple prompts

The user problem is real. Most students do not get stuck on grammar first. They get stuck on:
- "I have nothing interesting to say"
- "My activities do not connect"
- "I do not know what story I am telling about myself"

This feature should solve that exact bottleneck.

## The Wedge

The best version of this is not "AI brainstorming."

The best version is:

**Identity graph for essays**

The student gives you a pile of raw ingredients. The system turns those ingredients into:
- themes
- tensions
- repeated behaviors
- values in action
- possible personal narratives

That is much more useful.

Example input:
- I like teaching kids Scratch
- I like making bookmarks
- Dancing

Bad output:
- "You are creative and enjoy helping others."

Good output:
- **Tracing**
  Bookmarks, tracing knowledge, marking dance steps.
  Values: clarity, memory, orientation.

- **Guiding vs. following**
  Teaching Scratch, partner dance, helping someone find their place.
  Values: responsiveness, leadership, care.

- **Iteration as care**
  Debugging, rehearsing, refining something small until it works better.
  Values: patience, precision, generosity.

That is the product.

## Why This Matters

Right now the app has good structure, but not much magic.

This feature can become the first thing that feels genuinely hard to replicate with a spreadsheet or a notes app.

It also creates a strong upstream benefit for the rest of the product:
- better essay topics
- better prompt-to-story matching
- less blank-page paralysis
- more reusable personal themes across colleges

If this works, the essays page becomes a thinking tool, not just a writing surface.

## Product Principle

Do not ask the model to invent identity.

Ask it to surface patterns from evidence the student already gave you.

That keeps the feature:
- more trustworthy
- more specific
- less cringe
- less likely to produce fake personality branding

The model should feel like a story coach with a highlighter, not a ghostwriter.

## Recommended User Flow

### Step 1. Student adds "raw facts"

Create a new idea-capture surface on the essays page.

Input types:
- short facts
- hobbies
- habits
- moments
- roles they play
- things friends tease them about
- small obsessions
- things they make
- things they teach
- things they fix

Prompt copy should push toward specificity:
- "I teach kids Scratch after school"
- "I make watercolor bookmarks for friends"
- "I count dance steps in my head when I am nervous"

Not:
- "I like helping people"
- "I am creative"

### Step 2. LLM clusters the inputs

The model should group facts into a few candidate themes:
- leadership
- iteration
- translation
- ritual
- precision
- curiosity
- belonging
- care

But these should be inferred, not selected from a canned menu first.

### Step 3. LLM proposes storylines

For each cluster, generate:
- a theme title
- a very short connection line
- 2-4 supporting facts
- 2-4 shared values
- a possible essay angle
- what kind of prompt it could answer

The output should feel like pattern recognition, not explanation-heavy writing.

### Step 4. Student saves favorite angles

The student should be able to save a storyline as:
- an essay angle
- a reusable personal theme
- a candidate for a specific prompt

### Step 5. Downstream essay reuse

Later, when the student opens a prompt, the app can suggest:
- "This prompt matches your 'Guiding vs. Following' storyline"
- "This prompt could use your teaching + dance theme"

That turns this from a one-off gimmick into core product infrastructure.

## Best MVP

Do not start with a huge agent.

Start with one compact, high-leverage workflow:

### MVP input
- 8 to 21 raw facts about the student

### MVP output
- 3 storyline cards

Each card contains:
- title
- one short connection line
- supporting facts used
- shared values
- suggested prompt types
- a "use this angle" action

Each card should be readable in about 5 seconds.

That is enough for version one.

## Why "21 Interesting Facts About Me" Is Good

This is a strong entry point.

It is playful. It lowers pressure. It feels less like "brand yourself" and more like "dump interesting stuff."

Also, 21 is high enough that the student cannot just list resume bullets. They have to get weird and specific. Good.

I would keep it as the branded first-step experience.

Suggested framing:

**21 Interesting Facts About Me**

"List small, specific things about yourself. Hobbies, habits, rituals, odd skills, things you make, things you notice, things you teach, things you keep doing."

## What The LLM Should Actually Return

Use structured output, not freeform paragraphs.

The output should be very succinct.

Think:
- sharp labels
- surprising connections
- a few shared values

Not:
- long analysis
- therapy language
- 5-sentence explanations

Recommended shape:

```ts
type RawFact = {
  id: string;
  text: string;
};

type Storyline = {
  id: string;
  title: string;
  connection: string;
  supportingFactIds: string[];
  sharedValues: string[];
  possiblePromptTypes: string[];
  confidence: "high" | "medium" | "low";
};
```

Important:
- Every storyline must cite the facts it used
- The model should not invent facts
- The model should prefer cross-category combinations over same-bucket repetition
- The model should compress the idea into a few memorable words
- The model should name shared values directly

That last point matters a lot.

Teaching Scratch + dance + bookmarks is interesting because those do not obviously belong together.

NHS + tutoring + volunteering is usually weaker because it collapses into generic "I help people."

Example desired outputs:

- `Tracing`
  Bookmarks, tracing knowledge, marking dance steps
  Values: clarity, memory, orientation

- `Fit and fluency`
  Tailoring clothes, learning a language
  Values: expression, adaptation, empathy

- `Expression through structure`
  Sewing patterns, grammar rules, choreography
  Values: discipline, creativity, precision

- `Translation`
  Tailoring a fit, translating a thought, adjusting movement for someone else
  Values: communication, care, sensitivity

## The Prompting Approach

This should be a small pipeline, not one giant prompt.

### Pass 1. Normalize facts

Take the student's list and lightly clean it:
- remove duplicates
- split compound items
- preserve voice

### Pass 2. Find candidate connections

Ask the model to identify:
- repeated behaviors
- contradictions or tensions
- transfer across contexts
- surprising overlaps
- aesthetic patterns
- service patterns

### Pass 3. Generate storyline cards

Ask for only 3-5 cards.
Force distinctiveness.
Force evidence.
Force non-generic language.
Force brevity.

Good cards should sound like:
- "Tracing"
- "Fit and fluency"
- "Expression through structure"

Not:
- "You are a creative person who likes to communicate and help others."

### Pass 4. Rank

Prefer cards that are:
- specific
- supported by multiple facts
- not resume-cliche
- reusable for real essay prompts

## Guardrails

Without guardrails, this feature gets cringe fast.

### Avoid
- therapist-speak
- fake trauma mining
- generic leadership summaries
- overclaiming meaning from thin evidence
- making the student sound older or more polished than they are

### Require
- direct citation of student facts
- hedged language when confidence is weak
- multiple distinct directions, not one "best identity"
- outputs that sound like observations, not destiny
- short cards instead of long summaries

## UX Recommendation

Do not make this a chat window first.

A blank chat box is lazy product design here.

The right UI shape is:
- fact entry area
- generated storyline cards
- save / remix / regenerate actions

Later you can add chat as a secondary mode:
- "push this angle more playful"
- "make this less like leadership"
- "find a version better for community prompts"

But cards should be the primary surface.

## How This Fits The Current Essays Page

The existing essays workspace already has:
- prompt selection
- live drafting
- tags
- versions

What it lacks is the upstream thinking layer.

The new feature should sit before drafting, probably as a left-of-draft or right-rail module:
- `Brainstorm`
- `Storylines`
- `Idea Lab`

Best naming right now: **Storylines**

It sounds more valuable than "brainstorm."

## Data Model Direction

You likely want new persisted entities for:
- raw fact snippets
- generated storyline cards
- saved storyline selections
- prompt-to-storyline links

Conceptually:

```ts
type StudentFact = {
  id: string;
  userId: string;
  text: string;
  source: "manual";
  createdAt: string;
};

type EssayStoryline = {
  id: string;
  userId: string;
  title: string;
  connection: string;
  supportingFactIds: string[];
  sharedValues: string[];
  possiblePromptTypes: string[];
  generationBatchId: string;
  saved: boolean;
  createdAt: string;
};
```

You do not need full schema design yet. Just preserve the product idea:
facts in, structured storylines out.

## What To Build First

If you want the fastest path to something people actually like:

### V1
- add a "21 Interesting Facts About Me" panel to essays
- let users submit facts
- generate 3 storyline cards
- allow save / regenerate

### V2
- let users click a storyline and attach it to a prompt
- suggest matching storylines for each prompt

### V3
- add conversational refinement
- "make this warmer"
- "find a less obvious angle"
- "connect this to community"

That ordering is important.

The magic is in the storyline generation first, not in chat.

## Product Risks

### Risk 1. Generic output

If the model says "you are resilient and creative," the feature is dead on arrival.

### Risk 2. Too much text

If the output is essay-like instead of card-like, students will skim past it.

### Risk 3. Fake insight

If the model overinterprets flimsy inputs, trust drops fast.

### Risk 4. Wrong wedge

If you frame this as "AI writes your personal statement," you compete with a million shallow tools.

If you frame it as "find your hidden story angles," that is more distinct.

## Recommendation

Build this now, but build the narrow version.

Not a full autonomous essay agent.

Not a general-purpose writing chatbot.

Build:

**21 Interesting Facts About Me -> 3 Storyline Cards -> Save one to a prompt**

That is concrete, differentiated, and directly useful.

## What I Would Call It

Three good options:
- Storylines
- Idea Lab
- 21 Facts

Best product structure:
- feature name: **Storylines**
- onboarding prompt inside it: **21 Interesting Facts About Me**

That gives you both the serious product layer and the playful hook.

## Decision

This is worth building.

It is one of the first LLM features in this app that could feel genuinely sticky because it helps with a real cognitive bottleneck, not just writing polish.

The whole game is keeping it evidence-based, structured, and non-generic.
