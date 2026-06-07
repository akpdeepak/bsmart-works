import * as React from 'react';
import { Modal } from '@/components/works/molecules/modal';
import { mergeShortcuts, formatBinding } from '@/lib/shortcuts';

// Organism (iteration 18, Cap S — keyboard shortcuts). The "?" help overlay listing every shortcut,
// grouped, with per-user overrides merged in and a "customized" marker. Read-only reference; the
// rebinding flow lives in settings. Uses the canonical Modal (focus trap, Esc, a11y); tokens only.
export function ShortcutsHelp({ onClose, overrides = {} }) {
  const shortcuts = React.useMemo(() => mergeShortcuts(overrides), [overrides]);
  const groups = React.useMemo(() => {
    const byGroup = new Map();
    for (const s of shortcuts) {
      if (!byGroup.has(s.group)) byGroup.set(s.group, []);
      byGroup.get(s.group).push(s);
    }
    return Array.from(byGroup.entries());
  }, [shortcuts]);

  return (
    <Modal title="Keyboard shortcuts" onClose={onClose} size="lg">
      <div className="space-y-6">
        {groups.map(([group, items]) => (
          <section key={group}>
            <h3 className="mb-2 text-xs font-semibold uppercase tracking-wide text-neutral-600">{group}</h3>
            <ul className="divide-y divide-neutral-200 dark:divide-neutral-700">
              {items.map((s) => (
                <li key={s.id} className="flex items-center justify-between py-1.5 text-sm">
                  <span className="text-neutral-900 dark:text-neutral-100">
                    {s.label}
                    {s.customized && (
                      <span className="ml-2 text-xs text-brand-navy-tint">(custom)</span>
                    )}
                  </span>
                  <kbd className="rounded-sm border border-neutral-300 bg-neutral-100 px-2 py-0.5 font-mono text-xs text-neutral-700 dark:border-neutral-600 dark:bg-neutral-800 dark:text-neutral-200">
                    {formatBinding(s.keys)}
                  </kbd>
                </li>
              ))}
            </ul>
          </section>
        ))}
      </div>
    </Modal>
  );
}
