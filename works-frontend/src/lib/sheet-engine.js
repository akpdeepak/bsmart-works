// bSmart Works — Know Studio spreadsheet engine (the "Excel" capability of the Know section).
// Pure, dependency-free, and framework-agnostic so it is unit-testable in isolation (RB-10 §7) and
// can be reused by both the editor (sheet block) and the read-only renderer. It never uses eval():
// formulas are tokenized and evaluated by a small recursive-descent parser.
//
// Model: a sheet is a 2D array `grid` of raw cell strings. A cell is a formula when it starts with
// '='. Supported in formulas: number literals, A1-style cell references, ranges (A1:B3, only inside
// a function call), the operators + - * / with parentheses and unary minus, and the functions
// SUM, AVG/AVERAGE, MIN, MAX, COUNT, PRODUCT, ROUND. Circular references resolve to '#CIRC',
// unknown references / bad syntax to '#ERR'. Blank cells count as 0 in arithmetic.

const FUNCTIONS = {
  SUM: (xs) => xs.reduce((a, b) => a + b, 0),
  PRODUCT: (xs) => xs.reduce((a, b) => a * b, 1),
  AVG: (xs) => (xs.length ? xs.reduce((a, b) => a + b, 0) / xs.length : 0),
  AVERAGE: (xs) => (xs.length ? xs.reduce((a, b) => a + b, 0) / xs.length : 0),
  MIN: (xs) => (xs.length ? Math.min(...xs) : 0),
  MAX: (xs) => (xs.length ? Math.max(...xs) : 0),
  COUNT: (xs) => xs.length,
  ROUND: (xs) => {
    const [v, digits = 0] = xs;
    const f = 10 ** digits;
    return Math.round((v || 0) * f) / f;
  },
};

// ── Cell-reference helpers ───────────────────────────────────────────────────────

/** 'A' → 0, 'Z' → 25, 'AA' → 26, 'AB' → 27. Case-insensitive. */
export function colToIndex(letters) {
  let n = 0;
  for (const ch of letters.toUpperCase()) {
    n = n * 26 + (ch.charCodeAt(0) - 64); // 'A' = 65 → 1
  }
  return n - 1;
}

/** 0 → 'A', 25 → 'Z', 26 → 'AA'. */
export function indexToCol(index) {
  let n = index + 1;
  let s = '';
  while (n > 0) {
    const rem = (n - 1) % 26;
    s = String.fromCharCode(65 + rem) + s;
    n = Math.floor((n - 1) / 26);
  }
  return s;
}

/** Parse 'B3' → { col: 1, row: 2 } (zero-based). Returns null when it is not a cell ref. */
export function parseRef(ref) {
  const m = /^([A-Za-z]+)(\d+)$/.exec(ref.trim());
  if (!m) return null;
  return { col: colToIndex(m[1]), row: Number(m[2]) - 1 };
}

// ── Tokenizer ────────────────────────────────────────────────────────────────────

const TOKEN = /\s*(?:([A-Za-z]+\d+(?::[A-Za-z]+\d+)?)|([A-Za-z]+)|(\d+(?:\.\d+)?)|([+\-*/(),]))/y;

function tokenize(expr) {
  const tokens = [];
  TOKEN.lastIndex = 0;
  let last = 0;
  let m;
  while ((m = TOKEN.exec(expr)) !== null) {
    if (m[1]) tokens.push({ t: 'ref', v: m[1] });
    else if (m[2]) tokens.push({ t: 'func', v: m[2].toUpperCase() });
    else if (m[3]) tokens.push({ t: 'num', v: Number(m[3]) });
    else if (m[4]) tokens.push({ t: 'op', v: m[4] });
    last = TOKEN.lastIndex;
  }
  if (expr.slice(last).trim() !== '') throw new Error('unparsed');
  return tokens;
}

// ── Evaluator: recursive descent over the token stream ─────────────────────────────
//
// resolve(ref) returns a number for a single cell; expandRange(ref) returns a number[] for a range.
// Grammar:  expr := term (('+'|'-') term)*  ·  term := factor (('*'|'/') factor)*
//           factor := number | ref | func '(' args ')' | '(' expr ')' | '-' factor
//           args := expr (',' (expr|rangeNumbers))*  (a bare range expands to its cells)

