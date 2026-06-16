import { cn } from '@/lib/utils';
import { DENSITY_LEVELS } from '@/lib/density';

const LABELS = {
  compact:     'Compact',
  comfortable: 'Comfortable',
  spacious:    'Spacious',
};

/**
 * DensityToggle — segmented control for display density (WI-23).
 *
 * Tokens only — no raw hex, no arbitrary values.
 * All five interactive states covered: default · hover · focus-visible · active · disabled (n/a —
 * individual buttons are always enabled; the group itself is always available).
 *
 * @param {{ density: string, setDensity: (level: string) => void, className?: string }} props
 */
export function DensityToggle({ density, setDensity, className }) {
  return (
    <div
      role="group"
      aria-label="Display density"
      className={cn(
        'flex items-center gap-1 bg-neutral-100 dark:bg-neutral-800 rounded-lg p-1',
        className,
      )}
    >
      {DENSITY_LEVELS.map((level) => (
        <button
          key={level}
          type="button"
          onClick={() => setDensity(level)}
          aria-pressed={density === level}
          className={cn(
            'px-3 py-1 rounded-md text-xs font-medium transition-colors capitalize',
            'focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-brand-navy-tint/40 focus-visible:ring-offset-1',
            'active:translate-y-px',
            density === level
              ? 'bg-white dark:bg-neutral-700 shadow-sm text-brand-navy'
              : 'text-neutral-600 dark:text-neutral-400 hover:text-neutral-700 dark:hover:text-neutral-200',
          )}
        >
          {LABELS[level]}
        </button>
      ))}
    </div>
  );
}
