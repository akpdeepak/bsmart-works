import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { MeetingNotesAssistant } from '@/components/knowledge/MeetingNotesAssistant';
import { knowledgeAi } from '@/lib/knowledge-ai';

vi.mock('@/lib/knowledge-ai', () => ({ knowledgeAi: { compose: vi.fn() } }));

describe('MeetingNotesAssistant', () => {
  beforeEach(() => vi.clearAllMocks());

  it('renders the transcript textarea and Generate notes button', () => {
    render(<MeetingNotesAssistant workspaceId="ws-1" onInsert={vi.fn()} />);
    expect(screen.getByLabelText('Paste meeting transcript')).toBeInTheDocument();
    expect(screen.getByRole('button', { name: 'Generate notes' })).toBeInTheDocument();
  });

  it('calls knowledgeAi.compose with mode meeting_notes on Generate click', async () => {
    knowledgeAi.compose.mockResolvedValue({ text: '# Attendees\n', meta: { fallback: false, tier: 'SONNET' } });
    const onInsert = vi.fn();
    const user = userEvent.setup();
    render(<MeetingNotesAssistant workspaceId="ws-1" onInsert={onInsert} />);

    const textarea = screen.getByLabelText('Paste meeting transcript');
    await user.type(textarea, '@Alice\nAction: Follow up on deployment');
    await user.click(screen.getByRole('button', { name: 'Generate notes' }));

    await waitFor(() => expect(knowledgeAi.compose).toHaveBeenCalledWith(
      'ws-1',
      expect.objectContaining({ mode: 'meeting_notes' })
    ));
  });

  it('calls onInsert with blocks when API returns markdown', async () => {
    knowledgeAi.compose.mockResolvedValue({
      text: '# Attendees\n- Alice\n# Key Decisions\n# Action Items\n- [ ] Deploy by Friday\n# Next Steps\n',
      meta: { fallback: false, tier: 'SONNET' },
    });
    const onInsert = vi.fn();
    const user = userEvent.setup();
    render(<MeetingNotesAssistant workspaceId="ws-1" onInsert={onInsert} />);

    await user.type(screen.getByLabelText('Paste meeting transcript'), '@Alice some text here');
    await user.click(screen.getByRole('button', { name: 'Generate notes' }));

    await waitFor(() => expect(onInsert).toHaveBeenCalledTimes(1));
    const blocks = onInsert.mock.calls[0][0];
    expect(Array.isArray(blocks)).toBe(true);
    expect(blocks.some(b => b.type === 'heading1')).toBe(true);
    // Should include a checklist block with the action item
    const checklist = blocks.find(b => b.type === 'checklist');
    expect(checklist).toBeDefined();
    expect(checklist.metadata.items.some(i => i.text === 'Deploy by Friday' && !i.done)).toBe(true);
  });

  it('shows error state when API call fails', async () => {
    knowledgeAi.compose.mockRejectedValue(new Error('Network error'));
    const user = userEvent.setup();
    render(<MeetingNotesAssistant workspaceId="ws-1" onInsert={vi.fn()} />);

    await user.type(screen.getByLabelText('Paste meeting transcript'), 'some long enough text to submit');
    await user.click(screen.getByRole('button', { name: 'Generate notes' }));

    await waitFor(() =>
      expect(screen.getByRole('alert')).toHaveTextContent('Could not generate notes. Try again.')
    );
  });

  it('shows AI fallback badge when meta.fallback is true', async () => {
    knowledgeAi.compose.mockResolvedValue({
      text: '# Attendees\n',
      meta: { fallback: true, tier: 'NONE', cacheHit: false, policyState: 'DISABLED' },
    });
    const onInsert = vi.fn();
    const user = userEvent.setup();
    render(<MeetingNotesAssistant workspaceId="ws-1" onInsert={onInsert} />);

    await user.type(screen.getByLabelText('Paste meeting transcript'), 'transcript text here and more');
    await user.click(screen.getByRole('button', { name: 'Generate notes' }));

    await waitFor(() => expect(screen.getByText('Deterministic fallback')).toBeInTheDocument());
  });
});
