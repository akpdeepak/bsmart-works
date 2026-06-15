import { useState } from 'react';
import { Select } from './select';

export default {
  title: 'Works/Atoms/Select',
  component: Select,
  tags: ['autodocs'],
  parameters: { a11y: { test: 'error' } },
  argTypes: {
    selectSize: { control: 'select', options: ['sm', 'md', 'lg'] },
    state:      { control: 'select', options: ['default', 'error'] },
  },
};

const OPTIONS = [
  { value: '',       label: 'Choose…' },
  { value: 'owner',  label: 'Owner' },
  { value: 'admin',  label: 'Admin' },
  { value: 'member', label: 'Member' },
  { value: 'viewer', label: 'Viewer' },
];

export const Default = {
  render: () => (
    <Select aria-label="Role">
      {OPTIONS.map((o) => <option key={o.value} value={o.value}>{o.label}</option>)}
    </Select>
  ),
};

export const Small = {
  render: () => (
    <Select aria-label="Role" selectSize="sm">
      {OPTIONS.map((o) => <option key={o.value} value={o.value}>{o.label}</option>)}
    </Select>
  ),
};

export const Large = {
  render: () => (
    <Select aria-label="Role" selectSize="lg">
      {OPTIONS.map((o) => <option key={o.value} value={o.value}>{o.label}</option>)}
    </Select>
  ),
};

export const Error = {
  render: () => (
    <Select aria-label="Role" invalid>
      {OPTIONS.map((o) => <option key={o.value} value={o.value}>{o.label}</option>)}
    </Select>
  ),
};

export const Disabled = {
  render: () => (
    <Select aria-label="Role" disabled defaultValue="member">
      {OPTIONS.map((o) => <option key={o.value} value={o.value}>{o.label}</option>)}
    </Select>
  ),
};

export const Controlled = {
  name: 'Controlled',
  render: () => {
    const [value, setValue] = useState('');
    return (
      <div className="space-y-2 max-w-xs">
        <Select aria-label="Role" value={value} onChange={(e) => setValue(e.target.value)}>
          {OPTIONS.map((o) => <option key={o.value} value={o.value}>{o.label}</option>)}
        </Select>
        <p className="text-xs text-neutral-500">Selected: <strong>{value || 'none'}</strong></p>
      </div>
    );
  },
};
