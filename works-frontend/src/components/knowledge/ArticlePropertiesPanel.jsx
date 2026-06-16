// KR-011 — Collapsible article metadata panel shown to the right of the article editor.
// Displays: owner/author, template type, status, version (always 1 for now), word count,
// last-updated date. Read-only in read mode. Cmd+Shift+P toggles.
// KR-075: "Auto-tag" button added at the bottom of the Tags section.
import { useState } from 'react';
import { X, Sparkles } from 'lucide-react';
import { TagSuggestionChips } from '@/components/knowledge/TagSuggestionChips';
import { knowledgeAi } from '@/lib/knowledge-ai';

// readOnly is accepted as prop for future use (read-mode vs edit-mode styling). Currently unused.
// eslint-disable-next-line no-unused-vars
export function ArticlePropertiesPanel({ article, wordCount, onClose, readOnly = false,
  workspaceId, articleText, onAcceptTag }) {
  const [suggestions, setSuggestions] = useState([]);
  const [tagBusy, setTagBusy] = useState(false);

  if (!article) return null;

  const rows = [
    { label: 'Author',       value: article.authorId  || '—' },
    { label: 'Template',     value: article.templateType || '—' },
    { label: 'Status',       value: article.status    || 'DRAFT' },
    { label: 'Version',      value: '1' },
    { label: 'Word count',   value: wordCount ?? '—' },
    { label: 'Last updated', value: article.updatedAt ? new Date(article.updatedAt).toLocaleDateString() : '—' },
  ];

  const handleAutoTag = async () => {
    if (!workspaceId || !articleText?.trim() || tagBusy) return;
    setTagBusy(true);
    try {
      const res = await knowledgeAi.suggestTags(workspaceId, articleText);
      setSuggestions(Array.isArray(res) ? res : []);
    } catch {
      /* non-fatal */
    } finally {
      setTagBusy(false);
    }
  };

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

      {/* KR-075: Auto-tag section — only shown in edit mode when workspaceId is available */}
      {workspaceId && !readOnly && (
        <div className="mt-4 pt-3 border-t border-neutral-200 dark:border-neutral-700 space-y-2">
          <div className="flex items-center justify-between">
            <span className="text-neutral-500 dark:text-neutral-400">Tags</span>
            <button
              type="button"
              onClick={handleAutoTag}
              disabled={tagBusy}
              aria-label="Auto-suggest tags using AI"
              className="inline-flex items-center gap-1 text-xs text-brand-navy hover:text-brand-navy-tint disabled:opacity-50 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-brand-navy-tint/40 rounded"
            >
              <Sparkles aria-hidden="true" className="h-3 w-3" />
              {tagBusy ? 'Suggesting…' : 'Auto-tag'}
            </button>
          </div>
          {suggestions.length > 0 && (
            <TagSuggestionChips
              suggestions={suggestions}
              onAccept={(name) => {
                onAcceptTag?.(name);
                setSuggestions((prev) => prev.filter((s) => s !== name));
              }}
              onDismiss={(name) => setSuggestions((prev) => prev.filter((s) => s !== name))}
            />
          )}
        </div>
      )}
    </aside>
  );
}
