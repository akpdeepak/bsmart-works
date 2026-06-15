import * as React from 'react';
import { cn } from '@/lib/utils';

// Canonical Tabs primitive — roving-tabindex, aria-selected, ARIA-linked tab/panel pairs.
// Replaces per-view tab-bar rebuilds (~every tabbed view). Composite: Tabs > TabList > Tab,
// Tabs > TabPanel. Controlled (value/onValueChange) or uncontrolled (defaultValue).
//
// IDs: React.useId() scopes the tab↔panel aria-controls/aria-labelledby links to this instance.
// Keyboard: ArrowLeft/Right navigate tabs (activation follows focus); Home/End jump to ends.
// a11y: role=tablist/tab/tabpanel; aria-selected on active tab; tabIndex roving (0/-1);
//       focus-visible ring on tab; tabpanel is focusable (tabIndex=0).

const TabsContext = React.createContext(null);

function useTabs() {
  const ctx = React.useContext(TabsContext);
  if (!ctx) throw new Error('Tab components must be used inside <Tabs>');
  return ctx;
}

export function Tabs({ defaultValue, value, onValueChange, children, className, ...props }) {
  const instanceId = React.useId();
  const [internal, setInternal] = React.useState(defaultValue ?? '');
  const activeValue = value !== undefined ? value : internal;

  const select = React.useCallback((val) => {
    if (value === undefined) setInternal(val);
    onValueChange?.(val);
  }, [value, onValueChange]);

  return (
    <TabsContext.Provider value={{ activeValue, select, instanceId }}>
      <div className={cn('', className)} {...props}>
        {children}
      </div>
    </TabsContext.Provider>
  );
}

export function TabList({ children, className, 'aria-label': ariaLabel, ...props }) {
  return (
    <div
      role="tablist"
      aria-label={ariaLabel}
      className={cn('flex border-b border-neutral-200 dark:border-neutral-700', className)}
      {...props}
    >
      {children}
    </div>
  );
}

export function Tab({ value, children, className, disabled, ...props }) {
  const { activeValue, select, instanceId } = useTabs();
  const isSelected = activeValue === value;
  const tabId = `${instanceId}-tab-${value}`;
  const panelId = `${instanceId}-panel-${value}`;
  const ref = React.useRef(null);

  function handleKeyDown(e) {
    const list = ref.current?.closest('[role="tablist"]');
    if (!list) return;
    const tabs = Array.from(list.querySelectorAll('[role="tab"]:not([disabled])'));
    const idx = tabs.indexOf(ref.current);
    let target = null;
    if (e.key === 'ArrowRight') { e.preventDefault(); target = tabs[(idx + 1) % tabs.length]; }
    else if (e.key === 'ArrowLeft') { e.preventDefault(); target = tabs[(idx - 1 + tabs.length) % tabs.length]; }
    else if (e.key === 'Home') { e.preventDefault(); target = tabs[0]; }
    else if (e.key === 'End') { e.preventDefault(); target = tabs[tabs.length - 1]; }
    if (target) { target.focus(); target.click(); }
  }

  return (
    <button
      ref={ref}
      id={tabId}
      role="tab"
      type="button"
      aria-selected={isSelected}
      aria-controls={panelId}
      tabIndex={isSelected ? 0 : -1}
      disabled={disabled}
      onClick={() => !disabled && select(value)}
      onKeyDown={handleKeyDown}
      className={cn(
        'relative -mb-px px-4 py-2.5 text-sm font-medium transition-colors duration-fast whitespace-nowrap',
        'focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-brand-navy-tint/40 focus-visible:ring-offset-2',
        'disabled:pointer-events-none disabled:opacity-50',
        isSelected
          ? 'border-b-2 border-brand-navy text-brand-navy dark:border-neutral-100 dark:text-neutral-100'
          : 'border-b-2 border-transparent text-neutral-600 hover:text-neutral-900 dark:text-neutral-400 dark:hover:text-neutral-200',
        className
      )}
      {...props}
    >
      {children}
    </button>
  );
}

export function TabPanel({ value, children, className, ...props }) {
  const { activeValue, instanceId } = useTabs();
  const isActive = activeValue === value;
  // Always render the wrapper div so Tab's aria-controls resolves to an existing element.
  // Inactive panels use the HTML `hidden` attribute (removes from a11y tree + display).
  if (!isActive) {
    return (
      <div
        id={`${instanceId}-panel-${value}`}
        role="tabpanel"
        aria-labelledby={`${instanceId}-tab-${value}`}
        hidden
      />
    );
  }
  return (
    <div
      id={`${instanceId}-panel-${value}`}
      role="tabpanel"
      aria-labelledby={`${instanceId}-tab-${value}`}
      tabIndex={0}
      className={cn('pt-4 focus-visible:outline-none', className)}
      {...props}
    >
      {children}
    </div>
  );
}
