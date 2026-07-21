/** @type {import('tailwindcss').Config} */
export default {
  darkMode: 'class',
  content: [
    "./index.html",
    "./src/**/*.{js,ts,jsx,tsx}",
  ],
  theme: {
    extend: {
      // Canonical design tokens — single source of truth.
      // Spec: 04-brand-assets/Works-Brand-and-Identity.docx §10.2
      colors: {
        brand: {
          navy:        '#0B2F5C',
          'navy-tint': '#1E4D8C',
          orange:      '#E94E1B',
          amber:       '#F39200',
        },
        neutral: {
          900: '#0F1A2A',
          800: '#1A2638',
          700: '#2A3B52',
          600: '#5A6B7E',
          500: '#7A8AA0',
          400: '#9AA8BC',
          300: '#C9D2DF',
          200: '#E5E9EF',
          100: '#F2F4F8',
          50:  '#F7F9FC',
        },
        semantic: {
          success:           '#0E7C5E',
          'success-surface': '#E8F3EE',
          warning:           '#B97A00',
          'warning-surface': '#FFF4E5',
          danger:            '#C0392B',
          'danger-surface':  '#FDE7E7',
          info:              '#1E4D8C',
          'info-surface':    '#E5EDF7',
        },
        status: {
          todo:          '#5A6B7E',
          'in-progress': '#1E4D8C',
          done:          '#0E7C5E',
        },
      },
      fontSize: {
        display: ['2.5rem', { lineHeight: '3rem', fontWeight: '700' }],
        title: ['2rem', { lineHeight: '2.5rem', fontWeight: '700' }],
        heading: ['1.5rem', { lineHeight: '2rem', fontWeight: '700' }],
        subheading: ['1.125rem', { lineHeight: '1.75rem', fontWeight: '600' }],
        body: ['0.875rem', { lineHeight: '1.375rem' }],
        'body-sm': ['0.8125rem', { lineHeight: '1.25rem' }],
        caption: ['0.75rem', { lineHeight: '1rem' }],
        overline: ['0.6875rem', { lineHeight: '0.875rem', fontWeight: '700', letterSpacing: '0' }],
        // Sub-12px label used on the narrow icon mode-rail (mockup). Token, not an arbitrary value.
        '2xs': ['0.625rem', { lineHeight: '0.875rem' }],
        '3xs': ['0.5625rem', { lineHeight: '0.75rem' }],
      },
      fontFamily: {
        sans: ['Inter', 'Segoe UI', '-apple-system', 'BlinkMacSystemFont', 'Roboto', 'Helvetica Neue', 'Arial', 'sans-serif'],
        mono: ['JetBrains Mono', 'Consolas', 'monospace'],
      },
      borderRadius: {
        sm: '4px',
        DEFAULT: '8px',
        md: '8px',
        lg: '12px',
        xl: '22px',
        full: '9999px',
      },
      boxShadow: {
        sm: '0 1px 2px rgba(11, 47, 92, 0.06)',
        md: '0 2px 8px rgba(11, 47, 92, 0.08)',
        lg: '0 8px 24px rgba(11, 47, 92, 0.12)',
        xl: '0 16px 48px rgba(11, 47, 92, 0.16)',
      },
      transitionDuration: {
        instant: '0ms',
        fast:    '150ms',
        base:    '220ms',
        slow:    '320ms',
        slower:  '480ms',
      },
      transitionTimingFunction: {
        'out-quint': 'cubic-bezier(0.22, 1, 0.36, 1)',
        spring:      'cubic-bezier(0.34, 1.56, 0.64, 1)',
      },
      // Reading-column max-width (RB-30 §4). Use max-w-reading for detail/document content.
      maxWidth: {
        reading: '880px',
        workspace: 'clamp(80rem, 94vw, 104rem)',
      },
      // Named min-height values — avoids banned arbitrary [px] values in settings/content panels.
      minHeight: {
        content: '520px',   // minimum height for settings tab panels (detail-fields tab, etc.)
      },
      // Layout dimensions as tokens — so the three-zone shell never needs banned arbitrary
      // px values (w-[360px]). Matches CLAUDE.md §4.6. Use w-sidebar / w-panel etc.
      width: {
        sidebar:             '240px',
        'sidebar-collapsed': '48px',
        panel:               '360px',
        // Two-tier shell (mockup): a narrow navy icon mode-rail + a contextual surface sub-rail.
        rail:                '72px',
        subrail:             '208px',
      },
      // Stacking order — single source of truth so sidebar / sticky header / dropdown / panel /
      // modal / command palette / toast never fight. Matches CLAUDE.md §4.21. Use z-sticky etc.
      zIndex: {
        base:     '0',
        sticky:   '20',  // page-level sticky header bar (in-content sticky tables stay z-10)
        dropdown: '30',  // dropdowns, context menus, tooltips
        panel:    '40',  // right contextual slide-in panel
        bulkbar:  '45',  // bulk-action bar
        modal:    '50',  // modal / dialog + backdrop
        palette:  '60',  // command palette (⌘K)
        toast:    '70',  // toasts / notifications — always on top
      },
    },
  },
  plugins: [],
}
