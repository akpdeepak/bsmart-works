// Find & Replace helpers for the block editor (KR-006 · P1 · RB-30).
// Pure — no React, no DOM; tested independently.

/**
 * computeMatches — case-insensitive substring search across all content-bearing blocks.
 * Returns an array of `{ blockIndex, start, end }`, sorted by block order.
 * @param {string} query
 * @param {Array<{content?: string}>} blocks
 * @returns {{ blockIndex: number, start: number, end: number }[]}
 */
export function computeMatches(query, blocks) {
  if (!query) return [];
  const lower = query.toLowerCase();
  const results = [];
  blocks.forEach((block, blockIndex) => {
    const text = block.content || '';
    const lowerText = text.toLowerCase();
    let pos = 0;
    while (pos < lowerText.length) {
      const idx = lowerText.indexOf(lower, pos);
      if (idx === -1) break;
      results.push({ blockIndex, start: idx, end: idx + lower.length });
      pos = idx + 1;
    }
  });
  return results;
}
