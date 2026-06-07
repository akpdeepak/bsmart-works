import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import DeveloperPortalView from './developer-portal-view';
import { developerPortalClient } from '@/lib/marketplace';

vi.mock('@/lib/marketplace', async () => {
  const actual = await vi.importActual('@/lib/marketplace');
  return {
    ...actual,
    developerPortalClient: {
      sdk: vi.fn(),
      sandboxCredentials: vi.fn(),
    },
  };
});

const sdkManifest = {
  sdkVersion: '1.0.0',
  languages: ['JavaScript / TypeScript', 'Python'],
  extensionPoints: [
    { id: 'webhook', name: 'Webhooks', description: 'Receive signed events.' },
  ],
  docs: [{ title: 'Getting Started', url: 'https://developers.bsmartworks.dev/getting-started' }],
  exampleManifest: { slug: 'my-extension', name: 'My Extension', version: '1.0.0' },
};

describe('DeveloperPortalView', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('renders SDK info from the client', async () => {
    developerPortalClient.sdk.mockResolvedValue(sdkManifest);
    render(<DeveloperPortalView workspaceId="ws-1" />);
    expect(await screen.findByText('v1.0.0')).toBeInTheDocument();
    expect(screen.getByText('JavaScript / TypeScript')).toBeInTheDocument();
    expect(screen.getByText('Webhooks')).toBeInTheDocument();
  });

  it('generates sandbox credentials on click', async () => {
    developerPortalClient.sdk.mockResolvedValue(sdkManifest);
    developerPortalClient.sandboxCredentials.mockResolvedValue({
      sandboxToken: 'wsbx_abc123',
      sandboxBaseUrl: 'https://sandbox.api.bsmartworks.dev/api/v1',
      notice: 'Ephemeral.',
    });
    render(<DeveloperPortalView workspaceId="ws-1" />);

    fireEvent.click(await screen.findByRole('button', { name: /Generate sandbox credentials/ }));

    await waitFor(() => expect(developerPortalClient.sandboxCredentials).toHaveBeenCalledWith('ws-1'));
    expect(await screen.findByText('wsbx_abc123')).toBeInTheDocument();
  });
});
