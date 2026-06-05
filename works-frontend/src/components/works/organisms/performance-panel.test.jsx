import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import { PerformancePanel } from './performance-panel';
import { kpiClient } from '@/lib/kpi';

vi.mock('@/lib/kpi', async () => {
  const actual = await vi.importActual('@/lib/kpi');
  return {
    ...actual,
    kpiClient: { personal: vi.fn(), org: vi.fn(), manager: vi.fn() },
  };
});

const PERSONAL = {
  scopeLevel: 'INDIVIDUAL', scopeId: 'me', label: 'Personal', privacyNote: '',
  metrics: [{ key: 'throughput', label: 'Throughput', value: 5, unit: 'count', sampleSize: 8 }],
};

describe('PerformancePanel', () => {
  beforeEach(() => vi.clearAllMocks());

  it('shows the personal layer with a privacy message by default', async () => {
    kpiClient.personal.mockResolvedValue(PERSONAL);
    render(<PerformancePanel workspaceId="ws-1" />);
    await waitFor(() => expect(kpiClient.personal).toHaveBeenCalledWith('ws-1'));
    expect(await screen.findByText('Throughput')).toBeInTheDocument();
    expect(screen.getByText(/private metrics/i)).toBeInTheDocument();
  });

  it('shows the manager privacy guardrail callout when switching to Manager', async () => {
    kpiClient.personal.mockResolvedValue(PERSONAL);
    kpiClient.manager.mockResolvedValue([]);
    render(<PerformancePanel workspaceId="ws-1" />);
    fireEvent.click(await screen.findByRole('tab', { name: 'Manager' }));
    await waitFor(() => expect(kpiClient.manager).toHaveBeenCalledWith('ws-1'));
    expect(await screen.findByText(/comparison is unavailable by design/i)).toBeInTheDocument();
  });
});
