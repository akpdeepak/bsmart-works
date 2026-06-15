import { Tooltip } from './tooltip';

export default {
  title: 'Works/Atoms/Tooltip',
  component: Tooltip,
  tags: ['autodocs'],
  parameters: {
    layout: 'centered',
  },
  args: {
    content: 'Tooltip text',
    side: 'top',
    delay: 350,
  },
  argTypes: {
    side: {
      control: 'select',
      options: ['top', 'bottom', 'left', 'right'],
    },
  },
};

export const Top = {
  args: { side: 'top', content: 'Opens above' },
  render: (args) => (
    <Tooltip {...args}>
      <button type="button" className="rounded-md bg-brand-navy px-3 py-1.5 text-sm text-white">
        Hover me
      </button>
    </Tooltip>
  ),
};

export const Bottom = {
  args: { side: 'bottom', content: 'Opens below' },
  render: (args) => (
    <Tooltip {...args}>
      <button type="button" className="rounded-md bg-brand-navy px-3 py-1.5 text-sm text-white">
        Hover me
      </button>
    </Tooltip>
  ),
};

export const Left = {
  args: { side: 'left', content: 'Opens left' },
  render: (args) => (
    <Tooltip {...args}>
      <button type="button" className="rounded-md bg-brand-navy px-3 py-1.5 text-sm text-white">
        Hover me
      </button>
    </Tooltip>
  ),
};

export const Right = {
  args: { side: 'right', content: 'Opens right' },
  render: (args) => (
    <Tooltip {...args}>
      <button type="button" className="rounded-md bg-brand-navy px-3 py-1.5 text-sm text-white">
        Hover me
      </button>
    </Tooltip>
  ),
};

export const NoDelay = {
  name: 'No delay',
  args: { side: 'top', content: 'Instant tooltip', delay: 0 },
  render: (args) => (
    <Tooltip {...args}>
      <button type="button" className="rounded-md border border-neutral-300 px-3 py-1.5 text-sm">
        Hover me (instant)
      </button>
    </Tooltip>
  ),
};
