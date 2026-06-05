import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { AiControlPlaneView } from './ai-control-plane-view';
import { api } from '@/lib/apiClient';

vi.mock('@/lib/apiClient', () => ({ api: { send: vi.fn(), raw: vi.fn() } }));

describe('AiControlPlaneView', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    api.send.mockResolvedValue({
      policy: { mode: 'OPT_IN', defaultModelTier: 'SONNET' },
      capabilityToggles: [{ capability: 'NL_TO_BQL', enabled: true }],
      dataBoundary: { blockPii: true, blockFinancial: true },
    });
  });

  it('renders the header and all control-plane tabs', async () => {
    render(<AiControlPlaneView workspaceId="WS-001" />);
    expect(screen.getByRole('heading', { name: /AI Control Plane/i })).toBeInTheDocument();
    expect(screen.getByRole('tab', { name: /Policy/i })).toBeInTheDocument();
    expect(screen.getByRole('tab', { name: /Budget/i })).toBeInTheDocument();
    expect(screen.getByRole('tab', { name: /Fallbacks/i })).toBeInTheDocument();
    expect(await screen.findByText(/Workspace AI policy/i)).toBeInTheDocument();
  });

  it('loads the budget tab and shows the progress bar', async () => {
    const user = userEvent.setup();
    api.send.mockResolvedValueOnce({
      policy: {}, capabilityToggles: [], dataBoundary: {},
    });
    render(<AiControlPlaneView workspaceId="WS-001" />);
    await screen.findByText(/Workspace AI policy/i);
    api.send.mockResolvedValueOnce({
      periodMonth: '2026-06', capAmount: 100, spentAmount: 85, currency: 'INR',
      consumedPercent: 85, state: 'DEGRADED', degradeAtPercent: 80, disableAtPercent: 100,
    });
    await user.click(screen.getByRole('tab', { name: /Budget/i }));
    expect(await screen.findByRole('progressbar')).toBeInTheDocument();
    expect(screen.getByText('DEGRADED')).toBeInTheDocument();
  });

  it('surfaces an error state when loading fails', async () => {
    api.send.mockRejectedValueOnce(new Error('nope'));
    render(<AiControlPlaneView workspaceId="WS-001" />);
    expect(await screen.findByText('nope')).toBeInTheDocument();
  });
});
