import * as React from 'react';
import { Search, CornerDownLeft } from 'lucide-react';
import { cn } from '@/lib/utils';
import { Backdrop } from '@/components/works/atoms/backdrop';

// Organism — the Cmd/Ctrl-K command palette: type-to-find navigation + quick actions, the
// power-user accelerator the brand spec asks for (§5.2, predictability + speed). Accessible
// combobox/listbox: the input keeps focus and drives selection via aria-activedescendant; the
// options are buttons (keyboard-safe, jsx-a11y clean). Escape/backdrop close. Tokens only
// (z-palette + motion); Lucide icons, never emoji (RB-30 §8).
//
// Mount it only while open (the parent gates it, like the Modals) so its state resets each time.
// commands: [{ id, label, group?, Icon?, keywords?, run() }] — filtering matches label/group/keywords.

function matches(cmd, q) {
  if (!q) return true;
  const hay = `${cmd.label} ${cmd.group ?? ''} ${(cmd.keywords ?? []).join(' ')}`.toLowerCase();
  return q.toLowerCase().split(/\s+/).every((tok) => hay.includes(tok));
}

export function CommandPalette({ onClose, commands = [], onSearch, placeholder = 'Search actions and pages…' }) {
  const [query, setQuery] = React.useState('');
  const [active, setActive] = React.useState(0);
  const [dynamic, setDynamic] = React.useState([]);
  const inputRef = React.useRef(null);
  const listRef = React.useRef(null);

  // Server-side search (iteration 18, Cap S — "fuzzy search across actions, items, people"). When an
  // onSearch is supplied, the static actions filter locally and the dynamic results (items + people)
  // are fetched, debounced, as the user types. The two are concatenated below.
  React.useEffect(() => {
    if (!onSearch) return undefined;
    let cancelled = false;
    // All setDynamic calls happen inside this async (timeout/promise) continuation, never
    // synchronously in the effect body (react-hooks/set-state-in-effect).
    const t = setTimeout(() => {
      if (!query.trim()) {
        if (!cancelled) setDynamic([]);
        return;
      }
      Promise.resolve(onSearch(query))
        .then((results) => {
          if (!cancelled) setDynamic(Array.isArray(results) ? results : []);
        })
        .catch(() => {
          if (!cancelled) setDynamic([]);
        });
    }, 200);
    return () => {
      cancelled = true;
      clearTimeout(t);
    };
  }, [onSearch, query]);

  const filtered = React.useMemo(
    () => [...commands.filter((c) => matches(c, query)), ...dynamic],
    [commands, query, dynamic],
  );

  // Focus the input and lock body scroll while the palette is mounted (= open).
  React.useEffect(() => {
    inputRef.current?.focus();
    const prev = document.body.style.overflow;
    document.body.style.overflow = 'hidden';
    return () => {
      document.body.style.overflow = prev;
    };
  }, []);

  // Keep the active option scrolled into view as it changes (DOM-only; no state writes).
  React.useEffect(() => {
    const el = listRef.current?.querySelector(`#cmdk-opt-${active}`);
    el?.scrollIntoView?.({ block: 'nearest' });
  }, [active]);

  // `active` is reset to 0 on every query change, and the arrow handlers wrap within bounds,
  // so it always indexes a valid row (or none when the list is empty).
  const safeActive = filtered.length ? Math.min(active, filtered.length - 1) : 0;

  function run(cmd) {
    if (!cmd) return;
    cmd.run?.();
    onClose?.();
  }

  function onKeyDown(e) {
    if (e.key === 'Escape') {
      e.preventDefault();
      onClose?.();
    } else if (e.key === 'ArrowDown') {
      e.preventDefault();
      setActive(filtered.length ? (safeActive + 1) % filtered.length : 0);
    } else if (e.key === 'ArrowUp') {
      e.preventDefault();
      setActive(filtered.length ? (safeActive - 1 + filtered.length) % filtered.length : 0);
    } else if (e.key === 'Enter') {
      e.preventDefault();
      run(filtered[safeActive]);
    }
  }

  const activeId = filtered.length ? `cmdk-opt-${safeActive}` : undefined;

  return (
    <div className="fixed inset-0 z-palette flex items-start justify-center p-4 pt-24">
      <Backdrop onClick={onClose} label="Close command palette" />

      <div
        role="dialog"
        aria-modal="true"
        aria-label="Command palette"
        className="relative w-full max-w-lg overflow-hidden rounded-xl bg-white shadow-xl dark:bg-neutral-800"
      >
        <div className="flex items-center gap-2 border-b border-neutral-200 px-3 dark:border-neutral-700">
          <Search aria-hidden="true" className="h-4 w-4 shrink-0 text-neutral-400" />
          <input
            ref={inputRef}
            type="text"
            role="combobox"
            aria-expanded="true"
            aria-controls="cmdk-list"
            aria-activedescendant={activeId}
            aria-label="Search actions and pages"
            placeholder={placeholder}
            value={query}
            onChange={(e) => { setQuery(e.target.value); setActive(0); }}
            onKeyDown={onKeyDown}
            className="h-12 w-full bg-transparent text-sm text-neutral-900 outline-none placeholder:text-neutral-400 dark:text-neutral-100"
          />
        </div>

        <div ref={listRef} id="cmdk-list" role="listbox" aria-label="Commands" className="max-h-80 overflow-y-auto p-1.5">
          {filtered.length === 0 ? (
            <p className="px-3 py-6 text-center text-sm text-neutral-500">No matches. Try another word.</p>
          ) : (
            filtered.map((cmd, i) => (
              <button
                key={cmd.id}
                type="button"
                role="option"
                id={`cmdk-opt-${i}`}
                aria-selected={i === safeActive}
                tabIndex={-1}
                onMouseMove={() => setActive(i)}
                onClick={() => run(cmd)}
                className={cn(
                  'flex w-full items-center gap-2 rounded-md px-3 py-2 text-left text-sm transition-colors duration-fast',
                  i === safeActive
                    ? 'bg-neutral-100 text-neutral-900 dark:bg-neutral-700 dark:text-neutral-100'
                    : 'text-neutral-700 dark:text-neutral-300'
                )}
              >
                {cmd.Icon && <cmd.Icon aria-hidden="true" className="h-4 w-4 shrink-0 text-neutral-400" />}
                <span className="flex-1 truncate">{cmd.label}</span>
                {cmd.group && <span className="shrink-0 text-xs text-neutral-600 dark:text-neutral-400">{cmd.group}</span>}
                {i === safeActive && <CornerDownLeft aria-hidden="true" className="h-3.5 w-3.5 shrink-0 text-neutral-400" />}
              </button>
            ))
          )}
        </div>
      </div>
    </div>
  );
}
