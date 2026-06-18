import { rowsToCsv, blocksToMarkdown } from './export';

describe('rowsToCsv', () => {
  it('returns an empty string for no rows', () => {
    expect(rowsToCsv([])).toBe('');
    expect(rowsToCsv(null)).toBe('');
  });

  it('emits a header row from the first object keys, then one row per record', () => {
    const csv = rowsToCsv([
      { id: 'W-1', title: 'Login bug', status: 'Todo' },
      { id: 'W-2', title: 'OTP', status: 'Done' },
    ]);
    expect(csv).toBe('id,title,status\r\nW-1,Login bug,Todo\r\nW-2,OTP,Done');
  });

  it('quotes and escapes values containing commas, quotes or newlines', () => {
    const csv = rowsToCsv([{ title: 'a,b', note: 'has "quote"' }]);
    expect(csv).toBe('title,note\r\n"a,b","has ""quote"""');
  });

  it('renders null/undefined as empty cells', () => {
    expect(rowsToCsv([{ a: null, b: undefined, c: 0 }])).toBe('a,b,c\r\n,,0');
  });
});

describe('blocksToMarkdown (KR-083)', () => {
  it('returns empty string for non-array input', () => {
    expect(blocksToMarkdown(null)).toBe('');
    expect(blocksToMarkdown(undefined)).toBe('');
    expect(blocksToMarkdown('text')).toBe('');
  });

  it('converts heading1 to ATX h1', () => {
    expect(blocksToMarkdown([{ type: 'heading1', content: 'My Title' }])).toBe('# My Title\n\n');
  });

  it('converts heading2 and heading3', () => {
    const md = blocksToMarkdown([
      { type: 'heading2', content: 'Section' },
      { type: 'heading3', content: 'Subsection' },
    ]);
    expect(md).toBe('## Section\n\n### Subsection\n\n');
  });

  it('converts paragraph with content', () => {
    expect(blocksToMarkdown([{ type: 'paragraph', content: 'Hello world' }])).toBe('Hello world\n\n');
  });

  it('converts empty paragraph to a single newline', () => {
    expect(blocksToMarkdown([{ type: 'paragraph', content: '' }])).toBe('\n');
  });

  it('converts a code block with language', () => {
    const md = blocksToMarkdown([{ type: 'code', content: 'const x = 1;', metadata: { language: 'javascript' } }]);
    expect(md).toBe('```javascript\nconst x = 1;\n```\n\n');
  });

  it('converts a code block without language', () => {
    const md = blocksToMarkdown([{ type: 'code', content: 'SELECT 1', metadata: {} }]);
    expect(md).toBe('```\nSELECT 1\n```\n\n');
  });

  it('converts checklist items — unchecked by default', () => {
    expect(blocksToMarkdown([{ type: 'checklist', content: 'Write tests', metadata: {} }])).toBe('- [ ] Write tests\n');
  });

  it('converts checklist items — checked', () => {
    expect(blocksToMarkdown([{ type: 'checklist', content: 'Write tests', metadata: { checked: true } }])).toBe('- [x] Write tests\n');
  });

  it('converts a table with header and body rows', () => {
    const block = {
      type: 'table',
      content: '',
      metadata: {
        rows: [
          ['Name', 'Status'],
          ['Alice', 'Active'],
          ['Bob', 'Inactive'],
        ],
      },
    };
    const md = blocksToMarkdown([block]);
    expect(md).toBe(
      '| Name | Status |\n' +
      '| --- | --- |\n' +
      '| Alice | Active |\n' +
      '| Bob | Inactive |\n\n',
    );
  });

  it('converts a table with no rows to empty string', () => {
    expect(blocksToMarkdown([{ type: 'table', content: '', metadata: { rows: [] } }])).toBe('');
  });

  it('converts a divider to ---', () => {
    expect(blocksToMarkdown([{ type: 'divider', content: '' }])).toBe('---\n\n');
  });

  it('converts quote blocks', () => {
    expect(blocksToMarkdown([{ type: 'quote', content: 'To be or not' }])).toBe('> To be or not\n\n');
  });

  it('converts callout with variant', () => {
    const md = blocksToMarkdown([{ type: 'callout', content: 'Watch out!', metadata: { variant: 'warning' } }]);
    expect(md).toBe('> **warning:** Watch out!\n\n');
  });

  it('falls back to Note for callout without variant', () => {
    const md = blocksToMarkdown([{ type: 'callout', content: 'FYI', metadata: {} }]);
    expect(md).toBe('> **Note:** FYI\n\n');
  });

  it('converts unknown block types with content to plain paragraph', () => {
    expect(blocksToMarkdown([{ type: 'sticker', content: '🚀' }])).toBe('🚀\n\n');
  });

  it('wraps unknown blocks without content in an HTML comment', () => {
    expect(blocksToMarkdown([{ type: 'whiteboard', content: '' }])).toBe('<!-- block:whiteboard -->\n\n');
  });

  it('converts bSmart knowledge blocks', () => {
    const md = blocksToMarkdown([
      { type: 'decision', content: 'Use PostgreSQL', metadata: { status: 'accepted', owner: 'Platform', rationale: 'Fits relational data' } },
      { type: 'okr', content: 'Improve adoption', metadata: { keyResults: [{ title: 'Editors', current: '40', target: '80' }] } },
      { type: 'risk_register', metadata: { risks: [{ risk: 'Delay', impact: '4', probability: '3', owner: 'PM', mitigation: 'Pilot' }] } },
      { type: 'dashboard', metadata: { title: 'Know health', url: 'https://example.com/health' } },
    ]);
    expect(md).toContain('Decision: Use PostgreSQL');
    expect(md).toContain('- Editors: 40/80');
    expect(md).toContain('| Delay | 12 | PM | Pilot |');
    expect(md).toContain('[Know health](https://example.com/health)');
  });

  it('handles a mixed block array end-to-end', () => {
    const blocks = [
      { type: 'heading1', content: 'Guide' },
      { type: 'paragraph', content: 'Introduction.' },
      { type: 'divider', content: '' },
      { type: 'checklist', content: 'Step one', metadata: { checked: true } },
    ];
    expect(blocksToMarkdown(blocks)).toBe(
      '# Guide\n\n' +
      'Introduction.\n\n' +
      '---\n\n' +
      '- [x] Step one\n',
    );
  });
});
