import { cn } from '@/lib/utils';

/**
 * Live preview for the field-layout builder (WI-32b). Pure presentational component: given the
 * visible fields in their current order, it renders a mock work-item detail surface so an admin
 * sees exactly how toggling visibility and reordering will look — updating live as the editor
 * re-renders. No data fetching; sample values are placeholders.
 *
 * @param {string} typeLabel   the work-item type being previewed
 * @param {Array}  fields      visible fields in order: [{ key, label, custom? }]
 */
export function FieldLayoutPreview({ typeLabel, fields = [] }) {
  return (
    <aside className="w-72 flex-shrink-0" aria-label="Live preview">
      <p className="text-xs font-semibold uppercase tracking-wider text-neutral-500 mb-2">Live preview</p>
      <div className="rounded-xl border border-neutral-200 dark:border-neutral-700 bg-white dark:bg-neutral-800 p-4 shadow-sm">
        <h3 className="text-sm font-semibold text-brand-navy dark:text-neutral-100 mb-3 truncate">{typeLabel}</h3>
        {fields.length === 0 ? (
          <p className="text-xs text-neutral-400">No visible fields — toggle some on to preview the detail surface.</p>
        ) : (
          <dl className="space-y-2">
            {fields.map((f) => (
              <div key={f.key} className="flex items-baseline justify-between gap-3">
                <dt className={cn('text-xs font-medium truncate', f.custom ? 'text-brand-navy dark:text-brand-navy-tint' : 'text-neutral-600 dark:text-neutral-400')}>
                  {f.label}
                </dt>
                <dd className="text-xs text-neutral-400 dark:text-neutral-500">—</dd>
              </div>
            ))}
          </dl>
        )}
      </div>
    </aside>
  );
}

export default FieldLayoutPreview;
