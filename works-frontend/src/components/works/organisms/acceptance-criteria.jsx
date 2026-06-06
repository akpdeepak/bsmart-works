import { useState } from 'react';

// Acceptance criteria live in a single free-form TEXT field on the work item (work_items.acceptance_criteria).
// Markdown task lines ("- [ ] …" / "- [x] …") render as interactive checkboxes; any other line renders as
// prose, so Gherkin-style Given/When/Then criteria and a checkable list can coexist in the same field.
// Toggling or adding rewrites the text and persists through the parent's onSave (the normal work-item PUT).

const CHECKBOX_RE = /^(\s*)-\s+\[([ xX])\]\s?(.*)$/;

function parseCriteria(text) {
  return (text || '').split('\n').map((line, i) => {
    const m = line.match(CHECKBOX_RE);
    return m
      ? { i, type: 'check', indent: m[1], checked: m[2].toLowerCase() === 'x', label: m[3] }
      : { i, type: 'text', text: line };
  });
}

export function AcceptanceCriteria({ value, onSave, readOnly = false }) {
  const [editing, setEditing] = useState(false);
  const [draft, setDraft] = useState('');
  const [adding, setAdding] = useState('');

  const text = value || '';
  const items = parseCriteria(text);
  const checks = items.filter((p) => p.type === 'check');
  const done = checks.filter((c) => c.checked).length;
  const pct = checks.length ? Math.round((done / checks.length) * 100) : 0;

  const replaceLine = (idx, line) => {
    const lines = text.split('\n');
    lines[idx] = line;
    onSave(lines.join('\n'));
  };

  const toggle = (item) =>
    replaceLine(item.i, `${item.indent}- [${item.checked ? ' ' : 'x'}] ${item.label}`);

  const add = () => {
    const t = adding.trim();
    if (!t) return;
    onSave(text ? `${text}\n- [ ] ${t}` : `- [ ] ${t}`);
    setAdding('');
  };

  const startEdit = () => { setDraft(text); setEditing(true); };
  const commitEdit = () => { setEditing(false); if (draft !== text) onSave(draft); };

  return (
    <div>
      <div className="flex items-center justify-between mb-1">
        <label className="block text-xs text-neutral-600 dark:text-neutral-400 font-medium">
          Acceptance criteria
          {checks.length > 0 && (
            <span className="ml-1.5 text-neutral-400">{done}/{checks.length}</span>
          )}
        </label>
        {!readOnly && !editing && (
          <button type="button" onClick={startEdit} className="text-xs text-brand-navy hover:underline">Edit</button>
        )}
      </div>

      {editing ? (
        <textarea
          className="input w-full font-mono text-xs"
          rows={Math.max(4, draft.split('\n').length + 1)}
          value={draft}
          onChange={(e) => setDraft(e.target.value)}
          onBlur={commitEdit}
          placeholder={'Given …\nWhen …\nThen …\n- [ ] a checkable item'}
        />
      ) : (
        <>
          {checks.length > 0 && (
            <div className="mb-2 h-1.5 rounded-full bg-neutral-100 dark:bg-neutral-700 overflow-hidden" aria-hidden="true">
              <div className="h-full bg-semantic-success transition-all duration-base" style={{ width: `${pct}%` }} />
            </div>
          )}

          {text.trim() === '' ? (
            <p className="text-xs text-neutral-400 italic">No acceptance criteria yet.</p>
          ) : (
            <ul className="space-y-1">
              {items.map((item) =>
                item.type === 'check' ? (
                  <li key={item.i} className="flex items-start gap-2">
                    <input
                      type="checkbox"
                      checked={item.checked}
                      disabled={readOnly}
                      onChange={() => toggle(item)}
                      className="mt-0.5 h-4 w-4 flex-shrink-0 accent-brand-navy"
                      aria-label={item.label}
                    />
                    <span className={`text-sm ${item.checked ? 'line-through text-neutral-400' : 'text-neutral-700 dark:text-neutral-200'}`}>
                      {item.label}
                    </span>
                  </li>
                ) : (
                  item.text.trim() !== '' && (
                    <li key={item.i} className="whitespace-pre-wrap text-xs text-neutral-600 dark:text-neutral-400">{item.text}</li>
                  )
                ),
              )}
            </ul>
          )}

          {!readOnly && (
            <div className="mt-2 flex gap-2">
              <input
                className="input flex-1 text-sm py-1"
                placeholder="Add a criterion…"
                value={adding}
                onChange={(e) => setAdding(e.target.value)}
                onKeyDown={(e) => { if (e.key === 'Enter') { e.preventDefault(); add(); } }}
              />
              <button
                type="button"
                onClick={add}
                disabled={!adding.trim()}
                className="rounded border border-neutral-200 dark:border-neutral-600 px-2 py-1 text-xs text-neutral-600 dark:text-neutral-300 hover:text-brand-navy disabled:opacity-50"
              >
                Add
              </button>
            </div>
          )}
        </>
      )}
    </div>
  );
}
