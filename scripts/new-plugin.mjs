// Wrap a skill folder as a plugin in this catalog. Used by the publish-skill skill.
// Shares file generation and checks with the web Publish page (site/publish-core.mjs).
// node scripts/new-plugin.mjs --from <dir> --owner <owner> --jobs <ids> --works-with <ids>
//   [--name <name>] [--tags a,b] [--use-it-when "..."] [--description "..."]
// --jobs and --works-with take comma-separated ids from JOBS and WORKS_WITH in site/publish-core.mjs.
// New plugins always start as Experimental.
import { readdirSync, readFileSync, mkdirSync, writeFileSync } from 'node:fs';
import { resolve, dirname, relative } from 'node:path';
import { ROOT, MARKETPLACE, readJson, existsSync, join } from './lib.mjs';
import { normalizeUpload, parseFrontmatter, runChecks, buildPluginFiles, addMarketplaceEntry, bytesToText, tagsFrom, NEW_TIER } from '../site/publish-core.mjs';

const args = {};
for (let i = 2; i < process.argv.length; i += 2) args[process.argv[i].replace(/^--/, '')] = process.argv[i + 1];
const die = (msg) => { console.error(`✘ ${msg}`); process.exit(1); };

const from = args.from && resolve(args.from);
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
