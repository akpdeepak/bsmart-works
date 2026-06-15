import { useEffect, useRef, useState } from 'react';
import { Plus } from 'lucide-react';
import { Button } from '@/components/works/button';
import { TypeBadge } from '@/components/works/work-item-type';
import { cn } from '@/lib/utils';

/** The type options surfaced in the inline row — common delivery types only. */
const QUICK_TYPES = [
  { key: 'STORY',    label: 'Story' },
  { key: 'TASK',     label: 'Task' },
  { key: 'BUG',      label: 'Bug' },
  { key: 'EPIC',     label: 'Epic' },
];

/**
 * InlineQuickAdd — an editable row rendered at the top of the backlog list.
 *
 * Shows when the user presses N or + in the backlog context. Enter saves,
 * Esc cancels. The full dialog remains the power path for complex items.
 *
 * Props:
 *   onSave(formData)  — async fn called with { title, type }; resolves when saved.
 *   onCancel()        — called when the user presses Esc or blurs away.
 *   saving            — disables controls during the async save.
 *   error             — error message to display inline.
 */
export function InlineQuickAdd({ onSave, onCancel, saving = false, error = null }) {
  const [title, setTitle] = useState('');
  const [type, setType] = useState('TASK');
  const inputRef = useRef(null);

  useEffect(() => {
    inputRef.current?.focus();
  }, []);

  function handleKeyDown(e) {
    if (e.key === 'Enter') {
      e.preventDefault();
      submit();
    }
    if (e.key === 'Escape') {
      e.preventDefault();
      onCancel();
    }
  }

  function submit() {
    const trimmed = title.trim();
    if (trimmed.length < 3) {
      inputRef.current?.focus();
      return;
    }
    onSave({ title: trimmed, type });
  }

  return (
    <div
      role="group"
      aria-label="Quick-add work item"
      className="flex items-center gap-3 border-b border-brand-navy/20 bg-brand-navy/5 px-5 py-3 dark:border-brand-navy/40 dark:bg-brand-navy/10"
    >
      {/* Drag handle placeholder (keeps visual alignment with list rows) */}
      <span className="mr-1 w-3 flex-shrink-0 text-xs text-transparent select-none">⠿</span>

      <TypeBadge type={type} compact />

      <input
        ref={inputRef}
        type="text"
        value={title}
        onChange={(e) => setTitle(e.target.value)}
        onKeyDown={handleKeyDown}
        disabled={saving}
        placeholder="Title — press Enter to save, Esc to cancel"
        aria-label="New work item title"
        aria-invalid={error ? 'true' : undefined}
        aria-describedby={error ? 'inline-add-error' : undefined}
        className={cn(
          'flex-1 rounded-md border px-2.5 py-1 text-sm text-neutral-900 outline-none',
          'placeholder:text-neutral-400 dark:text-neutral-100 dark:placeholder:text-neutral-500',
          'focus:ring-2 focus:ring-brand-navy-tint/40 focus:border-brand-navy',
          'disabled:cursor-not-allowed disabled:opacity-50',
          error
            ? 'border-semantic-danger dark:border-semantic-danger'
            : 'border-neutral-200 bg-white dark:border-neutral-600 dark:bg-neutral-800',
        )}
      />

      <select
        value={type}
        onChange={(e) => setType(e.target.value)}
        disabled={saving}
        aria-label="Work item type"
        className="rounded-md border border-neutral-200 bg-white px-1.5 py-1 text-xs text-neutral-700 focus:outline-none focus:ring-2 focus:ring-brand-navy-tint/40 dark:border-neutral-600 dark:bg-neutral-800 dark:text-neutral-300"
      >
        {QUICK_TYPES.map((t) => (
          <option key={t.key} value={t.key}>{t.label}</option>
        ))}
      </select>

      <div className="flex items-center gap-1.5">
        <Button
          size="sm"
          variant="primary"
          onClick={submit}
          loading={saving}
          disabled={saving || title.trim().length < 3}
          leftIcon={<Plus size={16} />}
        >
          Add
        </Button>
        <Button size="sm" variant="ghost" onClick={onCancel} disabled={saving}>
          Cancel
        </Button>
      </div>

      {error && (
        <span id="inline-add-error" role="alert" className="text-xs text-semantic-danger">
          {error}
        </span>
      )}
    </div>
  );
}
