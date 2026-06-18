// Read-only renderer for Know Studio block articles. Until now an article saved in block format
// (content_format = 'blocks') rendered nothing in view mode — only markdown did. This renders every
// block type for reading and for the customer portal: rich text, callouts, checklists, toggles, an
// auto table-of-contents, live spreadsheets, charts, whiteboards, work-item references and
// bookmarks. Pure presentation — no editing, no data fetching. Design tokens only (RB-30 §1).

import { Link2, Bookmark, ExternalLink, GripVertical, Paperclip } from 'lucide-react';
import { cn, renderMd } from '@/lib/utils';
import { evaluateSheet, indexToCol } from '@/lib/sheet-engine';
import { blocksOutline } from '@/lib/doc-stats';
import { CALLOUT_VARIANTS, STICKY_COLORS, CANVAS_H, NOTE_W, NOTE_H, fileKind, padRows } from '@/lib/block-kit';
import { ChartPreview } from '@/components/blocks/chart-preview';
import { BqlWidget } from '@/components/blocks/bql-widget';
import { CodeBlockRenderer } from '@/components/blocks/CodeBlockRenderer';

const STICKER_SIZE = { md: 'text-4xl', lg: 'text-6xl', xl: 'text-8xl' };
const FILE_KIND_LABEL = { image: 'Image', pdf: 'PDF', doc: 'Document', sheet: 'Spreadsheet', slide: 'Slides', archive: 'Archive', video: 'Video', audio: 'Audio', code: 'Code', link: 'File' };

// KR-026: merge overlapping/adjacent character ranges and sort them.
function mergeRanges(ranges) {
  if (!ranges.length) return [];
  const sorted = [...ranges].sort((a, b) => a.start - b.start);
  const merged = [{ ...sorted[0] }];
  for (let i = 1; i < sorted.length; i++) {
    const last = merged[merged.length - 1];
    if (sorted[i].start <= last.end) {
      last.end = Math.max(last.end, sorted[i].end);
    } else {
      merged.push({ ...sorted[i] });
    }
  }
  return merged;
}

// KR-026: split `content` at highlight ranges, render each segment via renderMd(),
// and wrap highlighted segments in <mark>. Returns an HTML string safe for dangerouslySetInnerHTML.
function highlightContent(content, ranges) {
  if (!ranges || ranges.length === 0) return renderMd(content || '');
  const merged = mergeRanges(ranges.map(r => ({ start: r.selectionStart, end: r.selectionEnd })));
  const parts = [];
  let pos = 0;
  for (const range of merged) {
    const s = Math.max(0, range.start);
    const e = Math.min(content.length, range.end);
    if (s > pos) parts.push({ text: content.slice(pos, s), highlight: false });
    if (s < e)   parts.push({ text: content.slice(s, e), highlight: true });
    pos = e;
  }
  if (pos < content.length) parts.push({ text: content.slice(pos), highlight: false });
  return parts.map(p =>
    p.highlight
      ? `<mark class="bg-yellow-200/60 dark:bg-yellow-500/25 rounded-sm">${renderMd(p.text)}</mark>`
      : renderMd(p.text)
  ).join('');
}

function CalloutView({ block }) {
  const v = CALLOUT_VARIANTS[block.metadata?.variant] || CALLOUT_VARIANTS.info;
  const Icon = v.Icon;
  return (
    <div className={cn('rounded-md border-l-2 p-3 flex gap-3', v.box)}>
      <Icon aria-hidden="true" className={cn('h-5 w-5 shrink-0 mt-0.5', v.accent)} />
      <p className="text-sm text-neutral-900 dark:text-neutral-100" dangerouslySetInnerHTML={{ __html: renderMd(block.content || '') }} />
    </div>
  );
}

function ChecklistView({ block }) {
  const items = block.metadata?.items || [];
  return (
    <ul className="space-y-1">
      {items.map((it, i) => (
        <li key={i} className="flex items-center gap-2 text-sm">
          <input type="checkbox" checked={!!it.done} readOnly aria-label={it.text || `item ${i + 1}`}
            className="h-4 w-4 rounded border-neutral-300 text-brand-navy" />
          <span className={cn('text-neutral-900 dark:text-neutral-100', it.done && 'line-through text-neutral-400')}>{it.text}</span>
        </li>
      ))}
    </ul>
  );
}

