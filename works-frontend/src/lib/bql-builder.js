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
