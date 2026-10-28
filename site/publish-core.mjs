// Shared publishing logic: used by the Publish page in the browser and by scripts/new-plugin.mjs in Node.
// No dependencies. Files are { path, bytes: Uint8Array } throughout.

export const NAME_RE = /^[a-z0-9][a-z0-9-]*$/;
export const TIERS = ['Experimental', 'Recommended'];
export const NEW_TIER = 'Experimental';

// Controlled vocabularies for catalog.yaml, so landing-page chips and filters stay tidy.
// jobs: what a skill helps you do ("I want to…"). works_with: what it reads or acts on.
export const JOBS = [
  { id: 'plan', label: 'Plan and spec work' },
  { id: 'review', label: 'Review code' },
  { id: 'ship', label: 'Ship a release' },
  { id: 'meetings', label: 'Run meetings and standups' },
  { id: 'incidents', label: 'Handle an incident' },
  { id: 'maintain', label: 'Keep a repo healthy' },
  { id: 'share', label: 'Share a skill' },
];
export const WORKS_WITH = [
  { id: 'chat', label: 'Chat only' },
  { id: 'files', label: 'Local files' },
  { id: 'git', label: 'Git' },
  { id: 'github', label: 'GitHub' },
  { id: 'terminal', label: 'Terminal' },
];
export const LIMITS = { maxFiles: 100, maxFileBytes: 1024 * 1024, maxTotalBytes: 5 * 1024 * 1024 };

const JUNK = /(^|\/)(__MACOSX|\.DS_Store|Thumbs\.db|desktop\.ini|\.git)(\/|$)/;
const SECRET_PATTERNS = [
  ['AWS access key', /AKIA[0-9A-Z]{16}/],
  ['GitHub token', /\b(gh[pousr]_[A-Za-z0-9]{30,}|github_pat_[A-Za-z0-9_]{40,})/],
  ['API key (sk-…)', /\bsk-[A-Za-z0-9_-]{20,}/],
  ['Slack token', /\bxox[abprs]-[A-Za-z0-9-]{10,}/],
  ['Google API key', /\bAIza[0-9A-Za-z_-]{35}/],
  ['Private key', /-----BEGIN [A-Z ]*PRIVATE KEY-----/],
];
const TEMPLATE_PLACEHOLDER = /<(the situations or phrases that should trigger it|The steps Claude should follow\.|The exact output format\.)>/;
const SECRET_FILES = /(^|\/)(\.env(\.[^/]*)?|id_rsa|id_ed25519|[^/]*\.pem|[^/]*\.key)$/i;

const enc = new TextEncoder();
const dec = new TextDecoder();
export const textToBytes = (s) => enc.encode(s);
export const bytesToText = (b) => dec.decode(b);
export const isBinary = (b) => b.subarray(0, 8192).includes(0);

export function toBase64(bytes) {
  if (typeof Buffer !== 'undefined') return Buffer.from(bytes).toString('base64');
  let bin = '';
  for (let i = 0; i < bytes.length; i += 0x8000) bin += String.fromCharCode.apply(null, bytes.subarray(i, i + 0x8000));
  return btoa(bin);
}
export function fromBase64(b64) {
  if (typeof Buffer !== 'undefined') return new Uint8Array(Buffer.from(b64, 'base64'));
  const bin = atob(b64.replace(/\s/g, ''));
  return Uint8Array.from(bin, c => c.charCodeAt(0));
}

