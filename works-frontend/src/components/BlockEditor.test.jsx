import { describe, it, expect, vi } from 'vitest';
import { render, screen, within, fireEvent } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { BlockEditor } from '@/components/BlockEditor';

describe('BlockEditor — Know Studio blocks', () => {
  it('starts with one paragraph block and a grouped insert menu', async () => {
    const user = userEvent.setup();
    render(<BlockEditor blocks={[]} onChange={() => {}} />);
    expect(screen.getByLabelText('Paragraph content')).toBeInTheDocument();

    await user.click(screen.getByRole('button', { name: 'Add block' }));
    const menu = screen.getByRole('listbox', { name: 'Block type' });
    // The new Know Studio block types are offered (exact accessible names = the labels).
    for (const label of ['Sheet (formulas)', 'Chart', 'Live widget (BQL)', 'Whiteboard', 'Sticker / emoji', 'Callout / panel', 'Work item', 'File (any type)', 'Table of contents']) {
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
});
