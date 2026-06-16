// KR-074 — AI grammar & style check panel.
// Shows a list of writing issues found by the server-side heuristic (+ AI when on). Each issue
// has severity (warning / info), the offending text, and a suggestion. An "Accept" button is
// surfaced so the parent can apply the change in the block editor. Design tokens only (RB-30 §1).

import { useState, useEffect } from 'react';
import { X, AlertTriangle, Info, CheckCircle } from 'lucide-react';
import { knowledgeAi } from '@/lib/knowledge-ai';

const SEVERITY_STYLES = {
  warning: {
    icon: AlertTriangle,
    label: 'Warning',
    chip: 'bg-semantic-warning-surface text-semantic-warning',
    iconCls: 'text-semantic-warning',
  },
  info: {
    icon: Info,
    label: 'Info',
    chip: 'bg-brand-navy/10 text-brand-navy',
    iconCls: 'text-brand-navy',
  },
};

/**
 * @param {{ articleText: string, workspaceId: string, open: boolean,
 *           onClose: () => void, onAcceptIssue: (issue: object) => void }} props
 */
export function CheckWritingPanel({ articleText, workspaceId, open, onClose, onAcceptIssue }) {
  const [issues, setIssues] = useState([]);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState(null);
  const [dismissed, setDismissed] = useState(new Set());

  // Re-check whenever the panel is opened or articleText changes significantly.
  useEffect(() => {
    if (!open || !workspaceId || !articleText?.trim()) {
      setIssues([]);
      return;
    }
    let cancelled = false;
    setBusy(true);
    setError(null);
    setDismissed(new Set());
    knowledgeAi.checkWriting(workspaceId, articleText)
      .then((res) => {
        if (!cancelled) setIssues(Array.isArray(res) ? res : []);
      })
      .catch(() => {
        if (!cancelled) setError('Could not check writing. Try again.');
      })
      .finally(() => {
        if (!cancelled) setBusy(false);
      });
    return () => { cancelled = true; };
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [open]);

  if (!open) return null;

  const visible = issues.filter((_, i) => !dismissed.has(i));

  return (
    <aside
      aria-label="Writing check"
      className="w-72 flex-shrink-0 border-l border-neutral-200 dark:border-neutral-700 bg-neutral-50 dark:bg-neutral-900 overflow-y-auto flex flex-col"
    >
      {/* Panel header */}
      <div className="flex items-center justify-between px-4 py-3 border-b border-neutral-200 dark:border-neutral-700">
        <h3 className="text-xs font-semibold text-neutral-500 dark:text-neutral-400 uppercase tracking-wider">
          Writing check
        </h3>
        <button
          type="button"
          aria-label="Close writing check panel"
          onClick={onClose}
          className="p-0.5 rounded text-neutral-400 hover:text-neutral-700 dark:hover:text-neutral-200 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-brand-navy-tint/40"
        >
          <X className="h-3.5 w-3.5" aria-hidden="true" />
        </button>
      </div>

      <div className="flex-1 overflow-y-auto p-4 space-y-3">
        {busy && (
          <div className="space-y-2" aria-busy="true" aria-label="Checking writing…">
            {[0, 1, 2].map((i) => (
              <div key={i} className="h-16 rounded-lg animate-pulse bg-neutral-100 dark:bg-neutral-700" />
            ))}
          </div>
        )}

        {error && (
          <p role="alert" className="text-xs text-semantic-danger">{error}</p>
        )}

        {!busy && !error && visible.length === 0 && (
          <div className="flex flex-col items-center gap-2 py-8 text-center">
            <CheckCircle className="h-8 w-8 text-semantic-success" aria-hidden="true" />
            <p className="text-xs font-semibold text-neutral-700 dark:text-neutral-300">
              {issues.length === 0 ? 'No issues found.' : 'All issues resolved.'}
            </p>
          </div>
        )}

        {!busy && visible.map((issue, i) => {
          const sev = SEVERITY_STYLES[issue.severity] || SEVERITY_STYLES.info;
          const SevIcon = sev.icon;
          const realIndex = issues.findIndex((iss, idx) => iss === issue && !dismissed.has(idx));
          return (
            <div
              key={i}
              className="bg-white dark:bg-neutral-800 rounded-lg border border-neutral-200 dark:border-neutral-700 p-3 space-y-2"
            >
              <div className="flex items-start gap-2">
                <SevIcon
                  aria-hidden="true"
                  className={`h-3.5 w-3.5 mt-0.5 flex-shrink-0 ${sev.iconCls}`}
                />
                <div className="flex-1 min-w-0">
                  <code className="text-xs bg-neutral-100 dark:bg-neutral-700 px-1 py-0.5 rounded font-mono text-neutral-800 dark:text-neutral-200 truncate block">
                    {issue.text}
                  </code>
                  <p className="text-xs text-neutral-700 dark:text-neutral-300 mt-1">
                    {issue.suggestion}
                  </p>
                </div>
              </div>
              <div className="flex items-center gap-2">
                <span className={`text-xs font-semibold px-1.5 py-0.5 rounded ${sev.chip}`}>
                  {sev.label}
                </span>
                <div className="flex gap-1.5 ml-auto">
                  <button
                    type="button"
                    onClick={() => onAcceptIssue?.(issue)}
                    className="text-xs text-brand-navy hover:underline focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-brand-navy-tint/40 rounded"
                  >
                    Accept
                  </button>
                  <button
                    type="button"
                    onClick={() => setDismissed((prev) => new Set([...prev, realIndex >= 0 ? realIndex : i]))}
                    className="text-xs text-neutral-400 hover:text-neutral-600 dark:hover:text-neutral-300 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-brand-navy-tint/40 rounded"
                  >
                    Dismiss
                  </button>
                </div>
              </div>
            </div>
          );
        })}
      </div>
    </aside>
  );
}
