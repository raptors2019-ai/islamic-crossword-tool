# Learn from Mistake

Add a learning to CLAUDE.md to prevent repeating a mistake.

## Auto-Processing Mode

**FIRST:** Check if there are queued learnings in `.claude/learnings-queue.md`. If the file exists and has content:

1. Read the queue file
2. For EACH queued learning:
   - Analyze the diff context
   - Write a specific, actionable rule (one line)
   - Add it to the Learnings section in CLAUDE.md
3. Clear the queue file after processing
4. Confirm what was added

## Manual Mode

If `$ARGUMENTS` is provided OR no queue exists:

1. If no argument provided, ask: "What mistake should I learn from?"

2. Analyze the recent conversation to understand:
   - What went wrong
   - Why it was wrong
   - How to prevent it in the future

3. Formulate a clear, actionable rule:
   - Keep it concise (one line if possible)
   - Make it specific to this codebase
   - Include the "why" if not obvious

4. Add the learning to the `## Learnings (Don't Repeat These!)` section in CLAUDE.md

5. Confirm the learning was added and read it back.

## Learning Format Guidelines

**Good learnings (specific, actionable):**
- "Check `hasWord()` before placing 2-letter words - not all 2-letter combos are valid"
- "Use `ISLAMIC_WORDS_SET.has()` not `.includes()` - it's a Set not an Array"
- "Always destructure props in React components - `{prop}` not `props.prop`"

**Bad learnings (too vague):**
- "Be more careful with words"
- "Check the code first"

## Example Flow

```
[Hook detects correction → queues to learnings-queue.md]
[Claude sees queue → auto-processes]

Processing queued learning from 2026-02-02 14:45:00...
Type: logic-fix
Files: app/src/lib/word-index.ts

Analyzing diff... The issue was using .includes() on a Set.

✅ Added to CLAUDE.md:
- "Use Set.has() not .includes() when checking ISLAMIC_WORDS_SET - Sets don't have .includes()"

Queue cleared.
```
