// Wrap a skill folder as a plugin in this catalog. Used by the publish-skill skill.
// Shares file generation and checks with the web Publish page (site/publish-core.mjs).
// node scripts/new-plugin.mjs --from <dir> --owner <owner> --jobs <ids> --works-with <ids>
//   [--name <name>] [--tags a,b] [--use-it-when "..."] [--description "..."] [--pr]
// --jobs and --works-with take comma-separated ids from JOBS and WORKS_WITH in site/publish-core.mjs.
// --pr also branches from origin/main, runs the CI checks, commits, pushes and opens the pull request (needs git and gh).
// New plugins always start as Experimental.
import { readdirSync, readFileSync, mkdirSync, writeFileSync } from 'node:fs';
import { resolve, dirname, relative } from 'node:path';
import { execFileSync, execSync } from 'node:child_process';
import { ROOT, MARKETPLACE, readJson, existsSync, join } from './lib.mjs';
import { normalizeUpload, parseFrontmatter, runChecks, buildPluginFiles, addMarketplaceEntry, bytesToText, tagsFrom, NEW_TIER } from '../site/publish-core.mjs';

// "--key value" pairs; a key with no value (like --pr) is true.
const args = {};
for (let i = 2; i < process.argv.length; i++) {
  const key = process.argv[i].replace(/^--/, '');
  const next = process.argv[i + 1];
  args[key] = next === undefined || next.startsWith('--') ? true : (i++, next);
}
let cleanup = () => {};
const die = (msg) => { console.error(`✘ ${msg}`); cleanup(); process.exit(1); };
// On Windows the Claude Code CLI is a .cmd shim, which only runs through a shell; its arguments here are fixed or kebab-case.
const run = (cmd, cmdArgs) => {
  const opts = { cwd: ROOT, encoding: 'utf8', stdio: ['ignore', 'pipe', 'pipe'] };
  return (process.platform === 'win32' && cmd === 'claude'
    ? execSync([cmd, ...cmdArgs].join(' '), opts)
    : execFileSync(cmd, cmdArgs, opts)).trim();
};
const tryRun = (label, cmd, cmdArgs) => {
  try { run(cmd, cmdArgs); console.log(`✔ ${label}`); }
  catch (e) { die(`${label} failed:\n${(e.stdout || '') + (e.stderr || '') || e.message}`); }
};
const has = (cmd) => { try { run(cmd, ['--version']); return true; } catch { return false; } };

const from = typeof args.from === 'string' && resolve(args.from);
if (!from || !existsSync(from)) die('--from must be a skill folder');

const walk = (dir) => readdirSync(dir, { withFileTypes: true }).flatMap(d =>
  d.isDirectory() ? walk(join(dir, d.name)) : d.isFile() ? [join(dir, d.name)] : []);
const upload = normalizeUpload(walk(from).map(p => ({ path: relative(from, p), bytes: new Uint8Array(readFileSync(p)) })));
if (upload.error) die(upload.error);

const fm = parseFrontmatter(bytesToText(upload.files.find(f => f.path === 'SKILL.md').bytes)).fields;
const name = args.name || fm.name;
const description = args.description || fm.description;
const plugin = {
  name,
  description,
  owner: args.owner,
  tags: tagsFrom(args.tags),
  useItWhen: args['use-it-when'] || description,
  jobs: tagsFrom(args.jobs),
  worksWith: tagsFrom(args['works-with']),
  files: upload.files,
};

