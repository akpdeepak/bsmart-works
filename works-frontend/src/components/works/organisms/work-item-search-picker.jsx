import { useEffect, useRef, useState } from 'react';
import { Search, X } from 'lucide-react';
import { api } from '@/lib/apiClient';
import { TypeBadge } from '@/components/works/work-item-type';
import { cn } from '@/lib/utils';

/**
 * Typeahead picker for linking work items. Searches the server (/work-items/search), shows matches,
 * and calls onSelect(item) when one is chosen. Reused for setting a parent, adding a child, and
 * creating typed links. Excludes ids in `excludeIds` (self + already-related items).
 */
export function WorkItemSearchPicker({ onSelect, placeholder = 'Search work items…', excludeIds = [], autoFocus = false }) {
  const [query, setQuery] = useState('');
  const [results, setResults] = useState([]);
  const [loading, setLoading] = useState(false);
  const [open, setOpen] = useState(false);
  const boxRef = useRef(null);
  const exclude = new Set(excludeIds);

  // Debounced search. All setState happens inside the timeout (not synchronously in the effect
  // body) so React's set-state-in-effect rule is satisfied.
  useEffect(() => {
    const q = query.trim();
    let active = true;
    const t = setTimeout(() => {
      if (!active) return;
      if (q.length < 1) { setResults([]); setLoading(false); return; }
      setLoading(true);
      api.send(`/work-items/search?q=${encodeURIComponent(q)}`)
        .then((rows) => { if (active) { setResults(Array.isArray(rows) ? rows : []); setLoading(false); } })
        .catch(() => { if (active) { setResults([]); setLoading(false); } });
    }, 250);
    return () => { active = false; clearTimeout(t); };
  }, [query]);

  // Close on outside click.
  useEffect(() => {
    const onDown = (e) => { if (boxRef.current && !boxRef.current.contains(e.target)) setOpen(false); };
    document.addEventListener('mousedown', onDown);
    return () => document.removeEventListener('mousedown', onDown);
  }, []);

  const visible = results.filter((r) => !exclude.has(r.id));

  const choose = (item) => {
    onSelect(item);
    setQuery('');
    setResults([]);
    setOpen(false);
  };

  return (
    <div ref={boxRef} className="relative">
      <div className="flex items-center gap-1.5 rounded-md border border-neutral-200 dark:border-neutral-600 bg-white dark:bg-neutral-800 px-2 focus-within:border-brand-navy-tint">
        <Search className="h-3.5 w-3.5 text-neutral-400 flex-shrink-0" aria-hidden="true" />
        <input
          type="text"
          value={query}
          /* eslint-disable-next-line jsx-a11y/no-autofocus */
          autoFocus={autoFocus}
          onFocus={() => setOpen(true)}
          onChange={(e) => { setQuery(e.target.value); setOpen(true); }}
          placeholder={placeholder}
          className="flex-1 min-w-0 bg-transparent py-1.5 text-sm focus:outline-none text-neutral-900 dark:text-neutral-100"
          aria-label={placeholder}
        />
        {query && (
          <button onClick={() => { setQuery(''); setResults([]); }} className="text-neutral-300 hover:text-neutral-500" aria-label="Clear search">
            <X className="h-3.5 w-3.5" aria-hidden="true" />
          </button>
        )}
      </div>

      {open && query.trim().length > 0 && (
        <div className="absolute z-overlay mt-1 w-full rounded-md border border-neutral-200 dark:border-neutral-700 bg-white dark:bg-neutral-800 shadow-lg max-h-64 overflow-auto">
          {loading && <p className="px-3 py-2 text-xs text-neutral-500">Searching…</p>}
          {!loading && visible.length === 0 && <p className="px-3 py-2 text-xs text-neutral-500">No matches.</p>}
          {visible.map((item) => (
            <button
              key={item.id}
              onClick={() => choose(item)}
              className={cn(
                'flex w-full items-center gap-2 px-2.5 py-2 text-left hover:bg-neutral-50 dark:hover:bg-neutral-700',
                'focus-visible:outline-none focus-visible:bg-neutral-50 dark:focus-visible:bg-neutral-700'
              )}
            >
              <TypeBadge type={item.type} compact />
              <span className="font-mono text-xs text-neutral-500 flex-shrink-0">{item.autoId || item.id}</span>
              <span className="text-sm text-neutral-900 dark:text-neutral-100 truncate">{item.title}</span>
            </button>
          ))}
        </div>
      )}
    </div>
  );
}

export default WorkItemSearchPicker;
