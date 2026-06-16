// KR-073 — AI document outline generator.
// A small modal that takes a topic string and a templateType, calls the outline compose endpoint,
// shows a markdown preview, then converts headings to block objects and calls onInsert(blocks).
// Design tokens only (RB-30 §1); AI Control Plane provides the fallback (RB-40 §2).

import { useState } from 'react';
import { Sparkles, X } from 'lucide-react';
import { knowledgeAi } from '@/lib/knowledge-ai';
import { AiMetaBadge } from '@/components/works/ai-meta-badge';

/**
 * Parse a markdown string (h1/h2/paragraph lines) into block objects compatible with BlockEditor.
 * h1 → heading1, h2 → heading2, non-empty non-heading lines → paragraph.
 */
function markdownToBlocks(markdown) {
  if (!markdown) return [];
  const lines = markdown.split('\n');
  const blocks = [];
  let idCounter = 0;
  for (const raw of lines) {
    const line = raw.trim();
    if (!line) continue;
    const id = `blk-outline-${Date.now()}-${idCounter++}`;
    if (line.startsWith('## ')) {
      blocks.push({ id, type: 'heading2', content: line.slice(3).trim(), metadata: {} });
    } else if (line.startsWith('# ')) {
      blocks.push({ id, type: 'heading1', content: line.slice(2).trim(), metadata: {} });
    } else {
      blocks.push({ id, type: 'paragraph', content: line, metadata: {} });
    }
  }
  return blocks;
}

/**
 * @param {{ open: boolean, onClose: () => void, onInsert: (blocks: object[]) => void,
 *           workspaceId: string, templateType: string }} props
 */
export function GenerateOutlineModal({ open, onClose, onInsert, workspaceId, templateType }) {
  const [topic, setTopic] = useState('');
  const [busy, setBusy] = useState(false);
  const [result, setResult] = useState(null); // { text, meta }
  const [error, setError] = useState(null);

  if (!open) return null;

  const generate = async () => {
    if (!topic.trim() || busy) return;
    setBusy(true);
    setError(null);
    setResult(null);
    try {
      const res = await knowledgeAi.compose(workspaceId, {
        mode: 'outline',
        text: topic.trim(),
        instruction: templateType || 'KB',
      });
      setResult(res);
    } catch {
      setError('Could not generate an outline. Try again.');
    } finally {
      setBusy(false);
    }
  };

  const handleInsert = () => {
    if (!result?.text) return;
    const blocks = markdownToBlocks(result.text);
    onInsert(blocks);
    onClose();
  };

  return (
    <div
      role="dialog"
      aria-modal="true"
      aria-label="Generate outline"
      className="fixed inset-0 z-modal flex items-center justify-center bg-neutral-900/50"
    >
      <div className="bg-white dark:bg-neutral-900 rounded-xl shadow-xl border border-neutral-200 dark:border-neutral-700 w-full max-w-lg mx-4 p-5 space-y-4">
        {/* Header */}
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            <Sparkles aria-hidden="true" className="h-4 w-4 text-brand-navy" />
            <h2 className="text-sm font-semibold text-neutral-900 dark:text-neutral-100">
              Generate outline
            </h2>
          </div>
          <button
            type="button"
            aria-label="Close"
            onClick={onClose}
            className="p-1 rounded text-neutral-400 hover:text-neutral-700 dark:hover:text-neutral-200 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-brand-navy-tint/40"
          >
            <X className="h-4 w-4" aria-hidden="true" />
          </button>
        </div>

        {/* Topic input */}
        <div className="space-y-1">
          <label htmlFor="outline-topic" className="text-xs font-semibold text-neutral-500 dark:text-neutral-400 uppercase tracking-wider">
            Topic
          </label>
          <div className="flex gap-2">
            <input
              id="outline-topic"
              type="text"
              value={topic}
              onChange={(e) => setTopic(e.target.value)}
              onKeyDown={(e) => { if (e.key === 'Enter') { e.preventDefault(); generate(); } }}
              placeholder={`e.g. "Database migration strategy"`}
              className="flex-1 text-sm border border-neutral-200 dark:border-neutral-700 rounded-md px-3 py-2 bg-white dark:bg-neutral-800 text-neutral-900 dark:text-neutral-100 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-brand-navy-tint/40"
            />
            <button
              type="button"
              onClick={generate}
              disabled={busy || !topic.trim()}
              className="text-sm font-semibold text-white bg-brand-navy hover:bg-brand-navy-tint disabled:opacity-50 rounded-md px-3 py-2 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-brand-navy-tint/40"
            >
              {busy ? 'Generating…' : 'Generate'}
            </button>
          </div>
          <p className="text-xs text-neutral-500">
            Template: <span className="font-medium">{templateType || 'KB'}</span>
          </p>
        </div>

        {error && (
          <p role="alert" className="text-xs text-semantic-danger">{error}</p>
        )}

        {/* Markdown preview */}
        {result && (
          <div className="space-y-3">
            <p className="text-xs font-semibold text-neutral-500 dark:text-neutral-400 uppercase tracking-wider">
              Preview
            </p>
            <pre className="text-xs bg-neutral-50 dark:bg-neutral-800 rounded-lg p-3 border border-neutral-200 dark:border-neutral-700 overflow-auto whitespace-pre-wrap font-mono text-neutral-800 dark:text-neutral-200 max-h-48">
              {result.text}
            </pre>
            {result.meta && <AiMetaBadge meta={result.meta} />}
            <div className="flex justify-end gap-2">
              <button
                type="button"
                onClick={onClose}
                className="text-sm px-3 py-1.5 rounded-md border border-neutral-200 dark:border-neutral-700 text-neutral-600 dark:text-neutral-400 hover:border-brand-navy hover:text-brand-navy focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-brand-navy-tint/40"
              >
                Cancel
              </button>
              <button
                type="button"
                onClick={handleInsert}
                className="text-sm font-semibold px-3 py-1.5 rounded-md bg-brand-navy text-white hover:bg-brand-navy-tint focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-brand-navy-tint/40"
              >
                Insert outline
              </button>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
