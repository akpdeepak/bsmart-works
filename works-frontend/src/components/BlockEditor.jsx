// Block-based article editor — the Know Studio surface (iteration 20, Cap I; extended for the Know
// integrations work). One living document holds rich text, data and diagrams that teams otherwise
// scatter across Confluence / Word (callout, quote, checklist, toggle), Excel (sheet with live
// formulas), PowerBI (chart), Miro / MS Whiteboard (whiteboard), SharePoint (bookmark) and the work
// tracker (workitem). Output: a JSON array saved as `content_blocks`; read-mode rendering lives in
// BlockRenderer.jsx. Everything persists in the existing articles.content_blocks JSONB — no schema.
// WCAG 2.2 AA: keyboard-navigable blocks (arrow keys), visible focus rings, labelled controls.
// Design tokens only — no raw values (RB-30 §1).

import { useState, useRef, useCallback, useEffect, useMemo } from 'react';
import {
  Plus, Trash2, ChevronUp, ChevronDown, Code, AlignLeft,
  Heading1, Heading2, Heading3, Minus, Image, Table,
  GitBranch, ChevronDown as ChevronDownIcon,
  Info, CheckSquare, Quote, ChevronRight,
  Grid, BarChart3, PenTool, Link2, Bookmark, GripVertical, List, Sparkles,
  LayoutDashboard, Smile, Paperclip, X,
} from 'lucide-react';
import { fleschKincaid, gradeLabel } from '@/lib/readability';
import { cn } from '@/lib/utils';
import { evaluateSheet, indexToCol } from '@/lib/sheet-engine';
import { CHART_TYPES } from '@/lib/chart-data';
import { docStats, blocksOutline } from '@/lib/doc-stats';
import { CALLOUT_VARIANTS, STICKY_COLORS, CANVAS_H, NOTE_W, NOTE_H, fileKind, padRows } from '@/lib/block-kit';
import { ChartPreview } from '@/components/blocks/chart-preview';
import { CODE_LANGUAGES } from '@/components/blocks/CodeBlockRenderer';
import { BqlWidget } from '@/components/blocks/bql-widget';
import { EmojiPicker } from '@/components/blocks/emoji-picker';
import { SelectionToolbar } from '@/components/blocks/SelectionToolbar';
import { AiMetaBadge } from '@/components/works/ai-meta-badge';

// KR-006: computeMatches lives in lib/block-search (pure function, kept separate for react-refresh).
import { computeMatches } from '@/lib/block-search';

// Text-bearing blocks that the per-block AI menu can rewrite (improve / expand / summarize / shorten).
const AI_TEXT_TYPES = new Set(['paragraph', 'heading1', 'heading2', 'heading3', 'quote', 'callout']);
const AI_MODES = [
  { mode: 'improve', label: 'Improve' },
  { mode: 'expand', label: 'Expand' },
  { mode: 'summarize', label: 'Summarize' },
  { mode: 'shorten', label: 'Shorten' },
];

// Grouped so the insert menu reads as "what do I want to add", not one long list (RB-30 §7 minimal UX).
const BLOCK_TYPES = [
  { type: 'paragraph', label: 'Paragraph', Icon: AlignLeft, group: 'Basic' },
  { type: 'heading1',  label: 'Heading 1', Icon: Heading1, group: 'Basic' },
  { type: 'heading2',  label: 'Heading 2', Icon: Heading2, group: 'Basic' },
  { type: 'heading3',  label: 'Heading 3', Icon: Heading3, group: 'Basic' },
  { type: 'quote',     label: 'Quote', Icon: Quote, group: 'Basic' },
  { type: 'callout',   label: 'Callout / panel', Icon: Info, group: 'Basic' },
  { type: 'checklist', label: 'Checklist', Icon: CheckSquare, group: 'Basic' },
  { type: 'toggle',    label: 'Toggle (collapsible)', Icon: ChevronRight, group: 'Basic' },
  { type: 'toc',       label: 'Table of contents', Icon: List, group: 'Basic' },
  { type: 'code',      label: 'Code block', Icon: Code, group: 'Basic' },
  { type: 'divider',   label: 'Divider', Icon: Minus, group: 'Basic' },
  { type: 'sheet',     label: 'Sheet (formulas)', Icon: Grid, group: 'Data' },
  { type: 'chart',     label: 'Chart', Icon: BarChart3, group: 'Data' },
  { type: 'bqlwidget', label: 'Live widget (BQL)', Icon: LayoutDashboard, group: 'Data' },
  { type: 'table',     label: 'Table', Icon: Table, group: 'Data' },
  { type: 'image',     label: 'Image (URL)', Icon: Image, group: 'Visual' },
  { type: 'mermaid',   label: 'Diagram (Mermaid)', Icon: GitBranch, group: 'Visual' },
  { type: 'whiteboard', label: 'Whiteboard', Icon: PenTool, group: 'Visual' },
  { type: 'sticker',   label: 'Sticker / emoji', Icon: Smile, group: 'Visual' },
  { type: 'workitem',  label: 'Work item', Icon: Link2, group: 'Connect' },
  { type: 'bookmark',  label: 'Bookmark / link', Icon: Bookmark, group: 'Connect' },
  { type: 'file',      label: 'File (any type)', Icon: Paperclip, group: 'Connect' },
];

const BLOCK_GROUPS = ['Basic', 'Data', 'Visual', 'Connect'];

// ── Top toolbar — every block type as a compact icon, grouped like a minimal ribbon ─────────────
// Inserts after the currently focused block so the new block appears where the author is looking.
// Groups: Text (headings, quotes, callouts), Structure (checklist/toggle/code), Data (tables/charts),
// Media (images/diagrams/whiteboards), Connect (work items/bookmarks/files).
const TOOLBAR_GROUPS = [
  {
    label: 'Text',
    items: [
      { type: 'paragraph',  title: 'Paragraph',           Icon: AlignLeft },
      { type: 'heading1',   title: 'Heading 1',           Icon: Heading1 },
      { type: 'heading2',   title: 'Heading 2',           Icon: Heading2 },
      { type: 'heading3',   title: 'Heading 3',           Icon: Heading3 },
      { type: 'quote',      title: 'Quote',               Icon: Quote },
      { type: 'callout',    title: 'Callout / panel',     Icon: Info },
    ],
  },
  {
    label: 'Structure',
    items: [
      { type: 'checklist',  title: 'Checklist',           Icon: CheckSquare },
      { type: 'toggle',     title: 'Toggle (collapsible)', Icon: ChevronRight },
      { type: 'toc',        title: 'Table of contents',   Icon: List },
      { type: 'code',       title: 'Code block',          Icon: Code },
      { type: 'divider',    title: 'Divider',             Icon: Minus },
    ],
  },
  {
    label: 'Data',
    items: [
      { type: 'table',      title: 'Table',               Icon: Table },
      { type: 'sheet',      title: 'Sheet (formulas)',    Icon: Grid },
      { type: 'chart',      title: 'Chart',               Icon: BarChart3 },
      { type: 'bqlwidget',  title: 'Live widget (BQL)',   Icon: LayoutDashboard },
    ],
  },
  {
    label: 'Media',
    items: [
      { type: 'image',      title: 'Image',               Icon: Image },
      { type: 'mermaid',    title: 'Diagram (Mermaid)',   Icon: GitBranch },
      { type: 'whiteboard', title: 'Whiteboard (Miro)',   Icon: PenTool },
      { type: 'sticker',    title: 'Sticker / emoji',     Icon: Smile },
    ],
  },
  {
    label: 'Connect',
    items: [
      { type: 'workitem',   title: 'Work item',           Icon: Link2 },
      { type: 'bookmark',   title: 'Bookmark / link',     Icon: Bookmark },
      { type: 'file',       title: 'File (any type)',     Icon: Paperclip },
    ],
  },
];

