import { Toast } from './toast';

export default {
  title: 'Works/Atoms/Toast',
  component: Toast,
  tags: ['autodocs'],
  parameters: {
    // Toast is fixed-position; show in a tall container so it's visible in Storybook.
    layout: 'fullscreen',
  },
  decorators: [
    (Story) => (
      <div className="relative h-40 bg-neutral-50">
        <Story />
      </div>
    ),
  ],
};

export const Success = {
  args: {
    toast: { type: 'success', message: 'Work item created successfully.' },
  },
};

export const Error = {
  args: {
    toast: { type: 'error', message: 'Failed to save. Please try again.' },
  },
};

export const UndoWithAction = {
  args: {
    toast: { type: 'undo', message: 'Work item deleted.' },
    canUndo: true,
    onUndo: () => alert('Undo triggered'),
  },
};

export const UndoWithoutAction = {
  args: {
    toast: { type: 'undo', message: 'Work item moved to backlog.' },
    canUndo: false,
  },
};

export const Empty = {
  args: {
    toast: null,
  },
};
