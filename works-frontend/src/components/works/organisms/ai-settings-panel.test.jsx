import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import { AiSettingsPanel } from './ai-settings-panel';
import { aiClient } from '@/lib/ai';

vi.mock('@/lib/ai', async () => {
  const actual = await vi.importActual('@/lib/ai');
  return {
    ...actual,
    aiClient: {
      capabilities: vi.fn(),
      policies: vi.fn(),
      budget: vi.fn(),
      auditLog: vi.fn(),
      setPolicy: vi.fn(),
      setBudget: vi.fn(),
    },
  };
});

const CAPS = [
  { id: 'story_drafting', label: 'Story & test drafting', defaultTier: 'SONNET', fallback: 'Manual entry form', enabled: true },
  { id: 'command_bar', label: 'Conversational command bar', defaultTier: 'HAIKU', fallback: 'Keyword search', enabled: true },
];
const BUDGET = { period: '2026-06', capCents: 5000000, spentCents: 3240000, percent: 65, degraded: false, disabled: false };
const AUDIT = { items: [{ id: 'inv1', capability: 'story_drafting', modelTier: 'SONNET', costCents: 12, cacheHit: false, fallbackUsed: false, createdAt: '2026-06-06T10:00:00Z' }] };

const admin = (p) => p === 'manage_ai';
const member = () => false;

beforeEach(() => {
  vi.clearAllMocks();
  aiClient.capabilities.mockResolvedValue(CAPS);
  aiClient.policies.mockResolvedValue([]);
  aiClient.budget.mockResolvedValue(BUDGET);
  aiClient.auditLog.mockResolvedValue(AUDIT);
  aiClient.setPolicy.mockResolvedValue({});
  aiClient.setBudget.mockResolvedValue({});
});

describe('AiSettingsPanel', () => {
  it('renders capabilities, the master toggle and the budget once loaded', async () => {
    render(<AiSettingsPanel workspaceId="WS-001" can={admin} onToast={() => {}} />);
    expect(await screen.findByText('AI Control')).toBeInTheDocument();
    expect(screen.getByText('Story & test drafting')).toBeInTheDocument();
    expect(screen.getByText(/used of/)).toBeInTheDocument();
    expect(screen.getByRole('switch', { name: 'AI features for this workspace' })).toBeInTheDocument();
    expect(screen.getByText('AI usage audit')).toBeInTheDocument(); // admin sees the audit log
  });

  it('toggles a capability through a CAPABILITY policy (admin)', async () => {
    render(<AiSettingsPanel workspaceId="WS-001" can={admin} onToast={() => {}} />);
    const sw = await screen.findByRole('switch', { name: 'Conversational command bar' });
    fireEvent.click(sw);
    await waitFor(() => expect(aiClient.setPolicy).toHaveBeenCalledWith(
      'WS-001', expect.objectContaining({ scopeType: 'CAPABILITY', capability: 'command_bar', enabled: false }),
    ));
  });

  it('turns the workspace master AI off through a WORKSPACE policy (admin)', async () => {
    render(<AiSettingsPanel workspaceId="WS-001" can={admin} onToast={() => {}} />);
    const master = await screen.findByRole('switch', { name: 'AI features for this workspace' });
    fireEvent.click(master);
    await waitFor(() => expect(aiClient.setPolicy).toHaveBeenCalledWith(
      'WS-001', expect.objectContaining({ scopeType: 'WORKSPACE', enabled: false }),
    ));
  });

  it('updates the monthly budget cap, converting rupees to cents (admin)', async () => {
    render(<AiSettingsPanel workspaceId="WS-001" can={admin} onToast={() => {}} />);
    await screen.findByText('AI Control');
    fireEvent.change(screen.getByLabelText(/New monthly cap/i), { target: { value: '40000' } });
    fireEvent.click(screen.getByRole('button', { name: /update cap/i }));
    await waitFor(() => expect(aiClient.setBudget).toHaveBeenCalledWith('WS-001', 4000000));
  });

  it('locks controls and hides the audit log for non-admins', async () => {
    render(<AiSettingsPanel workspaceId="WS-001" can={member} onToast={() => {}} />);
    await screen.findByText('AI Control');
    expect(screen.getByText(/manage/i)).toBeInTheDocument(); // the lock notice
    expect(screen.queryByText('AI usage audit')).not.toBeInTheDocument();
    expect(screen.getByRole('switch', { name: 'AI features for this workspace' })).toBeDisabled();
    expect(aiClient.auditLog).not.toHaveBeenCalled();
  });

  it('shows an error state with a retry when the API fails', async () => {
    aiClient.capabilities.mockRejectedValue(new Error('nope'));
    render(<AiSettingsPanel workspaceId="WS-001" can={admin} onToast={() => {}} />);
    expect(await screen.findByText('AI settings unavailable')).toBeInTheDocument();
    expect(screen.getByRole('button', { name: /retry/i })).toBeInTheDocument();
  });
});
