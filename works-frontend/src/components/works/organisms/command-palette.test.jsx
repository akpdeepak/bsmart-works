import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { CommandPalette } from './command-palette';

const commands = [
  { id: 'home', label: 'Home', group: 'Go to', run: vi.fn() },
  { id: 'board', label: 'Board', group: 'Go to', keywords: ['kanban'], run: vi.fn() },
  { id: 'create', label: 'Create work item', group: 'Action', run: vi.fn() },
];

describe('CommandPalette', () => {
  beforeEach(() => {
    commands.forEach((c) => c.run.mockClear());
  });

  it('renders as an accessible combobox/listbox dialog with all commands', () => {
    render(<CommandPalette onClose={() => {}} commands={commands} />);
    expect(screen.getByRole('dialog')).toHaveAttribute('aria-modal', 'true');
    expect(screen.getByRole('combobox')).toBeInTheDocument();
    expect(screen.getAllByRole('option')).toHaveLength(3);
  });

  it('focuses the input on mount', () => {
    render(<CommandPalette onClose={() => {}} commands={commands} />);
    expect(screen.getByRole('combobox')).toHaveFocus();
  });

  it('filters by label and keyword', async () => {
    const user = userEvent.setup();
    render(<CommandPalette onClose={() => {}} commands={commands} />);
    await user.keyboard('kanban'); // matches Board via keywords
    const options = screen.getAllByRole('option');
    expect(options).toHaveLength(1);
    expect(options[0]).toHaveTextContent('Board');
  });

  it('runs the active command on Enter and closes', async () => {
    const onClose = vi.fn();
    const user = userEvent.setup();
    render(<CommandPalette onClose={onClose} commands={commands} />);
    await user.keyboard('{ArrowDown}{Enter}'); // move to second option, run it
    expect(commands[1].run).toHaveBeenCalledTimes(1);
    expect(onClose).toHaveBeenCalledTimes(1);
  });

  it('runs a command on click', async () => {
    const onClose = vi.fn();
    const user = userEvent.setup();
    render(<CommandPalette onClose={onClose} commands={commands} />);
    await user.click(screen.getByRole('option', { name: /Create work item/ }));
    expect(commands[2].run).toHaveBeenCalled();
    expect(onClose).toHaveBeenCalled();
  });

  it('closes on Escape', async () => {
    const onClose = vi.fn();
    const user = userEvent.setup();
    render(<CommandPalette onClose={onClose} commands={commands} />);
    await user.keyboard('{Escape}');
    expect(onClose).toHaveBeenCalledTimes(1);
  });

  it('shows an empty state when nothing matches', async () => {
    const user = userEvent.setup();
    render(<CommandPalette onClose={() => {}} commands={commands} />);
    await user.keyboard('zzzzz');
    expect(screen.queryByRole('option')).not.toBeInTheDocument();
    expect(screen.getByText(/No matches/)).toBeInTheDocument();
  });
});
