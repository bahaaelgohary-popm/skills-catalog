// Wrap a skill folder as a plugin in this catalog. Used by the publish-skill skill.
// node scripts/new-plugin.mjs --from <dir> --name <name> --owner <owner>
//   [--lifecycle Pilot|GA] [--tags a,b] [--use-it-when "..."] [--description "..."]
import { cpSync, mkdirSync, writeFileSync, readFileSync } from 'node:fs';
import { resolve } from 'node:path';
import { ROOT, MARKETPLACE, LIFECYCLES, NAME_RE, readJson, existsSync, join } from './lib.mjs';

const args = {};
for (let i = 2; i < process.argv.length; i += 2) {
  args[process.argv[i].replace(/^--/, '')] = process.argv[i + 1];
}

const die = (msg) => { console.error(`✘ ${msg}`); process.exit(1); };
const from = args.from && resolve(args.from);
const name = args.name;
const owner = args.owner;
const lifecycle = args.lifecycle || 'Pilot';

if (!from || !existsSync(join(from, 'SKILL.md'))) die('--from must be a folder containing SKILL.md');
if (!NAME_RE.test(name || '')) die('--name must be kebab-case');
if (!owner) die('--owner is required');
if (!LIFECYCLES.includes(lifecycle)) die(`--lifecycle must be one of ${LIFECYCLES.join(', ')}`);

const market = readJson(MARKETPLACE);
if (market.plugins.some(p => p.name === name)) die(`"${name}" is already in marketplace.json`);
const dest = join(ROOT, 'plugins', name);
if (existsSync(dest)) die(`plugins/${name} already exists`);

// Fall back to the SKILL.md frontmatter description.
const skillText = readFileSync(join(from, 'SKILL.md'), 'utf8');
const fmDescription = (skillText.match(/^---[\s\S]*?^description:\s*(.+)$[\s\S]*?^---/m) || [])[1];
const description = args.description || fmDescription || name;
const tags = (args.tags || '').split(',').map(t => t.trim()).filter(Boolean);
const q = (s) => JSON.stringify(s);

cpSync(from, join(dest, 'skills', name), { recursive: true });
mkdirSync(join(dest, '.claude-plugin'), { recursive: true });
writeFileSync(join(dest, '.claude-plugin', 'plugin.json'), JSON.stringify({
  name,
  version: '0.1.0',
  description,
  author: { name: owner },
  license: 'MIT',
  keywords: tags,
}, null, 2) + '\n');
writeFileSync(join(dest, 'catalog.yaml'),
  `owner: ${q(owner)}\nlifecycle: ${lifecycle}\ntags: [${tags.join(', ')}]\nuse_it_when: ${q(args['use-it-when'] || description)}\n`);

market.plugins.push({ name, source: `./plugins/${name}`, description });
writeFileSync(MARKETPLACE, JSON.stringify(market, null, 2) + '\n');
console.log(`✔ Added plugins/${name} (${lifecycle}) and its marketplace entry`);
