# AGENTS.md instructions for /Users/sophie/Documents/CollegeApplicationAtlas/clawyapp1

## Skills
A skill is a set of local instructions to follow that is stored in a `SKILL.md` file. Below is the list of skills that can be used. Each entry includes a name, description, and file path so you can open the source for full instructions when using a specific skill.

### Available skills
- skill-creator: Guide for creating effective skills. Use when you want to create a new skill or update an existing skill with specialized workflows or tool integrations. (file: /Users/sophie/.codex/skills/.system/skill-creator/SKILL.md)
- skill-installer: Install Codex skills from a curated list or a GitHub repo path. Use when you want to list installable skills or install one into your Codex environment. (file: /Users/sophie/.codex/skills/.system/skill-installer/SKILL.md)
- gstack: Fast headless browser for QA testing and site dogfooding. Use when you need to open or test a site, verify a deployment, or dogfood a user flow. (file: /Users/sophie/Documents/CollegeApplicationAtlas/clawyapp1/.agents/skills/gstack/SKILL.md)
- autoplan: Auto-review pipeline that runs CEO, design, and engineering plan reviews sequentially with automatic decisions and a final approval gate. (file: /Users/sophie/Documents/CollegeApplicationAtlas/clawyapp1/.agents/skills/gstack/autoplan/SKILL.md)
- benchmark: Performance regression detection and baseline comparison for page load times, Core Web Vitals, and resource sizes. (file: /Users/sophie/Documents/CollegeApplicationAtlas/clawyapp1/.agents/skills/gstack/benchmark/SKILL.md)
- browse: Fast headless browser for QA, deployment checks, screenshots, responsive testing, and user-flow verification. (file: /Users/sophie/Documents/CollegeApplicationAtlas/clawyapp1/.agents/skills/gstack/browse/SKILL.md)
- canary: Lightweight preflight check to verify a change or branch before broader review or shipping. (file: /Users/sophie/Documents/CollegeApplicationAtlas/clawyapp1/.agents/skills/gstack/canary/SKILL.md)
- careful: High-caution workflow for risky edits, sensitive refactors, or work that needs extra verification. (file: /Users/sophie/Documents/CollegeApplicationAtlas/clawyapp1/.agents/skills/gstack/careful/SKILL.md)
- checkpoint: Save a structured working checkpoint before context switches, risky edits, or long breaks. (file: /Users/sophie/Documents/CollegeApplicationAtlas/clawyapp1/.agents/skills/gstack/checkpoint/SKILL.md)
- codex: Codex-specific gstack guidance for adapting the gstack workflow to this agent environment. (file: /Users/sophie/Documents/CollegeApplicationAtlas/clawyapp1/.agents/skills/gstack/codex/SKILL.md)
- connect-chrome: Connect a local Chrome session for debugging, testing, or browser automation. (file: /Users/sophie/Documents/CollegeApplicationAtlas/clawyapp1/.agents/skills/gstack/connect-chrome/SKILL.md)
- cso: Product and strategy review lens for roadmap, scope, and business tradeoff discussions. (file: /Users/sophie/Documents/CollegeApplicationAtlas/clawyapp1/.agents/skills/gstack/cso/SKILL.md)
- design-consultation: Product design consultation workflow for UX direction, flows, and interaction tradeoffs. (file: /Users/sophie/Documents/CollegeApplicationAtlas/clawyapp1/.agents/skills/gstack/design-consultation/SKILL.md)
- design-html: Generate or refine HTML/CSS design explorations with a stronger visual-design pass. (file: /Users/sophie/Documents/CollegeApplicationAtlas/clawyapp1/.agents/skills/gstack/design-html/SKILL.md)
- design-review: Review a design or UI implementation for quality, consistency, and product polish. (file: /Users/sophie/Documents/CollegeApplicationAtlas/clawyapp1/.agents/skills/gstack/design-review/SKILL.md)
- design-shotgun: Rapidly generate multiple design directions for comparison before converging on one. (file: /Users/sophie/Documents/CollegeApplicationAtlas/clawyapp1/.agents/skills/gstack/design-shotgun/SKILL.md)
- document-release: Prepare release notes and release documentation for a shipped change. (file: /Users/sophie/Documents/CollegeApplicationAtlas/clawyapp1/.agents/skills/gstack/document-release/SKILL.md)
- freeze: Set a temporary edit boundary so work stays constrained to a chosen directory. (file: /Users/sophie/Documents/CollegeApplicationAtlas/clawyapp1/.agents/skills/gstack/freeze/SKILL.md)
- gstack-upgrade: Upgrade the vendored gstack skill bundle when an update is available. (file: /Users/sophie/Documents/CollegeApplicationAtlas/clawyapp1/.agents/skills/gstack/gstack-upgrade/SKILL.md)
- guard: Guardrail workflow for validating risky actions and catching common operational mistakes early. (file: /Users/sophie/Documents/CollegeApplicationAtlas/clawyapp1/.agents/skills/gstack/guard/SKILL.md)
- health: Inspect repo or environment health and surface operational issues or missing setup. (file: /Users/sophie/Documents/CollegeApplicationAtlas/clawyapp1/.agents/skills/gstack/health/SKILL.md)
- investigate: Debug and root-cause workflow for bugs, regressions, and unclear failures. (file: /Users/sophie/Documents/CollegeApplicationAtlas/clawyapp1/.agents/skills/gstack/investigate/SKILL.md)
- land-and-deploy: Merge, land, and deploy workflow once a change is ready to go out. (file: /Users/sophie/Documents/CollegeApplicationAtlas/clawyapp1/.agents/skills/gstack/land-and-deploy/SKILL.md)
- learn: Capture and retrieve project learnings so repeated context stays available across sessions. (file: /Users/sophie/Documents/CollegeApplicationAtlas/clawyapp1/.agents/skills/gstack/learn/SKILL.md)
- office-hours: General-purpose product and engineering consultation workflow for asking broad "what should we do?" questions. (file: /Users/sophie/Documents/CollegeApplicationAtlas/clawyapp1/.agents/skills/gstack/office-hours/SKILL.md)
- plan-ceo-review: CEO-style review of a plan, focused on goals, prioritization, and strategic clarity. (file: /Users/sophie/Documents/CollegeApplicationAtlas/clawyapp1/.agents/skills/gstack/plan-ceo-review/SKILL.md)
- plan-design-review: Design-focused review of a plan, emphasizing UX quality, polish, and interaction risks. (file: /Users/sophie/Documents/CollegeApplicationAtlas/clawyapp1/.agents/skills/gstack/plan-design-review/SKILL.md)
- plan-eng-review: Engineering review of a plan, emphasizing architecture, correctness, testing, and execution risk. (file: /Users/sophie/Documents/CollegeApplicationAtlas/clawyapp1/.agents/skills/gstack/plan-eng-review/SKILL.md)
- qa: Full QA workflow for verifying user flows, regressions, bugs, and release readiness. (file: /Users/sophie/Documents/CollegeApplicationAtlas/clawyapp1/.agents/skills/gstack/qa/SKILL.md)
- qa-only: Focused QA pass without broader review or planning workflows. (file: /Users/sophie/Documents/CollegeApplicationAtlas/clawyapp1/.agents/skills/gstack/qa-only/SKILL.md)
- retro: Retrospective workflow for summarizing what happened, what went wrong, and what to improve next time. (file: /Users/sophie/Documents/CollegeApplicationAtlas/clawyapp1/.agents/skills/gstack/retro/SKILL.md)
- review: Broad review workflow for a change, plan, or PR, typically spanning product, design, and engineering concerns. (file: /Users/sophie/Documents/CollegeApplicationAtlas/clawyapp1/.agents/skills/gstack/review/SKILL.md)
- setup-browser-cookies: Configure browser cookies/session state needed for authenticated QA or deployment checks. (file: /Users/sophie/Documents/CollegeApplicationAtlas/clawyapp1/.agents/skills/gstack/setup-browser-cookies/SKILL.md)
- setup-deploy: Configure deploy tooling and environment setup for shipping workflows. (file: /Users/sophie/Documents/CollegeApplicationAtlas/clawyapp1/.agents/skills/gstack/setup-deploy/SKILL.md)
- ship: Ship workflow covering tests, diff review, versioning, changelog, commit, push, and PR creation. (file: /Users/sophie/Documents/CollegeApplicationAtlas/clawyapp1/.agents/skills/gstack/ship/SKILL.md)
- unfreeze: Clear the edit boundary created by `freeze` and allow edits everywhere again. (file: /Users/sophie/Documents/CollegeApplicationAtlas/clawyapp1/.agents/skills/gstack/unfreeze/SKILL.md)

