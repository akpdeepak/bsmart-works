import { Input } from './input';

export default {
  title: 'Works/Atoms/Input',
  component: Input,
  tags: ['autodocs'],
  parameters: {
    layout: 'padded',
  },
  argTypes: {
    inputSize: {
      control: 'select',
      options: ['sm', 'md', 'lg'],
    },
    state: {
      control: 'select',
      options: ['default', 'error'],
    },
  },
};

export const Default = {
  args: {
    placeholder: 'Search work items…',
    inputSize: 'md',
    state: 'default',
  },
};

export const Small = {
  args: { placeholder: 'Filter…', inputSize: 'sm' },
};

export const Large = {
  args: { placeholder: 'Enter a title', inputSize: 'lg' },
};

export const ErrorState = {
  args: {
    placeholder: 'Email address',
    state: 'error',
    value: 'bad-email',
    invalid: true,
    readOnly: true,
  },
};

export const Disabled = {
  args: {
    placeholder: 'Disabled field',
    disabled: true,
  },
};

export const WithValue = {
  args: {
    value: 'Fix login redirect bug',
    readOnly: true,
  },
};

export const WithLabel = {
  render: () => (
    <div className="flex flex-col gap-1 w-64">
      <label htmlFor="title-input" className="text-sm font-medium text-neutral-900">
        Work item title
      </label>
      <Input id="title-input" placeholder="Enter a title" />
    </div>
  ),
};

export const WithLabelAndError = {
  render: () => (
    <div className="flex flex-col gap-1 w-64">
      <label htmlFor="email-input" className="text-sm font-medium text-neutral-900">
        Email
      </label>
      <Input id="email-input" state="error" invalid value="not-an-email" readOnly />
      <p className="text-xs text-semantic-danger">Please enter a valid email address.</p>
    </div>
  ),
};
