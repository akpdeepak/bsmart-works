import { cn } from '@/lib/utils';

// TodayCanvas — renders a Today layout as a responsive 12-column grid. A layout is an ordered
// list of widget instances ({ id, type, span, spanSm }); a registry maps each `type` to a
// renderer `(ctx, widget) => JSX`. This is the single rendering path the built-in defaults and
// (from slice 4) saved/personal layouts both flow through — reorder = reorder the list, resize =
// change a span — so the surface is configurable without bespoke per-role JSX.
//
// Tailwind needs literal class names (no `md:col-span-${n}`), so spans resolve through these maps;
// only the listed spans are addressable.

const SPAN_MD = {
  3: 'md:col-span-3', 4: 'md:col-span-4', 5: 'md:col-span-5', 6: 'md:col-span-6',
  7: 'md:col-span-7', 8: 'md:col-span-8', 9: 'md:col-span-9', 12: 'md:col-span-12',
};
const SPAN_SM = { 6: 'col-span-6', 12: 'col-span-12' };

// Fallback for a layout that references a widget type the registry doesn't know (e.g. a saved
// layout after a widget was removed). Honest empty state (RB-30 §6), never a blank cell.
function UnknownWidget({ type }) {
  return (
    <div className="rounded-xl border border-dashed border-neutral-300 p-5 text-center text-sm text-neutral-500 dark:border-neutral-700 dark:text-neutral-400">
      Unknown widget{type ? ` "${type}"` : ''} — it may have been removed.
    </div>
  );
}

export function TodayCanvas({ layout = [], registry = {}, ctx }) {
  if (!layout.length) {
    return (
      <p className="py-12 text-center text-sm text-neutral-500 dark:text-neutral-400">
        No widgets yet. Add one to build your Today.
      </p>
    );
  }
  return (
    <div className="grid grid-cols-12 gap-6">
      {layout.map((w) => {
        const render = registry[w.type];
        const spanSm = SPAN_SM[w.spanSm] || 'col-span-12';
        const spanMd = SPAN_MD[w.span] || 'md:col-span-12';
        return (
          <div key={w.id} className={cn(spanSm, spanMd)}>
            {render ? render(ctx, w) : <UnknownWidget type={w.type} />}
          </div>
        );
      })}
    </div>
  );
}
