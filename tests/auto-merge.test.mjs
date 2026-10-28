// The rules that decide whether a pull request merges without a person. Run: node --test tests/
import { test } from 'node:test';
import assert from 'node:assert/strict';
import { decide } from '../scripts/auto-merge-check.mjs';

const N = 'new-skill';
const base = { name: 'skills-catalog', plugins: [{ name: 'existing', source: './plugins/existing', description: 'x' }] };
const head = { ...base, plugins: [...base.plugins, { name: N, source: `./plugins/${N}`, description: 'y' }] };
const SKILL = `plugins/${N}/skills/${N}/SKILL.md`;
const skill = (frontmatter = '') => `---\nname: ${N}\ndescription: test\n${frontmatter}---\n# T\n`;

// A clean "adds one new Instructions-only skill" pull request; each test changes one thing.
function input(over = {}) {
  const extra = over.extraFiles || [];
  return {
    pr: { state: 'open', draft: false, base: { ref: 'main' }, labels: [], ...over.pr },
    files: over.files || [
      { filename: '.claude-plugin/marketplace.json', status: 'modified' },
      { filename: `plugins/${N}/.claude-plugin/plugin.json`, status: 'added' },
      { filename: `plugins/${N}/catalog.yaml`, status: 'added' },
      { filename: SKILL, status: 'added' },
      ...extra.map(f => ({ filename: f, status: 'added' })),
    ],
    baseMarket: base,
    headMarket: over.headMarket || head,
    mainNames: over.mainNames || ['existing'],
    pluginJson: JSON.stringify({ name: N, version: '0.1.0' }),
    catalogYaml: over.catalogYaml || 'tier: Experimental\n',
    texts: over.texts || { [SKILL]: skill() },
  };
}
const verdict = (over) => decide(input(over));

test('a new Instructions-only skill merges automatically', () => {
  assert.deepEqual(verdict(), { eligible: true, name: N, reasons: [] });
});

test('bundled code waits for a person', () => {
  const r = verdict({ extraFiles: [`plugins/${N}/skills/${N}/scripts/run.sh`] });
  assert.equal(r.eligible, false);
  assert.match(r.reasons.join(), /runs code \(Bundled scripts\)/);
});

test('hooks and MCP servers wait for a person', () => {
  assert.match(verdict({ extraFiles: [`plugins/${N}/hooks/hooks.json`] }).reasons.join(), /Hooks/);
  assert.match(verdict({ extraFiles: [`plugins/${N}/.mcp.json`] }).reasons.join(), /MCP servers/);
});

test('read-only pre-approved tools still merge automatically', () => {
  assert.equal(verdict({ texts: { [SKILL]: skill('allowed-tools: Read Grep Glob\n') } }).eligible, true);
});

test('risky pre-approved tools wait for a person, in skills and commands', () => {
  for (const tools of ['Bash', 'Read, Bash(git log:*)', 'Write', 'WebFetch']) {
    const r = verdict({ texts: { [SKILL]: skill(`allowed-tools: ${tools}\n`) } });
    assert.equal(r.eligible, false, tools);
    assert.match(r.reasons.join(), /pre-approves/);
  }
  const cmd = `plugins/${N}/commands/go.md`;
  const r = verdict({ extraFiles: [cmd], texts: { [SKILL]: skill(), [cmd]: '---\nallowed-tools: Edit\n---\nGo\n' } });
  assert.match(r.reasons.join(), /pre-approves Edit/);
});

test('an unreadable SKILL.md waits for a person', () => {
  assert.match(verdict({ texts: {} }).reasons.join(), /could not read/);
});

test('a name already on main is a duplicate', () => {
  assert.match(verdict({ mainNames: ['existing', N] }).reasons.join(), /already exists on main/);
});

test('changing another marketplace entry is refused', () => {
  const tampered = { ...head, plugins: head.plugins.map(p => p.name === 'existing' ? { ...p, source: './elsewhere' } : p) };
  assert.match(verdict({ headMarket: tampered }).reasons.join(), /other entries changed/);
});

test('the hold label, drafts, other bases and non-Experimental tiers wait for a person', () => {
  assert.match(verdict({ pr: { labels: [{ name: 'hold' }] } }).reasons.join(), /"hold" label/);
  assert.match(verdict({ pr: { draft: true } }).reasons.join(), /draft/);
  assert.match(verdict({ pr: { base: { ref: 'dev' } } }).reasons.join(), /targets dev/);
  assert.match(verdict({ catalogYaml: 'tier: Recommended\n' }).reasons.join(), /not Experimental/);
});

test('edits to existing files and changes outside plugins/ wait for a person', () => {
  const files = input().files.map(f => f.filename === SKILL ? { ...f, status: 'modified' } : f);
  assert.match(verdict({ files }).reasons.join(), /only new files/);
  assert.match(verdict({ files: [...input().files, { filename: 'README.md', status: 'modified' }] }).reasons.join(), /outside plugins/);
});
