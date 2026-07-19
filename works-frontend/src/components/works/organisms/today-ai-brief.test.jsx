import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { fireEvent, render, screen } from '@testing-library/react';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import { aiAssistClient } from '@/lib/ai-assist';
import { TodayAiBrief } from './today-ai-brief';

vi.mock('@/lib/ai-assist', () => ({ aiAssistClient: { getTodayNudges: vi.fn() } }));

function renderBrief(props = {}) {
  const client = new QueryClient({ defaultOptions: { queries: { retry: false } } });
  return render(
    <QueryClientProvider client={client}>
      <TodayAiBrief workspaceId="WS-A" {...props} />
    </QueryClientProvider>,
  );
}

describe('TodayAiBrief', () => {
  beforeEach(() => vi.clearAllMocks());

  it('shows deterministic fallback provenance instead of hiding the brief', async () => {
    aiAssistClient.getTodayNudges.mockResolvedValue({
      summary: 'Start with the overdue assigned item.',
      nudges: [{ text: 'Focus on WRK-1', workItemId: 'WRK-1', title: 'Fix login' }],
      fallback: true,
      meta: { fallback: true },
    });

    renderBrief();

    expect(await screen.findByText('Start with the overdue assigned item.')).toBeInTheDocument();
    expect(screen.getByText('Deterministic fallback')).toBeInTheDocument();
  });

  it('opens a cited work item from the source list', async () => {
    const onOpenItem = vi.fn();
    aiAssistClient.getTodayNudges.mockResolvedValue({
      summary: 'Focus on the login fix.',
      nudges: [{ text: 'Focus on WRK-1', workItemId: 'WRK-1', title: 'Fix login' }],
      fallback: false,
      meta: { fallback: false, tier: 'HAIKU', policyState: 'ENABLED' },
    });

    renderBrief({ onOpenItem });
    fireEvent.click(await screen.findByRole('button', { name: /WRK-1/i }));

    expect(onOpenItem).toHaveBeenCalledWith('WRK-1', 'Fix login');
  });
});
