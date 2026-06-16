import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen, fireEvent, waitFor, act } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { useState as useReactState } from 'react';
import { MentionPicker, renderMentions } from './MentionPicker';
import * as apiClient from '@/lib/apiClient';

vi.mock('@/lib/apiClient', () => ({
  api: { send: vi.fn() },
}));

const MEMBERS = [
  { id: 'u1', name: 'Alice', email: 'alice@example.com' },
  { id: 'u2', name: 'Bob',   email: 'bob@example.com' },
];

beforeEach(() => {
  vi.clearAllMocks();
  apiClient.api.send.mockResolvedValue(MEMBERS);
});

// Stateful wrapper so controlled-component re-renders work correctly in tests.
function MentionWrapper() {
  const [val, setVal] = useReactState('');
  return (
    <MentionPicker workspaceId="WS-001" value={val} onChange={setVal}>
      {({ ref, onChange: onMChange, onKeyDown }) => (
        <textarea ref={ref} aria-label="Comment" value={val}
          onChange={(e) => { setVal(e.target.value); onMChange(e); }}
          onKeyDown={onKeyDown} />
      )}
    </MentionPicker>
  );
}

describe('MentionPicker (KR-028)', () => {
  async function renderAndLoadMembers() {
    const user = userEvent.setup();
    render(<MentionWrapper />);
    // Wait for the members fetch to complete and state to update.
    await waitFor(() => expect(apiClient.api.send).toHaveBeenCalledWith('/workspaces/WS-001/members'));
    await act(async () => {});
    return { user, ta: screen.getByRole('textbox') };
  }

  it('shows member suggestions when @ is typed', async () => {
    const { user, ta } = await renderAndLoadMembers();
    await user.click(ta);
    await user.type(ta, '@ali');
    await waitFor(() => {
      expect(screen.getByRole('listbox')).toBeTruthy();
      expect(screen.getByText('Alice')).toBeTruthy();
    });
  });

  it('closes the picker when Escape is pressed', async () => {
    const { user, ta } = await renderAndLoadMembers();
    await user.click(ta);
    await user.type(ta, '@ali');
    await waitFor(() => screen.getByRole('listbox'));
    await user.keyboard('{Escape}');
    await waitFor(() => expect(screen.queryByRole('listbox')).toBeNull());
  });

  it('does not show picker when no @ is in the text', async () => {
    const { user, ta } = await renderAndLoadMembers();
    await user.click(ta);
    await user.type(ta, 'hello');
    expect(screen.queryByRole('listbox')).toBeNull();
  });
});

describe('renderMentions', () => {
  it('wraps @username with brand-orange span', () => {
    const result = renderMentions('Hello @alice, see @bob too.');
    expect(result).toContain('<span class="text-brand-orange font-medium">@alice</span>');
    expect(result).toContain('<span class="text-brand-orange font-medium">@bob</span>');
  });

  it('returns empty string for null/undefined input', () => {
    expect(renderMentions(null)).toBe('');
    expect(renderMentions(undefined)).toBe('');
  });

  it('returns plain text unchanged when no mentions', () => {
    expect(renderMentions('no mentions here')).toBe('no mentions here');
  });
});
