import '../src/index.css';

/** @type { import('@storybook/react-vite').Preview } */
const preview = {
  globalTypes: {
    theme: {
      description: 'Color theme',
      defaultValue: 'light',
      toolbar: {
        icon: 'paintbrush',
        items: [
          { value: 'light', title: 'Light' },
          { value: 'dark', title: 'Dark' },
        ],
      },
    },
    density: {
      description: 'Interface density',
      defaultValue: 'comfortable',
      toolbar: {
        icon: 'component',
        items: [
          { value: 'comfortable', title: 'Comfortable' },
          { value: 'compact', title: 'Compact' },
          { value: 'spacious', title: 'Spacious' },
        ],
      },
    },
  },
  decorators: [
    (Story, context) => {
      const theme = context.globals.theme || 'light';
      const density = context.globals.density || 'comfortable';
      return (
        <div className={theme === 'dark' ? 'dark' : ''} data-density={density}>
          <div className="min-h-screen bg-white p-6 text-neutral-900 dark:bg-neutral-900 dark:text-neutral-100">
            <Story />
          </div>
        </div>
      );
    },
  ],
  parameters: {
    controls: {
      matchers: {
        color: /(background|color)$/i,
        date: /Date$/i,
      },
    },
    a11y: {
      // 'error' — fail CI on a11y violations (WCAG 2.1 AA, RB-30 §6)
      test: 'error',
    },
  },
};

export default preview;
