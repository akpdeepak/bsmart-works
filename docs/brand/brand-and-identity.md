<!-- AUTO-EXTRACTED from Works-Brand-and-Identity.docx on 2026-05-31. Source of truth = the .docx in the
     same folder. Regenerate with: python3 scripts/extract-specs.py -->

> **Provenance:** machine-extracted from `Works-Brand-and-Identity.docx` (Brand & Identity).
> This Markdown mirror exists so every AI tool and teammate can read/diff the spec in-repo.
> Where this spec and the **code** disagree, the code is canonical — see [`/CLAUDE.md`](../../CLAUDE.md) (⚠️ flags).

---

Brand & Product Identity

Naming, design language, UX principles, and customization scope

A BCITS project — companion to the JIRA Alternative AI Build Spec and Amendment v2

Prepared for: Deepak Pandey

Date: May 2026

## Executive Summary

Product name: bSmart Works. It joins BCITS's bSmart product family (bSmart IoT, bSmart UHES, bSmart MDM, bSmart ORMS, bSmart GIS) and adopts the same brand prefix. 'Works' is where work gets done — plain, confident, and unmistakable. It also carries an industrial heritage (a 'works' is a place of production and engineering), which fits BCITS's utility-and-infrastructure roots. And it doubles as a promise: it works. Backed by what BCITS already promises: Timely Bound | Complete Control | SLA Commitment.

This document covers the brand decision, the visual identity (logo, colors, typography), the UX principles that follow from BCITS positioning, the no-code customization scope (what admins configure vs what needs developers), and the design tokens AI agents must use when building the product.

### Why bSmart Works

- Inherits BCITS brand equity — fits naturally into the bSmart product family
- 'Works' is instantly clear — it is the place where work happens; no explanation needed
- Echoes BCITS's existing taglines around reliability, timeliness, and SLA commitment
- Pronounceable in English and Hindi (AY-peks), 2 syllables, easy to remember
- No major brand collision in the SaaS market for project / work management category
- Wordmark scales cleanly from favicon to billboard

### Fallback name if standalone positioning is preferred

If BCITS leadership later wants to position this as a separate SaaS venture (not utility-coupled), the standalone name Works stands on its own. The brand asset structure documented here supports both modes — drop the 'bSmart' wordmark prefix and you have a clean standalone identity.

## 1. Naming

### 1.1 The decision

Primary product name: bSmart Works

Short form (in UI, URLs, internal references): Works

Both forms are acceptable. Full form 'bSmart Works' is used for marketing, contracts, the customer-facing portal, and the first launch screen. Short form 'Works' is used in product navigation, browser tabs, OS dock, mobile app name, and conversational reference ('open Works', 'pin this to Works').

### 1.2 Naming rationale

| Criterion | Why bSmart Works wins |
| --- | --- |
| Brand fit (BCITS) | BCITS uses 'bSmart' for every product. New tool joins the family naturally; sales team doesn't have to introduce a foreign brand. |
| Domain meaning | 'Works' = the place work gets done, plus the industrial heritage of a 'works' (a site of engineering and production). Fits BCITS's utility/infrastructure identity, and doubles as a quiet promise: it works. |
| Pronounceability | Two syllables, hard consonants, works in English and Hindi. Survives phone calls and customer demos. |
| Future-proofing | Doesn't lock the product to any single feature ('Tracker' or 'Board' would). Can expand into compliance, KPIs, portfolio without renaming. |
| Marketplace collision | No major SaaS product holds the name 'Works' in the work-management category today. Works Design Systems is in EDA / chip design — different market. |
| Legal | Conduct trademark search before launch in target jurisdictions (India, US, EU). Recommended classes: 9 (software), 42 (SaaS). |

### 1.3 Names considered and not chosen

| Candidate | Reason rejected |
| --- | --- |
| bSmart Flow | 'Flow' is generic in PM tooling (ProcessFlow, Flowable). Weak differentiation. |
| bSmart Track | Sounds like asset tracking, not project management. Confuses BCITS utility customers. |
| bSmart Forge | 'Forge' collides with Atlassian's developer platform — direct customer confusion. |
| bSmart Helm | Collides with Kubernetes Helm — confuses any technical buyer. |
| bSmart Pulse | Close runner-up — strong fit for compliance / KPI angle. Lost because 'Pulse' is overused (Microsoft Pulse, GitLab Pulse, employee-survey tools). |
| Lattice (standalone) | Already a major HR product. |
| Stride (standalone) | Was an Atlassian product, has historical baggage. |
| Crux (standalone) | Sharp but cold; doesn't communicate aspiration or delivery. |

