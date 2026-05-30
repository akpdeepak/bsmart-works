/** @type {import('tailwindcss').Config} */
export default {
  content: [
    "./index.html",
    "./src/**/*.{js,ts,jsx,tsx}",
  ],
  theme: {
    extend: {
      colors: {
        brand: {
          navy:      '#0B2F5C',
          'navy-tint': '#1E4D8C',
          orange:    '#E94E1B',
          teal:      '#0E7C5E',
        },
        neutral: {
          900: '#0F1A2A',
          700: '#3C4858',
          600: '#5A6B7E',
          400: '#9AA8BC',
          200: '#E5E9EF',
          100: '#F2F4F8',
          50:  '#F7F9FC',
        },
        semantic: {
          success:         '#0E7C5E',
          'success-surface': '#ECFDF5',
          warning:         '#B97A00',
          'warning-surface': '#FFFBEB',
          danger:          '#C0392B',
          'danger-surface':  '#FEF2F2',
          info:            '#1E4D8C',
          'info-surface':    '#EFF6FF',
        },
      },
      fontFamily: {
        sans: ['Inter', '-apple-system', 'Segoe UI', 'Arial', 'sans-serif'],
        mono: ['JetBrains Mono', 'monospace'],
      },
      borderRadius: {
        sm: '4px',
        DEFAULT: '8px',
        md: '8px',
        lg: '12px',
        xl: '16px',
      },
      transitionDuration: {
        fast: '120ms',
      },
      transitionTimingFunction: {
        default: 'cubic-bezier(0.4, 0, 0.2, 1)',
      },
    },
  },
  plugins: [],
}
