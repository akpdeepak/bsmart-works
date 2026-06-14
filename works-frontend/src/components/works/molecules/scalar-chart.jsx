import { cn } from '@/lib/utils';
import { formatNumber } from '@/lib/format';

// Molecules — single-number renderers (scorecard, gauge) and the tiny inline sparkline.
// Domain-free (CLAUDE.md §4.19), token classes only (§4.2). Numbers go through the single
// locale-aware formatter (RB-30 §8 — never hand-format).

export function Scorecard({ value = 0, label, className }) {
  return (
    <div className={cn('mt-1', className)}>
      <p className="text-3xl font-bold text-brand-navy dark:text-white">{formatNumber(value)}</p>
      {label && <p className="mt-0.5 text-xs text-neutral-600 dark:text-neutral-400">{label}</p>}
    </div>
  );
}

// Radial gauge — value as a fraction of `max` (defaults to value so a lone number still reads).
export function Gauge({ value = 0, max, label, className }) {
  const ceiling = max && max > 0 ? max : Math.max(1, value);
  const pct = Math.min(100, Math.round((value / ceiling) * 100));
  const RADIUS = 16;
  const CIRC = Math.PI * RADIUS; // semicircle
  const filled = (pct / 100) * CIRC;
  return (
    <div className={cn('mt-1 flex flex-col items-center', className)} role="img" aria-label={`Gauge: ${value} of ${ceiling} (${pct}%)`}>
      <svg viewBox="0 0 40 24" className="w-28">
        <path d="M4 20 A 16 16 0 0 1 36 20" fill="none" strokeWidth="4" stroke="currentColor"
          className="text-neutral-200 dark:text-neutral-700" strokeLinecap="round" />
        <path d="M4 20 A 16 16 0 0 1 36 20" fill="none" strokeWidth="4" stroke="currentColor"
          className="text-brand-navy-tint" strokeLinecap="round"
          strokeDasharray={`${filled} ${CIRC}`} />
      </svg>
      <p className="-mt-3 text-2xl font-bold text-brand-navy dark:text-white">{formatNumber(value)}</p>
      {label && <p className="text-xs text-neutral-600 dark:text-neutral-400">{label}</p>}
    </div>
  );
}

// Inline trend sparkline of [{ label, value }] (single measure, ordered).
export function Sparkline({ data = [], className }) {
  const items = (data || []).filter((d) => d && Number.isFinite(d.value));
  if (items.length === 0) {
    return <p className="text-xs text-neutral-600 dark:text-neutral-400">No trend yet.</p>;
  }
  const max = Math.max(1, ...items.map((d) => d.value));
  const n = items.length;
  const path = items.map((d, i) => `${n <= 1 ? 0 : (i / (n - 1)) * 100},${20 - (d.value / max) * 18}`).join(' ');
  const summary = items.map((d) => `${d.label} ${d.value}`).join(', ');
  return (
    <div className={cn('text-brand-navy-tint dark:text-brand-amber', className)}>
      <svg viewBox="0 0 100 20" preserveAspectRatio="none" className="h-8 w-full"
        role="img" aria-label={`Sparkline: ${summary}`}>
        <polyline points={path} fill="none" stroke="currentColor" strokeWidth="1.5" vectorEffect="non-scaling-stroke" />
      </svg>
    </div>
  );
}
