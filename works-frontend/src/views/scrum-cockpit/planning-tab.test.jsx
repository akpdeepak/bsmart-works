import { describe, it, expect, vi } from 'vitest';
import { render, screen } from '@testing-library/react';
import { PlanningTab } from './planning-tab';

// Audit finding #17 — the "AI Sprint Plan" button called aiClient.generate with the unknown
// kind 'sprint_plan', which silently returned the user-story scaffold. That button has been
// removed; the real AI-backed plan comes from the "Suggest commit" button via runSprintPlanning.

const BASE_PROPS = {
  planningTimeOff: '0',
  setPlanningTimeOff: vi.fn(),
  runSprintPlanning: vi.fn(),
  planningResult: null,
  cockpitLoading: {},
};

describe('PlanningTab (audit finding #17)', () => {
  it('renders the Suggest commit button', () => {
    render(<PlanningTab {...BASE_PROPS} />);
    expect(screen.getByRole('button', { name: /suggest commit/i })).toBeInTheDocument();
  });

  it('does NOT render an AI Sprint Plan button that would call generate() with an unknown kind', () => {
    render(<PlanningTab {...BASE_PROPS} />);
    expect(screen.queryByRole('button', { name: /ai sprint plan/i })).not.toBeInTheDocument();
  });

  it('shows the empty state when planningResult is null', () => {
    render(<PlanningTab {...BASE_PROPS} />);
    expect(screen.getByText('Sprint planning helper')).toBeInTheDocument();
  });

  it('renders stat cards and suggested items when planningResult is provided', () => {
    const result = {
      averageVelocity: 32,
      capacity: 28,
      suggestedPoints: 25,
      readyCount: 5,
      meta: { fallback: true },
      narrative: null,
      suggestedItems: [
        { id: 'WEB-1', title: 'Auth refactor', priority: 'HIGH', story_points: 8 },
      ],
    };
    render(<PlanningTab {...BASE_PROPS} planningResult={result} />);
    expect(screen.getByText('Auth refactor')).toBeInTheDocument();
    expect(screen.getByText('8 pts')).toBeInTheDocument();
    // Still no "AI Sprint Plan" button even with a loaded result.
    expect(screen.queryByRole('button', { name: /ai sprint plan/i })).not.toBeInTheDocument();
  });
});
