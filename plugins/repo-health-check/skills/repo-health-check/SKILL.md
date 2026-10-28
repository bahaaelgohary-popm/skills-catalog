---
name: repo-health-check
description: Run a quick health check on a git repository (missing basics, large files, stale branches, open TODOs, uncommitted work) and turn the results into a short, prioritised to-do list. Use when someone asks how healthy a repo is, or before handing a repo over.
---

# Repo health check

Check the health of the git repository in the current directory, or the path in `$ARGUMENTS`.

## 1. Run the bundled script

It is read-only: it only inspects files and runs read-only git commands. Ask before running it, then run:

```bash
bash "${CLAUDE_SKILL_DIR}/scripts/health-check.sh" <repo-path>
```

If `bash` is not available, do the same checks by hand with the git commands listed in the script.

## 2. Interpret the output

The script prints sections. For each, decide whether it matters for this repo:

| Section | Usually matters when |
|---|---|
| Basics (README, LICENSE, .gitignore, CI config) | Always for shared repos; LICENSE matters for public ones |
| Large files | Files over 5 MB tracked in git slow down every clone |
| Stale branches | Merged or untouched for 90+ days; safe candidates for deletion after a check |
| TODO / FIXME count | A growing number signals deferred work; list the oldest few |
| Uncommitted changes | Work that could be lost |

## 3. Report

```markdown
## Repo health: <repo name>
Overall: Healthy | Needs attention | At risk

### Fix first
1. <issue> — <why it matters> — <exact next step>

### Worth doing
- ...

### Fine as is
- ...
```

Rules:
- Never delete branches, files or history yourself. Suggest the commands and let the user run them.
- Keep "Fix first" to three items at most.
