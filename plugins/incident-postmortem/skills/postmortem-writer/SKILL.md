---
name: postmortem-writer
description: Write a blameless incident postmortem from notes, chat logs or an alert history, with timeline, impact, root cause and owned follow-up actions. Use after an outage or incident when someone needs the write-up.
---

# Postmortem writer

Write a blameless postmortem from the material in `$ARGUMENTS`, the user's message, or the files they point to.

If the material is long or messy (chat exports, alert logs, several files), first hand it to the `timeline-builder` agent from this plugin to produce a clean, timestamped timeline, then continue from that timeline.

## Rules

- **Blameless:** describe what happened and why the system allowed it. Name roles ("the on-call engineer"), not people, unless the user asks otherwise.
- **Facts only:** every time, number and claim comes from the material. Mark gaps as `Unknown` and list them under Open questions.
- **Times:** one timezone throughout, stated once at the top.

## Template

```markdown
# Postmortem: <short title>
Date: <incident date> · Severity: <S1–S4 or as given> · Status: Draft · Timezone: <tz>

## Summary
Two or three sentences: what broke, for whom, for how long, and how it was fixed.

## Impact
Who was affected, how many, for how long, and what they could not do. Include numbers if the material has them.

## Timeline
| Time | Event |
|---|---|
Include: first symptom, detection, key decisions, mitigation, resolution.

## Detection
How we found out, and how long after it started. Could we have known sooner?

## Root cause and contributing factors
Use "5 whys" until you reach something the team can change. List contributing factors separately.

## What went well
## Where we got lucky

## Action items
| Action | Type (prevent / detect / mitigate) | Owner | Due |
|---|---|---|---|
Each action is specific and checkable. Leave Owner and Due blank if not given; never invent them.

## Open questions
```

End with the single action that would most reduce the chance of a repeat.
