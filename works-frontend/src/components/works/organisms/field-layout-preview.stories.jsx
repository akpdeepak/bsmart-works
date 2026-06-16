import { FieldLayoutPreview } from './field-layout-preview';

export default {
  title: 'Works/Organisms/FieldLayoutPreview',
  component: FieldLayoutPreview,
  tags: ['autodocs'],
  parameters: { a11y: { test: 'error' } },
};

export const Default = {
  render: () => (
    <FieldLayoutPreview
      typeLabel="Bug"
      fields={[
        { key: 'priority', label: 'Priority' },
        { key: 'assignee', label: 'Assignee' },
        { key: 'dueDate', label: 'Due date' },
        { key: 'cf_1', label: 'Affected customer', custom: true },
      ]}
    />
  ),
};

export const Empty = {
  render: () => <FieldLayoutPreview typeLabel="Task" fields={[]} />,
};
