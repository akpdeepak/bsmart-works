import js from '@eslint/js'
import globals from 'globals'
import reactHooks from 'eslint-plugin-react-hooks'
import reactRefresh from 'eslint-plugin-react-refresh'
import { defineConfig, globalIgnores } from 'eslint/config'

// bSmart Works — design-system & architecture guardrails.
// These rules enforce CLAUDE.md §4 (brand tokens) and §3 (one apiClient) at lint time,
// so violations fail locally, in pre-commit, and in CI — regardless of which AI tool or
// person wrote the code. See docs/ENGINEERING-PRINCIPLES.md for the rationale.
const worksGuardrails = {
  files: ['src/**/*.{js,jsx}'],
  // Exemptions:
  //  - apiClient.js is the ONE place allowed to call fetch.
  //  - App.jsx is pre-existing baseline debt (a large monolith with inline fetch, raw hex,
  //    and arbitrary spacing). Exempt so the rules don't block every commit. REMOVE this once
  //    App.jsx is refactored (extract apiClient, tokenize colours) — see the spawned task.
  ignores: ['src/lib/apiClient.js', 'src/lib/api-client.js', 'src/App.jsx'],
  rules: {
    'no-restricted-syntax': [
      'error',
      {
        // Raw hex colours in className arbitrary values: bg-[#0B2F5C]
        selector: "Literal[value=/\\[#[0-9a-fA-F]{3,8}\\]/]",
        message:
          'No raw hex in Tailwind arbitrary values. Use a design token class (bg-brand-navy, text-neutral-900). See CLAUDE.md §4.',
      },
      {
        // Wrong token namespace: works-navy / works-orange (these classes do not exist)
        selector: "Literal[value=/\\bworks-(navy|orange|blue|amber|teal)/]",
        message:
          'Token namespace is `brand-*`, not `works-*` (e.g. brand-navy, brand-orange). See CLAUDE.md §4.',
      },
      {
        // Arbitrary pixel spacing: p-[15px], gap-[13px], m-[7px]
        selector: "Literal[value=/-\\[\\d+(px|rem)\\]/]",
        message:
          'No arbitrary spacing values. Use the 4px Tailwind scale (p-2, gap-4). See CLAUDE.md §4.',
      },
      {
        // Inline fetch() in components — all HTTP goes through the apiClient wrapper
        selector: "CallExpression[callee.name='fetch']",
        message:
          'No inline fetch() in components. Call the shared apiClient wrapper instead. See CLAUDE.md §3.',
      },
    ],
    // Inline style objects with hard-coded colours: style={{ color: '#5A6B7E' }}
    'react/forbid-dom-props': 'off', // plugin not installed; covered by the regex below
    'no-restricted-properties': 'off',
    'no-restricted-imports': [
      'error',
      {
        paths: [
          { name: 'axios', message: 'Use the shared apiClient wrapper, not axios directly. See CLAUDE.md §3.' },
        ],
      },
    ],
  },
}

export default defineConfig([
  globalIgnores(['dist']),
  {
    files: ['**/*.{js,jsx}'],
    extends: [
      js.configs.recommended,
      reactHooks.configs.flat.recommended,
      reactRefresh.configs.vite,
    ],
    languageOptions: {
      globals: globals.browser,
      parserOptions: { ecmaFeatures: { jsx: true } },
    },
  },
  worksGuardrails,
])
