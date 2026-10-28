// Times check-catalog and build-catalog on a throwaway copy of the catalog with N generated plugins.
// The fixture is created in a temporary folder and deleted afterwards; nothing is written to this repository.
// Usage: node scripts/scale-check.mjs [count=900] [limitSeconds=30]
import { mkdtempSync, mkdirSync, writeFileSync, readFileSync, rmSync, appendFileSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { execSync, execFileSync } from 'node:child_process';
import { ROOT } from './lib.mjs';

const N = Number(process.argv[2] || 900);
const LIMIT_MS = Number(process.argv[3] || 30) * 1000;
const dir = mkdtempSync(join(tmpdir(), 'catalog-scale-'));
const sh = (cmd, cwd = dir) => execSync(cmd, { cwd, stdio: ['ignore', 'pipe', 'pipe'], encoding: 'utf8' });

try {
  execSync(`git archive --format=tar HEAD | tar -x -C "${dir}"`, { cwd: ROOT, stdio: 'ignore', shell: true });

  const jobs = ['plan', 'review', 'ship', 'meetings', 'incidents', 'maintain', 'share'];
  const works = ['chat', 'files', 'git', 'github', 'terminal'];
  const words = ['report', 'review', 'plan', 'summary', 'checklist', 'release', 'notes', 'test', 'risk', 'metrics', 'meeting', 'design', 'api', 'docs', 'data', 'incident', 'backlog', 'story', 'roadmap', 'audit'];
  const marketPath = join(dir, '.claude-plugin/marketplace.json');
  const market = JSON.parse(readFileSync(marketPath, 'utf8'));
  for (let i = 1; i <= N; i++) {
    const name = `fx-${words[i % 20]}-${words[(i * 7) % 20]}-${String(i).padStart(4, '0')}`;
    const p = join(dir, 'plugins', name);
    const description = `Generated fixture ${i} for ${words[i % 20]} and ${words[(i * 3) % 20]}. Use when testing catalog scale.`;
    mkdirSync(join(p, '.claude-plugin'), { recursive: true });
    mkdirSync(join(p, 'skills', name), { recursive: true });
    writeFileSync(join(p, '.claude-plugin/plugin.json'), JSON.stringify({ name, version: '0.1.0', description, author: { name: 'Fixture' } }, null, 2) + '\n');
    writeFileSync(join(p, 'catalog.yaml'), `owner: "Owner ${i % 37}"\ntier: ${i % 9 ? 'Experimental' : 'Recommended'}\ntags: [${words[i % 20]}, ${words[(i * 5) % 20]}]\njobs: [${jobs[i % 7]}]\nworks_with: [${works[i % 5]}]\nuse_it_when: "You need ${words[i % 20]} help."\n`);
    writeFileSync(join(p, 'skills', name, 'SKILL.md'), `---\nname: ${name}\ndescription: ${description}\n${i % 4 ? '' : 'allowed-tools: Read Grep\n'}---\n\n# ${name}\n\n${'Fixture step text. '.repeat(60)}\n`);
    market.plugins.push({ name, source: `./plugins/${name}`, description });
  }
  market.plugins.sort((a, b) => a.name.localeCompare(b.name));
  writeFileSync(marketPath, JSON.stringify(market, null, 2) + '\n');

  // A one-commit history, with origin/main pointing at it, like a CI checkout of main.
  sh('git init -q && git -c user.name=fixture -c user.email=fixture@example.invalid add -A && git -c user.name=fixture -c user.email=fixture@example.invalid commit -q -m fixture && git update-ref refs/remotes/origin/main HEAD');

  const time = (label, args) => {
    const start = performance.now();
    execFileSync(process.execPath, args, { cwd: dir, stdio: ['ignore', 'pipe', 'pipe'], env: { ...process.env, GITHUB_REPOSITORY: '' } });
    return { label, ms: Math.round(performance.now() - start) };
  };
  const results = [time('check-catalog', ['scripts/check-catalog.mjs']), time('build-catalog', ['scripts/build-catalog.mjs', '_site'])];
  const catalogKB = Math.round(readFileSync(join(dir, '_site/catalog.json')).length / 1024);

  const lines = [`Scale check: ${market.plugins.length} plugins (${N} generated), limit ${LIMIT_MS / 1000}s`, ...results.map(r => `- ${r.label}: ${r.ms} ms`), `- catalog.json: ${catalogKB} KB`];
  console.log(lines.join('\n'));
  if (process.env.GITHUB_STEP_SUMMARY) appendFileSync(process.env.GITHUB_STEP_SUMMARY, lines.join('\n') + '\n');
  const slow = results.filter(r => r.ms > LIMIT_MS);
  if (slow.length) { console.error(`✘ Over the limit: ${slow.map(r => r.label).join(', ')}`); process.exitCode = 1; }
} finally {
  rmSync(dir, { recursive: true, force: true });
}
