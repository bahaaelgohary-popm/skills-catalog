# Skills Catalog

A small catalog of generic Claude Code skills, each packaged as a plugin in a plugin marketplace. This repository is the source of truth: a GitHub Action checks every change, generates `catalog.json`, and publishes a searchable page to GitHub Pages.

> A personal lab, not production.

**Catalog page:** https://bahaaelgohary-popm.github.io/skills-catalog/

## Use it

Add the marketplace once:

```bash
claude plugin marketplace add bahaaelgohary-popm/skills-catalog
```

Then install any skill:

```bash
claude plugin install prd-writer@skills-catalog
```

| Plugin | Lifecycle | What it does |
|---|---|---|
| `prd-writer` | GA | Turns a rough idea into a one-page PRD |
| `changelog-from-commits` | GA | Writes a user-facing changelog from git commits |
| `metrics-review` | Pilot | Reviews a metric and suggests guardrail metrics |
| `meeting-to-actions` | Pilot | Turns meeting notes into decisions, owners and dates |
| `publish-skill` | GA | Publishes a new skill to this catalog through a PR |

## Layout

```
.claude-plugin/marketplace.json     marketplace: one entry per plugin
plugins/<name>/
  .claude-plugin/plugin.json        plugin manifest (name must match the entry)
  skills/<name>/SKILL.md            the skill itself
  catalog.yaml                      catalog-only metadata: owner, lifecycle, tags, use_it_when
scripts/                            check-catalog, build-catalog, new-plugin (plain Node, no deps)
site/index.html                     the catalog page (plain HTML/CSS/JS)
.github/workflows/catalog.yml       checks + Pages deploy
```

Catalog metadata lives in `catalog.yaml`, not in `SKILL.md` frontmatter, so `claude plugin validate --strict` stays clean.

## How publishing works

1. **PR.** In any Claude Code session with `publish-skill` installed, run `/publish-skill:publish-skill <path-to-skill-folder>`. It asks for the owner and lifecycle (default Pilot), then clones this repo to a temp folder, adds `plugins/<name>`, writes `plugin.json` and `catalog.yaml`, adds the marketplace entry, validates, and opens a pull request with `gh`. It never pushes to `main`.
2. **Checks.** The Action runs on the PR: `claude plugin validate --strict`, catalog checks (every plugin has `catalog.yaml` with owner and lifecycle; names match the marketplace entry; no unlisted folders), a gitleaks secret scan, and a test build of `catalog.json`.
3. **Merge.** A reviewer reads the skill and merges.
4. **Catalog updates.** On `main`, the same Action regenerates `catalog.json` (including each plugin's last commit date) and redeploys the page. Users get the new plugin with `claude plugin marketplace update skills-catalog`.

## Run the checks locally

```bash
claude plugin validate . --strict
node scripts/check-catalog.mjs
node scripts/build-catalog.mjs _site
```
