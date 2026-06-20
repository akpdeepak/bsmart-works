# EPIC 05 - Premium Design System Refresh

## Blueprint references

- Implementation blueprint: EPIC 5 - Premium Design System Refresh
- UI/UX expanded blueprint: UX EPIC 5 - Design Tokens and Component Standardization
- V1.6 overlay: premium UX, brand placement, profile preferences, states, and microcopy

## Objective

Make premium layout decisions enforceable through shared design-system tokens instead of repeated
screen-level width choices.

## Scope in this EPIC slice

- Replace the fixed dashboard content cap with an adaptive `max-w-workspace` token.
- Keep `max-w-reading` as the deliberate prose/document width.
- Update `PageLayout`, ESLint guardrails, Storybook labels, and affected surface tests.
- Apply the wider workspace token to dashboard-like work surfaces that were visually constrained.
- Record the design decision in the visual spec and UI/UX progress ledger.

## Acceptance criteria checklist

- [x] Dashboard-style `PageLayout` uses `max-w-workspace`.
- [x] Reading surfaces still use `max-w-reading`.
- [x] ESLint page-width guardrails sanction `max-w-workspace` and `max-w-reading`.
- [x] Tests cover the design-token contract.
- [x] Storybook naming reflects the adaptive workspace width.

## Validation planned

- `cd works-frontend && npm test -- page-layout design-system-tokens`
- `cd works-frontend && npm run lint`
- `cd works-frontend && npm run build`
- `npm run verify`

## Follow-on notes

- Future EPIC 5 slices should continue with strict token adoption for state surfaces, focus rings,
  density usage, skeletons, and Storybook coverage across the remaining shared components.
