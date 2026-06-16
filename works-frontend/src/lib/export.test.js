import { rowsToCsv } from './export';

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
