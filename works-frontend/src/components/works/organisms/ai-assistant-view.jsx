import { useState } from 'react';
import { Sparkles, Search, FileText, Check, X } from 'lucide-react';
import { api } from '@/lib/apiClient';
import { cn } from '@/lib/utils';
import { Badge } from '@/components/works/atoms/badge';

// Organism — the two AI surfaces of iteration 10 (Cap O): natural language → BQL (I10-S12, with a
// confirmation-first preview) and summarization (I10-S13). The AI accent is brand-orange (the one
// orange element). Everything degrades gracefully: when the policy disables AI the response carries
// aiEnabled=false / fallbackUsed and the panel says so — it never crashes. All HTTP via apiClient.

const BTN_PRIMARY = 'inline-flex items-center gap-2 rounded-lg bg-brand-orange px-4 py-2 text-sm font-semibold text-white transition-colors hover:bg-brand-orange/90 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-brand-orange/40 active:translate-y-px disabled:opacity-50 disabled:cursor-not-allowed';
const BTN_GHOST = 'inline-flex items-center gap-2 rounded-lg border border-neutral-200 px-3 py-2 text-sm font-medium text-neutral-700 transition-colors hover:bg-neutral-100 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-brand-navy-tint/40 dark:border-neutral-700 dark:text-neutral-300 dark:hover:bg-neutral-800';

const MODES = [
  { id: 'nl', label: 'Find work (natural language)', icon: Search },
  { id: 'summarize', label: 'Summarize', icon: FileText },
];

export function AiAssistantView({ workspaceId, onToast, onRunBql }) {
  const [mode, setMode] = useState('nl');
  const [input, setInput] = useState('');
  const [busy, setBusy] = useState(false);
  const [result, setResult] = useState(null);

  const toast = (m, t) => onToast?.(m, t);

  async function run(e) {
    e.preventDefault();
    if (!input.trim()) return;
    setBusy(true);
    setResult(null);
    try {
      const path = mode === 'nl' ? '/ai/nl-to-bql' : '/ai/summarize';
      const key = mode === 'nl' ? 'phrase' : 'text';
      const res = await api.send(path, { method: 'POST', body: JSON.stringify({ workspaceId, [key]: input }) });
      setResult(res);
    } catch (err) {
      toast(err.message, 'error');
    } finally {
      setBusy(false);
    }
  }

  function confirmBql() {
    if (result?.output) {
      onRunBql?.(result.output);
      toast('Running the previewed query', 'success');
      setResult(null);
      setInput('');
    }
  }

  return (
    <div className="mx-auto max-w-3xl p-6">
      <header className="mb-6 flex items-center gap-3">
        <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-brand-orange/10">
          <Sparkles aria-hidden="true" className="h-5 w-5 text-brand-orange" />
        </div>
        <div>
          <h1 className="text-2xl font-bold text-neutral-900 dark:text-neutral-50">AI Assistant</h1>
          <p className="text-sm text-neutral-600">
            Opt-in AI — and a deterministic fallback when it is off. AI proposes; you confirm.
          </p>
        </div>
      </header>

      <div role="tablist" aria-label="AI assistant modes" className="mb-4 flex gap-1 border-b border-neutral-200 dark:border-neutral-700">
        {MODES.map((m) => (
          <button key={m.id} type="button" role="tab" aria-selected={mode === m.id}
            onClick={() => { setMode(m.id); setResult(null); }}
            className={cn('flex items-center gap-2 border-b-2 px-4 py-2 text-sm font-medium transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-brand-orange/40',
              mode === m.id ? 'border-brand-orange text-neutral-900 dark:text-neutral-50' : 'border-transparent text-neutral-600 hover:text-neutral-900 dark:hover:text-neutral-200')}>
            <m.icon aria-hidden="true" className="h-4 w-4" /> {m.label}
          </button>
        ))}
      </div>

      <form onSubmit={run} className="space-y-3">
        <label className="block">
          <span className="mb-1 block text-sm font-medium text-neutral-700 dark:text-neutral-300">
            {mode === 'nl' ? 'Describe what you are looking for' : 'Paste the text to summarize'}
          </span>
          {mode === 'nl' ? (
            <input className="input" value={input} onChange={(e) => setInput(e.target.value)}
              placeholder="open bugs assigned to me" />
          ) : (
            <textarea className="input min-h-24" value={input} onChange={(e) => setInput(e.target.value)}
              placeholder="Paste a comment thread, sprint notes, or a dashboard summary…" />
          )}
        </label>
        <button type="submit" className={BTN_PRIMARY} disabled={busy}>
          <Sparkles aria-hidden="true" className="h-4 w-4" /> {busy ? 'Working…' : 'Ask AI'}
        </button>
      </form>

      {result && <ResultPanel mode={mode} result={result} onConfirm={confirmBql} onCancel={() => setResult(null)} />}
    </div>
  );
}

function ResultPanel({ mode, result, onConfirm, onCancel }) {
  const aiOff = result.aiEnabled === false;
  return (
    <div className="mt-5 rounded-lg border border-neutral-200 dark:border-neutral-700 p-4">
      <div className="mb-2 flex flex-wrap items-center gap-2">
        <Badge tone={aiOff ? 'neutral' : 'info'}>{aiOff ? 'AI off — deterministic' : 'AI'}</Badge>
        <Badge tone="neutral">{result.modelTier}</Badge>
        {result.fallbackUsed && <Badge tone="warning">fallback</Badge>}
        {result.policyState && <span className="text-xs text-neutral-500">policy: {result.policyState}</span>}
      </div>

      {mode === 'nl' ? (
        result.confident ? (
          <div className="space-y-3">
            <p className="text-sm text-neutral-700 dark:text-neutral-300">{result.plan}</p>
            <pre className="overflow-x-auto rounded-md bg-neutral-100 dark:bg-neutral-800 p-3 font-mono text-sm text-neutral-900 dark:text-neutral-100">{result.output}</pre>
            <div className="flex gap-2">
              <button type="button" className={BTN_PRIMARY} onClick={onConfirm}>
                <Check aria-hidden="true" className="h-4 w-4" /> Confirm &amp; run
              </button>
              <button type="button" className={BTN_GHOST} onClick={onCancel}>
                <X aria-hidden="true" className="h-4 w-4" /> Cancel
              </button>
            </div>
          </div>
        ) : (
          <p className="text-sm text-neutral-700 dark:text-neutral-300">
            {result.plan || "Couldn't confidently interpret that — use the manual BQL / visual builder."}
          </p>
        )
      ) : (
        <p className="whitespace-pre-wrap text-sm text-neutral-900 dark:text-neutral-100">
          {result.output || 'Nothing to summarize.'}
        </p>
      )}
    </div>
  );
}
