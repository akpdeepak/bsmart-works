// KR-074: CheckWritingPanel unit tests.
import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { CheckWritingPanel } from './CheckWritingPanel';
import { knowledgeAi } from '@/lib/knowledge-ai';

vi.mock('@/lib/knowledge-ai', () => ({
  knowledgeAi: { checkWriting: vi.fn() },
}));

const ISSUES = [
  { text: 'its a', suggestion: "Use \"it's\" (it is) or \"its\" (possessive).", severity: 'warning' },
  { text: 'utilize', suggestion: 'Prefer "use".', severity: 'info' },
];

describe('CheckWritingPanel (KR-074)', () => {
  beforeEach(() => vi.clearAllMocks());

  it('renders nothing when open is false', () => {
    const { container } = render(
      <CheckWritingPanel articleText="Some text." workspaceId="ws-1" open={false} onClose={vi.fn()} />,
    );
    expect(container.firstChild).toBeNull();
  });

  it('fetches writing issues on open and renders them', async () => {
    knowledgeAi.checkWriting.mockResolvedValue(ISSUES);
    render(
      <CheckWritingPanel articleText="Its a great day. Utilize the system." workspaceId="ws-1" open onClose={vi.fn()} />,
    );

    await waitFor(() => expect(knowledgeAi.checkWriting).toHaveBeenCalledTimes(1));
    await waitFor(() => expect(screen.getByText('its a')).toBeInTheDocument());
    expect(screen.getByText('utilize')).toBeInTheDocument();
  });

  it('shows empty state when no issues are found', async () => {
    knowledgeAi.checkWriting.mockResolvedValue([]);
    render(
      <CheckWritingPanel articleText="Clear prose." workspaceId="ws-1" open onClose={vi.fn()} />,
    );
    await waitFor(() => expect(screen.getByText(/no issues/i)).toBeInTheDocument());
  });

  it('calls onClose when the close button is clicked', async () => {
    knowledgeAi.checkWriting.mockResolvedValue([]);
    const onClose = vi.fn();
    const user = userEvent.setup();
    render(
      <CheckWritingPanel articleText="Text." workspaceId="ws-1" open onClose={onClose} />,
    );
    await waitFor(() => expect(knowledgeAi.checkWriting).toHaveBeenCalled());
    await user.click(screen.getByRole('button', { name: /close writing check panel/i }));
    expect(onClose).toHaveBeenCalledTimes(1);
  });

  it('dismisses an issue when Dismiss is clicked', async () => {
    knowledgeAi.checkWriting.mockResolvedValue(ISSUES);
    const user = userEvent.setup();
    render(
      <CheckWritingPanel articleText="Its a day. Utilize it." workspaceId="ws-1" open onClose={vi.fn()} />,
    );
    await waitFor(() => screen.getByText('its a'));
    const dismissButtons = await screen.findAllByRole('button', { name: /dismiss/i });
    await user.click(dismissButtons[0]);
    expect(screen.queryByText('its a')).not.toBeInTheDocument();
  });
});
