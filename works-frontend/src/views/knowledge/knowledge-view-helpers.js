import { blocksText } from '@/lib/doc-stats';

// Plain text of an article for AI summary — block content when present, else the markdown body.
export function articleText(article) {
  if (!article) return '';
  let blocks;
  try { blocks = JSON.parse(article.contentBlocks || '[]'); } catch { blocks = []; }
  if (Array.isArray(blocks) && blocks.length > 0) return blocksText(blocks);
  return article.content || '';
}

// Preview text for article list cards — uses blocksText() for block-format articles so they never
// show an empty snippet in the list (previously art.content was always empty for block articles).
export function articlePreview(art, maxLen = 120) {
  let text = art.content || '';
  try {
    const blocks = JSON.parse(art.contentBlocks || '[]');
    if (Array.isArray(blocks) && blocks.length > 0) text = blocksText(blocks);
  } catch { /* keep art.content fallback */ }
  const trimmed = text.trim();
  return trimmed.length > maxLen ? `${trimmed.substring(0, maxLen)}…` : trimmed;
}

export function parseArticleBlocks(article) {
  if (!article?.contentBlocks) return [];
  try {
    const parsed = JSON.parse(article.contentBlocks || '[]');
    return Array.isArray(parsed) ? parsed : [];
  } catch {
    return [];
  }
}

export function articleOutline(article) {
  return parseArticleBlocks(article)
    .filter((block) => ['heading1', 'heading2', 'heading3'].includes(block.type) && String(block.content || '').trim())
    .map((block, index) => ({
      id: block.id || `heading-${index}`,
      text: String(block.content || '').trim(),
      level: block.type === 'heading1' ? 1 : block.type === 'heading2' ? 2 : 3,
    }));
}

export function safeDownloadName(title, extension) {
  const base = String(title || 'article').replace(/[^a-zA-Z0-9 _-]/g, '').trim() || 'article';
  return `${base}.${extension}`;
}

export function downloadBlob(blob, filename) {
  const url = URL.createObjectURL(blob);
  const link = document.createElement('a');
  link.href = url;
  link.download = filename;
  document.body.appendChild(link);
  link.click();
  document.body.removeChild(link);
  URL.revokeObjectURL(url);
}

export const STATUS_CHIP = {
  PUBLISHED: 'bg-semantic-success-surface text-semantic-success',
  DRAFT:     'bg-neutral-100 dark:bg-neutral-700 text-neutral-500',
  IN_REVIEW: 'bg-semantic-warning-surface text-semantic-warning',
  ARCHIVED:  'bg-neutral-200 dark:bg-neutral-600 text-neutral-500',
};
