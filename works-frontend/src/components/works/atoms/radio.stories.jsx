import { useState } from 'react';
import { Radio, RadioGroup } from './radio';

export default {
  title: 'Works/Atoms/Radio',
  component: RadioGroup,
  tags: ['autodocs'],
  parameters: { a11y: { test: 'error' } },
};

export const Default = {
  name: 'Uncontrolled (defaultValue)',
  render: () => (
    <RadioGroup defaultValue="member">
      <Radio value="owner">Owner</Radio>
      <Radio value="admin">Admin</Radio>
      <Radio value="member">Member</Radio>
      <Radio value="viewer">Viewer</Radio>
    </RadioGroup>
  ),
};

export const Controlled = {
  render: () => {
    const [value, setValue] = useState('admin');
    return (
      <div className="space-y-3">
        <p className="text-xs text-neutral-500">Selected: <strong>{value}</strong></p>
        <RadioGroup value={value} onChange={setValue}>
          <Radio value="admin">Admin</Radio>
          <Radio value="member">Member</Radio>
          <Radio value="viewer">Viewer</Radio>
        </RadioGroup>
      </div>
    );
  },
};

export const WithDisabledOption = {
  name: 'With disabled option',
  render: () => (
    <RadioGroup defaultValue="member">
      <Radio value="owner" disabled>Owner (requires approval)</Radio>
      <Radio value="admin">Admin</Radio>
      <Radio value="member">Member</Radio>
    </RadioGroup>
  ),
};

export const WithInvalidOption = {
  name: 'Invalid state',
  render: () => (
    <RadioGroup defaultValue="">
      <Radio value="yes" invalid>Yes</Radio>
      <Radio value="no" invalid>No</Radio>
    </RadioGroup>
  ),
};

export const Priority = {
  name: 'Common: priority selector',
  render: () => {
    const [priority, setPriority] = useState('MEDIUM');
    return (
      <RadioGroup value={priority} onChange={setPriority}>
        {['CRITICAL', 'HIGH', 'MEDIUM', 'LOW'].map((p) => (
          <Radio key={p} value={p}>{p.charAt(0) + p.slice(1).toLowerCase()}</Radio>
        ))}
      </RadioGroup>
    );
  },
};
