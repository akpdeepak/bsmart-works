import * as React from 'react';
import { cva } from 'class-variance-authority';
import { cn } from '@/lib/utils';

// Atom — text input. Follows the button.jsx cva + cn() pattern (CLAUDE.md §4.13).
// Pair with a <label htmlFor> and inline error text (CLAUDE.md §4.11); pass `invalid`
// to wire the danger state + aria-invalid for screen readers (§4.17).
const inputVariants = cva(
  'w-full rounded-md border bg-white dark:bg-neutral-800 text-neutral-900 dark:text-neutral-100 placeholder:text-neutral-400 transition-colors duration-[120ms] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-offset-2 disabled:opacity-50 disabled:pointer-events-none',
  {
    variants: {
      state: {
        default: 'border-neutral-200 dark:border-neutral-600 hover:border-neutral-400 focus-visible:border-brand-navy focus-visible:ring-brand-navy-tint/40',
        error:   'border-semantic-danger focus-visible:ring-semantic-danger/40',
      },
      inputSize: {
        sm: 'h-8 px-2.5 text-xs',
        md: 'h-9 px-3 text-sm',
        lg: 'h-10 px-3.5 text-sm',
      },
    },
    defaultVariants: { state: 'default', inputSize: 'md' },
  }
);

export const Input = React.forwardRef(
  ({ className, state, inputSize, invalid, ...props }, ref) => (
    <input
      ref={ref}
      aria-invalid={invalid || state === 'error' || undefined}
      className={cn(inputVariants({ state: invalid ? 'error' : state, inputSize }), className)}
      {...props}
    />
  )
);
Input.displayName = 'Input';
