import { useEffect, useState } from 'react';
import { ShieldCheck, Lock, Sparkles } from 'lucide-react';
import { kpiClient } from '@/lib/kpi';
import { Badge } from '@/components/works/atoms/badge';

// Organism — the iteration-12 Performance surface (Cap L). Layered metrics with a prominent layer
// switcher and a privacy banner. The Individual/Manager/Org layers need no entity id; the manager
// layer carries the locked-by-design "individual comparison unavailable" callout (commitment 4,
// RB-40 §1). Tokens only, five interactive states, WCAG-AA. All HTTP via the kpi client (apiClient).

const LAYERS = [
  { id: 'INDIVIDUAL', label: 'Individual' },
  { id: 'MANAGER', label: 'Manager' },
  { id: 'ORG', label: 'Organization' },
];

function MetricCard({ metric }) {
  return (
    <div className="rounded-lg border border-neutral-200 bg-white p-4 dark:border-neutral-700 dark:bg-neutral-900">
      <p className="text-xs font-semibold uppercase tracking-wide text-neutral-600">{metric.label}</p>
      <p className="mt-1 text-2xl font-bold text-neutral-900 dark:text-neutral-100">
        {metric.value}
        {metric.unit === 'percent' && '%'}
      </p>
      <p className="mt-0.5 text-xs text-neutral-600">
        {metric.unit !== 'percent' && metric.unit} · n={metric.sampleSize}
      </p>
    </div>
  );
}

function LayerView({ layer }) {
  if (!layer) return null;
  return (
    <div>
      <div className="mb-2 flex items-center gap-2">
        <h3 className="text-base font-semibold text-neutral-900 dark:text-neutral-100">{layer.label}</h3>
        {layer.privacyNote && (
          <Badge tone="info" className="gap-1">
            <Lock aria-hidden="true" className="h-3 w-3" />
            Aggregated
          </Badge>
        )}
      </div>
      {layer.metrics?.length ? (
        <div className="grid grid-cols-2 gap-3 sm:grid-cols-3 lg:grid-cols-4">
          {layer.metrics.map((m) => (
            <MetricCard key={m.key} metric={m} />
          ))}
        </div>
      ) : (
        <p className="text-sm text-neutral-600">No metrics yet — start completing work to see trends.</p>
      )}
      {layer.privacyNote && <p className="mt-2 text-xs text-neutral-600">{layer.privacyNote}</p>}
    </div>
  );
}

export function PerformancePanel({ workspaceId }) {
  const [layer, setLayer] = useState('INDIVIDUAL');
  const [data, setData] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  // Fetch inlined in the effect with setState only in the .then continuation (never synchronously in
  // the effect body) — mirrors the AiCommandBar pattern and satisfies react-hooks/set-state-in-effect.
  useEffect(() => {
    if (!workspaceId) return undefined;
    let active = true;
    const fetcher =
      layer === 'INDIVIDUAL' ? kpiClient.personal(workspaceId).then((r) => ({ single: r }))
        : layer === 'ORG' ? kpiClient.org(workspaceId).then((r) => ({ single: r }))
          : kpiClient.manager(workspaceId).then((r) => ({ many: r }));
    fetcher
      .then((next) => { if (active) { setData(next); setError(null); } })
      .catch((e) => { if (active) setError(e.message || 'Could not load metrics.'); })
      .finally(() => { if (active) setLoading(false); });
    return () => { active = false; };
  }, [workspaceId, layer]);

  return (
    <div className="p-8 max-w-7xl">
      <div className="mb-6">
        <h1 className="text-2xl font-bold text-brand-navy">Performance</h1>
        <p className="mt-0.5 text-sm text-neutral-600">
          Layered metrics — individual data is private; team and org views are aggregated.
        </p>
      </div>

      {/* Layer switcher */}
      <div role="tablist" aria-label="Metric layer" className="mb-4 inline-flex rounded-lg border border-neutral-200 p-1 dark:border-neutral-700">
        {LAYERS.map((l) => (
          <button
            key={l.id}
            type="button"
            role="tab"
            aria-selected={layer === l.id}
            onClick={() => { setLoading(true); setLayer(l.id); }}
            className={[
              'rounded-md px-3 py-1.5 text-sm font-medium transition-colors duration-[120ms]',
              'focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-brand-navy-tint/40 focus-visible:ring-offset-1',
              'active:translate-y-px disabled:opacity-50',
              layer === l.id
                ? 'bg-brand-navy text-white'
                : 'text-neutral-700 hover:bg-neutral-100 dark:text-neutral-200 dark:hover:bg-neutral-800',
            ].join(' ')}
          >
            {l.label}
          </button>
        ))}
      </div>

      {/* Privacy banner */}
      <div className="mb-4 flex items-start gap-2 rounded-lg bg-semantic-info-surface p-3">
        <ShieldCheck aria-hidden="true" className="mt-0.5 h-4 w-4 text-semantic-info" />
        <p className="text-xs text-neutral-700 dark:text-neutral-200">
          {layer === 'MANAGER'
            ? 'Individual engineer comparison is unavailable by design — managers see only aggregated team metrics, enforced at the API.'
            : layer === 'INDIVIDUAL'
              ? 'These are your private metrics. They are visible only to you unless you choose to share them.'
              : 'Organization metrics are fully aggregated.'}
        </p>
      </div>

      {loading && (
        <div className="grid grid-cols-2 gap-3 sm:grid-cols-3 lg:grid-cols-4">
          {[0, 1, 2, 3].map((i) => (
            <div key={i} className="h-24 animate-pulse rounded-lg bg-neutral-100 dark:bg-neutral-800" />
          ))}
        </div>
      )}

      {error && !loading && (
        <div className="rounded-lg bg-semantic-danger-surface p-4 text-sm text-semantic-danger">{error}</div>
      )}

      {!loading && !error && data?.single && <LayerView layer={data.single} />}
      {!loading && !error && data?.many && (
        <div className="space-y-6">
          {data.many.length === 0 && (
            <p className="text-sm text-neutral-600">No teams yet. Create a team to see manager-level rollups.</p>
          )}
          {data.many.map((l) => (
            <LayerView key={l.scopeId || l.label} layer={l} />
          ))}
        </div>
      )}

      <p className="mt-6 flex items-center gap-1.5 text-xs text-neutral-600">
        <Sparkles aria-hidden="true" className="h-3.5 w-3.5 text-brand-orange" />
        AI team-health narratives are available on team views when AI is enabled (with a deterministic fallback).
      </p>
    </div>
  );
}
