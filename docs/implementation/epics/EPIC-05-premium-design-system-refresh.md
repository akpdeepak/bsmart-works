# EPIC 05 - Premium Design System Refresh

## Blueprint references

- Implementation blueprint: EPIC 5 - Premium Design System Refresh
- UI/UX expanded blueprint: UX EPIC 5 - Design Tokens and Component Standardization
- V1.6 overlay: premium UX, brand placement, profile preferences, states, and microcopy

## Objective

Make layout, visual state, density, motion, and accessibility decisions enforceable through the
shared design system instead of repeated screen-level choices.

## Scope in this EPIC

- Replace the fixed dashboard content cap with an adaptive `max-w-workspace` token.
- Keep `max-w-reading` as the deliberate prose/document width.
- Update `PageLayout`, ESLint guardrails, Storybook labels, and affected surface tests.
- Apply the wider workspace token to dashboard-like work surfaces that were visually constrained.
- Record the design decision in the visual spec and UI/UX progress ledger.
- Enforce color, type, spacing/layout, radius, elevation, motion, and z-index token families.
- Standardize loading, empty, error, success, and permission states with reduced-motion behavior.
- Exercise core shared components in Storybook across light/dark themes and product densities.

## Acceptance criteria checklist

- [x] Dashboard-style `PageLayout` uses `max-w-workspace`.
- [x] Reading surfaces still use `max-w-reading`.
- [x] ESLint page-width guardrails sanction `max-w-workspace` and `max-w-reading`.
- [x] Tests cover the design-token contract.
- [x] Storybook naming reflects the adaptive workspace width.
- [x] Raw hex, arbitrary spacing, and arbitrary z-index fail blocking guardrails.
- [x] Shared state primitives and global reduced-motion behavior are present.
- [x] Storybook exposes light/dark and comfortable/compact/spacious controls.
- [x] Core molecule stories and tests are present.
- [x] Storybook a11y and axe-backed screen tests are enforced.

## Validation completed

- `cd works-frontend && npm test -- page-layout design-system-tokens`
- `cd works-frontend && npm run lint`
- `cd works-frontend && npm run build`
- `npm run verify`
- `cd works-frontend && npm run build-storybook`
- `node scripts/epics-01-05-completion.mjs`

Closeout result (2026-07-19): 1,771 frontend tests across 240 files, production and Storybook builds,
zero lint errors, 32 story files, and 21 axe-backed screen tests.
