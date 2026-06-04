import { render, screen } from '@testing-library/react';
import { SlaBadge } from './sla-badge';

describe('SlaBadge', () => {
  it('renders remaining time for a running clock', () => {
    render(<SlaBadge instance={{ status: 'RUNNING', remainingSeconds: 7440, consumedPercent: 30, metric: 'RESOLUTION', color: 'success' }} />);
    expect(screen.getByText('2h 4m')).toBeInTheDocument();
  });

  it('uses success tone when more than half the time remains', () => {
    const { container } = render(<SlaBadge instance={{ status: 'RUNNING', remainingSeconds: 3600, color: 'success', metric: 'RESOLUTION' }} />);
    expect(container.firstChild).toHaveClass('bg-semantic-success-surface');
  });

  it('uses warning tone as the clock approaches breach', () => {
    const { container } = render(<SlaBadge instance={{ status: 'RUNNING', remainingSeconds: 600, color: 'warning', metric: 'RESOLUTION' }} />);
    expect(container.firstChild).toHaveClass('bg-semantic-warning-surface');
  });

  it('shows a pulsing danger badge on breach', () => {
    const { container } = render(<SlaBadge instance={{ status: 'BREACHED', remainingSeconds: 0, color: 'danger', metric: 'RESOLUTION' }} />);
    expect(screen.getByText('SLA breached')).toBeInTheDocument();
    expect(container.firstChild).toHaveClass('bg-semantic-danger-surface');
    expect(container.firstChild).toHaveClass('animate-pulse');
  });

  it('labels met, paused and pending states', () => {
    const { rerender } = render(<SlaBadge instance={{ status: 'MET', metric: 'RESOLUTION' }} />);
    expect(screen.getByText('SLA met')).toBeInTheDocument();
    rerender(<SlaBadge instance={{ status: 'PAUSED', metric: 'RESOLUTION' }} />);
    expect(screen.getByText('SLA paused')).toBeInTheDocument();
    rerender(<SlaBadge instance={{ status: 'PENDING', metric: 'RESOLUTION' }} />);
    expect(screen.getByText('SLA pending')).toBeInTheDocument();
  });

  it('renders nothing without an instance', () => {
    const { container } = render(<SlaBadge instance={null} />);
    expect(container.firstChild).toBeNull();
  });
});
