// Shared helpers for the catalog scripts. No dependencies.
import { readFileSync, existsSync } from 'node:fs';
import { join, dirname } from 'node:path';
import { fileURLToPath } from 'node:url';

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

export { existsSync, join };
