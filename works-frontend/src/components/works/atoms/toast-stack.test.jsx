import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen, fireEvent } from '@testing-library/react';

// Mock the hook and the dismiss function so tests control state without timers.
vi.mock('@/hooks/use-toast-queue', () => ({
  useToastQueue: vi.fn(() => ({ visible: [], queue: [] })),
}));

vi.mock('@/lib/toast-queue', () => ({
  dismissToast: vi.fn(),
}));

// Import after mocks are set up.
import { useToastQueue } from '@/hooks/use-toast-queue';
import { dismissToast } from '@/lib/toast-queue';
import { ToastStack } from './toast-stack';

beforeEach(() => {
  vi.clearAllMocks();
  // Default: empty state
  useToastQueue.mockReturnValue({ visible: [], queue: [] });
});

describe('ToastStack', () => {
  it('renders nothing when there are no visible toasts', () => {
    render(<ToastStack />);
    // The outer container is always rendered but has no toast items.
    expect(screen.queryByRole('status')).toBeNull();
  });

  it('renders visible toasts from queue state', () => {
    useToastQueue.mockReturnValue({
      visible: [
        { id: 1, message: 'Toast A', tone: 'info', duration: 4000 },
        { id: 2, message: 'Toast B', tone: 'success', duration: 4000 },
      ],
      queue: [],
    });
    render(<ToastStack />);
    expect(screen.getByText('Toast A')).toBeInTheDocument();
    expect(screen.getByText('Toast B')).toBeInTheDocument();
  });

  it('each toast has role="status" for polite announcements', () => {
    useToastQueue.mockReturnValue({
      visible: [
        { id: 1, message: 'Status toast', tone: 'info', duration: 4000 },
      ],
      queue: [],
    });
    render(<ToastStack />);
    const statusEls = screen.getAllByRole('status');
    expect(statusEls.length).toBeGreaterThanOrEqual(1);
  });

  it('shows +N badge when there are pending (queued) toasts', () => {
    useToastQueue.mockReturnValue({
      visible: [
        { id: 1, message: 'Visible', tone: 'info', duration: 4000 },
        { id: 2, message: 'Visible 2', tone: 'info', duration: 4000 },
        { id: 3, message: 'Visible 3', tone: 'info', duration: 4000 },
      ],
      queue: [
        { id: 4, message: 'Queued 1', tone: 'info', duration: 4000 },
        { id: 5, message: 'Queued 2', tone: 'info', duration: 4000 },
      ],
    });
    render(<ToastStack />);
    expect(screen.getByText('+2 more')).toBeInTheDocument();
  });

  it('does not show the +N badge when queue is empty', () => {
    useToastQueue.mockReturnValue({
      visible: [{ id: 1, message: 'One', tone: 'info', duration: 4000 }],
      queue: [],
    });
    render(<ToastStack />);
    expect(screen.queryByText(/more/)).toBeNull();
  });

  it('clicking the dismiss button calls dismissToast with the correct id', () => {
    useToastQueue.mockReturnValue({
      visible: [{ id: 42, message: 'Dismiss me', tone: 'warning', duration: 4000 }],
      queue: [],
    });
    render(<ToastStack />);
    const dismissBtn = screen.getByRole('button', { name: 'Dismiss' });
    fireEvent.click(dismissBtn);
    expect(dismissToast).toHaveBeenCalledWith(42);
  });

  it('renders the action button when toast has an action', () => {
    const onClick = vi.fn();
    useToastQueue.mockReturnValue({
      visible: [
        { id: 1, message: 'With action', tone: 'info', duration: 4000, action: { label: 'Undo', onClick } },
      ],
      queue: [],
    });
    render(<ToastStack />);
    const actionBtn = screen.getByRole('button', { name: 'Undo' });
    expect(actionBtn).toBeInTheDocument();
    fireEvent.click(actionBtn);
    expect(onClick).toHaveBeenCalledTimes(1);
  });

  it('applies correct tone classes for danger tone', () => {
    useToastQueue.mockReturnValue({
      visible: [{ id: 1, message: 'Error!', tone: 'danger', duration: 4000 }],
      queue: [],
    });
    const { container } = render(<ToastStack />);
    // The toast item div should have the danger semantic class
    const toastEl = container.querySelector('[role="status"]');
    expect(toastEl.className).toContain('semantic-danger');
  });

  it('container has aria-label "Notifications"', () => {
    const { container } = render(<ToastStack />);
    // The container is a div (not a landmark), so query by attribute directly.
    const el = container.querySelector('[aria-label="Notifications"]');
    expect(el).toBeTruthy();
  });
});
