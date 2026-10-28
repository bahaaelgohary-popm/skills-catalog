// Generate catalog.json from marketplace.json + plugin.json + catalog.yaml + git history,
// plus files/<plugin>.json with each plugin's file tree and text contents for the viewer.
// Each plugin also gets its capabilities ("What it can do") and recent commit history.
// Usage: node scripts/build-catalog.mjs [outDir]   (default: _site)
import { mkdirSync, writeFileSync, readdirSync, readFileSync, statSync } from 'node:fs';
import { execFileSync } from 'node:child_process';
import { ROOT, MARKETPLACE, JOBS, WORKS_WITH, readJson, readYaml, pluginDir, join } from './lib.mjs';
import { capabilities } from './capabilities.mjs';

const outDir = join(ROOT, process.argv[2] || '_site');
const MAX_TEXT_BYTES = 200 * 1024;

// Every regular file under dir, as paths relative to dir with forward slashes. Symlinks are skipped.
function listFiles(dir, prefix = '') {
  return readdirSync(dir, { withFileTypes: true })
    .sort((a, b) => a.name.localeCompare(b.name))
    .flatMap(d => {
      const rel = prefix + d.name;
      if (d.isDirectory()) return listFiles(join(dir, d.name), rel + '/');
      return d.isFile() ? [rel] : [];
    });
}

// Text content for small non-binary files; null otherwise so the viewer can say why.
function fileEntry(dir, rel) {
  const full = join(dir, rel);
  const size = statSync(full).size;
  if (size > MAX_TEXT_BYTES) return { path: rel, size, content: null, reason: 'too large to preview' };
  const buf = readFileSync(full);
  if (buf.subarray(0, 8192).includes(0)) return { path: rel, size, content: null, reason: 'binary file' };
  return { path: rel, size, content: buf.toString('utf8') };
}

function git(...args) {
  try {
    return execFileSync('git', args, { cwd: ROOT, encoding: 'utf8', stdio: ['ignore', 'pipe', 'ignore'] }).trim();
  } catch { return ''; }
}

// Commits per plugin folder, newest first: { sha, date, subject }. One git log for all of plugins/,
// so the build doesn't start a git process per plugin.
function commitsByPlugin() {
  const byName = new Map();
  for (const record of git('log', '--format=%x00%h%x09%cI%x09%s', '--name-only', '--', 'plugins').split('\0').filter(Boolean)) {
    const [header, ...paths] = record.split('\n');
    const [sha, date, ...s] = header.split('\t');
    const commit = { sha, date, subject: s.join('\t') };
    for (const name of new Set(paths.filter(p => p.startsWith('plugins/')).map(p => p.split('/')[1]))) {
      if (!byName.has(name)) byName.set(name, []);
      byName.get(name).push(commit);
    }
  }
  return byName;
}

// owner/repo from CI, else from the origin remote.
function repoSlug() {
  if (process.env.GITHUB_REPOSITORY) return process.env.GITHUB_REPOSITORY;
  const m = git('remote', 'get-url', 'origin').match(/github\.com[:/](.+?)(?:\.git)?$/);
  return m ? m[1] : null;
}

const market = readJson(MARKETPLACE);
const repo = repoSlug();
const commits = commitsByPlugin();

mkdirSync(join(outDir, 'files'), { recursive: true });

const STALE_DAYS = 90;

// Skill: exactly one skill and nothing else. Agent: agents only. Plugin: a bundle of several components.
function itemType(files) {
  const skills = files.filter(f => /^skills\/[^/]+\/SKILL\.md$/.test(f.path)).length;
  const agents = files.filter(f => /^agents\/.+\.md$/.test(f.path)).length;
  const commands = files.filter(f => /^commands\/.+\.md$/.test(f.path)).length;
  if (skills === 1 && agents + commands === 0) return 'Skill';
  if (agents > 0 && skills + commands === 0) return 'Agent';
  return 'Plugin';
}

const plugins = market.plugins.map(entry => {
  const dir = pluginDir(entry);
  const manifest = readJson(join(dir, '.claude-plugin', 'plugin.json'));
  const meta = readYaml(join(dir, 'catalog.yaml'));
  const files = listFiles(dir).map(rel => fileEntry(dir, rel));
  writeFileSync(join(outDir, 'files', `${entry.name}.json`), JSON.stringify({ name: entry.name, files }) + '\n');
  const log = commits.get(entry.source.replace(/^\.\/plugins\//, '').split('/')[0]) || [];
  const lastUpdated = log[0]?.date || null;
  return {
    name: entry.name,
    description: manifest.description || entry.description || '',
    version: manifest.version || null,
    owner: meta.owner,
    tier: meta.tier,
    tags: meta.tags || [],
    useItWhen: meta.use_it_when || '',
    jobs: meta.jobs || [],
    worksWith: meta.works_with || [],
    type: itemType(files),
    deprecated: meta.deprecated === 'true',
    replacedBy: meta.replaced_by || null,
    stale: !!lastUpdated && (Date.now() - new Date(lastUpdated)) / 86400000 > STALE_DAYS,
    lastUpdated,
    addedAt: log.at(-1)?.date || null,
    path: entry.source.replace(/^\.\//, ''),
    fileCount: files.length,
    capabilities: capabilities(files, manifest, entry.name),
    history: log.slice(0, 10),
    install: `claude plugin install ${entry.name}@${market.name}`,
  };
});

const catalog = {
  marketplace: market.name,
  description: market.description || '',
  owner: market.owner?.name || '',
  repo,
  addMarketplace: `claude plugin marketplace add ${repo || '<owner>/' + market.name}`,
  generatedAt: new Date().toISOString(),
  staleDays: STALE_DAYS,
  jobs: JOBS,
  worksWith: WORKS_WITH,
  plugins,
};

writeFileSync(join(outDir, 'catalog.json'), JSON.stringify(catalog, null, 2) + '\n');
console.log(`✔ Wrote ${join(outDir, 'catalog.json')} and files/ for ${plugins.length} plugins`);