function makeParser(tokens, resolve, expandRange) {
  let i = 0;
  const peek = () => tokens[i];
  const next = () => tokens[i++];

  function parseExpr() {
    let v = parseTerm();
    while (peek() && peek().t === 'op' && (peek().v === '+' || peek().v === '-')) {
      const op = next().v;
      const r = parseTerm();
      v = op === '+' ? v + r : v - r;
    }
    return v;
  }

  function parseTerm() {
    let v = parseFactor();
    while (peek() && peek().t === 'op' && (peek().v === '*' || peek().v === '/')) {
      const op = next().v;
      const r = parseFactor();
      v = op === '*' ? v * r : v / r;
    }
    return v;
  }

  function parseFactor() {
    const tok = peek();
    if (!tok) throw new Error('unexpected end');
    if (tok.t === 'op' && tok.v === '-') { next(); return -parseFactor(); }
    if (tok.t === 'op' && tok.v === '(') {
      next();
      const v = parseExpr();
      if (!peek() || peek().v !== ')') throw new Error('missing )');
      next();
      return v;
    }
    if (tok.t === 'num') { next(); return tok.v; }
    if (tok.t === 'ref') {
      next();
      if (tok.v.includes(':')) throw new Error('range outside function');
      return resolve(tok.v);
    }
    if (tok.t === 'func') {
      next();
      const fn = FUNCTIONS[tok.v];
      if (!fn) throw new Error(`unknown function ${tok.v}`);
      if (!peek() || peek().v !== '(') throw new Error('missing (');
      next();
      const args = [];
      while (peek() && peek().v !== ')') {
        if (peek().t === 'ref' && peek().v.includes(':')) {
          args.push(...expandRange(next().v));
        } else {
          args.push(parseExpr());
        }
        if (peek() && peek().v === ',') next();
      }
      if (!peek() || peek().v !== ')') throw new Error('missing )');
      next();
      return fn(args);
    }
    throw new Error('unexpected token');
  }

  const result = parseExpr();
  if (i !== tokens.length) throw new Error('trailing tokens');
  return result;
}

// ── Public: evaluate a whole sheet ────────────────────────────────────────────────

const CIRC = '#CIRC';
const ERR = '#ERR';

/**
 * Evaluate a grid of raw cell strings into a grid of display strings. Formula cells (`=…`) are
 * computed; literal numbers and text pass through. Pure: no mutation of `grid`.
 *
 * @param {string[][]} grid  rows of raw cell strings
 * @returns {string[][]} display values (numbers stringified, errors as '#ERR' / '#CIRC')
 */
export function evaluateSheet(grid) {
  const rows = Array.isArray(grid) ? grid : [];
  const cache = new Map(); // "row,col" → display string (memoized; also marks in-progress)

  const cellRaw = (row, col) => {
    const r = rows[row];
    return r && r[col] != null ? String(r[col]) : '';
  };

  const numericValue = (display) => {
    if (display === '' || display === CIRC || display === ERR) return 0;
    const n = Number(display);
    return Number.isFinite(n) ? n : 0;
  };

  function compute(row, col, visiting) {
    const key = `${row},${col}`;
    if (cache.has(key)) return cache.get(key);
    if (visiting.has(key)) return CIRC;

    const raw = cellRaw(row, col);
    if (!raw.startsWith('=')) {
      cache.set(key, raw);
      return raw;
    }

    visiting.add(key);
    let display;
    try {
      const resolve = (ref) => {
        const p = parseRef(ref);
        if (!p) throw new Error('bad ref');
        const v = compute(p.row, p.col, visiting);
        if (v === CIRC) throw new Error('circular');
        return numericValue(v);
      };
      const expandRange = (range) => {
        const [a, b] = range.split(':').map(parseRef);
        if (!a || !b) throw new Error('bad range');
        const out = [];
        const r0 = Math.min(a.row, b.row);
        const r1 = Math.max(a.row, b.row);
        const c0 = Math.min(a.col, b.col);
        const c1 = Math.max(a.col, b.col);
        for (let r = r0; r <= r1; r += 1) {
          for (let c = c0; c <= c1; c += 1) {
            const v = compute(r, c, visiting);
            if (v === CIRC) throw new Error('circular');
            out.push(numericValue(v));
          }
        }
        return out;
      };
      const value = makeParser(tokenize(raw.slice(1)), resolve, expandRange);
      // Trim float noise (0.30000000000000004 → 0.3) via significant-figure rounding rather than a
      // fixed *1e10 scale, which would overflow Number.MAX_SAFE_INTEGER for large fractional values.
      display = Number.isFinite(value) ? String(Number(value.toPrecision(12))) : ERR;
    } catch (e) {
      display = e.message === 'circular' ? CIRC : ERR;
    }
    visiting.delete(key);
    cache.set(key, display);
    return display;
  }

  return rows.map((r, row) => r.map((_cell, col) => compute(row, col, new Set())));
}

/** Convenience for tests / chart-data: evaluate a single cell ref against a grid. */
export function evaluateRef(grid, ref) {
  const p = parseRef(ref);
  if (!p) return ERR;
  const computed = evaluateSheet(grid);
  const r = computed[p.row];
  return r && r[p.col] != null ? r[p.col] : '';
}
