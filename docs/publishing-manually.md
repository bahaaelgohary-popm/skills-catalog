# Publishing a skill manually

How to create a skill in the Claude Code CLI, test it, and publish it to this catalog by hand through a pull request. The `publish-skill` plugin automates Part B; this guide is the manual equivalent.

The examples use a skill called `my-skill`. Replace it with your own name everywhere.

**You need:** Claude Code, git, the GitHub CLI (`gh auth login` done), Node.js 18+, and optionally gitleaks.

Commands are shown for bash (macOS, Linux, Git Bash). PowerShell equivalents are noted where they differ.

## Part A: Create and test the skill

### 1. Create the skill folder

Personal skills live in `~/.claude/skills/<name>/`.

```bash
mkdir -p ~/.claude/skills/my-skill
```

PowerShell: `mkdir "$HOME\.claude\skills\my-skill"`

### 2. Write `SKILL.md`

Create `~/.claude/skills/my-skill/SKILL.md` in any editor (`code`, `nano`, `notepad`), or ask Claude Code to write it for you. A minimal skill:

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

Rules:

- The first line must be exactly `---`, with nothing before it.
- `name` is kebab-case (`a-z`, `0-9`, `-`) and matches the folder name.
- `description` leads with what the skill does, then when to use it. Claude uses it to decide when to load the skill.
- Keep frontmatter to `name` and `description`. Claude Code options such as `disable-model-invocation` or `argument-hint` are fine. **Do not put catalog metadata (owner, tier, tags) here**; it goes in `catalog.yaml`.
- Write concrete instructions and an output format, not general advice. Stay under ~500 lines.
- Never include secrets, internal hostnames or company-specific details.

On Windows, check that Notepad did not save it as `SKILL.md.txt`.

### 3. Test it

```bash
claude
```

In the session, run `/my-skill <some input>`. Edit `SKILL.md` and repeat until the output is right.

## Part B: Publish to the catalog

### 4. Clone the catalog and create a branch

Never work on `main`.

```bash
gh repo clone bahaaelgohary-popm/skills-catalog
cd skills-catalog
git switch -c add-skill/my-skill
```

### 5. Add the plugin files

Each skill is its own plugin:

```
plugins/my-skill/
├── .claude-plugin/plugin.json
├── catalog.yaml
└── skills/my-skill/SKILL.md
```

**Shortcut:** the helper script does steps 5a–5d in one command:

```bash
node scripts/new-plugin.mjs --from ~/.claude/skills/my-skill --name my-skill --owner "Your Name" --tags "tag1,tag2" --use-it-when "One line on when to reach for it."
```

Or by hand:

**5a. Copy the skill**

```bash
mkdir -p plugins/my-skill/.claude-plugin plugins/my-skill/skills
cp -r ~/.claude/skills/my-skill plugins/my-skill/skills/my-skill
```

PowerShell: `mkdir plugins\my-skill\.claude-plugin` then `Copy-Item -Recurse "$HOME\.claude\skills\my-skill" plugins\my-skill\skills\my-skill`

**5b. `plugins/my-skill/.claude-plugin/plugin.json`**

```json
{
  "name": "my-skill",
  "version": "0.1.0",
  "description": "One line on what it does",
  "author": { "name": "Your Name" },
  "license": "MIT",
  "keywords": ["tag1", "tag2"]
}
```

**5c. `plugins/my-skill/catalog.yaml`**

```yaml
owner: Your Name
tier: Experimental
tags: [tag1, tag2]
use_it_when: One line on when to reach for it.
```

New skills must start as `Experimental` (CI enforces this). A reviewer promotes a skill to `Recommended` later with a one-line PR.

**5d. Add an entry at the end of `plugins` in `.claude-plugin/marketplace.json`**

```json
{
  "name": "my-skill",
  "source": "./plugins/my-skill",
  "description": "One line on what it does"
}
```

The folder name, `plugin.json` `name` and marketplace entry `name` must be identical.

### 6. Run the checks CI will run

```bash
claude plugin validate . --strict
node scripts/check-catalog.mjs
gitleaks dir . --redact
```

### 7. Test it as a plugin

```bash
claude --plugin-dir ./plugins/my-skill
```

Run `/my-skill:my-skill`. Plugin skills always carry the `plugin:skill` prefix.

### 8. Commit, push and open a pull request

```bash
git add plugins/my-skill .claude-plugin/marketplace.json
git commit -m "Add my-skill skill"
git push -u origin add-skill/my-skill
gh pr create --base main --title "Add my-skill skill" --body "Owner: Your Name. Tier: Experimental. Validated locally."
```

### 9. Wait for checks, review, merge

```bash
gh pr checks --watch
gh pr merge --squash --delete-branch
```

The checks are: plugin validation, catalog checks, gitleaks, and a test build of `catalog.json`. After the merge, the Action on `main` regenerates the catalog and redeploys the [catalog page](https://bahaaelgohary-popm.github.io/skills-catalog/) within a minute or two.

### 10. Install it

```bash
claude plugin marketplace update skills-catalog
claude plugin install my-skill@skills-catalog
```

## Updating a published skill

Same flow: branch, edit, PR. **Always bump `version` in `plugin.json`** (for example `0.1.0` → `0.2.0`); installed copies stay on their version until it changes. To promote a skill, change `tier: Experimental` to `Recommended` in `catalog.yaml`.

## When a check fails

| Error | Fix |
|---|---|
| `plugin.json name "x" does not match marketplace entry` | Make the folder, `plugin.json` name and marketplace entry name identical |
| `missing catalog.yaml` or `needs owner` | Add `catalog.yaml` with `owner`, `tier`, `use_it_when` |
| `tier must be one of Experimental, Recommended` | Values are case-sensitive |
| `new plugins start as Experimental` | Set `tier: Experimental`; promote in a later PR |
| `plugins/x is not listed in marketplace.json` | Add the marketplace entry (step 5d) |
| `Unknown field` warning fails `--strict` | Remove catalog fields from `SKILL.md` frontmatter or `plugin.json` |
| `Invalid JSON syntax` | Usually a missing or extra comma in `marketplace.json` |
| Gitleaks finding | Remove the secret and rewrite the branch history before pushing again; rotate the secret |
