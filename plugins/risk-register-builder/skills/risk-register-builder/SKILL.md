---
name: risk-register-builder
description: Turns a project description or a list of worries into a scored risk register with an owner and a next action for each risk. Use when someone asks for a risk register, a risk assessment, "what could go wrong", or wants to prepare risks for a planning or steering meeting.
argument-hint: "<project or list of concerns>"
---

# Risk register builder

Build a risk register a team can review and act on in one meeting.

## 1. Gather the inputs

Read them from `$ARGUMENTS` or the user's last message:

- **Scope:** the project, release or change the risks are about.
- **Known concerns:** anything the user already worries about.
- **Deadline or milestone,** if given.
- **Team or roles,** if given. Without them, leave owners as "TBD".

If there is no scope at all, ask one question: "Which project or change should I assess?" Then continue.

## 2. Find the risks

- Start from the user's concerns. Add risks only where the scope clearly implies them (dependencies, deadlines, new technology, single points of knowledge, external parties).
- Write each risk as cause, event and effect: "Because <cause>, <event> may happen, which would <effect>."
- Merge duplicates. Keep at most 10 risks; list the rest under "Watch list".
- Separate risks (may happen) from issues (already happening). Put issues in their own short list.

## 3. Score them

- **Likelihood** and **Impact** from 1 (low) to 3 (high). **Score** = Likelihood × Impact.
- Pick a **response** for each: Avoid, Reduce, Transfer or Accept.
- Give each risk one **next action** that someone can start this week, an **owner** and a **trigger** (the sign that the risk is turning into an issue).
- Sort by score, highest first.

## 4. Output format

```
**Risk register: <scope>** · <date or milestone>

| # | Risk (cause → event → effect) | L | I | Score | Response | Next action | Owner | Trigger |
|---|---|---|---|---|---|---|---|---|
| 1 | ... | 3 | 3 | 9 | Reduce | ... | ... | ... |

Issues (already happening): <list, or "none">
Watch list: <lower risks left out, or "none">
Top 3 to discuss: <the three highest scores, one line each on the decision needed>
```

## Rules

- Use only facts the user gave or that follow directly from the scope. Do not invent people, dates or numbers.
- Every next action is concrete ("Book a load test before the release freeze"), never "monitor" or "be careful".
- Accept is a valid response for low scores; say why in the next action column.
