import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { SaveToKnowButton } from '@/components/knowledge/SaveToKnowButton';
import { knowledge } from '@/lib/knowledge';

vi.mock('@/lib/knowledge', () => ({
  knowledge: { listSpaces: vi.fn(), createArticle: vi.fn(), linkWorkItem: vi.fn() },
}));

describe('SaveToKnowButton', () => {
  beforeEach(() => vi.clearAllMocks());

  it('lists spaces, creates a draft article and links it to the work item', async () => {
    knowledge.listSpaces.mockResolvedValue([{ id: 'KS-ENG', name: 'Engineering' }]);
    knowledge.createArticle.mockResolvedValue({ id: 'ART-1' });
    knowledge.linkWorkItem.mockResolvedValue({});
    const onSaved = vi.fn();
    const user = userEvent.setup();

    render(
      <SaveToKnowButton
        workspaceId="ws-1"
        defaultTitle="Fix login"
        linkWorkItemId="WRK-9"
        getContent={() => '# Fix login\n\nbody'}
        onSaved={onSaved}
      />,
    );

    await user.click(screen.getByRole('button', { name: 'Save to Know' }));
    await waitFor(() => expect(knowledge.listSpaces).toHaveBeenCalled());
    await waitFor(() => expect(screen.getByRole('option', { name: 'Engineering' })).toBeInTheDocument());

    await user.click(screen.getByRole('button', { name: 'Create draft' }));

    await waitFor(() => expect(knowledge.createArticle).toHaveBeenCalledWith(expect.objectContaining({
      spaceId: 'KS-ENG', workspaceId: 'ws-1', title: 'Fix login', status: 'DRAFT', templateType: 'KB',
      content: '# Fix login\n\nbody',
    })));
    await waitFor(() => expect(knowledge.linkWorkItem).toHaveBeenCalledWith('ART-1', 'WRK-9'));
    expect(onSaved).toHaveBeenCalledWith({ id: 'ART-1' });
  });

  it('requires a title before saving', async () => {
    knowledge.listSpaces.mockResolvedValue([{ id: 'KS-ENG', name: 'Engineering' }]);
    const user = userEvent.setup();
    render(<SaveToKnowButton workspaceId="ws-1" defaultTitle="" />);
    await user.click(screen.getByRole('button', { name: 'Save to Know' }));
    await waitFor(() => expect(screen.getByRole('button', { name: 'Create draft' })).toBeInTheDocument());
    await user.click(screen.getByRole('button', { name: 'Create draft' }));
    expect(screen.getByText('A title is required.')).toBeInTheDocument();
    expect(knowledge.createArticle).not.toHaveBeenCalled();
  });
});
