import { describe, it, expect, vi } from 'vitest';
import { render, screen, within, fireEvent } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { BlockEditor } from '@/components/BlockEditor';
import { computeMatches } from '@/lib/find-replace';

describe('BlockEditor — Know Studio blocks', () => {
  it('starts with one paragraph block and a grouped insert menu', async () => {
    const user = userEvent.setup();
    render(<BlockEditor blocks={[]} onChange={() => {}} />);
    expect(screen.getByLabelText('Paragraph content')).toBeInTheDocument();

    await user.click(screen.getByRole('button', { name: 'Add block' }));
    const menu = screen.getByRole('listbox', { name: 'Block type' });
    // The new Know Studio block types are offered (exact accessible names = the labels).
    for (const label of ['Sheet (formulas)', 'Chart', 'Database', 'Pivot table', 'Live widget (BQL)', 'Whiteboard', 'Mind map', 'Flowchart', 'Math / LaTeX', 'Rich embed', 'Sticker / emoji', 'Callout / panel', 'Work item', 'File (any type)', 'Table of contents', 'Decision log', 'OKR tracker', 'Risk register', 'RACI matrix', 'Release notes', 'Embedded dashboard']) {
      expect(within(menu).getByRole('option', { name: label })).toBeInTheDocument();
    }
  });

  it('inserts a sheet block and emits it via onChange', async () => {
    const user = userEvent.setup();
    const onChange = vi.fn();
    render(<BlockEditor blocks={[]} onChange={onChange} />);
    await user.click(screen.getByRole('button', { name: 'Add block' }));
    await user.click(screen.getByRole('option', { name: /Sheet/ }));

    const emitted = onChange.mock.calls.at(-1)[0];
    expect(emitted.some((b) => b.type === 'sheet')).toBe(true);
    expect(screen.getByLabelText('Spreadsheet')).toBeInTheDocument();
  });

  it('shows a live word-count status bar that updates as you type', async () => {
    const user = userEvent.setup();
    render(<BlockEditor blocks={[]} onChange={() => {}} />);
    expect(screen.getByText('0 words')).toBeInTheDocument();
    await user.type(screen.getByLabelText('Paragraph content'), 'one two three');
    expect(screen.getByText('3 words')).toBeInTheDocument();
  });

  it('evaluates sheet formulas in the Values view', async () => {
    const user = userEvent.setup();
    const blocks = [{ id: 's1', type: 'sheet', content: '', metadata: { rows: [['4'], ['6'], ['=A1+A2']], cols: 1 } }];
    render(<BlockEditor blocks={blocks} onChange={() => {}} />);
    await user.click(screen.getByRole('button', { name: 'Show values' }));
    expect(screen.getByText('10')).toBeInTheDocument();
  });

  it('edits database views and metadata (KR-049/KR-051)', async () => {
    const user = userEvent.setup();
    const onChange = vi.fn();
    render(<BlockEditor blocks={[{ id: 'db1', type: 'database', content: '', metadata: { view: 'table', rows: [['Name', 'Status']], cols: 2 } }]} onChange={onChange} />);
    await user.selectOptions(screen.getByLabelText('Database view'), 'board');
    await user.type(screen.getByLabelText('Database filters'), 'status=draft');
    const emitted = onChange.mock.calls.at(-1)[0][0];
    expect(emitted.metadata.view).toBe('board');
    expect(emitted.metadata.filters).toContain('status=draft');
  });

  it('edits bSmart knowledge blocks as first-class content', async () => {
    const user = userEvent.setup();
    const onChange = vi.fn();
    render(<BlockEditor blocks={[{ id: 'd1', type: 'decision', content: '', metadata: { status: 'proposed' } }]} onChange={onChange} />);

    await user.type(screen.getByLabelText('Decision'), 'Use PostgreSQL');
    await user.type(screen.getByLabelText('Owner'), 'Platform');
    await user.type(screen.getByLabelText('Decision maker'), 'CTO');
    await user.type(screen.getByLabelText('Options considered'), 'PostgreSQL');

    const emitted = onChange.mock.calls.at(-1)[0][0];
    expect(emitted.type).toBe('decision');
    expect(emitted.metadata.owner).toBe('Platform');
    expect(emitted.metadata.options).toContain('PostgreSQL');
  });

  it('supports footnotes and block indentation (KR-007/KR-008)', async () => {
    const user = userEvent.setup();
    const onChange = vi.fn();
    render(<BlockEditor blocks={[{ id: 'f1', type: 'footnote', content: '', metadata: {} }]} onChange={onChange} />);

    await user.type(screen.getByLabelText('Number'), '1');
    await user.type(screen.getByLabelText('Footnote text'), 'Source note');
    expect(onChange.mock.calls.at(-1)[0][0].content).toBe('Source note');

    await user.click(screen.getByRole('button', { name: 'Indent block' }));
    expect(onChange.mock.calls.at(-1)[0][0].metadata.indent).toBe(1);
  });

  it('offers whiteboard shapes, connectors, zoom and snap controls (KR-057/KR-059/KR-064)', async () => {
    const user = userEvent.setup();
    const onChange = vi.fn();
    render(<BlockEditor blocks={[{ id: 'wb1', type: 'whiteboard', content: '', metadata: { notes: [], shapes: [], connectors: [] } }]} onChange={onChange} />);
    await user.click(screen.getByRole('button', { name: '+ Shape' }));
    expect(onChange.mock.calls.at(-1)[0][0].metadata.shapes).toHaveLength(1);
    expect(screen.getByLabelText('Whiteboard zoom')).toBeInTheDocument();
    expect(screen.getByLabelText('Snap to grid')).toBeChecked();
    expect(screen.getByRole('button', { name: 'Export' })).toBeInTheDocument();
  });

  it('hides AI affordances when no aiAssist is provided', () => {
    render(<BlockEditor blocks={[]} onChange={() => {}} />);
    expect(screen.queryByLabelText('Write with AI')).not.toBeInTheDocument();
    expect(screen.queryByLabelText('AI writing assistant')).not.toBeInTheDocument();
  });

  it('writes a new paragraph with AI when aiAssist is provided', async () => {
    const user = userEvent.setup();
    const aiAssist = vi.fn().mockResolvedValue({ text: 'AI-drafted intro.', meta: { fallback: false, tier: 'SONNET' } });
    const onChange = vi.fn();
    render(<BlockEditor blocks={[]} onChange={onChange} aiAssist={aiAssist} />);

    await user.type(screen.getByLabelText('Write with AI'), 'draft an intro');
    await user.click(screen.getByRole('button', { name: 'Write' }));

    expect(aiAssist).toHaveBeenCalledWith({ mode: 'write', instruction: 'draft an intro' });
    const emitted = onChange.mock.calls.at(-1)[0];
    expect(emitted.some((b) => b.type === 'paragraph' && b.content === 'AI-drafted intro.')).toBe(true);
  });

  it('improves a paragraph in place via the per-block AI menu', async () => {
    const user = userEvent.setup();
    const aiAssist = vi.fn().mockResolvedValue({ text: 'Polished sentence.', meta: { fallback: true } });
    const onChange = vi.fn();
    const blocks = [{ id: 'p1', type: 'paragraph', content: 'rough text', metadata: {} }];
    render(<BlockEditor blocks={blocks} onChange={onChange} aiAssist={aiAssist} />);

    await user.click(screen.getByLabelText('AI writing assistant'));
    await user.click(screen.getByRole('menuitem', { name: 'Improve' }));

    expect(aiAssist).toHaveBeenCalledWith({ mode: 'improve', text: 'rough text' });
    const emitted = onChange.mock.calls.at(-1)[0];
    expect(emitted[0].content).toBe('Polished sentence.');
  });

  it('opens a "/" slash menu and replaces the paragraph with the picked block type', async () => {
    const user = userEvent.setup();
    const onChange = vi.fn();
    render(<BlockEditor blocks={[]} onChange={onChange} />);

    await user.type(screen.getByLabelText('Paragraph content'), '/callout');
    const menu = screen.getByRole('listbox', { name: 'Insert block' });
    await user.click(within(menu).getByRole('option', { name: 'Callout / panel' }));

    // The paragraph became a callout — its editor surface appears and the "/query" text is dropped.
    expect(screen.getByLabelText('Callout text')).toBeInTheDocument();
    const emitted = onChange.mock.calls.at(-1)[0];
    expect(emitted.some((b) => b.type === 'callout')).toBe(true);
    expect(emitted.some((b) => b.content === '/callout')).toBe(false);
  });

  it('selects a slash-menu item with the keyboard (Enter)', async () => {
    const user = userEvent.setup();
    const onChange = vi.fn();
    render(<BlockEditor blocks={[]} onChange={onChange} />);

    await user.type(screen.getByLabelText('Paragraph content'), '/quote');
    await user.keyboard('{Enter}');

    const emitted = onChange.mock.calls.at(-1)[0];
    expect(emitted.some((b) => b.type === 'quote')).toBe(true);
  });

  it('does not open the slash menu for ordinary text containing a slash', async () => {
    const user = userEvent.setup();
    render(<BlockEditor blocks={[]} onChange={() => {}} />);
    await user.type(screen.getByLabelText('Paragraph content'), 'see the path/to file');
    expect(screen.queryByRole('listbox', { name: 'Insert block' })).not.toBeInTheDocument();
  });

  it('Ctrl+B wraps the selected text with ** bold markers (KR-001)', async () => {
    const user = userEvent.setup();
    const onChange = vi.fn();
    render(<BlockEditor blocks={[]} onChange={onChange} />);
    const textarea = screen.getByLabelText('Paragraph content');

    await user.type(textarea, 'hello world');
    textarea.setSelectionRange(0, 5);
    fireEvent.keyDown(textarea, { key: 'b', ctrlKey: true });

    const emitted = onChange.mock.calls.at(-1)[0];
    expect(emitted[0].content).toBe('**hello** world');
  });

  it('Ctrl+Z undoes the last committed block change (KR-003)', async () => {
    const user = userEvent.setup();
    const onChange = vi.fn();
    render(<BlockEditor blocks={[]} onChange={onChange} />);
    const textarea = screen.getByLabelText('Paragraph content');

    await user.type(textarea, 'a');
    expect(onChange.mock.calls.at(-1)[0][0].content).toBe('a');

    fireEvent.keyDown(textarea, { key: 'z', ctrlKey: true });
    expect(onChange.mock.calls.at(-1)[0][0].content).toBe('');
  });

  it('mouseup with selected text shows the floating toolbar (KR-002)', async () => {
    const user = userEvent.setup();
    render(<BlockEditor blocks={[]} onChange={() => {}} />);
    const textarea = screen.getByLabelText('Paragraph content');

    await user.type(textarea, 'hello world');
    textarea.setSelectionRange(0, 5);
    // The toolbar is triggered by mouseup on the editor root
    fireEvent.mouseUp(document.getElementById('block-editor-root'));

    expect(screen.getByRole('toolbar', { name: 'Text formatting' })).toBeInTheDocument();
  });

  it('Bold button in the floating toolbar wraps the selection (KR-002)', async () => {
    const user = userEvent.setup();
    const onChange = vi.fn();
    render(<BlockEditor blocks={[]} onChange={onChange} />);
    const textarea = screen.getByLabelText('Paragraph content');

    await user.type(textarea, 'hello world');
    textarea.setSelectionRange(0, 5);
    fireEvent.mouseUp(document.getElementById('block-editor-root'));

    const toolbar = screen.getByRole('toolbar', { name: 'Text formatting' });
    await user.click(within(toolbar).getByRole('button', { name: 'Bold' }));

    const emitted = onChange.mock.calls.at(-1)[0];
    expect(emitted[0].content).toBe('**hello** world');
  });

  it('Escape dismisses the floating toolbar without modifying content (KR-002)', async () => {
    const user = userEvent.setup();
    render(<BlockEditor blocks={[]} onChange={() => {}} />);
    const textarea = screen.getByLabelText('Paragraph content');

    await user.type(textarea, 'hello');
    textarea.setSelectionRange(0, 5);
    fireEvent.mouseUp(document.getElementById('block-editor-root'));
    expect(screen.getByRole('toolbar', { name: 'Text formatting' })).toBeInTheDocument();

    fireEvent.keyDown(textarea, { key: 'Escape' });
    expect(screen.queryByRole('toolbar', { name: 'Text formatting' })).not.toBeInTheDocument();
  });

  it('Ctrl+Y redoes after an undo (KR-003)', async () => {
    const user = userEvent.setup();
    const onChange = vi.fn();
    render(<BlockEditor blocks={[]} onChange={onChange} />);
    const textarea = screen.getByLabelText('Paragraph content');

    await user.type(textarea, 'a');
    fireEvent.keyDown(textarea, { key: 'z', ctrlKey: true });
    expect(onChange.mock.calls.at(-1)[0][0].content).toBe('');

    fireEvent.keyDown(textarea, { key: 'y', ctrlKey: true });
    expect(onChange.mock.calls.at(-1)[0][0].content).toBe('a');
  });

  // KR-006: Find & Replace — computeMatches unit tests
  describe('computeMatches (KR-006)', () => {
    it('returns empty array for empty query', () => {
      const blocks = [{ id: 'b1', content: 'hello world', type: 'paragraph' }];
      expect(computeMatches('', blocks)).toEqual([]);
    });

    it('returns matches for a case-insensitive substring', () => {
      const blocks = [
        { id: 'b1', content: 'Hello world', type: 'paragraph' },
        { id: 'b2', content: 'say hello again', type: 'paragraph' },
        { id: 'b3', content: 'no match here', type: 'paragraph' },
      ];
      const m = computeMatches('hello', blocks);
      expect(m).toHaveLength(2);
      expect(m[0]).toMatchObject({ blockIndex: 0, start: 0, end: 5 });
      expect(m[1]).toMatchObject({ blockIndex: 1, start: 4, end: 9 });
    });

    it('returns multiple matches within the same block', () => {
      const blocks = [{ id: 'b1', content: 'hello hello hello', type: 'paragraph' }];
      expect(computeMatches('hello', blocks)).toHaveLength(3);
    });

    it('returns no matches when query is not found', () => {
      const blocks = [{ id: 'b1', content: 'foo bar', type: 'paragraph' }];
      expect(computeMatches('xyz', blocks)).toHaveLength(0);
    });
  });

  // KR-006: Find bar UI
  it('Ctrl+F opens the find bar (KR-006)', async () => {
    render(<BlockEditor blocks={[]} onChange={() => {}} />);
    const root = document.getElementById('block-editor-root');
    fireEvent.keyDown(root, { key: 'f', ctrlKey: true });
    expect(screen.getByRole('search', { name: /find and replace/i })).toBeInTheDocument();
  });

  it('Escape closes the find bar (KR-006)', async () => {
    render(<BlockEditor blocks={[]} onChange={() => {}} />);
    const root = document.getElementById('block-editor-root');
    fireEvent.keyDown(root, { key: 'f', ctrlKey: true });
    expect(screen.getByRole('search', { name: /find and replace/i })).toBeInTheDocument();
    fireEvent.keyDown(root, { key: 'Escape' });
    expect(screen.queryByRole('search', { name: /find and replace/i })).not.toBeInTheDocument();
  });

  it('Replace All replaces all occurrences across blocks (KR-006)', async () => {
    const user = userEvent.setup();
    const onChange = vi.fn();
    const blocks = [
      { id: 'b1', type: 'paragraph', content: 'hello world', metadata: {} },
      { id: 'b2', type: 'paragraph', content: 'say hello', metadata: {} },
      { id: 'b3', type: 'paragraph', content: 'hello again', metadata: {} },
    ];
    render(<BlockEditor blocks={blocks} onChange={onChange} />);

    // Open find bar
    const root = document.getElementById('block-editor-root');
    fireEvent.keyDown(root, { key: 'h', ctrlKey: true });

    const findInput = screen.getByLabelText('Find text');
    const replaceInput = screen.getByLabelText('Replace with');
    await user.type(findInput, 'hello');
    await user.type(replaceInput, 'hi');

    await user.click(screen.getByRole('button', { name: /replace all/i }));

    const emitted = onChange.mock.calls.at(-1)[0];
    expect(emitted[0].content).toBe('hi world');
    expect(emitted[1].content).toBe('say hi');
    expect(emitted[2].content).toBe('hi again');
  });

  it('find bar is not shown in read-only mode (KR-006)', () => {
    render(<BlockEditor blocks={[]} />);
    const root = document.getElementById('block-editor-root');
    fireEvent.keyDown(root, { key: 'f', ctrlKey: true });
    // Bar opens via keyboard but onChange is absent so the bar should not render
    expect(screen.queryByRole('search', { name: /find and replace/i })).not.toBeInTheDocument();
  });

  // KR-013: Enhanced status bar
  it('shows char count and readability grade in status bar (KR-013)', async () => {
    const user = userEvent.setup();
    render(<BlockEditor blocks={[]} onChange={() => {}} />);
    const textarea = screen.getByLabelText('Paragraph content');
    await user.type(textarea, 'The cat sat on the mat.');
    // Should show chars (no spaces)
    expect(screen.getByText(/chars/)).toBeInTheDocument();
    // Grade label should appear once there is text
    expect(screen.getByText(/Grade/)).toBeInTheDocument();
  });
});
