# Essays Page Cleanup Plan

Date: 2026-04-02
Mode: Builder
Status: DONE

## Goal

Make the essays page feel clean and trustworthy tonight.

That means:
- Remove the `Reuse` section from the essays UI.
- Simplify the tag system so it reflects how a student actually groups essays.
- Fix Yale short-take limits so 200-character prompts are displayed correctly.
- Mark very short prompts as `Short Essays`.
- Define a repeatable workflow for adding Stanford prompts without polluting the dataset with placeholders.

## What I Observed

### 1. The current tag taxonomy is too clever

The tag logic in [prompt_tagging.py](/Users/sophie/Documents/CollegeApplicationAtlas/clawyapp1/prompt_tagging.py#L3) still treats `Open-Ended` as a real primary tag and `Mentorship` as a real secondary tag. That creates labels that feel like model-internal categories, not student-facing buckets.

It also falls back to `Open-Ended` for a lot of optional prompts in [prompt_tagging.py](/Users/sophie/Documents/CollegeApplicationAtlas/clawyapp1/prompt_tagging.py#L99), which is why the essays page gets noisy. "Open-ended" is not a useful planning category. It mostly means "we didn't decide."

### 2. The essays page still advertises reuse as a core workflow

The page subtitle in [main.py](/Users/sophie/Documents/CollegeApplicationAtlas/clawyapp1/main.py#L1920) literally says it is for "tracking reuse", and the right rail still hardcodes a `Reuse` tab in [main.py](/Users/sophie/Documents/CollegeApplicationAtlas/clawyapp1/main.py#L2101). If you already know you want that gone, don’t negotiate with it. Remove the concept from the UI.

### 3. Yale’s short takes are broken because the data model only knows words

Yale has several `short_take_200_char` prompts in `prompts.jsonl`, but they currently have `word_limit: null`. The editor label in [main.py](/Users/sophie/Documents/CollegeApplicationAtlas/clawyapp1/main.py#L2053) always renders `X/Y words`, so even perfect prompt data could never display `200 characters` correctly with the current UI.

This is the core bug. Not just bad prompt data. Bad prompt data plus a UI that assumes every limit is a word limit.

### 4. The workspace silently converts missing limits to 250

When prompts are synced into the essay workspace, missing limits become `250` in [main.py](/Users/sophie/Documents/CollegeApplicationAtlas/clawyapp1/main.py#L1874). That means Yale short takes are currently being mutated into fake 250-word essays once they hit the workspace. Wild.

### 5. Stanford is stored as a fake prompt instead of a missing-source task

Right now Stanford exists as one placeholder row in `prompts.jsonl` that says the real prompt text needs manual capture. That is not a prompt. That is a TODO disguised as data. It also has a bogus `Service` tag. This is how dataset rot starts.

## Recommended Approach

### A. Shrink the tag taxonomy

Use a smaller primary set:
- `Why Us`
- `Why Major`
- `Intellectual Curiosity`
- `Community`
- `Identity`
- `Diversity`
- `Activity`
- `Service`
- `Adversity`
- `Roommate`
- `Additional Information`
- `Short Essays`
- `Debate`
- `Other`

Remove these from primary tags:
- `Open-Ended`
- `Short Answer`

Reason:
- `Open-Ended` is a bucket for indecision.
- `Short Answer` splits by format, not by how a student will plan reuse/theme coverage.
- `Short Essays` is the only format bucket that actually matters because those prompts behave differently when drafting.

For secondary tags, cut aggressively:
- Keep only tags that change how a student approaches the essay.
- `Culture` is probably defensible if you actually use it.
- `Mentorship` should go.
- Anything that feels like a topic keyword instead of a planning category should go.

My recommendation: remove `Mentorship`, keep `Debate`, and treat everything else as optional cleanup if time gets tight.

### B. Reclassify all "unclaimed" prompts into `Other`

Anything that does not clearly fit a stronger bucket should land in `Other`.

That includes prompts currently falling into `Open-Ended`. This is much better because `Other` tells the truth: "this prompt does not map cleanly to the main planning buckets."

Specific Yale/Duke examples:
- Yale "teach a course / write a book / create art" should become `Short Essays`, not `Open-Ended`, because the constraint matters more than the theme.
- Yale "someone who influenced you" should likely become `Short Essays`, with no `Mentorship` secondary.
- Duke "last thing you've been really excited about" should become `Other` unless you want to explicitly force `Intellectual Curiosity`.

### C. Introduce explicit limit units

You need two separate fields in the prompt model:
- `word_limit`
- `character_limit`

Do not overload one field.

Rule:
- Standard essays use `word_limit`.
- Yale short takes use `character_limit: 200`.
- Selection responses can have neither.

Then update the essays UI to display the right unit:
- `34/125 words`
- `112/200 characters`
- no counter when there is no textual limit

If you do not add `character_limit`, this bug will keep coming back.

### D. Define what counts as `Short Essays`

Use one rule everywhere:
- If `character_limit` exists, tag as `Short Essays`.
- Else if `word_limit <= 50`, tag as `Short Essays`.
- Else if prompt type is one of the very short formats and there is no better explicit limit yet, still tag as `Short Essays`.

This cleanly captures Yale short takes and ultra-short prompts without splitting the taxonomy into `Short Answer` vs `Short Essays`.

### E. Remove reuse from the page, not just the tab

Tonight’s goal is clarity. So remove all three:
- the page subtitle mention of reuse
- the `Reuse` tab
- the empty-state copy that promises reuse suggestions

You do not need to delete the backend helper functions tonight if you want to move fast. But the user-facing surface should stop implying this is a core part of the essays workflow.

### F. Treat Stanford as source-ingest workflow, not prompt data

Do not keep placeholder prompt rows in `prompts.jsonl`.

Instead:
1. Keep Stanford in [prompt_sources.json](/Users/sophie/Documents/CollegeApplicationAtlas/clawyapp1/prompt_sources.json) as a source to investigate.
2. Add a lightweight intake rule:
   - If prompt text is not known, do not write a row to `prompts.jsonl`.
   - Write a source status note instead.
3. Only add Stanford prompt rows once you have real prompt text plus real limits.

This is the whole workflow:
- Find official supplement source.
- Capture raw prompt text.
- Capture exact limit units.
- Tag.
- Append to `prompts.jsonl`.
- Reload sync.

No placeholder rows.

## Tonight’s Execution Order

### 1. Fix the taxonomy first

Change [prompt_tagging.py](/Users/sophie/Documents/CollegeApplicationAtlas/clawyapp1/prompt_tagging.py#L3):
- remove `Open-Ended`
- remove `Short Answer`
- remove `Mentorship`
- update legacy mappings so old `Open-Ended` values collapse to `Other` or `Short Essays`
- make short-format prompts prefer `Short Essays`
- make fallback classification land in `Other`

This gives you the right buckets before you touch prompt records.

### 2. Fix the Yale data

Update Yale prompt rows in `prompts.jsonl`:
- add `character_limit: 200` to all `short_take_200_char` prompts
- remove bogus `Open-Ended` / `Mentorship` classifications
- ensure those prompts resolve to `Short Essays`

Also audit any other prompts with `word_limit <= 50` and force them into `Short Essays`.

### 3. Fix the sync layer

Update [main.py](/Users/sophie/Documents/CollegeApplicationAtlas/clawyapp1/main.py#L1315) and [main.py](/Users/sophie/Documents/CollegeApplicationAtlas/clawyapp1/main.py#L1847):
- preserve `character_limit`
- stop defaulting missing textual limits to `250`
- only show a limit if one actually exists

If a prompt has neither limit, the UI should not fabricate one.

### 4. Fix the editor display

Update the essays page in [main.py](/Users/sophie/Documents/CollegeApplicationAtlas/clawyapp1/main.py#L2053):
- detect whether the active prompt is word-based or character-based
- display the correct counter label
- use character count for Yale short takes

This is where the bug becomes visibly fixed.

### 5. Remove reuse from the surface

Update [main.py](/Users/sophie/Documents/CollegeApplicationAtlas/clawyapp1/main.py#L1924) and [main.py](/Users/sophie/Documents/CollegeApplicationAtlas/clawyapp1/main.py#L2101):
- remove reuse wording from subtitle
- remove `Reuse` tab and panel
- update empty states accordingly

### 6. Clean Stanford

Remove the fake Stanford placeholder row from `prompts.jsonl`.

Then define the intake checklist somewhere lightweight, either:
- a short section in `README.md`, or
- a new `PROMPT_INTAKE.md`

Keep it brutally simple.

## Suggested Tag Decisions For The Current Dataset

### Yale
- `yale-03` What inspires you? → `Short Essays`
- `yale-04` teach a course / book / art → `Short Essays`
- `yale-05` significant influence → `Short Essays`
- `yale-06` not included elsewhere → `Additional Information` and also `Short Essays` if you want short-format visibility to dominate, otherwise keep `Additional Information`

My recommendation: make `Short Essays` the primary tag for short-take prompts, and keep thematic meaning only as secondary if truly useful. Format matters more here because it changes how the student drafts.

### Duke
- "last thing you've been really excited about" → `Other`
- AI ethics optional prompt → probably `Other`

That is fine. Not every prompt deserves a fancy label.

## Acceptance Criteria

You’re done tonight if:
- No visible `Reuse` section remains on the essays page.
- No visible `Open-Ended` or `Mentorship` tags remain.
- Yale short takes show `200 characters`, not fake word counts.
- Every prompt under 50 words, and every 200-character short take, appears under `Short Essays`.
- Stanford no longer appears as fake essay data.
- Adding Stanford later has a documented, repeatable path.

## Risks

- If you only fix prompt data and not the UI model, Yale will still be wrong.
- If you only delete `Open-Ended` from the tag list but keep its inference logic, those prompts will silently collapse in inconsistent ways.
- If you keep defaulting missing limits to `250`, you will keep manufacturing incorrect constraints.

## Open Questions

- Do you want `Additional Information` to override `Short Essays`, or should short format always win?
- Do you want to keep any secondary tags beyond `Debate`?

If you want the cleanest product tonight, make these calls:
- `Short Essays` wins over theme for ultra-short prompts.
- Keep only `Debate` as a secondary tag for now.

That gets you a much cleaner page fast.
