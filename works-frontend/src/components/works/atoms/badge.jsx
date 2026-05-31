import { cva } from 'class-variance-authority';
import { cn } from '@/lib/utils';

// Atom — generic label/count pill. Distinct from StatusBadge (status-badge.jsx), which is
// bound to work-item status categories. Use this for counts, tags, and neutral labels —
// e.g. the collapsed-section count badge in CLAUDE.md §4.7. Token classes only (§4.2).
const badgeVariants = cva(
  'inline-flex items-center gap-1 rounded-full px-2 py-0.5 text-xs font-semibold leading-tight whitespace-nowrap',
  {
    variants: {
      tone: {
        neutral: 'bg-neutral-200 text-neutral-700 dark:bg-neutral-700 dark:text-neutral-200',
        brand:   'bg-brand-navy text-white',
        info:    'bg-semantic-info-surface text-semantic-info',
        success: 'bg-semantic-success-surface text-semantic-success',
        warning: 'bg-semantic-warning-surface text-semantic-warning',
        danger:  'bg-semantic-danger-surface text-semantic-danger',
      },
    },
    defaultVariants: { tone: 'neutral' },
  }
);

export function Badge({ className, tone, children, ...props }) {
  return (
    <span className={cn(badgeVariants({ tone }), className)} {...props}>
      {children}
    </span>
  );
}
