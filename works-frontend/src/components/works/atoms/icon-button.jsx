import * as React from 'react';
import { cva } from 'class-variance-authority';
import { cn } from '@/lib/utils';

// Atom — icon-only button. Same cva base as Button (button.jsx) but square, no text label.
// aria-label is required: the button has no visible text so screen readers need it (WCAG 2.1 §4.1.2).
// Sizes align with Button (sm/md/lg) plus an xs for tight surfaces.
const iconButtonVariants = cva(
  'inline-flex items-center justify-center rounded-md border transition-colors duration-fast focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-brand-navy-tint/40 focus-visible:ring-offset-2 disabled:opacity-50 disabled:pointer-events-none active:translate-y-px shrink-0',
  {
    variants: {
      variant: {
        primary:   'bg-brand-navy text-white border-brand-navy hover:bg-brand-navy-tint hover:border-brand-navy-tint',
        secondary: 'bg-white dark:bg-neutral-800 text-neutral-900 dark:text-neutral-100 border-neutral-200 dark:border-neutral-600 hover:bg-neutral-100 dark:hover:bg-neutral-700',
        ghost:     'bg-transparent text-neutral-600 dark:text-neutral-300 border-transparent hover:bg-neutral-100 dark:hover:bg-neutral-800 hover:text-neutral-900 dark:hover:text-neutral-100',
        danger:    'bg-transparent text-semantic-danger border-transparent hover:bg-semantic-danger-surface',
      },
      size: {
        xs: 'h-7 w-7',
        sm: 'h-8 w-8',
        md: 'h-9 w-9',
        lg: 'h-10 w-10',
      },
    },
    defaultVariants: { variant: 'ghost', size: 'md' },
  }
);

export const IconButton = React.forwardRef(
  ({ className, variant, size, 'aria-label': ariaLabel, children, ...props }, ref) => (
    <button
      ref={ref}
      type="button"
      aria-label={ariaLabel}
      className={cn(iconButtonVariants({ variant, size }), className)}
      {...props}
    >
      {children}
    </button>
  )
);
IconButton.displayName = 'IconButton';
