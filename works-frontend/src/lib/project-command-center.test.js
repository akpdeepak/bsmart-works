import { describe, expect, it } from 'vitest';
import { buildProjectCommandCenter } from './project-command-center';

const isDone = (item) => item.status === 'Done';

describe('buildProjectCommandCenter', () => {
  it('marks a project at risk when blockers or SLA risks exist', () => {
    const command = buildProjectCommandCenter({
      project: { id: 'PRJ-1' },
      items: [
        { id: 'W1', projectId: 'PRJ-1', status: 'Blocked', type: 'STORY' },
        { id: 'W2', projectId: 'PRJ-1', status: 'In Progress', type: 'BUG', slaBreachFlag: true },
        { id: 'W3', projectId: 'PRJ-1', status: 'Todo', type: 'DECISION', pullRequestUrl: 'https://github.com/acme/repo/pull/7' },
      ],
      metrics: { completionPct: 34 },
      isDone,
    });

    expect(command.health).toBe('At risk');
    expect(command.progress).toBe(34);
    expect(command.blocked).toBe(1);
    expect(command.slaRisk).toBe(1);
    expect(command.decisions).toBe(1);
    expect(command.devSync).toBe(1);
    expect(command.citations).toEqual(['project fields', '3 work items', 'project metrics', '1 DevSync-linked item']);
    expect(command.nextActions).toContain('Clear blockers with named owners.');
  });

  it('marks projects with non-blocking risks as needing attention', () => {
    const command = buildProjectCommandCenter({
      items: [
        { id: 'W1', status: 'Todo', type: 'RISK' },
        { id: 'W2', status: 'Done', type: 'STORY' },
      ],
      isDone,
    });

    expect(command.health).toBe('Needs attention');
    expect(command.risks).toBe(1);
    expect(command.explanation).toContain('1 risk');
  });
});
