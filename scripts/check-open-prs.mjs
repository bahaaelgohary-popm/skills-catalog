// Fails a pull request that adds a plugin an older open pull request already proposes,
// whatever route or branch name either one used. The older pull request keeps the name.
// In Actions (pull_request): REPO=owner/name PR_NUMBER=<n> node scripts/check-open-prs.mjs
import { readdirSync } from 'node:fs';
import { execFileSync } from 'node:child_process';
import { ROOT, MARKETPLACE, readJson, join, ghApi } from './lib.mjs';
import { openPullRequestAdding } from '../site/publish-core.mjs';

const repo = process.env.REPO;
const number = Number(process.env.PR_NUMBER);
if (!repo || !number) throw new Error('Needs REPO and PR_NUMBER');

// Plugins this pull request adds: listed here but not on the base branch.
const base = process.env.BASE_REF || 'main';
const onBase = new Set(JSON.parse(execFileSync('git', ['show', `origin/${base}:.claude-plugin/marketplace.json`], { cwd: ROOT, encoding: 'utf8' })).plugins.map(p => p.name));
const added = readJson(MARKETPLACE).plugins.map(p => p.name).filter(n => !onBase.has(n));
const folders = new Set(readdirSync(join(ROOT, 'plugins')));

let failed = false;
for (const name of added.filter(n => folders.has(n))) {
  const open = await openPullRequestAdding({ api: ghApi, repo, name, before: number });
  if (open) { console.error(`✘ "${name}" is already proposed in pull request #${open.number} (${open.url}). Update that pull request or pick another name.`); failed = true; }
  else console.log(`✔ No older open pull request adds "${name}"`);
}
if (!added.length) console.log('✔ Adds no new plugin');
process.exit(failed ? 1 : 0);
