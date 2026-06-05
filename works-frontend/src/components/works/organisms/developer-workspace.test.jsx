import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import { DeveloperWorkspace } from './developer-workspace';
import { devClient } from '@/lib/developer';

vi.mock('@/lib/developer', async () => {
  const actual = await vi.importActual('@/lib/developer');
  return {
    ...actual,
    devClient: {
      home: vi.fn(),
      velocity: vi.fn(),
      standup: vi.fn(),
      scheduleFocus: vi.fn(),
      cancelFocus: vi.fn(),
    },
  };
});

const HOME = {
  todaysWork: [{ id: 'WRK-1', title: 'Auth refactor', status: 'In Progress', priority: 'HIGH' }],
  reviewQueue: [{ id: 'PR-1', number: 101, title: 'JWT filter', authorName: 'Dev Two', repo: 'bcits/works', url: 'http://x', urgencyScore: 220, linkedPriority: 'P0' }],
  blockers: [{ id: 'WRK-2', title: 'Board DnD', blockedBy: 'WRK-9', blockerTitle: 'API' }],
  focusBlocks: [{ id: 5, title: 'Deep work', startsAt: '2026-06-05T10:00:00Z', endsAt: '2026-06-05T12:00:00Z', status: 'SCHEDULED', allowP0: true }],
  focusStatus: { inFocus: true, title: 'Deep work', until: '2026-06-05T12:30:00Z', allowP0: true },
  recentActivity: [{ aggregateId: 'WRK-1', eventType: 'STATUS_CHANGED' }],
};
const VELOCITY = { private: true, assigned: 8, completed: 6, completionRate: 75, avgCycleTimeDays: 2.4, throughputLast14Days: 6 };

describe('DeveloperWorkspace', () => {
  beforeEach(() => vi.clearAllMocks());

  it('renders the engineer home surfaces from the API', async () => {
    devClient.home.mockResolvedValue(HOME);
    devClient.velocity.mockResolvedValue(VELOCITY);

    render(<DeveloperWorkspace workspaceId="WS-001" />);

    expect(await screen.findByText('Auth refactor')).toBeInTheDocument();
    expect(screen.getByText(/#101 JWT filter/)).toBeInTheDocument();
    expect(screen.getByText(/blocked by WRK-9/)).toBeInTheDocument();
    // Personal velocity is shown and flagged private.
    expect(screen.getByText('75%')).toBeInTheDocument();
    expect(screen.getByText('Private · only you')).toBeInTheDocument();
    // Focus status indicator renders "In focus until HH:MM".
    expect(screen.getByText(/In focus until/)).toBeInTheDocument();
  });

  it('drafts a standup the user can edit before posting', async () => {
    devClient.home.mockResolvedValue(HOME);
    devClient.velocity.mockResolvedValue(VELOCITY);
    devClient.standup.mockResolvedValue({ draft: 'Yesterday:\n  • WRK-1', meta: { fallback: false } });

    render(<DeveloperWorkspace workspaceId="WS-001" />);
    fireEvent.click(await screen.findByRole('button', { name: /draft from my work/i }));

    await waitFor(() => expect(devClient.standup).toHaveBeenCalledWith('WS-001'));
    const draft = await screen.findByLabelText('Standup draft');
    expect(draft).toHaveValue('Yesterday:\n  • WRK-1');
    fireEvent.change(draft, { target: { value: 'edited' } });
    expect(draft).toHaveValue('edited');
  });

  it('shows an error state with a retry when the API fails', async () => {
    devClient.home.mockRejectedValue(new Error('boom'));
    devClient.velocity.mockResolvedValue(VELOCITY);

    render(<DeveloperWorkspace workspaceId="WS-001" />);
    expect(await screen.findByText('Developer Workspace unavailable')).toBeInTheDocument();
    expect(screen.getByRole('button', { name: /retry/i })).toBeInTheDocument();
  });
});
