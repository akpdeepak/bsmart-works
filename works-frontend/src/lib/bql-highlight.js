// Pure, dependency-free BQL tokenizer for syntax highlighting. Kept out of the view component so it
// stays independently unit-testable (like bql-builder.js). It is POSITION-PRESERVING: joining every
// token's `text` reproduces the input exactly (including whitespace), so a highlight overlay can sit
// 1:1 behind the textarea. Classification is schema-driven (field aliases + function names) so it
// tracks the real grammar the compiler accepts.

const CONNECTORS = ['AND', 'OR', 'NOT'];
// Word operators (BQL keywords that read like words). Multi-word operators (IS NOT EMPTY, NOT IN)
// are highlighted word-by-word — each constituent word is an operator/keyword on its own.
const WORD_OPS = ['CONTAINS', 'STARTSWITH', 'ENDSWITH', 'IN', 'BETWEEN', 'IS', 'EMPTY',
  'WAS', 'CHANGED', 'FROM', 'TO', 'AFTER', 'BEFORE', 'ON'];
// Symbol operators, longest-first so `>=`/`!=`/`<>` win over `>`/`<`/`=`.
const SYMBOL_OPS = ['<>', '!=', '>=', '<=', '=', '>', '<', '~'];

const WORD_CHAR = /[A-Za-z0-9_@.-]/;

/**
 * Tokenize a BQL query into `[{ text, type }]`, where type is one of:
 * `field | operator | keyword | function | string | paren | number | plain`.
 * `plain` covers whitespace, commas, value barewords and anything unclassified.
 */
export function tokenize(query, schema) {
  const src = query || '';
  const fieldSet = new Set((schema?.fields || []).map(f => String(f.alias || '').toLowerCase()));
  const funcSet = new Set((schema?.functions || []).map(f => String(f).replace(/\(.*$/, '').toLowerCase()));
  const tokens = [];
  const push = (text, type) => { if (text) tokens.push({ text, type }); };
  const n = src.length;
  let i = 0;
  while (i < n) {
    const ch = src[i];
    if (/\s/.test(ch)) {
      let j = i + 1; while (j < n && /\s/.test(src[j])) j++;
      push(src.slice(i, j), 'plain'); i = j; continue;
    }
    if (ch === '"' || ch === "'") {
      let j = i + 1; while (j < n && src[j] !== ch) j++;
      j = j < n ? j + 1 : n; // include the closing quote; tolerate an unterminated string to EOL
      push(src.slice(i, j), 'string'); i = j; continue;
    }
    if (ch === '(' || ch === ')') { push(ch, 'paren'); i++; continue; }
    if (ch === ',') { push(ch, 'plain'); i++; continue; }
    const sym = SYMBOL_OPS.find(op => src.startsWith(op, i));
    if (sym) { push(sym, 'operator'); i += sym.length; continue; }
    if (WORD_CHAR.test(ch)) {
      let j = i + 1; while (j < n && WORD_CHAR.test(src[j])) j++;
      const w = src.slice(i, j);
      const up = w.toUpperCase();
      let type = 'plain';
      if (funcSet.has(w.toLowerCase())) type = 'function';
      else if (CONNECTORS.includes(up)) type = 'keyword';
      else if (WORD_OPS.includes(up)) type = 'operator';
      else if (fieldSet.has(w.toLowerCase())) type = 'field';
      else if (/^-?\d+(\.\d+)?$/.test(w)) type = 'number';
      push(w, type); i = j; continue;
    }
    push(ch, 'plain'); i++;
  }
  return tokens;
}