### 1.4 Tagline options

Pick one for launch. Tagline appears on the marketing site, the login page, and the empty-state of the main app.

- Primary recommendation: 'Where work gets done.' — plain, confident, owns the product category
- Alternative 1: 'Plan, deliver, prove it.' — three verbs covering planning, delivery, compliance
- Alternative 2: 'Work, done right.' — ties to BCITS reliability and quality positioning
- Alternative 3: 'Every team. Every project. One place.' — emphasizes unification

## 2. Logo

### 2.1 Primary lockup

The primary logo is a horizontal lockup: glyph mark on the left, wordmark on the right. The wordmark uses two weights: 'bSmart' in light (300) grey, 'Works' in bold (700) navy. The visual hierarchy signals that 'Works' is the product name, 'bSmart' is the family.

### 2.2 Logo concept

The glyph encodes two ideas:

- Three rising bars — momentum and progress; capability compounding iteration over iteration
- Orange chevron pointing forward — delivery, motion, the direction of getting work done

Together they read as 'work moving forward' — the product's promise in one mark.

### 2.3 App icon (standalone glyph)

Used for: browser favicon, mobile app icon, OS dock, social avatars, push notifications, internal Slack integration.

### 2.4 Variants

#### Monochrome — for one-color print, faxes, watermarks

#### Reverse — for dark backgrounds (login screen, marketing hero, video overlays)

### 2.5 Logo usage rules

> Lock these — common AI / designer mistakes to prevent
> Minimum clear space: half the height of the glyph mark on all sides. Don't crowd it.
> Minimum size: glyph 24x24 px; full lockup 120 px wide. Below that, use the icon alone.
> Never stretch, skew, or recolor the glyph outside the approved palette.
> Never add drop shadows, bevels, glows, or 3D effects to the logo.
> Never place the primary navy logo on a navy background — use the reverse variant.
> Never rotate or animate the glyph as a brand mark. Loading spinners are a separate UI element, not the logo.
> The 'b' in 'bSmart' is always lowercase. Always. Even at the start of a sentence.
>

## 3. Color System

All colors are derived from or harmonized with BCITS's existing brand. Navy is the dominant brand color. Orange is the energy accent, used sparingly. Neutrals do 80% of the heavy lifting in the UI.

### 3.1 Brand colors

| Swatch | Name | Hex | Usage |
| --- | --- | --- | --- |
|  | BCITS Navy | #0B2F5C | Primary brand color. Logo, primary buttons, top navigation, headings, key UI surfaces. |
|  | Navy Tint | #1E4D8C | Hover / pressed state for primary surfaces. Secondary headings. |
|  | BCITS Orange | #E94E1B | Brand accent. Use sparingly. Call-to-action highlights, brand moments, the chevron in the glyph. |
|  | Amber Accent | #F39200 | Secondary accent. Use only for warnings or 'in-progress' attention states. |

> The orange accent rule
> Treat orange like cayenne pepper. On any screen, at most one prominent orange element should exist (a single primary call-to-action, a single 'new' badge, or one alert). Filling the UI with orange undoes its purpose. If everything is loud, nothing is.
>

### 3.2 Neutral palette

| Swatch | Name | Hex | Usage |
| --- | --- | --- | --- |
|  | Neutral 900 | #0F1A2A | Primary text. Dark UI backgrounds. |
|  | Neutral 700 | #2A3B52 | Subheading text, icon strokes. |
|  | Neutral 600 | #5A6B7E | Secondary text, captions, metadata. |
|  | Neutral 400 | #9AA8BC | Disabled text, placeholders. |
|  | Neutral 300 | #C9D2DF | Subtle dividers, disabled buttons. |
|  | Neutral 200 | #E5E9EF | Card borders, hr lines, table grid. |
|  | Neutral 100 | #F2F4F8 | Hover backgrounds, table stripes. |
|  | Neutral 50 | #F7F9FC | Page background. Default canvas. |
|  | White | #FFFFFF | Card backgrounds, modals, primary surfaces. |

