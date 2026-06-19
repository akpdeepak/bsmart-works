// bSmart Works — Know Studio document statistics (the "MS Word" surface of the Know section).
// Pure and dependency-free (RB-10 §7): word count, reading time and a heading outline for the
// auto Table-of-Contents block. Addresses Word's manual word-count status bar and hand-maintained
// TOC — here both update live from the blocks, with no separate file to keep in sync.

const HEADING_LEVELS = { heading1: 1, heading2: 2, heading3: 3 };
const WORDS_PER_MINUTE = 200;

/** Heading level (1–3) for a heading block, or null for any other block. */
export function headingLevel(block) {
  return block && HEADING_LEVELS[block.type] ? HEADING_LEVELS[block.type] : null;
}

/** Best-effort plain text for a single block, across every Know Studio block type. */
export function blockPlainText(block) {
  if (!block || typeof block !== 'object') return '';
  const meta = block.metadata || {};
  const content = block.content == null ? '' : String(block.content);
  switch (block.type) {
    case 'checklist':
      return (meta.items || []).map((it) => it.text || '').join(' ');
    case 'toggle':
      return `${content} ${meta.body || ''}`;
    case 'table':
    case 'sheet':
    case 'database':
    case 'pivot':
      return (meta.rows || []).flat().map((c) => (c == null ? '' : String(c))).join(' ');
    case 'chart':
      return (meta.rows || []).flat().map((c) => (c == null ? '' : String(c))).join(' ');
    case 'whiteboard':
      return [...(meta.notes || []).map((n) => n.text || ''), ...(meta.shapes || []).map((s) => s.text || '')].join(' ');
    case 'mindmap':
      return (meta.nodes || []).join(' ');
    case 'flowchart':
    case 'math':
      return content;
    case 'embed':
      return `${content} ${meta.title || ''} ${meta.description || ''}`;
    case 'decision':
      return `${content} ${meta.status || ''} ${meta.owner || ''} ${meta.rationale || ''} ${meta.consequences || ''} ${(meta.options || []).join(' ')}`;
    case 'retro':
      return `${content} ${meta.wentWell || ''} ${meta.improve || ''} ${meta.actions || ''} ${meta.shoutouts || ''}`;
    case 'okr':
      return `${content} ${meta.owner || ''} ${(meta.keyResults || []).map((kr) => `${kr.title || ''} ${kr.current || ''} ${kr.target || ''}`).join(' ')}`;
    case 'risk_register':
      return (meta.risks || []).map((r) => `${r.risk || ''} ${r.owner || ''} ${r.mitigation || ''}`).join(' ');
    case 'raci':
      return (meta.rows || []).flat().map((c) => (c == null ? '' : String(c))).join(' ');
    case 'release_notes':
      return `${content} ${meta.version || ''} ${meta.added || ''} ${meta.changed || ''} ${meta.fixed || ''} ${meta.knownIssues || ''}`;
    case 'dashboard':
      return `${content} ${meta.title || ''} ${meta.description || ''} ${meta.url || ''}`;
    case 'workitem':
      return `${content} ${meta.title || ''}`;
    case 'article_ref':
      return `${content} ${meta.title || ''} ${meta.articleId || ''}`;
    case 'bookmark':
      return `${content} ${meta.title || ''} ${meta.description || ''}`;
    case 'divider':
    case 'image':
      return meta.alt || '';
    default:
      return content;
  }
}

/** All readable text in a document, blocks joined by spaces. */
export function blocksText(blocks) {
  if (!Array.isArray(blocks)) return '';
  return blocks.map(blockPlainText).join(' ').replace(/\s+/g, ' ').trim();
}

/** Count whitespace-delimited words in a string. */
export function countWords(text) {
  const t = (text || '').trim();
  return t === '' ? 0 : t.split(/\s+/).length;
}

/**
 * Document statistics for the editor status bar: words, characters and estimated reading minutes
 * (≥1 when there is any text). Pure — derives everything from the blocks array.
 */
export function docStats(blocks) {
  const text = blocksText(blocks);
  const words = countWords(text);
  const characters = text.length;
  const readingMinutes = words === 0 ? 0 : Math.max(1, Math.round(words / WORDS_PER_MINUTE));
  return { words, characters, readingMinutes };
}

/**
 * Heading outline for the Table-of-Contents block: every heading block with non-empty text, in
 * document order, as `{ id, level, text }`. Empty headings are skipped so the TOC stays clean.
 */
export function blocksOutline(blocks) {
  if (!Array.isArray(blocks)) return [];
  const out = [];
  for (const block of blocks) {
    const level = headingLevel(block);
    const text = (block?.content || '').trim();
    if (level && text) {
      out.push({ id: block.id, level, text });
    }
  }
  return out;
}
