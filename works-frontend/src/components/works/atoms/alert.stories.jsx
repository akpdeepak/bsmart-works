import { useState } from 'react';
import { Alert } from './alert';

export default {
  title: 'Works/Atoms/Alert',
  component: Alert,
  tags: ['autodocs'],
  args: {
    title: 'Alert title',
    children: 'This is the alert body text.',
  },
  argTypes: {
    tone: {
      control: 'select',
      options: ['info', 'success', 'warning', 'danger'],
    },
  },
};

export const Info = {
  args: { tone: 'info', title: 'Information', children: 'Here is some helpful information.' },
};

export const Success = {
  args: { tone: 'success', title: 'Changes saved', children: 'Your settings have been updated.' },
};

export const Warning = {
  args: { tone: 'warning', title: 'Approaching limit', children: 'You have used 80% of your AI budget this month.' },
};

export const Danger = {
  args: { tone: 'danger', title: 'Action failed', children: 'Unable to delete the work item. Try again.' },
};

export const TitleOnly = {
  name: 'Title only',
  args: { tone: 'info', title: 'No body text', children: undefined },
};

export const Dismissible = {
  render: () => {
    const [visible, setVisible] = useState(true);
    return visible ? (
      <Alert tone="warning" title="Expiring soon" onDismiss={() => setVisible(false)}>
        Your subscription expires in 3 days.
      </Alert>
    ) : (
      <p className="text-sm text-neutral-600">Alert dismissed.</p>
    );
  },
};

export const AllTones = {
  name: 'All tones',
  render: () => (
    <div className="flex flex-col gap-3 p-4 max-w-lg">
      {['info', 'success', 'warning', 'danger'].map((tone) => (
        <Alert key={tone} tone={tone} title={tone.charAt(0).toUpperCase() + tone.slice(1)}>
          This is a {tone} alert with body text.
        </Alert>
      ))}
    </div>
  ),
};
