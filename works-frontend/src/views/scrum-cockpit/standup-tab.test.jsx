import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import { StandupTab } from './standup-tab';
import { devClient } from '@/lib/developer';
import { aiClient } from '@/lib/ai';

// Audit finding #17 — verify the "Draft standup" button calls devClient.standup (the real
// /developer-workspace/standup endpoint) and propagates res.draft into the standup fields,
// and does NOT call aiClient.generate with the unknown kind 'standup_draft'.

vi.mock('@/lib/developer', async () => {
  const actual = await vi.importActual('@/lib/developer');
  return {
    ...actual,
    devClient: {
      ...actual.devClient,
      standup: vi.fn(),
    },
  };
});

vi.mock('@/lib/ai', async () => {
  const actual = await vi.importActual('@/lib/ai');
  return {
    ...actual,
    aiClient: {
      ...actual.aiClient,
      generate: vi.fn(),
    },
  };
});

// A minimal aiAction that mirrors App.jsx: calls the API function, then the success callback.
async function aiAction(_key, apiFn, onSuccess, _disabledMsg) {
  const res = await apiFn();
  onSuccess(res);
}

const ACTIVE_STANDUP = {
  session: { id: 'SS-1', status: 'IN_PROGRESS', currentMemberId: 'USR-1' },
  entries: [
    { id: 'E-1', memberId: 'USR-1', status: 'PENDING', yesterday: '', today: '', blockers: '' },
  ],
};

const AI_CAPS = [{ id: 'generation', label: 'Generation', enabled: true, fallback: '' }];

const BASE_PROPS = {
  activeStandup: ACTIVE_STANDUP,
  standups: [],
  canManage: true,
  startStandup: vi.fn(),
  openStandup: vi.fn(),
  setActiveStandup: vi.fn(),
  advanceStandup: vi.fn(),
  completeStandup: vi.fn(),
  standupDraft: { yesterday: '', today: '', blockers: '' },
  setStandupDraft: vi.fn(),
  recordStandup: vi.fn(),
  users: [{ id: 'USR-1', fullName: 'Dev One' }],
  aiCapabilities: AI_CAPS,
  aiLoading: {},
  aiAction,
  activeWorkspaceId: 'WS-001',
  showToast: vi.fn(),
};

describe('StandupTab — Draft standup button (audit finding #17)', () => {
  beforeEach(() => vi.clearAllMocks());

  it('calls devClient.standup with the workspace id when Draft standup is clicked', async () => {
    devClient.standup.mockResolvedValue({ draft: 'Worked on WEB-1 yesterday.', meta: { fallback: false } });

    render(<StandupTab {...BASE_PROPS} />);

    fireEvent.click(screen.getByRole('button', { name: /draft standup/i }));

    await waitFor(() => expect(devClient.standup).toHaveBeenCalledWith('WS-001'));
  });

  it('sets the draft.today field from res.draft returned by /developer-workspace/standup', async () => {
    const DRAFT_TEXT = 'Worked on WEB-1 yesterday.';
    devClient.standup.mockResolvedValue({ draft: DRAFT_TEXT, meta: { fallback: false } });

    const setStandupDraft = vi.fn();
    render(<StandupTab {...BASE_PROPS} setStandupDraft={setStandupDraft} />);

    fireEvent.click(screen.getByRole('button', { name: /draft standup/i }));

    await waitFor(() => {
      const call = setStandupDraft.mock.calls[0]?.[0];
      // setStandupDraft is called with an updater function; apply it to the initial draft state.
      const updater = typeof call === 'function' ? call : () => call;
      const updated = updater({ yesterday: '', today: '', blockers: '' });
      expect(updated.today).toBe(DRAFT_TEXT);
    });
  });

  it('shows a toast when the draft is populated', async () => {
    devClient.standup.mockResolvedValue({ draft: 'Worked on WEB-1.', meta: { fallback: false } });
    const showToast = vi.fn();

    render(<StandupTab {...BASE_PROPS} showToast={showToast} />);
    fireEvent.click(screen.getByRole('button', { name: /draft standup/i }));

    await waitFor(() => expect(showToast).toHaveBeenCalledWith('AI drafted standup update', 'info'));
  });

  it('does NOT call aiClient.generate — the button uses devClient.standup only', async () => {
    // Guard against regression: the old bug called aiClient.generate('standup_draft') which
    // returned a user-story scaffold. The correct call is devClient.standup.
    devClient.standup.mockResolvedValue({ draft: 'ok', meta: { fallback: false } });

    render(<StandupTab {...BASE_PROPS} />);
    fireEvent.click(screen.getByRole('button', { name: /draft standup/i }));

    await waitFor(() => expect(devClient.standup).toHaveBeenCalled());
    expect(aiClient.generate).not.toHaveBeenCalled();
  });

  it('hides the Draft standup button when no AI capability is enabled', () => {
    render(<StandupTab {...BASE_PROPS} aiCapabilities={[{ id: 'x', enabled: false }]} />);
    expect(screen.queryByRole('button', { name: /draft standup/i })).not.toBeInTheDocument();
  });
});