### How to use skills
- Discovery: The list above is the skills available in this session (name + description + file path). Skill bodies live on disk at the listed paths.
- Trigger rules: If the user names a skill (with `$SkillName` or plain text) OR the task clearly matches a skill's description shown above, you must use that skill for that turn. Multiple mentions mean use them all. Do not carry skills across turns unless re-mentioned.
- Missing/blocked: If a named skill isn't in the list or the path can't be read, say so briefly and continue with the best fallback.
- How to use a skill (progressive disclosure):
  1) After deciding to use a skill, open its `SKILL.md`. Read only enough to follow the workflow.
  2) When `SKILL.md` references relative paths, resolve them relative to the skill directory listed above first, and only consider other paths if needed.
  3) If `SKILL.md` points to extra folders such as `references/`, load only the specific files needed for the request; don't bulk-load everything.
  4) If `scripts/` exist, prefer running or patching them instead of retyping large code blocks.
  5) If `assets/` or templates exist, reuse them instead of recreating from scratch.
- Coordination and sequencing:
  - If multiple skills apply, choose the minimal set that covers the request and state the order you'll use them.
  - Announce which skill(s) you're using and why in one short line. If you skip an obvious skill, say why.
- Context hygiene:
  - Keep context small: summarize long sections instead of pasting them; only load extra files when needed.
  - Avoid deep reference-chasing: prefer opening only files directly linked from `SKILL.md` unless you're blocked.
  - When variants exist, pick only the relevant reference file(s) and note that choice.
- Safety and fallback: If a skill can't be applied cleanly, state the issue, pick the next-best approach, and continue.
