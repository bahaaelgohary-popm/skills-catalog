// Copy the catalog's skills into the folder an agent loads skills from, straight from this clone.
// Works without the catalog website, so it suits private projects and offline machines.
//
//   node scripts/install-skills.mjs --for kilo|copilot|claude|agents [--project <dir>] [--only a,b] [--force] [--dry-run]
//   node scripts/install-skills.mjs --for kilo --remove
//
// Where skills go:
//   --for        personal (all projects)          --project <dir> (that project only)
//   kilo         ~/.kilo/skills                    <dir>/.kilo/skills
//   copilot      ~/.copilot/skills                 <dir>/.github/skills
//   claude       ~/.claude/skills                  <dir>/.claude/skills
//   agents       ~/.agents/skills                  <dir>/.agents/skills   (Kilo Code and VS Code Copilot both read it)
//
// Each installed skill folder gets a .skills-catalog marker. A folder of the same name without the marker
// is someone's own skill: it is left alone unless --force. --remove deletes only folders with the marker.
// Re-run after `git pull` to pick up new and updated skills. Deprecated plugins are skipped.
import { readdirSync, mkdirSync, copyFileSync, writeFileSync, rmSync, existsSync, readFileSync } from 'node:fs';
import { join, dirname, resolve } from 'node:path';
import { homedir } from 'node:os';
import { ROOT, MARKETPLACE, readJson, readYaml, pluginDir } from './lib.mjs';

const args = {};
for (let i = 2; i < process.argv.length; i++) {
  const key = process.argv[i].replace(/^--/, '');
  const next = process.argv[i + 1];
  args[key] = next === undefined || next.startsWith('--') ? true : (i++, next);
}
const die = (msg) => { console.error(`✘ ${msg}`); process.exit(1); };

const TARGETS = {
  kilo: { home: '.kilo/skills', project: '.kilo/skills', label: 'Kilo Code' },
  copilot: { home: '.copilot/skills', project: '.github/skills', label: 'GitHub Copilot' },
  claude: { home: '.claude/skills', project: '.claude/skills', label: 'Claude Code' },
  agents: { home: '.agents/skills', project: '.agents/skills', label: 'Kilo Code and GitHub Copilot (.agents)' },
};
const target = TARGETS[args.for];
if (!target) die(`--for must be one of: ${Object.keys(TARGETS).join(', ')}`);
const projectDir = typeof args.project === 'string' ? resolve(args.project) : null;
if (args.project && !projectDir) die('--project needs a folder');
if (projectDir && !existsSync(projectDir)) die(`${projectDir} does not exist`);
const dest = projectDir ? join(projectDir, target.project) : join(homedir(), target.home);
const dry = !!args['dry-run'];
const MARKER = '.skills-catalog';

const listFiles = (dir, prefix = '') => readdirSync(dir, { withFileTypes: true }).flatMap(d =>
  d.isDirectory() ? listFiles(join(dir, d.name), `${prefix}${d.name}/`) : d.isFile() ? [prefix + d.name] : []);
const ours = (dir) => existsSync(join(dir, MARKER));

if (args.remove) {
  let n = 0;
  if (existsSync(dest)) for (const d of readdirSync(dest, { withFileTypes: true })) {
    if (d.isDirectory() && ours(join(dest, d.name))) { if (!dry) rmSync(join(dest, d.name), { recursive: true, force: true }); n++; console.log(`- ${d.name}`); }
  }
  console.log(`${dry ? 'Would remove' : 'Removed'} ${n} catalog skill${n === 1 ? '' : 's'} from ${dest}`);
  process.exit(0);
}

const only = typeof args.only === 'string' ? new Set(args.only.split(',').map(s => s.trim()).filter(Boolean)) : null;
const market = readJson(MARKETPLACE);
const commit = (() => { try { return readFileSync(join(ROOT, '.git', 'HEAD'), 'utf8').trim(); } catch { return ''; } })();
let installed = 0;
const skipped = [];
const seen = new Set();
for (const entry of market.plugins) {
  const dir = pluginDir(entry);
  let meta = {};
  try { meta = readYaml(join(dir, 'catalog.yaml')); } catch {}
  if (meta.deprecated === 'true') continue;
  const version = readJson(join(dir, '.claude-plugin', 'plugin.json')).version || '0';
  let skills = [];
  try { skills = readdirSync(join(dir, 'skills'), { withFileTypes: true }).filter(d => d.isDirectory()).map(d => d.name); } catch { continue; }
  for (const skill of skills) {
    const from = join(dir, 'skills', skill);
    if (!existsSync(join(from, 'SKILL.md')) || seen.has(skill)) continue;
    if (only && !only.has(skill) && !only.has(entry.name)) continue;
    seen.add(skill);
    const to = join(dest, skill);
    if (existsSync(to) && !ours(to) && !args.force) { skipped.push(skill); continue; }
    if (!dry) {
      rmSync(to, { recursive: true, force: true });
      for (const rel of listFiles(from)) {
        mkdirSync(dirname(join(to, rel)), { recursive: true });
        copyFileSync(join(from, rel), join(to, rel));
      }
      writeFileSync(join(to, MARKER), JSON.stringify({ plugin: entry.name, version, source: ROOT, head: commit }, null, 2) + '\n');
    }
    console.log(`✔ ${skill} ${version}`);
    installed++;
  }
}
if (only) for (const n of only) if (!seen.has(n)) console.log(`? ${n} is not a skill in this catalog`);
for (const s of skipped) console.log(`- ${s}: a skill of that name already exists there and was not installed by this script (add --force to replace it)`);
console.log(`${dry ? 'Would install' : 'Installed'} ${installed} skill${installed === 1 ? '' : 's'} for ${target.label} in ${dest}`);
if (!dry && installed) console.log(args.for === 'kilo' || args.for === 'agents'
  ? 'Reload the Kilo Code window (or start a new task) to load them.'
  : args.for === 'copilot' ? 'Start a new Copilot chat in agent mode to load them.' : 'Start a new Claude Code session to load them.');