const blockLabel = (type) => BLOCK_TYPES.find((t) => t.type === type)?.label || type;

// Wrap the current textarea/input selection with a markdown syntax pair (KR-001).
// The element's selectionStart/End define what gets wrapped; caret is restored after.
function wrapSyntax(el, syntax, value, onChange) {
  const start = el.selectionStart;
  const end = el.selectionEnd;
  if (start === end) return;
  const next = `${value.slice(0, start)}${syntax}${value.slice(start, end)}${syntax}${value.slice(end)}`;
  onChange({ content: next });
  requestAnimationFrame(() => {
    if (document.activeElement === el) {
      el.selectionStart = start + syntax.length;
      el.selectionEnd = end + syntax.length;
    }
  });
}

// Shared format-shortcut handler — usable in any text-bearing block's onKeyDown (KR-001).
function handleFormatKey(e, el, value, onChange) {
  const ctrl = e.ctrlKey || e.metaKey;
  if (!ctrl) return false;
  if (!e.shiftKey && e.key === 'b') { e.preventDefault(); wrapSyntax(el, '**', value, onChange); return true; }
  if (!e.shiftKey && e.key === 'i') { e.preventDefault(); wrapSyntax(el, '*', value, onChange); return true; }
  if (e.shiftKey  && e.key === 'X') { e.preventDefault(); wrapSyntax(el, '~~', value, onChange); return true; }
  if (!e.shiftKey && e.key === '`') { e.preventDefault(); wrapSyntax(el, '`', value, onChange); return true; }
  return false;
}

function blockId() {
  return `blk-${Date.now()}-${Math.random().toString(36).slice(2, 7)}`;
}

function newBlock(type) {
  const id = blockId();
  switch (type) {
    case 'table':
      return { id, type, content: '', metadata: { rows: [['', ''], ['', '']], cols: 2 } };
    case 'sheet':
      return { id, type, content: '', metadata: { rows: [['', '', ''], ['', '', ''], ['', '', '']], cols: 3 } };
    case 'chart':
      return { id, type, content: '', metadata: { chartType: 'bar', rows: [['Label', 'Value'], ['A', '3'], ['B', '5']] } };
    case 'bqlwidget':
      return { id, type, content: '', metadata: { title: '', chartType: 'bar', dimension: 'status', measureField: '*', measureAgg: 'COUNT' } };
    case 'sticker':
      return { id, type, content: '✨', metadata: { size: 'lg' } };
    case 'callout':
      return { id, type, content: '', metadata: { variant: 'info' } };
    case 'checklist':
      return { id, type, content: '', metadata: { items: [{ text: '', done: false }] } };
    case 'toggle':
      return { id, type, content: '', metadata: { body: '', open: true } };
    case 'whiteboard':
      return { id, type, content: '', metadata: { notes: [] } };
    case 'workitem':
      return { id, type, content: '', metadata: { title: '', status: '' } };
    case 'bookmark':
      return { id, type, content: '', metadata: { title: '', description: '' } };
    case 'file':
      return { id, type, content: '', metadata: { fileName: '' } };
    case 'toc':
      return { id, type, content: '', metadata: {} };
    default:
      return { id, type, content: '', metadata: {} };
  }
}

// ── Block-insert toolbar ────────────────────────────────────────────────────────
// Minimal ribbon at the top of the editor. One click inserts any of the 22 block types
// right after the focused block — no scrolling to the bottom dropdown required.
function BlockToolbar({ onInsert }) {
  return (
    <div
      role="toolbar"
      aria-label="Insert block"
      className="flex items-center flex-wrap gap-0 px-2 py-1 bg-neutral-50 dark:bg-neutral-900/60 border border-neutral-200 dark:border-neutral-700 rounded-lg"
    >
      {TOOLBAR_GROUPS.map((group, gi) => (
        <div key={group.label} className="flex items-center">
          {gi > 0 && (
            <span aria-hidden="true" className="w-px h-5 bg-neutral-200 dark:bg-neutral-700 mx-1.5 flex-shrink-0" />
          )}
          <div className="flex items-center gap-0.5">
            {group.items.map(({ type, title, Icon }) => (
              <button
                key={type}
                type="button"
                title={title}
                aria-label={title}
                onClick={() => onInsert(type)}
                className="w-7 h-7 flex items-center justify-center rounded text-neutral-500 dark:text-neutral-400 hover:bg-brand-navy/10 hover:text-brand-navy dark:hover:text-brand-orange transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-brand-navy-tint/40"
              >
                <Icon aria-hidden="true" className="h-3.5 w-3.5" />
              </button>
            ))}
          </div>
        </div>
      ))}
    </div>
  );
}

// ── Existing block renderers ────────────────────────────────────────────────────

// Slash-command insert: typing "/" (optionally followed by a filter, e.g. "/cal") at the start of
// an otherwise-empty paragraph opens a block picker that REPLACES this paragraph with the chosen
// block — the Notion-style shortcut. It reuses BLOCK_TYPES so it never drifts from the Add-block
// menu, and the fully-accessible Add-block button remains the primary path.
const SLASH_RE = /^\/(\S*)$/;

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
function CalloutBlock({ block, onChange }) {
  const variant = block.metadata?.variant || 'info';
  const v = CALLOUT_VARIANTS[variant] || CALLOUT_VARIANTS.info;
  const Icon = v.Icon;
  return (
    <div className={cn('rounded-md border-l-2 p-3 flex gap-3', v.box)}>
      <Icon aria-hidden="true" className={cn('h-5 w-5 shrink-0 mt-0.5', v.accent)} />
      <div className="flex-1 space-y-2">
        <label className="sr-only" htmlFor={`callout-variant-${block.id}`}>Callout style</label>
        <select
          id={`callout-variant-${block.id}`}
          value={variant}
          onChange={(e) => onChange({ metadata: { ...block.metadata, variant: e.target.value } })}
          className="text-xs font-semibold bg-transparent text-neutral-700 dark:text-neutral-300 border border-neutral-200 dark:border-neutral-700 rounded px-2 py-1 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-brand-navy-tint/40"
        >
          {Object.entries(CALLOUT_VARIANTS).map(([key, def]) => (
            <option key={key} value={key}>{def.label}</option>
          ))}
        </select>
        <textarea
          aria-label="Callout text"
          value={block.content}
          onChange={(e) => onChange({ content: e.target.value })}
          onKeyDown={(e) => handleFormatKey(e, e.currentTarget, block.content, onChange)}
          rows={2}
          className="w-full resize-y bg-transparent text-sm text-neutral-900 dark:text-neutral-100 focus-visible:outline-none"
          placeholder="Something worth highlighting…"
        />
      </div>
    </div>
  );
}

function QuoteBlock({ block, onChange }) {
  return (
    <div className="border-l-4 border-brand-navy-tint pl-3">
      <textarea
        aria-label="Quote text"
        value={block.content}
        onChange={(e) => onChange({ content: e.target.value })}
        onKeyDown={(e) => handleFormatKey(e, e.currentTarget, block.content, onChange)}
        rows={2}
        className="w-full resize-y bg-transparent text-sm italic text-neutral-700 dark:text-neutral-300 focus-visible:outline-none"
        placeholder="A quote or callout sentence…"
      />
    </div>
  );
}

