import { ChevronRight } from 'lucide-react';
import { cn } from '@/lib/utils';

// Breadcrumb navigation — mode → surface → record (RB-30 §7 nav model, roadmap H.5).
// Each item is a link (or the current-page span for the last item). The separator is a
// Lucide chevron (icons are decorative, aria-hidden). The nav carries the WCAG landmark
// and the list provides the semantic path; aria-current="page" marks the last item.
export function Breadcrumb({ items = [], className }) {
  return (
    <nav aria-label="Breadcrumb" className={cn('flex', className)}>
      <ol className="flex flex-wrap items-center gap-1 text-sm text-neutral-600 dark:text-neutral-400">
        {items.map((item, i) => {
          const isLast = i === items.length - 1;
          return (
            <li key={i} className="flex items-center gap-1">
              {i > 0 && (
                <ChevronRight
                  aria-hidden="true"
                  className="h-3.5 w-3.5 text-neutral-400 dark:text-neutral-500 shrink-0"
                />
              )}
              {isLast || !item.href ? (
                <span
                  aria-current={isLast ? 'page' : undefined}
                  className={cn(
                    'truncate max-w-48',
                    isLast
                      ? 'font-medium text-neutral-900 dark:text-neutral-100'
                      : 'hover:text-neutral-900 dark:hover:text-neutral-100 transition-colors duration-fast'
                  )}
                >
                  {item.label}
                </span>
              ) : (
                <a
                  href={item.href}
                  onClick={item.onClick}
                  className="truncate max-w-48 rounded hover:text-neutral-900 dark:hover:text-neutral-100 transition-colors duration-fast focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-brand-navy-tint/40"
                >
                  {item.label}
                </a>
              )}
            </li>
          );
        })}
      </ol>
    </nav>
  );
}
