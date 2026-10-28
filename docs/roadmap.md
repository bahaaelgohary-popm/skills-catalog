# Roadmap

> [!NOTE]
> Drafted with AI assistance (Claude Code). The solution is reviewed; this document's wording is still being reviewed.

What this lab would need to become a product people rely on. Each item says what changes for users and how we'd know it worked.

## 1. Analytics and repeat use

Today the catalog knows what was published, not what was used. Install and usage events would come from a small, opt-in Claude Code hook in a "catalog companion" plugin (skill name, version, event, anonymous install id; no prompts or file contents), plus page events from the site.

| Question | What we'd measure | How |
|---|---|---|
| Do installs turn into use? | **Install-to-active-use rate:** installs that run at least twice in the following 14 days | Install event, then skill-invoked events from the companion hook |
| Can people find things? | **Searches with zero results**, and the terms they used | Site search events; the top zero-result terms become the "skills to build" list |
| How fast do people get value? | **Time to first install** from a first visit | First page view to first install event, same browser |
| Do people come back? | **Return visits** within 30 days, and visits that end in an install | Site visits by an anonymous id kept in the browser |
| Is the catalog getting stale? | **Skills that never leave Experimental** after 60 days, with their install and use counts | Catalog data plus use events; feeds the reviewers' promote, improve or retire list |
| Do people run old versions? | **Update alerts:** share of active installs behind the latest version, and how fast they update after an alert | Version in each use event; the companion plugin tells users when an update exists |
| Does the catalog bring people back? | **"New for you"** clicks and installs: new skills that match the jobs and tools of skills someone already uses | Use events grouped by job and tool; shown on the home page and in the update alert |

Privacy rules: opt-in, no content, anonymous ids, a public page saying what is collected, and counts shown only for groups larger than a minimum size.

## 2. Publishing for anyone

Today only the owner's account can publish. To open it up:

- The web page and both scripts **fork the repository** for the author and open the pull request from the fork, so nobody needs write access.
- **Checks run without a manual approval** on first-time contributors' pull requests. That is safe because pull requests from forks run with a read-only token and no secrets, and auto-merge runs separately from `main` without running the pull request's code.
- **Owner taken from the PR author** (their GitHub login), not typed in, so nobody can publish under someone else's name.
- **Scan instruction-only skills for risky commands** (downloads piped into a shell, recursive deletes, encoded blobs, unknown URLs) and send those to a reviewer instead of auto-merge.
- **Near-duplicate detection:** warn when a new skill's text or description is very close to an existing one, and suggest updating it instead.
- **Close abandoned pull requests** after 30 days without activity, with a comment explaining how to reopen.

## 3. Other agents from the same registry

The registry (`marketplace.json`, `plugin.json`, `catalog.yaml`, and `SKILL.md`) is not tied to one tool. Each skill page would get an install path per agent, such as another coding assistant's rules or commands folder, generated from the same files. Agent-specific fields go in `catalog.yaml`; the build checks each target's format. Success: the same skill installs in two agents without being published twice.

## 4. A catalog front end on top of an existing registry

Large organisations already have a registry (a Git repository, an artifact store or a package index). Instead of migrating it:

- Write a small **adapter** that reads that registry and produces the same `catalog.json` this site already uses.
- Keep the existing registry as the source of truth and its own review process; the catalog only adds discovery (search, "I want to…", shelves), trust labels ("What it can do") and the install steps.
- Start read-only. Add publishing later, through the same pull request flow, if the registry supports it.

Success: the front end runs on a copy of a real registry with no change to how teams publish today.
