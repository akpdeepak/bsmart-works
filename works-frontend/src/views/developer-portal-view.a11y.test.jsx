import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen } from '@testing-library/react';
import DeveloperPortalView from './developer-portal-view';
import { developerPortalClient } from '@/lib/marketplace';
import { expectNoA11yViolations } from '@/test/a11y';

// Automated a11y sweep + the no-data fallback for the Developer Portal (Extend group, Cap R).
vi.mock('@/lib/marketplace', async () => {
  const actual = await vi.importActual('@/lib/marketplace');
  return {
    ...actual,
    developerPortalClient: { sdk: vi.fn(), sandboxCredentials: vi.fn() },
  };
});

const sdkManifest = {
  sdkVersion: '1.0.0',
  languages: ['JavaScript / TypeScript', 'Python'],
  extensionPoints: [{ id: 'webhook', name: 'Webhooks', description: 'Receive signed events.' }],
  docs: [{ title: 'Getting Started', url: 'https://developers.bsmartworks.dev/getting-started' }],
  exampleManifest: { slug: 'my-extension', name: 'My Extension', version: '1.0.0' },
};

describe('DeveloperPortalView a11y', () => {
  beforeEach(() => { vi.clearAllMocks(); });

  it('the SDK view has no serious/critical violations', async () => {
    developerPortalClient.sdk.mockResolvedValue(sdkManifest);
    const { container } = render(<DeveloperPortalView workspaceId="ws-1" />);
    await screen.findByText('v1.0.0');
    await expectNoA11yViolations(container);
  });

  it('renders a guidance empty state when the SDK manifest is missing (no dead-end blank)', async () => {
    developerPortalClient.sdk.mockResolvedValue(null);
    render(<DeveloperPortalView workspaceId="ws-1" />);
    expect(await screen.findByText(/developer portal unavailable/i)).toBeInTheDocument();
  });
});
