// Block-based article editor (iteration 20, Cap I — document templates + multi-author
// collaboration). Used when an article's content_format is 'blocks'. Each block has a type,
// content string, and optional metadata. Output: a JSON array sent as `content_blocks` on save.
// WCAG 2.2 AA: keyboard-navigable blocks (arrow keys), visible focus rings, labelled controls.
// Design tokens only — no raw values (RB-30 §1).

import { useState, useRef, useCallback, useEffect } from 'react';
import {
  Plus, Trash2, ChevronUp, ChevronDown, Code, AlignLeft,
  Heading1, Heading2, Heading3, Minus, Image, Table,
  GitBranch, ChevronDown as ChevronDownIcon,
} from 'lucide-react';
import { cn } from '@/lib/utils';
import { Button } from '@/components/works/button';

const BLOCK_TYPES = [
  { type: 'paragraph', label: 'Paragraph', Icon: AlignLeft },
  { type: 'heading1',  label: 'Heading 1', Icon: Heading1 },
  { type: 'heading2',  label: 'Heading 2', Icon: Heading2 },
  { type: 'heading3',  label: 'Heading 3', Icon: Heading3 },
  { type: 'code',      label: 'Code block', Icon: Code },
  { type: 'divider',   label: 'Divider',   Icon: Minus },
  { type: 'mermaid',   label: 'Diagram (Mermaid)', Icon: GitBranch },
  { type: 'image',     label: 'Image (URL)', Icon: Image },
  { type: 'table',     label: 'Table',     Icon: Table },
];

function newBlock(type) {
  const id = `blk-${Date.now()}-${Math.random().toString(36).slice(2, 7)}`;
  if (type === 'table') {
    return { id, type, content: '', metadata: { rows: [['', ''], ['', '']], cols: 2 } };
  }
  return { id, type, content: '', metadata: {} };
}

// ── Individual block renderers ──────────────────────────────────────────────────

function ParagraphBlock({ block, onChange, focused }) {
  return (
    <textarea
      aria-label="Paragraph content"
      value={block.content}
      onChange={(e) => onChange({ content: e.target.value })}
      rows={3}
      className={cn(
        'w-full resize-y bg-transparent text-sm text-neutral-900 dark:text-neutral-100',
        'border border-neutral-200 dark:border-neutral-700 rounded-md px-3 py-2',
        'focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-brand-navy-tint/40 focus-visible:ring-offset-2',
        focused && 'border-brand-navy-tint',
      )}
      placeholder="Start typing…"
    />
  );
}