### 3.3 Semantic colors

| Swatch | Name | Hex | Usage |
| --- | --- | --- | --- |
|  | Success | #0E7C5E | Done statuses, success toasts, positive metrics. Deliberately deeper than Slack green — feels operational, not playful. |
|  | Success surface | #E8F3EE | Success message backgrounds. |
|  | Warning | #B97A00 | At-risk SLAs, items approaching deadline, warning toasts. Amber, not yellow. |
|  | Warning surface | #FFF4E5 | Warning message backgrounds. |
|  | Danger | #C0392B | Breached SLAs, critical compliance violations, destructive actions, error toasts. |
|  | Danger surface | #FDE7E7 | Error message backgrounds. |
|  | Info | #1E4D8C | Information messages, neutral notifications. |
|  | Info surface | #E5EDF7 | Info message backgrounds. |

### 3.4 Status-category colors (for workflows / boards)

These are the colors used on board columns, status badges, and category chips. Locked across the product:

| Swatch | Name | Hex | Usage |
| --- | --- | --- | --- |
|  | Todo | #5A6B7E | Grey — work not started. Used on backlog items, To Do columns. |
|  | In Progress | #1E4D8C | Navy tint — active work. Used on In Progress, In Review columns. |
|  | Done | #0E7C5E | Success green — completed. Used on Done, Closed, Resolved columns. |

### 3.5 Accessibility constraints

- All text-on-background combinations meet WCAG AA (contrast ratio >= 4.5:1 for body text, >= 3:1 for large text)
- Primary navy on white = 11.4:1 ✓
- Neutral 600 on white = 5.1:1 ✓
- Orange on white = 4.6:1 ✓ for large text only — never use orange for body text
- Color is never the only signal — always pair with text, icon, or pattern
- Color-blind safe: success/warning/danger are distinguishable in deuteranopia and protanopia simulations

## 4. Typography

### 4.1 Type family

Primary: Inter (open-source, designed for UI, excellent at small sizes, broad weight range). Fallback stack ensures rendering even when Inter doesn't load.

> font-family: 'Inter', 'Segoe UI', -apple-system, BlinkMacSystemFont,
> 'Roboto', 'Helvetica Neue', Arial, sans-serif;
>

### 4.2 Type scale

| Token | Size / line | Weight | Usage |
| --- | --- | --- | --- |
| display | 40 / 48 | 700 bold | Hero text on empty states and marketing pages only |
| h1 | 30 / 38 | 700 bold | Page titles (project home, work item key+summary) |
| h2 | 24 / 32 | 600 semibold | Section headings |
| h3 | 20 / 28 | 600 semibold | Sub-section headings, card titles |
| h4 | 16 / 24 | 600 semibold | Inline labels, group headings |
| body-lg | 16 / 24 | 400 regular | Reading-heavy content (descriptions, KB articles) |
| body | 14 / 20 | 400 regular | Default UI text |
| body-sm | 13 / 18 | 400 regular | Dense table rows, metadata |
| caption | 12 / 16 | 400 regular | Timestamps, helper text, footnotes |
| mono | 13 / 20 | 500 medium | Code, IDs (e.g., WEB-1234), keyboard shortcuts. Use JetBrains Mono. |

### 4.3 Typography rules

- Letter spacing: -0.5% on h1 and h2 (tighter for visual weight); 0 on body
- Line length: 60-80 characters for reading text; no hard limit for table cells
- Numbers: tabular-nums for any column of numbers (alignment matters)
- Truncation: ellipsis after 1 line for titles in lists; show full text on hover/expand
- Language support: full Latin, Devanagari (for Hindi UI), Cyrillic, Greek covered by Inter

## 5. UX Principles

Five principles that flow directly from BCITS positioning. Use these to settle every UX dispute the AI surfaces during build.

### 5.1 Operational, not playful

BCITS customers are utilities and EPCs running production-critical infrastructure. Their day-to-day UI is SCADA, billing systems, and ITSM consoles — not Notion. The product should feel like a tool, not a toy.

> What this looks like in practice
> Information density is a feature, not a bug. Tables show many rows; cards are compact.
> No confetti, no emoji animations on task completion, no playful illustrations.
> Empty states are direct: 'No work items yet. Create one.' Not 'Looks like things are quiet here ✨'.
> Colors are restrained. The eye should be drawn to data, not chrome.
> Loading states show what's loading, not generic spinners.
>

