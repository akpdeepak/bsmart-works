import * as React from 'react';
import { X } from 'lucide-react';
import { cn } from '@/lib/utils';
import { Backdrop } from '@/components/works/atoms/backdrop';

// Molecule — the single canonical modal dialog (CLAUDE.md §4.8, §6 accessibility).
// Replaces the legacy inline Modal() that lived in App.jsx. Same public API
// (<Modal title onClose>children</Modal>) so call sites are unchanged, but adds:
//   - role="dialog" + aria-modal + aria-labelledby (the title)
//   - focus trap while open, and focus restored to the trigger on close
//   - Escape to close; backdrop click to close (a real <button> catcher, so it
//     stays keyboard/AT-safe and passes jsx-a11y — mirrors ThreeZoneLayout)
//   - body scroll lock while open
// Tokens only: z-modal + motion tokens, never z-[..]/arbitrary values (§4.21);
// Lucide close icon, never an emoji (§8).

const SIZES = {
  sm: 'max-w-sm',
  md: 'max-w-md',
  lg: 'max-w-lg',
  xl: 'max-w-2xl',
};

const FOCUSABLE =
  'a[href], button:not([disabled]), textarea:not([disabled]), input:not([disabled]), select:not([disabled]), [tabindex]:not([tabindex="-1"])';

export function Modal({ title, onClose, children, size = 'md', className, initialFocus }) {
  const dialogRef = React.useRef(null);
  const titleId = React.useId();

  React.useEffect(() => {
    const previouslyFocused = document.activeElement;
    const { body } = document;
    const prevOverflow = body.style.overflow;
    body.style.overflow = 'hidden'; // scroll lock

    const node = dialogRef.current;
    // Prefer an explicit target (e.g. a prompt's text field) so focus is deterministic; otherwise
    // fall back to the first focusable node (usually the close button) — unchanged default.
    const initial = initialFocus?.current ?? node?.querySelectorAll(FOCUSABLE)[0] ?? node;
    initial?.focus();
    // Select existing text only for an explicitly-targeted field, so a prompt's default value is
    // easy to overtype. Never alters the default (close-button) focus path.
    if (initialFocus?.current && typeof initial?.select === 'function') initial.select();

    function onKeyDown(e) {
      if (e.key === 'Escape') {
        e.stopPropagation();
        onClose?.();
        return;
      }
      if (e.key !== 'Tab' || !node) return;
      const items = node.querySelectorAll(FOCUSABLE);
      if (items.length === 0) {
        e.preventDefault();
        return;
      }
      const first = items[0];
      const last = items[items.length - 1];
      if (e.shiftKey && document.activeElement === first) {
        e.preventDefault();
        last.focus();
      } else if (!e.shiftKey && document.activeElement === last) {
        e.preventDefault();
        first.focus();
      }
    }

    document.addEventListener('keydown', onKeyDown, true);
    return () => {
      document.removeEventListener('keydown', onKeyDown, true);
      body.style.overflow = prevOverflow;
      if (previouslyFocused instanceof HTMLElement) previouslyFocused.focus();
    };
    // initialFocus is a stable ref (or undefined); listed to satisfy exhaustive-deps without
    // adding re-runs.
  }, [onClose, initialFocus]);

  return (
    <div className="fixed inset-0 z-modal flex items-center justify-center p-4">
      <Backdrop onClick={onClose} label="Close dialog" />

      <div
        ref={dialogRef}
        role="dialog"
        aria-modal="true"
        aria-labelledby={titleId}
        tabIndex={-1}
        className={cn(
          'relative w-full rounded-xl bg-white shadow-xl outline-none dark:bg-neutral-800',
          SIZES[size] ?? SIZES.md,
          className
        )}
      >
        <div className="flex items-center justify-between border-b border-neutral-200 px-6 py-4 dark:border-neutral-700">
          <h2 id={titleId} className="text-lg font-bold text-brand-navy dark:text-neutral-100">
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
        <div className="p-6">{children}</div>
      </div>
    </div>
  );
}
