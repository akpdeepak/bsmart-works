import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen, waitFor } from '@testing-library/react';
import { AiBudgetNotice } from './ai-budget-notice';
import { aiClient } from '@/lib/ai';

vi.mock('@/lib/ai', async () => {
  const actual = await vi.importActual('@/lib/ai');
  return { ...actual, aiClient: { budget: vi.fn() } };
});

const HEALTHY = { period: '2026-06', capCents: 5000000, spentCents: 1000000, percent: 20, degraded: false, disabled: false };
const DEGRADED = { period: '2026-06', capCents: 5000000, spentCents: 4250000, percent: 85, degraded: true, disabled: false };
const DISABLED = { period: '2026-06', capCents: 5000000, spentCents: 5000000, percent: 100, degraded: true, disabled: true };

beforeEach(() => vi.clearAllMocks());

describe('AiBudgetNotice', () => {
  it('renders nothing when the budget is healthy (passed via prop)', () => {
    const { container } = render(<AiBudgetNotice status={HEALTHY} />);
    expect(container).toBeEmptyDOMElement();
  });

  it('shows the cheaper-tier banner when degraded', () => {
    render(<AiBudgetNotice status={DEGRADED} />);
    expect(screen.getByText(/cheaper tier/i)).toBeInTheDocument();
    expect(screen.getByText('85%')).toBeInTheDocument();
    expect(screen.getByRole('status')).toHaveAttribute('aria-live', 'polite');
  });

  it('shows the paused banner when disabled', () => {
    render(<AiBudgetNotice status={DISABLED} />);
    expect(screen.getByText(/AI paused/i)).toBeInTheDocument();
    expect(screen.getByText(/deterministic results/i)).toBeInTheDocument();
  });

  it('fetches the budget for a workspace and renders the degraded banner', async () => {
    aiClient.budget.mockResolvedValue(DEGRADED);
    render(<AiBudgetNotice workspaceId="ws-1" />);
    await waitFor(() => expect(aiClient.budget).toHaveBeenCalledWith('ws-1'));
    expect(await screen.findByText(/cheaper tier/i)).toBeInTheDocument();
  });

  it('renders nothing when the fetched budget is healthy', async () => {
    aiClient.budget.mockResolvedValue(HEALTHY);
    const { container } = render(<AiBudgetNotice workspaceId="ws-1" />);
    await waitFor(() => expect(aiClient.budget).toHaveBeenCalled());
    expect(container).toBeEmptyDOMElement();
  });

  it('stays silent (renders nothing) when the budget fetch fails', async () => {
    aiClient.budget.mockRejectedValue(new Error('boom'));
    const { container } = render(<AiBudgetNotice workspaceId="ws-1" />);
    await waitFor(() => expect(aiClient.budget).toHaveBeenCalled());
    expect(container).toBeEmptyDOMElement();
  });
});
