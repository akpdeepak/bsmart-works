import { cn } from '@/lib/utils';
import { ArrowUp, ArrowDown, Maximize2, X } from 'lucide-react';

// TodayCanvas — renders a Today layout as a responsive 12-column grid. A layout is an ordered
// list of widget instances ({ id, type, span, spanSm }); a registry maps each `type` to a
// renderer `(ctx, widget) => JSX`. This is the single rendering path the built-in defaults and
// saved/personal layouts both flow through — reorder = reorder the list, resize = change a span.
//
// In `editMode` each cell gains a toolbar (move up/down, cycle span, remove) and its content is
// made non-interactive so edit clicks never trigger the widget's own actions. Tailwind needs
// literal class names (no `md:col-span-${n}`), so spans resolve through these maps.

const SPAN_MD = {
  3: 'md:col-span-3', 4: 'md:col-span-4', 5: 'md:col-span-5', 6: 'md:col-span-6',
  7: 'md:col-span-7', 8: 'md:col-span-8', 9: 'md:col-span-9', 12: 'md:col-span-12',
};
const SPAN_SM = { 6: 'col-span-6', 12: 'col-span-12' };

function UnknownWidget({ type }) {
  return (
    <div className="rounded-xl border border-dashed border-neutral-300 p-5 text-center text-sm text-neutral-500 dark:border-neutral-700 dark:text-neutral-400">
      Unknown widget{type ? ` "${type}"` : ''} — it may have been removed.
    </div>
  );
}

// Per-cell edit toolbar. Buttons carry their own labels (a11y) and stop propagation so a click
// edits rather than navigating into the (pointer-events-disabled) widget beneath.
function EditToolbar({ index, count, span, onMoveUp, onMoveDown, onCycleSpan, onRemove }) {
  const btn = 'flex h-7 w-7 items-center justify-center rounded-md border border-neutral-200 bg-white text-neutral-600 shadow-sm transition-colors hover:bg-neutral-100 hover:text-brand-navy focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-brand-navy-tint/40 disabled:opacity-40 disabled:cursor-not-allowed dark:border-neutral-700 dark:bg-neutral-800 dark:text-neutral-300';
  return (
    <div className="pointer-events-auto absolute right-2 top-2 z-dropdown flex items-center gap-1 rounded-lg bg-white/80 p-1 backdrop-blur dark:bg-neutral-900/80">
      <button type="button" className={btn} aria-label="Move widget up" disabled={index === 0} onClick={onMoveUp}>
        <ArrowUp className="h-3.5 w-3.5" aria-hidden="true" />
      </button>
      <button type="button" className={btn} aria-label="Move widget down" disabled={index === count - 1} onClick={onMoveDown}>
        <ArrowDown className="h-3.5 w-3.5" aria-hidden="true" />
      </button>
      <button type="button" className={cn(btn, 'w-auto gap-1 px-2 text-2xs font-semibold')} aria-label={`Change width, currently ${span} of 12`} onClick={onCycleSpan}>
        <Maximize2 className="h-3.5 w-3.5" aria-hidden="true" />{span}
      </button>
      <button type="button" className={cn(btn, 'hover:bg-semantic-danger/10 hover:text-semantic-danger')} aria-label="Remove widget" onClick={onRemove}>
        <X className="h-3.5 w-3.5" aria-hidden="true" />
      </button>
    </div>
  );
}

export function TodayCanvas({
  layout = [], registry = {}, ctx, editMode = false,
  onMoveUp, onMoveDown, onCycleSpan, onRemove,
}) {
  if (!layout.length) {
    return (
      <p className="py-12 text-center text-sm text-neutral-500 dark:text-neutral-400">
        No widgets yet. Add one to build your Today.
      </p>
    );
  }
  return (
    <div className="grid grid-cols-12 gap-6">
      {layout.map((w, i) => {
        const render = registry[w.type];
        const spanSm = SPAN_SM[w.spanSm] || 'col-span-12';
        const spanMd = SPAN_MD[w.span] || 'md:col-span-12';
        const content = render ? render(ctx, w) : <UnknownWidget type={w.type} />;
        if (!editMode) {
          return <div key={w.id} className={cn(spanSm, spanMd)}>{content}</div>;
        }
        return (
          <div key={w.id} className={cn(spanSm, spanMd, 'relative rounded-xl ring-1 ring-dashed ring-brand-navy-tint/40')}>
            <EditToolbar
              index={i} count={layout.length} span={w.span || 12}
              onMoveUp={() => onMoveUp?.(i)} onMoveDown={() => onMoveDown?.(i)}
              onCycleSpan={() => onCycleSpan?.(i)} onRemove={() => onRemove?.(i)} />
            <div className="pointer-events-none">{content}</div>
          </div>
        );
      })}
    </div>
  );
}
