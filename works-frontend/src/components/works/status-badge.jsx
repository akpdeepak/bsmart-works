import * as React from 'react';
import { cva } from 'class-variance-authority';
import { cn } from '@/lib/utils';

const badgeVariants = cva(
  'inline-flex items-center gap-1.5 px-2 py-0.5 rounded-sm text-xs font-semibold leading-tight whitespace-nowrap',
  {
    variants: {
      category: {
        todo:        'bg-neutral-100 text-neutral-700',
        in_progress: 'bg-semantic-info-surface text-semantic-info',
        review:      'bg-semantic-warning-surface text-semantic-warning',
        done:        'bg-semantic-success-surface text-semantic-success',
        blocked:     'bg-semantic-danger-surface text-semantic-danger',
      },
    },
    defaultVariants: { category: 'todo' },
  }
);

export function StatusBadge({ className, category, children, ...props }) {
  return (
    <span className={cn(badgeVariants({ category }), className)} {...props}>
      {children}
    </span>
  );
}

export function statusToCategory(status) {
  const map = { 'Todo': 'todo', 'In Progress': 'in_progress', 'Done': 'done', 'Blocked': 'blocked' };
  return map[status] || 'todo';
}
