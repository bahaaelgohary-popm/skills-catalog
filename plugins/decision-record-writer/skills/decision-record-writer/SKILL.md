---
name: decision-record-writer
description: Write an architecture decision record (ADR) from a discussion or a proposal, with context, options, decision and consequences, numbered and saved next to the team's existing ADRs. Use when a technical decision has been made or needs to be written down.
---

# Decision record writer

Write an ADR for the decision described in `$ARGUMENTS`, the user's message, or the referenced notes.

## 1. Gather the decision

You need: the problem, the options considered, what was chosen, and why. If the material does not say what was chosen, write the ADR with status `Proposed` and list the options neutrally. Never invent a decision.

Read `references/writing-guide.md` for what makes an ADR useful, and `examples/0007-use-postgres-for-orders.md` for the expected depth.

## 2. Number it

ADRs usually live in `docs/adr/` (also check `doc/adr/`, `adr/`, `docs/decisions/`). Ask before running anything, then find the next number with the bundled read-only script:

```bash
bash "${CLAUDE_SKILL_DIR}/scripts/next-adr-number.sh" <adr-folder>
```

If there is no ADR folder yet, start at `0001` and suggest `docs/adr/`.

## 3. Write it

Fill in `templates/adr-template.md` exactly. File name: `<number>-<short-kebab-title>.md`.

Rules:
- Context explains the forces at play, not the solution.
- Every option gets honest pros and cons, including the chosen one's downsides.
- Consequences list what becomes easier, what becomes harder, and any follow-up work.
- One decision per ADR. If the notes contain two decisions, write two ADRs.
- Plain language; spell out acronyms on first use.

## 4. Save

Show the full ADR and the proposed path first. Write the file only after the user agrees. If this ADR replaces an older one, also propose changing the old one's status to `Superseded by <number>`.
