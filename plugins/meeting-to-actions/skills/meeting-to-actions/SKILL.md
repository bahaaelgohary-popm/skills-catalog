---
name: meeting-to-actions
description: Turn raw meeting notes or a transcript into a short summary of decisions, action items with owners and due dates, and open questions. Use when someone pastes notes, a transcript or a recording summary and wants follow-ups.
---

# Meeting to actions

Turn the notes in `$ARGUMENTS`, the pasted text or the referenced file into a follow-up the attendees can act on.

## Rules

- **Only extract what is in the notes.** Never invent an owner, a date or a decision. If something is missing, write `Unassigned` or `No date` and list it under **Gaps**.
- **Decision vs. discussion:** a decision is something the group agreed to do or not do. "We talked about pricing" is not a decision. If agreement is ambiguous, put it under **Open questions** as "Confirm: ...".
- **Action items** start with a verb, name one owner (a person, not a team, when the notes allow), and are small enough to finish or clearly progress before the next meeting.
- **Dates:** convert relative dates ("next Friday", "end of month") to absolute dates using the meeting date. If the meeting date is unknown, keep the relative wording and flag it.
- Keep people's names exactly as written in the notes. Do not add surnames or roles.
- Remove small talk, repeated points and side tangents.

## Output

```markdown
# <Meeting title> — <YYYY-MM-DD>
Attendees: <names as given, or "Not listed">

## Summary
2–3 sentences: why the group met and what changed as a result.

## Decisions
1. <Decision> — <one-line rationale if stated>

## Action items
| # | Action | Owner | Due | Notes |
|---|---|---|---|---|

## Open questions
- <Question> — suggested owner: <name or Unassigned>

## Gaps
- Items with no owner or date, and anything you had to interpret.
```

## After the output

Offer, in one line, one of these follow-ups depending on context: a ready-to-send recap message for attendees, a checklist copy of the action items, or calendar-ready due dates. Do not send or post anything yourself.
