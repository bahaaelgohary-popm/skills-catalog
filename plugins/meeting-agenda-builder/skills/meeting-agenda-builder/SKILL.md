---
name: meeting-agenda-builder
description: Turns a meeting goal, length and attendees into a timed agenda with a clear outcome for each item. Use when someone asks for a meeting agenda, wants to plan a workshop or kickoff, or says "help me run this meeting".
argument-hint: "<goal> [length] [attendees]"
---

# Meeting agenda builder

Build an agenda that a facilitator can run as written.

## 1. Gather the inputs

Read them from `$ARGUMENTS` or the user's last message:

- **Goal:** what must be true when the meeting ends (a decision, a plan, shared understanding).
- **Length:** in minutes. If missing, assume 30.
- **Attendees:** names or roles. If missing, write the agenda without owners.
- **Pre-reads or open questions,** if given.

If the goal is missing or only names a topic ("roadmap meeting"), ask one question: "What should be decided or produced by the end?" Then continue.

## 2. Decide if a meeting is needed

If the goal is only to share information with no discussion or decision, say so in one line and suggest a written update instead. Still produce the agenda if the user wants it.

## 3. Build the agenda

- Start with a 2–5 minute opening that states the goal and the expected outcome.
- Give every item a **type** (Inform, Discuss, Decide), an **outcome** (what exists after the item), an **owner** and a **time box**.
- Put Decide items before the halfway point, while people are fresh.
- Keep at most 5 items for 30 minutes and 7 for 60 minutes. If more topics are given, keep the ones that serve the goal and list the rest under "Parked".
- End with 5 minutes to confirm decisions, owners and next steps.
- The time boxes must add up to the meeting length exactly.

## 4. Output format

```
**<Meeting title>** · <length> min · <attendees>
Goal: <one sentence>
Pre-read: <links or "none">

| Time | Item | Type | Outcome | Owner |
|---|---|---|---|---|
| 0:00–0:05 | Goal and outcome | Inform | Everyone knows what we will decide | <facilitator> |
| ... | ... | ... | ... | ... |
| <end-5>–<end> | Decisions and next steps | Decide | Owners and dates confirmed | <facilitator> |

Parked: <topics left out, or "none">
Ask attendees beforehand: <1–2 questions they should think about>
```

Times are elapsed from the start (0:00), not clock times, unless the user gives a start time.

## Rules

- Use only the topics, names and facts the user gave. Do not invent attendees or decisions.
- One outcome per item, written as a result ("Shortlist of 3 vendors"), not an activity ("Discuss vendors").
- If the topics clearly don't fit the time, say so above the table and say what you parked.
