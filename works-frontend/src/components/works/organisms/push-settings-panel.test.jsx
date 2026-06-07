import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import { PushSettingsPanel } from './push-settings-panel';
import { api } from '@/lib/apiClient';

vi.mock('@/lib/apiClient', () => ({ api: { send: vi.fn() } }));

const PREFS = {
  pushEnabled: true,
  notifyAssign: true,
  notifyMention: true,
  notifyComment: false,
  notifyStatusChange: true,
  notifySlaBreach: true,
  notifyAutomation: false,
  quietHoursEnabled: false,
  quietHoursStart: 22,
  quietHoursEnd: 7,
  p0OverrideQuiet: true,
  snoozeUntil: null,
};

beforeEach(() => vi.clearAllMocks());

describe('PushSettingsPanel', () => {
  it('loads and shows per-event-type toggles', async () => {
    api.send.mockResolvedValueOnce(PREFS);
    render(<PushSettingsPanel />);
    expect(await screen.findByLabelText('Push notifications')).toBeChecked();
    expect(screen.getByLabelText('Assigned to me')).toBeChecked();
    expect(screen.getByLabelText('Comments')).not.toBeChecked();
  });

  it('saves preferences via PUT', async () => {
    api.send.mockResolvedValueOnce(PREFS); // initial load
    api.send.mockResolvedValueOnce({ ...PREFS, notifyComment: true }); // save
    render(<PushSettingsPanel />);
    await screen.findByLabelText('Push notifications');
    fireEvent.click(screen.getByLabelText('Comments'));
    fireEvent.click(screen.getByRole('button', { name: /save preferences/i }));
    await waitFor(() =>
      expect(api.send).toHaveBeenCalledWith('/push/preferences', expect.objectContaining({ method: 'PUT' })),
    );
  });

  it('reveals quiet-hours inputs when enabled', async () => {
    api.send.mockResolvedValueOnce({ ...PREFS, quietHoursEnabled: true });
    render(<PushSettingsPanel />);
    expect(await screen.findByLabelText('From')).toHaveValue(22);
    expect(screen.getByLabelText('To')).toHaveValue(7);
  });
});
