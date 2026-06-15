import { ChevronLeft, ChevronRight, ChevronsLeft, ChevronsRight } from 'lucide-react';
import { cn } from '@/lib/utils';

// Pagination — offset-based, consistent with RB-10 §4 ({page, size, sort} params).
// Renders prev/next + a sliding window of page numbers. Emits onPageChange(newPage)
// where page is 0-based (matches Spring's Pageable). Always shows first + last pages;
// current ± 1 in between; dots to bridge the gap. All controls keyboard-operable.
function PageButton({ onClick, disabled, active, 'aria-label': label, children, className }) {
  return (
    <button
      type="button"
      onClick={onClick}
      disabled={disabled}
      aria-label={label}
      aria-current={active ? 'page' : undefined}
      className={cn(
        'flex h-8 min-w-8 items-center justify-center rounded-md px-2 text-sm font-medium transition-colors duration-fast',
        'focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-brand-navy-tint/40',
        'disabled:pointer-events-none disabled:opacity-40',
        active
          ? 'bg-brand-navy text-white'
          : 'text-neutral-700 dark:text-neutral-300 hover:bg-neutral-100 dark:hover:bg-neutral-700',
        className
      )}
    >
      {children}
    </button>
  );
}

function dots(key) {
  return (
    <span key={key} aria-hidden="true" className="px-1 text-neutral-400 select-none">
      …
    </span>
  );
}

export function Pagination({
  page = 0,
  totalPages = 1,
  onPageChange,
  className,
}) {
  if (totalPages <= 1) return null;

  const go = (p) => onPageChange?.(p);
  const isFirst = page === 0;
  const isLast = page === totalPages - 1;

  // Build the page window: first · [dots] · (page-1, page, page+1) · [dots] · last
  const pages = [];
  const addPage = (p) => {
    if (!pages.includes(p) && p >= 0 && p < totalPages) pages.push(p);
  };
  addPage(0);
  addPage(page - 1);
  addPage(page);
  addPage(page + 1);
  addPage(totalPages - 1);
  pages.sort((a, b) => a - b);

  const items = [];
  for (let i = 0; i < pages.length; i++) {
    if (i > 0 && pages[i] - pages[i - 1] > 1) {
      items.push(dots(`dot-${i}`));
    }
    const p = pages[i];
    items.push(
      <PageButton key={p} onClick={() => go(p)} active={p === page} aria-label={`Page ${p + 1}`}>
        {p + 1}
      </PageButton>
    );
  }

  return (
    <nav aria-label="Pagination" className={cn('flex items-center gap-1', className)}>
      <PageButton onClick={() => go(0)} disabled={isFirst} aria-label="First page">
        <ChevronsLeft aria-hidden="true" className="h-4 w-4" />
      </PageButton>
      <PageButton onClick={() => go(page - 1)} disabled={isFirst} aria-label="Previous page">
        <ChevronLeft aria-hidden="true" className="h-4 w-4" />
      </PageButton>
      {items}
      <PageButton onClick={() => go(page + 1)} disabled={isLast} aria-label="Next page">
        <ChevronRight aria-hidden="true" className="h-4 w-4" />
      </PageButton>
      <PageButton onClick={() => go(totalPages - 1)} disabled={isLast} aria-label="Last page">
        <ChevronsRight aria-hidden="true" className="h-4 w-4" />
      </PageButton>
    </nav>
  );
}
