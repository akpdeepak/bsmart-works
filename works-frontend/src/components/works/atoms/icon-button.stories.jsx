import { Settings, Trash2, Plus, X, Edit2 } from 'lucide-react';
import { IconButton } from './icon-button';

export default {
  title: 'Works/Atoms/IconButton',
  component: IconButton,
  tags: ['autodocs'],
  parameters: { a11y: { test: 'error' } },
  args: { 'aria-label': 'Action' },
  argTypes: {
    variant: { control: 'select', options: ['ghost', 'primary', 'secondary', 'danger'] },
    size:    { control: 'select', options: ['xs', 'sm', 'md', 'lg'] },
  },
};

export const Ghost = {
  args: { variant: 'ghost', 'aria-label': 'Settings', children: <Settings /> },
};

export const Primary = {
  args: { variant: 'primary', 'aria-label': 'Add', children: <Plus /> },
};

export const Secondary = {
  args: { variant: 'secondary', 'aria-label': 'Edit', children: <Edit2 /> },
};

export const Danger = {
  args: { variant: 'danger', 'aria-label': 'Delete', children: <Trash2 /> },
};

export const Disabled = {
  args: { variant: 'ghost', disabled: true, 'aria-label': 'Disabled', children: <Settings /> },
};

export const AllSizes = {
  name: 'All sizes',
  render: () => (
    <div className="flex items-center gap-3 p-4">
      {['xs', 'sm', 'md', 'lg'].map((size) => (
        <IconButton key={size} size={size} aria-label={`${size} button`}>
          <Settings />
        </IconButton>
      ))}
    </div>
  ),
};

export const AllVariants = {
  name: 'All variants',
  render: () => (
    <div className="flex items-center gap-3 p-4">
      <IconButton variant="ghost" aria-label="Ghost"><Settings /></IconButton>
      <IconButton variant="primary" aria-label="Primary"><Plus /></IconButton>
      <IconButton variant="secondary" aria-label="Secondary"><Edit2 /></IconButton>
      <IconButton variant="danger" aria-label="Danger"><Trash2 /></IconButton>
    </div>
  ),
};

export const WithClose = {
  name: 'Common: close/dismiss',
  render: () => (
    <div className="flex items-center gap-2 p-4 border border-neutral-200 rounded-lg max-w-xs">
      <span className="flex-1 text-sm text-neutral-900">Panel title</span>
      <IconButton size="sm" aria-label="Close"><X /></IconButton>
    </div>
  ),
};
