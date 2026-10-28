---
name: code-review-checklist
description: Review a change against a practical checklist (correctness, tests, security, readability) and report findings by severity. Use when asked to review a diff, a branch, a pull request or a set of files.
allowed-tools: Read Grep Glob
---

# Code review checklist

Review the change named in `$ARGUMENTS` (a branch, a commit range, a PR diff the user pasted, or a list of files). If nothing is named, review the uncommitted changes in the current repository (`git diff` and `git diff --staged`; ask before running them).

Read the changed files in full, not just the diff hunks, so you understand the surrounding code. Use Grep and Glob to find callers and related tests. You may read freely; do not edit files or run other commands without asking.

## Checklist

Go through each area. Only report what you actually find; skip areas with nothing to say.

| Area | Look for |
|---|---|
| Correctness | Logic errors, off-by-one, wrong conditions, unhandled null/empty/error cases, race conditions, broken edge cases |
| Behaviour change | Anything a caller or user would notice that the change description does not mention |
| Tests | Is new behaviour covered? Do tests assert outcomes, not just that code runs? Any test that can never fail? |
| Security | Untrusted input reaching queries, shell commands, file paths or HTML; secrets in code or logs; missing auth checks |
| Data | Migrations that lose or lock data; changed formats without a migration path |
| Errors and logging | Swallowed errors, vague messages, logging of personal data |
| Readability | Names that mislead, functions doing several things, comments that no longer match the code |
| Consistency | Deviations from patterns used elsewhere in the same codebase |

## Output

Start with a one-line verdict: **Approve**, **Approve with nits**, or **Request changes**.

Then a table, most severe first:

| Severity | File:line | Finding | Suggested fix |
|---|---|---|---|

Severities: **Blocker** (wrong or unsafe), **Should fix** (likely to cause problems later), **Nit** (style, optional).

Rules:
- Every finding cites a file and line and explains the concrete failure, e.g. "returns 200 when the record is missing".
- Do not pad the review. Five real findings beat twenty generic ones.
- If something looks wrong but you are not sure, say so and say what would confirm it.
- End with anything you could not check (for example, code you could not find).
