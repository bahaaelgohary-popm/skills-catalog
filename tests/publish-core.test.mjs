// Publisher logic shared by the web page and the scripts. Run: node --test tests/
import { test } from 'node:test';
import assert from 'node:assert/strict';
import { addMarketplaceEntry, runChecks, openPullRequestAdding, openPullRequestChanging, textToBytes, LIMITS } from '../site/publish-core.mjs';

const market = (...names) => JSON.stringify({ name: 'skills-catalog', plugins: names.map(n => ({ name: n, source: `./plugins/${n}`, description: n })) }, null, 2) + '\n';
const namesIn = (text) => JSON.parse(text).plugins.map(p => p.name);

test('addMarketplaceEntry inserts in alphabetical position', () => {
  assert.deepEqual(namesIn(addMarketplaceEntry(market('alpha', 'delta', 'omega'), { name: 'charlie', description: 'x' })), ['alpha', 'charlie', 'delta', 'omega']);
  assert.deepEqual(namesIn(addMarketplaceEntry(market('beta', 'delta'), { name: 'alpha', description: 'x' })), ['alpha', 'beta', 'delta']);
});

test('addMarketplaceEntry never goes after the last entry', () => {
  assert.deepEqual(namesIn(addMarketplaceEntry(market('alpha', 'delta'), { name: 'zulu', description: 'x' })), ['alpha', 'zulu', 'delta']);
  assert.deepEqual(namesIn(addMarketplaceEntry(market(), { name: 'first', description: 'x' })), ['first']);
});

test('addMarketplaceEntry only adds lines, so it never edits an existing one', () => {
  const before = market('alpha', 'delta', 'omega');
  for (const name of ['aaa', 'charlie', 'zulu']) {
    const after = addMarketplaceEntry(before, { name, description: 'x' }).split('\n');
    const kept = before.split('\n');
    // The result is the original with one block of lines inserted at a single point.
    let i = 0;
    while (after[i] === kept[i]) i++;
    const added = after.length - kept.length;
    assert.deepEqual(after.slice(i + added), kept.slice(i), `${name} changed an existing line`);
  }
});

test('addMarketplaceEntry refuses a name already listed', () => {
  assert.throws(() => addMarketplaceEntry(market('alpha'), { name: 'alpha', description: 'x' }), /already in marketplace.json/);
});

const skillFile = (fm = 'name: good-skill\ndescription: Does a useful thing. Use when you need it.\n', body = '# Good\n') =>
  ({ path: 'SKILL.md', bytes: textToBytes(`---\n${fm}---\n${body}`) });
const plugin = (over = {}) => ({ name: 'good-skill', description: 'Does a useful thing. Use when you need it.', owner: 'Someone', useItWhen: 'You need it.', jobs: ['plan'], worksWith: ['chat'], files: [skillFile()], ...over });
const failing = (p) => runChecks(p).filter(c => !c.ok).map(c => c.label);

test('runChecks passes a complete skill', () => {
  assert.deepEqual(failing(plugin()), []);
});

test('runChecks flags each missing or wrong field', () => {
  assert.ok(failing(plugin({ name: 'Bad_Name' })).includes('Name is kebab-case'));
  assert.ok(failing({ ...plugin(), existingNames: ['good-skill'] }).includes('Name is not already in the catalog'));
  assert.ok(failing(plugin({ owner: '' })).includes('Owner is set'));
  assert.ok(failing(plugin({ jobs: ['nope'] })).includes('At least one "I want to…" job'));
  assert.ok(failing(plugin({ worksWith: [] })).includes('"Works with" is set'));
  assert.ok(failing(plugin({ files: [] })).includes('SKILL.md at the skill root'));
});

test('runChecks catches secrets and size limits', () => {
  const key = 'AKIA' + 'Q'.repeat(16); // built at runtime so the repository itself holds no key-shaped text
  assert.ok(failing(plugin({ files: [skillFile(undefined, `key ${key}\n`)] })).includes('No secrets found'));
  assert.ok(failing(plugin({ files: [skillFile(), { path: '.env', bytes: textToBytes('A=1') }] })).includes('No secrets found'));
  assert.ok(failing(plugin({ files: [skillFile(), { path: 'big.md', bytes: new Uint8Array(LIMITS.maxFileBytes + 1) }] })).includes('Within size limits'));
});

// A fake GitHub API: open pull requests, each with a head commit and its files.
function fakeApi(prs) {
  return async (method, path) => {
    assert.equal(method, 'GET', 'lookups must be read-only');
    if (/\/pulls\?state=open/.test(path)) return { status: 200, data: prs.map(p => ({ number: p.number, html_url: `https://x/pull/${p.number}`, head: { sha: `sha${p.number}`, repo: { full_name: 'o/r' } } })) };
    let m = path.match(/\/pulls\/(\d+)\/files/);
    if (m) return { status: 200, data: prs.find(p => p.number === Number(m[1])).files.map(filename => ({ filename })) };
    m = path.match(/\/contents\/(.+)\?ref=sha(\d+)$/);
    if (m) return prs.find(p => p.number === Number(m[2])).files.includes(m[1]) ? { status: 200, data: {} } : { status: 404, data: null };
    throw new Error(`unexpected ${path}`);
  };
}
const adds = (name) => [`plugins/${name}/.claude-plugin/plugin.json`, `plugins/${name}/skills/${name}/SKILL.md`];

test('openPullRequestAdding finds an open pull request that adds the same plugin', async () => {
  const api = fakeApi([{ number: 5, files: adds('dup') }, { number: 6, files: adds('other') }]);
  assert.deepEqual(await openPullRequestAdding({ api, repo: 'o/r', name: 'dup' }), { number: 5, url: 'https://x/pull/5' });
  assert.equal(await openPullRequestAdding({ api, repo: 'o/r', name: 'free' }), null);
});

test('openPullRequestAdding honours exclude and before', async () => {
  const api = fakeApi([{ number: 5, files: adds('dup') }, { number: 7, files: adds('dup') }]);
  assert.equal(await openPullRequestAdding({ api, repo: 'o/r', name: 'dup', before: 5 }), null, 'the oldest keeps the name');
  assert.equal((await openPullRequestAdding({ api, repo: 'o/r', name: 'dup', before: 7 })).number, 5);
  assert.equal((await openPullRequestAdding({ api, repo: 'o/r', name: 'dup', exclude: 5 })).number, 7);
});

test('openPullRequestChanging finds a pull request touching any file of the plugin', async () => {
  const api = fakeApi([{ number: 9, files: ['plugins/live/skills/live/SKILL.md'] }]);
  assert.equal((await openPullRequestChanging({ api, repo: 'o/r', name: 'live' })).number, 9);
  assert.equal(await openPullRequestChanging({ api, repo: 'o/r', name: 'liveish' }), null, 'a name prefix is not a match');
});
