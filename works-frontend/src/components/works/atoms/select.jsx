import * as React from 'react';
import { ChevronDown } from 'lucide-react';
import { cva } from 'class-variance-authority';
import { cn } from '@/lib/utils';

// Atom — native <select> wrapper styled to match Input (input.jsx). The native <select> handles
// all keyboard navigation and screen-reader behaviour out of the box. The custom chevron icon
// is decorative (aria-hidden); pointer-events-none so it doesn't intercept clicks.
const selectVariants = cva(
  'w-full appearance-none rounded-md border bg-white dark:bg-neutral-800 text-neutral-900 dark:text-neutral-100 transition-colors duration-fast focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-offset-2 disabled:opacity-50 disabled:pointer-events-none pr-8',
  {
    variants: {
      state: {
        default: 'border-neutral-200 dark:border-neutral-600 hover:border-neutral-400 focus-visible:border-brand-navy focus-visible:ring-brand-navy-tint/40',
        error:   'border-semantic-danger focus-visible:ring-semantic-danger/40',
      },
      selectSize: {
        sm: 'h-8 pl-2.5 text-xs',
        md: 'h-9 pl-3 text-sm',
        lg: 'h-10 pl-3.5 text-sm',
      },
    },
    defaultVariants: { state: 'default', selectSize: 'md' },
  }
);

export const Select = React.forwardRef(
  ({ className, state, selectSize, invalid, ...props }, ref) => (
    <div className="relative">
      <select
        ref={ref}
        aria-invalid={invalid || state === 'error' || undefined}
        className={cn(selectVariants({ state: invalid ? 'error' : state, selectSize }), className)}
        {...props}
      />
      <ChevronDown
        aria-hidden="true"
        className="pointer-events-none absolute right-2.5 top-1/2 -translate-y-1/2 h-4 w-4 text-neutral-400"
      />
    </div>
  )
);
Select.displayName = 'Select';
