import { describe, it, beforeEach, vi } from 'vitest';
import { render, screen, fireEvent } from '@testing-library/react';
import { expectNoA11yViolations } from '@/test/a11y';

// Admin Operations Center fetches its own workspace-scoped, admin-gated data via adminOpsClient.
// We mock the full client (every tab's shape) so all 8 tabs render, then sweep each for
// serious/critical a11y violations.

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

import AdminOpsView from './admin-ops-view';
import { adminOpsClient } from '@/lib/adminOps';

const HEALTH = {
  members: 12, projects: 3, workItems: 240, storageBytes: 2048,
  eventsToday: 18, integrations: 4, integrationsDown: 1, failedWebhookDeliveries: 2,
  aiBudgetPercent: 42, aiBudgetState: 'OK',
};
const SEATS = {
  planName: 'Enterprise', activeSeats: 40, totalSeats: 50, availableSeats: 10, utilizationPercent: 80,
  costPerSeatCents: 1500, monthlyCostCents: 60000, renewalDate: '2026-12-01', renewalAlert: false, growthProjection: 5,
};
const AICOST = {
  period: '2026-06', spentCents: 4200, capCents: 10000, percent: 42, degraded: false, disabled: false, alert: null,
  byCapability: [{ capability: 'KPI_NARRATIVE', calls: 12, cache_hits: 3, fallbacks: 1, cost_cents: 2100 }],
  byUser: [{ full_name: 'Asha Rao', user_id: 'u-1', calls: 8, cost_cents: 1400 }],
};
const AUDIT = {
  log: { total: 1, events: [{ id: 'E-1', event_type: 'member.added', actor_name: 'Asha', aggregate_id: 'M-1', occurred_at: '2026-06-12T10:00:00Z' }] },
  eventTypes: ['member.added', 'work_item.created'],
  saved: [{ id: 'Q-1', name: 'Member changes', eventType: 'member.added' }],
};
const INTEGRATIONS = {
  connections: [{ id: 'C-1', provider: 'slack', name: 'Eng', status: 'CONNECTED' }],
  failedDeliveries: [{ id: 'D-1', event_type: 'work_item.created', attempts: 3, max_attempts: 5, response_code: 500, last_error: 'timeout' }],
};
const LIFECYCLE = {
  playbooks: [{ playbook: { id: 'PB-1', name: 'Onboarding', kind: 'JOINER' } }],
  runs: [{ id: 'RUN-1', subjectName: 'New Hire', kind: 'JOINER', status: 'IN_PROGRESS', startedAt: '2026-06-12T09:00:00Z' }],
};
const ACCESS = { reviews: [{ id: 'AR-1', startedAt: '2026-06-01T09:00:00Z', status: 'COMPLETED', reviewedCount: 12, deactivatedCount: 2 }] };
const EVIDENCE = [{ id: 'EVP-1', framework: 'SOC2', period: '2026-06', generatedAt: '2026-06-10T09:00:00Z' }];

function mockAll() {
  adminOpsClient.health.mockResolvedValue(HEALTH);
  adminOpsClient.playbooks.mockResolvedValue(LIFECYCLE.playbooks);
  adminOpsClient.runs.mockResolvedValue(LIFECYCLE.runs);
  adminOpsClient.licenseSeats.mockResolvedValue(SEATS);
  adminOpsClient.aiCost.mockResolvedValue(AICOST);
  adminOpsClient.auditLog.mockResolvedValue(AUDIT.log);
  adminOpsClient.auditEventTypes.mockResolvedValue(AUDIT.eventTypes);
  adminOpsClient.savedQueries.mockResolvedValue(AUDIT.saved);
  adminOpsClient.integrationHealth.mockResolvedValue(INTEGRATIONS);
  adminOpsClient.accessReviews.mockResolvedValue(ACCESS.reviews);
  adminOpsClient.evidencePackages.mockResolvedValue(EVIDENCE);
}

async function sweepTab(tabName, settle) {
  const { container } = render(<AdminOpsView workspaceId="WS-001" onToast={vi.fn()} />);
  fireEvent.click(await screen.findByRole('tab', { name: tabName }));
  await settle();
  await expectNoA11yViolations(container);
}

describe('AdminOpsView a11y', () => {
  beforeEach(() => { vi.clearAllMocks(); mockAll(); });

  it('health tab (stat grid) has no serious/critical violations', async () => {
    const { container } = render(<AdminOpsView workspaceId="WS-001" onToast={vi.fn()} />);
    await screen.findByText('240');
    await expectNoA11yViolations(container);
  });

  it('user lifecycle tab (form + runs) has no serious/critical violations', async () => {
    await sweepTab(/User lifecycle/i, () => screen.findByText('New Hire'));
  });

  it('licenses tab has no serious/critical violations', async () => {
    await sweepTab(/Licenses/i, () => screen.findByText('Enterprise'));
  });

  it('AI cost tab has no serious/critical violations', async () => {
    await sweepTab(/AI cost/i, () => screen.findByText('KPI_NARRATIVE'));
  });

  it('audit log tab (filters + events) has no serious/critical violations', async () => {
    // 'member.added' appears both as an event row and an <option> in the type filter; the saved-query
    // chip name is unique, so settle on it.
    await sweepTab(/Audit log/i, () => screen.findByRole('button', { name: 'Member changes' }));
  });

  it('integrations tab (connections + failed deliveries) has no serious/critical violations', async () => {
    await sweepTab(/Integrations/i, () => screen.findByText(/Eng/));
  });

  it('access review tab has no serious/critical violations', async () => {
    await sweepTab(/Access review/i, () => screen.findByText(/Start a review/));
  });

  it('evidence tab has no serious/critical violations', async () => {
    await sweepTab(/Evidence/i, () => screen.findByText(/audit-ready/i));
  });

  it('error state (failed load) has no serious/critical violations', async () => {
    adminOpsClient.health.mockRejectedValue(new Error('boom'));
    const { container } = render(<AdminOpsView workspaceId="WS-001" />);
    await screen.findByText("Couldn't load this view");
    await expectNoA11yViolations(container);
  });
});
