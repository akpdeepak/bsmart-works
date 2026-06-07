import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import { OfflineBanner } from './offline-banner';
import * as offline from '@/lib/offline';

vi.mock('@/lib/offline', () => ({
  isOnline: vi.fn(),
  pendingCount: vi.fn(),
  syncDrafts: vi.fn(),
  onConnectivityChange: vi.fn(() => () => {}),
}));

beforeEach(() => {
  vi.clearAllMocks();
});

describe('OfflineBanner', () => {
  it('renders nothing when online with no pending drafts', () => {
    offline.isOnline.mockReturnValue(true);
    offline.pendingCount.mockReturnValue(0);
    const { container } = render(<OfflineBanner />);
    expect(container).toBeEmptyDOMElement();
  });

  it('explains the offline state', () => {
    offline.isOnline.mockReturnValue(false);
    offline.pendingCount.mockReturnValue(0);
    render(<OfflineBanner />);
    expect(screen.getByRole('status')).toHaveTextContent(/offline/i);
  });

  it('offers a manual sync when online with pending drafts and syncs on click', async () => {
    offline.isOnline.mockReturnValue(true);
    offline.pendingCount.mockReturnValue(2);
    offline.syncDrafts.mockResolvedValue({ results: [] });
    render(<OfflineBanner />);
    expect(screen.getByText(/2 changes saved offline/i)).toBeInTheDocument();
    fireEvent.click(screen.getByRole('button', { name: /sync now/i }));
    await waitFor(() => expect(offline.syncDrafts).toHaveBeenCalled());
  });
});
