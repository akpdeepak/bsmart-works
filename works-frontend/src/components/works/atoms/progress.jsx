import { cn } from '@/lib/utils';

// Progress bar — determinate (value 0–100) or indeterminate (value=null / undefined).
// Uses role="progressbar" with aria-valuenow/min/max for determinate, omits value attrs
// for indeterminate per WAI-ARIA 1.2. Size sm (h-1) / md (h-2) / lg (h-3). Tone maps
// to the semantic-* palette; defaults to brand-navy for on-brand progress.
const SIZE = {
  sm: 'h-1',
  md: 'h-2',
  lg: 'h-3',
};

const BAR_COLOR = {
  default: 'bg-brand-navy',
  success: 'bg-semantic-success',
  warning: 'bg-semantic-warning',
  danger:  'bg-semantic-danger',
};

export function Progress({
  value,
  tone = 'default',
  size = 'md',
  label,
  className,
}) {
  const isIndeterminate = value === null || value === undefined;
  const clamped = isIndeterminate ? 0 : Math.max(0, Math.min(100, Number(value)));
  const barColor = BAR_COLOR[tone] ?? BAR_COLOR.default;

  return (
    <div
      role="progressbar"
      aria-label={label || 'Progress'}
      aria-valuenow={isIndeterminate ? undefined : clamped}
      aria-valuemin={isIndeterminate ? undefined : 0}
      aria-valuemax={isIndeterminate ? undefined : 100}
      className={cn('w-full overflow-hidden rounded-full bg-neutral-100 dark:bg-neutral-700', SIZE[size] ?? SIZE.md, className)}
    >
      <div
        className={cn(
          'h-full rounded-full transition-[width] duration-300 ease-out',
          barColor,
          isIndeterminate && 'w-2/5 animate-pulse'
        )}
        style={isIndeterminate ? undefined : { width: `${clamped}%` }}
      />
    </div>
  );
}
