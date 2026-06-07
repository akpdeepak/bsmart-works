// Keyboard shortcuts (iteration 18, Cap S — "Comprehensive shortcuts for every common action.
// Customizable per user."). The default bindings live here; per-user overrides are stored on the
// server (/api/v1/shortcuts) and merged on top. Pure + dependency-free so the merge/format/match
// logic is unit-tested in isolation.

// The canonical action catalogue. `keys` is the default binding; `g` sequences are "press g then x".
export const DEFAULT_SHORTCUTS = [
  { id: 'command-palette', keys: 'mod+k', label: 'Open command palette', group: 'General' },
  { id: 'search', keys: '/', label: 'Focus search', group: 'General' },
  { id: 'create-item', keys: 'c', label: 'Create work item', group: 'General' },
  { id: 'shortcuts-help', keys: '?', label: 'Show keyboard shortcuts', group: 'General' },
  { id: 'go-dashboard', keys: 'g h', label: 'Go to dashboard', group: 'Navigate' },
  { id: 'go-board', keys: 'g b', label: 'Go to board', group: 'Navigate' },
  { id: 'go-backlog', keys: 'g l', label: 'Go to backlog', group: 'Navigate' },
  { id: 'go-sprint', keys: 'g s', label: 'Go to sprint', group: 'Navigate' },
  { id: 'go-myworks', keys: 'g m', label: 'Go to my work', group: 'Navigate' },
  { id: 'go-notifications', keys: 'g n', label: 'Go to notifications', group: 'Navigate' },
  { id: 'go-projects', keys: 'g p', label: 'Go to projects', group: 'Navigate' },
  { id: 'go-reports', keys: 'g r', label: 'Go to reports', group: 'Navigate' },
  { id: 'go-knowledge', keys: 'g k', label: 'Go to knowledge', group: 'Navigate' },
];

// Merge user overrides ({ actionId: keys }) onto the defaults, keeping catalogue order + metadata.
export function mergeShortcuts(overrides = {}) {
  return DEFAULT_SHORTCUTS.map((s) =>
    Object.prototype.hasOwnProperty.call(overrides, s.id)
      ? { ...s, keys: overrides[s.id], customized: true }
      : s,
  );
}

// Render a binding for display: "mod+k" → "⌘K" on mac, "Ctrl+K" elsewhere; "g b" → "G then B".
export function formatBinding(keys, isMac = detectMac()) {
  if (!keys) return '';
  if (keys.includes(' ')) {
    return keys.split(' ').map((k) => k.toUpperCase()).join(' then ');
  }
  return keys
    .split('+')
    .map((part) => {
      if (part === 'mod') return isMac ? '⌘' : 'Ctrl';
      if (part === 'shift') return isMac ? '⇧' : 'Shift';
      if (part === 'alt') return isMac ? '⌥' : 'Alt';
      return part.length === 1 ? part.toUpperCase() : part;
    })
    .join(isMac ? '' : '+');
}

export function detectMac() {
  if (typeof navigator === 'undefined') return false;
  return /Mac|iPhone|iPad/i.test(navigator.platform || navigator.userAgent || '');
}

// Does a keydown event match a single-key (non-sequence, non-modifier) binding? Used by the global
// handler for the simple bindings; `mod+k` and `g x` sequences are handled specially in App.
export function matchesSimple(binding, event) {
  if (!binding || binding.includes(' ') || binding.includes('+')) return false;
  return event.key === binding;
}
