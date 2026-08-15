import { CheckSquare, Square } from 'lucide-react';
import { Button } from '@/components/works/button';
import { onPressKey } from '@/lib/utils';
import { articlePreview, STATUS_CHIP } from '@/views/knowledge/knowledge-view-helpers';

// Shared article list card — used in both the space view and search results.
// KR-038: selectable — shows a checkbox when bulkMode is true.
export function ArticleCard({ art, onClick, selected = false, onToggleSelect, bulkMode = false }) {
  const preview = articlePreview(art);
  const toggle = () => onToggleSelect?.(art.id);
  const handleKeyDown = (event) => {
    if (bulkMode && (event.key === 'Enter' || event.key === ' ')) {
      event.preventDefault();
      toggle();
      return;
    }
    if (!bulkMode) onPressKey(event);
  };
  return (
    <div
      onClick={bulkMode ? toggle : onClick}
      role={bulkMode ? 'checkbox' : 'button'}
      aria-checked={bulkMode ? selected : undefined}
      tabIndex={0}
      onKeyDown={handleKeyDown}
      className={`bg-white dark:bg-neutral-800 border rounded-xl p-4 transition-all focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-inset focus-visible:ring-brand-navy-tint/40 ${
        selected
          ? 'border-brand-navy bg-brand-navy/5 dark:bg-brand-navy/10'
          : 'border-neutral-200 dark:border-neutral-700 hover:border-brand-navy/40 hover:shadow-sm cursor-pointer'
      }`}
    >
      <div className="flex items-start gap-3">
        {/* KR-038: checkbox — shown in bulk mode */}
        {bulkMode && (
          <Button unstyled
            type="button"
            aria-label={selected ? `Deselect ${art.title}` : `Select ${art.title}`}
            onClick={(e) => { e.stopPropagation(); toggle(); }}
            className="mt-0.5 flex-shrink-0 text-neutral-400 hover:text-brand-navy focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-brand-navy-tint/40 rounded"
          >
            {selected
              ? <CheckSquare className="h-4 w-4 text-brand-navy" aria-hidden="true" />
              : <Square className="h-4 w-4" aria-hidden="true" />}
          </Button>
        )}
        <div
          className="flex-1 min-w-0"
          onClick={bulkMode ? undefined : onClick}
          role="presentation"
        >
          <p className="font-semibold text-sm text-neutral-900 dark:text-neutral-100 truncate">{art.title}</p>
          {preview && (
            <p className="text-xs text-neutral-500 mt-0.5 line-clamp-2">{preview}</p>
          )}
          <div className="flex items-center gap-3 mt-2">
            <span className="text-xs text-neutral-500">v{art.versionNumber || 1} · {art.authorName || 'Unknown'}</span>
            {art.updatedAt && (
              <span className="text-xs text-neutral-500">{new Date(art.updatedAt).toLocaleDateString()}</span>
            )}
          </div>
        </div>
        <div className="flex flex-col items-end gap-1.5 flex-shrink-0">
          <span className={`text-xs font-semibold px-2 py-0.5 rounded ${STATUS_CHIP[art.status] || STATUS_CHIP.DRAFT}`}>
            {art.status || 'DRAFT'}
          </span>
          <span className="text-xs bg-brand-navy/10 text-brand-navy px-1.5 py-0.5 rounded font-mono">
            {art.templateType || 'KB'}
          </span>
        </div>
      </div>
    </div>
  );
}
