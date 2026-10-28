// Shared helpers for the catalog scripts. No dependencies.
import { readFileSync, existsSync } from 'node:fs';
import { join, dirname } from 'node:path';
import { fileURLToPath } from 'node:url';
import { execFileSync } from 'node:child_process';

export const ROOT = join(dirname(fileURLToPath(import.meta.url)), '..');
export const MARKETPLACE = join(ROOT, '.claude-plugin', 'marketplace.json');
// Tiers, name rule and vocabularies live in the publisher module the browser also uses.
export { TIERS, NEW_TIER, NAME_RE, JOBS, WORKS_WITH } from '../site/publish-core.mjs';

export function readJson(path) {
  return JSON.parse(readFileSync(path, 'utf8'));
}

// Minimal YAML reader for catalog.yaml: flat "key: value" pairs, inline
// lists "[a, b]", block lists "- a", quoted strings and # comments.
export function parseYaml(text) {
  const out = {};
  let listKey = null;
  for (const raw of text.split(/\r?\n/)) {
    const line = raw.replace(/\s+#.*$/, '').replace(/^#.*$/, '');
    if (!line.trim()) continue;
    const item = line.match(/^\s+-\s+(.*)$/) || line.match(/^-\s+(.*)$/);
    if (item && listKey) {
      out[listKey].push(unquote(item[1].trim()));
      continue;
    }
    const kv = line.match(/^([A-Za-z_][\w-]*):\s*(.*)$/);
    if (!kv) throw new Error(`Cannot parse line: "${raw}"`);
    const [, key, value] = kv;
    listKey = null;
    if (value === '') {
      out[key] = [];
      listKey = key;
    } else if (value.startsWith('[') && value.endsWith(']')) {
      out[key] = value.slice(1, -1).split(',').map(s => unquote(s.trim())).filter(Boolean);
    } else {
      out[key] = unquote(value.trim());
    }
  }
  return out;
}

function unquote(s) {
  if (s.length > 1 && s.startsWith('"') && s.endsWith('"')) return JSON.parse(s);
  if (s.length > 1 && s.startsWith("'") && s.endsWith("'")) return s.slice(1, -1).replace(/''/g, "'");
  return s;
}

export function readYaml(path) {
  return parseYaml(readFileSync(path, 'utf8'));
}

export function pluginDir(entry) {
  return join(ROOT, entry.source.replace(/^\.\//, ''));
}

// Semantic versions: true if a is higher than b (x.y.z; anything after - or + is ignored).
export function isNewerVersion(a, b) {
  const [x, y] = [a, b].map(v => String(v).split(/[.+-]/).slice(0, 3).map(Number));
  for (let i = 0; i < 3; i++) if ((x[i] || 0) !== (y[i] || 0)) return (x[i] || 0) > (y[i] || 0);
  return false;
}
// The version rule: files of an existing plugin changed (catalog.yaml aside) but the version did not go up.
// changed: paths changed since the base branch; before: version on the base branch. Returns the problem or null.
export function versionBumpProblem({ changed, before, version }) {
  const files = changed.filter(f => f && !f.endsWith('/catalog.yaml') && f !== 'catalog.yaml');
  return files.length && !isNewerVersion(version, before) ? { before, changed: files } : null;
}
export const nextPatch =(v) => { const [a = 0, b = 0, c = 0] = String(v).split(/[.+-]/).map(Number); return `${a}.${b}.${c + 1}`; };

// The publisher's api(method, path) interface over the gh CLI (GH_TOKEN in Actions, your login locally).
export function ghApi(method, path) {
  try {
    const out = execFileSync('gh', ['api', '-X', method, path], { encoding: 'utf8', stdio: ['ignore', 'pipe', 'pipe'], maxBuffer: 32 << 20 });
    return { status: 200, data: out ? JSON.parse(out) : null };
  } catch (e) {
    const status = Number((e.stderr || '').match(/HTTP (\d{3})/)?.[1]);
    if (status) return { status, data: null };
    throw e;
  }
}

export { existsSync, join };
