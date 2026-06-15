import { cva } from 'class-variance-authority';
import { cn } from '@/lib/utils';

// Priority badge — converted to cva (UX finding A4: unified badge family, WI-04).
// Callers may pass the raw API value; it is upper-cased before lookup.
const priorityVariants = cva(
  'inline-flex items-center text-xs font-semibold px-1.5 py-0.5 rounded whitespace-nowrap',
  {
    variants: {
      priority: {
        CRITICAL: 'bg-semantic-danger-surface text-semantic-danger',
        HIGH:     'bg-semantic-warning-surface text-semantic-warning',
        MEDIUM:   'bg-neutral-100 dark:bg-neutral-700 text-neutral-600 dark:text-neutral-400',
        LOW:      'bg-neutral-50 dark:bg-neutral-800 text-neutral-600 dark:text-neutral-400',
      },
    },
    defaultVariants: { priority: 'MEDIUM' },
  }
);

const LABELS = { CRITICAL: 'Critical', HIGH: 'High', MEDIUM: 'Medium', LOW: 'Low' };

const KNOWN = new Set(['CRITICAL', 'HIGH', 'MEDIUM', 'LOW']);

export function PriorityBadge({ priority, className }) {
  const raw = (priority || '').toUpperCase();
  const p = KNOWN.has(raw) ? raw : 'MEDIUM';
  return (
    <span className={cn(priorityVariants({ priority: p }), className)}>
      {LABELS[p]}
    </span>
  );
}
