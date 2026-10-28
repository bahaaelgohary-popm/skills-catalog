// Decides whether a pull request may be merged without a human: it must only add one new
// Experimental plugin (its folder plus one marketplace entry) and bundle no code.
// It reads the PR through the GitHub API and never runs anything from it.
//
// In Actions (after the Catalog checks pass): REPO=owner/name HEAD_SHA=<sha> node scripts/auto-merge-check.mjs
// Dry run on any PR: node scripts/auto-merge-check.mjs --repo owner/name --pr 12
// Prints the verdict; in Actions also writes eligible/pr/sha/branch/same_repo to $GITHUB_OUTPUT.
import { execFileSync } from 'node:child_process';
import { appendFileSync } from 'node:fs';
import { pathToFileURL } from 'node:url';
import { parseYaml, NEW_TIER, NAME_RE } from './lib.mjs';
import { capabilities, READ_ONLY_TOOLS } from './capabilities.mjs';
import { LIMITS } from '../site/publish-core.mjs';

const MARKET_PATH = '.claude-plugin/marketplace.json';
// Files whose frontmatter can pre-approve tools; paths relative to the plugin root.
const isFrontmatterFile = (p) => /^skills\/[^/]+\/SKILL\.md$/.test(p) || /^commands\/.+\.md$/.test(p);
export const HOLD_LABEL = 'hold';

const same = (a, b) => JSON.stringify(a) === JSON.stringify(b);

// Pure decision. pr: GitHub PR object; files: PR files list; baseMarket / headMarket: marketplace.json
// at the merge base and at the PR head; mainNames: plugin names on main now; pluginJson / catalogYaml: text at head;
// texts: { filename: text } for the skill and command Markdown files at head (null if it could not be read).
export function decide({ pr, files, baseMarket, headMarket, mainNames, pluginJson, catalogYaml, texts = {} }) {
  const reasons = [];
  const no = (msg) => reasons.push(msg);

  if (pr.state !== 'open') no(`PR is ${pr.state}`);
  if (pr.draft) no('PR is a draft');
  if (pr.base.ref !== 'main') no(`PR targets ${pr.base.ref}, not main`);
  if ((pr.labels || []).some(l => l.name === HOLD_LABEL)) no(`PR has the "${HOLD_LABEL}" label`);

  // Only new files in one plugins/<name>/ folder, plus the marketplace file.
  const names = new Set();
  let marketChanged = false;
  for (const f of files) {
    if (f.filename === MARKET_PATH) { marketChanged = true; if (f.status !== 'modified') no(`${MARKET_PATH} was ${f.status}`); continue; }
    const m = f.filename.match(/^plugins\/([^/]+)\/.+/);
    if (!m) { no(`changes ${f.filename}, outside plugins/`); continue; }
    names.add(m[1]);
    if (f.status !== 'added') no(`${f.filename} was ${f.status}; only new files are merged automatically`);
  }
  // The publisher's file limit, plus plugin.json, catalog.yaml and marketplace.json.
  if (files.length > LIMITS.maxFiles + 3) no(`${files.length} files changed (limit ${LIMITS.maxFiles + 3})`);
  if (!marketChanged) no(`${MARKET_PATH} is not changed`);
  if (names.size !== 1) no(names.size ? `touches ${names.size} plugins (${[...names].join(', ')})` : 'adds no plugin');
  const name = names.size === 1 ? [...names][0] : null;

  if (name) {
    if (!NAME_RE.test(name)) no(`"${name}" is not a kebab-case name`);
    if (mainNames.includes(name)) no(`"${name}" already exists on main`);

    // The marketplace may only gain this one entry; everything else stays byte-for-byte equal.
    if (baseMarket && headMarket) {
      const { plugins: basePlugins = [], ...baseRest } = baseMarket;
      const { plugins: headPlugins = [], ...headRest } = headMarket;
      if (!same(baseRest, headRest)) no(`${MARKET_PATH}: fields other than plugins changed`);
      const added = headPlugins.filter(p => p.name === name);
      if (added.length !== 1) no(`${MARKET_PATH}: expected one "${name}" entry, found ${added.length}`);
      else if (added[0].source !== `./plugins/${name}`) no(`${MARKET_PATH}: "${name}" source is ${JSON.stringify(added[0].source)}`);
      if (!same(headPlugins.filter(p => p.name !== name), basePlugins)) no(`${MARKET_PATH}: other entries changed`);
    } else no(`${MARKET_PATH} could not be read`);

    let meta = null;
    try { meta = catalogYaml == null ? null : parseYaml(catalogYaml); } catch (e) { no(`catalog.yaml: ${e.message}`); }
    if (catalogYaml == null) no('catalog.yaml is missing');
    else if (meta && meta.tier !== NEW_TIER) no(`tier is "${meta.tier}", not ${NEW_TIER}`);

    let manifest = null;
    try { manifest = pluginJson == null ? null : JSON.parse(pluginJson); } catch { no('plugin.json is not valid JSON'); }
    if (pluginJson == null) no('plugin.json is missing');
    if (manifest) {
      const prefix = `plugins/${name}/`;
      const pluginFiles = files.filter(f => f.filename.startsWith(prefix)).map(f => ({ path: f.filename.slice(prefix.length), content: texts[f.filename] ?? '' }));
      const unread = pluginFiles.filter(f => isFrontmatterFile(f.path) && texts[prefix + f.path] == null);
      if (unread.length) no(`could not read ${unread.map(f => f.path).join(', ')}`);
      const cap = capabilities(pluginFiles, manifest, name);
      if (cap.level === 'code') no(`it runs code (${cap.items.filter(i => i.kind === 'code').map(i => i.title).join(', ')}); a person reviews those`);
      // Pre-approved tools run without asking the user, so only read-only ones merge without a person.
      const risky = cap.tools.filter(t => !READ_ONLY_TOOLS.includes(t));
      if (risky.length) no(`it pre-approves ${risky.join(', ')}, which ${risky.length === 1 ? 'runs' : 'run'} without asking; a person reviews those`);
    }
  }

  return { eligible: reasons.length === 0, name, reasons };
}

