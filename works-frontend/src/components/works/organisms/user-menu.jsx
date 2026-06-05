import { useEffect, useRef, useState } from 'react';
import { Settings, LogOut, Moon, Sun, ChevronDown } from 'lucide-react';
import { cn } from '@/lib/utils';

// Organism — topbar user menu (CLAUDE.md §4.19 atomic design; RB-30 §7 navigation chrome).
// Pure/presentational: identity + role come in as props, actions are callbacks. No business logic.
//
// Spec I01-S03 (App shell): the topbar holds the user menu. Avatar button → dropdown with
// identity, Settings, theme toggle, and Sign out. All five interactive states + keyboard/a11y.

function getInitials(name) {
  if (!name) return '??';
  const parts = name.trim().split(/\s+/);
  return parts.length > 1
    ? (parts[0][0] + parts[parts.length - 1][0]).toUpperCase()
    : name.slice(0, 2).toUpperCase();
}

export function UserMenu({
  user = { fullName: '', email: '' },
  role = '',
  darkMode = false,
  onToggleTheme,
  onOpenSettings,
  onLogout,
}) {
  const [open, setOpen] = useState(false);
  const ref = useRef(null);

  useEffect(() => {
    function onDocClick(e) {
      if (ref.current && !ref.current.contains(e.target)) setOpen(false);
    }
    function onKey(e) {
      if (e.key === 'Escape') setOpen(false);
    }
    document.addEventListener('mousedown', onDocClick);
    document.addEventListener('keydown', onKey);
    return () => {
      document.removeEventListener('mousedown', onDocClick);
      document.removeEventListener('keydown', onKey);
    };
  }, []);

  const item =
    'flex w-full items-center gap-2 rounded-md px-3 py-2 text-left text-sm text-neutral-700 ' +
    'dark:text-neutral-200 transition-colors duration-fast hover:bg-neutral-100 ' +
    'dark:hover:bg-neutral-700 focus-visible:outline-none focus-visible:ring-2 ' +
    'focus-visible:ring-brand-navy-tint/40 focus-visible:ring-offset-1';

  return (
    <div className="relative" ref={ref}>
      <button
        type="button"
        aria-label="User menu"
        aria-haspopup="menu"
        aria-expanded={open}
        onClick={() => setOpen((o) => !o)}
        className={cn(
          'flex items-center gap-2 rounded-md px-1.5 py-1 transition-colors duration-fast',
          'hover:bg-neutral-100 dark:hover:bg-neutral-800',
          'focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-brand-navy-tint/40 focus-visible:ring-offset-2'
        )}
      >
        <span className="flex h-8 w-8 items-center justify-center rounded-full bg-brand-navy text-xs font-semibold text-white">
          {getInitials(user.fullName)}
        </span>
        <ChevronDown aria-hidden="true" className="h-4 w-4 text-neutral-400" />
      </button>

      {open && (
        <div
          role="menu"
          aria-label="User menu"
          className="absolute right-0 top-full z-50 mt-1 w-60 rounded-lg border border-neutral-200 bg-white py-1 shadow-xl dark:border-neutral-700 dark:bg-neutral-800"
        >
          <div className="border-b border-neutral-100 px-3 py-2.5 dark:border-neutral-700">
            <p className="truncate text-sm font-semibold text-neutral-900 dark:text-neutral-100">
              {user.fullName}
            </p>
            {user.email && (
              <p className="truncate text-xs text-neutral-400">{user.email}</p>
            )}
            {role && (
              <p className="mt-1 truncate text-xs font-medium text-neutral-600 dark:text-neutral-300">
                {role}
              </p>
            )}
          </div>

          <div className="py-1">
            {onOpenSettings && (
              <button
                type="button"
                role="menuitem"
                className={item}
                onClick={() => {
                  setOpen(false);
                  onOpenSettings();
                }}
              >
                <Settings aria-hidden="true" className="h-4 w-4 text-neutral-400" />
                Settings
              </button>
            )}
            {onToggleTheme && (
              <button
                type="button"
                role="menuitem"
                className={item}
                onClick={() => {
                  setOpen(false);
                  onToggleTheme();
                }}
              >
                {darkMode ? (
                  <Sun aria-hidden="true" className="h-4 w-4 text-neutral-400" />
                ) : (
                  <Moon aria-hidden="true" className="h-4 w-4 text-neutral-400" />
                )}
                {darkMode ? 'Light mode' : 'Dark mode'}
              </button>
            )}
          </div>

          {onLogout && (
            <div className="border-t border-neutral-100 py-1 dark:border-neutral-700">
              <button
                type="button"
                role="menuitem"
                className={cn(item, 'text-semantic-danger hover:bg-semantic-danger/10')}
                onClick={() => {
                  setOpen(false);
                  onLogout();
                }}
              >
                <LogOut aria-hidden="true" className="h-4 w-4" />
                Sign out
              </button>
            </div>
          )}
        </div>
      )}
    </div>
  );
}
