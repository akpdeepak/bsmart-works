import js from '@eslint/js'
import globals from 'globals'
import reactHooks from 'eslint-plugin-react-hooks'
import reactRefresh from 'eslint-plugin-react-refresh'
import { defineConfig, globalIgnores } from 'eslint/config'

// bSmart Works — design-system & architecture guardrails.
// These rules enforce CLAUDE.md §4 (brand tokens) and §3 (one apiClient) at lint time,
// so violations fail locally, in pre-commit, and in CI — regardless of which AI tool or
// person wrote the code. See docs/ENGINEERING-PRINCIPLES.md for the rationale.
//
// Two blocks, because the rules have different readiness across the codebase:
//   A) Architecture/token rules — enforced everywhere except the apiClient itself.
//      App.jsx now passes these (its inline fetches were extracted to lib/apiClient.js).
//   B) Arbitrary-value rule — still exempts App.jsx, which uses ~60 intentional `text-[10px]`
//      density sizes. Follow-up: add tiny-font tokens (e.g. text-2xs/3xs) + the few layout
//      arbitraries (min-w-[80px], w-[500px]) to tailwind.config, convert, then drop this exempt.
const worksArchRules = {
  files: ['src/**/*.{js,jsx}'],
  ignores: ['src/lib/apiClient.js', 'src/lib/api-client.js'], // the ONE place fetch is allowed
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
        // Inline fetch() in components — all HTTP goes through the apiClient wrapper
        selector: "CallExpression[callee.name='fetch']",
        message:
          'No inline fetch() in components. Call the shared apiClient wrapper instead. See CLAUDE.md §3.',
      },
    ],
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

const worksArbitraryValueRule = {
  files: ['src/**/*.{js,jsx}'],
  // App.jsx exempt for now (intentional dense `text-[10px]` sizes — see follow-up note above).
  ignores: ['src/lib/apiClient.js', 'src/lib/api-client.js', 'src/App.jsx'],
  rules: {
    'no-restricted-syntax': [
      'error',
      {
        // Arbitrary pixel/rem values: p-[15px], w-[500px], text-[13px]
        selector: "Literal[value=/-\\[\\d+(px|rem)\\]/]",
        message:
          'No arbitrary px/rem values. Use the Tailwind scale or a design token. See CLAUDE.md §4.',
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
  worksArchRules,
  worksArbitraryValueRule,
])
