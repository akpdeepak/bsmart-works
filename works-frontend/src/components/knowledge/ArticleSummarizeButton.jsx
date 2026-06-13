// Know Studio — one-click AI summary for the open article. Self-contained: it composes a summary via
// knowledgeAi.compose (AI Control Plane, deterministic extractive fallback — RB-40 §2) and shows it
// in a small popover. Hidden entirely when AI generation is not enabled for the workspace. The
// summary is read-only (it never overwrites the article). Design tokens only (RB-30 §1).

import { useState, useRef, useEffect } from 'react';
import { Sparkles } from 'lucide-react';
import { knowledgeAi } from '@/lib/knowledge-ai';
import { AiMetaBadge } from '@/components/works/ai-meta-badge';

export function ArticleSummarizeButton({ workspaceId, text }) {
  const [open, setOpen] = useState(false);
  const [busy, setBusy] = useState(false);
  const [result, setResult] = useState(null);
  const ref = useRef(null);

  useEffect(() => {
    if (!open) return undefined;
    const onKey = (e) => { if (e.key === 'Escape') setOpen(false); };
    const onClick = (e) => { if (ref.current && !ref.current.contains(e.target)) setOpen(false); };
    window.addEventListener('keydown', onKey);
    window.addEventListener('pointerdown', onClick);
    return () => { window.removeEventListener('keydown', onKey); window.removeEventListener('pointerdown', onClick); };
  }, [open]);

  const summarize = async () => {
    setOpen(true);
    setBusy(true);
    try {
      const res = await knowledgeAi.compose(workspaceId, { mode: 'summarize', text: text || '' });
      setResult(res);
    } catch {
      setResult({ text: 'Could not generate a summary right now.', meta: null });
    } finally {
      setBusy(false);
    }
  };

  return (
    <div className="relative inline-flex" ref={ref}>
      <button
        type="button"
        onClick={summarize}
        disabled={busy}
        aria-haspopup="dialog"
        aria-expanded={open}
        className="inline-flex items-center gap-1.5 text-xs font-medium text-brand-navy hover:text-brand-navy-tint disabled:opacity-50 disabled:cursor-not-allowed rounded px-2 py-1 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-brand-navy-tint/40"
      >
        <Sparkles aria-hidden="true" className={busy ? 'h-3.5 w-3.5 animate-pulse' : 'h-3.5 w-3.5'} />
        {busy ? 'Summarizing…' : 'AI summary'}
      </button>
      {open && (
        <div role="dialog" aria-label="AI summary" className="absolute right-0 top-8 z-overlay w-80 bg-white dark:bg-neutral-900 border border-neutral-200 dark:border-neutral-700 rounded-lg shadow-lg p-3 space-y-2">
          <div className="flex items-center justify-between">
            <span className="text-xs font-semibold text-neutral-700 dark:text-neutral-300">Summary</span>
            <button
              type="button"
              onClick={() => setOpen(false)}
              aria-label="Close summary"
              className="text-neutral-400 hover:text-neutral-700 dark:hover:text-neutral-200 text-sm focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-brand-navy-tint/40 rounded"
            >
              ✕
            </button>
          </div>
          {busy ? (
            <div className="space-y-1.5" aria-hidden="true">
              <div className="h-3 rounded bg-neutral-100 dark:bg-neutral-800 animate-pulse" />
              <div className="h-3 rounded bg-neutral-100 dark:bg-neutral-800 animate-pulse w-4/5" />
            </div>
          ) : (
            <>
              <p className="text-sm text-neutral-800 dark:text-neutral-200 whitespace-pre-wrap">{result?.text}</p>
              {result?.meta && <AiMetaBadge meta={result.meta} />}
            </>
          )}
        </div>
      )}
    </div>
  );
}
