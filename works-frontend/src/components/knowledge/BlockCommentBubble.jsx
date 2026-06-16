// KR-025 — Inline comment bubble shown on block hover (edit mode) / always visible (read mode).
// Shows unresolved comment count; clicking opens the BlockCommentsPanel for this block.
import { MessageSquare } from 'lucide-react';
import { cn } from '@/lib/utils';

/**
 * @param {{ count: number, onClick: () => void, alwaysVisible?: boolean }} props
 */
export function BlockCommentBubble({ count, onClick, alwaysVisible = false }) {
  return (
    <button
      type="button"
      aria-label={count > 0 ? `${count} comment${count !== 1 ? 's' : ''} on this block` : 'Add comment to this block'}
      title={count > 0 ? `${count} unresolved comment${count !== 1 ? 's' : ''}` : 'Comment'}
      onClick={onClick}
      className={cn(
        'flex items-center gap-1 text-xs rounded-md px-1.5 py-0.5 transition-colors',
        'focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-brand-navy-tint/40',
        count > 0
          ? 'text-semantic-warning bg-semantic-warning/10 hover:bg-semantic-warning/20'
          : 'text-neutral-400 hover:text-brand-navy hover:bg-neutral-100 dark:hover:bg-neutral-800',
        !alwaysVisible && 'opacity-0 group-hover:opacity-100 focus-visible:opacity-100',
      )}
    >
      <MessageSquare className="h-3 w-3" aria-hidden="true" />
      {count > 0 && <span>{count}</span>}
    </button>
  );
}
