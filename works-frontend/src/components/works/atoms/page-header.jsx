import { cn } from '@/lib/utils';

// Canonical PageHeader primitive — the single h1 on every view.
// Replaces per-view hand-coded headers. Props:
//   title (string, required) — rendered as h1 (text-2xl bold, RB-30 §3)
//   description (string | node) — muted line beneath the title
//   breadcrumb (node) — rendered above the title (e.g. a Breadcrumb component)
//   actions (node) — right-aligned slot for primary/secondary action buttons
export function PageHeader({ title, description, breadcrumb, actions, className, ...props }) {
  return (
    <div className={cn('mb-6', className)} {...props}>
      {breadcrumb && (
        <div className="mb-1.5 text-xs text-neutral-600 dark:text-neutral-400">
          {breadcrumb}
        </div>
      )}
      <div className="flex items-start justify-between gap-4">
        <div className="min-w-0 flex-1">
          <h1 className="text-2xl font-bold text-neutral-900 dark:text-neutral-100 truncate leading-snug">
            {title}
          </h1>
          {description && (
            <p className="mt-1 text-sm text-neutral-600 dark:text-neutral-400">
              {description}
            </p>
          )}
        </div>
        {actions && (
          <div className="flex shrink-0 items-center gap-2">
            {actions}
          </div>
        )}
      </div>
    </div>
  );
}
