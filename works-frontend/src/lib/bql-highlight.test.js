import { describe, it, expect } from 'vitest';
import { tokenize } from './bql-highlight';

const SCHEMA = {
  fields: [{ alias: 'status' }, { alias: 'priority' }, { alias: 'assignee' }, { alias: 'dueDate' }],
  functions: ['currentUser()', 'today()', 'daysAgo(n)'],
};

const join = (toks) => toks.map(t => t.text).join('');
const typeOf = (toks, text) => toks.find(t => t.text === text)?.type;

describe('tokenize', () => {
  it('is position-preserving (joined tokens reproduce the input incl. whitespace)', () => {
    const q = 'status = Open  AND ( priority IN (High, Low) )\nassignee = currentUser()';
    expect(join(tokenize(q, SCHEMA))).toBe(q);
  });

  it('preserves an empty / whitespace-only query', () => {
    expect(join(tokenize('', SCHEMA))).toBe('');
    expect(join(tokenize('   \n ', SCHEMA))).toBe('   \n ');
  });

  it('classifies fields, symbol operators, keywords and parens', () => {
    const toks = tokenize('status = Open AND (priority >= 3)', SCHEMA);
    expect(typeOf(toks, 'status')).toBe('field');
    expect(typeOf(toks, '=')).toBe('operator');
    expect(typeOf(toks, 'Open')).toBe('plain'); // value bareword
    expect(typeOf(toks, 'AND')).toBe('keyword');
    expect(typeOf(toks, '(')).toBe('paren');
    expect(typeOf(toks, 'priority')).toBe('field');
    expect(typeOf(toks, '>=')).toBe('operator');
    expect(typeOf(toks, '3')).toBe('number');
  });

  it('classifies word operators and functions', () => {
    const toks = tokenize('dueDate IS EMPTY AND assignee = currentUser()', SCHEMA);
    expect(typeOf(toks, 'IS')).toBe('operator');
    expect(typeOf(toks, 'EMPTY')).toBe('operator');
    expect(typeOf(toks, 'currentUser')).toBe('function');
  });

  it('treats quoted strings (incl. spaces) as one string token', () => {
    const toks = tokenize('status = "In Progress"', SCHEMA);
    expect(typeOf(toks, '"In Progress"')).toBe('string');
  });

  it('tolerates an unterminated string to end of input', () => {
    const q = 'status = "In Pro';
    const toks = tokenize(q, SCHEMA);
    expect(join(toks)).toBe(q);
    expect(typeOf(toks, '"In Pro')).toBe('string');
  });

  it('longest symbol operator wins (>= not > then =)', () => {
    const toks = tokenize('priority>=3', SCHEMA);
    expect(toks.map(t => t.text)).toEqual(['priority', '>=', '3']);
  });
});
