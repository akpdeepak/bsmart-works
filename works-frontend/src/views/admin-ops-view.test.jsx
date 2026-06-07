import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import AdminOpsView from './admin-ops-view';
import { adminOpsClient } from '@/lib/adminOps';

vi.mock('@/lib/adminOps', () => ({
  adminOpsClient: {
    health: vi.fn(),
    playbooks: vi.fn(),
    runs: vi.fn(),
    run: vi.fn(),
    startRun: vi.fn(),
    completeStep: vi.fn(),
    cancelRun: vi.fn(),
    licenseSeats: vi.fn(),
    aiCost: vi.fn(),
    auditLog: vi.fn(),
    auditEventTypes: vi.fn(),
    savedQueries: vi.fn(),
    integrationHealth: vi.fn(),
    retryDelivery: vi.fn(),
    accessReviews: vi.fn(),
    startAccessReview: vi.fn(),
    deactivateMember: vi.fn(),
    completeAccessReview: vi.fn(),
    evidencePackages: vi.fn(),
    generateEvidence: vi.fn(),
  },
}));

const HEALTH = {
  members: 12, projects: 3, workItems: 240, storageBytes: 2048,
  eventsToday: 18, integrations: 4, integrationsDown: 1, failedWebhookDeliveries: 2,
  aiBudgetPercent: 42, aiBudgetState: 'OK',
};

describe('AdminOpsView', () => {
  beforeEach(() => vi.clearAllMocks());

  it('renders the workspace health monitor from the API', async () => {
    adminOpsClient.health.mockResolvedValue(HEALTH);
    render(<AdminOpsView workspaceId="WS-001" />);
    expect(await screen.findByText('12')).toBeInTheDocument();   // members
    expect(screen.getByText('240')).toBeInTheDocument();         // work items
    expect(screen.getByText('42%')).toBeInTheDocument();         // AI budget
    expect(adminOpsClient.health).toHaveBeenCalledWith('WS-001');
  });

  it('generates a compliance evidence package', async () => {
    adminOpsClient.health.mockResolvedValue(HEALTH);
    adminOpsClient.evidencePackages.mockResolvedValue([]);
    adminOpsClient.generateEvidence.mockResolvedValue({
      id: 'EVP-1', framework: 'SOC2', period: '2026-06', content: '# SOC2 evidence package\n- MFA adoption: 80%',
    });

    render(<AdminOpsView workspaceId="WS-001" onToast={vi.fn()} />);
    fireEvent.click(await screen.findByRole('tab', { name: /Evidence/i }));
    fireEvent.click(await screen.findByRole('button', { name: /SOC 2/i }));

    await waitFor(() => expect(adminOpsClient.generateEvidence).toHaveBeenCalledWith('WS-001', 'SOC2'));
    expect(await screen.findByText(/MFA adoption: 80%/)).toBeInTheDocument();
  });

  it('retries a failed webhook delivery from integration health', async () => {
    adminOpsClient.health.mockResolvedValue(HEALTH);
    adminOpsClient.integrationHealth.mockResolvedValue({
      connections: [{ id: 'C1', provider: 'slack', name: 'Eng', status: 'CONNECTED' }],
      failedDeliveries: [{ id: 'D1', event_type: 'work_item.created', attempts: 3, max_attempts: 5, response_code: 500, last_error: 'timeout' }],
    });
    adminOpsClient.retryDelivery.mockResolvedValue({ id: 'D1', status: 'PENDING' });

    render(<AdminOpsView workspaceId="WS-001" onToast={vi.fn()} />);
    fireEvent.click(await screen.findByRole('tab', { name: /Integrations/i }));
    fireEvent.click(await screen.findByRole('button', { name: /retry/i }));

    await waitFor(() => expect(adminOpsClient.retryDelivery).toHaveBeenCalledWith('WS-001', 'D1'));
  });
});
