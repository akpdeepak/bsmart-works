import { Button } from './button';
import { Plus, ArrowRight } from 'lucide-react';

export default {
  title: 'Works/Button',
  component: Button,
  tags: ['autodocs'],
  args: {
    children: 'Button',
  },
  argTypes: {
    variant: {
      control: 'select',
      options: ['primary', 'secondary', 'ghost', 'danger', 'action', 'link'],
    },
    size: {
      control: 'select',
      options: ['sm', 'md', 'lg', 'icon'],
    },
    loading: { control: 'boolean' },
    disabled: { control: 'boolean' },
    fullWidth: { control: 'boolean' },
  },
};

export const Primary = {
  args: {
    variant: 'primary',
    children: 'Create work item',
  },
};

export const Secondary = {
  args: {
    variant: 'secondary',
    children: 'Cancel',
  },
};

export const Danger = {
  args: {
    variant: 'danger',
    children: 'Delete',
  },
};

export const Action = {
  args: {
    variant: 'action',
    children: 'Save changes',
  },
};

export const Ghost = {
  args: {
    variant: 'ghost',
    children: 'More options',
  },
};

export const LinkVariant = {
  name: 'Link',
  args: {
    variant: 'link',
    children: 'View details',
  },
};

export const Loading = {
  args: {
    variant: 'primary',
    loading: true,
    children: 'Saving…',
  },
};

export const Disabled = {
  args: {
    variant: 'primary',
    disabled: true,
    children: 'Disabled',
  },
};

export const WithLeftIcon = {
  args: {
    variant: 'action',
    children: 'New item',
    leftIcon: <Plus className="h-4 w-4" aria-hidden="true" />,
  },
};

export const WithRightIcon = {
  args: {
    variant: 'secondary',
    children: 'Continue',
    rightIcon: <ArrowRight className="h-4 w-4" aria-hidden="true" />,
  },
};

export const Small = {
  args: {
    variant: 'primary',
    size: 'sm',
    children: 'Small',
  },
};

export const Large = {
  args: {
    variant: 'primary',
    size: 'lg',
    children: 'Large',
  },
};

export const FullWidth = {
  args: {
    variant: 'primary',
    fullWidth: true,
    children: 'Submit',
  },
};

export const AllVariants = {
  name: 'All variants',
  render: () => (
    <div className="flex flex-wrap gap-3 p-4">
      {['primary', 'secondary', 'ghost', 'danger', 'action'].map((v) => (
        <Button key={v} variant={v}>{v}</Button>
      ))}
    </div>
  ),
};

export const AllSizes = {
  name: 'All sizes',
  render: () => (
    <div className="flex items-center gap-3 p-4">
      <Button size="sm">Small</Button>
      <Button size="md">Medium</Button>
      <Button size="lg">Large</Button>
    </div>
  ),
};
