// bSmart Works — Universal Customization Engine client (iteration 17, Cap R). Every call goes
// through the single apiClient (CLAUDE.md §3); this module just shapes the /config endpoints. The
// whole customization surface — centralized settings, version history, diff, rollback, templates,
// sandbox, JSON/YAML import-export, impact analysis, and the extension-point catalog — funnels
// through here. Writes are gated server-side by manage_workspace and (for locked settings) owner
// tier (RB-40 §1) — the UI hides controls, the API is the real guard.

import { api } from '@/lib/apiClient';

const ws = (workspaceId) => encodeURIComponent(workspaceId);

export const configClient = {
  // Live settings
  settings: (workspaceId) => api.send(`/config/settings?workspaceId=${ws(workspaceId)}`),
  updateSettings: (workspaceId, document, summary) =>
    api.send(`/config/settings?workspaceId=${ws(workspaceId)}`, {
      method: 'PUT',
      body: { document, summary },
    }),

  // Versioning / diff / rollback
  versions: (workspaceId) => api.send(`/config/versions?workspaceId=${ws(workspaceId)}`),
  diff: (workspaceId, from, to) =>
    api.send(
      `/config/diff?workspaceId=${ws(workspaceId)}` +
        `${from != null ? `&from=${from}` : ''}${to != null ? `&to=${to}` : ''}`,
    ),
  rollback: (workspaceId, version) =>
    api.send(`/config/rollback?workspaceId=${ws(workspaceId)}`, { method: 'POST', body: { version } }),

  // Impact analysis (preview, no mutation)
  impact: (workspaceId, document) =>
    api.send(`/config/impact?workspaceId=${ws(workspaceId)}`, { method: 'POST', body: { document } }),

  // Import / export
  export: (workspaceId, format = 'json') =>
    api.send(`/config/export?workspaceId=${ws(workspaceId)}&format=${encodeURIComponent(format)}`),
  import: (workspaceId, content, format, summary) =>
    api.send(`/config/import?workspaceId=${ws(workspaceId)}`, {
      method: 'POST',
      body: { content, format, summary },
    }),

  // Templates
  templates: (workspaceId) => api.send(`/config/templates?workspaceId=${ws(workspaceId)}`),
  saveTemplate: (workspaceId, name, description, shareable) =>
    api.send(`/config/templates?workspaceId=${ws(workspaceId)}`, {
      method: 'POST',
      body: { name, description, shareable },
    }),
  applyTemplate: (workspaceId, templateId) =>
    api.send(`/config/templates/${encodeURIComponent(templateId)}/apply?workspaceId=${ws(workspaceId)}`, {
      method: 'POST',
    }),
  deleteTemplate: (workspaceId, templateId) =>
    api.send(`/config/templates/${encodeURIComponent(templateId)}?workspaceId=${ws(workspaceId)}`, {
      method: 'DELETE',
    }),

  // Sandboxes
  sandboxes: (workspaceId) => api.send(`/config/sandboxes?workspaceId=${ws(workspaceId)}`),
  sandbox: (workspaceId, id) =>
    api.send(`/config/sandboxes/${encodeURIComponent(id)}?workspaceId=${ws(workspaceId)}`),
  createSandbox: (workspaceId, name) =>
    api.send(`/config/sandboxes?workspaceId=${ws(workspaceId)}`, { method: 'POST', body: { name } }),
  updateSandbox: (workspaceId, id, document) =>
    api.send(`/config/sandboxes/${encodeURIComponent(id)}?workspaceId=${ws(workspaceId)}`, {
      method: 'PUT',
      body: { document },
    }),
  promoteSandbox: (workspaceId, id) =>
    api.send(`/config/sandboxes/${encodeURIComponent(id)}/promote?workspaceId=${ws(workspaceId)}`, {
      method: 'POST',
    }),
  discardSandbox: (workspaceId, id) =>
    api.send(`/config/sandboxes/${encodeURIComponent(id)}/discard?workspaceId=${ws(workspaceId)}`, {
      method: 'POST',
    }),

  // Extension-point catalog (definitions only; execution is sandboxed/out of scope)
  extensionPoints: (workspaceId) =>
    api.send(`/config/extension-points?workspaceId=${ws(workspaceId)}`),
};

// The document sections the engine versions/diffs/templates as one unit.
export const CONFIG_SECTIONS = ['settings', 'forms', 'pages', 'extensions', 'locks'];

// Parse a config document string defensively — the UI must never crash on a malformed blob.
export function parseDocument(documentJson) {
  try {
    const doc = JSON.parse(documentJson || '{}');
    return doc && typeof doc === 'object' ? doc : {};
  } catch {
    return {};
  }
}

// The lockable setting paths surfaced as toggles in the Settings tab.
export const LOCKABLE_PATHS = [
  'settings.branding',
  'settings.locale',
  'settings.timezone',
  'settings.workingCalendar',
  'settings.defaults',
];

// ── Pure document helpers (kept here, not in the view, so the component file only exports
//    components — react-refresh — and the helpers stay independently unit-testable). ──────────

// Fill the five document sections so the editor never reads undefined.
export function normalizeDoc(doc) {
  return {
    settings: doc.settings || {},
    forms: Array.isArray(doc.forms) ? doc.forms : [],
    pages: Array.isArray(doc.pages) ? doc.pages : [],
    extensions: Array.isArray(doc.extensions) ? doc.extensions : [],
    locks: Array.isArray(doc.locks) ? doc.locks : [],
  };
}

// Immutably set a dot-path value, cloning each touched level.
export function writePath(obj, path, value) {
  const keys = path.split('.');
  const next = Array.isArray(obj) ? [...obj] : { ...obj };
  let cursor = next;
  for (let i = 0; i < keys.length - 1; i += 1) {
    const k = keys[i];
    cursor[k] = cursor[k] && typeof cursor[k] === 'object' ? { ...cursor[k] } : {};
    cursor = cursor[k];
  }
  cursor[keys[keys.length - 1]] = value;
  return next;
}

// Add a value to an array if absent, remove it if present.
export function toggleIn(arr, value) {
  const list = Array.isArray(arr) ? arr : [];
  return list.includes(value) ? list.filter((v) => v !== value) : [...list, value];
}
