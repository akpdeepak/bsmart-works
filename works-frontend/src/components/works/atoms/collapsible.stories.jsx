import { Collapsible } from './collapsible';

export default {
  title: 'Works/Atoms/Collapsible',
  component: Collapsible,
  tags: ['autodocs'],
  parameters: {
    layout: 'padded',
  },
  argTypes: {
    defaultOpen: { control: 'boolean' },
    count: { control: 'number' },
  },
};

const SampleContent = () => (
  <div className="space-y-2">
    {['Bug: login redirect fails', 'Feature: dark mode toggle', 'Task: update dependencies'].map((t) => (
      <div key={t} className="rounded-md border border-neutral-200 px-3 py-2 text-sm text-neutral-800">{t}</div>
    ))}
  </div>
);

export const OpenByDefault = {
  args: {
    title: 'In Progress',
    count: 3,
    defaultOpen: true,
  },
  render: (args) => (
    <div className="w-96 border border-neutral-200 rounded-lg overflow-hidden">
      <Collapsible {...args}>
        <SampleContent />
      </Collapsible>
    </div>
  ),
};

export const ClosedByDefault = {
  args: {
    title: 'Backlog',
    count: 12,
    defaultOpen: false,
  },
  render: (args) => (
    <div className="w-96 border border-neutral-200 rounded-lg overflow-hidden">
      <Collapsible {...args}>
        <SampleContent />
      </Collapsible>
    </div>
  ),
};

export const NoCount = {
  args: {
    title: 'Done',
    defaultOpen: true,
  },
  render: (args) => (
    <div className="w-96 border border-neutral-200 rounded-lg overflow-hidden">
      <Collapsible {...args}>
        <p className="text-sm text-neutral-600 py-2">All caught up!</p>
      </Collapsible>
    </div>
  ),
};

export const NestedSections = {
  render: () => (
    <div className="w-96 border border-neutral-200 rounded-lg overflow-hidden">
      <Collapsible title="Sprint 1" count={5} defaultOpen>
        <div className="space-y-1">
          <Collapsible title="In Progress" count={2} defaultOpen={false}>
            <p className="text-sm text-neutral-700 py-1">2 items in progress</p>
          </Collapsible>
          <Collapsible title="Todo" count={3} defaultOpen={false}>
            <p className="text-sm text-neutral-700 py-1">3 items to start</p>
          </Collapsible>
        </div>
      </Collapsible>
    </div>
  ),
};
