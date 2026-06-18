import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import { SecurityCenter } from './security-center';

// Mock the security client so the component renders against deterministic data (no network).
vi.mock('@/lib/security', () => {
  const settings = {
    dataResidencyRegion: 'IN', encryptionAlgorithm: 'AES-256-GCM', byokEnabled: true,
    byokProvider: 'AWS_KMS', byokKeyRef: 'arn:aws:kms:...', anomalyDetectionEnabled: true,
    auditRetentionDays: 2555,
  };
  return {
    securityClient: {
      settings: vi.fn(() => Promise.resolve(settings)),
      saveSettings: vi.fn((_ws, body) => Promise.resolve(body)),
      policies: vi.fn(() => Promise.resolve([
        { id: 'CAP-1', name: 'Admins from office', enabled: true, appliesToRole: 'ADMIN', ipAllowlist: '10.0.0.0/8' },
      ])),
      anomalies: vi.fn(() => Promise.resolve([
        { id: 'ANM-1', type: 'NEW_GEO', severity: 'HIGH', summary: 'New country sign-in',
          subjectUserId: 'USR-2', detectedAt: '2026-06-05T03:14:00Z' },
      ])),
      auditLog: vi.fn(() => Promise.resolve({ items: [
        { id: 1, seq: 1, occurredAt: '2026-06-01T09:05:00Z', actorId: 'USR-1',
          action: 'SECURITY_SETTINGS_UPDATED', detail: 'Enabled BYOK', entryHash: 'abc' },
      ] })),
      verifyAuditLog: vi.fn(() => Promise.resolve({ intact: true, verifiedCount: 4 })),
      exportAuditLog: vi.fn(() => Promise.resolve([])),
      evidence: vi.fn(() => Promise.resolve([])),
      generateEvidence: vi.fn(() => Promise.resolve({ id: 'EVB-1' })),
      pentests: vi.fn(() => Promise.resolve([
        { id: 'PEN-1', vendor: 'NCC Group', engagementType: 'PENTEST', status: 'COMPLETED',
          scope: 'Web', findingsCritical: 0, findingsHigh: 1, findingsMedium: 4, findingsLow: 7 },
      ])),
      dataRequests: vi.fn(() => Promise.resolve([])),
      passkeys: vi.fn(() => Promise.resolve([
        { id: 'PK-1', label: 'MacBook', algorithm: 'ES256', createdAt: '2026-06-03T00:00:00Z' },
      ])),
      resolveAnomaly: vi.fn(() => Promise.resolve({})),
    },
  };
});

vi.mock('@/lib/passkey', () => ({
  registerPasskey: vi.fn(() => Promise.resolve({})),
  passkeysSupported: () => true,
}));

const admin = (perm) => perm === 'manage_security';

describe('SecurityCenter', () => {
  beforeEach(() => vi.clearAllMocks());

  it('uses the sanctioned dashboard page shell while loading', () => {
    const { container } = render(<SecurityCenter workspaceId="WS-001" can={admin} onToast={() => {}} />);
    expect(container.firstChild).toHaveClass('max-w-7xl', 'px-6', 'py-6');
  });

  it('renders the posture overview once loaded', async () => {
    render(<SecurityCenter workspaceId="WS-001" can={admin} onToast={() => {}} />);
    expect(await screen.findByText('Security Center')).toBeInTheDocument();
    expect(await screen.findByText('Security posture')).toBeInTheDocument();
    // BYOK provider surfaces in the posture pills.
    expect(screen.getAllByText('AWS_KMS').length).toBeGreaterThan(0);
  });

  it('shows the verified audit-chain badge on the audit tab', async () => {
    render(<SecurityCenter workspaceId="WS-001" can={admin} onToast={() => {}} />);
    await screen.findByText('Security posture');
    fireEvent.click(screen.getByRole('tab', { name: /Audit log/ }));
    expect(await screen.findByText(/Chain verified \(4\)/)).toBeInTheDocument();
    expect(screen.getByText('SECURITY_SETTINGS_UPDATED')).toBeInTheDocument();
  });

  it('lets an admin resolve an anomaly', async () => {
    const { securityClient } = await import('@/lib/security');
    render(<SecurityCenter workspaceId="WS-001" can={admin} onToast={() => {}} />);
    await screen.findByText('Security posture');
    fireEvent.click(screen.getByRole('tab', { name: /Anomalies/ }));
    expect(await screen.findByText('New country sign-in')).toBeInTheDocument();
    fireEvent.click(screen.getByRole('button', { name: 'Resolve' }));
    await waitFor(() => expect(securityClient.resolveAnomaly).toHaveBeenCalledWith('WS-001', 'ANM-1', false));
  });

  it('hides write controls for a read-only (non-admin) user', async () => {
    render(<SecurityCenter workspaceId="WS-001" can={() => false} onToast={() => {}} />);
    await screen.findByText('Security posture');
    expect(screen.getByText(/You have read access/)).toBeInTheDocument();
  });
});
