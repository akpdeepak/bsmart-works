import { Command } from 'lucide-react';
import { cn } from '@/lib/utils';
import { Badge } from '@/components/works/atoms/badge';
import { getMode } from '@/lib/nav-model';

// Organism — the white contextual sub-rail (mockup second column). Shows the active mode's title
// and its surfaces; the current surface gets a brand-orange left accent + navy label. A footer
// reminds the user the command palette reaches every surface.
//
// `badges` / `dots` are optional maps keyed by surface id, so live counts (My Works, Notifications)
// and the active-sprint dot carry over from the old sidebar. Design: tokens only, all five states,
// labelled controls (§4.6, §4.8, §4.12).

export function SubRail({ activeMode, activeView, onNavigate, badges = {}, dots = {} }) {
  const mode = getMode(activeMode);

  return (
    <div className="flex h-full w-subrail shrink-0 flex-col overflow-y-auto border-r border-neutral-200 bg-white px-2.5 py-3 dark:border-neutral-700 dark:bg-neutral-900">
      <h2 className="px-2 pb-3 pt-0.5 text-sm font-bold text-brand-navy dark:text-neutral-100">
        {mode.label}
      </h2>

      <nav aria-label={`${mode.label} surfaces`} className="space-y-0.5">
        {mode.surfaces.map((s) => {
          const active = activeView === s.id;
          const badge = badges[s.id];
          const dot = dots[s.id];
          return (
            <button
              key={s.id}
              type="button"
              aria-current={active ? 'page' : undefined}
              onClick={() => onNavigate?.(s.id)}
              className={cn(
                'relative flex w-full items-center gap-2.5 rounded-md px-2.5 py-2 text-left text-sm transition-colors duration-fast',
                'focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-brand-navy-tint/40 focus-visible:ring-offset-1',
                active
                  ? 'bg-neutral-100 font-semibold text-brand-navy dark:bg-neutral-800 dark:text-neutral-100'
                  : 'font-normal text-neutral-700 hover:bg-neutral-50 dark:text-neutral-300 dark:hover:bg-neutral-800'
              )}
            >
              {active && (
                <span
                  aria-hidden="true"
                  className="absolute left-0 top-1.5 bottom-1.5 w-0.5 rounded-r-full bg-brand-orange"
                />
              )}
              <span className="flex-1 truncate">{s.label}</span>
              {badge != null && badge > 0 && (
                <Badge tone={s.id === 'notifications' ? 'danger' : 'neutral'} className="ml-auto shrink-0">
                  {badge}
                </Badge>
              )}
              {dot && (
                <span aria-hidden="true" className="ml-auto h-2 w-2 shrink-0 rounded-full bg-semantic-success" />
              )}
            </button>
          );
        })}
      </nav>

      <div className="mt-auto flex items-center gap-2 border-t border-dashed border-neutral-200 pt-3 text-xs text-neutral-500 dark:border-neutral-700">
        <Command aria-hidden="true" className="h-3.5 w-3.5" />
        <span>
          <kbd className="font-mono">⌘K</kbd> reaches every surface
        </span>
      </div>
    </div>
  );
}