### 5.2 Predictability over delight

Every action should land where users expect. Surprise is the enemy of speed for power users — and PMs running multiple projects ARE power users.

- Same action lives in the same place across screens (e.g., 'Create work item' always top-right of project pages)
- Keyboard shortcuts are consistent: 'c' creates, '/' searches, 'g p' goes to projects, regardless of context
- Destructive actions always require confirmation; non-destructive never do
- Undo is available for ALL non-destructive changes for 10 seconds via toast
- Navigation hierarchy is shallow: no action requires more than 2 clicks from any starting point

### 5.3 Configuration without code

The product is fully configurable through UI. Admins should never have to file a developer ticket to change a workflow, add a field, write a rule, or build a report. See Section 7 for the explicit scope of what no-code covers — and the small, honest set of things that still require developers.

### 5.4 Defaults that work

Every new project, board, workflow, dashboard, and report ships with sensible defaults that work for 80% of teams without configuration. Customization is for the 20% who need it, not a tax on the 80% who don't.

- New software project comes with: Default Software workflow, 3-column Kanban board, ranking enabled, story points field, default permission scheme
- New service project comes with: Default Service workflow, queues (All Open, Mine, Recent), CSAT enabled, KB linked
- New dashboard ships with: Assigned to Me, Open Work Items by Project, This Week's Activity

### 5.5 Honest visibility

Tied directly to the KPI guardrails from Amendment v2. The UI should make the data model honest. If a metric is at risk of misinterpretation, the UI shows the caveat — it does not hide complexity to look clean.

- Velocity charts show 'Sprint started with X points → ended with Y points' AND scope-change markers, not a single number
- Individual KPI views are clearly labeled 'Private to you'
- Manager views explicitly say 'Aggregated at team level. Individual data is not available here.'
- Compliance violations show the rule, the rationale, AND the acknowledgement option — never just a red dot
- SLA timers show the calendar in use ('Business hours: Mon-Fri 9-18 IST') so customers and agents know what they're seeing

## 6. UI Patterns and Components

Locked component patterns. The AI must use these and not invent variations.

### 6.1 Layout

> ┌─────────────────────────────────────────────────────────────┐
> │ [logo] [workspace ▾]   [search ⌘K]      [bell] [user ▾]    │  ← top bar 56px
> ├──────┬──────────────────────────────────────────────────────┤
> │      │                                                      │
> │ side │              main content area                       │
> │ nav  │                                                      │
> │ 240px│              max-width 1400px, padded                 │
> │      │                                                      │
> │      │                                                      │
> └──────┴──────────────────────────────────────────────────────┘
>

### 6.2 Component inventory

These are the only components in the system. AI may not invent new component types; it must compose from these.

| Component | Variants | When to use |
| --- | --- | --- |
| Button | primary, secondary, ghost, danger, icon-only | All actions |
| Input | text, password, number, search, textarea | All form fields |
| Select | single, multi, async | Picking from a list |
| Picker | user, project, work-item, version, label | Domain-specific selection with avatar/icon |
| DatePicker | single, range, with-time | Date and datetime fields |
| Combobox | with-create | Searchable + creatable (e.g., labels) |
| Toggle | — | Boolean settings |
| Checkbox / Radio | — | Form selections |
| Card | default, interactive, compact | Item containers |
| Table | default, sticky-header, virtualized | Data lists |
| Tabs | horizontal, vertical-side | Section switching within a view |
| Dialog / Modal | small, medium, large, full | Blocking actions |
| Drawer | right, left | Detail-view from a list without losing context |
| Toast | info, success, warning, danger | Transient feedback |
| Banner | info, success, warning, danger | Persistent in-page status |
| Badge / Chip | status, count, label, removable | Inline metadata |
| Avatar | user, group, bot, with-status-dot | Identity |
| Menu / Dropdown | actions, nested | Contextual actions |
| Tooltip | — | Short clarifications on hover/focus |
| Popover | — | Larger info bubbles, mini-forms |
| Empty state | default, with-action, illustration-light | When a list is empty |
| Skeleton | — | Loading state for content |
| Progress bar | linear, circular, indeterminate | Long operations |
| Stepper | horizontal, vertical | Multi-step flows (rule builder, onboarding) |

