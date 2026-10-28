# Writing a useful ADR

An ADR is read months later by someone who was not in the room. Write for them.

## Good ADRs

- **State the forces.** "We must support 10x order volume by Q3 and the team knows SQL well" explains a choice; "We need a database" does not.
- **Show the options you rejected,** with real reasons. This stops the same debate restarting.
- **Admit the downsides** of the chosen option. A decision with no costs listed is not trusted.
- **Keep it short.** One to two pages. Link to longer analysis instead of pasting it.
- **Record the date and status.** Decisions expire; status makes that visible.

## Common mistakes

| Mistake | Fix |
|---|---|
| Context that already argues for the answer | Describe the problem first, as if the decision were still open |
| "We chose X because it is best" | Name the criteria that made it best here |
| Several decisions in one record | Split them; each can then be superseded on its own |
| Editing an accepted ADR to change the decision | Write a new ADR and mark the old one "Superseded by" |
| Vague consequences ("more flexible") | Say what concretely gets easier or harder, and for whom |

## Status lifecycle

`Proposed` → `Accepted` → (later) `Superseded by <n>` or `Deprecated`. Never delete an ADR; history is the point.
