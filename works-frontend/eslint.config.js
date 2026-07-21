// For more info, see https://github.com/storybookjs/eslint-plugin-storybook#configuration-flat-config-format
import storybook from "eslint-plugin-storybook";

import js from '@eslint/js'
import globals from 'globals'
import reactHooks from 'eslint-plugin-react-hooks'
import reactRefresh from 'eslint-plugin-react-refresh'
import jsxA11y from 'eslint-plugin-jsx-a11y'
import { defineConfig, globalIgnores } from 'eslint/config'

// Vitest globals (describe, it, expect, vi, …) for test files.
// Avoids `'expect' is not defined` no-undef errors in *.test.jsx files.
const vitestTestConfig = {
  files: ['src/**/*.test.{js,jsx}', 'src/**/*.spec.{js,jsx}'],
  languageOptions: {
    globals: { ...globals.browser, describe: 'readonly', it: 'readonly', expect: 'readonly', vi: 'readonly', beforeEach: 'readonly', afterEach: 'readonly', beforeAll: 'readonly', afterAll: 'readonly' },
  },
}

// bSmart Works — design-system & architecture guardrails.
// These rules enforce CLAUDE.md §4 (brand tokens) and §3 (one apiClient) at lint time,
// so violations fail locally, in pre-commit, and in CI — regardless of which AI tool or
// person wrote the code. See docs/ENGINEERING-PRINCIPLES.md for the rationale.
//
// Two blocks, because the rules have different readiness across the codebase:
//   A) Architecture/token rules — enforced everywhere except the apiClient itself.
//      App.jsx now passes these (its inline fetches were extracted to lib/apiClient.js).
//   B) Arbitrary-value rule — enforced everywhere (WI-07: text-2xs token added; App.jsx
//      arbitrary text sizes converted; exemption retired).
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
  ignores: ['src/lib/apiClient.js', 'src/lib/api-client.js'],
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

// WI-02 (UIUX M0): Structural guardrails for views/ — warn-only pending full primitive adoption.
// Implemented as an inline ESLint plugin so these warnings co-exist with the error-level arch
// rules above without overriding them (two no-restricted-syntax blocks at different severities
// for the same files would shadow each other in flat config).
//
// Rules (all 'warn' now; flipped to 'error' in WI-21 once all views are migrated):
//   no-raw-table     — use <DataTable> from atoms/ (WI-04) instead of raw <table>
//   no-raw-button    — use <Button> from components/works/ instead of raw <button>
//   no-inline-card-chrome — use <Card> from atoms/ instead of hand-rolled shadow+rounded divs
//   sanctioned-page-widths — only max-w-workspace (dashboard) or max-w-reading (content) in page shells
const worksViewStructurePlugin = {
  rules: {
    'no-raw-table': {
      meta: { type: 'suggestion', docs: { description: 'Disallow raw <table> in views — use <DataTable>.' } },
      create(context) {
        return {
          JSXOpeningElement(node) {
            if (node.name.type === 'JSXIdentifier' && node.name.name === 'table') {
              context.report({
                node,
                message: 'Raw <table> in views/: use <DataTable> from @/components/works/atoms (WI-04). UIUX-M0.',
              });
            }
          },
        };
      },
    },

    'no-raw-button': {
      meta: { type: 'suggestion', docs: { description: 'Disallow raw <button> in views — use <Button>.' } },
      create(context) {
        return {
          JSXOpeningElement(node) {
            if (node.name.type === 'JSXIdentifier' && node.name.name === 'button') {
              context.report({
                node,
                message: 'Raw <button> in views/: use <Button> from @/components/works/button. RB-30.',
              });
            }
          },
        };
      },
    },

    'no-inline-card-chrome': {
      meta: { type: 'suggestion', docs: { description: 'Disallow hand-rolled card-chrome (rounded+shadow) — use <Card>.' } },
      create(context) {
        return {
          JSXAttribute(node) {
            if (node.name.name !== 'className') return;
            const val = node.value?.type === 'Literal' ? node.value.value : null;
            if (!val) return;
            const tag = node.parent?.name?.type === 'JSXIdentifier' ? node.parent.name.name : null;
            const layoutElement = tag === 'div' || tag === 'section' || tag === 'article';
            const staticShadow = val.split(/\s+/).some((cls) => cls.startsWith('shadow-'));
            const floatingOverlay = /\b(?:absolute|fixed|z-dropdown)\b/.test(val);
            if (layoutElement && staticShadow && !floatingOverlay && /\brounded[-\w]/.test(val)) {
              context.report({
                node,
                message: 'Inline card-chrome (rounded+shadow) in views/: use <Card variant="elevated|outlined|flat"> from @/components/works/atoms/card. WI-01.',
              });
            }
          },
        };
      },
    },

    'sanctioned-page-widths': {
      meta: { type: 'suggestion', docs: { description: 'Only max-w-workspace and max-w-reading are sanctioned page widths.' } },
      create(context) {
        const SANCTIONED = new Set([
          'max-w-workspace', 'max-w-reading',
          // Utility values that are never used as page-shell widths:
          'max-w-full', 'max-w-none', 'max-w-fit', 'max-w-min', 'max-w-max', 'max-w-prose', 'max-w-screen',
        ]);
        return {
          JSXAttribute(node) {
            if (node.name.name !== 'className') return;
            const val = node.value?.type === 'Literal' ? node.value.value : null;
            if (!val) return;
            // Component-level truncation and modal/drawer widths are legitimate. This rule governs
            // centered page shells, identified by mx-auto, rather than every max-w utility.
            if (!val.split(/\s+/).includes('mx-auto')) return;
            const bad = val.split(/\s+/).filter(
              (cls) => cls.startsWith('max-w-') && !SANCTIONED.has(cls) && !cls.startsWith('max-w-screen-'),
            );
            if (bad.length > 0) {
              context.report({
                node,
                message: `Non-sanctioned page width "${bad[0]}" in views/: use max-w-workspace (dashboard) or max-w-reading (content). RB-30 §4.`,
              });
            }
          },
        };
      },
    },
  },
};

