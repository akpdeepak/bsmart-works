// Pure, component-free helpers for the Customization surface. Kept in a plain .js module (separate
// from shared.jsx) so the component files stay component-only for react-refresh / fast refresh.

export function tabClass(active) {
  return [
    'inline-flex items-center gap-1.5 border-b-2 px-3 py-2 text-sm font-medium transition-colors',
    active
      ? 'border-brand-navy text-brand-navy dark:text-neutral-100'
      : 'border-transparent text-neutral-600 hover:text-neutral-900 dark:hover:text-neutral-200',
  ].join(' ');
}

export function pretty(json) {
  try { return JSON.stringify(JSON.parse(json || '{}'), null, 2); } catch { return json || '{}'; }
}

export function rid(prefix) {
  return `${prefix}-${Math.random().toString(36).slice(2, 8)}`;
}

export function navigatorDownload(filename, content) {
  const blob = new Blob([content], { type: 'text/plain' });
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url;
  a.download = filename;
  a.click();
  URL.revokeObjectURL(url);
}
