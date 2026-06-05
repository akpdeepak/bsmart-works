import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { ServiceManagementView } from './service-management-view';
import { api } from '@/lib/apiClient';

vi.mock('@/lib/apiClient', () => ({
  api: { send: vi.fn(), raw: vi.fn() },
}));

describe('ServiceManagementView', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    api.send.mockResolvedValue([]);
  });

  it('renders the header and section tabs', async () => {
    render(<ServiceManagementView workspaceId="WS-001" />);
    expect(screen.getByRole('heading', { name: /Service Management/i })).toBeInTheDocument();
    expect(screen.getByRole('tab', { name: /Queues/i })).toBeInTheDocument();
    expect(screen.getByRole('tab', { name: /Request types/i })).toBeInTheDocument();
    expect(screen.getByRole('tab', { name: /Customers/i })).toBeInTheDocument();
    expect(await screen.findByText(/No requests in this queue/i)).toBeInTheDocument();
  });

  it('exposes the agent queue filters', async () => {
    render(<ServiceManagementView workspaceId="WS-001" />);
    expect(await screen.findByText(/No requests in this queue/i)).toBeInTheDocument();
    expect(screen.getByRole('tab', { name: /All open/i })).toBeInTheDocument();
    expect(screen.getByRole('tab', { name: /Unassigned/i })).toBeInTheDocument();
    expect(screen.getByRole('tab', { name: /High priority/i })).toBeInTheDocument();
  });

  it('hides write controls when the user cannot manage service', async () => {
    const user = userEvent.setup();
    render(<ServiceManagementView workspaceId="WS-001" canManage={false} />);
    await screen.findByText(/No requests in this queue/i);
    await user.click(screen.getByRole('tab', { name: /Customers/i }));
    await screen.findByText(/No customers yet/i);
    expect(screen.queryByRole('button', { name: /New customer/i })).not.toBeInTheDocument();
  });

  it('shows the New customer control for managers', async () => {
    const user = userEvent.setup();
    render(<ServiceManagementView workspaceId="WS-001" canManage />);
    await screen.findByText(/No requests in this queue/i);
    await user.click(screen.getByRole('tab', { name: /Customers/i }));
    expect(await screen.findByRole('button', { name: /New customer/i })).toBeInTheDocument();
  });

  it('loads CSAT trends when the CSAT tab is selected', async () => {
    const user = userEvent.setup();
    render(<ServiceManagementView workspaceId="WS-001" />);
    await screen.findByText(/No requests in this queue/i);
    api.send.mockResolvedValueOnce({ average: 0, count: 0, distribution: {} });
    await user.click(screen.getByRole('tab', { name: /CSAT/i }));
    expect(await screen.findByText(/No CSAT responses yet/i)).toBeInTheDocument();
    expect(api.send).toHaveBeenCalledWith(expect.stringContaining('/service/requests/csat?workspaceId=WS-001'));
  });

  it('surfaces an error state when loading fails', async () => {
    api.send.mockRejectedValueOnce(new Error('boom'));
    render(<ServiceManagementView workspaceId="WS-001" />);
    expect(await screen.findByText('boom')).toBeInTheDocument();
  });
});
