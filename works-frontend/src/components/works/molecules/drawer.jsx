import * as React from 'react';
import { X } from 'lucide-react';
import { cn } from '@/lib/utils';
import { Backdrop } from '@/components/works/atoms/backdrop';

// Molecule — side-panel drawer. Same focus-trap, Escape-to-close, scroll-lock, and backdrop
// as Modal (modal.jsx) but slides in from the right (or left). Keeps the main content visible
// behind a backdrop so users retain spatial context. Sizes map to max-w values.
// aria-modal + role="dialog" + aria-labelledby wired to the title (WCAG 2.1 §1.3.1, §4.1.3).

const SIZES = { sm: 'max-w-sm', md: 'max-w-md', lg: 'max-w-lg', xl: 'max-w-2xl', full: 'max-w-full' };

const FOCUSABLE =
  'a[href], button:not([disabled]), textarea:not([disabled]), input:not([disabled]), select:not([disabled]), [tabindex]:not([tabindex="-1"])';

export function Drawer({ open, onClose, title, children, size = 'md', side = 'right', footer, className }) {
  const panelRef = React.useRef(null);
  const titleId = React.useId();

  React.useEffect(() => {
    if (!open) return;
    const previouslyFocused = document.activeElement;
    const { body } = document;
    const prevOverflow = body.style.overflow;
    body.style.overflow = 'hidden';

    const node = panelRef.current;
    const first = node?.querySelectorAll(FOCUSABLE)[0] ?? node;
    first?.focus();

    function onKeyDown(e) {
      if (e.key === 'Escape') { e.stopPropagation(); onClose?.(); return; }
      if (e.key !== 'Tab' || !node) return;
      const items = node.querySelectorAll(FOCUSABLE);
      if (!items.length) { e.preventDefault(); return; }
      const first = items[0], last = items[items.length - 1];
      if (e.shiftKey && document.activeElement === first) { e.preventDefault(); last.focus(); }
      else if (!e.shiftKey && document.activeElement === last) { e.preventDefault(); first.focus(); }
    }

    document.addEventListener('keydown', onKeyDown, true);
    return () => {
      document.removeEventListener('keydown', onKeyDown, true);
      body.style.overflow = prevOverflow;
      if (previouslyFocused instanceof HTMLElement) previouslyFocused.focus();
    };
  }, [open, onClose]);

  if (!open) return null;

  return (
    <div className="fixed inset-0 z-modal flex">
      <Backdrop onClick={onClose} label="Close panel" />

      <div
        ref={panelRef}
        role="dialog"
        aria-modal="true"
        aria-labelledby={titleId}
        tabIndex={-1}
        className={cn(
          'relative ml-auto flex flex-col bg-white dark:bg-neutral-800 shadow-xl outline-none w-full',
          SIZES[size] ?? SIZES.md,
          side === 'left' && 'mr-auto ml-0',
          className
        )}
      >
        {/* Header */}
        <div className="flex items-center justify-between border-b border-neutral-200 dark:border-neutral-700 px-6 py-4 shrink-0">
          <h2 id={titleId} className="text-lg font-bold text-brand-navy dark:text-neutral-100 truncate">
            {title}
          </h2>
          <button
            type="button"
            aria-label="Close"
            onClick={onClose}
            className="rounded-md p-1 text-neutral-400 transition-colors duration-fast hover:bg-neutral-100 hover:text-neutral-900 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-brand-navy-tint/40 focus-visible:ring-offset-2 dark:hover:bg-neutral-700 dark:hover:text-neutral-100"
          >
            <X aria-hidden="true" className="h-5 w-5" />
          </button>
        </div>

        {/* Scrollable body */}
        <div className="flex-1 overflow-y-auto p-6">{children}</div>

        {/* Optional footer */}
        {footer && (
          <div className="shrink-0 border-t border-neutral-200 dark:border-neutral-700 px-6 py-4">
            {footer}
          </div>
        )}
      </div>
    </div>
  );
}
