import { createElement } from 'react';
import { TYPES, resolveTypeIcon } from '@/lib/work-item-types';

// Work-item type presentation, extracted from the App.jsx monolith (RB-30 §8 — Lucide icons, never
// emoji). The type data + resolution live in lib/work-item-types.js. The unified <Badge> work
// (UX finding A4) will later fold TypeBadge into the one badge API.

// Renders a work-item type icon from its stored key (or legacy emoji). Decorative by default.
export function TypeIcon({ value, className = 'h-3.5 w-3.5' }) {
  // resolveTypeIcon selects a stable component from the module-level set (it is not created per
  // render); render via createElement so the dynamic icon doesn't trip react-hooks/static-components.
  const Ic = resolveTypeIcon(value);
  if (Ic) return createElement(Ic, { className, 'aria-hidden': 'true' });
  return <span className={className} aria-hidden="true">{value}</span>;
}

export function TypeBadge({ type, compact = false }) {
  const t = TYPES[type] || TYPES.Task;
  return (
    <span className={`inline-flex items-center gap-1 text-xs uppercase tracking-wider font-bold text-white px-1.5 py-0.5 rounded-sm ${t.color}`}>
      {!compact && <TypeIcon value={t.icon} className="h-3 w-3" />}
      {type}
    </span>
  );
}
