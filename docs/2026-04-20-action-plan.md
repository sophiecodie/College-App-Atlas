# 2026-04-20 Action Plan

## Today's Tasks

### 1. Delete recommendations and fees pages
- Remove the standalone `recs` page.
- Remove the standalone `fees` page.
- Remove any navigation links, tabs, or buttons that still point to those pages.
- Clean up any actions or imports that only existed for those pages.

### 2. Complete the research page
- Redesign the main research page so it only shows cards.
- Make the cards larger and nicer-looking.
- Add small color-coded dots next to:
  - Reach level
  - Priority level
- Keep the main research page focused on scanning colleges, not editing details inline.
- When a research card is clicked, open a full-screen page for that specific college.
- On the full-screen college research page, include the more detailed workspace:
  - General notes
  - Academic programs
  - Campus culture
  - Why us material
  - Personal reflections
- Add a clear back path from the full-screen research page to the main research card view.

### 3. Make the colleges list cuter and more useful
- Redesign the main colleges page with bigger widgets/cards.
- Make the widgets feel more visual and polished.
- Each college widget should open into a full-screen college page.
- Add a visible progress bar on the main colleges page.
- Replace the current add-college flow with a plus button.
- Clicking the plus button should open a popup/modal where a college can be selected and added.
- Inside each college page, add an option to remove that college.
- Every remove action must show a confirmation popup first.
- The confirmation popup should clearly state which college is being removed.
- Condense the requirements section so it takes up less space and is easier to scan.

## Recommended Build Order

1. Remove the `recs` and `fees` routes first.
2. Rework the research overview into a cards-only page.
3. Add the full-screen research detail page for each college.
4. Redesign the colleges index with larger widgets and progress bars.
5. Add the plus-button modal flow for adding colleges.
6. Add the remove-college flow with confirmation popup.
7. Tighten the requirements section layout.

## Future Tasks

### Essay prompts database
- Tag prompts that are optional.
- Tag prompts that depend on the school.
- Improve filtering so only relevant prompts appear for each college and applicant type.

### LLM integration
- Explore premium AI features that feel genuinely useful.
- Focus on tools tied to:
  - Specific colleges
  - Saved research
  - Essay drafting support
  - Next-step coaching

### Aesthetics
- Improve settings and layout polish.
- Add more layered and intentional visuals.
- Explore gamification.
- Make progress feel more motivating and less administrative.

## Notes
- Main product goal for this sprint: simplify the structure, make the UI feel cuter and more spacious, and move detailed editing into full-screen college-specific views.
