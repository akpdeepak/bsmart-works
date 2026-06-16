import { describe, it, vi, beforeEach } from 'vitest';
import { render, screen } from '@testing-library/react';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { expectNoA11yViolations } from '@/test/a11y';

// BqlView calls useQueryClient(), so renders need a QueryClientProvider.
const queryClient = new QueryClient({ defaultOptions: { queries: { retry: false } } });
const renderWithClient = (ui) => render(<QueryClientProvider client={queryClient}>{ui}</QueryClientProvider>);

vi.mock('@/lib/apiClient', () => ({ api: { send: vi.fn(() => Promise.resolve({})) } }));
vi.mock('@/lib/saved-views', () => ({
  savedViewsClient: { list: vi.fn(() => Promise.resolve([])), create: vi.fn(), update: vi.fn(), delete: vi.fn() },
}));

import BqlView from './bql-view';
import { api } from '@/lib/apiClient';

const SCHEMA = {
  fields: [{ alias: 'status' }, { alias: 'priority' }],
  operators: ['=', '!=', '>', '<'],
  functions: ['currentUser()', 'today()'],
  enums: { status: ['Open', 'Done'] },
};

const RESULTS = [
  { id: 'WI-1', title: 'Login bug', status: 'Open', priority: 'HIGH', type: 'BUG' },
  { id: 'WI-2', title: 'Payment crash', status: 'Done', priority: 'LOW', type: 'BUG' },
];

beforeEach(() => {
  vi.clearAllMocks();
  api.send.mockImplementation((url) => {
    if (url.startsWith('/bql/schema')) return Promise.resolve(SCHEMA);
    return Promise.resolve({});
  });
});

const baseProps = {
  bqlQuery: 'status = Open', bqlError: null, bqlResults: [], workItems: [], activeWorkspaceId: 'ws-1',
  aiCapabilities: [{ id: 'nl_to_bql', label: 'NL to BQL', enabled: true }], nameMaps: {},
  setBqlQuery: () => {}, setSelectedItem: () => {}, runBql: () => {},
};

describe('BqlView a11y', () => {
  it('the query editor (NL panel + schema chips) has no serious/critical violations', async () => {
    const { container } = renderWithClient(<BqlView {...baseProps} />);
    await screen.findByLabelText('Plain-English filter query');
    await screen.findByLabelText('Insert status');
    await expectNoA11yViolations(container);
  });

  it('the results navigator has no serious/critical violations', async () => {
    const { container } = renderWithClient(<BqlView {...baseProps} bqlResults={RESULTS} />);
    await screen.findByText('Login bug');
    await expectNoA11yViolations(container);
  });
});