function TocView({ allBlocks }) {
  const outline = blocksOutline(allBlocks);
  if (outline.length === 0) return null;
  return (
    <nav aria-label="Table of contents" className="rounded-md border border-neutral-100 dark:border-neutral-800 bg-neutral-50 dark:bg-neutral-900/50 p-3">
      <p className="text-2xs uppercase tracking-wide font-semibold text-neutral-600 dark:text-neutral-400 mb-1.5">Contents</p>
      <ul className="space-y-0.5">
        {outline.map((h) => (
          <li key={h.id} className={cn(h.level === 2 && 'pl-3', h.level === 3 && 'pl-6')}>
            <a href={`#${h.id}`} className="text-sm text-brand-navy hover:underline focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-brand-navy-tint/40 rounded">{h.text}</a>
          </li>
        ))}
      </ul>
    </nav>
  );
}

function SheetView({ block }) {
  const cols = block.metadata?.cols || (block.metadata?.rows?.[0] ? block.metadata.rows[0].length : 0);
  const computed = evaluateSheet(padRows(block.metadata?.rows || [], cols));
  return (
    <div className="overflow-x-auto">
      <table className="border-collapse text-sm" aria-label="Spreadsheet">
        <thead>
          <tr>
            <th className="w-8 bg-neutral-100 dark:bg-neutral-800 border border-neutral-200 dark:border-neutral-700" aria-label="row numbers" />
            {Array.from({ length: cols }).map((_, ci) => (
              <th key={ci} className="min-w-20 bg-neutral-100 dark:bg-neutral-800 border border-neutral-200 dark:border-neutral-700 px-2 py-1 text-xs font-semibold text-neutral-500">{indexToCol(ci)}</th>
            ))}
          </tr>
        </thead>
        <tbody>
          {computed.map((row, ri) => (
            <tr key={ri}>
              <td className="w-8 text-center bg-neutral-100 dark:bg-neutral-800 border border-neutral-200 dark:border-neutral-700 text-xs font-semibold text-neutral-500">{ri + 1}</td>
              {row.map((cell, ci) => {
                const isErr = cell === '#ERR' || cell === '#CIRC';
                return (
                  <td key={ci} className={cn('border border-neutral-200 dark:border-neutral-700 px-2 py-1.5 tabular-nums', isErr ? 'text-semantic-danger' : 'text-neutral-900 dark:text-neutral-100')}>{cell}</td>
                );
              })}
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}

function TableView({ block }) {
  const rows = block.metadata?.rows || [];
  return (
    <div className="overflow-x-auto">
      <table className="w-full border-collapse text-sm">
        <tbody>
          {rows.map((row, ri) => (
            <tr key={ri}>
              {row.map((cell, ci) => (
                <td key={ci} className={cn('border border-neutral-200 dark:border-neutral-700 px-2 py-1.5 text-neutral-900 dark:text-neutral-100', ri === 0 && 'font-semibold bg-neutral-50 dark:bg-neutral-800')}>{cell}</td>
              ))}
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}

function DatabaseView({ block }) {
  const meta = block.metadata || {};
  const badges = [
    `View: ${meta.view || 'table'}`,
    ...(meta.filters || []).map((x) => `Filter: ${x}`),
    ...(meta.sorts || []).map((x) => `Sort: ${x}`),
    ...(meta.groups || []).map((x) => `Group: ${x}`),
    ...(meta.relations || []).map((x) => `Relation: ${x}`),
  ];
  return (
    <div className="space-y-2">
      <div className="flex flex-wrap gap-1">{badges.map((b) => <span key={b} className="text-2xs rounded bg-neutral-100 dark:bg-neutral-800 px-1.5 py-0.5 text-neutral-600 dark:text-neutral-400">{b}</span>)}</div>
      <TableView block={block} />
    </div>
  );
}

function PivotView({ block }) {
  const rows = block.metadata?.rows || [];
  const total = rows.slice(1).reduce((sum, row) => sum + (Number(row[1]) || 0), 0);
  return (
    <div className="space-y-2">
      <p className="text-xs font-semibold text-neutral-600 dark:text-neutral-400">Pivot total: <span className="text-neutral-900 dark:text-neutral-100">{total}</span></p>
      <TableView block={block} />
    </div>
  );
}

function WhiteboardView({ block }) {
  const notes = block.metadata?.notes || [];
  const shapes = block.metadata?.shapes || [];
  const connectors = block.metadata?.connectors || [];
  return (
    <div className="relative rounded-md border border-neutral-200 dark:border-neutral-700 bg-neutral-50 dark:bg-neutral-900/50 overflow-hidden" style={{ height: CANVAS_H }} role="img" aria-label={`Whiteboard with ${notes.length} note${notes.length === 1 ? '' : 's'}`}>
      {notes.map((note) => (
        <div key={note.id}
          className={cn('absolute rounded-md border border-neutral-300/60 dark:border-neutral-600 shadow-sm p-1.5', STICKY_COLORS[(note.color || 0) % STICKY_COLORS.length])}
          style={{ left: note.x, top: note.y, width: NOTE_W, height: NOTE_H }}>
          <GripVertical aria-hidden="true" className="h-3 w-3 text-neutral-400" />
          <div className="flex items-start gap-1">
            {note.emoji && <span className="text-base leading-none" aria-hidden="true">{note.emoji}</span>}
            <p className="text-xs text-neutral-900 dark:text-neutral-100 whitespace-pre-wrap">{note.text}</p>
          </div>
        </div>
      ))}
      <svg className="absolute inset-0 pointer-events-none" aria-hidden="true">
        {connectors.map((c) => {
          const all = [...notes, ...shapes];
          const from = all.find((x) => x.id === c.from);
          const to = all.find((x) => x.id === c.to);
          if (!from || !to) return null;
          return <line key={c.id} x1={(from.x || 0) + 40} y1={(from.y || 0) + 30} x2={(to.x || 0) + 40} y2={(to.y || 0) + 30} stroke="currentColor" className="text-neutral-400" strokeWidth="2" />;
        })}
      </svg>
      {shapes.map((shape) => (
        <div key={shape.id} className="absolute rounded-md border-2 border-brand-navy/50 bg-white/80 dark:bg-neutral-800/80 px-3 py-2 text-xs text-neutral-800 dark:text-neutral-100" style={{ left: shape.x, top: shape.y }}>
          {shape.text || shape.shape}
        </div>
      ))}
    </div>
  );
}

function MindMapView({ block }) {
  const nodes = block.metadata?.nodes || [];
  if (!nodes.length) return null;
  return (
    <div className="rounded-md border border-neutral-200 dark:border-neutral-700 p-3">
      <p className="text-sm font-semibold text-neutral-900 dark:text-neutral-100">{nodes[0]}</p>
      <div className="mt-2 ml-5 space-y-1 border-l border-neutral-200 dark:border-neutral-700 pl-3">
        {nodes.slice(1).map((n, i) => <p key={i} className="text-sm text-neutral-700 dark:text-neutral-300">{n}</p>)}
      </div>
    </div>
  );
}

function FlowchartView({ block }) {
  const steps = String(block.content || '').split('->').map((s) => s.trim()).filter(Boolean);
  return (
    <div className="flex flex-wrap items-center gap-2">
      {steps.map((step, i) => (
        <div key={`${step}-${i}`} className="flex items-center gap-2">
          <span className="rounded-md border border-neutral-200 dark:border-neutral-700 px-3 py-1.5 text-sm text-neutral-800 dark:text-neutral-100">{step}</span>
          {i < steps.length - 1 && <span className="text-neutral-400" aria-hidden="true">-&gt;</span>}
        </div>
      ))}
    </div>
  );
}

function MathView({ block }) {
  return <div className="rounded-md border border-neutral-200 dark:border-neutral-700 bg-neutral-50 dark:bg-neutral-900 px-3 py-2 font-mono text-sm text-neutral-900 dark:text-neutral-100">{block.content}</div>;
}

function EmbedView({ block }) {
  return (
    <a href={block.content || '#'} target="_blank" rel="noopener noreferrer" className="block rounded-md border border-neutral-200 dark:border-neutral-700 p-3 hover:border-brand-navy-tint">
      <p className="text-sm font-semibold text-neutral-900 dark:text-neutral-100">{block.metadata?.title || block.content || 'Embed'}</p>
      {block.metadata?.description && <p className="mt-1 text-xs text-neutral-600 dark:text-neutral-400">{block.metadata.description}</p>}
    </a>
  );
}

function WorkItemView({ block }) {
  return (
    <div className="rounded-md border border-neutral-200 dark:border-neutral-700 p-3 flex items-center gap-3">
      <Link2 aria-hidden="true" className="h-4 w-4 text-brand-navy shrink-0" />
      <span className="font-mono text-sm font-semibold text-brand-navy dark:text-brand-amber">{block.content || 'WRK-?'}</span>
      {block.metadata?.title && <span className="text-sm text-neutral-700 dark:text-neutral-300 truncate">{block.metadata.title}</span>}
      {block.metadata?.status && <span className="ml-auto text-xs px-2 py-0.5 rounded-full bg-neutral-100 dark:bg-neutral-800 text-neutral-600 dark:text-neutral-400">{block.metadata.status}</span>}
    </div>
  );
}

function BookmarkView({ block }) {
  const href = block.content || '#';
  return (
    <a href={href} target="_blank" rel="noopener noreferrer"
      className="block rounded-md border border-neutral-200 dark:border-neutral-700 p-3 hover:border-brand-navy-tint focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-brand-navy-tint/40 transition-colors">
      <div className="flex items-center gap-2">
        <Bookmark aria-hidden="true" className="h-4 w-4 text-brand-navy shrink-0" />
        <span className="text-sm font-medium text-neutral-900 dark:text-neutral-100 truncate">{block.metadata?.title || block.content}</span>
        <ExternalLink aria-hidden="true" className="h-3.5 w-3.5 text-neutral-400 ml-auto shrink-0" />
      </div>
      {block.metadata?.description && <p className="text-xs text-neutral-600 dark:text-neutral-400 mt-1">{block.metadata.description}</p>}
    </a>
  );
}

function FileView({ block }) {
  const kind = fileKind(block.metadata?.fileName || block.content);
  const name = block.metadata?.fileName || block.content || 'File';
  if (kind === 'image' && block.content) {
    return (
      <figure className="space-y-1">
        <img src={block.content} alt={name} className="max-w-full rounded-md border border-neutral-200 dark:border-neutral-700 object-contain" />
        <figcaption className="text-xs text-neutral-500">{name}</figcaption>
      </figure>
    );
  }
  return (
    <a href={block.content || '#'} target="_blank" rel="noopener noreferrer"
      className="flex items-center gap-3 rounded-md border border-neutral-200 dark:border-neutral-700 p-3 hover:border-brand-navy-tint focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-brand-navy-tint/40 transition-colors">
      <Paperclip aria-hidden="true" className="h-5 w-5 text-brand-navy shrink-0" />
      <span className="min-w-0 flex-1 truncate text-sm font-medium text-neutral-900 dark:text-neutral-100">{name}</span>
      <span className="text-2xs px-1.5 py-0.5 rounded bg-neutral-100 dark:bg-neutral-800 text-neutral-500 shrink-0">{FILE_KIND_LABEL[kind]}</span>
      <ExternalLink aria-hidden="true" className="h-3.5 w-3.5 text-neutral-400 shrink-0" />
    </a>
  );
}

// KR-026: extract unresolved inline comment ranges for a block.
function inlineRanges(blockComments, blockId) {
  if (!blockComments) return [];
  return blockComments
    .filter(c => c.blockId === blockId && !c.resolved && c.metadata)
    .map(c => {
      try {
        const m = typeof c.metadata === 'string' ? JSON.parse(c.metadata) : c.metadata;
        if (m && typeof m.selectionStart === 'number' && typeof m.selectionEnd === 'number') {
          return { selectionStart: m.selectionStart, selectionEnd: m.selectionEnd };
        }
      } catch { /* skip */ }
      return null;
    })
    .filter(Boolean);
}

function OneBlock({ block, allBlocks, workspaceId, blockComments }) {
  const ranges = inlineRanges(blockComments, block.id);
  switch (block.type) {
    case 'paragraph':
      return <div className="text-sm text-neutral-800 dark:text-neutral-200 leading-relaxed" dangerouslySetInnerHTML={{ __html: highlightContent(block.content || '', ranges) }} />;
    case 'heading1':
      return <h2 id={block.id} className="mt-8 text-2xl font-bold text-neutral-900 dark:text-neutral-100 scroll-mt-4" dangerouslySetInnerHTML={{ __html: highlightContent(block.content || '', ranges) }} />;
    case 'heading2':
      return <h3 id={block.id} className="mt-6 text-xl font-semibold text-neutral-900 dark:text-neutral-100 scroll-mt-4" dangerouslySetInnerHTML={{ __html: highlightContent(block.content || '', ranges) }} />;
    case 'heading3':
      return <h4 id={block.id} className="mt-5 text-base font-semibold text-neutral-900 dark:text-neutral-100 scroll-mt-4" dangerouslySetInnerHTML={{ __html: highlightContent(block.content || '', ranges) }} />;
    case 'quote':
      return <blockquote className="my-2 border-l-2 border-brand-navy-tint pl-4 text-sm italic text-neutral-600 dark:text-neutral-300" dangerouslySetInnerHTML={{ __html: highlightContent(block.content || '', ranges) }} />;
    case 'callout':
      return <CalloutView block={block} />;
    case 'checklist':
      return <ChecklistView block={block} />;
    case 'toggle':
      return (
        <details open={block.metadata?.open !== false} className="rounded-md border border-neutral-200 dark:border-neutral-700 px-3 py-2">
          <summary className="text-sm font-medium text-neutral-900 dark:text-neutral-100 cursor-pointer focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-brand-navy-tint/40 rounded">{block.content || 'Details'}</summary>
          <p className="text-sm text-neutral-700 dark:text-neutral-300 mt-2 whitespace-pre-wrap">{block.metadata?.body}</p>
        </details>
      );
    case 'toc':
      return <TocView allBlocks={allBlocks} />;
    case 'code': {
      const lang = block.metadata?.language || 'plaintext';
      return (
        <div className="space-y-1">
          {lang !== 'plaintext' && (
            <span className="text-2xs px-1.5 py-0.5 rounded bg-neutral-100 dark:bg-neutral-800 text-neutral-500 font-mono">{lang}</span>
          )}
          <CodeBlockRenderer content={block.content} language={lang} />
        </div>
      );
    }
    case 'divider':
      return <hr className="border-neutral-300 dark:border-neutral-600" aria-label="Divider" />;
    case 'sheet':
      return <SheetView block={block} />;
    case 'chart':
      return <ChartPreview chartType={block.metadata?.chartType} rows={block.metadata?.rows} />;
    case 'database':
      return <DatabaseView block={block} />;
    case 'pivot':
      return <PivotView block={block} />;
    case 'bqlwidget':
      return <BqlWidget block={block} workspaceId={workspaceId} readOnly />;
    case 'sticker':
      return <span className={cn('leading-none select-none', STICKER_SIZE[block.metadata?.size] || STICKER_SIZE.lg)} role="img" aria-label="Sticker">{block.content || '✨'}</span>;
    case 'table':
      return <TableView block={block} />;
    case 'image':
      return block.content
        ? <img src={block.content} alt={block.metadata?.alt || 'Article image'} className="max-w-full rounded-md border border-neutral-200 dark:border-neutral-700 object-contain" />
        : null;
    case 'mermaid':
      return <pre className="rounded-md border border-neutral-200 dark:border-neutral-700 bg-neutral-50 dark:bg-neutral-900 p-3 text-xs font-mono text-neutral-700 dark:text-neutral-300 overflow-x-auto whitespace-pre-wrap">{block.content}</pre>;
    case 'whiteboard':
      return <WhiteboardView block={block} />;
    case 'mindmap':
      return <MindMapView block={block} />;
    case 'flowchart':
      return <FlowchartView block={block} />;
    case 'math':
      return <MathView block={block} />;
    case 'embed':
      return <EmbedView block={block} />;
    case 'workitem':
      return <WorkItemView block={block} />;
    case 'bookmark':
      return <BookmarkView block={block} />;
    case 'file':
      return <FileView block={block} />;
    default:
      return null;
  }
}

/**
 * @param {Object} props
 * @param {Array|string} props.blocks       Blocks array, or the raw content_blocks JSON string.
 * @param {string} [props.workspaceId]      Enables live BQL widget blocks in read mode.
 * @param {Array}  [props.blockComments]    KR-026: unresolved block comments with metadata.selectionStart/End
 *                                          — ranges in those comments are highlighted with <mark>.
 */
export function BlockRenderer({ blocks, workspaceId, blockComments }) {
  let list = blocks;
  if (typeof blocks === 'string') {
    try { list = JSON.parse(blocks || '[]'); } catch { list = []; }
  }
  if (!Array.isArray(list) || list.length === 0) return null;
  return (
    <div className="space-y-4">
      {list.map((block) => (
        <div key={block.id}><OneBlock block={block} allBlocks={list} workspaceId={workspaceId} blockComments={blockComments} /></div>
      ))}
    </div>
  );
}