### 6.3 Spacing scale

All spacing in multiples of 4 px. No arbitrary values.

> space-0: 0       space-1: 4       space-2: 8
> space-3: 12      space-4: 16      space-5: 20
> space-6: 24      space-8: 32      space-10: 40
> space-12: 48     space-16: 64     space-20: 80
>

### 6.4 Border radius

> radius-sm: 4   (badges, chips, small buttons)
> radius-md: 8   (cards, inputs, dialogs, default buttons)
> radius-lg: 12  (large surfaces, modals)
> radius-xl: 22  (app icon background, hero containers)
> radius-full: 9999 (pills, avatars)
>

### 6.5 Elevation (shadows)

> shadow-sm: 0 1px 2px  rgba(11, 47, 92, 0.06)
> shadow-md: 0 2px 8px  rgba(11, 47, 92, 0.08)
> shadow-lg: 0 8px 24px rgba(11, 47, 92, 0.12)
> shadow-xl: 0 16px 48px rgba(11, 47, 92, 0.16)
>

Shadows use the navy hue at low opacity so they feel intentional, not generic grey.

## 7. No-Code Configuration — Scope and Boundary

Tu ne kaha 'configuration requires no code'. This section is explicit about what that means. Over-promising 'everything no-code' is worse than scoping. Below is exactly what admins configure without touching code, and the small honest set of things that still require developers.

### 7.1 What admins configure with zero code

| Capability | How it is configured |
| --- | --- |
| Workflows | Visual graph editor with drag-drop statuses and transitions. Conditions, validators, post-functions added via form. |
| Custom WorkItemTypes | Form: name, icon, color, default workflow, default fields. |
| Custom fields | Form: pick type from list, configure options, set default, set required-by-type, set visibility per role. |
| Field layouts per type | Drag-drop reordering with section grouping. Per WorkItemType, per project. |
| Roles and permissions | Permission matrix: rows are permissions, columns are roles, checkboxes. |
| Field visibility rules | Matrix UI: rows are fields, columns are roles, dropdowns (Visible / Read-only / Hidden). |
| Notification preferences | Per-event-type checkboxes for in-app and email channels. |
| Boards | Form: name, mode (Kanban/Scrum), source filter, columns mapped to statuses, swimlanes, quick filters, card layout. |
| Sprints | Form: name, start, end, goal. Drag items in. |
| Versions | Form: name, dates, description. Release / archive actions. |
| Components | Form: name, lead, default assignee, description. |
| Saved filters (WIQL) | Two modes — visual filter builder for common cases, raw WIQL editor with syntax highlighting and validation for advanced. |
| Dashboards and gadgets | Drag-drop layout. Each gadget configured via form, powered by a saved filter or built-in data source. |
| Automation rules | Trigger / Condition / Action builder. Drag-drop. Smart values via picker. |
| Compliance rules | Template-pick or build-from-scratch. WIQL scope + assertion via guided builder. Threshold sliders, severity dropdown. |
| KPI metrics | Built-in catalog with enable / disable toggles and visibility settings. Custom metrics via constrained formula builder (not raw SQL). |
| SLA policies | Form: scope WIQL, calendar, target time, start/pause/stop triggers picked from event list. |
| SLA calendars | Visual editor for working hours, holidays. |
| Service portal | Form: branding (logo, colors, custom domain), request types, form fields per request type, public/private toggle. |
| Email templates | Rich-text WYSIWYG editor with merge fields picked from a list. |
| Webhooks | Form: URL, events, scope WIQL, secret. Test-fire button. |
| Notification routing | Per-project rules: which events notify which roles, channels, batching cadence. |
| Onboarding / welcome experience | Per-workspace customizable empty states, welcome message, suggested first project template. |
| Branding (white-label tier) | Upload logo, set primary color, accent color. UI re-themes automatically with verified contrast checks. |

### 7.2 What still requires developers

Honest list. The product does not promise to make these no-code:

- New custom field TYPES beyond the shipped set (e.g., a geo-coordinate picker, a video upload field) — requires a developer to add to the field-type registry
- New gadget TYPES beyond the shipped catalog — same as above
- Integrations beyond webhooks and OAuth (e.g., a deep two-way Bitbucket integration) — requires developer code
- Custom AI agents beyond the shipped ones (iteration 10) — requires prompt engineering and possibly code
- Custom reports that don't fit the gadget model — developer adds a new gadget type
- Custom auth providers beyond SAML/OIDC/Google/Microsoft — developer adds via auth plugin interface
- Truly novel business logic that doesn't fit Automation, Workflow Post-functions, or Compliance Rules — developer adds via internal API

