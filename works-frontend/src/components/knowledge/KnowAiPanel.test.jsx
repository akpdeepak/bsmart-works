import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { KnowAiPanel } from '@/components/knowledge/KnowAiPanel';
import { knowledgeAi } from '@/lib/knowledge-ai';

vi.mock('@/lib/knowledge-ai', () => ({ knowledgeAi: { ask: vi.fn() } }));

describe('KnowAiPanel', () => {
  beforeEach(() => vi.clearAllMocks());

  it('asks the knowledge base and renders the answer, citations and AI provenance', async () => {
    knowledgeAi.ask.mockResolvedValue({
      answer: 'Roll back by deploying the previous tag.',
      citations: [{ id: 'ART-1', title: 'Rollback runbook' }],
      meta: { fallback: false, tier: 'SONNET', cacheHit: false, policyState: 'ENABLED' },
    });
    const onOpenArticle = vi.fn();
    const user = userEvent.setup();
    render(<KnowAiPanel workspaceId="ws-1" onOpenArticle={onOpenArticle} />);

    await user.type(screen.getByLabelText('Ask a question'), 'How do we roll back?');
    await user.click(screen.getByRole('button', { name: 'Ask' }));

    await waitFor(() => expect(screen.getByText('Roll back by deploying the previous tag.')).toBeInTheDocument());
    expect(knowledgeAi.ask).toHaveBeenCalledWith('ws-1', 'How do we roll back?');

    const cite = screen.getByRole('button', { name: 'Rollback runbook' });
    await user.click(cite);
    expect(onOpenArticle).toHaveBeenCalledWith('ART-1');
    expect(screen.getByText(/AI · SONNET/)).toBeInTheDocument();
  });

  it('surfaces the deterministic-fallback badge when AI did not run', async () => {
    knowledgeAi.ask.mockResolvedValue({ answer: 'Keyword match.', citations: [], meta: { fallback: true, tier: 'NONE' } });
    const user = userEvent.setup();
    render(<KnowAiPanel workspaceId="ws-1" />);
    await user.type(screen.getByLabelText('Ask a question'), 'x');
    await user.click(screen.getByRole('button', { name: 'Ask' }));
    await waitFor(() => expect(screen.getByText('Deterministic fallback')).toBeInTheDocument());
  });
});
