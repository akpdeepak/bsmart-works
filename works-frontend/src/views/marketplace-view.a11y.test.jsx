import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import MarketplaceView from './marketplace-view';
import { marketplaceClient } from '@/lib/marketplace';
import { expectNoA11yViolations } from '@/test/a11y';

// Automated a11y sweep + dialog keyboard behavior for the App Marketplace (Extend group, Cap R).
vi.mock('@/lib/marketplace', async () => {
  const actual = await vi.importActual('@/lib/marketplace');
  return {
    ...actual,
    marketplaceClient: {
      listings: vi.fn(), installed: vi.fn(), install: vi.fn(), setEnabled: vi.fn(), uninstall: vi.fn(),
    },
  };
});

const slackListing = {
  id: 'MKT-slack', name: 'Slack Notifier', summary: 'Post updates to Slack.',
  publisher: 'bSmart Works', version: '2.0.1', requestedScopes: 'read_items,write_comments',
};

describe('MarketplaceView a11y', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    marketplaceClient.installed.mockResolvedValue([]);
    marketplaceClient.install.mockResolvedValue({});
    marketplaceClient.listings.mockResolvedValue([slackListing]);
  });

  it('the catalog has no serious/critical violations', async () => {
    const { container } = render(<MarketplaceView workspaceId="ws-1" />);
    await screen.findByText('Slack Notifier');
    await expectNoA11yViolations(container);
  });

  it('the scope-approval dialog has no serious/critical violations and focuses the close control', async () => {
    const { container } = render(<MarketplaceView workspaceId="ws-1" />);
    await screen.findByText('Slack Notifier');
    fireEvent.click(screen.getByRole('button', { name: /^install$/i }));
    const dialog = await screen.findByRole('dialog');
    expect(dialog).toBeInTheDocument();
    // Initial focus lands inside the dialog (the Cancel control).
    await waitFor(() => expect(screen.getByRole('button', { name: /cancel/i })).toHaveFocus());
    await expectNoA11yViolations(container);
  });

  it('closes the dialog on Escape (keyboard operability)', async () => {
    render(<MarketplaceView workspaceId="ws-1" />);
    await screen.findByText('Slack Notifier');
    fireEvent.click(screen.getByRole('button', { name: /^install$/i }));
    await screen.findByRole('dialog');
    fireEvent.keyDown(document, { key: 'Escape' });
    await waitFor(() => expect(screen.queryByRole('dialog')).not.toBeInTheDocument());
    expect(marketplaceClient.install).not.toHaveBeenCalled();
  });
});
