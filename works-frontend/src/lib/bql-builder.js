// Pure helpers for the BQL visual builder. Kept out of the view component so the editor file
// can stay a clean component-only module (react-refresh/only-export-components) while these
// stay independently unit-testable.

// Operators that take no right-hand value.
export const NULLARY_OPS = ['IS EMPTY', 'IS NOT EMPTY'];
// Operators that take a comma-separated set.
export const SET_OPS = ['IN', 'NOT IN'];

// Quote a value if it contains whitespace so the compiler reads it as one token.
export function quoteIfNeeded(v) {
  const s = String(v ?? '').trim();
  if (s === '') return '""';
  if (/\s/.test(s) && !/^".*"$/.test(s)) return `"${s}"`;
  return s;
}

const CONNECTORS = ['AND', 'OR', 'NOT'];
const SYMBOL_OPS = ['=', '!=', '>', '<', '>=', '<='];

/**
 * Caret-aware autocomplete (the core JQL editor experience). Given the query text up to the caret
 * and the schema, return the partial token under the caret and the ranked suggestions for the
 * grammatical slot we're in: a field at the start / after a connector / after "(", an operator
 * after a field, enum values after an operator, or a connector after a complete condition.
 */
export function suggestions(textBeforeCaret, schema) {
  const text = textBeforeCaret || '';
  const m = /([^\s(),]*)$/.exec(text);
  const partial = m ? m[1] : '';
  const head = text.slice(0, text.length - partial.length).trim();
  const tokens = head.length ? head.split(/\s+/) : [];
  const last = tokens[tokens.length - 1] || '';
  const fields = (schema?.fields || []).map(f => f.alias);
  const operators = schema?.operators || SYMBOL_OPS;

  const isField = (t) => fields.some(f => f.toLowerCase() === t.toLowerCase());
  const isOperator = (t) => operators.includes(t.toUpperCase()) || SYMBOL_OPS.includes(t);

  let pool;
  let kind;
  if (tokens.length === 0 || CONNECTORS.includes(last.toUpperCase()) || head.endsWith('(')) {
    pool = fields; kind = 'field';
  } else if (isField(last)) {
    pool = operators; kind = 'operator';
  } else if (isOperator(last)) {
    const field = tokens[tokens.length - 2] || '';
    pool = (schema?.enums && schema.enums[field.toLowerCase()]) || [];
    kind = 'value';
  } else {
    pool = CONNECTORS; kind = 'connector';
  }

  const p = partial.toLowerCase();
  const options = (p ? pool.filter(o => o.toLowerCase().startsWith(p)) : pool).slice(0, 8);
  return { partial, options, kind };
}

/** Replace the partial token immediately before the caret with the chosen suggestion + a space. */
export function applySuggestion(text, caret, partial, choice) {
  const before = text.slice(0, caret - partial.length);
  const after = text.slice(caret);
  const insert = choice + ' ';
  return { text: before + insert + after, caret: (before + insert).length };
}

// Compose a single visual-builder row into a BQL clause.
export function rowToClause({ field, op, value }) {
  if (!field) return '';
  if (NULLARY_OPS.includes(op)) return `${field} ${op}`;
  if (SET_OPS.includes(op)) {
    const items = String(value || '').split(',').map(s => s.trim()).filter(Boolean).map(quoteIfNeeded);
    if (items.length === 0) return '';
    return `${field} ${op} (${items.join(', ')})`;
  }
  if (value === '' || value == null) return '';
  return `${field} ${op} ${quoteIfNeeded(value)}`;
}