// ---- GitHub I/O through the gh CLI (GH_TOKEN in Actions, your login locally) ----
// paginate: list endpoints only; returns every item across pages.
function gh(path, { raw = false, paginate = false } = {}) {
  const args = ['api', path];
  if (paginate) args.push('--paginate', '--jq', '.[] | tojson');
  if (raw) args.push('-H', 'Accept: application/vnd.github.raw');
  try {
    const out = execFileSync('gh', args, { encoding: 'utf8', stdio: ['ignore', 'pipe', 'pipe'], maxBuffer: 32 << 20 });
    if (raw) return out;
    return paginate ? out.split('\n').filter(Boolean).map(l => JSON.parse(l)) : JSON.parse(out);
  } catch (e) {
    if (/HTTP 404/.test(e.stderr || '')) return null;
    throw e;
  }
}
const fileAt = (repo, path, ref) => gh(`repos/${repo}/contents/${path}?ref=${ref}`, { raw: true });
const jsonAt = (repo, path, ref) => { const t = fileAt(repo, path, ref); return t == null ? null : JSON.parse(t); };

function main() {
  const arg = (k) => { const i = process.argv.indexOf(k); return i > 0 ? process.argv[i + 1] : undefined; };
  const repo = arg('--repo') || process.env.REPO;
  const prNumber = arg('--pr');
  const headSha = process.env.HEAD_SHA;
  if (!repo || (!prNumber && !headSha)) throw new Error('Needs --repo and --pr, or REPO and HEAD_SHA');

  // From a check run we only know the commit; find the open PR whose head is that commit.
  const pr = prNumber
    ? gh(`repos/${repo}/pulls/${prNumber}`)
    : gh(`repos/${repo}/pulls?state=open&per_page=100`).find(p => p.head.sha === headSha);
  const output = (o) => { if (process.env.GITHUB_OUTPUT) appendFileSync(process.env.GITHUB_OUTPUT, Object.entries(o).map(([k, v]) => `${k}=${v}\n`).join('')); };
  if (!pr) { console.log(`No open pull request has head ${headSha}; nothing to do.`); output({ eligible: false }); return; }

  const sha = pr.head.sha;
  const headRepo = pr.head.repo?.full_name || repo;
  const files = gh(`repos/${repo}/pulls/${pr.number}/files?per_page=100`, { paginate: true });
  // The PR's files are a diff against the merge base, so compare the marketplace against it too.
  const mergeBase = gh(`repos/${repo}/compare/${pr.base.sha}...${sha}?per_page=1`)?.merge_base_commit?.sha || pr.base.sha;
  const name = (files.find(f => /^plugins\/[^/]+\//.test(f.filename))?.filename || '').split('/')[1];

  const result = decide({
    pr,
    files,
    baseMarket: jsonAt(repo, MARKET_PATH, mergeBase),
    headMarket: jsonAt(headRepo, MARKET_PATH, sha),
    mainNames: (jsonAt(repo, MARKET_PATH, 'main')?.plugins || []).map(p => p.name),
    pluginJson: name ? fileAt(headRepo, `plugins/${name}/.claude-plugin/plugin.json`, sha) : null,
    catalogYaml: name ? fileAt(headRepo, `plugins/${name}/catalog.yaml`, sha) : null,
    texts: Object.fromEntries(files
      .filter(f => name && f.filename.startsWith(`plugins/${name}/`) && isFrontmatterFile(f.filename.slice(`plugins/${name}/`.length)))
      .map(f => [f.filename, fileAt(headRepo, f.filename, sha)])),
  });

  console.log(`PR #${pr.number} (${pr.title}) at ${sha.slice(0, 7)}`);
  if (result.eligible) console.log(`✔ Eligible: adds new ${NEW_TIER} plugin "${result.name}" with no bundled code.`);
  else { console.log('✘ Needs a person to review:'); for (const r of result.reasons) console.log(`  - ${r}`); }
  output({ eligible: result.eligible, pr: pr.number, sha, branch: pr.head.ref, same_repo: headRepo === repo, name: result.name || '' });
}

if (import.meta.url === pathToFileURL(process.argv[1]).href) main();