function ChecklistBlock({ block, onChange }) {
  const items = block.metadata?.items || [];
  const set = (next) => onChange({ metadata: { ...block.metadata, items: next } });
  const toggle = (i) => set(items.map((it, idx) => (idx === i ? { ...it, done: !it.done } : it)));
  const edit = (i, text) => set(items.map((it, idx) => (idx === i ? { ...it, text } : it)));
  const add = () => set([...items, { text: '', done: false }]);
  const remove = (i) => set(items.filter((_, idx) => idx !== i));

  return (
    <div className="space-y-1.5">
      {items.map((it, i) => (
        <div key={i} className="flex items-center gap-2">
          <input
            type="checkbox"
            checked={!!it.done}
            onChange={() => toggle(i)}
            aria-label={`Mark "${it.text || 'item'}" ${it.done ? 'not done' : 'done'}`}
            className="h-4 w-4 rounded border-neutral-300 text-brand-navy focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-brand-navy-tint/40"
          />
          <input
            type="text"
            aria-label={`Checklist item ${i + 1}`}
            value={it.text}
            onChange={(e) => edit(i, e.target.value)}
            className={cn(
              'flex-1 bg-transparent text-sm border-b border-transparent focus:border-neutral-200 dark:focus:border-neutral-700',
              'text-neutral-900 dark:text-neutral-100 focus-visible:outline-none',
              it.done && 'line-through text-neutral-400',
            )}
            placeholder="To do…"
          />
          <button
            type="button"
            onClick={() => remove(i)}
            aria-label={`Remove item ${i + 1}`}
            className="text-neutral-400 hover:text-semantic-danger focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-brand-navy-tint/40 rounded"
          >
            <Trash2 aria-hidden="true" className="h-3.5 w-3.5" />
          </button>
        </div>
      ))}
      <button
        type="button"
        onClick={add}
        className="text-xs text-brand-navy hover:underline focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-brand-navy-tint/40 rounded"
      >
        + Item
      </button>
    </div>
  );
}

function ToggleBlock({ block, onChange }) {
  const open = block.metadata?.open !== false;
  return (
    <div className="space-y-2">
      <div className="flex items-center gap-2">
        <button
          type="button"
          onClick={() => onChange({ metadata: { ...block.metadata, open: !open } })}
          aria-expanded={open}
          aria-label={open ? 'Collapse' : 'Expand'}
          className="text-neutral-500 hover:text-brand-navy focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-brand-navy-tint/40 rounded"
        >
          <ChevronRight aria-hidden="true" className={cn('h-4 w-4 transition-transform', open && 'rotate-90')} />
        </button>
        <input
          type="text"
          aria-label="Toggle summary"
          value={block.content}
          onChange={(e) => onChange({ content: e.target.value })}
          className="flex-1 bg-transparent text-sm font-medium text-neutral-900 dark:text-neutral-100 border-b border-neutral-200 dark:border-neutral-700 pb-0.5 focus-visible:outline-none focus-visible:border-brand-navy-tint"
          placeholder="Summary (click ▸ to expand)"
        />
      </div>
      {open && (
        <textarea
          aria-label="Toggle body"
          value={block.metadata?.body || ''}
          onChange={(e) => onChange({ metadata: { ...block.metadata, body: e.target.value } })}
          rows={3}
          className="w-full ml-6 resize-y bg-transparent text-sm text-neutral-700 dark:text-neutral-300 border border-neutral-200 dark:border-neutral-700 rounded-md px-3 py-2 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-brand-navy-tint/40 focus-visible:ring-offset-2"
          placeholder="Hidden detail — runbook steps, FAQ answer, fine print…"
        />
      )}
    </div>
  );
}

// Sheet — the "Excel" block: an inline grid with live formulas (=SUM(A1:A3), =A1+B2, …). The
// Formulas/Values toggle flips between editing raw cells and the evaluated read-out so a reviewer
// sees the computed result without leaving the doc. Evaluation is the pure sheet-engine (testable).
function SheetBlock({ block, onChange }) {
  const [showValues, setShowValues] = useState(false);
  const cols = block.metadata?.cols || (block.metadata?.rows?.[0] ? block.metadata.rows[0].length : 3);
  const rows = padRows(block.metadata?.rows || [['', '', ''], ['', '', ''], ['', '', '']], cols);
  const computed = evaluateSheet(rows);

  const setCell = (r, c, val) => {
    const next = rows.map((row, ri) => row.map((cell, ci) => (ri === r && ci === c ? val : cell)));
    onChange({ metadata: { ...block.metadata, rows: next, cols } });
  };
  const addRow = () => onChange({ metadata: { ...block.metadata, rows: [...rows, Array(cols).fill('')], cols } });
  const addCol = () => onChange({ metadata: { ...block.metadata, rows: rows.map((row) => [...row, '']), cols: cols + 1 } });

  return (
    <div className="space-y-2">
      <div className="flex items-center gap-2">
        <span className="text-xs font-medium text-neutral-600 dark:text-neutral-400">Sheet</span>
        <button
          type="button"
          onClick={() => setShowValues((s) => !s)}
          aria-pressed={showValues}
          className="text-xs text-brand-navy hover:underline focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-brand-navy-tint/40 rounded"
        >
          {showValues ? 'Show formulas' : 'Show values'}
        </button>
      </div>
      <div className="overflow-x-auto">
        <table className="border-collapse text-sm" aria-label="Spreadsheet">
          <thead>
            <tr>
              <th className="w-8 bg-neutral-100 dark:bg-neutral-800 border border-neutral-200 dark:border-neutral-700" aria-label="row numbers" />
              {Array.from({ length: cols }).map((_, ci) => (
                <th key={ci} className="min-w-20 bg-neutral-100 dark:bg-neutral-800 border border-neutral-200 dark:border-neutral-700 px-2 py-1 text-xs font-semibold text-neutral-500">
                  {indexToCol(ci)}
                </th>
              ))}
            </tr>
          </thead>
          <tbody>
            {rows.map((row, ri) => (
              <tr key={ri}>
                <td className="w-8 text-center bg-neutral-100 dark:bg-neutral-800 border border-neutral-200 dark:border-neutral-700 text-xs font-semibold text-neutral-500">{ri + 1}</td>
                {row.map((cell, ci) => {
                  const display = computed[ri]?.[ci] ?? '';
                  const isErr = display === '#ERR' || display === '#CIRC';
                  return (
                    <td key={ci} className="border border-neutral-200 dark:border-neutral-700 p-0">
                      {showValues ? (
                        <div className={cn('px-2 py-1.5 tabular-nums', isErr ? 'text-semantic-danger' : 'text-neutral-900 dark:text-neutral-100')}>
                          {display}
                        </div>
                      ) : (
                        <input
                          type="text"
                          aria-label={`Cell ${indexToCol(ci)}${ri + 1}`}
                          value={cell}
                          onChange={(e) => setCell(ri, ci, e.target.value)}
                          className={cn(
                            'w-full px-2 py-1.5 bg-transparent text-neutral-900 dark:text-neutral-100 tabular-nums',
                            'focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-inset focus-visible:ring-brand-navy-tint/40',
                            String(cell).startsWith('=') && 'font-mono text-brand-navy dark:text-brand-amber',
                          )}
                          placeholder=""
                        />
                      )}
                    </td>
                  );
                })}
              </tr>
            ))}
          </tbody>
        </table>
      </div>
      <div className="flex gap-2">
        <button type="button" onClick={addRow} className="text-xs text-brand-navy hover:underline focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-brand-navy-tint/40 rounded">+ Row</button>
        <button type="button" onClick={addCol} className="text-xs text-brand-navy hover:underline focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-brand-navy-tint/40 rounded">+ Column</button>
        <span className="text-2xs text-neutral-600 dark:text-neutral-400 self-center">Try =SUM(A1:A3), =A1*B1</span>
      </div>
    </div>
  );
}

