import * as React from 'react';
import { cva } from 'class-variance-authority';
import { cn } from '@/lib/utils';
import { Loader2 } from 'lucide-react';

const buttonVariants = cva(
  'inline-flex items-center justify-center gap-2 font-semibold leading-none rounded-md border transition-colors duration-fast focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-brand-navy-tint/40 focus-visible:ring-offset-2 disabled:opacity-50 disabled:pointer-events-none active:translate-y-px whitespace-nowrap',
  {
    variants: {
      variant: {
        primary:   'bg-brand-navy text-white border-brand-navy hover:bg-brand-navy-tint hover:border-brand-navy-tint',
        secondary: 'bg-white dark:bg-neutral-800 text-neutral-900 dark:text-neutral-100 border-neutral-200 dark:border-neutral-600 hover:bg-neutral-100 dark:hover:bg-neutral-700 hover:border-neutral-400',
        ghost:     'bg-transparent text-neutral-600 dark:text-neutral-300 border-transparent hover:bg-neutral-100 dark:hover:bg-neutral-800',
        danger:    'bg-semantic-danger text-white border-semantic-danger hover:opacity-90',
        action:    'bg-brand-orange text-white border-brand-orange hover:opacity-90',
        link:      'bg-transparent text-brand-navy-tint border-transparent hover:underline hover:text-brand-navy p-0 h-auto',
      },
      size: {
        sm:   'h-8 px-3 text-xs',
        md:   'h-9 px-3.5 text-sm',
        lg:   'h-10 px-4 text-sm',
        icon: 'h-9 w-9 p-0',
      },
      fullWidth: { true: 'w-full', false: '' },
    },
    defaultVariants: { variant: 'primary', size: 'md', fullWidth: false },
  }
);

export const Button = React.forwardRef(
  ({ className, variant, size, fullWidth, loading, leftIcon, rightIcon, children, disabled, ...props }, ref) => (
    <button
      ref={ref}
      className={cn(buttonVariants({ variant, size, fullWidth }), className)}
      disabled={disabled || loading}
      {...props}
    >
      {loading ? <Loader2 className="h-4 w-4 animate-spin" /> : leftIcon ? <span>{leftIcon}</span> : null}
      {children}
      {!loading && rightIcon ? <span>{rightIcon}</span> : null}
    </button>
  )
);
Button.displayName = 'Button';
