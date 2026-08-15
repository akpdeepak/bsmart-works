import { ShieldAlert, RefreshCw } from 'lucide-react';
import { Button } from '@/components/works/button';
import { EmptyState } from './empty-state';
import { cn } from '@/lib/utils';

// AsyncBoundary — unified three-state async wrapper (RB-30 §6, roadmap H2 #8).
//
// Renders one of four states depending on the combination of props:
//   loading=true  → skeleton placeholder wrapped in aria-busy="true" container
//   error non-null → EmptyState with ShieldAlert icon + optional retry button
//   empty=true     → EmptyState with caller-supplied icon/title/subtitle/action
//   default        → children (the resolved content)
//
// Maps the server's {code, message} error shape to the subtitle automatically.
// Every surface that fetches async data should wrap its content section in this
// component so the five canonical states (default · loading · empty · error ·
// partial) are handled consistently across the product.
export function AsyncBoundary({
  loading = false,
  error = null,
  empty = false,
  // Loading state
  skeleton,
  label = 'Loading',
  // Empty state
  emptyIcon,
  emptyTitle = 'Nothing here yet',
  emptySubtitle,
  emptyAction,
  // Error state
  onRetry,
  errorTitle = "Couldn't load this view",
  // Children
  children,
  // className is applied to the aria-busy loading wrapper only
  className,
}) {
  if (loading) {
    return (
      <div 
        aria-busy="true" 
        aria-live="polite"
        aria-label={label} 
        className={cn('opacity-0 motion-safe:animate-fade-in', className)}
      >
        {skeleton}
      </div>
    );
  }

  if (error) {
    const message = typeof error === 'string'
      ? error
      : (error?.message || 'An unexpected error occurred.');
    return (
      <EmptyState
        icon={ShieldAlert}
        title={errorTitle}
        subtitle={message}
        action={onRetry ? (
          <Button
            variant="secondary"
            size="sm"
            leftIcon={<RefreshCw aria-hidden="true" className="h-4 w-4" />}
            onClick={onRetry}
          >
            Try again
          </Button>
        ) : undefined}
      />
    );
  }

  if (empty) {
    return (
      <EmptyState
        icon={emptyIcon}
        title={emptyTitle}
        subtitle={emptySubtitle}
        action={emptyAction}
      />
    );
  }

  return children;
}
