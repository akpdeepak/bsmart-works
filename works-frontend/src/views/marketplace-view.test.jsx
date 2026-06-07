import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import MarketplaceView from './marketplace-view';
import { marketplaceClient } from '@/lib/marketplace';

vi.mock('@/lib/marketplace', async () => {
  const actual = await vi.importActual('@/lib/marketplace');
  return {
    ...actual,
    marketplaceClient: {
      listings: vi.fn(),
      installed: vi.fn(),
      install: vi.fn(),
      setEnabled: vi.fn(),
      uninstall: vi.fn(),
    },
  };
});

const slackListing = {
  id: 'MKT-slack',
  name: 'Slack Notifier',
  summary: 'Post updates to Slack.',
  publisher: 'bSmart Works',
  version: '2.0.1',
  requestedScopes: 'read_items,write_comments',
  status: 'PUBLISHED',
};

describe('MarketplaceView', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    marketplaceClient.installed.mockResolvedValue([]);
    marketplaceClient.install.mockResolvedValue({});
  });

  it('renders the catalog of listings', async () => {
    marketplaceClient.listings.mockResolvedValue([slackListing]);
    render(<MarketplaceView workspaceId="ws-1" />);
    expect(await screen.findByText('Slack Notifier')).toBeInTheDocument();
    expect(screen.getByText('Post updates to Slack.')).toBeInTheDocument();
  });

  it('installs an extension with the approved scopes', async () => {
    marketplaceClient.listings.mockResolvedValue([slackListing]);
    render(<MarketplaceView workspaceId="ws-1" />);

    fireEvent.click(await screen.findByRole('button', { name: 'Install' }));

    // Scope-approval dialog opens with both requested scopes approved by default.
    const dialog = await screen.findByRole('dialog');
    expect(dialog).toBeInTheDocument();
    fireEvent.click(screen.getByRole('button', { name: /Install with 2 scopes/ }));

    await waitFor(() => expect(marketplaceClient.install).toHaveBeenCalledWith('ws-1', {
      listingId: 'MKT-slack',
      grantedScopes: ['read_items', 'write_comments'],
    }));
  });

  it('shows the empty installed state when nothing is installed', async () => {
    marketplaceClient.listings.mockResolvedValue([]);
    render(<MarketplaceView workspaceId="ws-1" />);
    expect(await screen.findByText('No extensions installed')).toBeInTheDocument();
  });
});
