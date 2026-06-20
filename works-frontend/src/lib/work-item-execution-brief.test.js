import { describe, expect, it } from 'vitest';
import { buildWorkItemExecutionBrief } from './work-item-execution-brief';

describe('buildWorkItemExecutionBrief', () => {
  it('summarizes key execution fields with source citations', () => {
    const brief = buildWorkItemExecutionBrief({
      item: {
        id: 'WI-1',
        displayKey: 'PLAT-42',
        status: 'In Progress',
        priority: 'HIGH',
        assigneeId: 'USR-1',
        dueDate: '2026-06-25',
        customerVisible: true,
      },
      users: [{ id: 'USR-1', fullName: 'Asha Rao' }],
      comments: [{ id: 'C-1' }, { id: 'C-2' }],
      links: [{ id: 'L-1', url: 'https://github.com/acme/repo/pull/12' }],
      attachments: [{ id: 'F-1' }],
      activity: [{ id: 'E-1' }],
      children: [{ id: 'WI-2' }],
    });

    expect(brief.key).toBe('PLAT-42');
    expect(brief.summary).toContain('PLAT-42 is In Progress with HIGH priority');
    expect(brief.owner).toBe('Asha Rao');
    expect(brief.visibility).toBe('Customer-visible');
    expect(brief.devSync).toBe('Linked code available');
    expect(brief.citations).toEqual([
      'work item fields',
      '2 comments',
      '1 activity event',
      '1 link',
      '1 file',
      '1 sub-item',
    ]);
  });

  it('falls back safely when optional fields are absent', () => {
    const brief = buildWorkItemExecutionBrief({ item: { id: 'WI-2', status: 'Todo' } });

    expect(brief.summary).toBe('WI-2 is Todo with Not set priority, owned by Unassigned, due No due date.');
    expect(brief.visibility).toBe('Internal only');
    expect(brief.devSync).toBe('No linked code yet');
    expect(brief.citations).toEqual(['work item fields']);
  });
});
