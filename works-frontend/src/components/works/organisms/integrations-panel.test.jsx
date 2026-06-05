import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import { IntegrationsPanel } from './integrations-panel';
import { integrationsClient } from '@/lib/integrations';

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
});
