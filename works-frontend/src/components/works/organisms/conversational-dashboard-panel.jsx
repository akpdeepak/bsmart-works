import { useState } from 'react';
import { Sparkles } from 'lucide-react';
import { Button } from '@/components/works/button';
import { AiMetaBadge } from '@/components/works/ai-meta-badge';
import { aiClient, compiledSpecToMeta } from '@/lib/ai';

// Iteration-20 Cap O — conversational dashboards (NL → widget spec). A plain-English ask is
// compiled server-side into a structured widget spec the user can preview and save. The spec is
// always the deterministic parse, so the preview renders even when AI is off/over budget; the AI
// narrative (caption) only attaches when AI ran (RB-40 §2). Gated by the parent on the
// `conversational_dashboard` capability — this component only renders when that is enabled.
//
// Layers (the metric/grouping/timeframe/chart parse) surfaced as plain text so the preview reads
// honestly without re-implementing the chart renderers (RB-20 §4 honest software).
function SpecField({ label, value }) {
  return (
    <div className="flex items-baseline gap-2">
      <span className="text-xs uppercase tracking-wide text-neutral-600 dark:text-neutral-400 w-20 flex-shrink-0">{label}</span>
      <span className="text-sm text-neutral-900 dark:text-neutral-100 font-medium">{value}</span>
    </div>
  );
}

export function ConversationalDashboardPanel({ workspaceId, onSaved, showToast }) {
  const [prompt, setPrompt] = useState('');
  const [busy, setBusy] = useState(false);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState(null);
  const [compiled, setCompiled] = useState(null); // { spec, usedAi, fallback, policyState, tier }

  const compile = () => {
    if (!prompt.trim() || !workspaceId) return;
    setBusy(true);
    setError(null);
    setCompiled(null);
    aiClient.compileConversationalDashboard(workspaceId, prompt.trim())
      .then((res) => setCompiled(res))
      .catch((e) => setError(e?.message || 'Could not build that dashboard — try rephrasing.'))
      .finally(() => setBusy(false));
  };

  const save = () => {
    if (!compiled || !workspaceId) return;
    const title = String(compiled.spec?.title || prompt.trim());
    setSaving(true);
    aiClient.saveConversationalDashboard(workspaceId, title, prompt.trim())
      .then((saved) => {
        setPrompt('');
        setCompiled(null);
        showToast?.(`Saved "${saved.title}"`);
        onSaved?.(saved);
      })
      .catch((e) => setError(e?.message || 'Could not save the dashboard — try again.'))
      .finally(() => setSaving(false));
  };

  const spec = compiled?.spec;
  const timeframe = spec?.timeframe;

  return (
    <div className="bg-white dark:bg-neutral-800 border border-brand-navy/20 rounded-xl p-4 mb-5">
      <div className="flex gap-3 items-start">
        <Sparkles aria-hidden="true" className="h-4 w-4 text-brand-navy mt-2 shrink-0" />
        <div className="flex-1 min-w-0">
          <p className="text-xs font-semibold text-neutral-700 dark:text-neutral-200 mb-1">Describe a dashboard</p>
          <div className="flex gap-2">
            <label htmlFor="convdash-prompt" className="sr-only">Describe the dashboard you want</label>
            <input
              id="convdash-prompt"
              type="text"
              className="input flex-1 text-sm"
              placeholder="e.g. velocity per team, last 6 sprints, with predictability"
              value={prompt}
              onChange={(e) => setPrompt(e.target.value)}
              onKeyDown={(e) => { if (e.key === 'Enter') compile(); }}
            />
            <Button variant="secondary" onClick={compile} loading={busy} disabled={!prompt.trim()}>
              Build preview
            </Button>
          </div>

          {error && (
            <p className="text-sm text-semantic-danger mt-2" role="alert">{error}</p>
          )}

          {busy && !compiled && (
            <div className="mt-3 h-20 rounded-md animate-pulse bg-neutral-100 dark:bg-neutral-700" aria-hidden="true" />
          )}

          {spec && (
            <div className="mt-3 rounded-md border border-neutral-200 dark:border-neutral-700 p-3 space-y-2">
              <div className="flex items-center justify-between gap-2">
                <p className="text-sm font-semibold text-neutral-900 dark:text-neutral-100 truncate">{spec.title}</p>
                <AiMetaBadge meta={compiledSpecToMeta(compiled)} />
              </div>
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-x-4 gap-y-1">
                <SpecField label="Metric" value={String(spec.metric).replace(/_/g, ' ')} />
                <SpecField label="Group by" value={String(spec.groupBy)} />
                <SpecField label="Chart" value={String(spec.chart)} />
                {timeframe && <SpecField label="Timeframe" value={`last ${timeframe.amount} ${timeframe.unit}`} />}
                {Array.isArray(spec.composites) && spec.composites.length > 0 && (
                  <SpecField label="Add-ons" value={spec.composites.join(', ')} />
                )}
              </div>
              {spec.caption && (
                <p className="text-xs text-neutral-600 dark:text-neutral-400">{spec.caption}</p>
              )}
              <div className="flex items-center gap-2 pt-1">
                <Button variant="action" size="sm" onClick={save} loading={saving}>Save dashboard</Button>
                <Button variant="ghost" size="sm" onClick={() => setCompiled(null)} disabled={saving}>Discard</Button>
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
