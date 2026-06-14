import { describe, it, expect, vi } from 'vitest';
import { render, screen, fireEvent } from '@testing-library/react';
import { CapacityTab } from './capacity-tab';

const BASE_PROPS = {
  capacityBoard: null,
  cockpitLoading: {},
  saveMemberCapacity: vi.fn(),
  canManage: true,
};

function board(overrides = {}) {
  return {
    sprint: { id: 'SPR-1', name: 'Sprint 1' },
    members: [
      { userId: 'u1', name: 'Alice', roleKey: 'developer', workingDays: null, timeOffDays: 0, focusFactor: 80,
        effectiveWorkingDays: 10, capacityPoints: 8, allocatedPoints: 12, remainingPoints: -4, utilizationPct: 150, status: 'over', hasRow: false },
      { userId: 'u2', name: 'Bob', roleKey: 'developer', workingDays: null, timeOffDays: 0, focusFactor: 80,
        effectiveWorkingDays: 10, capacityPoints: 8, allocatedPoints: 2, remainingPoints: 6, utilizationPct: 25, status: 'under', hasRow: false },
    ],
    memberCount: 2,
    sprintWorkingDays: 10,
    datesMissing: false,
    averageVelocity: 16,
    suggestedDefaultPointsPerMember: 8,
    teamCapacityPoints: 16,
    teamAllocatedPoints: 14,
    teamRemainingPoints: 2,
    avgUtilizationPct: 88,
    unassignedPoints: 3,
    ...overrides,
  };
}

describe('CapacityTab', () => {
  it('shows the empty state when no board is loaded', () => {
    render(<CapacityTab {...BASE_PROPS} />);
    expect(screen.getByText('Capacity planning')).toBeInTheDocument();
  });

  it('shows a "No team members" state when the board has no members', () => {
    render(<CapacityTab {...BASE_PROPS} capacityBoard={board({ members: [] })} />);
    expect(screen.getByText('No team members')).toBeInTheDocument();
  });

  it('renders rollup figures and a row per member', () => {
    render(<CapacityTab {...BASE_PROPS} capacityBoard={board()} />);
    expect(screen.getByText('Alice')).toBeInTheDocument();
    expect(screen.getByText('Bob')).toBeInTheDocument();
    expect(screen.getByText('12/8 pts')).toBeInTheDocument();   // Alice allocated/capacity
    expect(screen.getByText('3 unassigned')).toBeInTheDocument(); // rollup sub
    expect(screen.getByText('Over')).toBeInTheDocument();        // over-allocation flag
  });

  it('fires saveMemberCapacity when an input changes (canManage)', () => {
    const saveMemberCapacity = vi.fn();
    render(<CapacityTab {...BASE_PROPS} capacityBoard={board()} saveMemberCapacity={saveMemberCapacity} />);
    const timeOff = screen.getAllByLabelText('Time off (days)')[0];
    fireEvent.change(timeOff, { target: { value: '2' } });
    fireEvent.blur(timeOff);
    expect(saveMemberCapacity).toHaveBeenCalledWith('u1', expect.objectContaining({ timeOffDays: 2 }));
  });

  it('disables the inputs when canManage is false', () => {
    render(<CapacityTab {...BASE_PROPS} capacityBoard={board()} canManage={false} />);
    expect(screen.getAllByLabelText('Time off (days)')[0]).toBeDisabled();
  });
});
