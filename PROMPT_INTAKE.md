# Prompt Intake

Use this workflow when adding or refreshing essay prompts.

1. Start with an official source.
2. Capture the exact prompt text verbatim from that source.
3. Capture the exact limit type.
4. Only add a row to `prompts.jsonl` when the prompt text is confirmed.
5. If a school is known to have prompts but the exact text is not publicly available, keep the school in `prompt_sources.json` and add a note there instead of inventing a placeholder prompt row.

## Limit Rules

- Use `word_limit` for word-based prompts.
- Use `character_limit` for character-based prompts.
- If a prompt has a published minimum, keep it as `word_min`.
- If a prompt is a non-writing selection item, it can have no limit field.

## Tag Rules

- Use the main student-facing buckets from `prompt_tagging.py`.
- Very short prompts, including 200-character prompts and prompts with `word_limit <= 50`, should use `Short Essays`.
- Do not use `Open-Ended`, `Short Answer`, `Mentorship`, or `Additional Information`.

## Stanford Note

As of April 2, 2026, Stanford's official public page confirms:
- several 50-word short questions
- 3 essays with a 100-word minimum and 250-word maximum

Only the 3 essay prompts are currently confirmed in `prompts.jsonl`.
