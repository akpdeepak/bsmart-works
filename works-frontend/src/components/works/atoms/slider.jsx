import * as React from 'react';
import { cn } from '@/lib/utils';

// Slider — styled native <input type="range">. Native range retains full keyboard support
// (arrow keys, Home/End) without JS. Custom track/thumb via CSS from tailwind.config.js.
// Forwards ref so the host can read .value or wire to a form library.
export const Slider = React.forwardRef(
  ({
    min = 0,
    max = 100,
    step = 1,
    value,
    defaultValue,
    onChange,
    showValue = false,
    label,
    disabled = false,
    className,
    ...props
  }, ref) => {
    const [internal, setInternal] = React.useState(defaultValue ?? min);
    const current = value !== undefined ? value : internal;
    const pct = max === min ? 0 : ((current - min) / (max - min)) * 100;

    const handleChange = (e) => {
      const v = Number(e.target.value);
      if (value === undefined) setInternal(v);
      onChange?.(v);
    };

    return (
      <div className={cn('flex flex-col gap-1', className)}>
        {(label || showValue) && (
          <div className="flex items-center justify-between">
            {label && (
              <span className="text-sm font-medium text-neutral-700 dark:text-neutral-200">
                {label}
              </span>
            )}
            {showValue && (
              <span className="text-sm text-neutral-600 dark:text-neutral-400" aria-live="polite">
                {current}
              </span>
            )}
          </div>
        )}
        <div className="relative flex items-center">
          {/* Background track */}
          <div className="absolute inset-y-0 my-auto h-1.5 w-full rounded-full bg-neutral-200 dark:bg-neutral-600" aria-hidden="true">
            {/* Filled portion */}
            <div
              className="h-full rounded-full bg-brand-navy dark:bg-brand-navy-tint transition-[width] duration-fast"
              style={{ width: `${pct}%` }}
            />
          </div>
          <input
            ref={ref}
            type="range"
            min={min}
            max={max}
            step={step}
            value={current}
            onChange={handleChange}
            disabled={disabled}
            aria-label={label}
            aria-valuemin={min}
            aria-valuemax={max}
            aria-valuenow={current}
            className={cn(
              'relative w-full appearance-none bg-transparent cursor-pointer',
              'h-5',
              // Thumb styles (WebKit + Moz)
              '[&::-webkit-slider-thumb]:appearance-none [&::-webkit-slider-thumb]:h-4 [&::-webkit-slider-thumb]:w-4',
              '[&::-webkit-slider-thumb]:rounded-full [&::-webkit-slider-thumb]:bg-brand-navy',
              '[&::-webkit-slider-thumb]:shadow-sm [&::-webkit-slider-thumb]:transition-transform',
              '[&::-webkit-slider-thumb]:hover:scale-110',
              '[&::-moz-range-thumb]:h-4 [&::-moz-range-thumb]:w-4',
              '[&::-moz-range-thumb]:rounded-full [&::-moz-range-thumb]:bg-brand-navy',
              '[&::-moz-range-thumb]:border-0 [&::-moz-range-thumb]:shadow-sm',
              // Track (hidden — we draw our own above)
              '[&::-webkit-slider-runnable-track]:bg-transparent',
              '[&::-moz-range-track]:bg-transparent',
              // Focus ring
              'focus-visible:outline-none focus-visible:[&::-webkit-slider-thumb]:ring-2',
              'focus-visible:[&::-webkit-slider-thumb]:ring-brand-navy-tint/40',
              'focus-visible:[&::-webkit-slider-thumb]:ring-offset-2',
              disabled && 'opacity-50 cursor-not-allowed'
            )}
            {...props}
          />
        </div>
      </div>
    );
  }
);
Slider.displayName = 'Slider';
