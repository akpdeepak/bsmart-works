import '../src/index.css';

/** @type { import('@storybook/react-vite').Preview } */
const preview = {
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
