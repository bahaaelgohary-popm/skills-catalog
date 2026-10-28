---
name: changelog-from-commits
description: Write a user-facing changelog from git commits in the current repository. Use when preparing release notes, a CHANGELOG.md entry or a "what's new" post for a version or a range of commits.
---

# Changelog from commits

Produce a changelog that a user of the product can read, from the commits in the current git repository.

## 1. Pick the range

Use `$ARGUMENTS` if given (for example `v1.2.0..HEAD` or `v1.3.0`). Otherwise:

1. Find the latest tag: `git describe --tags --abbrev=0`.
2. Use `<latest-tag>..HEAD`. If there are no tags, use the last 50 commits and say so.

Tell the user which range you used.

## 2. Collect the commits

```bash
git log <range> --no-merges --pretty=format:"%h%x09%s%x09%b%x1e"
```

If the repo uses squash merges or PR titles, also read merge commit subjects (`--merges`) because they often carry the best summary. When a commit references an issue or PR number, keep it for linking.

## 3. Classify

Put each commit into one bucket. Use Conventional Commit prefixes when present (`feat`, `fix`, `perf`, `docs`, `refactor`, `chore`, `BREAKING CHANGE`), otherwise infer from the message and the changed files (`git show --stat <sha>`).

| Bucket | Goes in changelog? |
|---|---|
| Breaking changes | Yes, always first |
| New | Yes |
| Improved (perf, UX) | Yes |
| Fixed | Yes |
| Security | Yes |
| Deprecated / Removed | Yes |
| Internal (refactor, tests, CI, chore, deps without user impact) | No — count only |

When unsure whether a change is user-visible, check the diff rather than guessing.

## 4. Rewrite for users

For each kept item:
- Describe the effect, not the implementation: "Exports now include time zones", not "Refactor exportService to pass tz".
- Start with a verb in past or present tense, and keep one tense throughout.
- One line each; merge commits that together make one change.
- Drop author names, ticket jargon and internal code names.
- For breaking changes, add a one-line "What to do" migration hint.
- Keep the PR or issue reference in parentheses when available.

## 5. Output

```markdown
## <version or "Unreleased"> — <YYYY-MM-DD>

### ⚠ Breaking changes
- ... What to do: ...

### New
### Improved
### Fixed
### Security
### Deprecated / Removed

<n> internal changes not listed.
```

Omit empty sections. If the user asks to write it to `CHANGELOG.md`, insert the new entry at the top below any title, and never rewrite older entries.
