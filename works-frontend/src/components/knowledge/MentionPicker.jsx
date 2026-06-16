/* eslint-disable react-refresh/only-export-components -- co-exports the renderMentions() helper used by comment renderers; DX/HMR-only rule */
// KR-028 — @mention picker for comment textareas.
// Triggers when the user types "@" at a word boundary. Fetches workspace members,
// filters by typed query. Selecting inserts "@username" at cursor position.
// Closes on Escape or outside click. Renders as a floating dropdown below the caret.
import { useState, useEffect, useRef, useCallback } from 'react';
import { api } from '@/lib/apiClient';

const MENTION_RE = /@(\w*)$/;

function getMentionQuery(textarea) {
  const val = textarea.value;
  const pos = textarea.selectionStart;
  const textBefore = val.slice(0, pos);
  const match = MENTION_RE.exec(textBefore);
  return match ? match[1] : null;
}

/**
 * Wrap a comment textarea to support @mention picks.
 *
 * @param {{
 *   workspaceId: string,
 *   children: (props: { ref: Ref, onChange: fn, onKeyDown: fn }) => ReactElement,
 *   value: string,
 *   onChange: (value: string) => void,
 * }} props
 */
export function MentionPicker({ workspaceId, onChange, children }) {
  const [members, setMembers] = useState([]);
  const [query, setQuery] = useState(null);
  const [open, setOpen] = useState(false);
  const [selected, setSelected] = useState(0);
  const textareaRef = useRef(null);
  const containerRef = useRef(null);

  // Fetch members once when workspaceId is known
  useEffect(() => {
    if (!workspaceId) return;
    api.send(`/workspaces/${encodeURIComponent(workspaceId)}/members`)
      .then(data => setMembers(Array.isArray(data) ? data : []))
      .catch(() => setMembers([]));
  }, [workspaceId]);

  // Close on outside click
  useEffect(() => {
    if (!open) return undefined;
    const onDown = (e) => {
      if (containerRef.current && !containerRef.current.contains(e.target)) setOpen(false);
    };
    window.addEventListener('pointerdown', onDown);
    return () => window.removeEventListener('pointerdown', onDown);
  }, [open]);

  const filtered = members.filter(m => {
    if (query === null || query === '') return members.slice(0, 8);
    const q = query.toLowerCase();
    return (m.name || m.email || m.id || '').toLowerCase().includes(q);
  }).slice(0, 8);

  const insertMention = useCallback((member) => {
    const ta = textareaRef.current;
    if (!ta) return;
    const pos = ta.selectionStart;
    const val = ta.value;
    const textBefore = val.slice(0, pos);
    const match = MENTION_RE.exec(textBefore);
    if (!match) return;
    const mentionStart = pos - match[0].length;
    const username = member.name || member.email || member.id;
    const newVal = val.slice(0, mentionStart) + `@${username} ` + val.slice(pos);
    onChange(newVal);
    setOpen(false);
    setQuery(null);
    // Move caret after the inserted mention
    requestAnimationFrame(() => {
      if (!textareaRef.current) return;
      const newPos = mentionStart + username.length + 2; // "@" + username + " "
      textareaRef.current.setSelectionRange(newPos, newPos);
      textareaRef.current.focus();
    });
  }, [onChange]);

  const handleChange = useCallback((e) => {
    const val = e.target.value;
    onChange(val);
    const q = getMentionQuery(e.target);
    if (q !== null) {
      setQuery(q);
      setSelected(0);
      setOpen(true);
    } else {
      setOpen(false);
      setQuery(null);
    }
  }, [onChange]);

  const handleKeyDown = useCallback((e) => {
    if (!open) return;
    if (e.key === 'ArrowDown') { e.preventDefault(); setSelected(s => Math.min(s + 1, filtered.length - 1)); }
    else if (e.key === 'ArrowUp') { e.preventDefault(); setSelected(s => Math.max(s - 1, 0)); }
    else if (e.key === 'Enter' || e.key === 'Tab') {
      if (filtered[selected]) { e.preventDefault(); insertMention(filtered[selected]); }
    }
    else if (e.key === 'Escape') { setOpen(false); setQuery(null); }
  }, [open, filtered, selected, insertMention]);

  return (
    <div ref={containerRef} className="relative">
      {children({ ref: textareaRef, onChange: handleChange, onKeyDown: handleKeyDown })}

      {open && filtered.length > 0 && (
        <ul
          role="listbox"
          aria-label="Mention members"
          className="absolute left-0 bottom-full mb-1 z-dropdown w-56 bg-white dark:bg-neutral-900 border border-neutral-200 dark:border-neutral-700 rounded-lg shadow-lg py-1 max-h-48 overflow-y-auto"
        >
          {filtered.map((m, i) => {
            const display = m.name || m.email || m.id || 'Unknown';
            return (
              <li
                key={m.id || m.email || i}
                role="option"
                aria-selected={i === selected}
                onMouseDown={(e) => { e.preventDefault(); insertMention(m); }}
                className={`flex items-center gap-2 px-3 py-1.5 text-xs cursor-pointer ${i === selected ? 'bg-brand-navy/10 text-brand-navy' : 'text-neutral-700 dark:text-neutral-300 hover:bg-neutral-100 dark:hover:bg-neutral-800'}`}
              >
                <span className="h-5 w-5 rounded-full bg-brand-navy/20 flex items-center justify-center text-brand-navy font-semibold text-xs flex-shrink-0">
                  {display[0].toUpperCase()}
                </span>
                <span className="truncate">{display}</span>
              </li>
            );
          })}
        </ul>
      )}
    </div>
  );
}

/** Render @username mentions in brand-orange in HTML content. */
export function renderMentions(text) {
  if (!text) return '';
  return text.replace(/@(\w+)/g, '<span class="text-brand-orange font-medium">@$1</span>');
}
