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

Browse everything, with tiers and files, on the catalog page.

**Tiers.** Every new skill starts as **Experimental**. A reviewer promotes it to **Recommended** in a later PR.

**What it can do.** Each skill is labelled from its files at build time: *Instructions only* (Markdown, no bundled code), *Pre-approved tools* (`allowed-tools` in a SKILL.md), or *Runs code* (scripts, hooks, MCP or language servers, `bin/`). The skill page lists exactly what was found.

**In review.** The catalog shows open publish pull requests and their check status, read live from GitHub's public API, so a new submission is visible seconds after it is published.

## Layout

```
.claude-plugin/marketplace.json     marketplace: one entry per plugin
plugins/<name>/
  .claude-plugin/plugin.json        plugin manifest (name must match the entry)
  skills/<name>/SKILL.md            the skill itself
  catalog.yaml                      catalog-only metadata: owner, tier, tags, jobs, works_with, use_it_when
scripts/                            check-catalog, build-catalog, new-plugin (plain Node, no deps)
site/index.html                     the marketplace: search, "I want to…", shelves, In review, Browse all with filters
site/skill.html                     one page per skill: install, what it can do, files, version history
site/publish.html                   the web publisher (editor and upload)
site/publish-core.mjs               publishing logic shared by the web publisher and new-plugin.mjs
.github/workflows/catalog.yml       checks + Pages deploy
.github/workflows/auto-merge.yml    merges new Experimental skills with no code once checks pass
```

Catalog metadata lives in `catalog.yaml`, not in `SKILL.md` frontmatter, so `claude plugin validate --strict` stays clean.

## How publishing works

1. **PR.** Three ways in, all ending in a pull request (never a push to `main`):
   - **From Claude Code:** with `publish-skill` installed, run `/publish-skill:publish-skill <path-to-skill-folder>`. It clones this repo to a temp folder, adds the plugin, validates, and opens the PR with `gh`.
   - **Web editor:** on the [Publish page](https://bahaaelgohary-popm.github.io/skills-catalog/publish.html), write `SKILL.md` in the browser.
   - **Web upload:** on the same page, drop loose files, a folder, or a `.zip` with the skill folder inside.

   The web publisher runs the same checks as the CLI in the browser and opens the PR through the GitHub API with a fine-grained token you paste (kept only in that tab; needs Contents and Pull requests read/write on this repo).
2. **Checks.** The Action runs on the PR: `claude plugin validate --strict`, catalog checks (every plugin has `catalog.yaml` with owner, tier, jobs and works_with from the allowed lists; names match the marketplace entry; no unlisted folders; new plugins start as Experimental), a gitleaks secret scan, and a test build of `catalog.json`.
3. **Merge.** After the checks pass, `.github/workflows/auto-merge.yml` squash-merges the PR without a person if it only adds one new Experimental plugin (its folder plus one `marketplace.json` entry) and bundles no code ("Instructions only" or "Pre-approved tools"). Anything else, such as skills with scripts, hooks or MCP servers, edits to existing skills, or changes outside `plugins/`, waits for a reviewer. Add the `hold` label to a PR to keep it open. The rules are in `scripts/auto-merge-check.mjs`; dry-run them with `node scripts/auto-merge-check.mjs --repo <owner/name> --pr <n>`.
4. **Catalog updates.** On `main`, the same Action regenerates `catalog.json` (including each plugin's last commit date) and redeploys the page. Users get the new plugin with `claude plugin marketplace update skills-catalog`.

From a terminal without Claude Code, one command does all of it: `node scripts/new-plugin.mjs --from <skill-folder> --owner "Your Name" --jobs plan --works-with chat --pr`. See [Publishing a skill manually](docs/publishing-manually.md).

## Run the checks locally

```bash
claude plugin validate . --strict
node scripts/check-catalog.mjs
node scripts/build-catalog.mjs _site
```
