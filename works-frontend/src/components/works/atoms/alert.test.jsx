import { describe, it, expect, vi } from 'vitest';
import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { Alert } from './alert';

describe('Alert', () => {
  it('renders with role="alert"', () => {
    render(<Alert tone="info">Message</Alert>);
    expect(screen.getByRole('alert')).toBeInTheDocument();
  });

  it('renders title and body', () => {
    render(<Alert tone="success" title="Done">Item created</Alert>);
    expect(screen.getByText('Done')).toBeInTheDocument();
    expect(screen.getByText('Item created')).toBeInTheDocument();
  });

  it('renders without a title', () => {
    render(<Alert>No title here</Alert>);
    expect(screen.getByText('No title here')).toBeInTheDocument();
  });

  it('does NOT render a dismiss button when onDismiss is absent', () => {
    render(<Alert>Message</Alert>);
    expect(screen.queryByRole('button', { name: 'Dismiss' })).not.toBeInTheDocument();
  });

  it('renders and fires the dismiss button when onDismiss is provided', async () => {
    const onDismiss = vi.fn();
    const user = userEvent.setup();
    render(<Alert onDismiss={onDismiss}>Dismissible</Alert>);
    await user.click(screen.getByRole('button', { name: 'Dismiss' }));
    expect(onDismiss).toHaveBeenCalledOnce();
  });

  it.each(['info', 'success', 'warning', 'danger'])('renders tone=%s without crashing', (tone) => {
    render(<Alert tone={tone}>Message</Alert>);
    expect(screen.getByRole('alert')).toBeInTheDocument();
  });
});
