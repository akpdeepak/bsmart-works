import { useEffect, useState } from 'react';
import { Zap, Play, FlaskConical, Plus } from 'lucide-react';
import { automationClient, runTone } from '@/lib/automation';
import { Badge } from '@/components/works/atoms/badge';

// Organism — the iteration-13 Automation surface (Cap C). Lists "When/If/Then" rules, supports
// creating a rule, toggling it on/off, a no-mutation test (dry-run) preview, and the run audit log.
// Tokens only, five interactive states, WCAG-AA. All HTTP via the automation client (apiClient).

const EMPTY_RULE = { name: '', triggerType: 'ITEM_CREATED', conditionExpr: '', actionType: 'NOTIFY', actionValue: '' };

function buildActions(actionType, actionValue) {
  const params = {};
  if (actionType === 'SET_STATUS') params.status = actionValue;
  else if (actionType === 'SET_PRIORITY') params.priority = actionValue;
  else if (actionType === 'ADD_COMMENT') params.body = actionValue;
  else if (actionType === 'NOTIFY') params.message = actionValue;
  return JSON.stringify([{ type: actionType, params }]);
}

export function AutomationsPanel({ workspaceId, can = () => true, onToast = () => {} }) {
  const [catalog, setCatalog] = useState({ triggers: [], actions: [] });
  const [rules, setRules] = useState([]);
  const [runs, setRuns] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [draft, setDraft] = useState(EMPTY_RULE);
  const [creating, setCreating] = useState(false);
  const [tick, setTick] = useState(0);
  const manage = can('manage_automations');
  const reload = () => setTick((t) => t + 1);

  // Fetch inlined with setState only in the .then continuation (never synchronously in the effect
  // body); handlers trigger a refresh via the tick dep — satisfies react-hooks/set-state-in-effect.
  useEffect(() => {
    if (!workspaceId) return undefined;
    let active = true;
    Promise.all([
      automationClient.catalog(workspaceId),
      automationClient.list(workspaceId),
      automationClient.runs(workspaceId),
    ])
      .then(([cat, list, log]) => {
        if (!active) return;
        setCatalog(cat);
        setRules(list);
        setRuns(log.items || []);
        setError(null);
      })
      .catch((e) => { if (active) setError(e.message || 'Could not load automations.'); })
      .finally(() => { if (active) setLoading(false); });
    return () => { active = false; };
  }, [workspaceId, tick]);

  async function create(e) {
    e.preventDefault();
    if (!draft.name.trim()) return;
    setCreating(true);
    try {
      await automationClient.create(workspaceId, {
        name: draft.name,
        triggerType: draft.triggerType,
        conditionExpr: draft.conditionExpr,
        actions: buildActions(draft.actionType, draft.actionValue),
      });
      setDraft(EMPTY_RULE);
      onToast('Automation created (disabled — test before enabling).', 'success');
      reload();
    } catch (e2) {
      onToast(e2.message || 'Could not create automation.', 'error');
    } finally {
      setCreating(false);
    }
  }

  async function toggle(rule) {
    try {
      await automationClient.toggle(workspaceId, rule.id, !rule.enabled);
      reload();
    } catch (e) {
      onToast(e.message || 'Could not toggle automation.', 'error');
    }
  }

  async function test(rule) {
    try {
      const preview = await automationClient.test(workspaceId, rule.id);
      onToast(`Test: would affect ${preview.affected} item(s) if activated now.`, 'success');
    } catch (e) {
      onToast(e.message || 'Test failed.', 'error');
    }
  }

  async function run(rule) {
    try {
      const res = await automationClient.run(workspaceId, rule.id);
      onToast(`Ran — affected ${res.affected} item(s).`, 'success');
      reload();
    } catch (e) {
      onToast(e.message || 'Run failed.', 'error');
    }
  }

  return (
    <div className="p-8 max-w-7xl">
      <div className="mb-6 flex items-center gap-2">
        <Zap aria-hidden="true" className="h-6 w-6 text-brand-orange" />
        <div>
          <h1 className="text-2xl font-bold text-brand-navy">Automations</h1>
          <p className="mt-0.5 text-sm text-neutral-600">When a trigger fires, if the condition holds, run actions.</p>
        </div>
      </div>

      {error && <div role="alert" className="mb-4 rounded-lg bg-semantic-danger-surface p-4 text-sm text-semantic-danger">{error}</div>}

      {manage && (
        <form onSubmit={create} className="mb-6 rounded-lg border border-neutral-200 p-4 dark:border-neutral-700">
          <div className="grid grid-cols-1 gap-3 sm:grid-cols-2 lg:grid-cols-5">
            <label className="flex flex-col gap-1 text-xs font-semibold text-neutral-700 dark:text-neutral-200">
              Name
              <input
                value={draft.name}
                onChange={(e) => setDraft({ ...draft, name: e.target.value })}
                className="rounded-md border border-neutral-200 px-2 py-1.5 text-sm dark:border-neutral-700 dark:bg-neutral-800"
                placeholder="Triage P0 incidents"
              />
            </label>
            <label className="flex flex-col gap-1 text-xs font-semibold text-neutral-700 dark:text-neutral-200">
              When
              <select
                value={draft.triggerType}
                onChange={(e) => setDraft({ ...draft, triggerType: e.target.value })}
                className="rounded-md border border-neutral-200 px-2 py-1.5 text-sm dark:border-neutral-700 dark:bg-neutral-800"
              >
                {catalog.triggers.map((t) => (
                  <option key={t.id} value={t.id}>{t.label}</option>
                ))}
              </select>
            </label>
            <label className="flex flex-col gap-1 text-xs font-semibold text-neutral-700 dark:text-neutral-200">
              If (condition)
              <input
                value={draft.conditionExpr}
                onChange={(e) => setDraft({ ...draft, conditionExpr: e.target.value })}
                className="rounded-md border border-neutral-200 px-2 py-1.5 text-sm dark:border-neutral-700 dark:bg-neutral-800"
                placeholder="priority = High"
              />
            </label>
            <label className="flex flex-col gap-1 text-xs font-semibold text-neutral-700 dark:text-neutral-200">
              Then
              <select
                value={draft.actionType}
                onChange={(e) => setDraft({ ...draft, actionType: e.target.value })}
                className="rounded-md border border-neutral-200 px-2 py-1.5 text-sm dark:border-neutral-700 dark:bg-neutral-800"
              >
                {catalog.actions.map((a) => (
                  <option key={a.id} value={a.id}>{a.label}</option>
                ))}
              </select>
            </label>
            <label className="flex flex-col gap-1 text-xs font-semibold text-neutral-700 dark:text-neutral-200">
              Value
              <input
                value={draft.actionValue}
                onChange={(e) => setDraft({ ...draft, actionValue: e.target.value })}
                className="rounded-md border border-neutral-200 px-2 py-1.5 text-sm dark:border-neutral-700 dark:bg-neutral-800"
                placeholder="In Progress"
              />
            </label>
          </div>
          <button
            type="submit"
            disabled={creating || !draft.name.trim()}
            className="mt-3 inline-flex items-center gap-1.5 rounded-md bg-brand-orange px-3 py-1.5 text-sm font-semibold text-white transition-colors duration-fast hover:opacity-90 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-brand-navy-tint/40 focus-visible:ring-offset-2 active:translate-y-px disabled:cursor-not-allowed disabled:opacity-50"
          >
            <Plus aria-hidden="true" className="h-4 w-4" />
            Create automation
          </button>
        </form>
      )}

      <h2 className="mb-2 text-sm font-semibold uppercase tracking-wide text-neutral-600">Rules</h2>
      {loading ? (
        <div className="h-24 animate-pulse rounded-lg bg-neutral-100 dark:bg-neutral-800" />
      ) : rules.length === 0 ? (
        <p className="text-sm text-neutral-600">No automations yet. Create one above to remove routine work.</p>
      ) : (
        <ul className="space-y-2">
          {rules.map((r) => (
            <li key={r.id} className="flex items-center justify-between rounded-lg border border-neutral-200 p-3 dark:border-neutral-700">
              <div className="min-w-0">
                <p className="truncate text-sm font-semibold text-neutral-900 dark:text-neutral-100">{r.name}</p>
                <p className="truncate text-xs text-neutral-600">
                  {r.triggerType}{r.conditionExpr ? ` · if ${r.conditionExpr}` : ''} · runs: {r.runCount ?? 0}
                </p>
              </div>
              <div className="flex shrink-0 items-center gap-2">
                <Badge tone={r.enabled ? 'success' : 'neutral'}>{r.enabled ? 'Enabled' : 'Disabled'}</Badge>
                {manage && (
                  <>
                    <button type="button" onClick={() => test(r)} aria-label={`Test ${r.name}`}
                      className="rounded-md p-1.5 text-neutral-600 hover:bg-neutral-100 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-brand-navy-tint/40 dark:hover:bg-neutral-800">
                      <FlaskConical aria-hidden="true" className="h-4 w-4" />
                    </button>
                    <button type="button" onClick={() => run(r)} aria-label={`Run ${r.name}`}
                      className="rounded-md p-1.5 text-neutral-600 hover:bg-neutral-100 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-brand-navy-tint/40 dark:hover:bg-neutral-800">
                      <Play aria-hidden="true" className="h-4 w-4" />
                    </button>
                    <button type="button" onClick={() => toggle(r)}
                      className="rounded-md px-2 py-1 text-xs font-semibold text-brand-navy hover:bg-neutral-100 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-brand-navy-tint/40 active:translate-y-px dark:text-neutral-200 dark:hover:bg-neutral-800">
                      {r.enabled ? 'Disable' : 'Enable'}
                    </button>
                  </>
                )}
              </div>
            </li>
          ))}
        </ul>
      )}

      <h2 className="mb-2 mt-6 text-sm font-semibold uppercase tracking-wide text-neutral-600">Run log</h2>
      {runs.length === 0 ? (
        <p className="text-sm text-neutral-600">No runs yet.</p>
      ) : (
        <ul className="space-y-1">
          {runs.slice(0, 25).map((run) => (
            <li key={run.id} className="flex items-center gap-2 text-xs text-neutral-700 dark:text-neutral-200">
              <Badge tone={runTone(run.status)}>{run.status}</Badge>
              <span className="truncate">{run.triggerSummary} · affected {run.affectedCount}</span>
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}
