import { cn } from '@/lib/utils';

// Atom — loading placeholder. The standard content-area loading state (CLAUDE.md §4.11):
// never a spinner inside content. Size it to match the shape of the content it replaces so
// the layout doesn't shift when data arrives (§4.18). aria-hidden: the surrounding region
// should carry aria-busy="true" instead, so screen readers announce loading once, not N times.
export function Skeleton({ className, ...props }) {
  return (
    <div
      aria-hidden="true"
      className={cn(
        'rounded bg-neutral-100 dark:bg-neutral-700',
        'motion-safe:bg-[linear-gradient(90deg,theme(colors.neutral.100),theme(colors.white),theme(colors.neutral.100))]',
        'motion-safe:dark:bg-[linear-gradient(90deg,theme(colors.neutral.700),theme(colors.neutral.600),theme(colors.neutral.700))]',
        'motion-safe:bg-[length:200%_100%]',
        'motion-safe:animate-shimmer',
        className
      )}
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
          <Skeleton className="h-7 w-7 shrink-0" style={{ animationDelay: `${i * 75}ms` }} />
          <div className="flex-1 space-y-1.5">
            <Skeleton className={cn('h-3.5', TITLE_WIDTHS[i % TITLE_WIDTHS.length])} style={{ animationDelay: `${i * 75}ms` }} />
            <Skeleton className="h-3 w-32" style={{ animationDelay: `${i * 75}ms` }} />
          </div>
          <Skeleton className="h-5 w-16 shrink-0 rounded-full" style={{ animationDelay: `${i * 75}ms` }} />
        </div>
      ))}
    </div>
  );
}

// Card-shaped loading placeholder — mirrors a dashboard widget or summary card.
export function CardSkeleton({ className }) {
  return (
    <div aria-busy="true" aria-label="Loading card" className={cn('rounded-lg border border-neutral-100 dark:border-neutral-700 bg-white dark:bg-neutral-800 p-4 space-y-3', className)}>
      <Skeleton className="h-4 w-2/5" />
      <Skeleton className="h-8 w-1/3" />
      <Skeleton className="h-3 w-3/4" />
    </div>
  );
}

// Table-row loading placeholder — N rows of cells mimicking a data table.
export function TableRowSkeleton({ rows = 5, cols = 4, className }) {
  return (
    <div aria-busy="true" aria-label="Loading table" className={cn('space-y-1', className)}>
      {Array.from({ length: rows }, (_, i) => (
        <div key={i} className="flex items-center gap-4 rounded border border-neutral-100 dark:border-neutral-700 bg-white dark:bg-neutral-800 px-3 py-2">
          {Array.from({ length: cols }, (_, c) => (
            <Skeleton key={c} className={cn('h-3', c === 0 ? 'w-1/4' : c === cols - 1 ? 'w-16' : 'flex-1')} style={{ animationDelay: `${i * 75}ms` }} />
          ))}
        </div>
      ))}
    </div>
  );
}

// Chart-shaped loading placeholder — a rectangle that mirrors a chart/graph area.
export function ChartSkeleton({ className }) {
  return (
    <div aria-busy="true" aria-label="Loading chart" className={cn('rounded-lg border border-neutral-100 dark:border-neutral-700 bg-white dark:bg-neutral-800 p-4 space-y-3', className)}>
      <Skeleton className="h-4 w-1/3" />
      <Skeleton className="h-40 w-full rounded" />
    </div>
  );
}

// Avatar-shaped loading placeholder — circular placeholder matching user avatars.
export function AvatarSkeleton({ size = 'md', className }) {
  const sizeClass = size === 'sm' ? 'h-6 w-6' : size === 'lg' ? 'h-12 w-12' : 'h-8 w-8';
  return <Skeleton className={cn('rounded-full', sizeClass, className)} />;
}
