// WI-11 — FlagDevtools developer overlay.
//
// Only mounted when import.meta.env.DEV is true (i.e. `vite dev`). Never shipped to production.
// Shows all flags from the FLAGS registry as toggle switches. Toggling:
//   1. Writes the new value to localStorage as 'flag:<key>'.
//   2. Dispatches a synthetic 'storage' event so useFlag() hooks update live in the same tab.
//
// Styled with design tokens only (bg-neutral-900, text-neutral-50, etc.) — no raw hex or
// arbitrary Tailwind values (RB-30 §1).

import { useState } from 'react';
import { FLAGS, getFlag } from '@/lib/flags';
import { cn } from '@/lib/utils';

/**
 * Read all flags from the registry, resolving current localStorage overrides.
 * @returns {Record<string, boolean>}
 */
function readAll() {
  return Object.fromEntries(
    Object.keys(FLAGS).map((key) => [key, getFlag(key)])
  );
}

/**
 * Developer feature-flag overlay (DEV mode only).
 * Renders a fixed bottom-right panel; collapses to a single button when minimised.
 */
export function FlagDevtools() {
  const [values, setValues] = useState(readAll);
  const [open, setOpen] = useState(false);

  function toggle(key) {
    const next = !values[key];
    try {
      localStorage.setItem(`flag:${key}`, String(next));
      // Dispatch a synthetic storage event so useFlag() hooks in the same tab pick up the change.
      // The native StorageEvent constructor is supported in all modern browsers.
      window.dispatchEvent(
        new StorageEvent('storage', { key: `flag:${key}`, newValue: String(next) })
      );
    } catch {
      // localStorage unavailable — silently skip persistence; the in-component toggle still works.
    }
    setValues((prev) => ({ ...prev, [key]: next }));
  }

  return (
    <div
      className={cn(
        'fixed bottom-4 right-4 z-toast',
        'rounded-lg border border-neutral-700 bg-neutral-900 text-neutral-100 shadow-xl',
        'text-xs font-mono',
      )}
      role="complementary"
      aria-label="Feature-flag developer tools"
    >
      {/* Header / toggle bar */}
      <button
        type="button"
        onClick={() => setOpen((o) => !o)}
        className={cn(
          'flex w-full items-center justify-between gap-3 px-3 py-2',
          'rounded-lg text-xs font-semibold text-neutral-100',
          'hover:bg-neutral-800 focus-visible:outline-none focus-visible:ring-2',
          'focus-visible:ring-brand-navy-tint ring-offset-neutral-900 ring-offset-1',
          'transition-colors duration-fast',
        )}
        aria-expanded={open}
      >
        <span>🚩 flags</span>
        <span className="text-neutral-400" aria-hidden="true">{open ? '▲' : '▼'}</span>
      </button>

      {/* Flag list */}
      {open && (
        <ul className="border-t border-neutral-700 px-3 py-2 space-y-2 min-w-52">
          {Object.keys(FLAGS).map((key) => {
            const enabled = values[key];
            const id = `flag-toggle-${key}`;
            return (
              <li key={key} className="flex items-center justify-between gap-4">
                <label htmlFor={id} className="cursor-pointer text-neutral-300 truncate flex-1">
                  {key}
                </label>
                {/* Toggle switch built from a checkbox */}
                <button
                  id={id}
                  type="button"
                  role="switch"
                  aria-checked={enabled}
                  aria-label={`Toggle ${key}`}
                  onClick={() => toggle(key)}
                  className={cn(
                    'relative inline-flex h-4 w-8 shrink-0 cursor-pointer items-center rounded-full',
                    'transition-colors duration-fast focus-visible:outline-none',
                    'focus-visible:ring-2 focus-visible:ring-brand-navy-tint ring-offset-neutral-900 ring-offset-1',
                    enabled ? 'bg-semantic-success' : 'bg-neutral-600',
                  )}
                >
                  <span
                    className={cn(
                      'inline-block h-3 w-3 rounded-full bg-neutral-100 shadow-sm',
                      'transition-transform duration-fast',
                      enabled ? 'translate-x-4' : 'translate-x-0.5',
                    )}
                    aria-hidden="true"
                  />
                </button>
              </li>
            );
          })}
        </ul>
      )}
    </div>
  );
}
