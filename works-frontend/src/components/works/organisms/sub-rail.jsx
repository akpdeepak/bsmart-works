import { Command, Star, ChevronLeft, ChevronRight } from 'lucide-react';
import { cn } from '@/lib/utils';
import { Badge } from '@/components/works/atoms/badge';
import { getMode, visibleSurfaces } from '@/lib/nav-model';

// Organism — the white contextual sub-rail (mockup second column). Shows the active mode's title
// and its surfaces with icons matching the ModeRail icon set. A collapse toggle narrows the rail
// to icon-only when the user needs more horizontal real-estate.
//
// `badges` / `dots` are optional maps keyed by surface id, so live counts (My Works, Notifications)
// and the active-sprint dot carry over from the old sidebar. Design: tokens only, all five states,
// labelled controls (§4.6, §4.8, §4.12).

// `primary` (optional) is the set of surface ids that are core to an active role preview; those
// get a small star so an Admin/Owner previewing a role sees what that role leans on.
export function SubRail({ activeMode, activeView, activeExtra, onNavigate, visibility, primary, badges = {}, dots = {}, collapsed, onToggleCollapsed }) {
  const mode = getMode(activeMode);
  const surfaces = visibleSurfaces(activeMode, visibility);
  const primarySet = primary instanceof Set ? primary : new Set(primary || []);

  // ── Collapsed: icon-only narrow strip ─────────────────────────────────────
  if (collapsed) {
    return (
      <div className="flex h-full w-12 shrink-0 flex-col overflow-y-auto border-r border-neutral-200 bg-white py-2 dark:border-neutral-700 dark:bg-neutral-900">
        <button
          type="button"
          aria-label="Expand navigation panel"
          onClick={onToggleCollapsed}
          className="flex w-full items-center justify-center py-2 mb-1 text-neutral-400 hover:text-brand-navy transition-colors duration-fast focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-brand-navy-tint/40"
        >
          <ChevronRight aria-hidden="true" className="h-4 w-4" />
        </button>
        <nav aria-label={`${mode.label} surfaces`} className="flex flex-col gap-0.5 px-1">
          {surfaces.map((s) => {
            const active = activeView === s.id;
            const Icon = s.Icon;
            const badge = badges[s.id];
            return (
              <button
                key={s.id}
                type="button"
                title={s.label}
                aria-label={badge != null && badge > 0 ? `${s.label} (${badge > 9 ? '9+' : badge})` : s.label}
                aria-current={active ? 'page' : undefined}
                onClick={() => onNavigate?.(s.id)}
                className={cn(
                  'relative flex w-full items-center justify-center rounded-md py-2.5 transition-colors duration-fast',
                  'focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-brand-navy-tint/40',
                  active
                    ? 'bg-neutral-100 text-brand-navy dark:bg-neutral-800 dark:text-neutral-100'
                    : 'text-neutral-500 hover:bg-neutral-50 dark:text-neutral-400 dark:hover:bg-neutral-800'
                )}
              >
                {active && (
                  <span aria-hidden="true" className="absolute left-0 top-1.5 bottom-1.5 w-0.5 rounded-r-full bg-brand-orange" />
                )}
                {Icon && <Icon aria-hidden="true" className="h-4 w-4 shrink-0" />}
                {badge != null && badge > 0 && (
                  <span className="absolute -top-0.5 right-0.5 min-w-[14px] h-3.5 px-0.5 rounded-full bg-brand-orange text-white text-2xs font-bold flex items-center justify-center leading-none">
                    {badge > 9 ? '9+' : badge}
                  </span>
                )}
              </button>
            );
          })}
        </nav>
      </div>
    );
  }

  // ── Expanded: icons + labels ───────────────────────────────────────────────
  return (
    <div className="flex h-full w-subrail shrink-0 flex-col overflow-y-auto border-r border-neutral-200 bg-white px-2.5 py-3 dark:border-neutral-700 dark:bg-neutral-900">
      <div className="flex items-center justify-between px-2 pb-3 pt-0.5">
        <h2 className="text-sm font-bold text-brand-navy dark:text-neutral-100">
          {mode.label}
        </h2>
        <button
          type="button"
          aria-label="Collapse navigation panel"
          onClick={onToggleCollapsed}
          className="p-0.5 rounded text-neutral-400 hover:text-brand-navy transition-colors duration-fast focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-brand-navy-tint/40"
        >
          <ChevronLeft aria-hidden="true" className="h-4 w-4" />
        </button>
      </div>

      {/* Orientation row — when the current view is a lens cockpit / BQL (not pinned to this mode's
          surfaces), show it highlighted so the nav still answers "where am I?". */}
      {activeExtra && (
        <div className="mb-1.5 border-b border-neutral-100 pb-1.5 dark:border-neutral-800">
          <span className="relative flex w-full items-center gap-2.5 rounded-md bg-neutral-100 px-2.5 py-2 text-sm font-semibold text-brand-navy dark:bg-neutral-800 dark:text-neutral-100">
            <span aria-hidden="true" className="absolute left-0 top-1.5 bottom-1.5 w-0.5 rounded-r-full bg-brand-orange" />
            <span className="flex-1 truncate">{activeExtra.label}</span>
            {activeExtra.tag && (
              <span className="shrink-0 rounded-full bg-brand-orange/10 px-1.5 py-0.5 text-2xs font-semibold uppercase tracking-wide text-brand-orange">{activeExtra.tag}</span>
            )}
          </span>
        </div>
      )}

      <nav aria-label={`${mode.label} surfaces`} className="space-y-0.5">
        {surfaces.map((s) => {
          const active = activeView === s.id;
          const Icon = s.Icon;
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
              {Icon && (
                <Icon
                  aria-hidden="true"
                  className={cn(
                    'h-4 w-4 shrink-0',
                    active ? 'text-brand-navy dark:text-neutral-100' : 'text-neutral-500 dark:text-neutral-400'
                  )}
                />
              )}
              <span className="flex-1 truncate">{s.label}</span>
              {primarySet.has(s.id) && (
                <Star aria-label="Key surface for this role" className="ml-auto h-3 w-3 shrink-0 fill-brand-orange text-brand-orange" />
              )}
              {badge != null && badge > 0 && (
                <Badge tone={s.id === 'notifications' ? 'danger' : 'neutral'} className={cn('shrink-0', primarySet.has(s.id) ? 'ml-1.5' : 'ml-auto')}>
                  {badge}
                </Badge>
              )}
              {dot && !primarySet.has(s.id) && (
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
