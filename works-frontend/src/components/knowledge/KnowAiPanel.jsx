// Know Studio — "Ask your knowledge base" panel. Self-contained (like knowledge-templates-view): it
// owns its fetch through knowledgeAi.ask, which reuses the KB RAG endpoint behind the AI Control
// Plane (RB-40 §2). The deterministic fallback is ranked keyword search, so an answer + citations
// always come back — `meta.fallback` says whether AI actually composed the answer. Design tokens
// only (RB-30 §1); the AI affordance hides entirely when KB Q&A is not enabled for the workspace.

import { useState } from 'react';
import { Sparkles, Search } from 'lucide-react';
import { knowledgeAi } from '@/lib/knowledge-ai';
import { AiMetaBadge } from '@/components/works/ai-meta-badge';

export function KnowAiPanel({ workspaceId, onOpenArticle }) {
  const [question, setQuestion] = useState('');
  const [busy, setBusy] = useState(false);
  const [result, setResult] = useState(null);
  const [error, setError] = useState(null);

  const ask = async () => {
    if (!question.trim() || busy) return;
    setBusy(true);
    setError(null);
    try {
      const res = await knowledgeAi.ask(workspaceId, question.trim());
      setResult(res);
    } catch {
      setError('Could not reach the knowledge assistant. Try again.');
    } finally {
      setBusy(false);
    }
  };

  return (
    <div className="rounded-lg border border-brand-navy-tint/30 bg-brand-navy-tint/5 p-4 space-y-3">
      <div className="flex items-center gap-2">
        <Sparkles aria-hidden="true" className="h-4 w-4 text-brand-navy" />
        <h3 className="text-sm font-semibold text-neutral-900 dark:text-neutral-100">Ask your knowledge base</h3>
      </div>
      <div className="flex items-center gap-2">
        <div className="relative flex-1">
          <Search aria-hidden="true" className="absolute left-2.5 top-1/2 -translate-y-1/2 h-4 w-4 text-neutral-400" />
          <input
            type="text"
            aria-label="Ask a question"
            value={question}
            onChange={(e) => setQuestion(e.target.value)}
            onKeyDown={(e) => { if (e.key === 'Enter') { e.preventDefault(); ask(); } }}
            placeholder="e.g. How do we roll back a release?"
            className="w-full text-sm bg-white dark:bg-neutral-900 border border-neutral-200 dark:border-neutral-700 rounded-md pl-8 pr-3 py-2 text-neutral-900 dark:text-neutral-100 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-brand-navy-tint/40"
          />
        </div>
        <button
          type="button"
          onClick={ask}
          disabled={busy || !question.trim()}
          className="text-sm font-semibold text-white bg-brand-navy hover:bg-brand-navy-tint disabled:opacity-50 rounded-md px-3 py-2 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-brand-navy-tint/40"
        >
          {busy ? 'Asking…' : 'Ask'}
        </button>
      </div>

      {error && <p className="text-xs text-semantic-danger">{error}</p>}

      {result && (
        <div className="space-y-2">
          <p className="text-sm text-neutral-800 dark:text-neutral-200 whitespace-pre-wrap">{result.answer}</p>
          {Array.isArray(result.citations) && result.citations.length > 0 && (
            <div className="space-y-1">
              <p className="text-2xs uppercase tracking-wide font-semibold text-neutral-400">Sources</p>
              <ul className="flex flex-wrap gap-1.5">
                {result.citations.map((c) => (
                  <li key={c.id}>
                    <button
                      type="button"
                      onClick={() => onOpenArticle?.(c.id)}
                      className="text-xs text-brand-navy bg-white dark:bg-neutral-900 border border-neutral-200 dark:border-neutral-700 rounded-full px-2.5 py-0.5 hover:border-brand-navy-tint focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-brand-navy-tint/40"
                    >
                      {c.title || c.id}
                    </button>
                  </li>
                ))}
              </ul>
            </div>
          )}
          {result.meta && <AiMetaBadge meta={result.meta} />}
        </div>
      )}
    </div>
  );
}
