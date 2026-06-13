// Know Studio — a reusable AI writing assistant that drops next to ANY text field (markdown editor,
// comment box, title, description…). Same contract as the block editor's AI menu, routed through the
// AI Control Plane (scope/budget/cache/audit + deterministic fallback, RB-40 §2). Give it the
// current text and an apply callback; it offers improve / expand / summarize / shorten (and
// optionally write-from-prompt). Renders nothing when AI is unavailable for the workspace.

import { useState, useRef, useEffect } from 'react';
import { Sparkles } from 'lucide-react';
import { cn } from '@/lib/utils';
import { knowledgeAi } from '@/lib/knowledge-ai';

const TEXT_MODES = [
  { mode: 'improve', label: 'Improve' },
  { mode: 'expand', label: 'Expand' },
  { mode: 'summarize', label: 'Summarize' },
  { mode: 'shorten', label: 'Shorten' },
];

/**
 * @param {Object} props
 * @param {string} props.workspaceId
 * @param {boolean} [props.enabled]      hide entirely when false (AI off for the workspace)
 * @param {Function} props.getText       () => current text
 * @param {Function} props.onApply       (newText, meta) => void
 * @param {string} [props.label]         button label (default "AI")
 * @param {string} [props.size]          'sm' (default) | 'md'
 */
export function AiTextAssist({ workspaceId, enabled = true, getText, onApply, label = 'AI', size = 'sm' }) {
  const [open, setOpen] = useState(false);
  const [busy, setBusy] = useState(false);
  const ref = useRef(null);

  useEffect(() => {
    if (!open) return undefined;
    const onKey = (e) => { if (e.key === 'Escape') setOpen(false); };
    const onClick = (e) => { if (ref.current && !ref.current.contains(e.target)) setOpen(false); };
    window.addEventListener('keydown', onKey);
    window.addEventListener('pointerdown', onClick);
    return () => { window.removeEventListener('keydown', onKey); window.removeEventListener('pointerdown', onClick); };
  }, [open]);

  if (!workspaceId || !enabled) return null;

  const run = async (mode) => {
    setOpen(false);
    setBusy(true);
    try {
      const res = await knowledgeAi.compose(workspaceId, { mode, text: getText() || '' });
      if (res && typeof res.text === 'string') onApply(res.text, res.meta);
    } catch {
      /* AI failure is non-fatal — the author keeps their text. */
    } finally {
      setBusy(false);
    }
  };

  return (
    <div className="relative inline-flex" ref={ref}>
      <button
        type="button"
        onClick={() => setOpen((o) => !o)}
        disabled={busy}
        aria-haspopup="menu"
        aria-expanded={open}
        aria-label="AI writing assistant"
        className={cn(
          'inline-flex items-center gap-1 font-medium text-brand-navy hover:text-brand-navy-tint disabled:opacity-50 rounded focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-brand-navy-tint/40',
          size === 'md' ? 'text-sm px-2 py-1' : 'text-xs px-1.5 py-0.5',
        )}
      >
        <Sparkles aria-hidden="true" className={cn(size === 'md' ? 'h-4 w-4' : 'h-3.5 w-3.5', busy && 'animate-pulse')} />
        {busy ? 'Working…' : label}
      </button>
      {open && (
        <div role="menu" aria-label="AI writing actions" className="absolute right-0 top-7 z-dropdown w-36 bg-white dark:bg-neutral-900 border border-neutral-200 dark:border-neutral-700 rounded-lg shadow-lg py-1">
          {TEXT_MODES.map(({ mode, label: l }) => (
            <button
              key={mode}
              role="menuitem"
              type="button"
              onClick={() => run(mode)}
              className="w-full text-left px-3 py-1.5 text-sm text-neutral-700 dark:text-neutral-300 hover:bg-neutral-50 dark:hover:bg-neutral-800 focus-visible:outline-none focus-visible:bg-neutral-50 dark:focus-visible:bg-neutral-800"
            >
              {l}
            </button>
          ))}
        </div>
      )}
    </div>
  );
}
