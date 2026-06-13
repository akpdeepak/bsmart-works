import { describe, it, beforeEach, vi } from 'vitest';
import { render, screen, fireEvent } from '@testing-library/react';
import { expectNoA11yViolations } from '@/test/a11y';

// SLA Engine fetches its own workspace-scoped data through the single apiClient. We mock api.send
// per endpoint so each of the four tabs (Policies incl. the targets/escalations editor, Live
// clocks, Report incl. the by-policy table, Audit) renders, then sweep for serious/critical issues.

const { send, raw } = vi.hoisted(() => ({ send: vi.fn(), raw: vi.fn() }));
vi.mock('@/lib/apiClient', () => ({ api: { send, raw } }));

import { SlaView } from './sla-view';

const POLICIES = [{ id: 'PL-1', name: 'P0 resolution', description: 'Resolve P0 in 4h', scopeBql: 'priority = "P0"', active: true, customerTier: 'GOLD' }];
const CALENDARS = [{ id: 'CAL-1', name: 'Business hours' }];
const POLICY_DETAIL = {
  targets: [{ id: 'TG-1', metric: 'RESOLUTION', targetMinutes: 240, startStatus: '', stopStatus: 'Done', pauseStatuses: '[]' }],
  escalations: [{ id: 'ES-1', thresholdPercent: 80, onBreach: false, action: 'NOTIFY' }],
};
const CLOCKS = [{ id: 'CK-1', metric: 'RESOLUTION', state: 'RUNNING', band: 'OK', remainingMinutes: 120, workItemId: 'WI-1', dueAt: '2026-06-13T18:00:00Z' }];
const REPORT = {
  summary: { met: 10, breached: 2, running: 3, breachRatePercent: 17 },
  byPolicy: [{ id: 'PL-1', name: 'P0 resolution', met: 10, breached: 2, active: 3 }],
};
const AUDIT = [{ event_type: 'SLA_BREACHED', aggregate_id: 'WI-1', occurred_at: '2026-06-12T10:00:00Z' }];

// Route api.send by URL so policy load (parallel policies+calendars) and the targets editor
// (per-policy GET) all resolve with the right shape.
function routeSend(url) {
  if (url.includes('/sla/policies/') && !url.endsWith('/preview')) return Promise.resolve(POLICY_DETAIL);
  if (url.startsWith('/sla/policies')) return Promise.resolve(POLICIES);
  if (url.startsWith('/sla/calendars')) return Promise.resolve(CALENDARS);
  if (url.startsWith('/sla/instances')) return Promise.resolve(CLOCKS);
  if (url.startsWith('/sla/report')) return Promise.resolve(REPORT);
  if (url.startsWith('/sla/audit')) return Promise.resolve(AUDIT);
  return Promise.resolve([]);
}

async function sweepTab(tabName, settle) {
  const { container } = render(<SlaView workspaceId="WS-001" canManage onToast={vi.fn()} />);
  fireEvent.click(await screen.findByRole('tab', { name: tabName }));
  await settle();
  await expectNoA11yViolations(container);
}

describe('SlaView a11y', () => {
  beforeEach(() => { vi.clearAllMocks(); send.mockImplementation(routeSend); });

  it('policies tab (list + manage controls) has no serious/critical violations', async () => {
    const { container } = render(<SlaView workspaceId="WS-001" canManage onToast={vi.fn()} />);
    await screen.findByText('P0 resolution');
    await expectNoA11yViolations(container);
  });

  it('live clocks tab has no serious/critical violations', async () => {
    await sweepTab(/Live clocks/i, () => screen.findByText('WI-1'));
  });

  it('report tab (KPI cards + by-policy table) has no serious/critical violations', async () => {
    await sweepTab(/Report/i, () => screen.findByText(/Breach rate/i));
  });

  it('audit tab has no serious/critical violations', async () => {
    await sweepTab(/Audit/i, () => screen.findByText('BREACHED'));
  });

  it('empty policies state (no manage rights) has no serious/critical violations', async () => {
    send.mockImplementation((url) => (url.startsWith('/sla/calendars') ? Promise.resolve([]) : Promise.resolve([])));
    const { container } = render(<SlaView workspaceId="WS-001" canManage={false} onToast={vi.fn()} />);
    await screen.findByText('No SLA policies yet');
    await expectNoA11yViolations(container);
  });

  it('error state has no serious/critical violations', async () => {
    send.mockRejectedValue(new Error('boom'));
    const { container } = render(<SlaView workspaceId="WS-001" canManage onToast={vi.fn()} />);
    await screen.findByText('boom');
    await expectNoA11yViolations(container);
  });
});
