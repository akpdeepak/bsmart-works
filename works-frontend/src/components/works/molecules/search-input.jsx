import * as React from 'react';
import { Search, X } from 'lucide-react';
import { cn } from '@/lib/utils';

// Molecule — debounced search input with clear button (CLAUDE.md §4.18: 250ms debounce rule).
// Calls `onSearch(value)` after the debounce delay — never on every keystroke.
// Uncontrolled by default; pass `value` + `onChange` to make it fully controlled.
// Usage:
//   <SearchInput placeholder="Search work items…" onSearch={setQuery} />
export function SearchInput({
  placeholder = 'Search…',
  onSearch,
  debounceMs = 250,
  defaultValue = '',
  value: controlledValue,
  onChange: onChangeProp,
  className,
  inputClassName,
  size = 'md',
  ...props
}) {
  const isControlled = controlledValue !== undefined;
  const [internalValue, setInternalValue] = React.useState(defaultValue);
  const displayValue = isControlled ? controlledValue : internalValue;

  const timerRef = React.useRef(null);

  const handleChange = React.useCallback(
    (e) => {
      const next = e.target.value;
      if (!isControlled) setInternalValue(next);
      if (onChangeProp) onChangeProp(e);

      if (!onSearch) return;
      clearTimeout(timerRef.current);
      timerRef.current = setTimeout(() => onSearch(next), debounceMs);
    },
    [isControlled, onChangeProp, onSearch, debounceMs]
  );

  const handleClear = React.useCallback(() => {
    if (!isControlled) setInternalValue('');
    if (onChangeProp) onChangeProp({ target: { value: '' } });
    if (onSearch) {
      clearTimeout(timerRef.current);
      onSearch('');
    }
  }, [isControlled, onChangeProp, onSearch]);

  // flush on unmount
  React.useEffect(() => () => clearTimeout(timerRef.current), []);

  const sizeClasses = size === 'sm' ? 'h-8 text-xs' : 'h-9 text-sm';
  const iconSize = size === 'sm' ? 'h-3.5 w-3.5' : 'h-4 w-4';

  return (
    <div className={cn('relative flex items-center', className)}>
      <Search
        aria-hidden="true"
        className={cn(
          'pointer-events-none absolute left-3 shrink-0 text-neutral-400',
          iconSize
        )}
      />
      <input
        type="search"
        role="searchbox"
        placeholder={placeholder}
        value={displayValue}
        onChange={handleChange}
        className={cn(
          'w-full rounded-md border border-neutral-200 bg-white pl-9 pr-9 text-neutral-900 placeholder:text-neutral-400',
          'transition-colors duration-fast',
          'hover:border-neutral-400',
          'focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-brand-navy-tint/40 focus-visible:ring-offset-2 focus-visible:border-brand-navy',
          'disabled:opacity-50 disabled:pointer-events-none',
          'dark:bg-neutral-800 dark:border-neutral-600 dark:text-neutral-100',
          sizeClasses,
          inputClassName
        )}
        {...props}
      />
      {displayValue && (
        <button
          type="button"
          aria-label="Clear search"
          onClick={handleClear}
          className={cn(
            'absolute right-3 flex items-center justify-center rounded text-neutral-400',
            'hover:text-neutral-600 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-brand-navy-tint/40',
            'transition-colors duration-fast',
            iconSize
          )}
        >
          <X aria-hidden="true" className={iconSize} />
        </button>
      )}
    </div>
  );
}
