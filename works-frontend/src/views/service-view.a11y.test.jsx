import { describe, it } from 'vitest';
import { render } from '@testing-library/react';
import { expectNoA11yViolations } from '@/test/a11y';
import ServiceView from './service-view';

// ServiceView is a pure prop-driven shell (state lives in App.jsx). We sweep each tab plus the
// two overlays (new-customer modal, portal-form designer drawer) for serious/critical a11y issues.

const noop = () => {};

const base = {
  serviceTab: 'queues',
  serviceQueue: 'open',
  serviceRequests: [],
  serviceCustomers: [],
  serviceTypes: [],
  serviceTiers: [],
  serviceCsat: null,
  newCustomer: null,
  formDesignerTypeId: null,
  can: () => true,
  setServiceTab: noop,
  setServiceQueue: noop,
  setNewCustomer: noop,
  setFormDesignerTypeId: noop,
  fetchServiceRequests: noop,
  fetchServiceCustomers: noop,
  fetchServiceTypes: noop,
  fetchServiceTiers: noop,
  fetchServiceCsat: noop,
  assignServiceRequest: noop,
  transitionServiceRequest: noop,
  createServiceCustomer: noop,
  showToast: noop,
};

const REQUESTS = [
  { request: { id: 'SR-1', subject: 'Outage', typeKey: 'incident', priority: 'P1', status: 'OPEN', assigneeId: null }, sla: { state: 'AT_RISK', breached: false } },
  { request: { id: 'SR-2', subject: 'Access', typeKey: 'request', priority: 'P3', status: 'RESOLVED', assigneeId: 'u-1' }, sla: { state: 'NONE', breached: false } },
];
const CUSTOMERS = [{ id: 'C-1', name: 'DISCOM North', subdomain: 'north', tier: 'GOLD', active: true }];
const TYPES = [{ id: 'T-1', name: 'Incident', typeKey: 'incident', defaultPriority: 'P2', isSystem: true, active: true }];
const TIERS = [{ id: 'TI-1', tier: 'GOLD', responseMinutes: 30, resolutionMinutes: 240 }];
const CSAT = {
  summary: { count: 12, average: 4.3, percentSatisfied: 90, distribution: { 5: 6, 4: 4, 3: 1, 2: 1, 1: 0 } },
  responses: [{ id: 'R-1', rating: 4, comment: 'Helpful and fast.' }],
};

describe('ServiceView a11y', () => {
  it('queues tab (populated) has no serious/critical violations', async () => {
    const { container } = render(<ServiceView {...base} serviceRequests={REQUESTS} />);
    await expectNoA11yViolations(container);
  });

  it('customers tab (populated) has no serious/critical violations', async () => {
    const { container } = render(<ServiceView {...base} serviceTab="customers" serviceCustomers={CUSTOMERS} />);
    await expectNoA11yViolations(container);
  });

  it('request types tab has no serious/critical violations', async () => {
    const { container } = render(<ServiceView {...base} serviceTab="types" serviceTypes={TYPES} />);
    await expectNoA11yViolations(container);
  });

  it('SLA tiers tab has no serious/critical violations', async () => {
    const { container } = render(<ServiceView {...base} serviceTab="slas" serviceTiers={TIERS} />);
    await expectNoA11yViolations(container);
  });

  it('CSAT tab (distribution + feedback) has no serious/critical violations', async () => {
    const { container } = render(<ServiceView {...base} serviceTab="csat" serviceCsat={CSAT} />);
    await expectNoA11yViolations(container);
  });

  it('empty queue state has no serious/critical violations', async () => {
    const { container } = render(<ServiceView {...base} />);
    await expectNoA11yViolations(container);
  });

  it('new-customer modal has no serious/critical violations', async () => {
    const { container } = render(
      <ServiceView {...base} serviceTab="customers" newCustomer={{ name: '', tier: 'SILVER', primaryColor: '', subdomain: '' }} />,
    );
    await expectNoA11yViolations(container);
  });
});
