// Wrap a skill folder as a plugin in this catalog, or update one that is already published.
// Used by the publish-skill skill. Shares file generation and checks with the web Publish page (site/publish-core.mjs).
// New:    node scripts/new-plugin.mjs --from <dir> --owner <owner> --jobs <ids> --works-with <ids>
//           [--name <name>] [--tags a,b] [--use-it-when "..."] [--description "..."] [--pr]
// Update: node scripts/new-plugin.mjs --from <dir> --update [--version x.y.z] [--name <name>] [--description "..."]
// --jobs and --works-with take comma-separated ids from JOBS and WORKS_WITH in site/publish-core.mjs.
// --pr also branches from origin/main, runs the CI checks, commits, pushes and opens the pull request (needs git and gh).
// --update replaces the files of plugins/<name>/skills/<name>/ with --from, raises the patch version in plugin.json
// (or sets --version), keeps catalog.yaml and the published description (unless --description), and always opens
// a pull request on update-skill/<name>.
// New plugins always start as Experimental.
import { readdirSync, readFileSync, mkdirSync, writeFileSync, rmSync } from 'node:fs';
import { resolve, dirname, relative } from 'node:path';
import { execFileSync, execSync } from 'node:child_process';
import { ROOT, MARKETPLACE, readJson, readYaml, existsSync, join, ghApi, isNewerVersion, nextPatch } from './lib.mjs';
import { normalizeUpload, parseFrontmatter, runChecks, buildPluginFiles, addMarketplaceEntry, bytesToText, tagsFrom, openPullRequestAdding, openPullRequestChanging, NEW_TIER } from '../site/publish-core.mjs';

// "--key value" pairs; a key with no value (like --pr) is true.
const args = {};
for (let i = 2; i < process.argv.length; i++) {
  const key = process.argv[i].replace(/^--/, '');
  const next = process.argv[i + 1];
  args[key] = next === undefined || next.startsWith('--') ? true : (i++, next);
}
const update = !!args.update;
const pr = !!args.pr || update;
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
// An update keeps the published description unless --description is given.
let description = args.description || fm.description;
if (update && args.version !== undefined && typeof args.version !== 'string') die('--version needs a value, e.g. --version 1.2.0');

