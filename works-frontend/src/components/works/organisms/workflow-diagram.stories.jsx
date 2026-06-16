import { WorkflowDiagram } from './workflow-diagram';

export default {
  title: 'Works/Organisms/WorkflowDiagram',
  component: WorkflowDiagram,
  tags: ['autodocs'],
  parameters: { a11y: { test: 'error' } },
};

const statuses = [
  { id: 's1', name: 'Backlog', category: 'TO_DO', isInitial: true },
  { id: 's2', name: 'In Progress', category: 'IN_PROGRESS' },
  { id: 's3', name: 'In Review', category: 'IN_PROGRESS' },
  { id: 's4', name: 'Done', category: 'DONE' },
];

const transitions = [
  { id: 't1', name: 'Start', fromStatus: 's1', toStatus: 's2' },
  { id: 't2', name: 'Submit', fromStatus: 's2', toStatus: 's3' },
  { id: 't3', name: 'Approve', fromStatus: 's3', toStatus: 's4' },
  { id: 't4', name: 'Reopen', fromStatus: 's4', toStatus: 's2' },
  { id: 't5', name: 'Rework', fromStatus: 's3', toStatus: 's2' },
];

export const Default = {
  render: () => <WorkflowDiagram statuses={statuses} transitions={transitions} />,
};

export const SingleStatus = {
  render: () => <WorkflowDiagram statuses={[statuses[0]]} transitions={[]} />,
};