// Reads the YAML frontmatter keys Claude Code skills use (single-line values only).
export function parseFrontmatter(text) {
  if (!/^---\r?\n/.test(text)) return { ok: false, fields: {}, error: 'SKILL.md must start with a --- frontmatter line' };
  const end = text.indexOf('\n---', 3);
  if (end < 0) return { ok: false, fields: {}, error: 'Frontmatter is not closed with ---' };
  const fields = {};
  for (const line of text.slice(text.indexOf('\n') + 1, end).split(/\r?\n/)) {
    const m = line.match(/^([A-Za-z][\w-]*):\s*(.*)$/);
    if (m) fields[m[1]] = m[2].replace(/^(["'])(.*)\1$/, '$2').trim();
  }
  return { ok: true, fields };
}

export function skillTemplate(name = 'my-skill') {
  return `---
name: ${name}
description: One sentence on what it does. Use when <the situations or phrases that should trigger it>.
---

# ${name.split('-').map(w => w[0]?.toUpperCase() + w.slice(1)).join(' ')}

1. Read the input from \`$ARGUMENTS\` or the user's last message.
2. <The steps Claude should follow.>
3. <The exact output format.>
`;
}

// Turns any upload (loose files, a folder, or an unzipped archive) into one skill folder.
// The skill root is the folder holding the shallowest SKILL.md; everything else is ignored with a note.
export function normalizeUpload(entries) {
  const notes = [];
  const clean = entries
    .map(e => ({ path: e.path.replace(/\\/g, '/').replace(/^\.?\/+/, ''), bytes: e.bytes }))
    .filter(e => e.path && !e.path.endsWith('/') && !JUNK.test(e.path));
  const skillMds = clean.filter(e => /(^|\/)SKILL\.md$/.test(e.path)).sort((a, b) => a.path.split('/').length - b.path.split('/').length);
  if (skillMds.length === 0) return { error: 'No SKILL.md found. A skill folder needs SKILL.md at its root.', files: [], notes };
  const depth = skillMds[0].path.split('/').length;
  if (skillMds.filter(e => e.path.split('/').length === depth).length > 1) {
    return { error: 'Found more than one SKILL.md at the same level. Publish one skill at a time.', files: [], notes };
  }
  const root = skillMds[0].path.slice(0, -'SKILL.md'.length);
  const files = clean.filter(e => e.path.startsWith(root)).map(e => ({ path: e.path.slice(root.length), bytes: e.bytes }));
  const nested = files.filter(f => f.path !== 'SKILL.md' && /(^|\/)SKILL\.md$/.test(f.path));
  if (nested.length) return { error: `Nested skills are not supported (${nested[0].path}). Publish one skill at a time.`, files: [], notes };
  const ignored = clean.length - files.length;
  if (root) notes.push(`Using "${root.replace(/\/$/, '')}" as the skill folder.`);
  if (ignored) notes.push(`Ignored ${ignored} file${ignored === 1 ? '' : 's'} outside the skill folder.`);
  files.sort((a, b) => (a.path === 'SKILL.md' ? -1 : b.path === 'SKILL.md' ? 1 : a.path.localeCompare(b.path)));
  return { files, notes };
}

// Pre-publish checks. Returns [{ ok, label, detail }]; publishing is allowed only when all are ok.
export function runChecks({ name, description, owner, useItWhen, jobs = [], worksWith = [], files, existingNames = [] }) {
  const out = [];
  const add = (ok, label, detail = '') => out.push({ ok, label, detail });
  const skill = files.find(f => f.path === 'SKILL.md');
  const fm = skill ? parseFrontmatter(bytesToText(skill.bytes)) : null;

  add(!!skill, 'SKILL.md at the skill root', skill ? '' : 'Missing');
  add(!!fm?.ok, 'Frontmatter is valid', fm?.error || '');
  add(NAME_RE.test(name || ''), 'Name is kebab-case', name ? `"${name}"` : 'Set name: in the frontmatter');
  add(!existingNames.includes(name), 'Name is not already in the catalog', existingNames.includes(name) ? `"${name}" exists` : '');
  add(!!description && description.length >= 20, 'Description says what it does and when to use it', description ? '' : 'Set description: in the frontmatter');
  const placeholder = skill && bytesToText(skill.bytes).match(TEMPLATE_PLACEHOLDER);
  add(!placeholder && name !== 'my-skill', 'Template placeholders replaced', placeholder ? `Still has "${placeholder[0]}"` : name === 'my-skill' ? 'Rename my-skill' : '');
  add(!!owner?.trim(), 'Owner is set');
  add(!!useItWhen?.trim(), '"Use it when" is set');
  const badJob = jobs.find(j => !JOBS.some(x => x.id === j));
  add(jobs.length > 0 && !badJob, 'At least one "I want to…" job', badJob ? `Unknown job "${badJob}"` : jobs.length ? '' : 'Pick what it helps with');
  const badTool = worksWith.find(w => !WORKS_WITH.some(x => x.id === w));
  add(worksWith.length > 0 && !badTool, '"Works with" is set', badTool ? `Unknown value "${badTool}"` : worksWith.length ? '' : 'Pick what it works with');

  const total = files.reduce((n, f) => n + f.bytes.length, 0);
  const big = files.find(f => f.bytes.length > LIMITS.maxFileBytes);
  add(files.length <= LIMITS.maxFiles && total <= LIMITS.maxTotalBytes && !big, 'Within size limits',
    big ? `${big.path} is over 1 MB` : `${files.length} files, ${(total / 1024).toFixed(1)} KB (max ${LIMITS.maxFiles} files, 5 MB)`);

  const leaks = [];
  for (const f of files) {
    if (SECRET_FILES.test(f.path)) leaks.push(`${f.path} (secret-like file)`);
    else if (!isBinary(f.bytes)) {
      const text = bytesToText(f.bytes);
      for (const [label, re] of SECRET_PATTERNS) if (re.test(text)) leaks.push(`${f.path} (${label})`);
    }
  }
  add(leaks.length === 0, 'No secrets found', leaks.join(', '));
  return out;
}

export function pluginJson({ name, description, owner, tags }) {
  return JSON.stringify({ name, version: '0.1.0', description, author: { name: owner }, license: 'MIT', keywords: tags }, null, 2) + '\n';
}

export function catalogYaml({ owner, tags, useItWhen, jobs = [], worksWith = [] }) {
  const q = (s) => JSON.stringify(s);
  return `owner: ${q(owner)}\ntier: ${NEW_TIER}\ntags: [${tags.join(', ')}]\njobs: [${jobs.join(', ')}]\nworks_with: [${worksWith.join(', ')}]\nuse_it_when: ${q(useItWhen)}\n`;
}

// The full plugin, as repository paths under plugins/<name>/.
export function buildPluginFiles({ name, description, owner, tags = [], useItWhen, jobs = [], worksWith = [], files }) {
  const base = `plugins/${name}`;
  return [
    { path: `${base}/.claude-plugin/plugin.json`, bytes: textToBytes(pluginJson({ name, description, owner, tags })) },
    { path: `${base}/catalog.yaml`, bytes: textToBytes(catalogYaml({ owner, tags, useItWhen, jobs, worksWith })) },
    ...files.map(f => ({ path: `${base}/skills/${name}/${f.path}`, bytes: f.bytes })),
  ];
}

// Inserts the entry in alphabetical position, and never after the last entry, so the change is only
// added lines: two publishes that land in different places merge without a conflict.
export function addMarketplaceEntry(marketText, { name, description }) {
  const market = JSON.parse(marketText);
  const list = market.plugins;
  if (list.some(p => p.name === name)) throw new Error(`"${name}" is already in marketplace.json`);
  const next = list.findIndex(p => p.name.localeCompare(name) > 0);
  const at = next >= 0 ? next : Math.max(list.length - 1, 0);
  list.splice(at, 0, { name, source: `./plugins/${name}`, description });
  return JSON.stringify(market, null, 2) + '\n';
}

export const tagsFrom = (s) => (s || '').split(',').map(t => t.trim().toLowerCase()).filter(Boolean);

// Finds an open pull request that already proposes plugins/<name>/ (any route, any branch name).
// Returns { number, url } or null. Skips `exclude`; with `before`, only looks at older pull requests.
export async function openPullRequestAdding({ api, repo, name, exclude, before }) {
  const list = await api('GET', `/repos/${repo}/pulls?state=open&sort=created&direction=asc&per_page=100`);
  if (list.status >= 300) throw new Error(`Listing open pull requests failed (HTTP ${list.status})`);
  for (const pr of list.data) {
    if (pr.number === exclude || (before && pr.number >= before)) continue;
    const headRepo = pr.head.repo?.full_name;
    if (!headRepo) continue;
    const r = await api('GET', `/repos/${headRepo}/contents/plugins/${name}/.claude-plugin/plugin.json?ref=${pr.head.sha}`);
    if (r.status === 200) return { number: pr.number, url: pr.html_url };
  }
  return null;
}

// Opens a pull request with the plugin through the GitHub REST API.
// api(method, path, body) must resolve to { status, data }; the browser passes a fetch wrapper, tests pass `gh api`.
// baseBranch defaults to the repository's default branch.
export async function publishToGitHub({ api, repo, plugin, via, baseBranch, onStep = () => {} }) {
  const step = async (label, fn) => { onStep(label, 'run'); const r = await fn(); onStep(label, 'done'); return r; };
  const must = (r, what) => { if (r.status >= 300) throw new Error(`${what} failed (HTTP ${r.status}${r.data?.message ? `: ${r.data.message}` : ''})`); return r.data; };

  const { base, baseSha, baseTree, marketText } = await step('Read the catalog on GitHub', async () => {
    const repoInfo = must(await api('GET', `/repos/${repo}`), 'Reading the repository');
    const base = baseBranch || repoInfo.default_branch;
    const ref = must(await api('GET', `/repos/${repo}/git/ref/heads/${base}`), 'Reading the main branch');
    const commit = must(await api('GET', `/repos/${repo}/git/commits/${ref.object.sha}`), 'Reading the latest commit');
    const market = must(await api('GET', `/repos/${repo}/contents/.claude-plugin/marketplace.json?ref=${base}`), 'Reading marketplace.json');
    const exists = await api('GET', `/repos/${repo}/contents/plugins/${plugin.name}?ref=${base}`);
    if (exists.status === 200) throw new Error(`plugins/${plugin.name} already exists on ${base}`);
    const open = await openPullRequestAdding({ api, repo, name: plugin.name });
    if (open) throw new Error(`"${plugin.name}" is already proposed in pull request #${open.number} (${open.url}); update that one or pick another name`);
    return { base, baseSha: ref.object.sha, baseTree: commit.tree.sha, marketText: bytesToText(fromBase64(market.content)) };
  });

  const files = [
    ...buildPluginFiles(plugin),
    { path: '.claude-plugin/marketplace.json', bytes: textToBytes(addMarketplaceEntry(marketText, plugin)) },
  ];

  const tree = await step(`Upload ${files.length} files`, async () => {
    const entries = [];
    for (const f of files) {
      const blob = must(await api('POST', `/repos/${repo}/git/blobs`, { content: toBase64(f.bytes), encoding: 'base64' }), `Uploading ${f.path}`);
      entries.push({ path: f.path, mode: '100644', type: 'blob', sha: blob.sha });
    }
    return must(await api('POST', `/repos/${repo}/git/trees`, { base_tree: baseTree, tree: entries }), 'Building the file tree');
  });

  const branch = await step('Commit to a new branch', async () => {
    const commit = must(await api('POST', `/repos/${repo}/git/commits`,
      { message: `Add ${plugin.name} skill`, tree: tree.sha, parents: [baseSha] }), 'Creating the commit');
    let branch = `add-skill/${plugin.name}`;
    if ((await api('GET', `/repos/${repo}/git/ref/heads/${branch}`)).status === 200) branch += `-${Date.now().toString(36)}`;
    must(await api('POST', `/repos/${repo}/git/refs`, { ref: `refs/heads/${branch}`, sha: commit.sha }), 'Creating the branch');
    return branch;
  });

  const pr = await step('Open the pull request', async () => must(await api('POST', `/repos/${repo}/pulls`, {
    title: `Add ${plugin.name} skill`,
    head: branch,
    base,
    body: [
      `Published ${via}.`,
      '',
      `- **What it does:** ${plugin.description}`,
      `- **Use it when:** ${plugin.useItWhen}`,
      `- **Owner:** ${plugin.owner}`,
      `- **Tier:** ${NEW_TIER} (new plugins always start here)`,
      `- **Tags:** ${plugin.tags.join(', ') || 'none'}`,
      `- **Helps with:** ${(plugin.jobs || []).map(j => JOBS.find(x => x.id === j)?.label || j).join(', ')}`,
      `- **Works with:** ${(plugin.worksWith || []).map(w => WORKS_WITH.find(x => x.id === w)?.label || w).join(', ')}`,
      `- **Files:** ${plugin.files.map(f => '`' + f.path + '`').join(', ')}`,
      '',
      '- [x] Pre-publish checks passed in the publisher',
      '- [ ] Reviewer tried the skill',
    ].join('\n'),
  }), 'Opening the pull request'));

  return { url: pr.html_url, number: pr.number, branch };
}
