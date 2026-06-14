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

const STICKER_SIZE = { md: 'text-4xl', lg: 'text-6xl', xl: 'text-8xl' };
const FILE_KIND_LABEL = { image: 'Image', pdf: 'PDF', doc: 'Document', sheet: 'Spreadsheet', slide: 'Slides', archive: 'Archive', video: 'Video', audio: 'Audio', code: 'Code', link: 'File' };

function CalloutView({ block }) {
  const v = CALLOUT_VARIANTS[block.metadata?.variant] || CALLOUT_VARIANTS.info;
  const Icon = v.Icon;
  return (
    <div className={cn('rounded-md border-l-2 p-3 flex gap-3', v.box)}>
      <Icon aria-hidden="true" className={cn('h-5 w-5 shrink-0 mt-0.5', v.accent)} />
      <p className="text-sm text-neutral-900 dark:text-neutral-100 whitespace-pre-wrap">{block.content}</p>
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
      <p className="text-2xs uppercase tracking-wide font-semibold text-neutral-400 mb-1.5">Contents</p>
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

function WhiteboardView({ block }) {
  const notes = block.metadata?.notes || [];
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
    </div>
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

function OneBlock({ block, allBlocks, workspaceId }) {
  switch (block.type) {
    case 'paragraph':
      return <div className="text-sm text-neutral-800 dark:text-neutral-200 leading-relaxed" dangerouslySetInnerHTML={{ __html: renderMd(block.content || '') }} />;
    case 'heading1':
      return <h2 id={block.id} className="mt-8 text-2xl font-bold text-neutral-900 dark:text-neutral-100 scroll-mt-4">{block.content}</h2>;
    case 'heading2':
      return <h3 id={block.id} className="mt-6 text-xl font-semibold text-neutral-900 dark:text-neutral-100 scroll-mt-4">{block.content}</h3>;
    case 'heading3':
      return <h4 id={block.id} className="mt-5 text-base font-semibold text-neutral-900 dark:text-neutral-100 scroll-mt-4">{block.content}</h4>;
    case 'quote':
      return <blockquote className="my-2 border-l-2 border-brand-navy-tint pl-4 text-sm italic text-neutral-600 dark:text-neutral-300 whitespace-pre-wrap">{block.content}</blockquote>;
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
    case 'code':
      return <pre className="rounded-md ring-1 ring-neutral-800 bg-neutral-900 p-3.5 text-sm font-mono text-neutral-100 overflow-x-auto whitespace-pre-wrap">{block.content}</pre>;
    case 'divider':
      return <hr className="border-neutral-300 dark:border-neutral-600" aria-label="Divider" />;
    case 'sheet':
      return <SheetView block={block} />;
    case 'chart':
      return <ChartPreview chartType={block.metadata?.chartType} rows={block.metadata?.rows} />;
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
 * @param {Array|string} props.blocks  Blocks array, or the raw content_blocks JSON string.
 * @param {string} [props.workspaceId] Enables live BQL widget blocks in read mode.
 */
export function BlockRenderer({ blocks, workspaceId }) {
  let list = blocks;
  if (typeof blocks === 'string') {
    try { list = JSON.parse(blocks || '[]'); } catch { list = []; }
  }
  if (!Array.isArray(list) || list.length === 0) return null;
  return (
    <div className="space-y-4">
      {list.map((block) => (
        <div key={block.id}><OneBlock block={block} allBlocks={list} workspaceId={workspaceId} /></div>
      ))}
    </div>
  );
}
