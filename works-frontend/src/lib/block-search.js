// KR-006: Find & Replace match computation — pure function, separated for react-refresh compliance.
// Returns [{blockId, blockIndex, start, end}] for all occurrences of query in blocks.
export function computeMatches(query, blocks) {
  if (!query) return [];
  const q = query.toLowerCase();
  const results = [];
  blocks.forEach((block, blockIndex) => {
    const content = block.content || '';
    let pos = 0;
    while (pos < content.length) {
      const idx = content.toLowerCase().indexOf(q, pos);
      if (idx === -1) break;
      results.push({ blockId: block.id, blockIndex, start: idx, end: idx + q.length });
      pos = idx + 1;
    }
  });
  return results;
}
