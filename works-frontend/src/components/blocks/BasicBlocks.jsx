function ParagraphBlock({ block, onChange, onReplace, onAddAfter, focused }) {
  const slashOpen = typeof onReplace === 'function' && SLASH_RE.test(block.content);
  const query = slashOpen ? block.content.slice(1).toLowerCase() : '';
  const matches = slashOpen
    ? BLOCK_TYPES.filter((t) => t.type !== 'paragraph'
        && (t.label.toLowerCase().includes(query) || t.type.includes(query)))
    : [];

  const [active, setActive] = useState(0);
  // Track which exact text the menu was dismissed for, so editing the text re-opens it.
  // Derived during render — no effect needed (React "you might not need an effect").
  const [dismissedFor, setDismissedFor] = useState(null);

  const menuOpen = slashOpen && matches.length > 0 && dismissedFor !== block.content;
  // Clamp the highlight as the filtered list shrinks (no reset effect required).
  const activeIndex = Math.min(active, Math.max(0, matches.length - 1));

  const onKeyDown = (e) => {
    if (menuOpen) {
      if (e.key === 'ArrowDown') { e.preventDefault(); setActive((a) => (a + 1) % matches.length); }
      else if (e.key === 'ArrowUp') { e.preventDefault(); setActive((a) => (a + matches.length - 1) % matches.length); }
      else if (e.key === 'Enter') { e.preventDefault(); onReplace(matches[activeIndex].type); }
      else if (e.key === 'Escape') { e.preventDefault(); setDismissedFor(block.content); }
      return;
    }
    // Format shortcuts (Ctrl+B/I/Shift+X/`) — must run before the Enter check (KR-001).
    if (handleFormatKey(e, e.currentTarget, block.content, onChange)) return;
    // Enter at cursor-end creates a new paragraph block below — Shift+Enter and mid-text Enter
    // remain default textarea behavior (they insert a newline within the same block).
    if (e.key === 'Enter' && !e.shiftKey && e.currentTarget.selectionStart === e.currentTarget.value.length) {
      e.preventDefault();
      onAddAfter?.();
    }
  };

  return (
    <div className="relative">
      <textarea
        aria-label="Paragraph content"
        value={block.content}
        onChange={(e) => onChange({ content: e.target.value })}
        onKeyDown={onKeyDown}
        rows={3}
        className={cn(
          'w-full resize-y bg-transparent text-sm text-neutral-900 dark:text-neutral-100',
          'border border-neutral-200 dark:border-neutral-700 rounded-md px-3 py-2',
          'focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-brand-navy-tint/40 focus-visible:ring-offset-2',
          focused && 'border-brand-navy-tint',
        )}
        placeholder="Start typing, or “/” to insert a block…"
      />
      {menuOpen && (
        <div
          role="listbox"
          aria-label="Insert block"
          className="absolute left-0 top-full mt-1 z-dropdown max-h-64 w-64 overflow-auto rounded-lg border border-neutral-200 dark:border-neutral-700 bg-white dark:bg-neutral-900 py-1 shadow-lg"
        >
          {matches.map(({ type, label, Icon }, i) => (
            <button
              key={type}
              type="button"
              role="option"
              aria-selected={i === activeIndex}
              onMouseDown={(e) => e.preventDefault()}
              onMouseEnter={() => setActive(i)}
              onClick={() => onReplace(type)}
              className={cn(
                'flex w-full items-center gap-2.5 px-3 py-1.5 text-left text-sm text-neutral-700 dark:text-neutral-300',
                i === activeIndex ? 'bg-neutral-50 dark:bg-neutral-800' : 'hover:bg-neutral-50 dark:hover:bg-neutral-800',
              )}
            >
              <Icon aria-hidden="true" className="h-4 w-4 text-neutral-400 shrink-0" />
              {label}
            </button>
          ))}
        </div>
      )}
    </div>
  );
}

function HeadingBlock({ block, onChange, level }) {
  const sizeClass = { 1: 'text-2xl font-bold', 2: 'text-xl font-semibold', 3: 'text-base font-semibold' }[level];
  return (
    <input
      type="text"
      aria-label={`Heading ${level}`}
      value={block.content}
      onChange={(e) => onChange({ content: e.target.value })}
      onKeyDown={(e) => handleFormatKey(e, e.currentTarget, block.content, onChange)}
      className={cn(
        'w-full bg-transparent border-b border-neutral-200 dark:border-neutral-700 pb-1',
        'text-neutral-900 dark:text-neutral-100 focus-visible:outline-none',
        'focus-visible:border-brand-navy-tint',
        sizeClass,
      )}
      placeholder={`Heading ${level}`}
    />
  );
}

function CodeBlock({ block, onChange }) {
  const lang = block.metadata?.language || 'plaintext';
  return (
    <div className="rounded-md overflow-hidden ring-1 ring-neutral-800">
      <div className="flex items-center gap-2 bg-neutral-800 px-3 py-1">
        <span className="text-xs text-neutral-400 font-mono">Code</span>
        <label htmlFor={`code-lang-${block.id}`} className="sr-only">Language</label>
        <select
          id={`code-lang-${block.id}`}
          value={lang}
          onChange={(e) => onChange({ metadata: { ...block.metadata, language: e.target.value } })}
          className="ml-auto text-xs bg-neutral-700 text-neutral-200 border border-neutral-600 rounded px-2 py-0.5 font-mono focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-brand-navy-tint/40"
          aria-label="Code language"
        >
          {CODE_LANGUAGES.map((l) => <option key={l} value={l}>{l}</option>)}
        </select>
      </div>
      <textarea
        aria-label="Code block content"
        value={block.content}
        onChange={(e) => onChange({ content: e.target.value })}
        rows={5}
        spellCheck={false}
        className="w-full font-mono text-sm bg-neutral-900 text-neutral-100 placeholder:text-neutral-500 px-3.5 py-2.5 resize-y focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-inset focus-visible:ring-brand-navy-tint/40"
        placeholder="// paste code here…"
      />
    </div>
  );
}

