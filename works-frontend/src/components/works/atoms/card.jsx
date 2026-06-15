import * as React from 'react';
import { cva } from 'class-variance-authority';
import { cn } from '@/lib/utils';

// Canonical Card primitive — replaces ~85 hand-rolled card-chrome blocks across views.
// Use variant="elevated" (shadow) for floating cards, "outlined" (border) for structured
// sections, "flat" for subdued/nested regions. Compose with CardHeader, CardBody, CardFooter.
const cardVariants = cva(
  'rounded-lg text-neutral-900 dark:text-neutral-100',
  {
    variants: {
      variant: {
        elevated: 'bg-white dark:bg-neutral-800 shadow-md',
        outlined: 'bg-white dark:bg-neutral-800 border border-neutral-200 dark:border-neutral-700',
        flat:     'bg-neutral-50 dark:bg-neutral-900',
      },
      padding: {
        none: '',
        sm:   'p-4',
        md:   'p-6',
      },
    },
    defaultVariants: { variant: 'elevated', padding: 'md' },
  }
);

export const Card = React.forwardRef(
  ({ className, variant, padding, children, ...props }, ref) => (
    <div ref={ref} className={cn(cardVariants({ variant, padding }), className)} {...props}>
      {children}
    </div>
  )
);
Card.displayName = 'Card';

// Header slot: title area + optional right-aligned actions row.
export function CardHeader({ className, children, ...props }) {
  return (
    <div className={cn('mb-4 flex items-start justify-between gap-4', className)} {...props}>
      {children}
    </div>
  );
}

// Consistent card heading — one h3-scale inside a card, never h1/h2.
export function CardTitle({ className, children, ...props }) {
  return (
    <h3 className={cn('text-base font-semibold text-neutral-900 dark:text-neutral-100 leading-snug', className)} {...props}>
      {children}
    </h3>
  );
}

// Optional description line beneath the title.
export function CardDescription({ className, children, ...props }) {
  return (
    <p className={cn('mt-0.5 text-sm text-neutral-600 dark:text-neutral-400', className)} {...props}>
      {children}
    </p>
  );
}

// Main content area — no extra padding (padding lives on Card).
export function CardBody({ className, children, ...props }) {
  return (
    <div className={cn('', className)} {...props}>
      {children}
    </div>
  );
}

// Footer slot — top-ruled separator, suitable for action buttons or metadata.
export function CardFooter({ className, children, ...props }) {
  return (
    <div
      className={cn('mt-4 border-t border-neutral-200 dark:border-neutral-700 pt-4 flex items-center gap-2', className)}
      {...props}
    >
      {children}
    </div>
  );
}