// With --pr, start a branch from the latest main so the checks see the current catalog.
const branch = `add-skill/${name}`;
if (args.pr) {
  if (!has('gh')) die('--pr needs the GitHub CLI (gh), logged in with gh auth login');
  if (run('git', ['status', '--porcelain'])) die('The checkout has uncommitted changes; commit or stash them first');
  // Without an explicit identity git falls back to the OS account name and email, which would be published in the commit.
  let email = '';
  try { email = run('git', ['config', 'user.email']); } catch {}
  if (!email) die('Set the name and email to publish under first, e.g. your GitHub noreply address:\n  git config --global user.name "<github-login>"\n  git config --global user.email "<id>+<github-login>@users.noreply.github.com"');
  let previous;
  try { previous = ['switch', '--quiet', run('git', ['symbolic-ref', '--quiet', '--short', 'HEAD'])]; }
  catch { previous = ['switch', '--quiet', '--detach', run('git', ['rev-parse', 'HEAD'])]; }
  run('git', ['fetch', '--quiet', 'origin', 'main']);
  try { run('git', ['switch', '--quiet', '-c', branch, 'origin/main']); }
  catch (e) { die(`Could not create branch ${branch}: ${(e.stderr || e.message).trim()}`); }
  cleanup = () => {
    try { run('git', ['reset', '--quiet', '--hard']); run('git', ['clean', '-fdq', '--', 'plugins']); run('git', previous); run('git', ['branch', '-D', branch]); }
    catch (e) { console.error(`  Could not undo the branch: ${(e.stderr || e.message).trim()}`); }
    console.error(`  Nothing was pushed; back where you started.`);
  };
}

const market = readJson(MARKETPLACE);
const failed = runChecks({ ...plugin, existingNames: market.plugins.map(p => p.name) }).filter(c => !c.ok);
if (failed.length) die(`Checks failed:\n${failed.map(c => `  - ${c.label}${c.detail ? `: ${c.detail}` : ''}`).join('\n')}`);
if (existsSync(join(ROOT, 'plugins', name))) die(`plugins/${name} already exists`);

for (const f of buildPluginFiles(plugin)) {
  mkdirSync(dirname(join(ROOT, f.path)), { recursive: true });
  writeFileSync(join(ROOT, f.path), f.bytes);
}
writeFileSync(MARKETPLACE, addMarketplaceEntry(readFileSync(MARKETPLACE, 'utf8'), plugin));
console.log(`✔ Added plugins/${name} (${NEW_TIER}) and its marketplace entry`);
if (!args.pr) process.exit(0);

// The same checks CI runs. Without the Claude Code CLI or gitleaks, CI still runs them on the PR.
if (has('claude')) {
  tryRun('claude plugin validate (marketplace)', 'claude', ['plugin', 'validate', '.', '--strict']);
  tryRun('claude plugin validate (plugin)', 'claude', ['plugin', 'validate', `plugins/${name}`, '--strict']);
} else console.log('- Skipped claude plugin validate (Claude Code CLI not found); CI runs it');
tryRun('Catalog checks', process.execPath, ['scripts/check-catalog.mjs']);
if (has('gitleaks')) tryRun('Secret scan', 'gitleaks', ['dir', `plugins/${name}`, '--no-banner', '--redact']);
else console.log('- Skipped gitleaks (not installed); CI runs it');

run('git', ['add', `plugins/${name}`, '.claude-plugin/marketplace.json']);
run('git', ['commit', '--quiet', '-m', `Add ${name} skill`]);
try { run('git', ['push', '--quiet', '-u', 'origin', branch]); }
catch (e) { die(`git push failed: ${(e.stderr || e.message).trim()}`); }
cleanup = () => console.error(`  The branch ${branch} is pushed; open the PR on GitHub or re-run gh pr create.`);

const body = [
  description,
  '',
  `- Owner: ${plugin.owner}`,
  `- Tier: ${NEW_TIER}`,
  `- Helps with: ${plugin.jobs.join(', ')} · Works with: ${plugin.worksWith.join(', ')}`,
  plugin.tags.length ? `- Tags: ${plugin.tags.join(', ')}` : null,
  '',
  'Published with `node scripts/new-plugin.mjs --pr`. Checks passed locally; CI runs them again.',
].filter(l => l !== null).join('\n');
let url;
try { url = run('gh', ['pr', 'create', '--base', 'main', '--head', branch, '--title', `Add ${name} skill`, '--body', body]); }
catch (e) { die(`gh pr create failed: ${(e.stderr || e.message).trim()}`); }
console.log(`✔ Opened ${url}`);
console.log('  If the checks pass and the skill bundles no code, it merges automatically; otherwise a reviewer merges it.');
