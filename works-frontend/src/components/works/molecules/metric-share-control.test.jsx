import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { MetricShareControl } from './metric-share-control';
import { kpiClient } from '@/lib/kpi';
import { api } from '@/lib/apiClient';

// MetricShareControl reads the workspace member list via useWorkspaceUsers (TanStack Query), so each
// render needs a fresh QueryClient/provider — fresh so there is no cache bleed between tests.
function renderWith(ui) {
  const qc = new QueryClient({ defaultOptions: { queries: { retry: false } } });
  return render(<QueryClientProvider client={qc}>{ui}</QueryClientProvider>);
}

vi.mock('@/lib/kpi', async () => {
  const actual = await vi.importActual('@/lib/kpi');
  return {
    ...actual,
    kpiClient: { shares: vi.fn(), share: vi.fn(), unshare: vi.fn() },
  };
});

vi.mock('@/lib/apiClient', () => ({ api: { send: vi.fn() } }));

const USERS = [
  { id: 'u-1', fullName: 'Alice Admin', email: 'alice@x.io' },
  { id: 'u-2', fullName: 'Bob Builder', email: 'bob@x.io' },
];

beforeEach(() => {
  vi.clearAllMocks();
  api.send.mockResolvedValue(USERS);
  kpiClient.shares.mockResolvedValue([]);
  kpiClient.share.mockImplementation((_ws, viewerUserId) =>
    Promise.resolve({ id: 'SH-9', workspaceId: 'ws-1', ownerUserId: 'me', viewerUserId }));
  kpiClient.unshare.mockResolvedValue({ ok: true });
});

describe('MetricShareControl', () => {
  it('shows the empty state when nothing is shared yet', async () => {
    renderWith(<MetricShareControl workspaceId="ws-1" />);
    await waitFor(() => expect(kpiClient.shares).toHaveBeenCalledWith('ws-1'));
    expect(await screen.findByText(/not sharing your metrics with anyone yet/i)).toBeInTheDocument();
  });

  it('lists existing shares by member name', async () => {
    kpiClient.shares.mockResolvedValue([{ viewerUserId: 'u-1' }]);
    renderWith(<MetricShareControl workspaceId="ws-1" />);
    expect(await screen.findByText('Alice Admin')).toBeInTheDocument();
    expect(screen.getByRole('button', { name: /Revoke metric sharing with Alice Admin/ })).toBeInTheDocument();
  });

  it('adds a viewer and shows them in the list', async () => {
    renderWith(<MetricShareControl workspaceId="ws-1" />);
    await screen.findByText(/not sharing your metrics/i);
    fireEvent.change(screen.getByLabelText('Add viewer'), { target: { value: 'u-2' } });
    fireEvent.click(screen.getByRole('button', { name: 'Share' }));
    await waitFor(() => expect(kpiClient.share).toHaveBeenCalledWith('ws-1', 'u-2'));
    expect(await screen.findByText('Bob Builder')).toBeInTheDocument();
  });

  it('revokes a share and removes it from the list', async () => {
    kpiClient.shares.mockResolvedValue([{ viewerUserId: 'u-1' }]);
    renderWith(<MetricShareControl workspaceId="ws-1" />);
    await screen.findByText('Alice Admin');
    fireEvent.click(screen.getByRole('button', { name: /Revoke metric sharing with Alice Admin/ }));
    await waitFor(() => expect(kpiClient.unshare).toHaveBeenCalledWith('ws-1', 'u-1'));
    // The share row (and its revoke button) is gone; Alice may reappear in the add-viewer picker.
    await waitFor(() =>
      expect(screen.queryByRole('button', { name: /Revoke metric sharing with Alice Admin/ })).not.toBeInTheDocument());
  });

  it('surfaces an error if loading shares fails', async () => {
    kpiClient.shares.mockRejectedValue(new Error('Boom'));
    renderWith(<MetricShareControl workspaceId="ws-1" />);
    expect(await screen.findByRole('alert')).toHaveTextContent('Boom');
  });

  it('disables the viewer picker once everyone is already shared with', async () => {
    kpiClient.shares.mockResolvedValue([{ viewerUserId: 'u-1' }, { viewerUserId: 'u-2' }]);
    renderWith(<MetricShareControl workspaceId="ws-1" />);
    await screen.findByText('Alice Admin');
    expect(screen.getByLabelText('Add viewer')).toBeDisabled();
    expect(screen.getByText('No one left to add')).toBeInTheDocument();
  });
});