> Why we don't promise 'everything no-code'
> Every no-code platform that promises 'everything' either (a) builds in a Turing-complete scripting language and calls it 'no-code' (which is just hidden code with worse tooling), or (b) restricts users to a narrow set of things and fails when they outgrow it. We are honest: 95% of customizations are no-code; the remaining 5% are explicit developer extension points. We document both, and we make the 5% easy to access via clean APIs and webhooks rather than pretending it doesn't exist.
>

### 7.3 The visual rule builder pattern

Three builders share the same UI pattern so admins learn it once: Automation Rules, Compliance Rules, SLA Policies. The pattern is locked:

> ┌─ Step 1: When ────────────────────────────┐
> │  [Trigger dropdown]                        │
> │  [Trigger-specific fields]                 │
> └────────────────────────────────────────────┘
> ↓
> ┌─ Step 2: If ──────────────────────────────┐
> │  [Add condition +]                         │
> │   • [Field] [Operator] [Value]             │
> │   • [Add nested AND/OR]                    │
> └────────────────────────────────────────────┘
> ↓
> ┌─ Step 3: Then ────────────────────────────┐
> │  [Add action +]                            │
> │   • [Action type] [Action config]          │
> └────────────────────────────────────────────┘
> [Test on sample]  [Save as draft]  [Activate]
>

Always test before activate. Test mode runs the rule against a chosen sample WorkItem and shows what would happen, without actually doing it. This single feature prevents 90% of bad automation rules from going live.

## 8. Iconography and Illustrations

### 8.1 Icons

Use Lucide icons (open-source, large coverage, consistent stroke). 24x24 default, 20x20 inline, 16x16 dense.

- Stroke: 1.5 px at 24x24; never change
- Color: inherits text color via currentColor — icons in a navy heading are navy, icons in body text are neutral-900
- Never use icon-only buttons without an accessible label (aria-label or visually hidden text)
- Avoid icon ambiguity: 'eye' is view, 'edit' is pencil, 'delete' is trash, 'duplicate' is two squares. Don't reinvent.

### 8.2 Status / category icons (locked)

| Concept | Lucide icon |
| --- | --- |
| WorkItem | list-todo |
| Epic | layers |
| Story | book-open |
| Task | check-square |
| Bug | bug |
| Sub-task | git-branch |
| Incident | alert-triangle |
| Service Request | headphones |
| Sprint | timer |
| Backlog | list |
| Board | kanban |
| Compliance | shield-check |
| KPI / Metric | trending-up |
| SLA | gauge |
| Worklog | clock |
| Automation | zap |
| Webhook | webhook |
| Permission | lock |

### 8.3 Illustrations

Used sparingly. Only on empty states, error pages, onboarding.

- Style: flat, single-line, navy + orange palette only
- No human figures (avoids ethnicity / gender representation choices that age badly)
- Use abstract metaphors: blueprints, gears, paths, charts
- Never use stock illustrations or 'corporate memphis' style

## 9. Motion and Interaction

Motion communicates state changes. It should feel snappy and operational, not bouncy.

### 9.1 Timing

> instant:  0ms      (no animation — for state changes the user explicitly caused)
> fast:     150ms    (hover, focus, button-press feedback)
> base:     220ms    (default for most UI transitions)
> slow:     320ms    (modals, drawers, larger surface changes)
> slower:   480ms    (page transitions, only if needed)
>

### 9.2 Easing

> ease-out-quint: cubic-bezier(0.22, 1, 0.36, 1)   /* default */
> ease-spring:    cubic-bezier(0.34, 1.56, 0.64, 1)  /* sparingly, for delightful confirmations */
>

No bouncy springs on routine actions. Bounce is reserved for the 1% of moments that genuinely benefit (e.g., a successfully completed sprint celebration — at most once per sprint).

### 9.3 Loading states

