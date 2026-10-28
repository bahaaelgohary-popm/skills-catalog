// Generate catalog.json from marketplace.json + plugin.json + catalog.yaml + git history.
// Usage: node scripts/build-catalog.mjs [outDir]   (default: _site)
import { mkdirSync, writeFileSync } from 'node:fs';
import { execFileSync } from 'node:child_process';
import { ROOT, MARKETPLACE, readJson, readYaml, pluginDir, join } from './lib.mjs';

const outDir = join(ROOT, process.argv[2] || '_site');

function git(...args) {
  try {
    return execFileSync('git', args, { cwd: ROOT, encoding: 'utf8', stdio: ['ignore', 'pipe', 'ignore'] }).trim();
  } catch { return ''; }
}

// owner/repo from CI, else from the origin remote.
function repoSlug() {
  if (process.env.GITHUB_REPOSITORY) return process.env.GITHUB_REPOSITORY;
  const m = git('remote', 'get-url', 'origin').match(/github\.com[:/](.+?)(?:\.git)?$/);
  return m ? m[1] : null;
}

const market = readJson(MARKETPLACE);
const repo = repoSlug();

const plugins = market.plugins.map(entry => {
  const dir = pluginDir(entry);
  const manifest = readJson(join(dir, '.claude-plugin', 'plugin.json'));
  const meta = readYaml(join(dir, 'catalog.yaml'));
  return {
    name: entry.name,
    description: manifest.description || entry.description || '',
    version: manifest.version || null,
    owner: meta.owner,
    lifecycle: meta.lifecycle,
    tags: meta.tags || [],
    useItWhen: meta.use_it_when || '',
    lastUpdated: git('log', '-1', '--format=%cI', '--', entry.source) || null,
    path: entry.source.replace(/^\.\//, ''),
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
  plugins,
};

mkdirSync(outDir, { recursive: true });
writeFileSync(join(outDir, 'catalog.json'), JSON.stringify(catalog, null, 2) + '\n');
console.log(`✔ Wrote ${join(outDir, 'catalog.json')} (${plugins.length} plugins)`);