function HeadingBlock({ block, onChange, level }) {
  const Tag = `h${level}`;
  const sizeClass = { 1: 'text-2xl font-bold', 2: 'text-xl font-semibold', 3: 'text-base font-semibold' }[level];
  return (
    <input
      type="text"
      aria-label={`Heading ${level}`}
      value={block.content}
      onChange={(e) => onChange({ content: e.target.value })}
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
  return (
    <div className="rounded-md overflow-hidden border border-neutral-200 dark:border-neutral-700">
      <div className="bg-neutral-100 dark:bg-neutral-800 px-3 py-1 text-xs text-neutral-500 font-mono">Code</div>
      <textarea
        aria-label="Code block content"
        value={block.content}
        onChange={(e) => onChange({ content: e.target.value })}
        rows={5}
        spellCheck={false}
        className="w-full font-mono text-sm bg-neutral-50 dark:bg-neutral-900 text-neutral-900 dark:text-neutral-100 px-3 py-2 resize-y focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-brand-navy-tint/40 focus-visible:ring-offset-2"
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

// ── Block wrapper ───────────────────────────────────────────────────────────────

function Block({ block, index, total, focused, onFocus, onChange, onMove, onDelete }) {
  const wrapRef = useRef(null);

  const handleKeyDown = (e) => {
    // Arrow keys navigate between blocks when focus is on the wrapper (not inside an input)
    if (document.activeElement === wrapRef.current) {
      if (e.key === 'ArrowUp') { e.preventDefault(); onMove(index, -1); }
      if (e.key === 'ArrowDown') { e.preventDefault(); onMove(index, 1); }
    }
  };

  return (
    <div
      ref={wrapRef}
      tabIndex={0}
      aria-label={`Block ${index + 1}: ${block.type}`}
      onFocus={() => onFocus(index)}
      onKeyDown={handleKeyDown}
      className={cn(
        'group relative rounded-lg border p-3 transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-brand-navy-tint/40 focus-visible:ring-offset-2',
        focused
          ? 'border-brand-navy-tint/50 bg-white dark:bg-neutral-900'
          : 'border-neutral-100 dark:border-neutral-800 bg-neutral-50 dark:bg-neutral-900/50 hover:border-neutral-200 dark:hover:border-neutral-700',
      )}
    >
      {/* Block type label */}
      <div className="flex items-center gap-1 mb-2">
        <span className="text-[10px] uppercase tracking-wide font-semibold text-neutral-400 select-none">
          {BLOCK_TYPES.find((t) => t.type === block.type)?.label || block.type}
        </span>
        {/* Block controls — visible on focus/hover */}
        <div className="ml-auto flex items-center gap-0.5 opacity-0 group-hover:opacity-100 group-focus-within:opacity-100 transition-opacity">
          <button
            type="button"
            onClick={() => onMove(index, -1)}
            disabled={index === 0}
            aria-label="Move block up"
            className="w-6 h-6 rounded flex items-center justify-center text-neutral-400 hover:text-neutral-900 dark:hover:text-neutral-100 disabled:opacity-30 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-brand-navy-tint/40"
          >
            <ChevronUp aria-hidden="true" className="h-3.5 w-3.5" />
          </button>
          <button
            type="button"
            onClick={() => onMove(index, 1)}
            disabled={index === total - 1}
            aria-label="Move block down"
            className="w-6 h-6 rounded flex items-center justify-center text-neutral-400 hover:text-neutral-900 dark:hover:text-neutral-100 disabled:opacity-30 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-brand-navy-tint/40"
          >
            <ChevronDown aria-hidden="true" className="h-3.5 w-3.5" />
          </button>
          <button
            type="button"
            onClick={() => onDelete(index)}
            aria-label="Delete block"
            className="w-6 h-6 rounded flex items-center justify-center text-neutral-400 hover:text-semantic-danger focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-brand-navy-tint/40"
          >
            <Trash2 aria-hidden="true" className="h-3.5 w-3.5" />
          </button>
        </div>
      </div>

      {/* Block content */}
      {block.type === 'paragraph' && <ParagraphBlock block={block} onChange={onChange} focused={focused} />}
      {block.type === 'heading1' && <HeadingBlock block={block} onChange={onChange} level={1} />}
      {block.type === 'heading2' && <HeadingBlock block={block} onChange={onChange} level={2} />}
      {block.type === 'heading3' && <HeadingBlock block={block} onChange={onChange} level={3} />}
      {block.type === 'code' && <CodeBlock block={block} onChange={onChange} />}
      {block.type === 'divider' && (
        <hr className="border-neutral-300 dark:border-neutral-600 my-1" aria-label="Divider" />
      )}
      {block.type === 'mermaid' && <MermaidBlock block={block} onChange={onChange} />}
      {block.type === 'image' && <ImageBlock block={block} onChange={onChange} />}
      {block.type === 'table' && <TableBlock block={block} onChange={onChange} />}
    </div>
  );
}

// ── Add-block button with type picker ──────────────────────────────────────────

function AddBlockButton({ onAdd }) {
  const [open, setOpen] = useState(false);
  const menuRef = useRef(null);

  useEffect(() => {
    if (!open) return undefined;
    const onKey = (e) => { if (e.key === 'Escape') setOpen(false); };
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, [open]);

  return (
    <div className="relative">
      <button
        type="button"
        onClick={() => setOpen((o) => !o)}
        aria-haspopup="listbox"
        aria-expanded={open}
        aria-label="Add block"
        className="flex items-center gap-1.5 text-sm text-neutral-500 hover:text-brand-navy border border-dashed border-neutral-300 dark:border-neutral-600 hover:border-brand-navy rounded-md px-3 py-1.5 w-full justify-center focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-brand-navy-tint/40 focus-visible:ring-offset-2 transition-colors"
      >
        <Plus aria-hidden="true" className="h-4 w-4" />
        Add block
        <ChevronDownIcon aria-hidden="true" className="h-3.5 w-3.5 ml-auto" />
      </button>

      {open && (
        <div
          ref={menuRef}
          role="listbox"
          aria-label="Block type"
          className="absolute left-0 mt-1 z-dropdown w-64 bg-white dark:bg-neutral-900 border border-neutral-200 dark:border-neutral-700 rounded-lg shadow-lg py-1 overflow-auto max-h-64"
        >
          {BLOCK_TYPES.map(({ type, label, Icon }) => (
            <button
              key={type}
              role="option"
              aria-selected={false}
              type="button"
              onClick={() => { onAdd(type); setOpen(false); }}
              className="w-full flex items-center gap-2.5 px-3 py-2 text-sm text-neutral-700 dark:text-neutral-300 hover:bg-neutral-50 dark:hover:bg-neutral-800 focus-visible:outline-none focus-visible:bg-neutral-50 dark:focus-visible:bg-neutral-800"
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

// ── Main BlockEditor component ──────────────────────────────────────────────────

/**
 * @param {Object} props
 * @param {Array}  props.blocks         Initial blocks array (may be empty).
 * @param {Function} props.onChange     Called with the updated blocks array on every change.
 */
export function BlockEditor({ blocks: initialBlocks = [], onChange }) {
  const [blocks, setBlocks] = useState(() =>
    initialBlocks.length > 0 ? initialBlocks : [newBlock('paragraph')]
  );
  const [focusedIndex, setFocusedIndex] = useState(0);

  const emit = useCallback(
    (next) => { setBlocks(next); onChange?.(next); },
    [onChange],
  );

  const addBlock = (type) => {
    const next = [...blocks, newBlock(type)];
    emit(next);
    setFocusedIndex(next.length - 1);
  };

  const updateBlock = (index, patch) => {
    emit(blocks.map((b, i) => (i === index ? { ...b, ...patch } : b)));
  };

  const moveBlock = (index, dir) => {
    const target = index + dir;
    if (target < 0 || target >= blocks.length) return;
    const next = [...blocks];
    [next[index], next[target]] = [next[target], next[index]];
    emit(next);
    setFocusedIndex(target);
  };

  const deleteBlock = (index) => {
    if (blocks.length === 1) {
      // Always keep at least one block; clear its content instead of removing it.
      emit([newBlock('paragraph')]);
      setFocusedIndex(0);
      return;
    }
    const next = blocks.filter((_, i) => i !== index);
    emit(next);
    setFocusedIndex(Math.min(index, next.length - 1));
  };

  return (
    <div className="space-y-2" role="region" aria-label="Block editor">
      {blocks.map((block, index) => (
        <Block
          key={block.id}
          block={block}
          index={index}
          total={blocks.length}
          focused={focusedIndex === index}
          onFocus={setFocusedIndex}
          onChange={(patch) => updateBlock(index, patch)}
          onMove={moveBlock}
          onDelete={deleteBlock}
        />
      ))}
      <AddBlockButton onAdd={addBlock} />
    </div>
  );
}
