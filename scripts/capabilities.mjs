// Works out what a plugin can do from its files, for the "What it can do" label.
// Levels, lowest to highest: instructions < tools (pre-approved tools) < code (anything that executes).
import { parseFrontmatter } from '../site/publish-core.mjs';

const LEVELS = {
  instructions: { rank: 0, label: 'Instructions only', summary: 'Markdown instructions only. No bundled code; Claude asks before running any command.' },
  tools: { rank: 1, label: 'Pre-approved tools', summary: 'Lets Claude use some tools without asking while a skill runs. No bundled code.' },
  code: { rank: 2, label: 'Runs code', summary: 'Includes code that can run on your machine. Read it before installing.' },
};
const SCRIPT_EXT = /\.(sh|bash|zsh|ps1|psm1|bat|cmd|py|js|mjs|cjs|ts|rb|pl|php|go|exe)$/i;

// files: [{ path, content }] relative to the plugin root (content null for binaries); manifest: plugin.json object.
export function capabilities(files, manifest = {}, pluginName = manifest.name) {
  let level = 'instructions';
  const raise = (l) => { if (LEVELS[l].rank > LEVELS[level].rank) level = l; };
  const items = [];
  const skills = [];

  for (const f of files.filter(f => /^skills\/[^/]+\/SKILL\.md$/.test(f.path))) {
    const dirName = f.path.split('/')[1];
    const fm = parseFrontmatter(f.content || '').fields;
    const name = fm.name || dirName;
    const manualOnly = /^(true|yes|on|1)$/i.test(fm['disable-model-invocation'] || '');
    skills.push({ name, invocation: `/${pluginName}:${name}`, manualOnly });
    if ('allowed-tools' in fm) {
      raise('tools');
      items.push({ kind: 'tools', title: `Pre-approved tools in ${name}`, detail: fm['allowed-tools'] || 'Listed in the SKILL.md frontmatter' });
    }
  }
  if (skills.length) {
    items.unshift({
      kind: 'instructions',
      title: `${skills.length} skill${skills.length === 1 ? '' : 's'}`,
      detail: skills.map(s => `${s.invocation}${s.manualOnly ? ' (only when you call it)' : ''}`).join(', '),
    });
  }

  const under = (dir) => files.filter(f => f.path.startsWith(dir + '/'));
  const agents = under('agents').filter(f => f.path.endsWith('.md'));
  if (agents.length) items.push({ kind: 'instructions', title: `${agents.length} agent${agents.length === 1 ? '' : 's'}`, detail: agents.map(f => f.path).join(', ') });
  const commands = under('commands').filter(f => f.path.endsWith('.md'));
  if (commands.length) items.push({ kind: 'instructions', title: `${commands.length} command${commands.length === 1 ? '' : 's'}`, detail: commands.map(f => f.path).join(', ') });

  const has = (p) => files.some(f => f.path === p);
  if (has('hooks/hooks.json') || manifest.hooks) {
    raise('code');
    items.push({ kind: 'code', title: 'Hooks', detail: 'Runs commands automatically on Claude Code events' });
  }
  if (has('.mcp.json') || manifest.mcpServers) {
    raise('code');
    let names = [];
    try { names = Object.keys(JSON.parse(files.find(f => f.path === '.mcp.json')?.content || '{}').mcpServers || {}); } catch {}
    if (manifest.mcpServers && typeof manifest.mcpServers === 'object' && !Array.isArray(manifest.mcpServers)) names.push(...Object.keys(manifest.mcpServers));
    items.push({ kind: 'code', title: 'MCP servers', detail: names.length ? names.join(', ') : 'Declared by the plugin' });
  }
  if (has('.lsp.json') || manifest.lspServers) {
    raise('code');
    items.push({ kind: 'code', title: 'Language servers', detail: 'Starts a language server process' });
  }
  const bins = under('bin');
  if (bins.length) {
    raise('code');
    items.push({ kind: 'code', title: 'Executables on PATH', detail: bins.map(f => f.path).join(', ') });
  }
  const scripts = files.filter(f => SCRIPT_EXT.test(f.path) && !f.path.startsWith('bin/') && !f.path.startsWith('.claude-plugin/'));
  if (scripts.length) {
    raise('code');
    items.push({ kind: 'code', title: 'Bundled scripts', detail: scripts.map(f => f.path).join(', ') });
  }

  return { level, label: LEVELS[level].label, summary: LEVELS[level].summary, items, skills };
}
