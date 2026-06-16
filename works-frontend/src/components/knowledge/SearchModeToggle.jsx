// SearchModeToggle — segmented control for switching between keyword and AI search modes.
// KR-044: AI semantic search in Know Studio. Persists the user's choice to localStorage
// so it survives navigation. Design tokens only (RB-30 §1); WCAG 2.1 AA (role="group",
// aria-pressed on each option). useSearchMode lives in use-search-mode.js so this file
// stays a component-only module (react-refresh/only-export-components).

export const SEARCH_MODE_KEY = 'know_search_mode';

function persist(m) {
  try { localStorage.setItem(SEARCH_MODE_KEY, m); } catch { /* private browsing */ }
}

/**
 * SearchModeToggle — segmented "Keyword | AI" toggle.
 *
 * @param {{ mode: 'keyword'|'ai', onChange: (mode: 'keyword'|'ai') => void }} props
 */
export function SearchModeToggle({ mode, onChange }) {
  const pick = (m) => { persist(m); onChange(m); };

  return (
    <div
      role="group"
      aria-label="Search mode"
      className="flex items-center rounded-lg border border-neutral-200 dark:border-neutral-700 overflow-hidden bg-white dark:bg-neutral-800 flex-shrink-0"
    >
      {[
        { value: 'keyword', label: 'Keyword' },
        { value: 'ai',      label: 'AI' },
      ].map(({ value, label }) => (
        <button
          key={value}
          type="button"
          aria-pressed={mode === value}
          onClick={() => pick(value)}
          className={[
            'px-3 py-1.5 text-xs font-medium transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-inset focus-visible:ring-brand-navy-tint/40',
            mode === value
              ? 'bg-brand-navy text-white'
              : 'text-neutral-600 dark:text-neutral-400 hover:bg-neutral-50 dark:hover:bg-neutral-700',
          ].join(' ')}
        >
          {label}
        </button>
      ))}
    </div>
  );
}
