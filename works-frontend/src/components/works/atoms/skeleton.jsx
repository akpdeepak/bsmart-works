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
