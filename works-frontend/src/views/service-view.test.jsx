import { describe, it, expect } from 'vitest';
import { render, screen } from '@testing-library/react';
import ServiceView from './service-view';

const noop = () => {};

const baseProps = {
  serviceTab: 'queues',
  serviceQueue: 'open',
  serviceRequests: [],
  serviceCustomers: [],
  serviceTypes: [],
  serviceTiers: [],
  serviceCsat: null,
  newCustomer: null,
  formDesignerTypeId: null,
  can: () => false,
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

describe('ServiceView', () => {
  it('renders the Service Desk heading', () => {
    render(<ServiceView {...baseProps} />);
    expect(screen.getByRole('heading', { name: /^service desk$/i, level: 1 })).toBeInTheDocument();
  });

  it('shows empty queue state when no requests', () => {
    render(<ServiceView {...baseProps} />);
    expect(screen.getByText(/queue is clear/i)).toBeInTheDocument();
  });

  it('renders queue filter buttons', () => {
    render(<ServiceView {...baseProps} />);
    expect(screen.getByRole('button', { name: /all open/i })).toBeInTheDocument();
    expect(screen.getByRole('button', { name: /mine/i })).toBeInTheDocument();
  });
});
