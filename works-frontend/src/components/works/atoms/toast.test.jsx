import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { Toast } from './toast';

describe('Toast', () => {
  it('keeps an always-mounted polite live region when there is no toast', () => {
    render(<Toast toast={null} />);
    const region = screen.getByRole('status');
    expect(region).toHaveAttribute('aria-live', 'polite');
    expect(region).toBeEmptyDOMElement();
  });

  it('renders a success message in a polite status region', () => {
    render(<Toast toast={{ message: 'Saved', type: 'success' }} />);
    const region = screen.getByRole('status');
    expect(region).toHaveAttribute('aria-live', 'polite');
    expect(screen.getByText('Saved')).toBeInTheDocument();
  });

  it('renders an error message in an assertive alert region', () => {
    render(<Toast toast={{ message: 'Failed', type: 'error' }} />);
    const region = screen.getByRole('alert');
    expect(region).toHaveAttribute('aria-live', 'assertive');
    expect(screen.getByText('Failed')).toBeInTheDocument();
  });

  it('shows an Undo action only when undoable', async () => {
    const onUndo = vi.fn();
    const user = userEvent.setup();
    render(<Toast toast={{ message: 'Deleted', type: 'undo' }} canUndo onUndo={onUndo} />);
    await user.click(screen.getByRole('button', { name: 'Undo' }));
    expect(onUndo).toHaveBeenCalledTimes(1);
  });

  it('hides Undo when not undoable', () => {
    render(<Toast toast={{ message: 'Deleted', type: 'undo' }} canUndo={false} />);
    expect(screen.queryByRole('button', { name: 'Undo' })).not.toBeInTheDocument();
  });
});
