import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { AiTextAssist } from '@/components/knowledge/AiTextAssist';
import { knowledgeAi } from '@/lib/knowledge-ai';

vi.mock('@/lib/knowledge-ai', () => ({ knowledgeAi: { compose: vi.fn() } }));

describe('AiTextAssist', () => {
  beforeEach(() => vi.clearAllMocks());

  it('renders nothing when AI is unavailable for the workspace', () => {
    const { container } = render(<AiTextAssist workspaceId={null} getText={() => ''} onApply={() => {}} />);
    expect(container).toBeEmptyDOMElement();
    const { container: c2 } = render(<AiTextAssist workspaceId="ws-1" enabled={false} getText={() => ''} onApply={() => {}} />);
    expect(c2).toBeEmptyDOMElement();
  });

  it('improves the field text and applies the result', async () => {
    knowledgeAi.compose.mockResolvedValue({ mode: 'improve', text: 'Polished.', meta: { fallback: false } });
    const onApply = vi.fn();
    const user = userEvent.setup();
    render(<AiTextAssist workspaceId="ws-1" getText={() => 'rough'} onApply={onApply} />);

    await user.click(screen.getByRole('button', { name: 'AI writing assistant' }));
    await user.click(screen.getByRole('menuitem', { name: 'Improve' }));

    await waitFor(() => expect(knowledgeAi.compose).toHaveBeenCalledWith('ws-1', { mode: 'improve', text: 'rough' }));
    await waitFor(() => expect(onApply).toHaveBeenCalledWith('Polished.', { fallback: false }));
  });
});
