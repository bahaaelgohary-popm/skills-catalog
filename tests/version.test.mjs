// The version rule: installed copies only update when the version goes up. Run: node --test tests/
import { test } from 'node:test';
import assert from 'node:assert/strict';
import { isNewerVersion, nextPatch, versionBumpProblem } from '../scripts/lib.mjs';

test('isNewerVersion compares numerically, part by part', () => {
  assert.equal(isNewerVersion('1.0.1', '1.0.0'), true);
  assert.equal(isNewerVersion('1.10.0', '1.9.9'), true);
  assert.equal(isNewerVersion('2.0.0', '1.99.99'), true);
  assert.equal(isNewerVersion('1.0.0', '1.0.0'), false);
  assert.equal(isNewerVersion('0.9.0', '1.0.0'), false);
});

test('nextPatch raises the last part', () => {
  assert.equal(nextPatch('0.1.0'), '0.1.1');
  assert.equal(nextPatch('1.2.9'), '1.2.10');
});

const SKILL = 'plugins/x/skills/x/SKILL.md';

test('an edit without a bump is a problem', () => {
  assert.deepEqual(versionBumpProblem({ changed: [SKILL], before: '1.0.0', version: '1.0.0' }), { before: '1.0.0', changed: [SKILL] });
});

test('a lower version is a problem', () => {
  assert.ok(versionBumpProblem({ changed: [SKILL], before: '1.0.0', version: '0.9.0' }));
});

test('an edit with a bump is fine', () => {
  assert.equal(versionBumpProblem({ changed: [SKILL, 'plugins/x/.claude-plugin/plugin.json'], before: '1.0.0', version: '1.0.1' }), null);
});

test('catalog.yaml alone needs no bump, and nothing changed needs none', () => {
  assert.equal(versionBumpProblem({ changed: ['plugins/x/catalog.yaml'], before: '1.0.0', version: '1.0.0' }), null);
  assert.equal(versionBumpProblem({ changed: [''], before: '1.0.0', version: '1.0.0' }), null);
});
