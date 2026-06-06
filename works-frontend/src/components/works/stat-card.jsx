import { ArrowRight } from 'lucide-react';
import { isIconComponent, onPressKey } from '@/lib/utils';

// Dashboard stat card, extracted from the App.jsx monolith. When given an onClick it becomes a
// keyboard-operable "button" (Enter/Space) with a focus ring; otherwise it is a static figure.
export function StatCard({ label, value, sub, color, icon: Icon, onClick }) {
  const base = 'bg-white dark:bg-neutral-800 border border-neutral-200 dark:border-neutral-700 rounded-xl p-5 hover:shadow-md transition-shadow group';
  const inner = (
    <>
      <div className="flex items-start justify-between mb-3">
        {isIconComponent(Icon) ? <Icon aria-hidden="true" className="h-6 w-6 text-neutral-600 dark:text-neutral-400" /> : <span className="text-2xl">{Icon}</span>}
        <span className="text-xs text-neutral-600 dark:text-neutral-400 group-hover:text-brand-navy transition-colors">View <ArrowRight className="inline-block h-3.5 w-3.5 align-text-bottom" aria-hidden="true" /></span>
      </div>
      <p className={`text-3xl font-bold ${color} mb-1`}>{value}</p>
      <p className="text-sm font-medium text-neutral-700">{label}</p>
      <p className="text-xs text-neutral-600 dark:text-neutral-400 mt-0.5">{sub}</p>
    </>
  );

  if (typeof onClick !== 'function') {
    return <div className={base}>{inner}</div>;
  }
  return (
    <div
      onClick={onClick}
      role="button"
      tabIndex={0}
      onKeyDown={onPressKey}
      className={`${base} cursor-pointer focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-brand-navy-tint/40`}
    >
      {inner}
    </div>
  );
}