// With --pr or --update, start a branch from the latest main so the checks see the current catalog.
const branch = `${update ? 'update-skill' : 'add-skill'}/${name}`;
if (pr) {
  if (!has('gh')) die(`--${update ? 'update' : 'pr'} needs the GitHub CLI (gh), logged in with gh auth login`);
  if (run('git', ['status', '--porcelain'])) die('The checkout has uncommitted changes; commit or stash them first');
  // Without an explicit identity git falls back to the OS account name and email, which would be published in the commit.
  let email = '';
  try { email = run('git', ['config', 'user.email']); } catch {}
  if (!email) die('Set the name and email to publish under first, e.g. your GitHub noreply address:\n  git config --global user.name "<github-login>"\n  git config --global user.email "<id>+<github-login>@users.noreply.github.com"');
  const repo = run('gh', ['repo', 'view', '--json', 'nameWithOwner', '--jq', '.nameWithOwner']);
  const open = update
    ? await openPullRequestChanging({ api: ghApi, repo, name })
    : await openPullRequestAdding({ api: ghApi, repo, name });
  if (open) die(update
    ? `Pull request #${open.number} (${open.url}) already changes plugins/${name}; finish or close it first`
    : `"${name}" is already proposed in pull request #${open.number} (${open.url}); update that one or pick another name with --name`);
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
const pluginRoot = join(ROOT, 'plugins', name);
let plugin, version, previousVersion;

if (update) {
  const manifestPath = join(pluginRoot, '.claude-plugin', 'plugin.json');
  if (!existsSync(manifestPath)) die(`plugins/${name} is not in the catalog; publish it without --update`);
  const skillDir = join(pluginRoot, 'skills', name);
  if (!existsSync(skillDir)) die(`plugins/${name} has no skills/${name}/ folder; update it by hand`);
  const manifest = readJson(manifestPath);
  const meta = readYaml(join(pluginRoot, 'catalog.yaml'));
  previousVersion = manifest.version;
  if (!args.description) description = manifest.description;
  version = typeof args.version === 'string' ? args.version : nextPatch(previousVersion);
  if (!isNewerVersion(version, previousVersion)) die(`--version ${version} must be higher than the current ${previousVersion}`);
  plugin = { name, description, owner: meta.owner, tags: meta.tags || [], useItWhen: meta.use_it_when, jobs: meta.jobs || [], worksWith: meta.works_with || [], files: upload.files };
  const failed = runChecks({ ...plugin, existingNames: market.plugins.map(p => p.name).filter(n => n !== name) }).filter(c => !c.ok);
  if (failed.length) die(`Checks failed:\n${failed.map(c => `  - ${c.label}${c.detail ? `: ${c.detail}` : ''}`).join('\n')}`);

  // Replace the skill folder, keep catalog.yaml, and record the new version and description.
  rmSync(skillDir, { recursive: true, force: true });
  for (const f of upload.files) {
    mkdirSync(dirname(join(skillDir, f.path)), { recursive: true });
    writeFileSync(join(skillDir, f.path), f.bytes);
  }
  if (pr && !run('git', ['status', '--porcelain', '--', `plugins/${name}/skills`])) die(`The skill files in ${args.from} are the same as plugins/${name}; nothing to update`);
  writeFileSync(manifestPath, JSON.stringify({ ...manifest, version, description }, null, 2) + '\n');
  const entry = market.plugins.find(p => p.name === name);
  if (entry && entry.description !== description) {
    entry.description = description;
    writeFileSync(MARKETPLACE, JSON.stringify(market, null, 2) + '\n');
  }
  console.log(`✔ Updated plugins/${name} to ${version} (was ${previousVersion}); catalog.yaml unchanged`);
} else {
  plugin = {
    name,
    description,
    owner: args.owner,
    tags: tagsFrom(args.tags),
    useItWhen: args['use-it-when'] || description,
    jobs: tagsFrom(args.jobs),
    worksWith: tagsFrom(args['works-with']),
    files: upload.files,
  };
  const failed = runChecks({ ...plugin, existingNames: market.plugins.map(p => p.name) }).filter(c => !c.ok);
  if (failed.length) die(`Checks failed:\n${failed.map(c => `  - ${c.label}${c.detail ? `: ${c.detail}` : ''}`).join('\n')}`);
  if (existsSync(pluginRoot)) die(`plugins/${name} already exists; use --update to change it`);

  for (const f of buildPluginFiles(plugin)) {
    mkdirSync(dirname(join(ROOT, f.path)), { recursive: true });
    writeFileSync(join(ROOT, f.path), f.bytes);
  }
  writeFileSync(MARKETPLACE, addMarketplaceEntry(readFileSync(MARKETPLACE, 'utf8'), plugin));
  console.log(`✔ Added plugins/${name} (${NEW_TIER}) and its marketplace entry`);
}
if (!pr) process.exit(0);

// The same checks CI runs. Without the Claude Code CLI or gitleaks, CI still runs them on the PR.
if (has('claude')) {
  tryRun('claude plugin validate (marketplace)', 'claude', ['plugin', 'validate', '.', '--strict']);
  tryRun('claude plugin validate (plugin)', 'claude', ['plugin', 'validate', `plugins/${name}`, '--strict']);
} else console.log('- Skipped claude plugin validate (Claude Code CLI not found); CI runs it');
tryRun('Catalog checks', process.execPath, ['scripts/check-catalog.mjs']);
if (has('gitleaks')) tryRun('Secret scan', 'gitleaks', ['dir', `plugins/${name}`, '--no-banner', '--redact']);
else console.log('- Skipped gitleaks (not installed); CI runs it');

// -A also stages files the update removed.
run('git', ['add', '-A', '--', `plugins/${name}`, '.claude-plugin/marketplace.json']);
const changedFiles = run('git', ['diff', '--cached', '--name-status', '--', `plugins/${name}`]).split('\n').filter(Boolean);
const title = update ? `Update ${name} skill to ${version}` : `Add ${name} skill`;
run('git', ['commit', '--quiet', '-m', title]);
try { run('git', ['push', '--quiet', '-u', 'origin', branch]); }
catch (e) { die(`git push failed: ${(e.stderr || e.message).trim()}`); }
cleanup = () => console.error(`  The branch ${branch} is pushed; open the PR on GitHub or re-run gh pr create.`);

const body = (update ? [
  description,
  '',
  `- Version: ${previousVersion} → ${version}`,
  `- Files (A added, M modified, D removed):`,
  ...changedFiles.map(l => `  - \`${l.replace(/\t/, '` `')}\``),
  '',
  'Published with `node scripts/new-plugin.mjs --update`. Checks passed locally; CI runs them again. Updates to existing skills always go to a reviewer.',
] : [
  description,
  '',
  `- Owner: ${plugin.owner}`,
  `- Tier: ${NEW_TIER}`,
  `- Helps with: ${plugin.jobs.join(', ')} · Works with: ${plugin.worksWith.join(', ')}`,
  plugin.tags.length ? `- Tags: ${plugin.tags.join(', ')}` : null,
  '',
  'Published with `node scripts/new-plugin.mjs --pr`. Checks passed locally; CI runs them again.',
]).filter(l => l !== null).join('\n');
let url;
try { url = run('gh', ['pr', 'create', '--base', 'main', '--head', branch, '--title', title, '--body', body]); }
catch (e) { die(`gh pr create failed: ${(e.stderr || e.message).trim()}`); }
console.log(`✔ Opened ${url}`);
console.log(update
  ? '  Updates go to a reviewer. Installed copies pick up the new version after the merge and a marketplace update.'
  : '  If the checks pass and the skill bundles no code, it merges automatically; otherwise a reviewer merges it.');
