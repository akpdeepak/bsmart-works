// KR-017 — Status badge with click-to-transition support.
// Renders a colored pill. When `onClick` is provided the badge is
// a button; otherwise it is a presentational span (read-mode list cards).
import { cn } from '@/lib/utils';

export const STATUS_COLORS = {
  DRAFT:     'bg-neutral-100 dark:bg-neutral-700 text-neutral-600 dark:text-neutral-300',
  IN_REVIEW: 'bg-semantic-warning/10 text-semantic-warning',
  PUBLISHED: 'bg-semantic-success/10 text-semantic-success',
  ARCHIVED:  'bg-neutral-200 dark:bg-neutral-600 text-neutral-400',
};

export const STATUS_LABELS = {
  DRAFT:     'Draft',
  IN_REVIEW: 'In Review',
  PUBLISHED: 'Published',
  ARCHIVED:  'Archived',
};

/**
 * @param {{ status: string, onClick?: () => void, className?: string }} props
 */
export function StatusBadge({ status, onClick, className }) {
  const s = status || 'DRAFT';
  const label = STATUS_LABELS[s] || s;
  const colorCls = STATUS_COLORS[s] || STATUS_COLORS.DRAFT;
  const base = cn('text-xs font-semibold px-2 py-0.5 rounded', colorCls, className);

  if (onClick) {
    return (
      <button
        type="button"
        onClick={onClick}
        aria-label={`Status: ${label}. Click to change.`}
        title="Change status"
        className={cn(base, 'cursor-pointer hover:ring-2 hover:ring-current/30 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-brand-navy-tint/40 transition-shadow')}
      >
        {label}
      </button>
    );
  }

  return <span className={base}>{label}</span>;
}
