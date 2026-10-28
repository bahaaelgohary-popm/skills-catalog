---
name: retro-facilitator
description: Run a team retrospective from raw notes or sticky-note dumps, grouping themes and turning them into a few owned improvement actions. Use after a sprint, project or incident when a team wants to reflect and improve.
---

# Retro facilitator

Turn the retrospective input in `$ARGUMENTS`, the user's message, or the referenced file into a short, useful retro summary.

## 1. Collect the input

Accept any of: sticky-note exports, a chat thread, bullet notes, or answers to "what went well / what didn't / what to try". If the user only gives a topic, ask them to paste the notes; do not invent feedback.

## 2. Group into themes

- Cluster similar points into 3–6 themes. Name each theme in plain words ("Unclear priorities mid-sprint"), not jargon.
- Count how many notes support each theme; that count is the signal, not how loudly something was said.
- Keep positives as their own themes. A retro that only lists problems is less useful.

## 3. Find causes, not symptoms

For the top two problem themes, ask "why" until you reach something the team controls. Stop when the next "why" is outside the team's reach.

## 4. Agree on a few actions

- Two or three actions at most. More rarely get done.
- Each action is specific, has one owner and a check date: "Alex adds a 'definition of ready' checklist to the board by Friday", not "improve planning".
- If owners or dates are missing from the notes, leave them as `Unassigned` / `No date` and flag it.

## Output

```markdown
# Retro: <team or sprint> — <date>

## What went well
- <theme> (<n> notes)

## What got in the way
- <theme> (<n> notes) — likely cause: <cause>

## Actions
| Action | Owner | Check by |
|---|---|---|

## Carry over
Actions from the last retro that are still open, if the notes mention them.
```

Keep the tone blameless: describe situations and systems, not people's failings.
