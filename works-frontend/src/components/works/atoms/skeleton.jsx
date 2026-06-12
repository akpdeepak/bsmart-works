import { cn } from '@/lib/utils';

// Atom — loading placeholder. The standard content-area loading state (CLAUDE.md §4.11):
// never a spinner inside content. Size it to match the shape of the content it replaces so
// the layout doesn't shift when data arrives (§4.18). aria-hidden: the surrounding region
// should carry aria-busy="true" instead, so screen readers announce loading once, not N times.
export function Skeleton({ className, ...props }) {
  return (
    <div
      aria-hidden="true"
      className={cn('animate-pulse rounded bg-neutral-100 dark:bg-neutral-700', className)}
      {...props}
    />
  );
}

const TITLE_WIDTHS = ['w-3/5', 'w-4/5', 'w-2/3', 'w-3/4', 'w-1/2'];

// List-shaped loading placeholder — N rows that mirror the shape of a work-item list.
// Wrap in a region with aria-busy="true" so screen readers announce loading once.
export function ListSkeleton({ rows = 5, className }) {
  return (
    <div aria-busy="true" aria-label="Loading" className={cn('space-y-2', className)}>
      {Array.from({ length: rows }, (_, i) => (
        <div key={i} className="flex items-center gap-3 rounded-lg border border-neutral-100 dark:border-neutral-700 bg-white dark:bg-neutral-800 p-3">
          <Skeleton className="h-7 w-7 shrink-0" />
          <div className="flex-1 space-y-1.5">
            <Skeleton className={cn('h-3.5', TITLE_WIDTHS[i % TITLE_WIDTHS.length])} />
            <Skeleton className="h-3 w-32" />
          </div>
          <Skeleton className="h-5 w-16 shrink-0 rounded-full" />
        </div>
      ))}
    </div>
  );
}
