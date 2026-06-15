import { useState } from 'react';
import { Checkbox } from './checkbox';

export default {
  title: 'Works/Atoms/Checkbox',
  component: Checkbox,
  tags: ['autodocs'],
  parameters: { a11y: { test: 'error' } },
};

export const Default = {
  args: { children: 'Accept terms and conditions' },
};

export const Checked = {
  render: () => <Checkbox defaultChecked>Remember me</Checkbox>,
};

export const Disabled = {
  args: { disabled: true, children: 'Unavailable option' },
};

export const DisabledChecked = {
  name: 'Disabled + checked',
  render: () => <Checkbox disabled defaultChecked>Pre-selected (locked)</Checkbox>,
};

export const Invalid = {
  render: () => <Checkbox invalid>You must accept the terms</Checkbox>,
};

export const NoLabel = {
  name: 'Without label (aria-label)',
  render: () => <Checkbox aria-label="Select all rows" />,
};

export const Controlled = {
  name: 'Controlled',
  render: () => {
    const [checked, setChecked] = useState(false);
    return (
      <div className="space-y-2">
        <Checkbox checked={checked} onChange={(e) => setChecked(e.target.checked)}>
          Controlled: {checked ? 'On' : 'Off'}
        </Checkbox>
        <p className="text-xs text-neutral-500 pl-6">Value: {String(checked)}</p>
      </div>
    );
  },
};

export const CheckboxGroup = {
  name: 'Checkbox group',
  render: () => {
    const [selected, setSelected] = useState(['email']);
    const toggle = (v) => setSelected((prev) =>
      prev.includes(v) ? prev.filter((x) => x !== v) : [...prev, v]
    );
    return (
      <fieldset className="space-y-2">
        <legend className="text-sm font-semibold text-neutral-900 mb-2">Notifications</legend>
        {[
          { value: 'email', label: 'Email' },
          { value: 'push',  label: 'Push notifications' },
          { value: 'sms',   label: 'SMS' },
        ].map(({ value, label }) => (
          <Checkbox
            key={value}
            checked={selected.includes(value)}
            onChange={() => toggle(value)}
          >
            {label}
          </Checkbox>
        ))}
      </fieldset>
    );
  },
};
