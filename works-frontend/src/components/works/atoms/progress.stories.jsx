import { Progress } from './progress';

export default {
  title: 'Works/Atoms/Progress',
  component: Progress,
  tags: ['autodocs'],
  args: {
    value: 60,
    label: 'Progress',
  },
  argTypes: {
    tone: {
      control: 'select',
      options: ['default', 'success', 'warning', 'danger'],
    },
    size: {
      control: 'select',
      options: ['sm', 'md', 'lg'],
    },
  },
};

export const Default = {
  args: { value: 60 },
};

export const Success = {
  args: { tone: 'success', value: 100, label: 'Upload complete' },
};

export const Warning = {
  args: { tone: 'warning', value: 80, label: 'Storage usage' },
};

export const Danger = {
  args: { tone: 'danger', value: 95, label: 'AI budget' },
};

export const Indeterminate = {
  args: { value: undefined, label: 'Loading…' },
};

export const Sizes = {
  name: 'All sizes',
  render: () => (
    <div className="flex flex-col gap-4 p-4 max-w-sm">
      {['sm', 'md', 'lg'].map((size) => (
        <div key={size} className="flex flex-col gap-1">
          <span className="text-xs text-neutral-600">{size}</span>
          <Progress size={size} value={65} label={`Size ${size}`} />
        </div>
      ))}
    </div>
  ),
};

export const AllTones = {
  name: 'All tones',
  render: () => (
    <div className="flex flex-col gap-3 p-4 max-w-sm">
      {['default', 'success', 'warning', 'danger'].map((tone) => (
        <div key={tone} className="flex flex-col gap-1">
          <span className="text-xs text-neutral-600">{tone}</span>
          <Progress tone={tone} value={65} label={tone} />
        </div>
      ))}
    </div>
  ),
};
