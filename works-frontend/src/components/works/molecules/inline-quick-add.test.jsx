import { describe, it, expect, vi } from 'vitest';
import { render, screen, fireEvent } from '@testing-library/react';
import { InlineQuickAdd } from './inline-quick-add';

describe('InlineQuickAdd', () => {
  it('renders a title input and type selector', () => {
    render(<InlineQuickAdd onSave={vi.fn()} onCancel={vi.fn()} />);
    expect(screen.getByRole('textbox', { name: /title/i })).toBeInTheDocument();
    expect(screen.getByRole('combobox', { name: /type/i })).toBeInTheDocument();
  });

  it('focuses the title input on mount', () => {
    render(<InlineQuickAdd onSave={vi.fn()} onCancel={vi.fn()} />);
    expect(document.activeElement).toBe(screen.getByRole('textbox', { name: /title/i }));
  });

  it('calls onCancel when Escape is pressed', () => {
    const onCancel = vi.fn();
    render(<InlineQuickAdd onSave={vi.fn()} onCancel={onCancel} />);
    fireEvent.keyDown(screen.getByRole('textbox', { name: /title/i }), { key: 'Escape' });
    expect(onCancel).toHaveBeenCalledOnce();
  });

  it('does not call onSave when title is fewer than 3 characters', () => {
    const onSave = vi.fn();
    render(<InlineQuickAdd onSave={onSave} onCancel={vi.fn()} />);
    fireEvent.change(screen.getByRole('textbox', { name: /title/i }), { target: { value: 'ab' } });
    fireEvent.keyDown(screen.getByRole('textbox', { name: /title/i }), { key: 'Enter' });
    expect(onSave).not.toHaveBeenCalled();
  });

  it('calls onSave with trimmed title and selected type on Enter', () => {
    const onSave = vi.fn().mockResolvedValue({});
    render(<InlineQuickAdd onSave={onSave} onCancel={vi.fn()} />);
    const input = screen.getByRole('textbox', { name: /title/i });
    fireEvent.change(input, { target: { value: '  Fix login bug  ' } });
    fireEvent.keyDown(input, { key: 'Enter' });
    expect(onSave).toHaveBeenCalledWith({ title: 'Fix login bug', type: 'TASK' });
  });

  it('calls onSave with the selected type', () => {
    const onSave = vi.fn().mockResolvedValue({});
    render(<InlineQuickAdd onSave={onSave} onCancel={vi.fn()} />);
    fireEvent.change(screen.getByRole('textbox', { name: /title/i }), { target: { value: 'Add login feature' } });
    fireEvent.change(screen.getByRole('combobox', { name: /type/i }), { target: { value: 'STORY' } });
    fireEvent.keyDown(screen.getByRole('textbox', { name: /title/i }), { key: 'Enter' });
    expect(onSave).toHaveBeenCalledWith({ title: 'Add login feature', type: 'STORY' });
  });

  it('displays an error message when error prop is set', () => {
    render(<InlineQuickAdd onSave={vi.fn()} onCancel={vi.fn()} error="Network error" />);
    expect(screen.getByRole('alert')).toHaveTextContent('Network error');
  });

  it('disables controls while saving', () => {
    render(<InlineQuickAdd onSave={vi.fn()} onCancel={vi.fn()} saving />);
    expect(screen.getByRole('textbox', { name: /title/i })).toBeDisabled();
    expect(screen.getByRole('combobox', { name: /type/i })).toBeDisabled();
  });
});
