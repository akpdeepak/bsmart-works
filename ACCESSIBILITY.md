# Accessibility — bSmart Works

> Iteration 20, Cap A (accessibility audit, WCAG 2.2 AA). Governed by **RB-30 §6** (states,
> feedback & accessibility). "Accessible **is** the design" — accessibility is a build
> non-negotiable, not a remediation afterthought.

## Conformance target

**WCAG 2.2 Level AA**, across the internal app, the customer portal, and all iteration-20 surfaces
(AI Studio, Marketplace, Developer Portal, Advanced Knowledge, Support Inbox + chat widget).

## How it is enforced (not just audited)

- **Lint gate (every save · pre-commit · CI):** `eslint-plugin-jsx-a11y` blocks the common failures
  — unlabelled controls, missing `alt`, non-semantic interactive elements, invalid ARIA, redundant
  roles. New files must pass clean (App.jsx legacy debt is isolated behind a file-level disable and
  is being paid down).
- **Design tokens (`guardrails.sh` + ESLint):** colour comes only from the token set, so AA contrast
  is a property of the palette, not of each component. `neutral-400` is reserved for
  placeholder/disabled/icon use and is never used for readable body text (RB-30 §2).
- **Component contract (RB-30 §1):** every interactive element ships all five states — default,
  hover, **focus-visible**, active, disabled — and the focus ring is a single canonical token
  (`focus-visible:ring-2 ring-brand-navy-tint/40`).

## Audit checklist (2.2 AA) and status

| Area | Requirement | Status in iteration 20 |
|------|-------------|------------------------|
| **Perceivable** | AA text contrast; non-text contrast for UI/icons; text resizes to 200% | Met via the token palette; layouts use the 4px scale and reflow. |
| **Operable — keyboard** | All functionality keyboard-reachable; visible focus; no keyboard traps | New views are fully keyboard-operable; lists are `role="button"` rows with `tabIndex` + `onKeyDown`; the chat widgets send on Enter and move focus to the input on open. |
| **Operable — 2.2 additions** | Focus Not Obscured (2.4.11); Dragging Movements have a non-drag alternative (2.5.7); Target Size ≥ 24px (2.5.8); consistent Focus Appearance | Board drag-drop has button/menu alternatives; interactive targets use ≥ `h-9`/`w-9` (36px) hit areas; sticky bars do not obscure the focused control. |
| **Operable — motion** | Respect `prefers-reduced-motion`; motion is purposeful | Motion uses the named duration scale and honours reduced-motion (RB-30 §5). |
| **Understandable** | Labelled controls; predictable navigation; clear errors that say what to do | `Field`/`label` association everywhere; one nav model; the standard error shape renders a human message, never a stack trace. |
| **Robust** | Valid semantic HTML; correct name/role/value; status messages announced | Semantic landmarks; live regions (`aria-live`) on the agent inbox and chat threads; tabs use `role="tablist"`/`role="tab"` with `aria-selected`. |
| **Internationalization** | `lang`/`dir` set; RTL support | The i18n provider sets `<html lang>` and flips `dir="rtl"` for Arabic (Cap A localization). |

## Screen-reader & keyboard-only verification

- **Screen reader:** primary flows (sign in, create/triage a work item, browse the board, ask an
  assistant, install a marketplace extension, customer chat) were walked with the platform screen
  reader; controls announce name + role + state, and async updates announce via live regions.
- **Keyboard only:** every iteration-20 flow is completable with no pointer — tab order is logical,
  focus is always visible, and dialogs/panels trap and restore focus correctly.

## Known follow-ups (logged, not blocking)

- Complete the App.jsx legacy-debt remediation so the file-level a11y/lint disable can be removed.
- Add automated axe-core checks to the Vitest suite for regression coverage on the high-traffic
  views (tracked in `TECH-DEBT.md`).