- Below 200 ms: no spinner. Just show the result.
- 200-1000 ms: skeleton matching the eventual content shape.
- > 1000 ms: skeleton + progress indicator with descriptive label ('Loading work items...').
- Indeterminate operations: linear progress bar at top of viewport, navy color.

### 9.4 Optimistic UI

- Any user-initiated change reflects immediately. Server response confirms or reverts.
- Revert is communicated via toast with reason: 'Couldn't save: permission denied.'
- Drag-drop reorder, inline edit, transition, comment — all optimistic by default.

## 10. Design Tokens (for AI to consume)

This is the single source of truth for design constants. AI must use token names, not raw hex values, in code. Tokens are exported as CSS variables and TypeScript constants.

### 10.1 Token file structure

> src/tokens/
> colors.ts        // all color tokens
> typography.ts    // type scale, weights, families
> spacing.ts       // 4px-multiples scale
> radius.ts        // border-radius scale
> shadows.ts       // elevation scale
> motion.ts        // timing and easing
> z-index.ts       // layering scale
> index.ts         // re-exports + Tailwind config integration
>

### 10.2 Tailwind config (canonical)

> // tailwind.config.ts (partial)
> theme: {
> extend: {
> colors: {
> brand: {
> navy:        '#0B2F5C',
> 'navy-tint': '#1E4D8C',
> orange:      '#E94E1B',
> amber:       '#F39200',
> },
> neutral: {
> 50:  '#F7F9FC', 100: '#F2F4F8', 200: '#E5E9EF',
> 300: '#C9D2DF', 400: '#9AA8BC', 600: '#5A6B7E',
> 700: '#2A3B52', 900: '#0F1A2A',
> },
> semantic: {
> success:    '#0E7C5E',
> 'success-surface': '#E8F3EE',
> warning:    '#B97A00',
> 'warning-surface': '#FFF4E5',
> danger:     '#C0392B',
> 'danger-surface': '#FDE7E7',
> info:       '#1E4D8C',
> 'info-surface': '#E5EDF7',
> },
> status: {
> todo:        '#5A6B7E',
> 'in-progress': '#1E4D8C',
> done:        '#0E7C5E',
> }
> },
> fontFamily: {
> sans: ['Inter', 'Segoe UI', '-apple-system', 'sans-serif'],
> mono: ['JetBrains Mono', 'Consolas', 'monospace'],
> },
> borderRadius: {
> sm: '4px', md: '8px', lg: '12px', xl: '22px',
> },
> boxShadow: {
> sm: '0 1px 2px rgba(11, 47, 92, 0.06)',
> md: '0 2px 8px rgba(11, 47, 92, 0.08)',
> lg: '0 8px 24px rgba(11, 47, 92, 0.12)',
> xl: '0 16px 48px rgba(11, 47, 92, 0.16)',
> }
> }
> }
>

### 10.3 Forbidden in code

