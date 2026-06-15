import { Popover } from './popover';

const Trigger = (
  <button
    type="button"
    className="rounded-md border border-neutral-300 bg-white px-3 py-1.5 text-sm font-medium hover:bg-neutral-50 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-brand-navy-tint/40"
  >
    Open popover
  </button>
);

export default {
  title: 'Works/Atoms/Popover',
  component: Popover,
  tags: ['autodocs'],
  parameters: {
    layout: 'centered',
  },
  args: {
    side: 'bottom',
    align: 'start',
  },
  argTypes: {
    side: {
      control: 'select',
      options: ['top', 'bottom'],
    },
    align: {
      control: 'select',
      options: ['start', 'end', 'center'],
    },
  },
};

export const Default = {
  render: (args) => (
    <Popover {...args} trigger={Trigger}>
      <div className="p-4">
        <p className="text-sm font-semibold text-neutral-900">Popover title</p>
        <p className="mt-1 text-sm text-neutral-600">This is popover content. Click outside or press Escape to close.</p>
      </div>
    </Popover>
  ),
};

export const TopEnd = {
  name: 'Top / end',
  args: { side: 'top', align: 'end' },
  render: (args) => (
    <Popover {...args} trigger={Trigger}>
      <div className="p-4">
        <p className="text-sm text-neutral-700">Opens above, aligned to the end.</p>
      </div>
    </Popover>
  ),
};

export const WithForm = {
  name: 'With form content',
  render: (args) => (
    <Popover {...args} trigger={Trigger}>
      <div className="p-4 flex flex-col gap-3">
        <p className="text-sm font-semibold text-neutral-900">Assign member</p>
        <input
          type="text"
          placeholder="Search members…"
          className="w-full rounded-md border border-neutral-200 px-2 py-1.5 text-sm focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-brand-navy-tint/40"
        />
        <div className="flex justify-end gap-2">
          <button type="button" className="rounded px-2 py-1 text-xs text-neutral-600 hover:bg-neutral-100">Cancel</button>
          <button type="button" className="rounded bg-brand-navy px-2 py-1 text-xs text-white hover:bg-brand-navy-tint">Assign</button>
        </div>
      </div>
    </Popover>
  ),
};
