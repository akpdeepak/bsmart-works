import * as React from 'react';
import { ChevronDown } from 'lucide-react';
import { cn } from '@/lib/utils';
import { Badge } from './badge';

// The core interaction model (CLAUDE.md §4.7): every section/panel can collapse. Header shows
// title + count badge + right-aligned chevron; chevron rotates 180° when open; height animates
// smoothly via the grid-rows 0fr→1fr technique. Pass `id` to persist open/closed per user in
// localStorage under `bsw_ui_<id>`. a11y: trigger is a real <button> with aria-expanded /
// aria-controls; collapsed content is `inert` so it leaves the tab order and a11y tree (§4.17).
function readPersisted(key, fallback) {
  if (!key) return fallback;
  try {
    const v = localStorage.getItem(key);
    return v === null ? fallback : v === '1';
  } catch {
    return fallback;
  }
}

export function Collapsible({ id, title, count, defaultOpen = true, children, className }) {
  const storageKey = id ? `bsw_ui_${id}` : null;
  const [open, setOpen] = React.useState(() => readPersisted(storageKey, defaultOpen));
  const regionId = React.useId();

  React.useEffect(() => {
    if (!storageKey) return;
    try {
      localStorage.setItem(storageKey, open ? '1' : '0');
    } catch {
      /* private-mode / quota — preference simply won't persist */
    }
  }, [open, storageKey]);

  return (
    <section className={cn('border-b border-neutral-200 dark:border-neutral-700', className)}>
      <button
        type="button"
        aria-expanded={open}
        aria-controls={regionId}
        onClick={() => setOpen((o) => !o)}
        className="flex w-full items-center gap-2 py-3 text-left transition-colors duration-fast hover:bg-neutral-50 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-brand-navy-tint/40 focus-visible:ring-offset-2 dark:hover:bg-neutral-800"
      >
        <span className="text-sm font-semibold uppercase tracking-wide text-neutral-700 dark:text-neutral-200">
          {title}
        </span>
        {count != null && <Badge tone="neutral">{count}</Badge>}
        <ChevronDown
          aria-hidden="true"
          className={cn(
            'ml-auto h-4 w-4 shrink-0 text-neutral-400 transition-transform duration-base ease-out-quint',
            open && 'rotate-180'
          )}
        />
      </button>
      {/* WI-24: height transition via grid-rows 0fr→1fr on duration-base + out-quint. */}
      <div
        id={regionId}
        className={cn(
          'grid transition-[grid-template-rows] duration-base ease-out-quint',
          open ? 'grid-rows-[1fr]' : 'grid-rows-[0fr]'
        )}
      >
        <div className="overflow-hidden" inert={!open ? true : undefined}>
          <div className="pb-3">{children}</div>
        </div>
      </div>
    </section>
  );
}
