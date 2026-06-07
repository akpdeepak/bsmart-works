import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen, fireEvent, waitFor } from '@testing-library/react';

const h = vi.hoisted(() => ({
  list: vi.fn(), create: vi.fn(), update: vi.fn(), remove: vi.fn(), chat: vi.fn(),
  runs: vi.fn(), run: vi.fn(), getRun: vi.fn(),
  compile: vi.fn(), save: vi.fn(), cdList: vi.fn(), cdRemove: vi.fn(),
}));

vi.mock('@/lib/advanced-ai', () => ({
  assistantsClient: { list: h.list, create: h.create, update: h.update, remove: h.remove, chat: h.chat },
  agentsClient: { runs: h.runs, run: h.run, getRun: h.getRun },
  conversationalDashboardsClient: { list: h.cdList, compile: h.compile, save: h.save, remove: h.cdRemove },
  aiVerdictLabel: (r) => (r && r.usedAi && !r.fallback ? 'AI' : 'Offline'),
}));

import AiStudioView from './ai-studio-view';

describe('AiStudioView', () => {
  beforeEach(() => {
    Object.values(h).forEach((fn) => fn.mockReset());
    h.list.mockResolvedValue([{ id: 'AST-1', name: 'Compliance Assistant', description: 'rules' }]);
    h.runs.mockResolvedValue([]);
  });

  it('lists assistants and sends a chat message through the client', async () => {
    h.chat.mockResolvedValue({ answer: 'CEA is green.', usedAi: true, fallback: false, tier: 'SONNET' });
    render(<AiStudioView workspaceId="ws-1" />);
    expect((await screen.findAllByText('Compliance Assistant')).length).toBeGreaterThan(0);

    const input = await screen.findByLabelText('Message the assistant');
    fireEvent.change(input, { target: { value: 'What is our CEA status?' } });
    fireEvent.keyDown(input, { key: 'Enter' });
    await waitFor(() => expect(h.chat).toHaveBeenCalledWith('ws-1', 'AST-1', 'What is our CEA status?'));
    expect(await screen.findByText('CEA is green.')).toBeInTheDocument();
  });

  it('runs a multi-step agent and shows the audited steps', async () => {
    h.run.mockResolvedValue({
      run: { id: 'AGR-1', goal: 'Triage P0', status: 'COMPLETED', stepCount: 2 },
      steps: [
        { id: 's1', seq: 1, capability: 'triage', usedAi: true, resultSummary: 'Categorized.' },
        { id: 's2', seq: 2, capability: 'generation', usedAi: false, resultSummary: 'Drafted.' },
      ],
    });
    render(<AiStudioView workspaceId="ws-1" />);
    fireEvent.click(await screen.findByRole('tab', { name: /Agents/ }));
    const goal = await screen.findByPlaceholderText(/Triage all P0/);
    fireEvent.change(goal, { target: { value: 'Triage P0' } });
    fireEvent.click(screen.getByRole('button', { name: /Run agent/ }));
    await waitFor(() => expect(h.run).toHaveBeenCalledWith('ws-1', 'Triage P0'));
    expect(await screen.findByText('Categorized.')).toBeInTheDocument();
  });

  it('compiles a conversational dashboard spec', async () => {
    h.compile.mockResolvedValue({
      spec: { title: 'Velocity by team', metric: 'velocity', groupBy: 'team', chart: 'bar', timeframe: { amount: 6, unit: 'sprint' } },
      usedAi: false, fallback: true,
    });
    render(<AiStudioView workspaceId="ws-1" />);
    fireEvent.click(await screen.findByRole('tab', { name: /Ask/ }));
    const input = await screen.findByPlaceholderText(/Show velocity per team/);
    fireEvent.change(input, { target: { value: 'velocity per team last 6 sprints' } });
    fireEvent.click(screen.getByRole('button', { name: /Compose/ }));
    await waitFor(() => expect(h.compile).toHaveBeenCalledWith('ws-1', 'velocity per team last 6 sprints'));
    expect(await screen.findByText('Velocity by team')).toBeInTheDocument();
  });
});
