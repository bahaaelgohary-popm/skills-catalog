---
name: release-notes-checker
description: Check draft release notes before publishing, for missing breaking changes, unclear wording, internal jargon and inconsistent formatting. Use when someone shares a release notes or changelog draft and asks for a review.
---

# Release notes checker

Review the release notes draft in `$ARGUMENTS`, the pasted text or the referenced file. Do not rewrite the whole draft; report issues and suggest precise fixes.

## Checks

| # | Check | Flag when |
|---|---|---|
| 1 | Breaking changes | A removal, rename, default change or new requirement is not under a breaking-changes heading, or has no "what to do" line |
| 2 | User language | An item names internal classes, ticket IDs without links, code names or team names |
| 3 | Effect, not implementation | An item says what was changed in code instead of what the user can now do or no longer suffers |
| 4 | Specificity | Vague items such as "various fixes", "improvements" or "bug fixes" with no detail |
| 5 | Consistency | Mixed tenses, mixed bullet styles, inconsistent capitalization or version and date formats |
| 6 | Completeness | Missing version number, missing date, or empty sections left in |
| 7 | Accuracy risk | Claims about performance or security with no number or scope ("much faster", "fully secure") |

If the user provides a git range or a commit list, also flag user-visible commits that the draft does not mention.

## Output

1. **Verdict:** Ready / Ready with small fixes / Needs work.
2. **Issues table:** `| Line or item | Check # | Problem | Suggested fix |`, most severe first. Quote the original text briefly.
3. **Missing items:** only if a commit list was provided.

Keep suggestions in the draft's own voice. Never invent features, numbers or dates.
