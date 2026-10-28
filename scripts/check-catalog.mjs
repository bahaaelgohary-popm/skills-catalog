// Catalog checks that `claude plugin validate` does not cover:
// every plugin has catalog.yaml with owner + tier, names match, nothing is orphaned,
// and plugins that are new compared to the base branch start as Experimental.
// Base branch: $CATALOG_BASE (default origin/main); the "new plugin" rule is skipped if it can't be read.
import { readdirSync, statSync } from 'node:fs';
import { execFileSync } from 'node:child_process';
import { ROOT, MARKETPLACE, TIERS, NEW_TIER, NAME_RE, readJson, readYaml, pluginDir, existsSync, join } from './lib.mjs';

const errors = [];
const fail = (msg) => errors.push(msg);

function baseNames() {
  try {
    const text = execFileSync('git', ['show', `${process.env.CATALOG_BASE || 'origin/main'}:.claude-plugin/marketplace.json`],
      { cwd: ROOT, encoding: 'utf8', stdio: ['ignore', 'pipe', 'ignore'] });
    return new Set(JSON.parse(text).plugins.map(p => p.name));
  } catch { return null; }
}
const existing = baseNames();

const market = readJson(MARKETPLACE);
if (market.name !== 'skills-catalog') fail(`marketplace name must be "skills-catalog", got "${market.name}"`);
if (!market.owner?.name) fail('marketplace owner.name is required');
if (!Array.isArray(market.plugins) || market.plugins.length === 0) fail('marketplace has no plugins');

const listed = new Set();
for (const [i, entry] of (market.plugins || []).entries()) {
  const at = `plugins[${i}] "${entry.name}"`;
  if (!NAME_RE.test(entry.name || '')) fail(`${at}: name must be kebab-case`);
  if (listed.has(entry.name)) fail(`${at}: duplicate name`);
  listed.add(entry.name);

  if (typeof entry.source !== 'string' || !entry.source.startsWith('./plugins/')) {
    fail(`${at}: source must be a relative path under ./plugins/`);
    continue;
  }
  const dir = pluginDir(entry);
  if (!existsSync(dir)) { fail(`${at}: source ${entry.source} does not exist`); continue; }

  const manifestPath = join(dir, '.claude-plugin', 'plugin.json');
  if (!existsSync(manifestPath)) { fail(`${at}: missing .claude-plugin/plugin.json`); continue; }
  const manifest = readJson(manifestPath);
  if (manifest.name !== entry.name) fail(`${at}: plugin.json name "${manifest.name}" does not match marketplace entry`);
  if (!manifest.version) fail(`${at}: plugin.json needs a version`);
  if (!manifest.description) fail(`${at}: plugin.json needs a description`);

  const skillsDir = join(dir, 'skills');
  const skills = existsSync(skillsDir) ? readdirSync(skillsDir).filter(d => existsSync(join(skillsDir, d, 'SKILL.md'))) : [];
  if (skills.length === 0) fail(`${at}: no skills/<name>/SKILL.md found`);

  const catalogPath = join(dir, 'catalog.yaml');
  if (!existsSync(catalogPath)) { fail(`${at}: missing catalog.yaml`); continue; }
  let meta;
  try { meta = readYaml(catalogPath); } catch (e) { fail(`${at}: catalog.yaml ${e.message}`); continue; }
  if (!meta.owner) fail(`${at}: catalog.yaml needs owner`);
  if (!TIERS.includes(meta.tier)) fail(`${at}: catalog.yaml tier must be one of ${TIERS.join(', ')}, got "${meta.tier}"`);
  else if (existing && !existing.has(entry.name) && meta.tier !== NEW_TIER) fail(`${at}: new plugins start as ${NEW_TIER}; promote in a later PR`);
  if (!meta.use_it_when) fail(`${at}: catalog.yaml needs use_it_when`);
  if (meta.tags !== undefined && !Array.isArray(meta.tags)) fail(`${at}: catalog.yaml tags must be a list`);
}

// Every folder in plugins/ must be listed, so nothing ships unreviewed or gets forgotten.
const pluginsRoot = join(ROOT, 'plugins');
for (const d of readdirSync(pluginsRoot)) {
  if (statSync(join(pluginsRoot, d)).isDirectory() && !listed.has(d)) fail(`plugins/${d} is not listed in marketplace.json`);
}

if (errors.length) {
  console.error(`✘ Catalog checks failed (${errors.length}):`);
  for (const e of errors) console.error(`  - ${e}`);
  process.exit(1);
}
console.log(`✔ Catalog checks passed (${listed.size} plugins)`);