function MermaidBlock({ block, onChange }) {
  const [preview, setPreview] = useState(false);
  return (
    <div className="space-y-2">
      <div className="flex items-center gap-2">
        <span className="text-xs font-medium text-neutral-600 dark:text-neutral-400">Mermaid diagram</span>
        <button
          type="button"
          onClick={() => setPreview((p) => !p)}
          className="text-xs text-brand-navy hover:underline focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-brand-navy-tint/40 rounded"
          aria-pressed={preview}
        >
          {preview ? 'Edit source' : 'Preview (paste into mermaid.live)'}
        </button>
      </div>
      {preview ? (
        <pre className="text-xs font-mono bg-neutral-50 dark:bg-neutral-900 border border-neutral-200 dark:border-neutral-700 rounded-md p-3 whitespace-pre-wrap text-neutral-700 dark:text-neutral-300">
          {block.content || '(empty diagram)'}
        </pre>
      ) : (
        <textarea
          aria-label="Mermaid diagram source"
          value={block.content}
          onChange={(e) => onChange({ content: e.target.value })}
          rows={6}
          spellCheck={false}
          className="w-full font-mono text-sm bg-transparent border border-neutral-200 dark:border-neutral-700 rounded-md px-3 py-2 resize-y text-neutral-900 dark:text-neutral-100 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-brand-navy-tint/40 focus-visible:ring-offset-2"
          placeholder={'graph TD\n  A[Start] --> B[End]'}
        />
      )}
    </div>
  );
}

function ImageBlock({ block, onChange }) {
  return (
    <div className="space-y-2">
      <input
        type="url"
        aria-label="Image URL"
        value={block.content}
        onChange={(e) => onChange({ content: e.target.value })}
        className="w-full text-sm border border-neutral-200 dark:border-neutral-700 rounded-md px-3 py-2 bg-transparent text-neutral-900 dark:text-neutral-100 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-brand-navy-tint/40 focus-visible:ring-offset-2"
        placeholder="https://example.com/image.png"
      />
      {block.content && (
        <img
          src={block.content}
          alt={block.metadata?.alt || 'Article image'}
          className="max-w-full max-h-64 rounded-md border border-neutral-200 dark:border-neutral-700 object-contain"
          onError={(e) => { e.currentTarget.style.display = 'none'; }}
        />
      )}
      <input
        type="text"
        aria-label="Image alt text"
        value={block.metadata?.alt || ''}
        onChange={(e) => onChange({ metadata: { ...block.metadata, alt: e.target.value } })}
        className="w-full text-xs border border-neutral-200 dark:border-neutral-700 rounded-md px-3 py-1.5 bg-transparent text-neutral-600 dark:text-neutral-400 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-brand-navy-tint/40 focus-visible:ring-offset-2"
        placeholder="Alt text (required for accessibility)"
      />
    </div>
  );
}

function TableBlock({ block, onChange }) {
  const rows = block.metadata?.rows || [['', ''], ['', '']];
  const cols = block.metadata?.cols || 2;

  const setCell = (r, c, val) => {
    const next = rows.map((row, ri) => row.map((cell, ci) => (ri === r && ci === c ? val : cell)));
    onChange({ metadata: { ...block.metadata, rows: next, cols } });
  };

  const addRow = () => {
    onChange({ metadata: { ...block.metadata, rows: [...rows, Array(cols).fill('')], cols } });
  };

  const addCol = () => {
    onChange({
      metadata: {
        ...block.metadata,
        rows: rows.map((row) => [...row, '']),
        cols: cols + 1,
      },
    });
  };

  return (
    <div className="space-y-2 overflow-x-auto">
      <table className="w-full border-collapse text-sm" role="grid" aria-label="Table block">
        <tbody>
          {rows.map((row, ri) => (
            <tr key={ri}>
              {row.map((cell, ci) => (
                <td key={ci} className="border border-neutral-200 dark:border-neutral-700 p-0">
                  <input
                    type="text"
                    aria-label={`Row ${ri + 1}, column ${ci + 1}`}
                    value={cell}
                    onChange={(e) => setCell(ri, ci, e.target.value)}
                    className={cn(
                      'w-full px-2 py-1.5 bg-transparent text-neutral-900 dark:text-neutral-100',
                      'focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-inset focus-visible:ring-brand-navy-tint/40',
                      ri === 0 && 'font-semibold bg-neutral-50 dark:bg-neutral-800',
                    )}
                  />
                </td>
              ))}
            </tr>
          ))}
        </tbody>
      </table>
      <div className="flex gap-2">
        <button
          type="button"
          onClick={addRow}
          className="text-xs text-brand-navy hover:underline focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-brand-navy-tint/40 rounded"
        >
          + Row
        </button>
        <button
          type="button"
          onClick={addCol}
          className="text-xs text-brand-navy hover:underline focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-brand-navy-tint/40 rounded"
        >
          + Column
        </button>
      </div>
    </div>
  );
}

// ── New Know Studio blocks ──────────────────────────────────────────────────────

// Callout / panel — the Confluence "info / note / warning" panel. Meaning carried by an icon + a
// text label, never colour alone (RB-30 §6). Variants live in block-kit so the renderer matches.
