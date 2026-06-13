import { describe, it, expect, vi } from 'vitest';
import { render, screen, within } from '@testing-library/react';
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
});
