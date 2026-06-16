// KR-011 — Collapsible article metadata panel shown to the right of the article editor.
// Displays: owner/author, template type, status, version (always 1 for now), word count,
// last-updated date. Read-only in read mode. Cmd+Shift+P toggles.
import { X } from 'lucide-react';

// readOnly is accepted as prop for future use (read-mode vs edit-mode styling). Currently unused.
// eslint-disable-next-line no-unused-vars
export function ArticlePropertiesPanel({ article, wordCount, onClose, readOnly = false }) {
  if (!article) return null;

  const rows = [
    { label: 'Author',       value: article.authorId  || '—' },
    { label: 'Template',     value: article.templateType || '—' },
    { label: 'Status',       value: article.status    || 'DRAFT' },
    { label: 'Version',      value: '1' },
    { label: 'Word count',   value: wordCount ?? '—' },
    { label: 'Last updated', value: article.updatedAt ? new Date(article.updatedAt).toLocaleDateString() : '—' },
  ];

  return (
    <aside
      aria-label="Article properties"
      className="w-56 flex-shrink-0 border-l border-neutral-200 dark:border-neutral-700 bg-neutral-50 dark:bg-neutral-900 p-4 text-xs overflow-y-auto"
    >
      <div className="flex items-center justify-between mb-3">
        <h2 className="text-xs font-semibold uppercase tracking-wide text-neutral-500 dark:text-neutral-400">Properties</h2>
        <button type="button" aria-label="Close properties panel" onClick={onClose}
          className="p-0.5 rounded hover:bg-neutral-200 dark:hover:bg-neutral-700 text-neutral-400">
          <X className="h-3.5 w-3.5" />
        </button>
      </div>
      <dl className="space-y-2">
        {rows.map(({ label, value }) => (
          <div key={label}>
            <dt className="text-neutral-500 dark:text-neutral-400">{label}</dt>
            <dd className="font-medium text-neutral-900 dark:text-neutral-100 mt-0.5">{String(value)}</dd>
          </div>
        ))}
      </dl>
    </aside>
  );
}
