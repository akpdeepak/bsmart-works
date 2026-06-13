import { cn } from '@/lib/utils';
import { visibleModes } from '@/lib/nav-model';
import { useI18n } from '@/lib/i18n';

// Organism — the narrow navy icon rail (mockup left edge). One icon per top-level mode; the active
// mode gets a brand-orange left accent + white icon. The final mode ("Set up") is pinned to the
// bottom. Clicking a mode hands its id up; the parent lands on that mode's first surface.
//
// Design rules: bg-brand-navy, lucide icons only, brand-orange active accent, all five interactive
// states, labelled buttons (§4.6, §4.8, §4.12, §4.23). Width is the `w-rail` token, not a literal.

export function ModeRail({ activeMode, onSelectMode, visibility }) {
  const { t } = useI18n();
  const modes = visibleModes(visibility);
  return (
    <nav
      aria-label={t('nav.workspaceModes')}
      className="flex h-full w-rail shrink-0 flex-col items-center gap-1 overflow-y-auto border-r border-white/5 bg-brand-navy py-2"
    >
      {modes.map((mode, i) => {
        const Icon = mode.Icon;
        const active = activeMode === mode.id;
        const pinnedBottom = mode.id === 'setup' && i === modes.length - 1;
        const label = mode.labelKey ? t(mode.labelKey) : mode.label;
        return (
          <button
            key={mode.id}
            type="button"
            title={label}
            aria-current={active ? 'page' : undefined}
            onClick={() => onSelectMode?.(mode.id)}
            className={cn(
              'relative flex w-full flex-col items-center gap-1 py-2 transition-colors duration-fast',
              'focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-inset focus-visible:ring-white/40',
              pinnedBottom && 'mt-auto',
              active ? 'text-white' : 'text-white/70 hover:text-white'
            )}
          >
            {active && (
              <span
                aria-hidden="true"
                className="absolute left-0 top-1.5 bottom-1.5 w-0.5 rounded-r-full bg-brand-orange"
              />
            )}
            <Icon aria-hidden="true" className="h-5 w-5" />
            <span className="text-2xs font-semibold leading-none">{label}</span>
          </button>
        );
      })}
    </nav>
  );
}
