import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import { IntegrationsPanel } from './integrations-panel';
import { integrationsClient } from '@/lib/integrations';
import { expectNoA11yViolations } from '@/test/a11y';

vi.mock('@/lib/integrations', async () => {
  const actual = await vi.importActual('@/lib/integrations');
  return {
    ...actual,
    integrationsClient: {
      providers: vi.fn(), list: vi.fn(), webhooks: vi.fn(), tokens: vi.fn(),
    },
  };
});

describe('IntegrationsPanel', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    integrationsClient.list.mockResolvedValue([]);
    integrationsClient.webhooks.mockResolvedValue([]);
    integrationsClient.tokens.mockResolvedValue([]);
  });

  it('uses the sanctioned dashboard page shell', () => {
    integrationsClient.providers.mockResolvedValue([]);
    const { container } = render(<IntegrationsPanel workspaceId="ws-1" />);
    expect(container.firstChild).toHaveClass('max-w-7xl', 'px-6', 'py-6');
  });

  it('renders the connector grid', async () => {
    integrationsClient.providers.mockResolvedValue([
      { id: 'SLACK', label: 'Slack', category: 'messaging', requiredFields: ['webhookUrl'] },
      { id: 'GITHUB', label: 'GitHub', category: 'scm', requiredFields: ['repo', 'token'] },
    ]);
    render(<IntegrationsPanel workspaceId="ws-1" />);
    expect(await screen.findByText('Slack')).toBeInTheDocument();
    expect(screen.getByText('GitHub')).toBeInTheDocument();
  });

  it('switches to the webhooks tab', async () => {
    integrationsClient.providers.mockResolvedValue([]);
    render(<IntegrationsPanel workspaceId="ws-1" />);
    fireEvent.click(await screen.findByRole('tab', { name: /webhooks/i }));
    await waitFor(() => expect(integrationsClient.webhooks).toHaveBeenCalled());
    expect(await screen.findByText(/no webhook subscriptions/i)).toBeInTheDocument();
  });

  it('shows a loading state before data resolves (no false empty state)', async () => {
    // Hold the providers promise open so the panel is mid-load.
    let resolveProviders;
    integrationsClient.providers.mockReturnValue(new Promise((r) => { resolveProviders = r; }));
    const { container } = render(<IntegrationsPanel workspaceId="ws-1" />);
    // While loading: the skeleton region is present and the empty connector copy is NOT shown.
    expect(container.querySelector('[aria-busy="true"]')).toBeInTheDocument();
    expect(screen.queryByText(/no connectors are available/i)).not.toBeInTheDocument();
    resolveProviders([]);
    // After load resolves with no providers, the real empty state appears.
    expect(await screen.findByText(/no connectors are available/i)).toBeInTheDocument();
  });

  it('associates each tab with its tabpanel and moves selection with arrow keys', async () => {
    integrationsClient.providers.mockResolvedValue([]);
    render(<IntegrationsPanel workspaceId="ws-1" />);
    const connectorsTab = await screen.findByRole('tab', { name: /connectors/i });
    expect(connectorsTab).toHaveAttribute('aria-controls', 'integrations-panel-connectors');
    expect(screen.getByRole('tabpanel')).toHaveAttribute('aria-labelledby', 'integrations-tab-connectors');
    // ArrowRight from the selected tab moves selection to the next tab (Webhooks).
    fireEvent.keyDown(connectorsTab, { key: 'ArrowRight' });
    await waitFor(() => expect(screen.getByRole('tab', { name: /webhooks/i })).toHaveAttribute('aria-selected', 'true'));
  });

  it('the connectors tab has no serious/critical a11y violations', async () => {
    integrationsClient.providers.mockResolvedValue([
      { id: 'SLACK', label: 'Slack', category: 'messaging', requiredFields: ['webhookUrl'] },
    ]);
    const { container } = render(<IntegrationsPanel workspaceId="ws-1" />);
    await screen.findByText('Slack');
    await expectNoA11yViolations(container);
  });
});
