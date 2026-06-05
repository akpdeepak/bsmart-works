import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { SlaView } from './sla-view';
import { api } from '@/lib/apiClient';

vi.mock('@/lib/apiClient', () => ({
  api: { send: vi.fn(), raw: vi.fn() },
}));

describe('SlaView', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    api.send.mockResolvedValue([]);
  });

  it('renders the header and section tabs', async () => {
    render(<SlaView workspaceId="WS-001" />);
    expect(screen.getByRole('heading', { name: /SLA Engine/i })).toBeInTheDocument();
    expect(screen.getByRole('tab', { name: /Policies/i })).toBeInTheDocument();
    expect(screen.getByRole('tab', { name: /Live clocks/i })).toBeInTheDocument();
    expect(await screen.findByText(/No SLA policies yet/i)).toBeInTheDocument();
  });

  it('hides write controls when the user cannot manage SLAs', async () => {
    render(<SlaView workspaceId="WS-001" canManage={false} />);
    await screen.findByText(/No SLA policies yet/i);
    expect(screen.queryByRole('button', { name: /New policy/i })).not.toBeInTheDocument();
  });

  it('shows the New policy control for managers', async () => {
    render(<SlaView workspaceId="WS-001" canManage />);
    expect(await screen.findByRole('button', { name: /New policy/i })).toBeInTheDocument();
  });

  it('loads live clocks when the Live clocks tab is selected', async () => {
    const user = userEvent.setup();
    render(<SlaView workspaceId="WS-001" />);
    await screen.findByText(/No SLA policies yet/i);
    await user.click(screen.getByRole('tab', { name: /Live clocks/i }));
    expect(await screen.findByText(/No live SLA clocks/i)).toBeInTheDocument();
    expect(api.send).toHaveBeenCalledWith(expect.stringContaining('/sla/instances?workspaceId=WS-001'));
  });

  it('surfaces an error state when loading fails', async () => {
    api.send.mockRejectedValueOnce(new Error('boom'));
    render(<SlaView workspaceId="WS-001" />);
    expect(await screen.findByText('boom')).toBeInTheDocument();
  });
});
