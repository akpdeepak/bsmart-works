// KR-030 — Knowledge workspace settings panel.
// Lets workspace admins configure the comment digest frequency.
import { useState, useEffect } from 'react';
import { Bell, Loader } from 'lucide-react';
import { api } from '@/lib/apiClient';
import { cn } from '@/lib/utils';
import { pushToast } from '@/lib/toast-queue';

const FREQUENCIES = [
  { value: 'off',    label: 'Off' },
  { value: 'daily',  label: 'Daily' },
  { value: 'weekly', label: 'Weekly' },
];

/**
 * @param {{
 *   workspaceId: string,
 *   canManage: boolean,
 * }} props
 */
export function KnowledgeSettingsPanel({ workspaceId, canManage = false }) {
  const [frequency, setFrequency] = useState('off');
  const [saving, setSaving] = useState(false);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  useEffect(() => {
    if (!workspaceId) return;
    setLoading(true);
    api.send(`/workspaces/${workspaceId}/settings/knowledge/comment-digest`)
      .then((data) => setFrequency(data.frequency || 'off'))
      .catch((e) => setError(e.message || 'Failed to load settings'))
      .finally(() => setLoading(false));
  }, [workspaceId]);

  async function handleChange(newFreq) {
    if (!canManage || newFreq === frequency) return;
    setSaving(true);
    setError(null);
    try {
      const data = await api.send(
        `/workspaces/${workspaceId}/settings/knowledge/comment-digest`,
        { method: 'PATCH', body: { frequency: newFreq } },
      );
      setFrequency(data.frequency || newFreq);
      pushToast({ message: 'Comment digest settings saved', tone: 'success' });
    } catch (e) {
      setError(e.message || 'Failed to save settings');
      pushToast({ message: 'Failed to save comment digest settings', tone: 'danger' });
    } finally {
      setSaving(false);
    }
  }

  return (
    <section aria-labelledby="know-settings-title" className="space-y-4">
      <div className="flex items-center gap-2">
        <Bell className="h-5 w-5 text-brand-navy" aria-hidden="true" />
        <h3 id="know-settings-title" className="text-base font-semibold text-neutral-900 dark:text-neutral-100">
          Comment digest
        </h3>
      </div>

      <p className="text-sm text-neutral-600 dark:text-neutral-400">
        Send article authors a digest of new block comments at the chosen frequency.
        {!canManage && (
          <span className="ml-1 text-neutral-400">(Requires workspace admin access to change.)</span>
        )}
      </p>

      {loading ? (
        <div className="flex items-center gap-2 text-sm text-neutral-500" aria-live="polite" aria-busy="true">
          <Loader className="h-4 w-4 animate-spin" aria-hidden="true" />
          Loading…
        </div>
      ) : (
        <div className="flex items-center gap-3" role="group" aria-label="Comment digest frequency">
          {FREQUENCIES.map(({ value, label }) => (
            <button
              key={value}
              type="button"
              disabled={!canManage || saving}
              aria-pressed={frequency === value}
              onClick={() => handleChange(value)}
              className={cn(
                'px-3 py-1.5 rounded-lg border text-sm transition-colors',
                'focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-brand-navy-tint/40',
                'disabled:opacity-50 disabled:cursor-not-allowed',
                'active:translate-y-px',
                frequency === value
                  ? 'bg-brand-navy text-white border-brand-navy'
                  : 'border-neutral-200 dark:border-neutral-700 text-neutral-600 dark:text-neutral-400 hover:border-brand-navy hover:text-brand-navy',
              )}
            >
              {saving && frequency !== value ? label : label}
            </button>
          ))}
          {saving && (
            <Loader className="h-4 w-4 animate-spin text-neutral-400" aria-label="Saving…" />
          )}
        </div>
      )}

      {error && (
        <p role="alert" className="text-sm text-semantic-danger">
          {error}
        </p>
      )}
    </section>
  );
}
