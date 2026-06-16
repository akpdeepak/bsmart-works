// KR-073: GenerateOutlineModal unit tests.
import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { GenerateOutlineModal } from './GenerateOutlineModal';
import { knowledgeAi } from '@/lib/knowledge-ai';

vi.mock('@/lib/knowledge-ai', () => ({
  knowledgeAi: { compose: vi.fn() },
}));

describe('GenerateOutlineModal (KR-073)', () => {
  beforeEach(() => vi.clearAllMocks());

  it('renders nothing when open is false', () => {
    const { container } = render(
      <GenerateOutlineModal open={false} onClose={vi.fn()} onInsert={vi.fn()} workspaceId="ws-1" templateType="KB" />,
    );
    expect(container.firstChild).toBeNull();
  });

  it('shows the modal when open is true', () => {
    render(
      <GenerateOutlineModal open onClose={vi.fn()} onInsert={vi.fn()} workspaceId="ws-1" templateType="KB" />,
    );
    expect(screen.getByRole('dialog', { name: /generate outline/i })).toBeInTheDocument();
  });

  it('calls knowledgeAi.compose with outline mode when Generate is clicked', async () => {
    knowledgeAi.compose.mockResolvedValue({
      text: '# My Topic\n## Section 1\n## Section 2',
      meta: { fallback: false, tier: 'SONNET' },
    });
    const user = userEvent.setup();
    render(
      <GenerateOutlineModal open onClose={vi.fn()} onInsert={vi.fn()} workspaceId="ws-1" templateType="RUNBOOK" />,
    );

    const topicInput = screen.getByLabelText(/topic/i);
    await user.clear(topicInput);
    await user.type(topicInput, 'Deployment guide');
    await user.click(screen.getByRole('button', { name: /generate/i }));

    await waitFor(() =>
      expect(knowledgeAi.compose).toHaveBeenCalledWith('ws-1', {
        mode: 'outline',
        text: 'Deployment guide',
        instruction: 'RUNBOOK',
      }),
    );
  });

  it('calls onInsert with converted blocks when Insert outline is clicked', async () => {
    knowledgeAi.compose.mockResolvedValue({
      text: '# My Topic\n## Overview\nSome details here.',
      meta: { fallback: false, tier: 'SONNET' },
    });
    const onInsert = vi.fn();
    const user = userEvent.setup();
    render(
      <GenerateOutlineModal open onClose={vi.fn()} onInsert={onInsert} workspaceId="ws-1" templateType="KB" />,
    );

    await user.type(screen.getByLabelText(/topic/i), 'My Topic');
    await user.click(screen.getByRole('button', { name: /generate/i }));
    await waitFor(() => screen.getByRole('button', { name: /insert outline/i }));
    await user.click(screen.getByRole('button', { name: /insert outline/i }));

    expect(onInsert).toHaveBeenCalledTimes(1);
    const blocks = onInsert.mock.calls[0][0];
    expect(Array.isArray(blocks)).toBe(true);
    expect(blocks.length).toBeGreaterThan(0);
    expect(blocks[0].type).toMatch(/heading/);
  });

  it('calls onClose when the X close button is clicked', async () => {
    const onClose = vi.fn();
    const user = userEvent.setup();
    render(
      <GenerateOutlineModal open onClose={onClose} onInsert={vi.fn()} workspaceId="ws-1" templateType="KB" />,
    );
    // The X button in the modal header
    await user.click(screen.getByRole('button', { name: /^close$/i }));
    expect(onClose).toHaveBeenCalledTimes(1);
  });
});
