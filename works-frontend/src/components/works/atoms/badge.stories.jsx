import { Badge } from './badge';

export default {
  title: 'Works/Atoms/Badge',
  component: Badge,
  tags: ['autodocs'],
  args: {
    children: 'Badge',
  },
  argTypes: {
    tone: {
      control: 'select',
      options: ['neutral', 'brand', 'info', 'success', 'warning', 'danger'],
    },
  },
};

export const Neutral = {
  args: { tone: 'neutral', children: 'Neutral' },
};

export const Brand = {
  args: { tone: 'brand', children: 'Brand' },
};

export const Info = {
  args: { tone: 'info', children: 'Info' },
};

export const Success = {
  args: { tone: 'success', children: 'Success' },
};

export const Warning = {
  args: { tone: 'warning', children: 'At risk' },
};

export const Danger = {
  args: { tone: 'danger', children: 'Critical' },
};

export const WithCount = {
  name: 'Count badge',
  args: { tone: 'brand', children: '12' },
};

export const AllTones = {
  name: 'All tones',
  render: () => (
    <div className="flex flex-wrap gap-2 p-4">
      {['neutral', 'brand', 'info', 'success', 'warning', 'danger'].map((tone) => (
        <Badge key={tone} tone={tone}>{tone}</Badge>
      ))}
    </div>
  ),
};
