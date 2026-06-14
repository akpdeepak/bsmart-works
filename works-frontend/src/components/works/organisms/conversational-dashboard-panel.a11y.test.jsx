import { describe, it, vi, beforeEach } from 'vitest';
import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import { ConversationalDashboardPanel } from './conversational-dashboard-panel';
import { aiClient } from '@/lib/ai';
import { expectNoA11yViolations } from '@/test/a11y';

vi.mock('@/lib/ai', async () => {
  const actual = await vi.importActual('@/lib/ai');
  return { ...actual, aiClient: { compileConversationalDashboard: vi.fn(), saveConversationalDashboard: vi.fn() } };
});

const COMPILED = {
  spec: { title: 'Velocity per team', metric: 'velocity', groupBy: 'team', chart: 'bar', timeframe: { amount: 6, unit: 'sprints' }, caption: 'Last 6 sprints.' },
  usedAi: true, fallback: false, policyState: 'ENABLED', tier: 'sonnet',
};

beforeEach(() => {
  vi.clearAllMocks();
  aiClient.compileConversationalDashboard.mockResolvedValue(COMPILED);
});

describe('ConversationalDashboardPanel a11y', () => {
  it('prompt entry has no serious/critical violations', async () => {
    const { container } = render(<ConversationalDashboardPanel workspaceId="ws-1" onSaved={() => {}} showToast={() => {}} />);
    await screen.findByLabelText('Describe the dashboard you want');
    await expectNoA11yViolations(container);
  });

  it('compiled spec preview (with AI badge + save/discard) has no serious/critical violations', async () => {
    const { container } = render(<ConversationalDashboardPanel workspaceId="ws-1" onSaved={() => {}} showToast={() => {}} />);
    fireEvent.change(screen.getByLabelText('Describe the dashboard you want'), { target: { value: 'velocity per team' } });
    fireEvent.click(screen.getByRole('button', { name: 'Build preview' }));
    await waitFor(() => expect(aiClient.compileConversationalDashboard).toHaveBeenCalled());
    await screen.findByText('Velocity per team');
    await expectNoA11yViolations(container);
  });
});
