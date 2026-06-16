import { Avatar } from './avatar';

export default {
  title: 'Works/Atoms/Avatar',
  component: Avatar,
  tags: ['autodocs'],
  parameters: {
    layout: 'centered',
  },
  argTypes: {
    size: {
      control: 'select',
      options: [5, 6, 7, 8],
    },
  },
};

export const Default = {
  args: {
    name: 'Deepak Pandey',
    size: 8,
  },
};

export const SingleWord = {
  args: {
    name: 'Alice',
    size: 8,
  },
};

export const NoName = {
  args: {
    name: '',
    size: 8,
  },
};

export const SizeXs = {
  args: { name: 'Jane Smith', size: 5 },
};

export const SizeSm = {
  args: { name: 'Jane Smith', size: 6 },
};

export const SizeMd = {
  args: { name: 'Jane Smith', size: 7 },
};

export const SizeLg = {
  args: { name: 'Jane Smith', size: 8 },
};

export const AvatarGroup = {
  render: () => (
    <div className="flex -space-x-1">
      <Avatar name="Alice Johnson" size={8} />
      <Avatar name="Bob Smith" size={8} />
      <Avatar name="Carol White" size={8} />
      <Avatar name="Dave Brown" size={8} />
    </div>
  ),
};
