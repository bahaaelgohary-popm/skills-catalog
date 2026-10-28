# Publishing a skill manually

How to write a skill in Claude Code, test it, and publish it to this catalog from your terminal. The examples use a skill called `my-skill`; replace it with your own name.

**Don't want to clone the repo?** Two quicker routes do the same thing:
- Upload your skill folder (or a `.zip` of it) on the [Publish page](https://bahaaelgohary-popm.github.io/skills-catalog/publish.html).
- In Claude Code, with `publish-skill` installed, run `/publish-skill:publish-skill ~/.claude/skills/my-skill`.

**You need:** Claude Code, git, the GitHub CLI (`gh auth login` done) and Node.js 18+. gitleaks is optional (CI runs it anyway).

## 1. Write the skill

Personal skills live in `~/.claude/skills/<name>/SKILL.md` (Windows: `%USERPROFILE%\.claude\skills\<name>\SKILL.md`). Create the file in any editor, or ask Claude Code to write it for you:

```markdown
---
name: my-skill
description: One sentence on what it does. Use when <the situations or phrases that should trigger it>.
---

# My skill

1. Read the input from `$ARGUMENTS` or the user's last message.
2. <The steps Claude should follow.>
3. <The exact output format.>
```

- The first line must be exactly `---`. `name` is kebab-case (`a-z`, `0-9`, `-`) and matches the folder name.
- `description` says what it does, then when to use it; Claude reads it to decide when to load the skill.
- Write concrete steps and an output format, not general advice. Stay under ~500 lines.
- No secrets, internal hostnames or company-specific details. On Windows, check Notepad didn't save `SKILL.md.txt`.

## 2. Test it

Run `claude`, then `/my-skill <some input>`. Edit `SKILL.md` and repeat until the output is right.

## 3. Publish with one command

```bash
gh repo clone bahaaelgohary-popm/skills-catalog
cd skills-catalog
node scripts/new-plugin.mjs --from ~/.claude/skills/my-skill --owner "Your Name" --jobs plan --works-with chat --pr
```

| Option | Required | Value |
|---|---|---|
| `--from` | yes | Your skill folder |
| `--owner` | yes | Your name |
| `--jobs` | yes | What it helps with, comma-separated: `plan`, `review`, `ship`, `meetings`, `incidents`, `maintain`, `share` |
| `--works-with` | yes | What it needs, comma-separated: `chat`, `files`, `git`, `github`, `terminal` |
| `--use-it-when` | no | One line on when to reach for it (defaults to the description) |
| `--tags` | no | Comma-separated tags |
| `--name`, `--description` | no | Override the values in `SKILL.md` |

With `--pr`, the script:
1. Creates the branch `add-skill/my-skill` from the latest `main`.
2. Runs the same checks as the Publish page (name, size limits, secrets) and copies your folder into `plugins/my-skill/`. It also writes `plugin.json` and `catalog.yaml` with the tier set to Experimental, and adds the `marketplace.json` entry.
3. Runs the checks CI runs: `claude plugin validate --strict`, the catalog checks and gitleaks. A missing tool is skipped, since CI runs it anyway.
4. Commits, pushes and opens the pull request.

If any check fails, it undoes the branch and nothing is pushed. Fix the problem and run it again. Leave out `--pr` to only write the files, so you can look at them first.

## 4. What happens next

CI runs the checks on the PR. If they pass and the skill bundles no code ("Instructions only", or pre-approves only the read-only `Read`, `Grep` and `Glob`), it is **merged automatically** about a minute later. Skills with scripts, hooks or MCP servers, and skills that pre-approve other tools such as `Bash` or `Write` (they run without asking), wait for a reviewer. The [catalog page](https://bahaaelgohary-popm.github.io/skills-catalog/) updates a minute or two after the merge. Then install it:

```bash
claude plugin marketplace update skills-catalog
claude plugin install my-skill@skills-catalog
```

Run it as `/my-skill:my-skill`; plugin skills always carry the `plugin:skill` prefix. To try the plugin before publishing, run the script without `--pr`, then run `claude --plugin-dir ./plugins/my-skill`.

## Updating a published skill

Branch from `main`, edit the files under `plugins/my-skill/`, and **bump `version` in `.claude-plugin/plugin.json`** (for example `0.1.0` → `0.2.0`). Installed copies stay on their version until it changes, so CI fails an edit that doesn't raise it (changes to `catalog.yaml` alone don't need a bump). Then commit and open a PR with `gh pr create`. Edits to existing skills always go to a reviewer. To promote a skill, change `tier: Experimental` to `Recommended` in its `catalog.yaml`.

## What the script writes

To do it entirely by hand, create these files and add the entry yourself:

```
plugins/my-skill/
├── .claude-plugin/plugin.json    {"name": "my-skill", "version": "0.1.0", "description": "...", "author": {"name": "Your Name"}}
├── catalog.yaml                  see below
└── skills/my-skill/SKILL.md      your skill folder, copied as is
```

```yaml
owner: Your Name
tier: Experimental
tags: [tag1, tag2]
jobs: [plan]
works_with: [chat]
use_it_when: One line on when to reach for it.
```

Then add `{"name": "my-skill", "source": "./plugins/my-skill", "description": "..."}` to `plugins` in `.claude-plugin/marketplace.json`, in alphabetical order (if your name sorts last, put it just before the last entry, so you don't edit an existing line and clash with other open PRs). The folder name, the `plugin.json` name and the marketplace entry name must be identical. Keep catalog fields out of `SKILL.md` frontmatter. Optional `catalog.yaml` fields: `deprecated: true` and `replaced_by: <name>`.

## When a check fails

| Error | Fix |
|---|---|
| `plugin.json name "x" does not match marketplace entry` | Make the folder, `plugin.json` name and marketplace entry name identical |
| `missing catalog.yaml` or `needs owner` | Add `catalog.yaml` with `owner`, `tier`, `jobs`, `works_with`, `use_it_when` |
| Unknown job / `jobs` or `works_with` must be a non-empty list | Use the ids in the options table above |
| `new plugins start as Experimental` | Set `tier: Experimental`; promote in a later PR |
| `plugins/x is not listed in marketplace.json` | Add the marketplace entry |
| `Unknown field` warning fails `--strict` | Remove catalog fields from `SKILL.md` frontmatter or `plugin.json` |
| `Invalid JSON syntax` | Usually a missing or extra comma in `marketplace.json` |
| `The checkout has uncommitted changes` | Commit or stash them, or use a fresh clone |
| `Could not create branch add-skill/x` | A branch with that name exists; delete it or pass `--name` |
| `"x" is already proposed in pull request #n` | Someone already opened a PR for that name; update that PR, or pick another name with `--name` |
| Gitleaks finding | Remove the secret, rotate it, and run again |
