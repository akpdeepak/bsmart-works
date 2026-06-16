// KR-084 — Email article modal.
// Sends an article by email to up to 10 recipients.
// Closes on success (shows toast) or on Cancel/Escape.
import { useState, useRef, useEffect, useId } from 'react';
import { X, Mail, Loader } from 'lucide-react';
import { api } from '@/lib/apiClient';
import { cn } from '@/lib/utils';
import { pushToast } from '@/lib/toast-queue';

const MAX_RECIPIENTS = 10;
const EMAIL_PATTERN = /^[A-Za-z0-9+_.-]+@[A-Za-z0-9.-]+\.[A-Za-z]{2,}$/;

function parseRecipients(raw) {
  return raw
    .split(/[,\n]+/)
    .map((s) => s.trim())
    .filter(Boolean);
}

/**
 * @param {{
 *   articleId: string,
 *   articleTitle: string,
 *   onClose: () => void,
 * }} props
 */
export function EmailArticleModal({ articleId, articleTitle, onClose }) {
  const [recipients, setRecipients] = useState('');
  const [subject, setSubject] = useState(articleTitle || '');
  const [message, setMessage] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);
  const dialogRef = useRef(null);
  const recipientsId = useId();
  const subjectId = useId();
  const messageId = useId();

  const parsedRecipients = parseRecipients(recipients);
  const recipientCount = parsedRecipients.length;

  // Close on Escape
  useEffect(() => {
    const onKey = (e) => { if (e.key === 'Escape') onClose(); };
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, [onClose]);

  // Trap focus on mount
  useEffect(() => {
    dialogRef.current?.focus();
  }, []);

  function validate() {
    if (recipientCount === 0) return 'Enter at least one recipient email address.';
    if (recipientCount > MAX_RECIPIENTS) return `Maximum ${MAX_RECIPIENTS} recipients allowed.`;
    for (const r of parsedRecipients) {
      if (!EMAIL_PATTERN.test(r)) return `Invalid email address: ${r}`;
    }
    if (message.length > 500) return 'Message must be 500 characters or fewer.';
    return null;
  }

  async function handleSend() {
    const validationError = validate();
    if (validationError) {
      setError(validationError);
      return;
    }
    setError(null);
    setLoading(true);
    try {
      await api.send(`/articles/${articleId}/send-email`, {
        method: 'POST',
        body: {
          recipients: parsedRecipients,
          subject: subject.trim() || articleTitle,
          message: message.trim() || undefined,
        },
      });
      pushToast({ message: `Email sent to ${recipientCount} recipient${recipientCount !== 1 ? 's' : ''}`, tone: 'success' });
      onClose();
    } catch (e) {
      setError(e.message || 'Failed to send email. Please try again.');
    } finally {
      setLoading(false);
    }
  }

  return (
    /* backdrop */
    <div
      className="fixed inset-0 z-overlay bg-neutral-900/50 flex items-center justify-center p-4"
      role="presentation"
      onClick={(e) => { if (e.target === e.currentTarget) onClose(); }}
    >
      <div
        ref={dialogRef}
        role="dialog"
        aria-modal="true"
        aria-labelledby="email-modal-title"
        tabIndex={-1}
        className="bg-white dark:bg-neutral-900 rounded-xl shadow-xl w-full max-w-md p-6 space-y-4 focus-visible:outline-none"
      >
        {/* Header */}
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            <Mail className="h-5 w-5 text-brand-navy" aria-hidden="true" />
            <h2 id="email-modal-title" className="text-base font-semibold text-neutral-900 dark:text-neutral-100">
              Send article by email
            </h2>
          </div>
          <button
            type="button"
            onClick={onClose}
            aria-label="Close email modal"
            className="text-neutral-400 hover:text-neutral-600 dark:hover:text-neutral-200 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-brand-navy-tint/40 rounded"
          >
            <X className="h-4 w-4" aria-hidden="true" />
          </button>
        </div>

        {/* Recipients */}
        <div className="space-y-1">
          <div className="flex items-center justify-between">
            <label htmlFor={recipientsId} className="text-xs font-semibold text-neutral-600 dark:text-neutral-400 uppercase tracking-wide">
              Recipients
            </label>
            <span
              className={cn(
                'text-xs',
                recipientCount > MAX_RECIPIENTS ? 'text-semantic-danger' : 'text-neutral-500',
              )}
              aria-live="polite"
            >
              {recipientCount}/{MAX_RECIPIENTS} recipients
            </span>
          </div>
          <textarea
            id={recipientsId}
            value={recipients}
            onChange={(e) => setRecipients(e.target.value)}
            placeholder="name@example.com, another@example.com"
            rows={3}
            aria-describedby={error ? 'email-modal-error' : undefined}
            className={cn(
              'w-full text-sm border rounded-md px-3 py-2 bg-transparent resize-none',
              'text-neutral-900 dark:text-neutral-100 placeholder-neutral-400',
              'focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-brand-navy-tint/40',
              error
                ? 'border-semantic-danger'
                : 'border-neutral-200 dark:border-neutral-700',
            )}
          />
          <p className="text-xs text-neutral-500">Separate multiple emails with commas or new lines.</p>
        </div>

        {/* Subject */}
        <div className="space-y-1">
          <label htmlFor={subjectId} className="text-xs font-semibold text-neutral-600 dark:text-neutral-400 uppercase tracking-wide">
            Subject
          </label>
          <input
            id={subjectId}
            type="text"
            value={subject}
            onChange={(e) => setSubject(e.target.value)}
            placeholder="Email subject"
            className="w-full text-sm border border-neutral-200 dark:border-neutral-700 rounded-md px-3 py-2 bg-transparent text-neutral-900 dark:text-neutral-100 placeholder-neutral-400 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-brand-navy-tint/40"
          />
        </div>

        {/* Message */}
        <div className="space-y-1">
          <div className="flex items-center justify-between">
            <label htmlFor={messageId} className="text-xs font-semibold text-neutral-600 dark:text-neutral-400 uppercase tracking-wide">
              Message <span className="font-normal normal-case tracking-normal text-neutral-400">(optional)</span>
            </label>
            <span className={cn('text-xs', message.length > 500 ? 'text-semantic-danger' : 'text-neutral-500')}>
              {message.length}/500
            </span>
          </div>
          <textarea
            id={messageId}
            value={message}
            onChange={(e) => setMessage(e.target.value)}
            placeholder="Add a personal note…"
            rows={3}
            maxLength={520}
            className="w-full text-sm border border-neutral-200 dark:border-neutral-700 rounded-md px-3 py-2 bg-transparent text-neutral-900 dark:text-neutral-100 placeholder-neutral-400 resize-none focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-brand-navy-tint/40"
          />
        </div>

        {/* Error */}
        {error && (
          <p id="email-modal-error" role="alert" className="text-sm text-semantic-danger">
            {error}
          </p>
        )}

        {/* Actions */}
        <div className="flex items-center justify-end gap-2 pt-1">
          <button
            type="button"
            onClick={onClose}
            disabled={loading}
            className="text-sm px-3 py-1.5 rounded-md text-neutral-600 dark:text-neutral-400 hover:text-neutral-900 dark:hover:text-neutral-100 disabled:opacity-50 disabled:cursor-not-allowed focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-brand-navy-tint/40 transition-colors"
          >
            Cancel
          </button>
          <button
            type="button"
            onClick={handleSend}
            disabled={loading}
            className={cn(
              'flex items-center gap-1.5 text-sm px-4 py-1.5 rounded-md',
              'bg-brand-navy text-white hover:bg-brand-navy-tint',
              'disabled:opacity-50 disabled:cursor-not-allowed',
              'focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-brand-navy-tint/40',
              'active:translate-y-px transition-colors',
            )}
          >
            {loading && <Loader className="h-3.5 w-3.5 animate-spin" aria-hidden="true" />}
            {loading ? 'Sending…' : 'Send email'}
          </button>
        </div>
      </div>
    </div>
  );
}
