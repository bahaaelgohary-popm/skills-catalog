---
name: prd-writer
description: Turn a rough product idea into a one-page PRD with problem, users, goals, non-goals, success metrics and risks. Use when someone shares an idea, feature request or problem statement and wants a short spec they can circulate.
---

# PRD writer

Turn the idea in `$ARGUMENTS` (or the user's last message) into a one-page PRD. One page means roughly 400–700 words. Cut anything that doesn't change a decision.

## Before writing

1. Restate the idea in one sentence and check it with the user only if the core problem is truly unclear. Otherwise proceed and list your assumptions.
2. Separate what the user said from what you inferred. Inferences go into **Assumptions** or **Open questions**, never presented as fact.
3. Do not invent data. If a number is needed (users affected, baseline rate), write `TBD — source:` and name where it would come from.

## Output template

Use exactly these sections, in this order:

```markdown
# <Feature name> — PRD
Status: Draft · Author: <name or TBD> · Date: <today>

## Problem
2–4 sentences. Who hurts, what they do today, why it is costly. No solution here.

## Users
- Primary: <segment> — <job they are trying to do>
- Secondary: <segment> (optional)
- Not for: <segment we deliberately exclude>

## Goals
3 at most, each an outcome, not a feature. "Reduce time to first report from 2 days to 1 hour", not "Build a report wizard".

## Non-goals
3–5 things a reader might expect that this will NOT do in this version.

## Proposed solution
A short paragraph plus up to 5 bullets of key capabilities. Stay at the level a designer and engineer can start from.

## Success metrics
| Metric | Baseline | Target | How measured |
|---|---|---|---|
Include one primary metric and at least one guardrail (something that must not get worse).

## Risks and mitigations
| Risk | Likelihood | Impact | Mitigation |
|---|---|---|---|
Cover at least: adoption, technical, and one "we are wrong about the problem" risk.

## Assumptions
## Open questions
Numbered, each with a suggested owner.
```

## Quality checks before replying

- The problem section contains no solution words.
- Every goal can be measured by a row in the metrics table.
- Non-goals are specific enough that someone could argue with them.
- At least one guardrail metric exists.
- Nothing is invented; unknowns are marked `TBD`.

End with one line: the single biggest open question to resolve before building.
