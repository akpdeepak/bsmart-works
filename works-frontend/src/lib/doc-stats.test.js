import { describe, it, expect } from 'vitest';
import {
  headingLevel, blockPlainText, blocksText, countWords, docStats, blocksOutline,
} from '@/lib/doc-stats';

const b = (type, content = '', metadata = {}) => ({ id: type + Math.random(), type, content, metadata });

describe('headingLevel', () => {
  it('maps heading block types to levels', () => {
    expect(headingLevel(b('heading1'))).toBe(1);
    expect(headingLevel(b('heading3'))).toBe(3);
    expect(headingLevel(b('paragraph'))).toBeNull();
    expect(headingLevel(null)).toBeNull();
  });
});

describe('blockPlainText', () => {
  it('extracts text across block types', () => {
    expect(blockPlainText(b('paragraph', 'hello world'))).toBe('hello world');
    expect(blockPlainText(b('checklist', '', { items: [{ text: 'a' }, { text: 'b' }] }))).toBe('a b');
    expect(blockPlainText(b('toggle', 'summary', { body: 'detail' }))).toBe('summary detail');
    expect(blockPlainText(b('sheet', '', { rows: [['1', '2'], ['3', '']] }))).toBe('1 2 3 ');
    expect(blockPlainText(b('bookmark', 'http://x', { title: 'Doc', description: 'desc' }))).toBe('http://x Doc desc');
    expect(blockPlainText(b('whiteboard', '', { notes: [{ text: 'idea' }] }))).toBe('idea');
    expect(blockPlainText(b('divider'))).toBe('');
  });
});

describe('blocksText + countWords', () => {
  it('joins and counts words, collapsing whitespace', () => {
    const blocks = [b('heading1', 'Title'), b('paragraph', 'one two   three')];
    expect(blocksText(blocks)).toBe('Title one two three');
    expect(countWords(blocksText(blocks))).toBe(4);
    expect(countWords('')).toBe(0);
    expect(countWords('   ')).toBe(0);
  });
});

describe('docStats', () => {
  it('reports words, characters and reading minutes', () => {
    const blocks = [b('paragraph', 'word '.repeat(400).trim())];
    const stats = docStats(blocks);
    expect(stats.words).toBe(400);
    expect(stats.readingMinutes).toBe(2); // 400 / 200
  });

  it('reading time is at least 1 minute when any text exists, 0 when empty', () => {
    expect(docStats([b('paragraph', 'short text')]).readingMinutes).toBe(1);
    expect(docStats([b('divider')]).readingMinutes).toBe(0);
    expect(docStats([]).words).toBe(0);
  });
});

describe('blocksOutline', () => {
  it('returns non-empty headings in order with levels', () => {
    const blocks = [
      b('heading1', 'Intro'),
      b('paragraph', 'body'),
      b('heading2', 'Details'),
      b('heading3', ''), // empty heading skipped
    ];
    expect(blocksOutline(blocks)).toEqual([
      { id: blocks[0].id, level: 1, text: 'Intro' },
      { id: blocks[2].id, level: 2, text: 'Details' },
    ]);
  });

  it('tolerates non-array input', () => {
    expect(blocksOutline(null)).toEqual([]);
  });
});
