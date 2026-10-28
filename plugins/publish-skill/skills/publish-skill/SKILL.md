---
name: publish-skill
description: Publish a local skill folder to the skills-catalog GitHub repository as a new plugin, through a branch and a pull request. Use when the user wants to add, share or publish a skill to the catalog.
disable-model-invocation: true
argument-hint: "[path-to-skill-folder]"
---

# Publish a skill to the catalog

Publish a skill folder as a new plugin in the `skills-catalog` repository. Every change goes through a pull request. **Never push to `main`, never merge, never force-push.**

## 1. Gather inputs

Ask for anything not already given, in a single question:

| Input | Rule |
|---|---|
| Skill folder | `$ARGUMENTS` if given. Must contain `SKILL.md`. |
| Owner | Free text, a person or handle. Required. |
| Tags | Optional, comma-separated. Suggest 2–4 from the SKILL.md content. |
| Use it when | One line. Suggest one from the SKILL.md description. |
| Jobs | One or more of: `plan` (Plan and spec work), `review` (Review code), `ship` (Ship a release), `meetings` (Run meetings and standups), `incidents` (Handle an incident), `maintain` (Keep a repo healthy), `share` (Share a skill). Suggest from the content. |
| Works with | One or more of: `chat` (Chat only), `files` (Local files), `git`, `github`, `terminal`. Suggest from what the skill reads or runs. |
| Catalog repo | Default `<gh login>/skills-catalog`, from `gh api user --jq .login`. |

There is no tier to choose: every new skill starts as `Experimental`, and a reviewer promotes it to `Recommended` in a later PR.

Read the `SKILL.md`. The plugin name is its frontmatter `name`, or the folder name if absent. It must be kebab-case (`a-z`, `0-9`, `-`). If not, propose a kebab-case name and confirm it.

Stop and tell the user if: `gh auth status` fails, `git` or `node` is missing, `git config user.email` is empty (git would otherwise publish the operating system account name and email; ask them to set their GitHub noreply address with `git config --global`), or the folder contains anything that looks like a secret (API keys, tokens, `.env` files, private keys).

## 2. Prepare a clean checkout

Work in a fresh clone in a temporary directory so the user's current project is never touched:

```bash
gh repo clone <repo> <tmp>/skills-catalog
cd <tmp>/skills-catalog
git switch -c add-skill/<name>
```

If `plugins/<name>` already exists on `main`, stop and ask whether this should be an update instead (an update must bump `version` in its `plugin.json`).

## 3. Add the plugin

From the clone root, run the repository's helper. It runs the same checks as the web publisher (naming, size limits, secrets), copies the folder to `plugins/<name>/skills/<name>/`, writes `plugin.json` and `catalog.yaml` (tier `Experimental`), and appends the marketplace entry:

```bash
node scripts/new-plugin.mjs --from "<skill folder>" --name <name> --owner "<owner>" --tags "<a,b,c>" --jobs "<ids>" --works-with "<ids>" --use-it-when "<one line>" --description "<one line>"
```

## 4. Validate

Both must pass before committing. Fix and re-run on failure; if you cannot fix it, stop and show the output.

```bash
claude plugin validate . --strict
node scripts/check-catalog.mjs
```

## 5. Commit, push, open the PR

```bash
git add plugins/<name> .claude-plugin/marketplace.json
git commit -m "Add <name> skill"
git push -u origin add-skill/<name>
gh pr create --base main --head add-skill/<name> --title "Add <name> skill" --body "<body>"
```

The PR body lists: what the skill does, owner, tier (Experimental), tags, and a checklist — `[x] claude plugin validate --strict passed`, `[x] catalog checks passed`, `[ ] reviewer tried the skill`.

## 6. Report

Give the user the PR URL and say that CI runs the checks, and that if they pass and the skill bundles no code it is merged automatically; otherwise a reviewer merges it. The catalog page updates a few minutes after the merge. Then delete the temporary clone.