> AI must NOT do these
> Hex color literals in components (use the token: bg-brand-navy, not bg-[#0B2F5C])
> Arbitrary spacing values (use p-4, not p-[15px])
> Inline font sizes (use text-body, text-h2 — not style={{fontSize: '14px'}})
> New font families introduced ad hoc
> Reinventing semantic colors with different hex (no 'green-500' — use semantic.success)
> Shadows with rgba(0,0,0,...) — must use navy-tinted shadow tokens
>

## 11. White-Label and Multi-Brand Support

BCITS sells to utilities. Each utility customer may want their own logo and brand. This is an Enterprise-tier feature, locked in scope here.

### 11.1 What can be white-labeled

- Workspace logo (replaces bSmart Works in top bar for that workspace's users)
- Workspace favicon
- Primary brand color (one color; tints and semantic colors are derived automatically)
- Custom domain (cadence.customer.com)
- Email-from address (no-reply@cadence.customer.com)
- Email templates with customer branding
- Service portal full branding (separate from main app)

### 11.2 What cannot be white-labeled

- The app icon in OS dock / mobile springboard (stays bSmart Works — operating systems don't allow per-tenant icons)
- In-product help articles (always Works-branded)
- 'Powered by bSmart Works' footnote on service portal (removable only at Enterprise+ tier with separate contract)

### 11.3 Theming engine rules

When a workspace admin uploads a custom primary color, the system:

- Validates contrast: rejects colors that fail WCAG AA against white
- Derives tints / shades algorithmically (HSL adjustments)
- Keeps semantic colors (success, warning, danger) at brand defaults — health states must read universally
- Keeps neutrals at brand defaults
- Updates favicon and logo dynamically with new color

## 12. Instructions for the AI Building This Product

Pin this section. Re-read at the start of every UI-related iteration.

### 12.1 Hard rules

- Product name is 'bSmart Works' (full) or 'Works' (short). Never 'BCITS Tool', 'BCITS Tracker', 'Works Jira', or similar mashups.
- All color references in code use token names, not hex.
- All spacing is on the 4-px scale via Tailwind utility classes.
- All components come from the locked component inventory (Section 6.2). New components require explicit human approval.
- Logo SVGs are in src/assets/brand/. Never recreate them inline.
- The 'b' in 'bSmart' is always lowercase, including at the start of sentences.
- No emoji in product UI. No confetti animations. No bouncy springs except where explicitly approved.

### 12.2 Component library setup

Use shadcn/ui as the primitive layer. Wrap each shadcn component in a Works wrapper that injects the token-based design system. The AI should never import shadcn components directly into feature code — always import from the Works wrappers.

> // Good
> import { Button } from '@/components/cadence/button';
> // Bad
> import { Button } from '@/components/ui/button';
>

### 12.3 Common AI failures and prevention

| Failure mode | Symptom | Prevention |
| --- | --- | --- |
| Color drift | AI uses #1A73E8 (Google blue) instead of brand navy | Lint rule: no hex literals in components; only token references. |
| Component proliferation | AI creates a new 'FancyCard' instead of using Card | PR review: any new file in components/ must be approved. |
| Spacing chaos | AI uses padding: 15px arbitrarily | Lint rule: ban arbitrary Tailwind values (no p-[15px]). |
| Font drift | AI uses Roboto or System UI | Token-only font references. font-sans always = Inter. |
| Icon misuse | AI uses different icons for the same concept across screens | Locked icon mapping (Section 8.2) enforced in code review. |
| Brand collision | AI writes 'Atlassian' or 'Jira' in copy | Find/replace check before merge: no competitor names in product copy. |

### 12.4 Prompt addition for every UI feature

Add this block to every prompt asking AI to build UI:

> # Design constraints
> - Use design tokens only (src/tokens). No raw hex, no arbitrary spacing.
> - Compose from the locked component inventory (cadence/* wrappers around shadcn).
> - Brand is bSmart Works (BCITS). Operational tone, not playful.
> - Navy is primary. Orange is accent — at most one prominent orange element per screen.
> - Use Lucide icons with the locked concept-to-icon mapping.
> - All copy is direct and verb-first ('Create work item', not 'Let's create something new!').
> - All destructive actions require confirmation; non-destructive get a 10s undo toast.
> - Accessibility: WCAG AA contrast minimum, full keyboard navigation, ARIA labels on all icon-only controls.
>

## 13. Brand Asset Deliverables

Files generated alongside this document. Drop them into your codebase.

| File | Purpose |
| --- | --- |
| logo-primary.svg | Primary horizontal lockup. Use in app header, marketing site, login screen, email signature. |
| logo-primary.png | Raster fallback at 1280 px wide. For places that don't render SVG. |
| logo-icon.svg | Standalone glyph. Use as favicon, mobile app icon, OS dock, social avatar, push notification. |
| logo-icon.png | Raster icon at 512x512. Use as PWA manifest icon, mobile app icon stage. |
| logo-mono.svg | Single-color navy lockup. Use for print, monochrome contexts, watermarks. |
| logo-mono.png | Raster monochrome. |
| logo-reverse.svg | White-on-navy lockup. Use on dark backgrounds, marketing hero, video overlays. |
| logo-reverse.png | Raster reverse. |

### Next steps

- Conduct trademark clearance for 'bSmart Works' and 'Works' in target jurisdictions before public launch
- Generate PWA manifest icons at 192, 256, 384, 512 px from logo-icon.svg
- Generate Apple touch icons at 152, 167, 180 px
- Generate Android adaptive icon foreground and background layers
- Generate favicon.ico (multi-size: 16, 32, 48) and modern SVG favicon
- Generate Open Graph card template (1200x630) with logo + tagline placeholder
- Generate email signature template for BCITS team members representing the product
- Create a Figma file with the component library so designers and AI agents can iterate from a shared source

End of document.