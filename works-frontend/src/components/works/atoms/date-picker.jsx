import * as React from 'react';
import { Calendar } from 'lucide-react';
import { cn } from '@/lib/utils';

// DatePicker — styled wrapper around native <input type="date">. The native picker handles
// full keyboard operability and locale rendering from the browser (including RTL calendars)
// without a JS dependency. The trigger icon is decorative (aria-hidden). aria-label or an
// associated <label> must be provided by the caller for accessibility (§4.17).
//
// Props mirror <input type="date">: value, defaultValue, min, max, onChange, disabled, required.
// onChange receives the ISO string (YYYY-MM-DD) or '' when cleared.
export const DatePicker = React.forwardRef(
  ({
    value,
    defaultValue,
    min,
    max,
    onChange,
    disabled = false,
    required = false,
    invalid = false,
    className,
    ...props
  }, ref) => {
    const handleChange = (e) => onChange?.(e.target.value);

    return (
      <div
        className={cn(
          'relative flex items-center',
          disabled && 'opacity-50 pointer-events-none',
          className
        )}
      >
        <Calendar
          aria-hidden="true"
          className="pointer-events-none absolute start-3 h-4 w-4 text-neutral-400 dark:text-neutral-500 z-10"
        />
        <input
          ref={ref}
          type="date"
          value={value}
          defaultValue={defaultValue}
          min={min}
          max={max}
          onChange={handleChange}
          disabled={disabled}
          required={required}
          aria-invalid={invalid || undefined}
          className={cn(
            'w-full rounded-md border bg-white dark:bg-neutral-800',
            'ps-10 pe-3 py-2 text-sm text-neutral-900 dark:text-neutral-100',
            'transition-colors duration-fast placeholder:text-neutral-400',
            'focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-offset-2',
            invalid
              ? 'border-semantic-danger focus-visible:ring-semantic-danger/40 focus-visible:border-semantic-danger'
              : 'border-neutral-200 dark:border-neutral-600 hover:border-neutral-400 focus-visible:ring-brand-navy-tint/40 focus-visible:border-brand-navy',
            // Suppress the native calendar icon in WebKit so our Lucide icon is the only one
            '[&::-webkit-calendar-picker-indicator]:hidden',
            // Cursor
            'cursor-pointer'
          )}
          {...props}
        />
      </div>
    );
  }
);
DatePicker.displayName = 'DatePicker';