// WI-21: structural rules flipped to 'error' for all view files.
// New view files MUST use design-system primitives — raw <button>/<table>/card-chrome will fail CI.
const worksViewStructureRules = {
  files: ['src/views/**/*.{js,jsx}'],
  plugins: { 'works-view': worksViewStructurePlugin },
  rules: {
    'works-view/no-raw-table': 'error',
    'works-view/no-raw-button': 'error',
    'works-view/no-inline-card-chrome': 'error',
    'works-view/sanctioned-page-widths': 'error',
  },
};

// Accessibility — enforces CLAUDE.md §4.17 (WCAG 2.1 AA) at lint time: icon-only buttons
// need aria-label, click handlers on non-interactive elements need keyboard handlers + role,
// etc. App.jsx (the legacy monolith) may surface violations — that's documented baseline debt
// (lint is continue-on-error in CI), but all NEW components must pass clean.
const worksA11yRules = {
  files: ['src/**/*.{js,jsx}'],
  ...jsxA11y.flatConfigs.recommended,
}

// NOTE: eslint-plugin-tailwindcss is intentionally NOT used. No published version fits this
// stack: we're on Tailwind 4 + ESLint 10, and the plugin's released lines don't support
// ESLint 10 — they still call the `context.getSourceCode()` API that ESLint 9 removed.
// Tailwind token/class enforcement instead lives in: (a) the worksArchRules below (no raw hex,
// no works-*), and (b) scripts/guardrails.sh (no gray-*, arbitrary-value checks). Revisit if
// the plugin ships an ESLint-10-compatible build.

// Playwright E2E + its config run under Node (process, etc.) but also use browser globals
// (window/localStorage inside page.addInitScript callbacks). Give those files both.
const e2eNodeConfig = {
  files: ['e2e/**/*.js', 'playwright.config.js'],
  languageOptions: {
    globals: { ...globals.node, ...globals.browser },
  },
}

// WI-21: react-hooks/set-state-in-effect is in the recommended config at 'error', but the
// codebase uses the idiomatic `useEffect(() => { load(); }, [load])` pattern (async external-state
// sync) throughout views/. These are not genuinely harmful (the setState in `load` fires
// asynchronously in a .then()); downgrading to 'warn' keeps the signal visible without breaking CI.
const worksHookOverrides = {
  files: ['src/**/*.{js,jsx}'],
  rules: { 'react-hooks/set-state-in-effect': 'warn' },
};

export default defineConfig([globalIgnores(['dist', 'storybook-static']), vitestTestConfig, e2eNodeConfig, {
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
}, worksA11yRules, worksArchRules, worksArbitraryValueRule, worksHookOverrides, worksViewStructureRules, ...storybook.configs["flat/recommended"]])
