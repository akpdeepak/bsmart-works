#!/usr/bin/env node
// bSmart Works CLI (iteration 14, Cap U) — power-user productivity from the terminal.
// Unix conventions: stdin/stdout, exit codes, --flags, $WORKS_TOKEN env override, no dependencies.
// Every command goes through the same /api/v1 REST surface the web UI and IDE extensions use; the
// backend enforces RBAC, tenant scoping and the AI Control Plane — the CLI is a thin client.

import { readFileSync, writeFileSync, mkdirSync, existsSync } from 'node:fs';
import { homedir } from 'node:os';
import { join, dirname } from 'node:path';

const CONFIG_PATH = join(homedir(), '.works', 'config.json');
const DEFAULT_BASE = process.env.WORKS_API_BASE || 'http://localhost:8080/api/v1';

function loadConfig() {
  try {
    const cfg = JSON.parse(readFileSync(CONFIG_PATH, 'utf8'));
    return { apiBase: DEFAULT_BASE, ...cfg };
  } catch {
    return { apiBase: DEFAULT_BASE, token: process.env.WORKS_TOKEN || null, workspaceId: process.env.WORKS_WORKSPACE || null };
  }
}

function saveConfig(cfg) {
  mkdirSync(dirname(CONFIG_PATH), { recursive: true });
  writeFileSync(CONFIG_PATH, JSON.stringify(cfg, null, 2));
}

function die(msg, code = 1) {
  process.stderr.write(`works: ${msg}\n`);
  process.exit(code);
}

