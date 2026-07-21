// KR-019 — Article approval panel.
// Shown when an article is IN_REVIEW. Displays approval count badge and
// Approve / Request Changes buttons. Calls the approvals API on click.
// workspace-scoped: articleId is enough; server resolves workspaceId.
import { useState, useEffect } from 'react';
import { CheckCircle, XCircle } from 'lucide-react';
import { api } from '@/lib/apiClient';
import { cn } from '@/lib/utils';

/**
 * @param {{
 *   articleId: string,
 *   requiredApprovals?: number,
 *   currentUserId?: string,
 * }} props
 */
export function ArticleApprovalPanel({ articleId, requiredApprovals = 1, currentUserId }) {
  const [approvals, setApprovals] = useState([]);
  const [loading, setLoading] = useState(false);
  const [busy, setBusy] = useState(false);

  const fetchApprovals = () => {
    if (!articleId) return;
    setLoading(true);
    api.send(`/articles/${articleId}/approvals`)
      .then((data) => setApprovals(Array.isArray(data) ? data : []))
      .catch(() => setApprovals([]))
      .finally(() => setLoading(false));
  };

  useEffect(() => {
    fetchApprovals();
  }, [articleId]);

  const submit = async (decision) => {
    if (busy) return;
    setBusy(true);
    try {
      await api.send(`/articles/${articleId}/approvals`, {
        method: 'POST',
        body: { decision },
      });
      fetchApprovals();
    } catch { /* error handled at app level */ }
    finally { setBusy(false); }
  };

  const approvedCount = approvals.filter((a) => a.decision === 'APPROVED').length;
  const myApproval = approvals.find((a) => a.reviewerId === currentUserId);

  return (
    <div
      role="region"
      aria-label="Approval panel"
      className="flex items-center gap-3 flex-wrap"
    >
      {/* Approval count badge */}
      <span
        aria-label={`${approvedCount} of ${requiredApprovals} approvals`}
        className={cn(
          'inline-flex items-center gap-1 text-xs font-medium px-2 py-0.5 rounded-full border',
          approvedCount >= requiredApprovals
            ? 'bg-semantic-success/10 border-semantic-success text-semantic-success'
            : 'bg-neutral-100 border-neutral-200 text-neutral-600 dark:bg-neutral-800 dark:border-neutral-700 dark:text-neutral-400',
        )}
      >
        <CheckCircle aria-hidden="true" className="h-3 w-3" />
        {approvedCount}/{requiredApprovals} approved
      </span>

      {loading ? (
        <span className="text-xs text-neutral-400">Loading…</span>
      ) : (
        <>
          <button
            type="button"
            disabled={busy || !!myApproval}
            onClick={() => submit('APPROVED')}
            aria-label="Approve article"
            aria-pressed={myApproval?.decision === 'APPROVED'}
            className={cn(
              'inline-flex items-center gap-1 text-xs px-2.5 py-1 rounded-md border transition-colors',
              'focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-brand-navy-tint/40',
              'disabled:opacity-50 disabled:cursor-not-allowed',
              myApproval?.decision === 'APPROVED'
                ? 'bg-semantic-success/10 border-semantic-success text-semantic-success'
                : 'border-neutral-200 dark:border-neutral-700 text-neutral-600 dark:text-neutral-400 hover:border-semantic-success hover:text-semantic-success',
            )}
          >
            <CheckCircle aria-hidden="true" className="h-3.5 w-3.5" />
            Approve
          </button>

          <button
            type="button"
            disabled={busy || !!myApproval}
            onClick={() => submit('CHANGES_REQUESTED')}
            aria-label="Request changes to article"
            aria-pressed={myApproval?.decision === 'CHANGES_REQUESTED'}
            className={cn(
              'inline-flex items-center gap-1 text-xs px-2.5 py-1 rounded-md border transition-colors',
              'focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-brand-navy-tint/40',
              'disabled:opacity-50 disabled:cursor-not-allowed',
              myApproval?.decision === 'CHANGES_REQUESTED'
                ? 'bg-semantic-danger/10 border-semantic-danger text-semantic-danger'
                : 'border-neutral-200 dark:border-neutral-700 text-neutral-600 dark:text-neutral-400 hover:border-semantic-danger hover:text-semantic-danger',
            )}
          >
            <XCircle aria-hidden="true" className="h-3.5 w-3.5" />
            Request Changes
          </button>
        </>
      )}
    </div>
  );
}
