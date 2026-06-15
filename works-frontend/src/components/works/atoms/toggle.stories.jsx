import { useState } from 'react';
import { Toggle } from './toggle';

export default {
  title: 'Works/Atoms/Toggle',
  component: Toggle,
  tags: ['autodocs'],
  parameters: { a11y: { test: 'error' } },
  argTypes: {
    size: { control: 'select', options: ['sm', 'md'] },
  },
};

export const Default = {
  args: { children: 'Enable notifications', size: 'md' },
};

export const Small = {
  args: { size: 'sm', children: 'Compact toggle' },
};

export const DefaultOn = {
  name: 'Default on (defaultChecked)',
  render: () => <Toggle defaultChecked>AI suggestions</Toggle>,
};

export const Disabled = {
  args: { disabled: true, children: 'Locked setting' },
};

export const DisabledOn = {
  name: 'Disabled + on',
  render: () => <Toggle disabled defaultChecked>Always enabled</Toggle>,
};

export const NoLabel = {
  name: 'Without label (aria-label)',
  render: () => <Toggle aria-label="Toggle dark mode" />,
};

export const Controlled = {
  render: () => {
    const [on, setOn] = useState(false);
    return (
      <div className="space-y-2">
        <Toggle checked={on} onChange={setOn}>
          Dark mode: {on ? 'On' : 'Off'}
        </Toggle>
        <p className="text-xs text-neutral-500">State: {String(on)}</p>
      </div>
    );
  },
};

export const ToggleGroup = {
  name: 'Toggle group (settings panel)',
  render: () => {
    const [prefs, setPrefs] = useState({ email: true, push: false, digest: true });
    const toggle = (key) => setPrefs((p) => ({ ...p, [key]: !p[key] }));
    return (
      <div className="space-y-4 max-w-sm">
        {[
          { key: 'email',  label: 'Email notifications' },
          { key: 'push',   label: 'Push notifications' },
          { key: 'digest', label: 'Weekly digest' },
        ].map(({ key, label }) => (
          <div key={key} className="flex items-center justify-between">
            <span className="text-sm text-neutral-900">{label}</span>
            <Toggle checked={prefs[key]} onChange={() => toggle(key)} aria-label={label} />
          </div>
        ))}
      </div>
    );
  },
};
