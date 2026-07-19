<!-- GENERATED FROM ai-rules/ — do not edit by hand.
     Run: node scripts/generate-ai-rules.mjs
     Provider projection: Codex frontend scope. -->

# Frontend rules

Canonical detail: `ai-rules/rulebooks/30-DESIGN.md`. These rules apply only when this domain is in scope.

---

# Rule Book 30 — Design & UX

> Owns the **single design system** — look, feel, interaction, accessibility, content. Read after
> the [Orchestrator](../00-ORCHESTRATOR.md). **Enforced by:** ESLint (tokens, a11y) +
> `guardrails.sh` (hex, `gray-*`, `works-*`, z-index).
>
> **Note:** this book merges what were two overlapping design sections (CLAUDE.md §4 and §22) into
> one. Conflicts were resolved using the brand spec (`06 §6`) as tiebreaker; exact hex values are
> whatever `tailwind.config.js` ships (it is canonical for tokens). There is now **one** value per
> property — no second design section.

---

## 1. The non-negotiables
- **Tokens, never literals.** No raw hex, px, or font value in a component. Use token names
  (`brand-navy`, `brand-orange`, `neutral-600`, `semantic-danger`). Arbitrary values
  (`bg-[#0B2F5C]`, `p-[15px]`) and `works-*` / `gray-*` names **fail lint**. The token set is the
  contract — it is what keeps theming, dark mode, and white-label working.
- **One component pattern:** `cva` + `cn()` (see `button.jsx`). Every new component follows it.
- **Every interactive element has all five states:** default · hover · focus-visible · active ·
  disabled. None may be skipped.
- **Accessibility target is WCAG 2.2 AA, non-negotiable** (§6).

## 2. Color tokens
Use names; `tailwind.config.js` holds the hex.

| Token | Use |
|-------|-----|
| `brand-navy` (#0B2F5C) | Primary brand, headers, primary actions |
| `brand-navy-tint` (#1E4D8C) | Hover/secondary brand, focus ring |
| `brand-orange` (#E94E1B) | Single accent — sparingly, for the one primary CTA |
| `semantic-success` (#0E7C5E) · `-warning` (#B97A00) · `-danger` (#C0392B) | Status only |
| `neutral-50 / 100 / 200 / 300 / 400 / 600 / 700 / 900` | Surfaces → text, light to dark |

Readable text uses `neutral-900` (primary) or `neutral-600` (muted). **Never `neutral-400` for
readable text — it fails AA contrast** (it is the disabled/placeholder color). Executable token
configuration is current; changes require a design decision and contrast tests.

## 3. Typography — hierarchy through weight, not size soup
| Role | Class | Weight |
|------|-------|--------|
| Display (hero) | `text-3xl` | bold |
| H1 page title | `text-2xl` | bold |
| H2 section | `text-xl` | semibold |
| H3 sub-section | `text-base` | semibold |
| Body | `text-sm` | normal · `neutral-900` |
| Caption / meta | `text-xs` | normal · `neutral-600` |
| Eyebrow / label | `text-xs` uppercase, tracking-wide | semibold · `neutral-600` |
| Mono (IDs, code) | `font-mono` ~13px | — |

## 4. Spacing, radius, layout
- **4px base unit.** Card padding `p-4`/`p-6`; vertical rhythm `space-y-6` (24px between sections).
- **Radius:** `rounded-sm` 4 · `rounded-md` 8 · `rounded-lg` 12 · `rounded-xl` (22px in config —
  code is canonical; spec's 16px is superseded).
- **Widths:** dashboards/full surfaces `max-w-7xl`; reading/detail content **`max-w-reading`**. Both
  values are defined in the token configuration; components never use arbitrary width literals.
- **Three-zone shell (mandatory):** persistent left nav · top context bar · scrollable content.
  Nav has one expanded width and one collapsed width — pick the config token and use it everywhere
  (do not hand-set widths per screen).

## 5. Interaction & motion
- **Expand/collapse is the core model:** lists expand to detail in place or in a side panel; the
  shell persists. One pattern, applied everywhere.
- **Motion is purposeful, never decorative.** One scale: `duration-fast` 150ms (hover, press),
  `duration-base` 220ms (panels, accordions, drawers), `duration-slow` 320ms (page/large
  transitions). Respect `prefers-reduced-motion`.
- **State treatments (single canonical values):** focus → `focus-visible:ring-2
  ring-brand-navy-tint/40 ring-offset-2`; active/press → `active:translate-y-px`; disabled →
  `opacity-50` + `cursor-not-allowed`.

## 6. States, feedback & accessibility
- **Loading:** skeletons `animate-pulse bg-neutral-100` matching final layout — no spinners for
  content.
- **Empty:** explain *why* empty and *what to do next*; illustration icon `h-10 w-10 text-neutral-300`.
- **Error:** say *what went wrong* and *what to do about it*; never a raw stack trace.
- **WCAG 2.2 AA:** AA contrast on all text; full keyboard operability; visible focus; labelled
  controls; semantic HTML; target-size and focus-obscured criteria where applicable. JSX lint is one
  automated check, not proof of complete WCAG conformance; axe/E2E and design review complete it.

## 7. Navigation, components, content
- **Navigation:** one nav model; current location always indicated; no dead ends.
- **Components:** atomic structure (atoms → molecules → organisms); a component renders one
  responsibility; no inline HTTP, no raw styling values.
- **Logo:** use the supplied lockups and clear-space; never recolor or stretch.
- **Content:** plain, specific, action-oriented; sentence case; verbs in buttons ("Create work
  item", not "Submit"); no jargon where a plain word works.

## 8. Formatting & iconography
- **Dates/times/numbers:** one formatting layer, locale-aware; relative time for recent events,
  absolute on hover; never hand-format in components.
- **Icons:** Lucide, default 2px stroke from current configuration. Sizes: `16` inline · `20` buttons
  · `24` section. Icons are decorative unless labelled. Any stroke-system change needs one design
  decision and repository-wide migration.

## 9. Z-index — the single stacking scale
Use the named scale only (base → dropdown → sticky → overlay → modal → toast). Arbitrary `z-[...]`
**fails guardrails**. One source of truth for stacking; never invent a layer.

---

### What's enforced here
Exact enforcement classification is registered in `../policy-registry.json`. Tokens and restricted
classes are automated; full WCAG and visual/interaction quality retain executable axe/E2E plus
required design review.

---

# Task execution

For every task, record bounded scope, ordered steps, acceptance criteria, and validation before execution. Coding work uses RED → GREEN → REFACTOR. Repository changes use a linked GitHub task and PR; high-risk data, security, tenant, RBAC, AI, or irreversible migration work requires the documented checkpoint. Canonical detail: `ai-rules/rulebooks/05-TASK-EXECUTION.md`.
