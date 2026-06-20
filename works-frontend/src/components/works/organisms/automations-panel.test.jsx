import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import { AutomationsPanel } from './automations-panel';
import { automationClient } from '@/lib/automation';

vi.mock('@/lib/automation', async () => {
  const actual = await vi.importActual('@/lib/automation');
  return {
    ...actual,
    automationClient: {
      catalog: vi.fn(), list: vi.fn(), runs: vi.fn(), create: vi.fn(), toggle: vi.fn(), test: vi.fn(), run: vi.fn(),
    },
  };
});

const CATALOG = {
  triggers: [{ id: 'ITEM_CREATED', label: 'When created' }],
  actions: [{ id: 'NOTIFY', label: 'Notify' }],
};

describe('AutomationsPanel', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    automationClient.catalog.mockResolvedValue(CATALOG);
    automationClient.runs.mockResolvedValue({ items: [] });
  });

  it('uses the sanctioned dashboard page shell', () => {
    automationClient.list.mockResolvedValue([]);
    const { container } = render(<AutomationsPanel workspaceId="ws-1" />);
    expect(container.firstChild).toHaveClass('max-w-workspace', 'px-6', 'py-6');
  });

  it('lists existing rules', async () => {
    automationClient.list.mockResolvedValue([
      { id: 'AUTO-1', name: 'Triage P0', triggerType: 'ITEM_CREATED', conditionExpr: 'priority = Critical', enabled: true, runCount: 2 },
    ]);
    render(<AutomationsPanel workspaceId="ws-1" />);
    expect(await screen.findByText('Triage P0')).toBeInTheDocument();
    expect(screen.getByText('Enabled')).toBeInTheDocument();
  });

  it('previews a dry-run test without mutating', async () => {
    automationClient.list.mockResolvedValue([
      { id: 'AUTO-1', name: 'Triage P0', triggerType: 'ITEM_CREATED', conditionExpr: '', enabled: false, runCount: 0 },
    ]);
    automationClient.test.mockResolvedValue({ affected: 3, dryRun: true });
    const onToast = vi.fn();
    render(<AutomationsPanel workspaceId="ws-1" onToast={onToast} />);
    fireEvent.click(await screen.findByRole('button', { name: /test triage p0/i }));
    await waitFor(() => expect(automationClient.test).toHaveBeenCalledWith('ws-1', 'AUTO-1'));
    expect(onToast).toHaveBeenCalledWith(expect.stringContaining('would affect 3'), 'success');
  });
});
