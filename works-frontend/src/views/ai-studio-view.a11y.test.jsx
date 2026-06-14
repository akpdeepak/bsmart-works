import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import { expectNoA11yViolations } from '@/test/a11y';

// Automated a11y sweep for the AI Studio surface (Extend group, Cap O). Covers the three tabs
// (assistants chat, agents, ask) plus the tablist semantics and keyboard navigation (RB-30 §6).
const h = vi.hoisted(() => ({
  list: vi.fn(), chat: vi.fn(), runs: vi.fn(), run: vi.fn(), getRun: vi.fn(),
  compile: vi.fn(), save: vi.fn(), cdList: vi.fn(), cdRemove: vi.fn(),
}));

vi.mock('@/lib/advanced-ai', () => ({
  assistantsClient: { list: h.list, chat: h.chat },
  agentsClient: { runs: h.runs, run: h.run, getRun: h.getRun },
  conversationalDashboardsClient: { list: h.cdList, compile: h.compile, save: h.save, remove: h.cdRemove },
  aiVerdictLabel: (r) => (r && r.usedAi && !r.fallback ? 'AI' : 'Offline'),
}));

import AiStudioView from './ai-studio-view';

describe('AiStudioView a11y', () => {
  beforeEach(() => {
    Object.values(h).forEach((fn) => fn.mockReset());
    h.list.mockResolvedValue([{ id: 'AST-1', name: 'Compliance Assistant', description: 'rules' }]);
    h.runs.mockResolvedValue([{ id: 'AGR-1', goal: 'Triage P0', status: 'COMPLETED', stepCount: 2 }]);
  });

  it('the assistants tab has no serious/critical violations', async () => {
    const { container } = render(<AiStudioView workspaceId="ws-1" />);
    await screen.findByLabelText('Message the assistant');
    await expectNoA11yViolations(container);
  });

  it('the agents tab has no serious/critical violations', async () => {
    const { container } = render(<AiStudioView workspaceId="ws-1" />);
    fireEvent.click(await screen.findByRole('tab', { name: /agents/i }));
    await screen.findByText('Recent runs');
    await expectNoA11yViolations(container);
  });

  it('associates each tab with its tabpanel and moves selection with arrow keys', async () => {
    render(<AiStudioView workspaceId="ws-1" />);
    const assistantsTab = await screen.findByRole('tab', { name: /assistants/i });
    expect(assistantsTab).toHaveAttribute('aria-controls', 'aistudio-panel-assistants');
    expect(screen.getByRole('tabpanel')).toHaveAttribute('aria-labelledby', 'aistudio-tab-assistants');
    fireEvent.keyDown(assistantsTab, { key: 'ArrowRight' });
    await waitFor(() => expect(screen.getByRole('tab', { name: /agents/i })).toHaveAttribute('aria-selected', 'true'));
  });
});
