import { isIconComponent, cn } from '@/lib/utils';

const VARIANTS = {
  empty: 'bg-neutral-100 text-neutral-500 dark:bg-neutral-800 dark:text-neutral-300',
  onboarding: 'bg-brand-navy/10 text-brand-navy dark:bg-brand-navy-tint/20 dark:text-neutral-100',
  error: 'bg-semantic-danger-surface text-semantic-danger dark:bg-semantic-danger/20',
  success: 'bg-semantic-success-surface text-semantic-success dark:bg-semantic-success/20',
  warning: 'bg-semantic-warning-surface text-semantic-warning dark:bg-semantic-warning/20',
  unauthorized: 'bg-neutral-200 text-neutral-600 dark:bg-neutral-700 dark:text-neutral-400',
};

// Unified zero-data illustration treatment. Callers keep providing a Lucide icon; this atom gives
// the icon a consistent product illustration frame across empty/onboarding/error/success states.
export function EmptyState({ icon: Icon, title, subtitle, action, variant = 'empty' }) {
  const tone = VARIANTS[variant] ?? VARIANTS.empty;
  return (
    <div className="flex flex-col items-center justify-center py-20 text-center">
      <div className={cn('relative mb-4 flex h-14 w-14 items-center justify-center rounded-xl', tone)}>
        <span className="absolute -right-1 -top-1 h-3 w-3 rounded-full bg-brand-orange" aria-hidden="true" />
        <span className="absolute -bottom-1 left-2 h-2 w-6 rounded-full bg-current opacity-20" aria-hidden="true" />
        {isIconComponent(Icon) ? <Icon aria-hidden="true" className="h-6 w-6" /> : Icon}
      </div>
      <h3 className="text-subheading mb-1 text-neutral-700 dark:text-neutral-100">{title}</h3>
      <p className="mb-5 max-w-xs text-sm text-neutral-600 dark:text-neutral-400">{subtitle}</p>
      {action}
    </div>
  );
}
