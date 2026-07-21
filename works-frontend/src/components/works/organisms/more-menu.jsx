import { useEffect, useRef, useState } from 'react';
import { MoreHorizontal } from 'lucide-react';
import { cn } from '@/lib/utils';
import { moreDestinations } from '@/lib/nav-model';
import { useI18n } from '@/lib/i18n';

// Explicit access path for destinations intentionally kept off the six-mode rail. Visibility is
// still server-authored when /rbac/me supplies a surface list; this menu only declutters the shell.
export function MoreMenu({ activeView, visibility, onNavigate }) {
  const { t } = useI18n();
  const [open, setOpen] = useState(false);
  const rootRef = useRef(null);
  const destinations = moreDestinations(visibility);
  const label = t('nav.more');

  useEffect(() => {
    if (!open) return undefined;
    function closeOnOutsideClick(event) {
      if (rootRef.current && !rootRef.current.contains(event.target)) setOpen(false);
    }
    function closeOnEscape(event) {
      if (event.key === 'Escape') setOpen(false);
    }
    document.addEventListener('mousedown', closeOnOutsideClick);
    document.addEventListener('keydown', closeOnEscape);
    return () => {
      document.removeEventListener('mousedown', closeOnOutsideClick);
      document.removeEventListener('keydown', closeOnEscape);
    };
  }, [open]);

  function navigate(destination) {
    setOpen(false);
    onNavigate?.(destination.id);
  }

  return (
    <div ref={rootRef} className="relative shrink-0">
      <button
        type="button"
        aria-label={label}
        aria-haspopup="menu"
        aria-expanded={open}
        onClick={() => setOpen((current) => !current)}
        className="inline-flex h-8 items-center gap-1.5 rounded-md border border-white/15 bg-white/10 px-2.5 text-xs font-semibold text-white transition-colors duration-fast hover:bg-white/15 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-white/40 active:translate-y-px disabled:cursor-not-allowed disabled:opacity-50"
        disabled={destinations.length === 0}
      >
        <MoreHorizontal aria-hidden="true" className="h-4 w-4" />
        <span className="hidden lg:inline">{label}</span>
      </button>

      {open && (
        <div
          role="menu"
          aria-label={label}
          className="absolute left-0 top-full z-dropdown mt-1 max-h-80 w-64 overflow-y-auto rounded-md border border-neutral-200 bg-white p-1.5 text-neutral-900 shadow-xl dark:border-neutral-700 dark:bg-neutral-800 dark:text-neutral-100"
        >
          {destinations.map((destination) => {
            const Icon = destination.Icon;
            const destinationLabel = destination.labelKey ? t(destination.labelKey) : destination.label;
            const active = activeView === destination.id;
            return (
              <button
                key={destination.id}
                type="button"
                role="menuitem"
                aria-current={active ? 'page' : undefined}
                onClick={() => navigate(destination)}
                className={cn(
                  'flex w-full items-center gap-2 rounded-md px-2.5 py-2 text-left text-sm transition-colors duration-fast',
                  'focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-brand-navy-tint/40 active:translate-y-px',
                  active
                    ? 'bg-neutral-100 font-semibold text-brand-navy dark:bg-neutral-700 dark:text-neutral-100'
                    : 'text-neutral-700 hover:bg-neutral-50 dark:text-neutral-300 dark:hover:bg-neutral-700',
                )}
              >
                <Icon aria-hidden="true" className="h-4 w-4 shrink-0 text-neutral-500 dark:text-neutral-400" />
                <span className="truncate">{destinationLabel}</span>
              </button>
            );
          })}
        </div>
      )}
    </div>
  );
}
