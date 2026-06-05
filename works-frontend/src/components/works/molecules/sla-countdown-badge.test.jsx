import { describe, it, expect } from 'vitest';
import { render, screen } from '@testing-library/react';
import { SlaCountdownBadge } from './sla-countdown-badge';

describe('SlaCountdownBadge', () => {
  it('renders a running resolution clock as "Resolve in <time>"', () => {
    render(<SlaCountdownBadge metric="RESOLUTION" state="RUNNING" band="OK" remainingMinutes={134} />);
    expect(screen.getByText('Resolve in 2h 14m')).toBeInTheDocument();
  });

  it('uses the warning tone when near breach', () => {
    render(<SlaCountdownBadge metric="RESOLUTION" state="RUNNING" band="WARN" remainingMinutes={30} />);
    const badge = screen.getByText(/Resolve in 30m/);
    expect(badge.className).toMatch(/semantic-warning/);
  });

  it('renders a breached clock with danger tone and pulse', () => {
    render(<SlaCountdownBadge metric="RESOLUTION" state="BREACHED" band="BREACH" remainingMinutes={0} />);
    const badge = screen.getByText(/breached/i);
    expect(badge.className).toMatch(/semantic-danger/);
    expect(badge.className).toMatch(/animate-pulse/);
  });

  it('renders a met clock with success tone', () => {
    render(<SlaCountdownBadge metric="FIRST_RESPONSE" state="MET" band="MET" remainingMinutes={0} />);
    const badge = screen.getByText(/Respond SLA met/);
    expect(badge.className).toMatch(/semantic-success/);
  });

  it('marks a paused clock as paused (not colour alone — accessibility)', () => {
    render(<SlaCountdownBadge metric="RESOLUTION" state="PAUSED" band="OK" remainingMinutes={120} />);
    expect(screen.getByText(/\(paused\)/)).toBeInTheDocument();
  });

  it('exposes an aria-label describing the full status', () => {
    render(<SlaCountdownBadge metric="RESOLUTION" state="RUNNING" band="OK" remainingMinutes={60} />);
    expect(screen.getByLabelText(/SLA: Resolve in 1h/)).toBeInTheDocument();
  });
});
