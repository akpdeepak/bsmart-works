import * as React from 'react';
import { cva } from 'class-variance-authority';
import { cn } from '@/lib/utils';

// Atom — pill-shaped on/off toggle (role="switch"). Controlled (checked prop) or uncontrolled
// (defaultChecked). Uses aria role="switch" + aria-checked so screen readers announce on/off.
// Sizes: sm (16×28px), md (20×36px). Label renders to the right; aria-label is the fallback when
// children are absent (required for a11y when used icon-only).

const trackVariants = cva(
  'relative inline-flex shrink-0 cursor-pointer items-center rounded-full border-2 border-transparent transition-colors duration-base focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-brand-navy-tint/40 focus-visible:ring-offset-2 disabled:cursor-not-allowed disabled:opacity-50',
  {
    variants: {
      size: {
        sm: 'h-4 w-7',
        md: 'h-5 w-9',
      },
      checked: {
        true:  'bg-brand-navy',
        false: 'bg-neutral-200 dark:bg-neutral-600',
      },
    },
    defaultVariants: { size: 'md', checked: false },
  }
);

const thumbVariants = cva(
  'pointer-events-none inline-block rounded-full bg-white shadow-sm ring-0 transition duration-base',
  {
    variants: {
      size: {
        sm: 'h-3 w-3',
        md: 'h-4 w-4',
      },
      checked: {
        true:  '',
        false: '',
      },
    },
    compoundVariants: [
      { size: 'sm', checked: true,  className: 'translate-x-3' },
      { size: 'sm', checked: false, className: 'translate-x-0' },
      { size: 'md', checked: true,  className: 'translate-x-4' },
      { size: 'md', checked: false, className: 'translate-x-0' },
    ],
    defaultVariants: { size: 'md', checked: false },
  }
);

export const Toggle = React.forwardRef(
  ({ className, checked, defaultChecked, onChange, disabled, size = 'md', 'aria-label': ariaLabel, id: propId, children, ...props }, ref) => {
    const uid = React.useId();
    const id = propId || uid;
    const [internal, setInternal] = React.useState(defaultChecked ?? false);
    const isChecked = checked !== undefined ? checked : internal;

    const handleClick = () => {
      if (disabled) return;
      const next = !isChecked;
      if (checked === undefined) setInternal(next);
      onChange?.(next);
    };

    const handleKeyDown = (e) => {
      if (e.key === ' ' || e.key === 'Enter') { e.preventDefault(); handleClick(); }
    };

    const trackClass = trackVariants({ size, checked: isChecked });
    const thumbClass = thumbVariants({ size, checked: isChecked });

    return (
      <span className={cn('inline-flex items-center gap-2', className)}>
        <button
          ref={ref}
          id={id}
          type="button"
          role="switch"
          aria-checked={isChecked}
          aria-label={children ? undefined : ariaLabel}
          disabled={disabled}
          onClick={handleClick}
          onKeyDown={handleKeyDown}
          className={trackClass}
          {...props}
        >
          <span className={thumbClass} />
        </button>
        {children && (
          <label htmlFor={id} className={cn('select-none text-sm text-neutral-900 dark:text-neutral-100', disabled && 'opacity-50 cursor-not-allowed', 'cursor-pointer')}>
            {children}
          </label>
        )}
      </span>
    );
  }
);
Toggle.displayName = 'Toggle';
