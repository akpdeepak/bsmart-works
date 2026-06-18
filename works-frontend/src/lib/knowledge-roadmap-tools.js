import { blocksText } from '@/lib/doc-stats';

const STOP_WORDS = new Set([
  'about', 'after', 'again', 'also', 'because', 'before', 'being', 'between', 'could',
  'every', 'from', 'have', 'into', 'more', 'should', 'that', 'their', 'there', 'these',
  'this', 'through', 'with', 'would', 'your',
]);

function parseBlocks(article) {
  try {
    const parsed = JSON.parse(article?.contentBlocks || '[]');
    return Array.isArray(parsed) ? parsed : [];
  } catch {
    return [];
  }
}

export function articlePlainText(article) {
  const blocks = parseBlocks(article);
  if (blocks.length > 0) return blocksText(blocks);
  return article?.content || '';
}

export function keywords(text, limit = 12) {
  const counts = new Map();
  String(text || '')
    .toLowerCase()
    .replace(/[^a-z0-9\s-]/g, ' ')
    .split(/\s+/)
    .filter((word) => word.length > 3 && !STOP_WORDS.has(word))
    .forEach((word) => counts.set(word, (counts.get(word) || 0) + 1));
  return [...counts.entries()]
    .sort((a, b) => b[1] - a[1] || a[0].localeCompare(b[0]))
    .slice(0, limit)
    .map(([word]) => word);
}

export function duplicateCandidates(article, articles, limit = 5) {
  const source = new Set(keywords(articlePlainText(article), 24));
  if (!article || source.size === 0) return [];
  return (articles || [])
    .filter((candidate) => candidate.id !== article.id)
    .map((candidate) => {
      const target = new Set(keywords(articlePlainText(candidate), 24));
      const overlap = [...source].filter((word) => target.has(word)).length;
      const denominator = Math.max(1, Math.min(source.size, target.size));
      return { article: candidate, score: Math.round((overlap / denominator) * 100), overlap };
    })
    .filter((row) => row.overlap > 0)
    .sort((a, b) => b.score - a.score || (a.article.title || '').localeCompare(b.article.title || ''))
    .slice(0, limit);
}

export function contentGapAnalysis(article, related = []) {
  const text = articlePlainText(article);
  const lower = text.toLowerCase();
  const checks = [
    ['owner', ['owner', 'responsible', 'raci']],
    ['next review date', ['review', 'expiry', 'expires']],
    ['decision context', ['decision', 'rationale', 'tradeoff']],
    ['operational steps', ['step', 'procedure', 'runbook']],
    ['risk or rollback', ['risk', 'rollback', 'mitigation']],
  ];
  const missing = checks
    .filter(([, terms]) => !terms.some((term) => lower.includes(term)))
    .map(([label]) => label);
  const nearbyTopics = keywords(related.map((item) => articlePlainText(item)).join(' '), 8)
    .filter((word) => !keywords(text, 20).includes(word));
  return { missing, nearbyTopics };
}

export function healthScore(article, related = [], comments = []) {
  const text = articlePlainText(article);
  const wordCount = text.trim() ? text.trim().split(/\s+/).length : 0;
  let score = 100;
  const reasons = [];
  if (wordCount < 80) { score -= 20; reasons.push('Short content'); }
  if (!article?.reviewBy) { score -= 15; reasons.push('No review date'); }
  if ((article?.status || 'DRAFT') !== 'PUBLISHED') { score -= 10; reasons.push('Not published'); }
  if ((comments || []).some((comment) => !comment.resolved)) { score -= 10; reasons.push('Open comments'); }
  if ((related || []).length === 0) { score -= 10; reasons.push('No related links'); }
  return { score: Math.max(0, score), reasons };
}

export function knowledgeGraph(article, articles, related = []) {
  const nodes = [{ id: article?.id || 'current', title: article?.title || 'Current article', kind: 'current' }];
  const edges = [];
  const addNode = (item, kind) => {
    if (!item?.id || nodes.some((node) => node.id === item.id)) return;
    nodes.push({ id: item.id, title: item.title || item.id, kind });
    edges.push({ from: article.id, to: item.id, kind });
  };
  related.forEach((item) => addNode(item, 'related'));
  duplicateCandidates(article, articles, 3).forEach(({ article: item }) => addNode(item, 'similar'));
  return { nodes, edges };
}

export function trendingArticles(articles, limit = 5) {
  return [...(articles || [])]
    .sort((a, b) => Number(b.viewCount || b.view_count || 0) - Number(a.viewCount || a.view_count || 0))
    .slice(0, limit);
}

export function translateArticleText(text, language) {
  const label = language || 'target language';
  return `[${label} translation draft]\n${String(text || '').trim()}`;
}