async function apiFetch(cfg, path, { method = 'GET', body } = {}) {
  const token = process.env.WORKS_TOKEN || cfg.token;
  if (!token) die('not logged in — run `works login --token <jwt>` (or set $WORKS_TOKEN)');
  const res = await fetch(`${cfg.apiBase}${path}`, {
    method,
    headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${token}` },
    body: body === undefined ? undefined : JSON.stringify(body),
  });
  const text = await res.text();
  let json = null;
  try { json = text ? JSON.parse(text) : null; } catch { /* non-JSON body */ }
  if (!res.ok) {
    const message = (json && (json.message || json.error)) || `HTTP ${res.status}`;
    die(message, 2);
  }
  return json;
}

// Parse `--flag value` / `--flag=value` / `-m value` pairs out of argv, returning [positionals, flags].
export function parseArgs(argv, aliases = {}) {
  const positionals = [];
  const flags = {};
  for (let i = 0; i < argv.length; i += 1) {
    let a = argv[i];
    if (a.startsWith('--') || a.startsWith('-')) {
      let key = a.replace(/^-+/, '');
      let val = true;
      if (key.includes('=')) { [key, val] = key.split(/=(.*)/s); }
      else if (argv[i + 1] !== undefined && !argv[i + 1].startsWith('-')) { val = argv[i + 1]; i += 1; }
      flags[aliases[key] || key] = val;
    } else {
      positionals.push(a);
    }
  }
  return [positionals, flags];
}

function requireWorkspace(cfg, flags) {
  const ws = flags.workspace || cfg.workspaceId;
  if (!ws) die('no workspace — pass --workspace <id> or run `works login --workspace <id>`');
  return ws;
}

const COMMANDS = {
  async login(cfg, argv) {
    const [, flags] = parseArgs(argv);
    if (!flags.token && !process.env.WORKS_TOKEN) die('login needs --token <jwt>');
    const next = {
      apiBase: flags.base || cfg.apiBase,
      token: flags.token || process.env.WORKS_TOKEN || cfg.token,
      workspaceId: flags.workspace || cfg.workspaceId,
    };
    saveConfig(next);
    process.stdout.write(`Logged in. Config saved to ${CONFIG_PATH}\n`);
  },

  async mine(cfg, argv) {
    const [, flags] = parseArgs(argv);
    const ws = requireWorkspace(cfg, flags);
    const home = await apiFetch(cfg, `/developer-workspace?workspaceId=${encodeURIComponent(ws)}`);
    const items = home.todaysWork || [];
    if (!items.length) { process.stdout.write('No in-progress items assigned to you.\n'); return; }
    items.forEach((it) => process.stdout.write(`  ${pad(it.id, 10)} ${pad(it.status, 14)} ${it.title}\n`));
  },

  async review(cfg, argv) {
    const [, flags] = parseArgs(argv);
    const ws = requireWorkspace(cfg, flags);
    const home = await apiFetch(cfg, `/developer-workspace?workspaceId=${encodeURIComponent(ws)}`);
    const q = home.reviewQueue || [];
    if (!q.length) { process.stdout.write('No PRs waiting on your review.\n'); return; }
    q.forEach((pr) => process.stdout.write(`  ★${pad(String(pr.urgencyScore), 4)} #${pad(String(pr.number), 5)} ${pr.title}  (${pr.authorName})\n`));
  },

  async standup(cfg, argv) {
    const [, flags] = parseArgs(argv);
    const ws = requireWorkspace(cfg, flags);
    const s = await apiFetch(cfg, `/developer-workspace/standup?workspaceId=${encodeURIComponent(ws)}`, { method: 'POST', body: {} });
    process.stdout.write(`${s.draft}\n`);
  },

  async velocity(cfg, argv) {
    const [, flags] = parseArgs(argv);
    const ws = requireWorkspace(cfg, flags);
    const v = await apiFetch(cfg, `/developer-workspace/velocity?workspaceId=${encodeURIComponent(ws)}`);
    process.stdout.write(`(private — only you)\n`);
    process.stdout.write(`  completion rate : ${v.completionRate}%\n`);
    process.stdout.write(`  avg cycle time  : ${v.avgCycleTimeDays}d\n`);
    process.stdout.write(`  completed (14d) : ${v.throughputLast14Days}\n`);
    process.stdout.write(`  assigned        : ${v.assigned}\n`);
  },

  async view(cfg, argv) {
    const [pos] = parseArgs(argv);
    const id = pos[0];
    if (!id) die('usage: works view <ITEM-ID>');
    const it = await apiFetch(cfg, `/work-items/${encodeURIComponent(id)}`);
    process.stdout.write(`${it.id}  [${it.status}]  ${it.type}  ${it.priority || ''}\n${it.title}\n\n${it.description || ''}\n`);
  },

  async transition(cfg, argv) {
    const [pos] = parseArgs(argv);
    const [id, ...rest] = pos;
    const status = rest.join(' ');
    if (!id || !status) die('usage: works transition <ITEM-ID> <status>');
    const it = await apiFetch(cfg, `/work-items/${encodeURIComponent(id)}`);
    const updated = await apiFetch(cfg, `/work-items/${encodeURIComponent(id)}`, {
      method: 'PUT',
      body: { ...it, status, version: it.version },
    });
    process.stdout.write(`${updated.id} → ${updated.status}\n`);
  },

  async link(cfg, argv) {
    const [pos, flags] = parseArgs(argv, { m: 'message' });
    const id = pos[0];
    if (!id) die('usage: works link <ITEM-ID> --kind commit --ref <sha> -m "message"');
    const link = await apiFetch(cfg, '/code/links', {
      method: 'POST',
      body: {
        workItemId: id,
        kind: (flags.kind || 'COMMIT').toUpperCase(),
        ref: flags.ref || die('--ref is required'),
        message: flags.message || null,
        url: flags.url || null,
        filesTouched: flags.files || null,
      },
    });
    process.stdout.write(`Linked ${link.kind} ${link.ref} to ${id}\n`);
  },

  async focus(cfg, argv) {
    const [pos, flags] = parseArgs(argv);
    const ws = requireWorkspace(cfg, flags);
    const sub = pos[0];
    if (sub !== 'start') die('usage: works focus start "<title>" --mins 90 [--no-p0]');
    const mins = Number(flags.mins || 60);
    const now = new Date();
    const end = new Date(now.getTime() + mins * 60000);
    const block = await apiFetch(cfg, `/focus-blocks?workspaceId=${encodeURIComponent(ws)}`, {
      method: 'POST',
      body: {
        title: pos[1] || 'Focus',
        startsAt: now.toISOString(),
        endsAt: end.toISOString(),
        allowP0: flags['no-p0'] ? false : true,
      },
    });
    process.stdout.write(`Focus block scheduled until ${new Date(block.endsAt).toLocaleTimeString()} (id ${block.id})\n`);
  },

  help() {
    process.stdout.write(USAGE);
  },
};

const USAGE = `works — bSmart Works terminal interface (iteration 14, Cap U)

Usage: works <command> [args] [--flags]

Commands:
  login --token <jwt> [--workspace <id>] [--base <url>]   Save credentials to ~/.works/config.json
  mine [--workspace <id>]                                 Your in-progress work items
  review [--workspace <id>]                               Your code-review queue (urgency-ranked)
  standup [--workspace <id>]                              Draft your standup from work + git activity
  velocity [--workspace <id>]                             Your PRIVATE personal velocity
  view <ITEM-ID>                                          Show a work item
  transition <ITEM-ID> <status>                           Move a work item to a new status
  link <ITEM-ID> --kind commit --ref <sha> -m "msg"       Link a commit/branch/PR to a work item
  focus start "<title>" --mins 90 [--no-p0]               Schedule a focus block now
  help                                                    Show this help

Env: WORKS_TOKEN, WORKS_WORKSPACE, WORKS_API_BASE override the saved config.
`;

export function pad(s, n) { return String(s).padEnd(n); }

async function main() {
  const [, , command, ...argv] = process.argv;
  const cfg = loadConfig();
  const fn = COMMANDS[command] || (command ? null : COMMANDS.help);
  if (!fn) die(`unknown command '${command}'. Run \`works help\`.`);
  try {
    await fn(cfg, argv);
  } catch (e) {
    die(e.message || String(e), 2);
  }
}

// Run only when executed directly (so the module can be imported by tests).
import { pathToFileURL } from 'node:url';
if (process.argv[1] && import.meta.url === pathToFileURL(process.argv[1]).href) {
  main();
}
