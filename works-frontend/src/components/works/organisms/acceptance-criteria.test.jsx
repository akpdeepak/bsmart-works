import { describe, it, expect, vi } from 'vitest';
import { render, screen, fireEvent } from '@testing-library/react';
import { AcceptanceCriteria } from './acceptance-criteria';

describe('AcceptanceCriteria', () => {
  it('renders checkboxes with a done/total count', () => {
    render(<AcceptanceCriteria value={'- [ ] a\n- [x] b'} onSave={() => {}} />);
    expect(screen.getByText('1/2')).toBeInTheDocument();
    expect(screen.getByRole('checkbox', { name: 'a' })).not.toBeChecked();
    expect(screen.getByRole('checkbox', { name: 'b' })).toBeChecked();
  });

  it('toggling an item rewrites just that line and saves', () => {
    const onSave = vi.fn();
    render(<AcceptanceCriteria value={'- [ ] a\n- [x] b'} onSave={onSave} />);
    fireEvent.click(screen.getByRole('checkbox', { name: 'a' }));
    expect(onSave).toHaveBeenCalledWith('- [x] a\n- [x] b');
  });

  it('renders prose lines (Gherkin) as text, not checkboxes', () => {
    render(<AcceptanceCriteria value={'Given X\nWhen Y\nThen Z'} onSave={() => {}} />);
    expect(screen.getByText('Given X')).toBeInTheDocument();
    expect(screen.queryByRole('checkbox')).not.toBeInTheDocument();
  });

  it('adds a new criterion as an unchecked markdown line', () => {
    const onSave = vi.fn();
    render(<AcceptanceCriteria value={'- [ ] a'} onSave={onSave} />);
    fireEvent.change(screen.getByPlaceholderText('Add a criterion…'), { target: { value: 'new one' } });
    fireEvent.click(screen.getByRole('button', { name: 'Add' }));
    expect(onSave).toHaveBeenCalledWith('- [ ] a\n- [ ] new one');
  });

  it('shows an empty state when there are no criteria', () => {
    render(<AcceptanceCriteria value="" onSave={() => {}} />);
    expect(screen.getByText('No acceptance criteria yet.')).toBeInTheDocument();
  });

  it('hides editing affordances when readOnly', () => {
    render(<AcceptanceCriteria value={'- [ ] a'} onSave={() => {}} readOnly />);
    expect(screen.queryByRole('button', { name: 'Edit' })).not.toBeInTheDocument();
    expect(screen.queryByPlaceholderText('Add a criterion…')).not.toBeInTheDocument();
    expect(screen.getByRole('checkbox', { name: 'a' })).toBeDisabled();
  });
});
