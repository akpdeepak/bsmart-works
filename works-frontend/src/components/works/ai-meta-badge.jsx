// Surfaces the AI Control Plane verdict (RB-40 §2) honestly — whether AI ran, fell back to the
// deterministic result, was degraded to the cheap tier, or served a cached response. Extracted from
// the App.jsx monolith so the AI cockpits (SM/PO) can render it consistently.
export function AiMetaBadge({ meta, narrative }) {
  if (!meta) return null;
  const label = meta.fallback ? 'Deterministic fallback'
    : meta.cacheHit ? `AI · cached (${meta.tier})`
    : `AI · ${meta.tier}${meta.policyState === 'DEGRADED' ? ' (degraded)' : ''}`;
  return (
    <div className="flex items-start gap-2 text-xs">
      <span className={`flex-shrink-0 font-bold px-1.5 py-0.5 rounded ${meta.fallback ? 'bg-neutral-100 dark:bg-neutral-700 text-neutral-600 dark:text-neutral-300' : 'bg-brand-navy/10 text-brand-navy'}`}>{label}</span>
      {narrative && <span className="text-neutral-600 dark:text-neutral-300">{narrative}</span>}
    </div>
  );
}