// Table of contents — the "MS Word" auto-TOC. Generated live from the document's heading blocks,
// so it never goes stale the way a hand-maintained Word TOC does. Read-only in the editor (preview).
function TocBlock({ allBlocks }) {
  const outline = blocksOutline(allBlocks);
  return (
    <div>
      <p className="text-2xs uppercase tracking-wide font-semibold text-neutral-600 dark:text-neutral-400 mb-1.5">Contents · auto-generated from headings</p>
      {outline.length === 0 ? (
        <p className="text-xs text-neutral-500">Add heading blocks and they appear here automatically.</p>
      ) : (
        <ul className="space-y-0.5">
          {outline.map((h) => (
            <li
              key={h.id}
              className={cn('text-sm text-neutral-700 dark:text-neutral-300', h.level === 2 && 'pl-3', h.level === 3 && 'pl-6')}
            >
              {h.text}
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}

// Sticker — a big expressive emoji to add personality and visual signposting to a doc (RB-30 §7).
const STICKER_SIZE = { md: 'text-4xl', lg: 'text-6xl', xl: 'text-8xl' };

function StickerBlock({ block, onChange }) {
  const size = block.metadata?.size || 'lg';
  return (
    <div className="flex items-center gap-3">
      <span className={cn('leading-none select-none', STICKER_SIZE[size] || STICKER_SIZE.lg)} role="img" aria-label="Sticker">{block.content || '✨'}</span>
      <div className="flex items-center gap-2">
        <EmojiPicker onPick={(emoji) => onChange({ content: emoji })} triggerLabel="Choose sticker" buttonClassName="h-7 w-7 border border-neutral-200 dark:border-neutral-700 rounded" />
        <label className="text-2xs text-neutral-500">Size
          <select
            aria-label="Sticker size"
            value={size}
            onChange={(e) => onChange({ metadata: { ...block.metadata, size: e.target.value } })}
            className="ml-1 text-xs bg-transparent border border-neutral-200 dark:border-neutral-700 rounded px-1.5 py-1 text-neutral-700 dark:text-neutral-300 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-brand-navy-tint/40"
          >
            {['md', 'lg', 'xl'].map((s) => <option key={s} value={s}>{s}</option>)}
          </select>
        </label>
      </div>
    </div>
  );
}

function ChartBlock({ block, onChange }) {
  const chartType = block.metadata?.chartType || 'bar';
  const rows = block.metadata?.rows || [['Label', 'Value']];

  const setCell = (r, c, val) => {
    const next = rows.map((row, ri) => row.map((cell, ci) => (ri === r && ci === c ? val : cell)));
    onChange({ metadata: { ...block.metadata, rows: next } });
  };
  const addRow = () => onChange({ metadata: { ...block.metadata, rows: [...rows, ['', '']] } });
  // Keep at least one row so the editor always has an editable line (and a stable shape for the renderer).
  const removeRow = (r) => { if (rows.length > 1) onChange({ metadata: { ...block.metadata, rows: rows.filter((_, ri) => ri !== r) } }); };

  return (
    <div className="space-y-3">
      <div className="flex items-center gap-2">
        <label htmlFor={`chart-type-${block.id}`} className="text-xs font-medium text-neutral-600 dark:text-neutral-400">Chart</label>
        <select
          id={`chart-type-${block.id}`}
          value={chartType}
          onChange={(e) => onChange({ metadata: { ...block.metadata, chartType: e.target.value } })}
          className="text-xs bg-transparent text-neutral-700 dark:text-neutral-300 border border-neutral-200 dark:border-neutral-700 rounded px-2 py-1 capitalize focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-brand-navy-tint/40"
        >
          {CHART_TYPES.map((t) => <option key={t} value={t}>{t}</option>)}
        </select>
      </div>
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        <div className="space-y-1.5">
          {rows.map((row, ri) => (
            <div key={ri} className="flex items-center gap-1.5">
              <input
                type="text"
                aria-label={`Row ${ri + 1} label`}
                value={row[0] ?? ''}
                onChange={(e) => setCell(ri, 0, e.target.value)}
                className="flex-1 text-sm bg-transparent border border-neutral-200 dark:border-neutral-700 rounded px-2 py-1 text-neutral-900 dark:text-neutral-100 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-brand-navy-tint/40"
                placeholder="Label"
              />
              <input
                type="text"
                inputMode="decimal"
                aria-label={`Row ${ri + 1} value`}
                value={row[1] ?? ''}
                onChange={(e) => setCell(ri, 1, e.target.value)}
                className="w-20 text-sm bg-transparent border border-neutral-200 dark:border-neutral-700 rounded px-2 py-1 text-neutral-900 dark:text-neutral-100 tabular-nums focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-brand-navy-tint/40"
                placeholder="Value"
              />
              <button
                type="button"
                onClick={() => removeRow(ri)}
                aria-label={`Remove row ${ri + 1}`}
                className="text-neutral-400 hover:text-semantic-danger focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-brand-navy-tint/40 rounded"
              >
                <Trash2 aria-hidden="true" className="h-3.5 w-3.5" />
              </button>
            </div>
          ))}
          <button type="button" onClick={addRow} className="text-xs text-brand-navy hover:underline focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-brand-navy-tint/40 rounded">+ Row</button>
        </div>
        <div className="rounded-md border border-neutral-100 dark:border-neutral-800 p-3 bg-neutral-50 dark:bg-neutral-900/50">
          <ChartPreview chartType={chartType} rows={rows} />
        </div>
      </div>
    </div>
  );
}

// Whiteboard — the "Miro / MS Whiteboard" block: sticky notes on an inline canvas. The drag handle
// is a real button, so notes drag with the pointer and nudge with arrow keys (keyboard parity,
// RB-30 §6). Token surfaces only; geometry constants live in block-kit.
function WhiteboardBlock({ block, onChange }) {
  const notes = block.metadata?.notes || [];
  const canvasRef = useRef(null);
  const drag = useRef(null);

  const setNotes = (next) => onChange({ metadata: { ...block.metadata, notes: next } });
  const clampX = (x) => {
    const w = canvasRef.current?.clientWidth || 600;
    return Math.max(0, Math.min(x, w - NOTE_W));
  };
  const clampY = (y) => Math.max(0, Math.min(y, CANVAS_H - NOTE_H));

  const addNote = () => setNotes([
    ...notes,
    { id: blockId(), x: clampX(16 + notes.length * 24), y: clampY(16 + notes.length * 16), text: '', emoji: '', color: notes.length % STICKY_COLORS.length },
  ]);
  const updateNote = (id, patch) => setNotes(notes.map((n) => (n.id === id ? { ...n, ...patch } : n)));
  const removeNote = (id) => setNotes(notes.filter((n) => n.id !== id));

  const onHandlePointerDown = (e, note) => {
    const rect = canvasRef.current.getBoundingClientRect();
    drag.current = { id: note.id, dx: e.clientX - rect.left - note.x, dy: e.clientY - rect.top - note.y };
    e.currentTarget.setPointerCapture?.(e.pointerId);
  };
  const onPointerMove = (e) => {
    if (!drag.current) return;
    const rect = canvasRef.current.getBoundingClientRect();
    updateNote(drag.current.id, {
      x: clampX(e.clientX - rect.left - drag.current.dx),
      y: clampY(e.clientY - rect.top - drag.current.dy),
    });
  };
  const onPointerUp = () => { drag.current = null; };

  const onHandleKeyDown = (e, note) => {
    const step = 8;
    const moves = { ArrowUp: [0, -step], ArrowDown: [0, step], ArrowLeft: [-step, 0], ArrowRight: [step, 0] };
    if (moves[e.key]) {
      e.preventDefault();
      const [mx, my] = moves[e.key];
      updateNote(note.id, { x: clampX(note.x + mx), y: clampY(note.y + my) });
    }
  };

  return (
    <div className="space-y-2">
      <div className="flex items-center gap-2">
        <span className="text-xs font-medium text-neutral-600 dark:text-neutral-400">Whiteboard</span>
        <button type="button" onClick={addNote} className="text-xs text-brand-navy hover:underline focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-brand-navy-tint/40 rounded">+ Sticky note</button>
      </div>
      <div
        ref={canvasRef}
        onPointerMove={onPointerMove}
        onPointerUp={onPointerUp}
        onPointerLeave={onPointerUp}
        className="relative rounded-md border border-neutral-200 dark:border-neutral-700 bg-neutral-50 dark:bg-neutral-900/50 overflow-hidden"
        style={{ height: CANVAS_H }}
        role="group"
        aria-label="Whiteboard canvas"
      >
        {notes.length === 0 && (
          <p className="absolute inset-0 flex items-center justify-center text-xs text-neutral-600 dark:text-neutral-400 select-none">Add a sticky note to start.</p>
        )}
        {notes.map((note) => (
          <div
            key={note.id}
            role="group"
            aria-label={`Sticky note: ${note.text || 'empty'}`}
            className={cn(
              'absolute rounded-md border border-neutral-300/60 dark:border-neutral-600 shadow-sm p-1.5 touch-none',
              STICKY_COLORS[(note.color || 0) % STICKY_COLORS.length],
            )}
            style={{ left: note.x, top: note.y, width: NOTE_W, height: NOTE_H }}
          >
            <div className="flex items-center justify-between">
              <button
                type="button"
                onPointerDown={(e) => onHandlePointerDown(e, note)}
                onKeyDown={(e) => onHandleKeyDown(e, note)}
                aria-label="Move note (drag, or arrow keys)"
                className="cursor-move text-neutral-500 hover:text-neutral-900 dark:hover:text-neutral-100 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-brand-navy-tint/60 rounded"
              >
                <GripVertical aria-hidden="true" className="h-3 w-3" />
              </button>
              <div className="flex items-center gap-1">
                <EmojiPicker onPick={(emoji) => updateNote(note.id, { emoji })} triggerLabel="Add emoji to note" />
                <button
                  type="button"
                  onClick={() => removeNote(note.id)}
                  aria-label="Delete note"
                  className="text-neutral-500 hover:text-semantic-danger focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-brand-navy-tint/40 rounded"
                >
                  <Trash2 aria-hidden="true" className="h-3 w-3" />
                </button>
              </div>
            </div>
            <div className="flex items-start gap-1">
              {note.emoji && <span className="text-base leading-none" aria-hidden="true">{note.emoji}</span>}
              <textarea
                aria-label="Note text"
                value={note.text}
                onChange={(e) => updateNote(note.id, { text: e.target.value })}
                className="w-full h-12 resize-none bg-transparent text-xs text-neutral-900 dark:text-neutral-100 focus-visible:outline-none"
                placeholder="Idea…"
              />
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}

function WorkItemBlock({ block, onChange }) {
  return (
    <div className="space-y-2">
      <div className="flex items-center gap-2">
        <Link2 aria-hidden="true" className="h-4 w-4 text-brand-navy" />
        <input
          type="text"
          aria-label="Work item ID"
          value={block.content}
          onChange={(e) => onChange({ content: e.target.value.toUpperCase() })}
          className="w-40 text-sm font-mono bg-transparent border border-neutral-200 dark:border-neutral-700 rounded px-2 py-1 text-neutral-900 dark:text-neutral-100 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-brand-navy-tint/40"
          placeholder="WRK-123"
        />
        <input
          type="text"
          aria-label="Work item status"
          value={block.metadata?.status || ''}
          onChange={(e) => onChange({ metadata: { ...block.metadata, status: e.target.value } })}
          className="w-28 text-xs bg-transparent border border-neutral-200 dark:border-neutral-700 rounded px-2 py-1 text-neutral-600 dark:text-neutral-400 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-brand-navy-tint/40"
          placeholder="Status"
        />
      </div>
      <input
        type="text"
        aria-label="Work item title"
        value={block.metadata?.title || ''}
        onChange={(e) => onChange({ metadata: { ...block.metadata, title: e.target.value } })}
        className="w-full text-sm bg-transparent border border-neutral-200 dark:border-neutral-700 rounded px-2 py-1 text-neutral-900 dark:text-neutral-100 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-brand-navy-tint/40"
        placeholder="Title (so the reference reads well even before it resolves)"
      />
    </div>
  );
}

function BookmarkBlock({ block, onChange }) {
  return (
    <div className="space-y-2">
      <div className="flex items-center gap-2">
        <Bookmark aria-hidden="true" className="h-4 w-4 text-brand-navy" />
        <input
          type="url"
          aria-label="Bookmark URL"
          value={block.content}
          onChange={(e) => onChange({ content: e.target.value })}
          className="flex-1 text-sm bg-transparent border border-neutral-200 dark:border-neutral-700 rounded px-2 py-1 text-neutral-900 dark:text-neutral-100 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-brand-navy-tint/40"
          placeholder="https://… (SharePoint doc, wiki page, dashboard)"
        />
      </div>
      <input
        type="text"
        aria-label="Bookmark title"
        value={block.metadata?.title || ''}
        onChange={(e) => onChange({ metadata: { ...block.metadata, title: e.target.value } })}
        className="w-full text-sm bg-transparent border border-neutral-200 dark:border-neutral-700 rounded px-2 py-1 text-neutral-900 dark:text-neutral-100 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-brand-navy-tint/40"
        placeholder="Title"
      />
      <input
        type="text"
        aria-label="Bookmark description"
        value={block.metadata?.description || ''}
        onChange={(e) => onChange({ metadata: { ...block.metadata, description: e.target.value } })}
        className="w-full text-xs bg-transparent border border-neutral-200 dark:border-neutral-700 rounded px-2 py-1 text-neutral-600 dark:text-neutral-400 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-brand-navy-tint/40"
        placeholder="What is this and why does it matter?"
      />
    </div>
  );
}

// File — attach any file type by link (PDF, doc, sheet, image, zip, video…). The block detects the
// kind from the extension for a type-aware icon + inline image preview. (Native binary upload for
// articles is a tracked follow-up — it needs an article-attachments table/endpoint; today files are
// referenced by URL, which also covers SharePoint / Drive / S3 links.)
const FILE_KIND_LABEL = { image: 'Image', pdf: 'PDF', doc: 'Document', sheet: 'Spreadsheet', slide: 'Slides', archive: 'Archive', video: 'Video', audio: 'Audio', code: 'Code', link: 'File' };

function FileBlock({ block, onChange }) {
  const kind = fileKind(block.metadata?.fileName || block.content);
  return (
    <div className="space-y-2">
      <div className="flex items-center gap-2">
        <Paperclip aria-hidden="true" className="h-4 w-4 text-brand-navy shrink-0" />
        <input
          type="url"
          aria-label="File URL"
          value={block.content}
          onChange={(e) => onChange({ content: e.target.value })}
          className="flex-1 text-sm bg-transparent border border-neutral-200 dark:border-neutral-700 rounded px-2 py-1 text-neutral-900 dark:text-neutral-100 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-brand-navy-tint/40"
          placeholder="https://… link to any file (PDF, doc, sheet, image, zip)"
        />
        <span className="text-2xs px-1.5 py-0.5 rounded bg-neutral-100 dark:bg-neutral-800 text-neutral-500">{FILE_KIND_LABEL[kind]}</span>
      </div>
      <input
        type="text"
        aria-label="File name"
        value={block.metadata?.fileName || ''}
        onChange={(e) => onChange({ metadata: { ...block.metadata, fileName: e.target.value } })}
        className="w-full text-sm bg-transparent border border-neutral-200 dark:border-neutral-700 rounded px-2 py-1 text-neutral-900 dark:text-neutral-100 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-brand-navy-tint/40"
        placeholder="Display name (e.g. Q3-report.pdf)"
      />
      {kind === 'image' && block.content && (
        <img src={block.content} alt={block.metadata?.fileName || 'File preview'} className="max-h-40 rounded-md border border-neutral-200 dark:border-neutral-700 object-contain" onError={(e) => { e.currentTarget.style.display = 'none'; }} />
      )}
    </div>
  );
}

// ── AI affordances (RB-40 §2 — every Know writing surface is AI-assisted) ───────
// All AI goes through the `aiAssist` prop, which routes to the AI Control Plane on the server
// (scope / budget / cache / audit + deterministic fallback). When `aiAssist` is absent these render
// nothing, so the editor is fully usable without AI.

function AiBlockMenu({ block, onChange, aiAssist }) {
  const [open, setOpen] = useState(false);
  const [busy, setBusy] = useState(false);

  const run = async (mode) => {
    setOpen(false);
    setBusy(true);
    try {
      const res = await aiAssist({ mode, text: block.content || '' });
      if (res && typeof res.text === 'string') onChange({ content: res.text });
    } catch {
      /* AI failure is non-fatal — the author keeps their text. */
    } finally {
      setBusy(false);
    }
  };

  return (
    <div className="relative inline-flex">
      <button
        type="button"
        onClick={() => setOpen((o) => !o)}
        disabled={busy}
        aria-haspopup="menu"
        aria-expanded={open}
        aria-label="AI writing assistant"
        className="w-6 h-6 rounded flex items-center justify-center text-brand-navy hover:text-brand-navy-tint disabled:opacity-50 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-brand-navy-tint/40"
      >
        <Sparkles aria-hidden="true" className={cn('h-3.5 w-3.5', busy && 'animate-pulse')} />
      </button>
      {open && (
        <div role="menu" aria-label="AI actions" className="absolute right-0 top-7 z-dropdown w-36 bg-white dark:bg-neutral-900 border border-neutral-200 dark:border-neutral-700 rounded-lg shadow-lg py-1">
          {AI_MODES.map(({ mode, label }) => (
            <button
              key={mode}
              role="menuitem"
              type="button"
              onClick={() => run(mode)}
              className="w-full text-left px-3 py-1.5 text-sm text-neutral-700 dark:text-neutral-300 hover:bg-neutral-50 dark:hover:bg-neutral-800 focus-visible:outline-none focus-visible:bg-neutral-50 dark:focus-visible:bg-neutral-800"
            >
              {label}
            </button>
          ))}
        </div>
      )}
    </div>
  );
}

// AI compose bar — write a fresh paragraph from a prompt. Appended as a new block.
function AiComposeBar({ aiAssist, onInsert }) {
  const [prompt, setPrompt] = useState('');
  const [busy, setBusy] = useState(false);
  const [meta, setMeta] = useState(null);

  const write = async () => {
    if (!prompt.trim() || busy) return;
    setBusy(true);
    try {
      const res = await aiAssist({ mode: 'write', instruction: prompt });
      if (res && typeof res.text === 'string') onInsert(res.text);
      setMeta(res?.meta || null);
      setPrompt('');
    } catch {
      setMeta(null);
    } finally {
      setBusy(false);
    }
  };

  return (
    <div className="rounded-md border border-brand-navy-tint/30 bg-brand-navy-tint/5 p-2 space-y-2">
      <div className="flex items-center gap-2">
        <Sparkles aria-hidden="true" className="h-4 w-4 text-brand-navy shrink-0" />
        <input
          type="text"
          aria-label="Write with AI"
          value={prompt}
          onChange={(e) => setPrompt(e.target.value)}
          onKeyDown={(e) => { if (e.key === 'Enter') { e.preventDefault(); write(); } }}
          placeholder="Write with AI — e.g. “draft an intro about our deploy process”"
          className="flex-1 bg-transparent text-sm text-neutral-900 dark:text-neutral-100 focus-visible:outline-none"
        />
        <button
          type="button"
          onClick={write}
          disabled={busy || !prompt.trim()}
          className="text-xs font-semibold text-white bg-brand-navy hover:bg-brand-navy-tint disabled:opacity-50 rounded px-2.5 py-1 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-brand-navy-tint/40"
        >
          {busy ? 'Writing…' : 'Write'}
        </button>
      </div>
      {meta && <AiMetaBadge meta={meta} />}
    </div>
  );
}

// ── Block wrapper ───────────────────────────────────────────────────────────────

function Block({ block, index, total, focused, onFocus, onChange, onMove, onDelete, onReplace, onAddAfter, allBlocks, aiAssist, workspaceId, blockRef }) {
  const wrapRef = useRef(null);

  // Merge the internal wrapRef (used for keyboard nav) with the external blockRef callback
  // (used by BlockEditor for auto-scroll). Both need to point at the same DOM node.
  const setRefs = useCallback((el) => {
    wrapRef.current = el;
    if (typeof blockRef === 'function') blockRef(el);
  }, [blockRef]);

  const handleKeyDown = (e) => {
    // Arrow keys navigate between blocks when focus is on the wrapper (not inside an input)
    if (document.activeElement === wrapRef.current) {
      if (e.key === 'ArrowUp') { e.preventDefault(); onMove(index, -1); }
      if (e.key === 'ArrowDown') { e.preventDefault(); onMove(index, 1); }
    }
  };

  return (
    <div
      ref={setRefs}
      role="option"
      aria-selected={focused}
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
        <span className="text-xs uppercase tracking-wide font-semibold text-neutral-600 dark:text-neutral-400 select-none">
          {blockLabel(block.type)}
        </span>
        {/* Block controls — visible on focus/hover */}
        <div className="ml-auto flex items-center gap-0.5 opacity-0 group-hover:opacity-100 group-focus-within:opacity-100 transition-opacity">
          {aiAssist && AI_TEXT_TYPES.has(block.type) && (
            <AiBlockMenu block={block} onChange={onChange} aiAssist={aiAssist} />
          )}
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
      {block.type === 'paragraph' && <ParagraphBlock block={block} onChange={onChange} onReplace={onReplace} onAddAfter={onAddAfter} focused={focused} />}
      {block.type === 'heading1' && <HeadingBlock block={block} onChange={onChange} level={1} />}
      {block.type === 'heading2' && <HeadingBlock block={block} onChange={onChange} level={2} />}
      {block.type === 'heading3' && <HeadingBlock block={block} onChange={onChange} level={3} />}
      {block.type === 'quote' && <QuoteBlock block={block} onChange={onChange} />}
      {block.type === 'callout' && <CalloutBlock block={block} onChange={onChange} />}
      {block.type === 'checklist' && <ChecklistBlock block={block} onChange={onChange} />}
      {block.type === 'toggle' && <ToggleBlock block={block} onChange={onChange} />}
      {block.type === 'toc' && <TocBlock allBlocks={allBlocks} />}
      {block.type === 'code' && <CodeBlock block={block} onChange={onChange} />}
      {block.type === 'divider' && (
        <hr className="border-neutral-300 dark:border-neutral-600 my-1" aria-label="Divider" />
      )}
      {block.type === 'sheet' && <SheetBlock block={block} onChange={onChange} />}
      {block.type === 'chart' && <ChartBlock block={block} onChange={onChange} />}
      {block.type === 'bqlwidget' && <BqlWidget block={block} onChange={onChange} workspaceId={workspaceId} />}
      {block.type === 'table' && <TableBlock block={block} onChange={onChange} />}
      {block.type === 'sticker' && <StickerBlock block={block} onChange={onChange} />}
      {block.type === 'image' && <ImageBlock block={block} onChange={onChange} />}
      {block.type === 'mermaid' && <MermaidBlock block={block} onChange={onChange} />}
      {block.type === 'whiteboard' && <WhiteboardBlock block={block} onChange={onChange} />}
      {block.type === 'workitem' && <WorkItemBlock block={block} onChange={onChange} />}
      {block.type === 'bookmark' && <BookmarkBlock block={block} onChange={onChange} />}
      {block.type === 'file' && <FileBlock block={block} onChange={onChange} />}
    </div>
  );
}

// ── Add-block button with grouped type picker ───────────────────────────────────

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
          className="absolute left-0 mt-1 z-dropdown w-72 bg-white dark:bg-neutral-900 border border-neutral-200 dark:border-neutral-700 rounded-lg shadow-lg py-1 overflow-auto max-h-80"
        >
          {BLOCK_GROUPS.map((group) => (
            <div key={group}>
              <p className="px-3 pt-2 pb-1 text-2xs uppercase tracking-wide font-semibold text-neutral-600 dark:text-neutral-400 select-none">{group}</p>
              {BLOCK_TYPES.filter((t) => t.group === group).map(({ type, label, Icon }) => (
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
 * @param {Function} [props.aiAssist]   Optional async ({mode,text,instruction}) → {text, meta}; when
 *                                       given, AI write/improve/expand/summarize/shorten affordances
 *                                       appear (routed through the AI Control Plane server-side).
 * @param {string} [props.workspaceId]  Enables live BQL widget blocks (server-side pivot resolver).
 */
export function BlockEditor({ blocks: initialBlocks = [], onChange, aiAssist, workspaceId, editingArticle }) {
  const [blocks, setBlocks] = useState(() =>
    initialBlocks.length > 0 ? initialBlocks : [newBlock('paragraph')]
  );
  const [focusedIndex, setFocusedIndex] = useState(0);
  const [saveStatus, setSaveStatus] = useState(null); // 'Undone' | 'Redone' | null (KR-003)
  const [selTool, setSelTool] = useState(null);        // { blockIndex, start, end, rect } | null (KR-002)

  // KR-006: Find & Replace state
  const [findBarOpen, setFindBarOpen] = useState(false);
  const [findQuery, setFindQuery] = useState('');
  const [replaceQuery, setReplaceQuery] = useState('');
  const [replaceRowOpen, setReplaceRowOpen] = useState(false);
  const [matches, setMatches] = useState([]);
  const [activeMatchIndex, setActiveMatchIndex] = useState(0);

  // Per-block DOM node map for auto-scroll; populated via the blockRef callback prop on Block.
  const blockElsRef = useRef({});
  // Track previous block count so we only scroll on insertions, not on user focus clicks.
  const prevBlockCountRef = useRef(initialBlocks.length > 0 ? initialBlocks.length : 1);
  // Undo / redo stacks (KR-003). useRef avoids re-renders on stack mutations.
  const undoStack = useRef([]);
  const redoStack = useRef([]);
  const UNDO_MAX = 100;

  // Clear undo state when the editor is re-used for a different article (first block id change).
  const firstBlockIdRef = useRef(initialBlocks[0]?.id);
  useEffect(() => {
    const incoming = initialBlocks[0]?.id;
    if (incoming !== firstBlockIdRef.current) {
      undoStack.current = [];
      redoStack.current = [];
      firstBlockIdRef.current = incoming;
    }
  }, [initialBlocks]);

  // commitBlocks: the write path. Every user mutation calls this so the undo history is captured.
  // Direct setBlocks (e.g. handleUndo) bypasses it intentionally.
  const commitBlocks = useCallback(
    (next) => {
      setBlocks((prev) => {
        undoStack.current = [...undoStack.current.slice(-UNDO_MAX + 1), prev];
        redoStack.current = [];
        return next;
      });
      onChange?.(next);
    },
    [onChange],
  );

  const emit = commitBlocks;

  const flashStatus = (msg) => {
    setSaveStatus(msg);
    setTimeout(() => setSaveStatus(null), 800);
  };

  const handleUndo = useCallback(() => {
    if (undoStack.current.length === 0) return;
    const prev = undoStack.current[undoStack.current.length - 1];
    undoStack.current = undoStack.current.slice(0, -1);
    setBlocks((cur) => {
      redoStack.current = [...redoStack.current, cur];
      return prev;
    });
    onChange?.(prev);
    flashStatus('Undone');
  }, [onChange]);

  const handleRedo = useCallback(() => {
    if (redoStack.current.length === 0) return;
    const next = redoStack.current[redoStack.current.length - 1];
    redoStack.current = redoStack.current.slice(0, -1);
    setBlocks((cur) => {
      undoStack.current = [...undoStack.current, cur];
      return next;
    });
    onChange?.(next);
    flashStatus('Redone');
  }, [onChange]);

  // ── Selection toolbar (KR-002) ─────────────────────────────────────────────────

  // Show the floating toolbar when the user finishes a mouseup with an active text selection
  // inside a text-bearing block. Uses the active element's selectionStart/End (textarea API)
  // since window.getSelection() returns an empty range for textarea selections in most browsers.
  const handleEditorMouseUp = useCallback(() => {
    const el = document.activeElement;
    if (!(el instanceof HTMLTextAreaElement) && !(el instanceof HTMLInputElement && el.type === 'text')) {
      setSelTool(null);
      return;
    }
    const start = el.selectionStart ?? 0;
    const end = el.selectionEnd ?? 0;
    if (start === end) { setSelTool(null); return; }

    // Identify which block this textarea/input belongs to.
    let blockIndex = -1;
    for (const [idx, wrapper] of Object.entries(blockElsRef.current)) {
      if (wrapper?.contains(el)) { blockIndex = parseInt(idx, 10); break; }
    }
    if (blockIndex === -1) { setSelTool(null); return; }

    // Position relative to the textarea element (viewport-fixed). A textarea's selection range
    // isn't exposed as a DOM Range, so we use the textarea's bounding box instead.
    setSelTool({ blockIndex, start, end, rect: el.getBoundingClientRect() });
  }, []);

  // Apply a format wrap from the toolbar to the stored selection, then dismiss.
  const handleWrapToolbar = useCallback((startSyntax, endSyntax) => {
    if (!selTool) return;
    const { blockIndex, start, end } = selTool;
    const content = blocks[blockIndex]?.content || '';
    const next = `${content.slice(0, start)}${startSyntax}${content.slice(start, end)}${endSyntax}${content.slice(end)}`;
    emit(blocks.map((b, i) => (i === blockIndex ? { ...b, content: next } : b)));
    setSelTool(null);
  }, [selTool, blocks, emit]);

  // Scroll the focused block into view whenever a new block is inserted (count grows).
  useEffect(() => {
    if (blocks.length > prevBlockCountRef.current) {
      blockElsRef.current[focusedIndex]?.scrollIntoView?.({ behavior: 'smooth', block: 'nearest' });
    }
    prevBlockCountRef.current = blocks.length;
  }, [blocks.length, focusedIndex]);

  // KR-006: recompute matches whenever findQuery or blocks change
  useEffect(() => {
    const m = computeMatches(findQuery, blocks);
    setMatches(m);
    setActiveMatchIndex(0);
  }, [findQuery, blocks]);

  // KR-006: navigate to prev/next match
  const goNext = useCallback(() => {
    if (matches.length === 0) return;
    const next = (activeMatchIndex + 1) % matches.length;
    setActiveMatchIndex(next);
    blockElsRef.current[matches[next].blockIndex]?.scrollIntoView?.({ behavior: 'smooth', block: 'nearest' });
  }, [matches, activeMatchIndex]);

  const goPrev = useCallback(() => {
    if (matches.length === 0) return;
    const prev = (activeMatchIndex - 1 + matches.length) % matches.length;
    setActiveMatchIndex(prev);
    blockElsRef.current[matches[prev].blockIndex]?.scrollIntoView?.({ behavior: 'smooth', block: 'nearest' });
  }, [matches, activeMatchIndex]);

  // KR-006: replace current match
  const replaceCurrent = useCallback(() => {
    if (matches.length === 0) return;
    const m = matches[activeMatchIndex];
    const block = blocks[m.blockIndex];
    if (!block) return;
    const content = block.content || '';
    const next = content.slice(0, m.start) + replaceQuery + content.slice(m.end);
    emit(blocks.map((b, i) => (i === m.blockIndex ? { ...b, content: next } : b)));
  }, [matches, activeMatchIndex, replaceQuery, blocks, emit]);

  // KR-006: replace all matches (in reverse order so indices stay valid)
  const replaceAll = useCallback(() => {
    if (matches.length === 0) return;
    let updated = [...blocks];
    // Group by blockIndex and replace from last to first within each block
    const byBlock = {};
    matches.forEach((m) => {
      if (!byBlock[m.blockIndex]) byBlock[m.blockIndex] = [];
      byBlock[m.blockIndex].push(m);
    });
    Object.entries(byBlock).forEach(([bi, hits]) => {
      const idx = parseInt(bi, 10);
      let content = updated[idx].content || '';
      // Replace from end to start to preserve indices
      [...hits].reverse().forEach((h) => {
        content = content.slice(0, h.start) + replaceQuery + content.slice(h.end);
      });
      updated = updated.map((b, i) => (i === idx ? { ...b, content } : b));
    });
    emit(updated);
  }, [matches, replaceQuery, blocks, emit]);

  const addBlock = (type) => {
    const next = [...blocks, newBlock(type)];
    emit(next);
    setFocusedIndex(next.length - 1);
  };

  // Insert a new paragraph immediately after a given block index (Enter-to-create).
  const insertBlockAfter = (index) => {
    const next = [...blocks];
    next.splice(index + 1, 0, newBlock('paragraph'));
    emit(next);
    setFocusedIndex(index + 1);
  };

  // Toolbar insert: add a block of the chosen type after the focused block (or at the end).
  const addBlockAtCursor = (type) => {
    const insertAt = focusedIndex ?? blocks.length - 1;
    const next = [...blocks];
    next.splice(insertAt + 1, 0, newBlock(type));
    emit(next);
    setFocusedIndex(insertAt + 1);
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

  const insertParagraph = (text) => {
    const para = { ...newBlock('paragraph'), content: text };
    const next = [...blocks, para];
    emit(next);
    setFocusedIndex(next.length - 1);
  };

  // Slash-command: swap a paragraph in place for the chosen block type (drops the "/query" text).
  const replaceBlock = (index, type) => {
    emit(blocks.map((b, i) => (i === index ? newBlock(type) : b)));
    setFocusedIndex(index);
  };

  const stats = docStats(blocks);

  // KR-013: readability metrics
  const allText = useMemo(() => blocks.filter(b => b.content).map(b => b.content).join(' '), [blocks]);
  const grade = useMemo(() => fleschKincaid(allText), [allText]);
  const charCount = allText.replace(/\s/g, '').length;

  // KR-006 + KR-003: unified keyboard handler — find/replace, undo/redo, toolbar dismiss
  const handleEditorKeyDown = useCallback((e) => {
    const ctrl = e.ctrlKey || e.metaKey;
    if (ctrl && e.key === 'f') { e.preventDefault(); setFindBarOpen(true); setReplaceRowOpen(false); return; }
    if (ctrl && e.key === 'h') { e.preventDefault(); setFindBarOpen(true); setReplaceRowOpen(true); return; }
    if (e.key === 'Escape') {
      if (findBarOpen) { setFindBarOpen(false); return; }
      setSelTool(null);
      return;
    }
    if (!ctrl) return;
    if (!e.shiftKey && e.key === 'z') { e.preventDefault(); handleUndo(); }
    else if (!e.shiftKey && e.key === 'y') { e.preventDefault(); handleRedo(); }
    else if (e.shiftKey && e.key === 'Z') { e.preventDefault(); handleRedo(); }
  }, [handleUndo, handleRedo, findBarOpen]);

  return (
    <div className="space-y-2">
      <BlockToolbar onInsert={addBlockAtCursor} />
      {/* KR-006: Find & Replace bar */}
      {findBarOpen && editingArticle && (
        <div role="search" aria-label="Find and replace" className="flex flex-col gap-1 p-2 bg-neutral-50 dark:bg-neutral-900 border-b border-neutral-200 dark:border-neutral-700">
          <div className="flex items-center gap-1">
            <input
              aria-label="Find"
              value={findQuery}
              onChange={e => setFindQuery(e.target.value)}
              placeholder="Find…"
              className="flex-1 text-sm border border-neutral-200 dark:border-neutral-700 rounded px-2 py-1 bg-white dark:bg-neutral-800 text-neutral-900 dark:text-neutral-100 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-brand-navy-tint/40"
            />
            <span className="text-xs text-neutral-500 min-w-12 text-right">{matches.length > 0 ? `${activeMatchIndex + 1}/${matches.length}` : '0 matches'}</span>
            <button type="button" aria-label="Previous match" onClick={goPrev} className="p-1 rounded hover:bg-neutral-200 dark:hover:bg-neutral-700"><ChevronUp className="h-3.5 w-3.5" /></button>
            <button type="button" aria-label="Next match" onClick={goNext} className="p-1 rounded hover:bg-neutral-200 dark:hover:bg-neutral-700"><ChevronDown className="h-3.5 w-3.5" /></button>
            <button type="button" aria-label="Close find bar" onClick={() => setFindBarOpen(false)} className="p-1 rounded hover:bg-neutral-200 dark:hover:bg-neutral-700"><X className="h-3.5 w-3.5" /></button>
          </div>
          {replaceRowOpen && (
            <div className="flex items-center gap-1">
              <input
                aria-label="Replace with"
                value={replaceQuery}
                onChange={e => setReplaceQuery(e.target.value)}
                placeholder="Replace with…"
                className="flex-1 text-sm border border-neutral-200 dark:border-neutral-700 rounded px-2 py-1 bg-white dark:bg-neutral-800 text-neutral-900 dark:text-neutral-100 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-brand-navy-tint/40"
              />
              <button type="button" onClick={replaceCurrent} className="text-xs px-2 py-1 rounded bg-brand-navy text-white hover:bg-brand-navy-tint">Replace</button>
              <button type="button" onClick={replaceAll} className="text-xs px-2 py-1 rounded bg-brand-navy text-white hover:bg-brand-navy-tint">Replace All</button>
            </div>
          )}
        </div>
      )}
      <div id="block-editor-root" role="listbox" aria-label="Block editor" aria-multiselectable="false" tabIndex={0} className="space-y-2" onKeyDown={handleEditorKeyDown} onMouseUp={handleEditorMouseUp}>
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
            onReplace={(type) => replaceBlock(index, type)}
            onAddAfter={() => insertBlockAfter(index)}
            allBlocks={blocks}
            aiAssist={aiAssist}
            workspaceId={workspaceId}
            blockRef={(el) => { blockElsRef.current[index] = el; }}
          />
        ))}
      </div>
      {aiAssist && <AiComposeBar aiAssist={aiAssist} onInsert={insertParagraph} />}
      <AddBlockButton onAdd={addBlock} />
      <SelectionToolbar rect={selTool?.rect ?? null} onWrap={handleWrapToolbar} onDismiss={() => setSelTool(null)} />
      {/* MS Word-style live status bar — word count + reading time + readability, always current (KR-013). */}
      <div className="flex items-center justify-end gap-3 text-2xs text-neutral-600 dark:text-neutral-400 pt-1" aria-live="polite">
        {saveStatus && <span className="text-brand-navy dark:text-brand-orange font-medium">{saveStatus}</span>}
        <span>{stats.words} {stats.words === 1 ? 'word' : 'words'}</span>
        <span aria-hidden="true">·</span>
        <span>{charCount} chars</span>
        <span aria-hidden="true">·</span>
        <span>{stats.readingMinutes} min</span>
        <span aria-hidden="true">·</span>
        <span>{gradeLabel(grade)}</span>
      </div>
    </div>
  );
}
