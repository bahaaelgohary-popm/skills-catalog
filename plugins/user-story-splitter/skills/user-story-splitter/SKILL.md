---
name: user-story-splitter
description: Split a large user story or feature into small, independently shippable vertical slices, each with acceptance criteria. Use when a story is too big for one iteration, or when someone asks how to break work down.
---

# User story splitter

Split the story or feature in `$ARGUMENTS` (or the user's last message) into slices a team can finish in a few days each.

## 1. Understand the story

Restate it in one line: who it is for, what they can do, and why. If the outcome is unclear, ask one question; otherwise state your assumptions and continue.

## 2. Pick splitting patterns

Use the patterns that fit; most stories need one or two:

| Pattern | Split by |
|---|---|
| Workflow steps | Each step of the user's journey, simplest path first |
| Happy path first | Main success case now, edge cases and errors later |
| Business rules | One rule or variation per slice |
| Data variations | One input type, format or source at a time |
| Interface | One channel first (for example web), others later |
| Simple then complex | A manual or basic version, then automation or polish |
| Defer performance | Make it work, then make it fast |

Never split by technical layer (database, API, UI) — every slice must be usable on its own.

## 3. Write the slices

For each slice:

```markdown
### <n>. <short title>
As a <user>, I can <action>, so that <outcome>.
Acceptance criteria:
- Given <context>, when <action>, then <result>
- ...
Size: S | M | L    Depends on: <slice numbers or none>
```

## 4. Check the result

- Every slice delivers something a user can see or use.
- Slice 1 is the thinnest end-to-end version and could ship alone.
- Each slice has 2–5 testable acceptance criteria.
- Nothing from the original story is lost: end with a "Not in these slices" list for anything deliberately deferred.
- Flag any slice still sized L and suggest how to split it further.
