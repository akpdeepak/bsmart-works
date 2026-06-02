<!-- GENERATED FROM CLAUDE.md — do not edit by hand.
     Edit CLAUDE.md and run: node scripts/generate-ai-rules.mjs
     This file is the cross-tool AGENTS.md view of the same rules. -->

# bSmart Works — AI Development Context

> **For AI tools:** This file is the single source of truth for coding decisions in this repo.
> Read it fully before writing code or answering questions about this project.
> **Every fact below is verified against the actual codebase, not just the spec docs.**
> Where the spec and the code disagree, the code wins and the gap is flagged with ⚠️.

---

## 0. Product & Engineering Principles

> **These are permanent operational constants. Apply them to every task, in order, before writing any code or making any architectural decision.**

### 0.1 Core Product Ethos
- **Cognitive Ease:** Interfaces must be clean, minimal, and professional. Prioritise user focus and reduce visual noise.
- **Responsive Adaptability:** UI components must support fluid expand/collapse and fluid resize behaviours.
- **Visual Engagement:** Maintain the modern, sleek aesthetic defined in §4. Everything built must be consistent with the established design system.

### 0.2 Engineering Standards
- **Modular Architecture:** Solutions must be decoupled and modular. Avoid monolithic patterns. Prioritise maintainability and testability.
- **Efficiency & Performance:** Solutions must be technically efficient, aligned with the core tech stack (§2), and optimised for speed.
- **Tech Stack Alignment:** All suggestions must strictly adhere to the project's chosen technologies and patterns (§2, §3).

### 0.3 Operational Workflow — The Multidimensional Mandate
Before writing code or defining a solution for any assigned task, analyse the request through three lenses:

1. **User Perspective** — How does this impact look, feel, and usability?
2. **System / Maintainability Perspective** — How does this impact long-term technical debt and modularity?
3. **Performance Perspective** — Is this the most effective and efficient way to achieve the goal?

Then perform an **Alignment Check**: explicitly verify the proposed solution satisfies §0.1 and §0.2 before proceeding.

> **Conflict handling:** If a request appears to conflict with these standards, pause and flag the conflict to the user for clarification before executing.

---

## 1. What This Product Is

**bSmart Works** is an AI-native, role-tuned project management and delivery workspace.
Target customers: BCITS internal teams + utility industry clients. Tagline: *"Where work gets done."*

It combines work management, compliance, SLAs, PM artifacts (RAID), knowledge, KPIs, and AI
assistance into one platform — with role-aware surfaces for Developers, Scrum Masters, Product
Owners, Executives, and Admins.

**One product, one data model, one identity layer, one UI design system.**
Never create capability-specific data tables, auth flows, or UI conventions.

---

## 2. Tech Stack (Verified Against Repo)

### Backend (`works-backend/`)
| Layer | Choice |
|-------|--------|
| Language | Java 21 LTS |
| Framework | Spring Boot 4.0.x (per `pom.xml`) |
| Security | Spring Security + JWT (stateless) — `JwtUtil`, `SecurityConfig` |
| Persistence | Spring Data JPA + Hibernate + Flyway |
| Database | PostgreSQL |
| Build | **Maven** (`pom.xml`, `mvnw`) — *spec doc says Gradle; the repo uses Maven. Maven wins.* |
| Tests | JUnit 5 |

### Frontend (`works-frontend/`)
| Layer | Choice |
|-------|--------|
| Framework | **React 19.2** + Vite 8 (per `package.json`) — *not React 18* |
| Language | **JavaScript / JSX** — *not TypeScript, despite spec; stray `@types/react` are unused* |
| Styling | Tailwind CSS 4 — token classes only; the v3-style `tailwind.config.js` is loaded via `@config` in `src/index.css` (see §4) |
| Component pattern | `class-variance-authority` (cva) + `clsx` + `tailwind-merge`, via `@/lib/utils` `cn()` |
| Icons | `lucide-react` |
| API client | Single `apiClient` wrapper (target) — no inline fetch/axios per component |

### ⚠️ Reality gaps to resolve (do not silently "fix" — confirm with Deepak)
- **Backend package is `com.example.demo` (flat).** The spec's target is `com.bcits.works.<feature>`.
  Until a rename migration happens, **match the existing `com.example.demo` package** — do NOT
  create new `com.bcits.works.*` packages that fragment the codebase. Renaming is its own task.
- **Event store: resolved → `events` is canonical.** The schema once had two tables; the dead
  `event_log` was dropped in V20. **`events`** is the single event store (mapped by `AppEvent`,
  written by `EventService`). Any future audit-log explorer reads from `events`.

---

## 3. Architecture Rules

### Layer Responsibilities
- **Controller**: HTTP only. Parse request → call service → return response. No business logic.
- **Service**: Business logic + authorization. RBAC checks live here, never in controllers.
- **Repository**: Spring Data JPA interface. Data access only.
- **React Component**: Render one thing. Lift shared state to Context or parent.
- **apiClient**: All HTTP calls. Components never call fetch/axios directly.

### Package Structure (current reality)
All backend code is in `com.example.demo`. Add new classes there, following the existing
`<Entity>` / `<Entity>Controller` / `<Entity>Repository` / `<Entity>Service` naming until a
package-by-feature migration is formally scheduled.

### RBAC
- `RbacService` is the single entry point for all permission checks.
- Privacy: individual data private by default; manager drill-down is API-enforced, not UI-hidden.

### Database (Flyway — current high-water mark: **V29** on `main`; note V16 was skipped, V23 does not exist)
- **All schema changes via Flyway migrations only.** Never alter the DB manually.
- Next migration is **`V30__<description>.sql`**. Naming: `V{n}__{snake_case_description}.sql`.
  (Existing on `main`: …V17 mfa_totp, V18 project_slugs, V19 data_quality_cleanup,
  V20 drop_dead_event_log, V21 iteration3_workflows_fields_permissions, V22 iteration4_pm_artifacts,
  V24 knowledge_repository, V25 releases_and_worklogs, V26 cross_project_dependencies,
  V27 article_comments_and_publishing, V28 article_search_terms, V29 custom_dashboards.)
- **Table names are PLURAL.** Verified existing tables:
  `users, projects, project_members, workspaces, workspace_members, work_items,
  work_item_links, sprints, comments, attachments, notifications, notification_preferences,
  tags, starred_items, saved_filters, roles, permissions, role_audit_log,
  password_reset_tokens, events`
- Event sourcing: the single store is **`events`** (append-only — never delete/update rows).

### JWT / Auth
- JWT is stateless. No server-side session storage.
- `JwtUtil` does sign, verify, extract claims — nothing else.

### API Contract
- All endpoints under `/api/v1/` — verified (e.g. `/api/v1/work-items`, `/api/v1/auth`).
- Paths are **plural, kebab-case**: `/api/v1/work-items`, `/api/v1/workspaces`.
- Define request/response DTOs before implementing. `@Valid` on every incoming DTO.
- Error shape `{ code, message, field? }` via one `@ControllerAdvice`.

### AI Features
- All AI calls go through the server-side AI orchestration service. Never client-side.
- Every AI feature has a documented deterministic fallback (behavior when AI is off/unavailable).
- AI toggle scopes: workspace / capability / user / context. Log AI usage for cost + audit.

### Canonical Vocabulary (verified — Java class / DB table / REST path)
| Concept | Java Class | DB Table (plural) | REST Path |
|---------|-----------|-------------------|-----------|
| Work item | `WorkItem` | `work_items` | `/api/v1/work-items` |
| Project | `Project` | `projects` | `/api/v1/projects` |
| Workspace | `Workspace` | `workspaces` | `/api/v1/workspaces` |
| Sprint | `Sprint` | `sprints` | `/api/v1/sprints` |
| Comment | `Comment` | `comments` | `/api/v1/comments` |
| Notification | `Notification` | `notifications` | `/api/v1/notifications` |
| User | `User` | `users` | `/api/v1/users` |

---

## 4. Brand & Design Rules (Verified Against `tailwind.config.js`)

> **AI tools: this entire section is mandatory for every UI task. These rules apply to every
> component, every screen, every PR — without exception. Do not ask Deepak to repeat them.**

---

### 4.1 Design Philosophy — The Non-Negotiables

bSmart Works is a **professional focus tool**. Its job is to make work visible and remove
friction from getting it done. These principles govern every pixel:

1. **One screen, one job.** Every view has a single primary purpose. Secondary controls and
   navigation recede; content leads.
2. **Progressive disclosure.** Show the summary; reveal detail on demand. Never force users to
   see everything at once. Expand/collapse is not optional — it is the core interaction model.
3. **Information density is a feature, not a problem.** More visible on one screen is better
   than more clicks. Achieve density through hierarchy and spacing, not visual clutter.
4. **Operational, not playful.** No decorative illustrations, bright gradients, or whimsical
   microcopy on functional surfaces. Calm, purposeful, professional.
5. **Consistency is trust.** The same navigation, same component patterns, same motion timing
   appear on every screen. Users build muscle memory once and it works everywhere.

---

### 4.2 Color — Token Names, Never Raw Hex

```
brand.navy        #0B2F5C   → bg-brand-navy / text-brand-navy      PRIMARY — sidebar, headers, key controls
brand.navy-tint   #1E4D8C   → bg-brand-navy-tint                   hover state on navy surfaces
brand.orange      #E94E1B   → bg-brand-orange / text-brand-orange  ACCENT — primary CTA, critical alert only
brand.amber       #F39200   → bg-brand-amber                       ACCENT — gradient end, warning-adjacent

neutral.50  #F7F9FC   content canvas (primary page background)
neutral.100 #F2F4F8   secondary surfaces, sidebar inner panels, zebra rows
neutral.200 #E5E9EF   borders, dividers — the ONLY divider color
neutral.300 #C9D2DF   disabled borders, placeholder outlines
neutral.400 #9AA8BC   placeholder text, icons in rest state
neutral.600 #5A6B7E   secondary/meta text
neutral.700 #2A3B52   section headings, labels
neutral.900 #0F1A2A   primary body text

semantic.success #0E7C5E  (surface: success-surface #E8F3EE)
semantic.warning #B97A00  (surface: warning-surface #FFF4E5)
semantic.danger  #C0392B  (surface: danger-surface  #FDE7E7)
semantic.info    #1E4D8C  (surface: info-surface    #E5EDF7)
```

**Usage law:**
- Navy dominates every screen. White/neutral-50 is the content canvas. Never raw hex anywhere.
- Orange/amber: maximum **one or two appearances per screen**. If it appears everywhere it means
  nothing. Use orange for: the single primary action, a critical status badge, a brand gradient.
- Borders and dividers: always `border-neutral-200`. Never `border-black`, `border-gray-*`,
  or raw color. No decorative borders — every border communicates structure.
- Don't use `neutral-*` Tailwind defaults (gray-*) — use the token aliases from `tailwind.config.js`.

---

### 4.3 Typography — Hierarchy Through Weight

```
Font stack: Inter (300 light · 400 regular · 600 semibold · 700 bold) + JetBrains Mono
```

| Role | Classes | Use |
|------|---------|-----|
| Page title | `text-xl font-semibold text-neutral-900` | One per page, top of main content |
| Section heading | `text-sm font-semibold text-neutral-700 uppercase tracking-wide` | Group labels, panel titles |
| Body / default | `text-sm font-normal text-neutral-900` | All list rows, form labels, descriptions |
| Secondary / meta | `text-xs font-normal text-neutral-600` | Timestamps, counts, help text |
| Mono / data | `font-mono text-xs text-neutral-700` | IDs, codes, timestamps in tables |
| Brand mark | "bSmart" → `font-light text-neutral-600` / "Works" → `font-bold text-brand-navy` |

**Rules:**
- Emphasis = `font-semibold`. Never italic for UI text. Never underline outside links.
- Do not mix type sizes more than one step per visual group.
- Respect the Inter weight set: 300, 400, 600, 700 only.

---

### 4.4 Spacing & Radius

- **Grid:** Tailwind 4px scale only. No arbitrary values (`p-[13px]`, `mt-[22px]` are banned).
- **Rhythm (standard cadences):**
  - List row padding: `py-2 px-3` (compact) · `py-3 px-4` (comfortable, default)
  - Between section title and first element: `mb-4`
  - Between sections: `mb-6` or `space-y-6`
  - Page-level padding: `p-6` or `px-6 py-5`
- **Radius tokens (verified against `tailwind.config.js`):** `rounded-sm` 4px · `rounded` / `rounded-md` 8px · `rounded-lg` 12px · `rounded-xl` **22px** · `rounded-full` 9999px
  ⚠️ `xl` is **22px**, not 16px — the config is canonical. Earlier doc said 16px; code wins.
- Card: `rounded-lg` — Panel: `rounded-md` — Pill/badge / count chip: `rounded-full`
- **Layout dimension tokens** (in config): `w-sidebar` 240px · `w-sidebar-collapsed` 48px · `w-panel` 360px.
  Use these for the three-zone shell instead of arbitrary `w-[240px]`.

---

### 4.5 Motion & Transitions — Purposeful, Never Decorative

| Duration | Use |
|----------|-----|
| `duration-[120ms]` | Micro-interactions: button hover, badge color, focus ring (house default) |
| `duration-200` | Panel slides: sidebar collapse/expand, dropdown open |
| `duration-300` | Page-level transitions, modal open |

- Easing: `ease-out` for entrances, `ease-in` for exits.
- Chevrons rotate 180° (`rotate-180 transition-transform duration-200`) on expand/collapse.
- **No bounce, no spring, no decorative keyframe animation** on functional surfaces.
- Loading states: **skeleton screens** using `animate-pulse bg-neutral-100` — never spinners
  inside content areas. A spinner is only acceptable in a button during a mutation.
- **Named tokens also exist in `tailwind.config.js`** (use when you want semantic names rather
  than literals): durations `fast` 150ms · `base` 220ms · `slow` 320ms; easings `ease-out-quint`
  and `ease-spring` (spring reserved for brand/marketing surfaces only, never functional UI).

---

### 4.6 Layout — The Three-Zone System (Mandatory)

Every page uses this structure. It never changes.

```
┌─────────────────────────────────────────────────────┐
│  LEFT SIDEBAR (collapsible)  │  MAIN CONTENT  │  RIGHT PANEL (slide-in) │
│  brand-navy bg               │  neutral-50 bg │  white bg, shadow-lg    │
│  240px expanded              │  flex-1        │  360px, overlay          │
│  48px collapsed (icon rail)  │                │  for detail/AI/comments  │
└─────────────────────────────────────────────────────┘
```

- **Left sidebar:** `bg-brand-navy text-white`. Collapses to 48px icon-only rail at `lg`
  breakpoint or on user toggle. Never disappears on desktop. Active item has a 2px
  `bg-brand-orange` left accent bar + `bg-white/10`. Hover: `bg-white/5`.
- **Main content:** `bg-neutral-50 flex-1 overflow-y-auto`. Sticky top bar with breadcrumb +
  page title + page-level actions (top-right). Content scrolls under the sticky bar.
- **Right contextual panel:** Slides in over the content (`fixed` or `absolute`, `shadow-lg`,
  `border-l border-neutral-200`). Used for: item detail, AI suggestions, comment threads.
  Never pushes/reflowed the main content — always overlays.
- **Breadcrumb:** On all pages deeper than root. `text-xs text-neutral-600` with `/` separator.
  Clickable to any ancestor.

**Desktop-first.** Sidebar collapses at `lg` (1024px). Panels stack below `xl` (1280px).
No horizontal scroll at any viewport ≥ 768px.

---

### 4.7 Expand / Collapse — The Core Interaction Model

This is how information density works without overwhelming the user.

- **Every list, section, and panel must support collapse.** No section is permanently locked.
- **Collapsed state:** section title + count badge + right-aligned chevron-down icon
- **Expanded state:** full content, same indent level as the title
- **Chevron:** `lucide-react` `ChevronDown`, rotates `rotate-180` when expanded
- **Animation:** smooth height with `overflow-hidden transition-all duration-200`
- **Persistence:** store expand/collapse state in `localStorage` with key `bsw_ui_<sectionId>`.
  Default: major sections expanded; sub-sections follow last user preference.
- **Count badges:** when collapsed, show a `neutral-200` bg pill with item count so users know
  what's hidden. Format: `text-xs font-semibold text-neutral-700 bg-neutral-200 rounded-full px-2 py-0.5`

---

### 4.8 Interactive States — No Element Without All Five

Every clickable/focusable element must have all of:

| State | Treatment |
|-------|-----------|
| Default | base style |
| Hover | `bg-neutral-100` (on light) or `bg-white/5` (on navy) or `bg-brand-navy-tint` (on navy primary) |
| Active / pressed | slightly darker, `scale-[0.98]` for buttons |
| Disabled | `opacity-40 cursor-not-allowed pointer-events-none` |
| Focus | `outline-none ring-2 ring-brand-navy ring-offset-2` — always visible for keyboard users |

**Never style an element without defining all five states.**

---

### 4.9 Surface & Elevation System

| Level | Classes | Use |
|-------|---------|-----|
| Page background | `bg-neutral-50` | Root of every main content area |
| Card | `bg-white rounded-lg border border-neutral-200 shadow-sm` | Work item cards, dashboard tiles |
| Inner panel | `bg-neutral-50 rounded-md p-4` | Sections within a card, filter panels |
| Elevated / modal | `bg-white rounded-xl shadow-lg border border-neutral-100` | Modals, command palette, dropdown menus |
| Sidebar | `bg-brand-navy` | Left navigation only |
| Right overlay panel | `bg-white border-l border-neutral-200 shadow-lg` | Detail/AI/comment panels |

- No gradient backgrounds on content areas. Gradients only on brand/hero/onboarding elements.
- `shadow-sm` is the standard card shadow. `shadow-lg` for elevated/overlay surfaces only.
- Dividers between sections: `<hr className="border-neutral-200">` or `divide-y divide-neutral-200`.

---

### 4.10 Data Tables & Lists

- **Zebra rows:** `even:bg-neutral-50` on `tbody tr`
- **Sticky table header:** `sticky top-0 bg-white z-10 border-b border-neutral-200`
- **Sortable columns:** chevron indicator (`ChevronUp`/`ChevronDown`), `text-brand-navy` when active
- **Row hover:** `hover:bg-neutral-50 cursor-pointer`
- **Column text alignment:** text left, numbers right, status badges center
- **Row height:** `h-10` (compact list) · `h-12` (standard) · `h-14` (with sub-info)

---

### 4.11 Empty States, Errors & Feedback

**Empty states** (no data condition):
```
icon (neutral-400, 32px)  →  heading (neutral-700, text-sm font-semibold)
body text (neutral-600, text-xs, max-w-xs centered)  →  CTA Button (primary variant)
```
Always explain WHY it is empty AND the next step to fix it.

**Form errors:** inline, beneath the field. `text-xs text-semantic-danger`. Icon: `AlertCircle` 14px.
Never replace a field with a toast for validation.

**System messages (toasts):** top-right, auto-dismiss 4s. Use semantic surface colors.
Four variants: success / warning / danger / info — matching the semantic token set.

**Loading:** skeleton screens (`animate-pulse bg-neutral-100 rounded`) matching the shape of
the content that will load. Buttons show a spinner (`Loader2 animate-spin`) only during active
mutations (save, submit, delete).

---

### 4.12 Navigation Rules

- **Primary nav items:** icon (20px, `lucide-react`) + label. Active: left accent bar (2px `bg-brand-orange`) + `bg-white/10 font-semibold`. Hover: `bg-white/5`.
- **Collapsed rail:** icons only, tooltip on hover showing the label.
- **Page-level actions** (create, export, filter): top-right of the sticky content header bar.
  Never floating buttons over content, never in the sidebar.
- **Breadcrumb:** `text-xs text-neutral-600` with `ChevronRight` (12px) separator. Clickable.
- **Keyboard shortcuts:** support `?` for shortcut sheet, standard browser conventions otherwise.

---

### 4.13 Components — Build Pattern

The library lives in `works-frontend/src/components/works/`. **What exists today:**
- Root: `Button` (`button.jsx`, cva variants primary/secondary/ghost/danger/action/link),
  `Logo` (`logo.jsx`), `StatusBadge` (`status-badge.jsx`)
- `atoms/`: `Input`, `Badge`, `Skeleton`, `Collapsible`
- `templates/`: `ThreeZoneLayout`

When adding a component:
1. Use `cva` for variants + `cn()` for merging — match `button.jsx` / `atoms/input.jsx` exactly.
2. Token classes only — no raw hex/px/font.
3. File it at the correct Atomic Design level (§4.19): `atoms/`, `molecules/`, `organisms/`, `templates/`.
4. Build toward the target inventory incrementally — don't assume components beyond those listed above.

**Target component inventory** (build as features require, in this rough priority order;
✅ = already built): ✅`Input`, `Select`, `Textarea`, `Checkbox`, `RadioGroup`, `Toggle`,
✅`Badge`, `Tooltip`, `Dropdown` / `ContextMenu`, `Modal` / `Dialog`,
✅`Collapsible`, `Tabs`, `Breadcrumb`, `Avatar`, ✅`Skeleton`,
`Toast` / `Notification`, `Table`, `Pagination`, `Sidebar`, `CommandPalette`

---

### 4.14 Logo Usage

- `logo-primary.svg` — light backgrounds · `logo-reverse.svg` — navy/dark backgrounds
- `logo-mono.svg` — single-color/print · `logo-icon.svg` — favicon/avatar/small (≥24px)

Use the `<Logo>` component or reference `/logo-*.svg`. Never distort, recolor, or crop the logo.

---

### 4.15 Design Laws — Mental Models Every Developer Must Apply

These are not suggestions — they are constraints that govern every layout, menu, and interaction
decision. Violating them creates friction even when the code is correct.

**Hick's Law — fewer choices = faster decisions.**
Every menu, dropdown, and toolbar must contain the minimum options needed. If a dropdown
exceeds 7 items, it requires either grouping with headings or a search input. Toolbars cap at
5 visible actions; overflow goes in a `...` menu. The primary action on every screen is singular
and obvious — never two equally-prominent CTAs.

**Fitts's Law — big targets, close to where focus already is.**
Action buttons appear near the content they act on: row-level actions appear inline on hover,
not in a column far right. Page-level actions are in the sticky header, not the sidebar
(which requires a long mouse journey away from content). Touch targets are minimum 44×44px.

**Miller's Law — group into chunks of ≤7.**
Sidebar navigation is grouped into sections (Work, Delivery, Knowledge, Admin) with ≤6 items
each. Forms group related fields under a heading — never one long unsectioned field list.
Filter panels group filter chips by category.

**Gestalt — proximity, similarity, figure/ground.**
- **Proximity:** related items share a `gap-*` group; unrelated items have a larger `space-y-*`
  separator. Never use a border just to group — use space first.
- **Similarity:** all clickable rows look identical; all read-only labels look identical.
  Visual treatment = behavioral contract.
- **Figure/Ground:** white cards (`bg-white`) on `bg-neutral-50` page backgrounds. Content must
  always visually pop from the surface it sits on.
- **Continuity:** align to the column grid always. Misaligned elements break the implicit grid
  and feel broken even to users who can't name why.

**Jakob's Law — match established conventions.**
Left sidebar navigation, breadcrumbs, right panel for detail, ⌘K command palette, `?` for
shortcuts — these are established conventions from Linear, GitHub, Notion. Do not invent novel
navigation patterns. Users bring existing muscle memory; meet it.

**Progressive Disclosure law.**
Never show information the user hasn't asked for yet. List views show summary data only.
Detail opens in the right panel or a dedicated page. Advanced options live behind an
"Advanced" toggle, not visible by default. The primary path must always be obvious; the
power-user path is discoverable, not upfront.

---

### 4.16 Core Interaction Patterns (Mandatory for Relevant Features)

These are the standard patterns for this product. When a feature maps to one of these, use
the pattern exactly — never invent an alternative.

**Command Palette (⌘K / Ctrl+K)**
The single most important power-user feature. Opens a centered modal overlay with a search
input. Searches across: work items, projects, people, actions (create, assign, change status).
Results appear instantly with fuzzy matching. Keyboard navigation (↑↓ Enter Esc). Dismiss on
Esc or click-outside. Every major action in the app must be reachable via the command palette.
Renders in the `Elevated / modal` surface level (§4.9).

**Quick-Add / Inline Capture**
Pressing `N` (or clicking `+`) on any list creates an **inline editable row at the top of the
list** — not a modal dialog. The user types the title, presses Enter to save, Esc to cancel.
This is the standard create pattern for work items, tasks, and similar entities. Reduces the
round-trip cost of creating items to zero.

**Keyboard Navigation — Standard Bindings**
| Key | Action |
|-----|--------|
| `J` / `↓` | Next row / item |
| `K` / `↑` | Previous row / item |
| `Enter` | Open selected item (right panel or detail page) |
| `E` | Edit selected item inline |
| `Esc` | Close panel / cancel edit / deselect |
| `N` | New item (inline capture) |
| `⌘K` / `Ctrl+K` | Command palette |
| `?` | Keyboard shortcut reference sheet |

Every list view and detail panel must respect these bindings. Never override browser defaults
(`⌘R`, `⌘T`, `⌘W`, `F5`, etc.).

**Bulk Actions**
Checkbox appears on list rows on hover. When ≥1 row is selected, a bulk action bar slides up
from the bottom of the viewport (`fixed bottom-0`, `bg-white border-t border-neutral-200
shadow-lg`, `py-3 px-6`). Bar shows: count selected + action buttons (Assign, Change status,
Move sprint, Delete). Bar disappears when selection is cleared. Never requires a separate
"bulk mode" toggle — selection IS the mode.

**Saved Views / Filters**
Every list page supports saving the current filter+sort combination as a named view. Saved
views appear in the sidebar under the relevant section. The save action is "Save view" in the
filter bar. Users can rename or delete their views. Views are per-user, stored via the API —
not just localStorage.

**Optimistic UI — Default Mutation Pattern**
All mutations (status change, assign, rename, reorder) update the UI immediately without waiting
for the API response. The API call happens in the background. On success: nothing visible (the
UI is already correct). On error: silently revert the UI change + show a toast
`"Couldn't save — retrying…"` or `"Failed to save. Try again."`. Never show a loading spinner
for a mutation that was already reflected optimistically. This is the default; synchronous
(wait-for-response) mutations are the exception and must be justified.

**Ambient Notifications — No Modal Interruption**
Notifications are signalled by a dot/count badge on the bell icon in the sidebar. Clicking
opens the right contextual panel (§4.6) with the notification list. Nothing interrupts the
user's current view. The only exception: session-expiry or permission-revocation errors that
require immediate user action — these use a modal dialog. All other system messages are toasts
(§4.11).

---

### 4.17 Accessibility — WCAG 2.1 AA (Non-Negotiable)

This is a legal and ethical baseline for enterprise/utility-sector clients. Every component
ships accessible or it doesn't ship.

**Colour contrast minimums (verified against brand tokens):**
| Text size | Minimum ratio | Failing example |
|-----------|--------------|-----------------|
| Normal (< 18pt / < 14pt bold) | 4.5 : 1 | `text-neutral-400` on `bg-white` = 2.8:1 — FAIL for body |
| Large (≥ 18pt or bold ≥ 14pt) | 3.0 : 1 | `text-neutral-400` on `bg-white` — still fails |
| UI components & focus indicators | 3.0 : 1 | |

Safe pairings with brand tokens: `text-neutral-600` on `bg-white` (5.9:1 ✓),
`text-neutral-700` on `bg-white` (8.5:1 ✓), `text-white` on `bg-brand-navy` (12.6:1 ✓).
Do NOT use `text-neutral-400` or `text-neutral-300` for any readable body text.

**Never communicate by colour alone.**
Status badges must combine colour + text label (e.g. `● In Progress`, not just a green dot).
Error states must combine `text-semantic-danger` + `AlertCircle` icon + error message text.
Charts/graphs must use patterns or labels in addition to colour differentiation.

**ARIA on every custom interactive element:**
- `role="button"` + `tabIndex={0}` + `onKeyDown` (Enter/Space) on any non-`<button>` click target
- `aria-expanded={isOpen}` on collapsible triggers
- `aria-label` on every icon-only button (e.g. `aria-label="Close panel"`)
- `aria-live="polite"` on toast/notification regions
- `aria-busy="true"` on skeleton/loading regions

**Focus management:**
- When a panel or modal opens: move focus to the first interactive element inside it.
- When a panel or modal closes: return focus to the element that triggered it.
- Focus must never be trapped outside a modal or lost to `document.body`.

**Skip link:** `<a href="#main-content" className="sr-only focus:not-sr-only ...">Skip to main content</a>`
must be the first DOM element in the layout. Visible on keyboard focus only.

**Keyboard operability:** every feature must be fully operable without a mouse. If you can't
tab to it, press Enter/Space on it, and Esc out of it — it is not done.

---

### 4.18 Performance as UX — Perceived Speed Rules

The app must feel instant. These rules achieve that without requiring perfect API latency.

**Optimistic UI** is §4.16 — the biggest single win. Treat it as mandatory.

**Route-level code splitting.** Every React route is `lazy()`-wrapped:
```jsx
const SprintBoard = lazy(() => import('./pages/SprintBoard'));
```
The dashboard does not load sprint board code. Each route loads only what it needs.

**Virtual scrolling** for any list that can exceed ~100 rows. Use `@tanstack/react-virtual`.
Rendering 2 000+ DOM nodes kills scroll performance. Work item lists, audit logs, notification
history all need this. Standard paginated lists (≤50 rows/page) do not.

**Debounce search and filter inputs** at 250ms. Never fire an API call on every keystroke.
```js
const debouncedSearch = useMemo(() => debounce(onSearch, 250), [onSearch]);
```

**Image and asset optimisation.** SVG icons via `lucide-react` (tree-shakeable). No PNG icons.
Avatars: serve WebP at 2× the rendered size. Logo SVGs are already in `/public/`.

**Avoid layout shift.** Skeleton screens must match the exact dimensions of the content they
replace (same height rows, same card dimensions). Use `min-h-*` on containers that will fill
asynchronously so the layout doesn't jump when data loads.

**Prefetch on hover.** On `mouseenter` of a navigation link or work item row, prefetch the
detail data (`queryClient.prefetchQuery(...)`) so the panel feels instant on click.

---

### 4.19 Atomic Design — Component Structure

The component library grows via Atomic Design. Every new component belongs to exactly one
level. This keeps the codebase navigable as the library scales.

```
works-frontend/src/components/works/
├── atoms/          ✅ input.jsx, badge.jsx, skeleton.jsx, collapsible.jsx  (built — golden path)
│                   todo: Avatar, Checkbox, Toggle, Tooltip, Select, Textarea
├── molecules/      SearchInput, FilterBar, UserAvatar, FormField, RowActions  (todo)
├── organisms/      WorkItemRow, SprintCard, SidebarNav, CommandPalette, BulkActionBar  (todo)
├── templates/      ✅ three-zone-layout.jsx  (built)  · todo: ListPageTemplate, DetailPageTemplate
└── (root)          Existing: button.jsx, logo.jsx, status-badge.jsx  ← migrate to atoms/ when refactoring
```

**The built components are the canonical reference — pattern-match them, don't reinvent.**
`atoms/input.jsx`, `atoms/badge.jsx`, `atoms/skeleton.jsx`, `atoms/collapsible.jsx`, and
`templates/three-zone-layout.jsx` demonstrate the house style end-to-end: cva + `cn()`, dark
variants, the `focus-visible:ring-brand-navy-tint/40` ring, token-only classes, the §4.7
expand/collapse model, and §4.17 a11y wiring (`aria-expanded`, `aria-controls`, `inert`,
`aria-invalid`). New components copy these conventions.

**Rules:**
- Atoms have no knowledge of domain data (no `workItem`, no `sprint` props).
- Molecules compose atoms; organisms compose molecules + atoms + domain data.
- Templates wire organisms into the three-zone layout with no business logic.
- Pages (in `src/pages/`) compose templates + call hooks/API — no raw JSX layout there.
- **Once Storybook is configured**, each component gets a co-located `.stories.jsx` documenting
  its cva variants and interactive states. (Storybook is not yet installed — don't author orphan
  story files until it is; that's a separate setup task.)

**Current reality:** the root-level `works/` folder still holds the original 3 components; new
components land in the Atomic subfolders (`atoms/`, `templates/`). Migrate the root 3 into
`atoms/` only as part of a deliberate refactor, not retroactively all at once.

---

### 4.20 Content & Copywriting Standards

Microcopy quality is a direct proxy for product quality. These rules apply to every string
that appears in the UI — labels, placeholders, tooltips, confirmations, errors.

**Error messages — always say what went wrong AND what to do:**
- Bad: `"An error occurred."`
- Bad: `"Request failed with status 403."`
- Good: `"You don't have permission to edit this project. Contact your workspace admin."`
- Good: `"Couldn't save — check your connection and try again."`

**Confirmation dialogs — button label = the action:**
- Bad: `[OK]` / `[Cancel]`
- Good: `[Delete work item]` / `[Keep it]`
- Good: `[Remove from sprint]` / `[Cancel]`
Users read the button, not the modal body. The button label must make the consequence clear.

**Form field copy:**
- Label: short noun phrase. `"Sprint goal"` not `"Please enter the sprint goal"`
- Placeholder: a concrete example in the field's format. `e.g. Ship payments API with zero criticals`
  not a repeat of the label.
- Helper text (below field, before error): one sentence of context when the field's purpose
  isn't obvious. `text-xs text-neutral-600`.

**Empty states — the formula:**
```
[Icon, neutral-400]
[Heading: "No work items yet", text-sm font-semibold text-neutral-700]
[Body: "Add your first work item to start tracking progress.", text-xs text-neutral-600 max-w-xs]
[CTA: <Button variant="primary">Add work item</Button>]
```

**Tone rules:**
- Active voice. `"Create a project"` not `"A project can be created."`
- Present tense. `"Saving…"` not `"Your changes will be saved."`
- No exclamation marks on functional surfaces. `"Work item created."` not `"Work item created!"`
- No filler words. `"No sprints"` not `"It looks like there are no sprints yet."`
- Titles are sentence case. `"Active sprints"` not `"Active Sprints"` (except proper nouns and
  the product name `bSmart Works`).

---

### 4.21 Z-Index — The Stacking Scale (Single Source of Truth)

Layers must never fight. Use the named z-index tokens from `tailwind.config.js` — never an
arbitrary `z-[100]`. (Enforced: `guardrails.sh` warns on arbitrary z-index.)

| Token | Value | Layer |
|-------|-------|-------|
| `z-base` | 0 | Normal content flow |
| *(default `z-10`)* | 10 | In-content sticky elements (e.g. sticky table header §4.10) |
| `z-sticky` | 20 | Page-level sticky header bar |
| `z-dropdown` | 30 | Dropdowns, context menus, tooltips |
| `z-panel` | 40 | Right contextual slide-in panel + its click-catcher |
| `z-bulkbar` | 45 | Bulk-action bar (§4.16) |
| `z-modal` | 50 | Modal / dialog and its backdrop |
| `z-palette` | 60 | Command palette (⌘K) |
| `z-toast` | 70 | Toasts / notifications — always on top |

Rule of thumb: the more transient and user-initiated the surface, the higher it sits. A toast
must never be hidden behind a modal; a command palette opens above everything except toasts.

---

### 4.22 Date, Time & Number Formatting

Consistency here is a direct signal of product quality. Centralise these in `@/lib/format`
(create it when first needed) — never hand-format dates inline per component.

- **Relative time for recent events** (≤ 7 days): `"2h ago"`, `"3d ago"`, `"just now"`.
  Use `Intl.RelativeTimeFormat`. Show the absolute timestamp in a `title`/tooltip on hover.
- **Absolute dates** (older than 7 days, or any formal record): `"31 May 2026"` (day-month-year,
  month spelled). Never locale-ambiguous numeric like `05/31/26`.
- **Date + time** when precision matters (audit log, comments): `"31 May 2026, 14:30"` (24-hour).
- **Timestamps in tables / IDs / codes:** `font-mono text-xs` (§4.3).
- **Numbers:** `Intl.NumberFormat` for thousands separators (`1,240`). Right-align numeric table
  columns (§4.10).
- **Durations:** compact human form — `"3d 4h"`, `"2h 15m"` — not raw seconds.
- **Percentages:** whole numbers unless precision matters — `"87%"` not `"86.7431%"`.
- **Empty / unknown values:** render an em-dash `—` in `text-neutral-400`, never `"null"`,
  `"undefined"`, or a blank cell.
- **Timezone:** display in the user's local timezone; store/transmit UTC (ISO-8601) over the API.

---

### 4.23 Iconography

Icons are from `lucide-react` only (§2). Consistency in size, weight, and meaning is mandatory.

**Sizing (match the adjacent text/control):**
| Context | Size | Class |
|---------|------|-------|
| Inline with `text-xs` meta | 14px | `h-3.5 w-3.5` |
| Default — buttons, list rows, body | 16px | `h-4 w-4` |
| Primary nav items, section headers | 20px | `h-5 w-5` |
| Empty-state / feature illustration | 32px | `h-8 w-8` |

**Rules:**
- **Colour:** icons inherit text colour (`currentColor`) by default — set via `text-*` token,
  never a hard-coded fill. Rest-state standalone icons: `text-neutral-400`; active/interactive:
  `text-neutral-600` → `text-brand-navy` on hover.
- **Stroke:** use the lucide default (2px). Don't mix stroke widths across the UI.
- **One icon = one meaning, app-wide.** Pick a canonical icon per concept and never reuse it for
  something else. House mapping (extend, don't contradict):
  `Plus` create · `Pencil` edit · `Trash2` delete · `Check` done/confirm · `X` close/cancel ·
  `ChevronDown` expand/collapse · `ChevronRight` breadcrumb separator / drill-in ·
  `Search` search · `Filter` filter · `Bell` notifications · `Settings` settings ·
  `MoreHorizontal` overflow menu · `AlertCircle` error/validation · `Loader2` in-progress (spin).
- **Icon-only buttons MUST have `aria-label`** (§4.17) — e.g. `aria-label="Delete work item"`.
  Decorative icons beside a text label get `aria-hidden="true"`.
- Don't place an icon without purpose. Every icon either conveys state, identifies an action, or
  aids scanning — never pure decoration on functional surfaces.

---

## 5. Iteration Roadmap & Current Status

**20 iterations total. Build only what the active iteration requires.**

| Phase | Iterations | Focus |
|-------|-----------|-------|
| Foundation | 1–6 | Work items, sprints, customization, PM artifacts (RAID), knowledge, dashboards |
| Commercial | 7–9 | Compliance rules, SLAs, customer portal |
| AI Layer | 10–12 | AI orchestration, AI expansion, KPIs |
| Role Surfaces | 13–16 | Integrations, developer/SM/PO/leadership/admin surfaces |
| Enterprise | 17–20 | Customization engine, mobile/realtime, security certs, polish + marketplace |

**Current status (inferred from migrations V1–V29 on `main`):** iteration 5 is feature-complete
(knowledge repository: inline article comments, Author→Review→Publish workflow, article analytics
incl. search-term tracking and version diff/restore — V27/V28). **Iteration 6 (Reports, Dashboards
& Insights) is now in progress**, built gap-by-gap: user-built **custom dashboards** (designer +
persistence, V29) have landed; widget library expansion, report builder/templates, scheduled
delivery, export (PDF/Excel/PNG), drill-down, and embeddable dashboards are still pending. Confirm
the active iteration with Deepak before building forward.
**Do not implement iteration N+1 features while iteration N is in scope.**

### PM Traceability (non-negotiable process)

Every unit of work follows this path. Skipping steps creates invisible scope and blocks audits.

**Before sprint:** every work item must meet the **Definition of Ready** before entering an iteration:
- Acceptance criteria are specific and testable (the feature spec template `.github/ISSUE_TEMPLATE/feature-spec.md` enforces this)
- Iteration confirmed; capability map reference noted
- API contract agreed if backend is involved; UI behaviour or Figma ref provided if frontend
- Flyway migration identified (next: V27+); RBAC/privacy implications noted; AI fallback documented

**During development:** every commit must follow the **Conventional Commits** format (`type(scope): description`),
enforced by `.husky/commit-msg` and the `commit-lint` CI job. The iteration number appears in the PR metadata.

**Before merge:** the PR checklist in `.github/pull_request_template.md` is the **Definition of Done**.
Every item is either auto-enforced by CI or ticked manually. A PR that skips items is not mergeable.

**After each iteration:** update the "Current status" paragraph above and the Flyway next-migration reference.
This keeps CLAUDE.md accurate for all AI tools (no stale advice).

---

## 6. What NOT To Do

- Don't start implementing a task without running the §0.3 Multidimensional Discovery + Alignment Check first.

**Architecture / Backend**
- Don't add features, abstractions, or generalization beyond the task.
- Don't create capability-specific auth, data models, or UI patterns. One of each, unified.
- Don't change DB schema without a Flyway migration (next is `V27`).
- Don't use singular table names — the convention is plural (`work_items`, `users`).
- Don't create `com.bcits.works.*` packages yet — match existing `com.example.demo`.
- Don't put RBAC logic in controllers.
- Don't make AI calls from the frontend.
- Don't add error handling for scenarios that cannot happen.
- Don't write comments describing WHAT the code does — only WHY, and only when non-obvious.
- Don't implement iteration N+1 features while iteration N is in scope.

**UI / Frontend**
- Don't put raw hex, px, or font names in components — use token classes only.
- Don't use Tailwind's default `gray-*` palette — use `neutral-*` token aliases from `tailwind.config.js`.
- Don't assume a full component library exists — see §4.13 for exactly what's built.
- Don't use gradient backgrounds on content surfaces (cards, panels, tables) — gradients for brand/hero only.
- Don't use a spinner inside a content area during loading — use skeleton screens (`animate-pulse bg-neutral-100`).
- Don't use a toast to report form validation errors — inline errors beneath the field only.
- Don't put page-level action buttons in the sidebar or floating over the content area — top-right of sticky header only.
- Don't build a section or panel that cannot be collapsed — every content group must support expand/collapse.
- Don't build an interactive element without all five states: default, hover, active, disabled, focused.
- Don't put borders that aren't `border-neutral-200` — no `border-black`, `border-gray-*`, or decorative borders.
- Don't use `italic` for UI text — emphasis is always `font-semibold`, same color.
- Don't use arbitrary spacing values like `p-[13px]` or `mt-[22px]` — Tailwind 4px scale only.
- Don't use orange or amber in more than 1–2 places per screen — if it appears everywhere it means nothing.
- Don't use `text-neutral-400` or lighter for readable body text — fails WCAG 2.1 AA contrast.
- Don't communicate status or state by colour alone — always pair colour with a text label or icon.
- Don't put a click handler on a non-`<button>` element without `role="button"`, `tabIndex={0}`, and keyboard handler.
- Don't open a modal or panel without moving focus into it; don't close one without returning focus to the trigger.
- Don't build a list that can exceed ~100 rows without virtual scrolling (`@tanstack/react-virtual`).
- Don't fire API calls on every keystroke — debounce search/filter inputs at 250ms.
- Don't wait for the API before reflecting a mutation in the UI — optimistic updates are the default.
- Don't put two equally-prominent CTAs on the same screen — one primary action per view.
- Don't build a dropdown or menu with >7 items without grouping or search.
- Don't write `"An error occurred."` — always say what failed and what the user should do next.
- Don't use `[OK]` / `[Cancel]` in confirmation dialogs — button label must be the specific action.
- Don't use exclamation marks on functional surfaces. No filler phrases like "It looks like…".
- Don't use `Title Case` for section headings — sentence case only (except proper nouns).
- Don't use arbitrary z-index (`z-[100]`) — use the named scale (`z-modal`, `z-toast` …) from §4.21.
- Don't hand-format dates/numbers inline — use `@/lib/format`; never locale-ambiguous numeric dates (`05/31/26`).
- Don't render `null`/`undefined`/blank for missing values — use an em-dash `—` in `text-neutral-400`.
- Don't reuse a `lucide` icon for two different meanings, or mix icon stroke widths (§4.23).
- Don't add `eslint-plugin-tailwindcss` back — it's incompatible with this ESLint 10 + Tailwind 4 stack (§ see `eslint.config.js`).

**Developer workflow**
- Don't use `System.out.println` — always use an SLF4J `Logger` (guardrails.sh enforces this).
- Don't write commit messages outside the Conventional Commits format (`type(scope): description`).
  Valid types: `feat`, `fix`, `docs`, `style`, `refactor`, `perf`, `test`, `chore`, `ci`, `build`, `revert`.
  Enforced by `.husky/commit-msg` + the `commit-lint` CI job.

**Backend**
- [ ] New endpoints have `@Valid` DTO validation, under `/api/v1/`, plural kebab path
- [ ] New tables/columns have a Flyway migration (`V27+`), plural table names
- [ ] RBAC check in service layer (not controller)
- [ ] Errors use the standard `{ code, message, field? }` shape
- [ ] New code added to `com.example.demo` (no new top-level packages without a rename plan)
- [ ] AI features have a documented deterministic fallback
- [ ] Any PR touching auth, CORS, RBAC, JWT, or file upload is labelled `security-review`

**Frontend / UI**
- [ ] No raw hex/px/font in frontend — token classes only (`brand-*`, `neutral-*`, `semantic-*`)
- [ ] New components follow the `button.jsx` cva + `cn()` pattern, filed under correct Atomic Design level
- [ ] New component has a co-located `.stories.jsx` covering all variants and states *(once Storybook is set up)*
- [ ] Every interactive element has all 5 states: default, hover, active, disabled, focus ring
- [ ] Every new section or panel supports expand/collapse with localStorage persistence
- [ ] Loading states use skeleton screens — no content-area spinners
- [ ] Empty states include: icon + why it's empty + CTA to fix it
- [ ] Form errors are inline beneath the field, not toast-only
- [ ] Page-level actions sit in the sticky header top-right, not floating or in sidebar
- [ ] No Tailwind `gray-*` classes — only `neutral-*` from the token set
- [ ] Orange/amber appear at most 1–2 times per screen
- [ ] All text meets WCAG 2.1 AA contrast (`text-neutral-400` or lighter never used for body text)
- [ ] Status/state never communicated by colour alone — label or icon always accompanies colour
- [ ] Every custom interactive non-`<button>` element has `role`, `tabIndex`, and keyboard handler
- [ ] Focus moves into opened panels/modals; returns to trigger on close
- [ ] Skip-to-main-content link present in root layout
- [ ] Lists that can exceed ~100 rows use virtual scrolling
- [ ] Search/filter inputs debounced at 250ms
- [ ] Mutations use optimistic UI — UI updates before API response
- [ ] Only one primary CTA per screen; dropdowns with >7 items are grouped or searchable
- [ ] Error messages say what failed + what to do. Confirmation buttons label the specific action.
- [ ] All UI copy is sentence case, active voice, present tense, no exclamation marks on functional surfaces
- [ ] Z-index uses named tokens (§4.21), not arbitrary values
- [ ] Dates/numbers formatted per §4.22 (relative ≤7d, `31 May 2026` absolute, em-dash for empty)
- [ ] Icons from `lucide` at standard sizes (§4.23); icon-only buttons have `aria-label`
- [ ] All HTTP goes through the `apiClient` wrapper (no inline fetch/axios)
- [ ] New list endpoints use `PageResponse<T>` + `Pageable` — no bare `findAll()` on user data

**Cross-cutting**
- [ ] Scope matches the task — no speculative features or abstractions
- [ ] PR diff ≤ 400 lines of changed code, or the description explains why it is larger
- [ ] Any new npm/Maven dependency is documented in the PR description (why added, license, bundle impact)
- [ ] `node scripts/generate-ai-rules.mjs --check` passes (AI rules in sync with CLAUDE.md)
- [ ] `bash scripts/check-dod-sync.sh` passes (DoD version tag in sync)

> **How these are enforced (so they hold without re-stating them):** (1) `eslint.config.js` —
> `eslint-plugin-jsx-a11y` (a11y) + custom rules (tokens, no inline fetch, no arbitrary px);
> (2) `scripts/guardrails.sh` — brand/architecture greps (no `gray-*`, no `works-*`, no arbitrary
> z-index, Flyway naming, RBAC placement), run in pre-commit + CI; (3) the CI workflow's
> "AI rules in sync" job, which fails if the derived rules files drift from this CLAUDE.md;
> (4) `scripts/check-dod-sync.sh` — verifies the PR template's DoD version tag matches CLAUDE.md.
> All CI jobs block: **lint** (App.jsx baseline suppressed with file-level disable — new files must pass
> clean), **build**, **guardrails**, and **coverage** (JaCoCo 60% LINE minimum on unit tests).

<!-- dod-version: 2026-06-01-r4 -->

---

## 7. Branching Strategy

### 7.1 Model — GitHub Flow

Single `main` branch — always deployable. All work lives on short-lived feature branches that
branch from and merge back to `main` via PR. No `develop` branch.

- `main` is the only permanent branch. Everything else is temporary.
- Never commit directly to `main`. Never force-push to `main`.
- Branch lifetime target: closed within **5 working days**. Branches open longer must be rebased
  or their scope reduced.
- Delete branches immediately after merge (enable GitHub's auto-delete in repo Settings).
- No shared feature branches between two developers — one leads the branch, the other reviews.

### 7.2 Branch Naming Convention

Format: `<type>/<issue-id>-<short-slug>` (issue ID optional for hotfixes and chores)

| Prefix | When to use | Example |
|--------|-------------|---------|
| `feat/` | New feature, iteration work | `feat/47-sprint-velocity-chart` |
| `fix/` | Bug fix | `fix/52-workitem-assignee-null` |
| `hotfix/` | Critical prod fix — no issue required if urgent | `hotfix/auth-token-expiry` |
| `chore/` | Maintenance, tooling, dependency updates | `chore/bump-spring-boot-4.0.2` |
| `docs/` | Documentation only | `docs/branching-strategy` |
| `refactor/` | Restructure with no behavior change | `refactor/extract-rbac-helpers` |
| `ci/` | CI/CD pipeline changes | `ci/add-dependency-scan` |

Rules:
- Use the GitHub issue number when one exists — creates the traceability link automatically.
- Slug is lowercase kebab-case, ≤40 characters, no special characters other than `-`.
- Never include a person's name in the branch name.
- The branch prefix must match the Conventional Commits type of the primary change on that branch.
- The `claude/` prefix is reserved for AI-agent branches — never use it for human-authored work.

### 7.3 Merge Strategy — Squash Merge Only

All PRs are squash-merged into `main`. This produces one commit per PR.

The squash commit message = the PR title, which must follow Conventional Commits format
(`type(scope): description`). The `commit-lint` CI job validates this on every PR.

**Why squash:** preserves a readable, bisectable, linear history. WIP commits ("fix typo", "wip",
"try this") disappear. The record of what changed is the PR diff + the single squash commit.

**Rebase is allowed within a feature branch** to keep it current with `main`. Amend freely
before a PR is open. Never amend or force-push a commit already on `main`.

### 7.4 Branch Protection (Current State → Target)

**Current:** CI jobs in `ci.yml` must pass before a PR can merge. No required human approvals
(Deepak has CODEOWNER bypass — no teammate is blocked waiting for a second review).

**Target (activate explicitly when ≥3 active contributors):**
- Require all CI jobs to pass (already enforced)
- Require 1 review from a CODEOWNER (enable in GitHub branch protection settings — NOT YET ACTIVE)
- Dismiss stale approvals when new commits are pushed
- No direct push to `main`

**Do not enable required reviews without explicit instruction from Deepak. The current model
is CI-gates-only — that is intentional and correct for the current team size.**

### 7.5 Stale Branch Policy

| State | Action |
|-------|--------|
| Merged | Delete immediately (GitHub auto-delete or manual) |
| Open PR, no commits for 7 days | Author rebases or marks as draft with a note |
| Unmerged, no PR, no commits for 14 days | Close and delete |
| Superseded by a different approach | Close PR with a comment explaining why, delete branch |

---

## 8. Environments & Secrets

### 8.1 Environment Tiers

| Tier | Purpose | Who uses it | Data |
|------|---------|-------------|------|
| **Local** | Individual development + exploratory testing | Each developer | Local Docker Compose DB, seeded from Flyway |
| **Staging** | Shared integration, QA, UAT, demo | Whole team + stakeholders | Anonymized prod-like dataset |
| **Production** | Live system | Customers | Real data |

`main` branch code is what runs in every tier — there is no separate production branch.
Staging must mirror production config (same env vars, same secrets pattern) except for the data.

### 8.2 Environment Variable Conventions

All runtime secrets and environment-specific config use the `BSMART_*` prefix. The
`application.properties` embeds dev-safe defaults via `${BSMART_VAR:default}` — these are
**only safe for local development** and must be overridden in staging and production.

| Variable | Dev default | Override required? |
|----------|-------------|-------------------|
| `BSMART_DB_URL` | `jdbc:postgresql://localhost:5432/works_db` | Staging + Prod |
| `BSMART_DB_USERNAME` | `bcits_admin` | Staging + Prod |
| `BSMART_DB_PASSWORD` | `works_secure_pass` | Staging + Prod |
| `BSMART_JWT_SECRET` | `dev-only-change-me-…` | **Staging + Prod — min 32 random chars** |
| `BSMART_CORS_ALLOWED_ORIGINS` | `http://localhost:5173,…` | Staging + Prod |
| `BSMART_EXPOSE_DEV_VERIFICATION_TOKEN` | `true` | **Must be `false` in Staging + Prod** |
| `BSMART_CLAMAV_HOST` | `172.25.215.11` | Staging + Prod |
| `BSMART_CLAMAV_PORT` | `3310` | If port differs |

Frontend env vars use the `VITE_*` prefix (Vite convention). See `works-frontend/.env.example`.

**Generate a production JWT secret:** `openssl rand -base64 48`

### 8.3 Local Development Services

All local backing services run via Docker Compose (repo root):

```bash
docker compose up -d          # start Postgres, MailHog, ClamAV in background
docker compose down           # stop all services (data persists in named volumes)
docker compose down -v        # stop + wipe all volumes — fresh database on next start
docker compose logs -f        # tail service logs
```

| Service | Port | Purpose |
|---------|------|---------|
| PostgreSQL 16 | 5432 | Primary database — Flyway migrations run on backend start |
| MailHog | 1025 (SMTP) / 8025 (Web UI) | Captures all outbound email; browse at `http://localhost:8025` |
| ClamAV | 3310 | Virus scanning for attachments — first start downloads virus definitions (~2–3 min) |

Flyway migrations run automatically when the Spring Boot app starts. If a migration fails:
- Fix the migration SQL first — do not use `repair-on-migrate` to skip a broken migration in staging/prod.
- For local resets: `docker compose down -v` wipes the DB; migrations re-run from scratch on next start.

### 8.4 Secrets Rules (Enforced + Manual)

- `.env` files are gitignored — never commit them.
- `.env.example` files ARE committed — they document the variable shape without real values.
- Never embed a secret in `application.properties` — use the `${BSMART_VAR:default}` pattern.
- Never log secrets — SLF4J is enforced; `System.out.println` is blocked by `guardrails.sh`.
- Never use CORS `*` as an allowed origin outside local development.
- Never share staging or production credentials in code, comments, or PR descriptions.
- JWT secret must be ≥32 cryptographically random characters in staging/production.
- `BSMART_EXPOSE_DEV_VERIFICATION_TOKEN=false` must be verified before any staging/prod deploy.

---

## 9. Release Management

### 9.1 Versioning — Semantic Versioning (SemVer)

Releases follow `MAJOR.MINOR.PATCH`:
- **PATCH** — bug fixes with no API or schema change (e.g. `0.5.1`)
- **MINOR** — each completed iteration; additive new features, backward-compatible API (e.g. `0.6.0`)
- **MAJOR** — reserved for breaking API/schema changes or a v1.0 production launch

Current version corresponds to iteration 6 (role-tuned dashboards + releases + worklogs): **`0.6.0`**.
Every iteration completion bumps the MINOR version; hotfixes bump PATCH.

Pre-production versions carry a `0.` major (i.e. `0.x.y`). The jump to `1.0.0` marks production launch.

### 9.2 Release Cadence

- One release per completed iteration. Releases are tagged on `main` after the iteration PR is merged.
- Patch releases happen as needed for critical fixes — no fixed schedule.
- Planned release for the next iteration: `0.7.0` (confirm active iteration with Deepak first).

### 9.3 Tagging Convention

```bash
# Tag a release (on main, after the iteration squash-merge)
git tag -a v0.6.0 -m "Release v0.6.0 — iteration 6: role-tuned dashboards, releases, worklogs"
git push origin v0.6.0
```

Tag format: `v{MAJOR}.{MINOR}.{PATCH}` — always the `v` prefix. Tags are annotated (`-a`), never lightweight.
Tags are immutable — never delete or force-push a tag.

### 9.4 CHANGELOG

`CHANGELOG.md` in the repo root documents every release. Format follows
[Keep a Changelog](https://keepachangelog.com/en/1.1.0/) conventions:

```
## [0.7.0] — YYYY-MM-DD
### Added
### Changed
### Fixed
### Removed
```

Update `CHANGELOG.md` as the final commit of every iteration PR. The dod-version tag change (§5
PM Traceability) and the CHANGELOG entry are part of the same commit.

### 9.5 Hotfix Process

A hotfix is a PATCH release to fix a critical defect on `main` without waiting for the next iteration.

```
1. Branch from main:        git checkout -b hotfix/auth-token-expiry
2. Fix the defect + tests
3. Open PR to main with title:  fix(auth): correct JWT expiry window
4. CI must pass — no exceptions
5. Squash-merge to main
6. Tag immediately:         git tag -a v0.6.1 -m "Hotfix v0.6.1 — JWT expiry fix"
                            git push origin v0.6.1
7. Update CHANGELOG.md under [0.6.1]
```

Hotfix branches have the same 5-day lifetime rule. If the fix takes longer than 5 days it is not a hotfix — it is regular iteration work.

---

## 10. Testing Strategy

### 10.1 Testing Pyramid

| Layer | Framework | Scope | Target coverage |
|-------|-----------|-------|----------------|
| **Unit** | JUnit 5 (`@Tag("unit")`) / Vitest + RTL | Pure logic, single class/component, no I/O | ≥ 60% LINE (backend), ≥ 60% lines/functions/statements (frontend) |
| **Integration** | JUnit 5 + Testcontainers (real Postgres) | Service + repository wiring, Flyway migrations, API contracts | Key service paths + every Flyway migration |
| **E2E** | Playwright (not yet installed — see §10.4) | Critical user journeys end-to-end | Top 5–10 user flows once a stable deployment exists |

**Unit tests are the default.** Integration tests prove the wiring. E2E tests protect the golden paths. Never invert the pyramid.

### 10.2 Backend Testing Conventions

**Unit tests** (`@Tag("unit")`) — no live database, no Spring context:
- Test pure service logic by mocking repositories with Mockito
- Test domain objects, validators, and utility classes directly
- File location: `src/test/java/com/example/demo/<EntityName>Test.java` (no `Controller`/`Service` suffix on test class)
- Tag every test class: `@Tag("unit")`
- Run with: `./mvnw -B -Dgroups=unit verify` (also runs JaCoCo gate)

**Integration tests** (`@Tag("integration")`) — require a live Postgres via Testcontainers:
- Tag: `@Tag("integration")`
- Use `@SpringBootTest` + `@Testcontainers` with a `@Container PostgreSQLContainer`
- Test a full request-to-database cycle for each service
- Run with: `./mvnw -B -Dgroups=integration test` (CI future job — not yet in ci.yml)
- Do NOT run in the `backend-unit-test` CI job (requires Docker)

**What to test (unit tier):**
- Every `Service` class: happy path, edge cases, permission checks (`RbacService` calls)
- Every `@ControllerAdvice` exception handler
- Domain record/value objects with custom logic
- Flyway migration tests: write a `MigrationTest` using Testcontainers to verify schema (integration tag)

**What not to test:**
- Spring Boot auto-configuration
- JPA repository interfaces with no custom query logic
- DTOs with only getters/setters

### 10.3 Frontend Testing Conventions

**Unit / component tests** (Vitest + RTL):
- File location: co-located with the component: `atoms/badge.test.jsx` beside `atoms/badge.jsx`
- What to test: render output, variant classes, user interactions (click, keyboard), accessibility attributes
- Coverage enforced by Vitest (`test:coverage` script). Thresholds in `vite.config.js`:
  - lines: 60%, functions: 60%, statements: 60%, branches: 50%
  - Coverage scope: `src/components/works/**` only — not App.jsx (legacy monolith)
- Run with: `npm run test:coverage`

**Test conventions:**
- Use `@testing-library/user-event` for user interactions, not `fireEvent` directly
- Query priority: `getByRole` > `getByLabelText` > `getByText` > `getByTestId`
- Never test implementation details (className strings are acceptable for design-system component tests; internal state is not)
- Every component test file must cover: renders without crashing, variant/prop differences, keyboard interaction if the component is interactive

**What not to test:**
- Page-level components in App.jsx (legacy debt)
- Pure Tailwind class application without logic (snapshot tests add noise without value)

### 10.4 E2E Testing — Playwright (Not Yet Active)

**Decision: Playwright** (over Cypress) — better multi-browser support, faster execution, native TypeScript, no iframe limitations for future embedded views.

**Install when:** a stable staging environment exists and at least 3 iteration-complete features are deployed.

```bash
# When ready to activate:
cd works-frontend
npm install -D @playwright/test
npx playwright install
```

Config will live at `works-frontend/playwright.config.js`. Tests at `works-frontend/e2e/`.

**First 5 E2E flows to cover (in order):**
1. Register → verify email → log in → see dashboard
2. Create project → create work item → assign to user → change status
3. Create sprint → add work items → start sprint → complete sprint
4. Create RAID item (risk/assumption/issue/dependency)
5. Search via command palette (⌘K)

### 10.5 Test Data Strategy

- **Local:** Flyway migrations seed reference data (`roles`, `permissions`). No synthetic user/project data is seeded by default — use the registration flow or the API to create test data locally.
- **Unit tests:** create test data inline (factory methods or builders). No shared fixtures.
- **Integration tests:** each test creates and tears down its own data within a transaction rollback or isolated Testcontainers instance.
- **E2E:** a dedicated seed script (`scripts/e2e-seed.sql`) will create a stable test workspace, project, and user set. Run before the Playwright suite.

---

## 11. PR Workflow & Size

### 11.1 PR Size Guidelines

| Diff size | Expectation |
|-----------|-------------|
| ≤ 200 lines | Ideal — review in under 15 minutes |
| 200–400 lines | Acceptable — include a summary section in the PR description |
| 400–800 lines | Needs justification in the PR description ("this is large because…") |
| > 800 lines | Must be split unless it is a single atomic migration + tests that cannot be separated |

Count only changed code lines (not generated files, lock files, migration SQL, or CLAUDE.md). The DoD checklist item asks: "PR diff ≤ 400 lines, or the description justifies the size."

**Practical split strategies:**
- Separate the data layer (migration + repository + service) from the API layer (controller + DTOs + tests)
- Separate the backend contract from the frontend implementation
- Separate component additions from the page that uses them

### 11.2 Draft PR Convention

Open a PR as **draft** when:
- Work is in progress and you want early CI feedback
- You need a proof-of-concept reviewed before completing the implementation
- The branch is blocked waiting for another PR to merge

Rules for draft PRs:
- Title prefix: `[WIP]` is NOT used — GitHub's Draft status communicates this
- A draft PR does not block the branch lifetime limit (5 working days applies to ready PRs)
- Convert to "Ready for review" before requesting formal feedback
- Draft PRs should still have a filled PR description and the iteration/work-item fields populated

### 11.3 Self-Review Checklist (Before Opening PR)

Before marking a PR as "Ready for review" (or self-merging as the current single maintainer), run through this mentally:

1. Read the diff top-to-bottom — does every change belong to the stated task?
2. Does the commit message / PR title follow Conventional Commits format?
3. Have you run `npm run verify` (frontend) and `./mvnw -Dgroups=unit verify` (backend) locally?
4. Are new UI components covered by at least basic tests?
5. Are new service methods covered by `@Tag("unit")` tests?
6. Does the PR description explain the *why*, not just the *what*?
7. Are screenshots included for any UI change?

---

## 12. Dependency Management

### 12.1 Adding a New Dependency — The Approval Checklist

Before adding any npm package or Maven dependency, answer all of these:

| Question | Requirement |
|----------|-------------|
| Is this already solved by an existing dep? | Check existing `package.json` / `pom.xml` first |
| Is the package actively maintained? | Last commit < 6 months, no unresolved critical CVEs |
| What is the license? | MIT, Apache 2.0, BSD — acceptable. GPL/AGPL — discuss with Deepak first |
| Is it a runtime or dev dependency? | Classify correctly (`dependencies` vs `devDependencies` / `<scope>test</scope>`) |
| What is the bundle size impact? | Use [bundlephobia.com](https://bundlephobia.com) for npm; prefer tree-shakeable packages |

Document the reason for adding the dependency in the PR description under a **"New dependency"** heading.

### 12.2 Automated Updates — Dependabot

`.github/dependabot.yml` configures Dependabot to open weekly PRs for:
- npm dependencies (`works-frontend/`)
- Maven dependencies (`works-backend/`)

Rules for Dependabot PRs:
- PATCH updates: merge immediately if CI passes (no manual review required for patch bumps)
- MINOR updates: check the release notes; merge if no breaking changes
- MAJOR updates: review manually — these may require code changes

Do NOT merge a Dependabot PR if CI is red. Never manually edit a `package-lock.json` or `pom.xml` to force a version — let Dependabot manage it.

### 12.3 Security Scanning

**Frontend — `npm audit`:**
- CI runs `npm audit --audit-level=high` on every push. This fails the build on HIGH or CRITICAL vulnerabilities.
- For local checks: `cd works-frontend && npm audit`
- To fix: `npm audit fix` (for minor fixes). For major version bumps, let Dependabot handle it.

**Backend — OWASP Dependency Check (on demand):**
- Not in the regular CI pipeline (too slow — ~5 min NVD download). Run locally before releases:
  ```bash
  cd works-backend
  ./mvnw org.owasp:dependency-check-maven:check
  # Report at target/dependency-check-report.html
  ```
- Add `-Dnvd.api.key=YOUR_KEY` for faster NVD fetches (get a free key at https://nvd.nist.gov/developers/request-an-api-key)
- Integrate into CI as a scheduled weekly job once the team has an NVD API key.

### 12.4 Lockfile Policy

- `works-frontend/package-lock.json` IS committed and must stay in sync with `package.json`.
- Maven has no lockfile — `pom.xml` pins versions explicitly. Never use version ranges (`[1.0,2.0)`) for production dependencies.
- Never commit `node_modules/` or `works-backend/target/`.

---

## 13. CD Pipeline & Deployment

### 13.1 Deploy Workflow

`.github/workflows/deploy.yml` is a `workflow_dispatch`-triggered workflow. Run it from the
GitHub Actions UI by selecting the target environment (`staging` or `production`). A production
deploy requires typing `DEPLOY` in the confirmation field to prevent accidental triggers.

The workflow builds the backend JAR and the frontend `dist/` and has TODO placeholders for
the actual deployment steps. Wire the real steps (§13.2) once a hosting target is confirmed.

**Deploy trigger rules:**
- Only deploy after all CI jobs on the target commit have passed
- Never deploy a commit that has not been tagged with a release version (§9.3)
- Never deploy directly from a feature branch — only from `main`
- Staging deploys can be triggered by any team member; production deploys require Deepak's confirmation

### 13.2 Deployment Decision Checklist

Before wiring real deployment steps, decide:

| Question | Options |
|----------|---------|
| Hosting model | VPS (SSH + systemd) · Docker on a host · PaaS (Render, Railway, Fly.io) · Kubernetes |
| Database hosting | Managed Postgres (Supabase, Neon, RDS) · Self-hosted on VPS |
| Frontend hosting | Same server · CDN/static host (Vercel, Cloudflare Pages, S3 + CloudFront) |
| Container registry | GitHub Container Registry (GHCR) · Docker Hub · ECR |
| Secrets injection | GitHub Environment secrets · Vault · Platform-native secrets manager |

Once decided, replace the TODO steps in `deploy.yml` with real deployment commands.

### 13.3 Health Check Standard

Every deployed backend instance must respond at `GET /actuator/health` → `{"status":"UP"}`.
Spring Actuator is already configured — only `health` and `info` are exposed over HTTP.
The deploy workflow's final step must call this endpoint and fail if the status is not `UP`.

---

## 14. Logging & Observability

### 14.1 Log Levels by Environment

| Environment | Root level | `com.example.demo` | Hibernate SQL |
|-------------|-----------|-------------------|--------------|
| Local / test | INFO | DEBUG | DEBUG |
| Staging | INFO | INFO | WARN |
| Production | WARN | INFO | WARN |

Set the active Spring profile via `SPRING_PROFILES_ACTIVE=staging` or `production`.
`logback-spring.xml` in `src/main/resources/` switches format and level automatically.

### 14.2 Structured Logging Rules

- **Always use SLF4J `Logger`** — `System.out.println` is blocked by `guardrails.sh`
- Log at the right level: DEBUG for dev detail, INFO for notable business events,
  WARN for recoverable issues, ERROR for failures needing attention
- **Never log PII** (email, name, phone) or secrets (tokens, passwords)
- Use parameterised messages: `log.info("Work item created id={} projectId={}", id, projectId)`
  — never string-concatenate into log messages (log injection risk + performance)
- Local: human-readable console output. Staging/prod: JSON per line (ready for log aggregation)

### 14.3 Observability Roadmap

| Tool | Purpose | When to add |
|------|---------|-------------|
| `logstash-logback-encoder` | Full JSON + ECS fields in staging/prod | When a log aggregator is wired |
| Sentry | Error tracking + stack traces | Before first external users |
| Micrometer + Prometheus | App metrics (request rate, latency, DB pool) | When infra monitoring exists |
| OpenTelemetry | Distributed tracing | If microservices are ever introduced |

---

## 15. API Pagination & Filtering

### 15.1 Pagination Standard — Offset-Based

All list endpoints that can return more than 50 items **must** be paginated using Spring's
`Pageable` and the `PageResponse<T>` wrapper class (`com.example.demo.PageResponse`).

**Query parameters (always these exact names):**

| Parameter | Type | Default | Description |
|-----------|------|---------|-------------|
| `page` | int | 0 | Zero-based page number |
| `size` | int | 25 | Items per page — max 100, enforced in service |
| `sort` | string | `createdAt,desc` | `field,direction` — multiple allowed |

**Response envelope** (`PageResponse<T>`):
```json
{ "items": [...], "total": 142, "page": 0, "size": 25, "totalPages": 6 }
```

**Controller pattern:**
```java
@GetMapping
public PageResponse<WorkItemDto> list(
        @RequestParam(defaultValue = "0")  int page,
        @RequestParam(defaultValue = "25") int size,
        @RequestParam(defaultValue = "createdAt,desc") String sort) {
    Pageable pageable = PageRequest.of(page, Math.min(size, 100),
            Sort.by(Sort.Direction.fromString(sort.split(",")[1]), sort.split(",")[0]));
    return PageResponse.of(workItemRepository.findAll(pageable).map(WorkItemDto::from));
}
```

### 15.2 Filtering Conventions

| Pattern | Example | Meaning |
|---------|---------|---------|
| `field=value` | `status=IN_PROGRESS` | Exact match |
| `field=v1,v2` | `priority=HIGH,CRITICAL` | Multi-value OR |
| `field_from=date` | `createdAt_from=2026-01-01` | Range start (ISO-8601) |
| `field_to=date` | `createdAt_to=2026-06-30` | Range end (ISO-8601) |
| `q=text` | `q=auth+bug` | Full-text search |
| `projectId=id` | `projectId=p_456` | Scope filter (required on most list endpoints) |

All filter parameters are optional; filters combine with AND semantics unless noted.
Debounce filter inputs at 250ms on the frontend (CLAUDE.md §4.18).

### 15.3 Existing Endpoints — Migration Path

Many existing controllers use `findAll()` with no pagination — this is `⚠️ pagination debt`.
Migrate each endpoint to `PageResponse` as you touch it: add `Pageable` → switch repository
method → wrap in `PageResponse.of()`. Never introduce a new `findAll()` call.

---

## 16. Frontend Data Fetching — TanStack Query

### 16.1 Setup

`@tanstack/react-query` is installed. `QueryClientProvider` is wired in `main.jsx`.
The shared `queryClient` instance lives in `src/lib/query-client.js`.

**Never use raw `useEffect` + `useState` for data fetching in new components.** That pattern
is legacy debt in App.jsx. All new pages and components use `useQuery` / `useMutation`.

### 16.2 Query Key Conventions

```js
['work-items', { projectId, status, page, size }]  // list with filters
['work-items', itemId]                              // single entity
['projects', projectId, 'sprints']                 // nested resource
```

First element = entity name (matches REST path segment). Filters go in the second element
as an object. The same logical query always uses the same key shape.

### 16.3 Data Fetching Template

```jsx
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { api } from '@/lib/apiClient'

// Query
function useWorkItems({ projectId, page = 0, size = 25 }) {
  return useQuery({
    queryKey: ['work-items', { projectId, page, size }],
    queryFn: () => api.send(`/work-items?projectId=${projectId}&page=${page}&size=${size}`),
    enabled: !!projectId,
  })
}

// Mutation — optimistic UI (CLAUDE.md §4.16)
function useCreateWorkItem() {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: (body) => api.send('/work-items', { method: 'POST', body }),
    onSuccess: () => qc.invalidateQueries({ queryKey: ['work-items'] }),
  })
}
```

### 16.4 Loading / Error / Empty States

```jsx
const { data, isLoading, isError } = useWorkItems({ projectId })
if (isLoading) return <WorkItemListSkeleton />   // skeleton — CLAUDE.md §4.11
if (isError)   return <ErrorMessage ... />
if (!data?.items?.length) return <EmptyState ... />
```

`isLoading` (first load) → skeleton screen. `isFetching` (background refetch) → subtle header
indicator only. `isError` → inline error with a "retry" CTA that calls `refetch()`.

### 16.5 Cache Invalidation After Mutations

```js
// Narrow (preferred) — only re-fetches the specific project's work items
qc.invalidateQueries({ queryKey: ['work-items', { projectId }] })

// Broad — use after bulk operations only
qc.invalidateQueries({ queryKey: ['work-items'] })
```

---

## 17. Security Hardening

### 17.1 HTTP Security Headers

Added to `SecurityConfig.java` via Spring Security's `.headers()` DSL. Current headers sent on every response:

| Header | Value | Protection |
|--------|-------|-----------|
| `Content-Security-Policy` | `default-src 'self'; script-src 'self'; style-src 'self' 'unsafe-inline'; img-src 'self' data: blob:; font-src 'self'; connect-src 'self'; frame-ancestors 'none'` | XSS, clickjacking |
| `X-Frame-Options` | `DENY` | Clickjacking fallback |
| `X-Content-Type-Options` | `nosniff` | MIME sniffing |
| `Referrer-Policy` | `strict-origin-when-cross-origin` | Referrer leakage |

**Updating CSP:** edit the policy string in `SecurityConfig.java`. Tighten `style-src` once inline styles are eliminated (remove `'unsafe-inline'`). Never add `'unsafe-eval'`.

**HSTS:** add `Strict-Transport-Security` only in staging/production (it must not be sent over HTTP). Wire it via a Spring profile condition or an environment variable check.

### 17.2 CORS

CORS is configured in `SecurityConfig.corsConfigurationSource()`. Allowed origins come from `BSMART_CORS_ALLOWED_ORIGINS` (comma-separated list). Rules:

- Never use `*` as an allowed origin — always name the exact origin(s)
- Only add an origin to `BSMART_CORS_ALLOWED_ORIGINS` in staging/prod when you own that domain
- Allowed methods are fixed: `GET, POST, PUT, DELETE, OPTIONS` — do not add `PATCH` or `TRACE` without security review
- `allowedHeaders(List.of("*"))` is acceptable here because requests are authenticated via JWT (not cookies) and the CSP policy further restricts what scripts can do

### 17.3 XSS Prevention

**Backend:** JPA/Hibernate parameterised queries prevent SQL injection by default. For any native query (annotated `@Query(nativeQuery = true)` or via `EntityManager.createNativeQuery`):
- Always use bind parameters (`:paramName` or `?1`) — never string-concatenate user input
- `guardrails.sh` blocks string-concatenated query patterns in controller and service files

**Frontend:** React's JSX escapes output by default. Additional rules:
- Never use `dangerouslySetInnerHTML` on user-supplied content without sanitisation
- If rich text rendering is needed, use DOMPurify: `DOMPurify.sanitize(html)` before passing to `dangerouslySetInnerHTML`
- Never construct a URL from user input without `encodeURIComponent`
- Never store sensitive data in `localStorage` beyond the JWT session token (already done in `apiClient.js`)

### 17.4 Rate Limiting

Not yet implemented. Recommended approach when needed:

**Option A — API Gateway / load balancer (preferred for production):** configure rate limiting at the infrastructure layer (Nginx, Cloudflare, AWS API Gateway). No application code needed.

**Option B — In-application with Bucket4j:**
```xml
<dependency>
  <groupId>com.giffing.bucket4j.spring.boot.starter</groupId>
  <artifactId>bucket4j-spring-boot-starter</artifactId>
</dependency>
```
Add to `pom.xml` and configure per-endpoint limits in `application.properties`. See [Bucket4j docs](https://github.com/MarcGiffing/bucket4j-spring-boot-starter).

Implement rate limiting before any endpoint is exposed to external/untrusted callers.

### 17.5 Security Review Trigger

A PR **must** be flagged for security review (add label `security-review` on the GitHub PR) when it touches any of:
- `SecurityConfig.java` or any security filter
- JWT generation, validation, or storage (`JwtUtil`)
- `RbacService` or any permission check
- Authentication endpoints (`/api/v1/auth/*`)
- File upload or attachment handling
- Any new endpoint that accepts user-supplied file paths or URLs
- CORS origin list changes
- Any native SQL query

For small teams (current state): Deepak self-reviews these changes and verifies the security checklist in the PR description. The `security-review` label is the signal — no separate approval process until the team grows.

### 17.6 OWASP Top 10 Self-Check (for Security-Flagged PRs)

Before merging a security-flagged PR, verify these are not introduced:

| # | Risk | Check |
|---|------|-------|
| A01 | Broken access control | RBAC check in service layer via `RbacService`? |
| A02 | Cryptographic failures | JWT secret ≥32 chars? No sensitive data in logs? |
| A03 | Injection | Bind parameters in all queries? No string concat? |
| A04 | Insecure design | Auth bypass possible? |
| A05 | Security misconfiguration | Dev token disabled in prod? CORS origins named? |
| A06 | Vulnerable components | `npm audit` + OWASP check clean? |
| A07 | Auth & session failures | JWT expiry enforced? Stateless? |
| A08 | Integrity failures | No `unsafe-eval` in CSP? |
| A09 | Logging failures | No PII/secrets in logs? |
| A10 | SSRF | No user-controlled URLs fetched server-side? |

---

## 18. Database Best Practices

### 18.1 Query Performance Guidelines

- **Never call `findAll()` on a table that can grow without bound.** Every list endpoint that returns user-generated data (work items, comments, events, notifications) must use `Pageable` and `PageResponse<T>` (CLAUDE.md §15). The `findAll()` calls currently in the codebase are flagged as pagination debt — migrate them as you touch each endpoint.
- Prefer **Spring Data derived queries** (`findByProjectIdAndStatus(...)`) over JPQL for simple filters — they are type-checked at startup.
- For complex filters, use **JPQL with bind parameters** (`@Query("SELECT w FROM WorkItem w WHERE w.projectId = :projectId")`). Never native SQL unless there is no JPQL equivalent.
- **Never SELECT in a loop.** If you find yourself calling a repository inside a `for` loop, rewrite to a single `IN (...)` query or use a join.

### 18.2 N+1 Prevention

N+1 is the most common JPA performance bug. Detect and fix it before it ships:

**Identify:** enable `spring.jpa.show-sql=true` locally. If you see the same query repeated N times in a loop, that is N+1.

**Fix options (in order of preference):**
1. `@EntityGraph(attributePaths = {"association"})` on the repository method — fetches the association in one JOIN
2. `JOIN FETCH` in a JPQL `@Query`
3. `@BatchSize(size = 25)` on the collection field (Hibernate batch loading)

**Never fix N+1 with `FetchType.EAGER`** — it replaces one problem with a permanent tax on every query.

### 18.3 Indexing Strategy

Flyway migrations that add a new table or foreign key **must** include an index migration or a comment explaining why one is not needed.

Default indexing rules:
- Every foreign key column (`project_id`, `assignee_id`, `sprint_id`) gets an index
- Every column used as a filter in a list endpoint (`status`, `priority`, `created_at`) gets an index if the table can exceed ~10k rows
- Unique constraints (email, slug) already imply an index — do not add a duplicate
- Composite index when two columns are always filtered together

```sql
-- Example in a Flyway migration:
CREATE INDEX idx_work_items_project_status ON work_items(project_id, status);
CREATE INDEX idx_work_items_assignee       ON work_items(assignee_id);
```

### 18.4 HikariCP Connection Pool

Configured in `application.properties` under `spring.datasource.hikari.*`. Override via env vars:

| Property | Default | Env var override | Notes |
|----------|---------|-----------------|-------|
| `maximum-pool-size` | 10 | `BSMART_DB_POOL_MAX` | Raise if connection wait time >30ms under load |
| `minimum-idle` | 2 | `BSMART_DB_POOL_MIN_IDLE` | Keep low to avoid idle connections in staging |
| `connection-timeout` | 30s | — | 30s is generous; lower to 5s in prod |
| `idle-timeout` | 10min | — | Release idle connections back to Postgres |
| `max-lifetime` | 30min | — | Recycle connections before Postgres kills them |
| `leak-detection-threshold` | 60s | — | Logs a warning if a connection is not returned |

Monitor pool health at `/actuator/health` — it reports HikariCP pool status when `show-details=when-authorized`.

### 18.5 Backup Strategy

**Not yet implemented** (no production deployment). When a hosting target is confirmed:

| Tier | Backup frequency | Retention | Method |
|------|-----------------|-----------|--------|
| Production | Every 6 hours (continuous WAL preferred) | 30 days | Managed Postgres provider auto-backup, or `pg_dump` via cron |
| Staging | Daily | 7 days | `pg_dump` to S3/GCS |
| Local | N/A — use `docker compose down -v` to reset | — | |

Rules when implemented:
- Test restore at least once before go-live — a backup that has never been restored is not a backup
- Store backups in a different region/account from the database
- Encrypt backups at rest (most managed Postgres providers do this automatically)
- Never store backup credentials in the repo — use the secrets management approach (CLAUDE.md §8)

---

## 19. API Documentation & Versioning

### 19.1 OpenAPI / Swagger UI

**Tool: springdoc-openapi**

Add to `works-backend/pom.xml` when a compatible version for Spring Boot 4.0.x is confirmed (check [springdoc.org](https://springdoc.org) — target version 2.9+):
```xml
<dependency>
  <groupId>org.springdoc</groupId>
  <artifactId>springdoc-openapi-starter-webmvc-ui</artifactId>
  <version>2.9.x</version>
</dependency>
```

Once added:
- Swagger UI: `http://localhost:8080/swagger-ui.html`
- OpenAPI JSON: `http://localhost:8080/v3/api-docs`
- Restrict in production: `springdoc.api-docs.enabled=false` (or restrict to internal network)

**Annotation standard** (add to all controllers once springdoc is active):
```java
@Operation(summary = "List work items for a project", description = "Paginated, filterable.")
@ApiResponse(responseCode = "200", description = "Page of work items")
@ApiResponse(responseCode = "403", description = "Not a member of this project")
```

Until springdoc is wired, document new endpoints in the PR description with request/response examples.

### 19.2 API Versioning

Current API is `/api/v1/`. Versioning strategy when a breaking change is needed:

**URL path versioning** (keep it simple):
- Breaking change → introduce `/api/v2/<resource>` endpoint
- Run v1 and v2 in parallel until all clients are migrated
- Deprecate v1 with a `Deprecation` response header and a sunset date
- Remove v1 only after the sunset date has passed and no active client is on v1

**What counts as a breaking change:**
- Removing or renaming a field in a response body
- Changing a field's type
- Removing an endpoint
- Changing required/optional status of a request field
- Changing error codes that clients may be checking

**What is NOT a breaking change:**
- Adding a new optional response field
- Adding a new optional request parameter
- Adding a new endpoint
- Fixing a bug in existing behavior (document it clearly)

### 19.3 Deprecation Process

1. Add `@Deprecated` to the Java method + a Javadoc note pointing to the replacement
2. Return a `Deprecation: true` and `Sunset: <date>` response header
3. Log a WARN on every call to the deprecated endpoint so usage is visible
4. Document in `CHANGELOG.md` under the version that introduces the deprecation
5. Remove only after the sunset date

---

## 20. Technical Debt Management

### 20.1 What Goes in the Debt Register

**Technical debt** is a deliberate decision to use a suboptimal solution now in exchange for speed, with the intent to fix it later. It is not bugs (fix immediately) or future features (in the roadmap). Every item of acknowledged tech debt belongs in `TECH-DEBT.md`.

Categories:
- **Architecture debt** — structural decisions that limit future scale (e.g. flat package structure)
- **Code debt** — known suboptimal code that passes CI but should be improved (e.g. App.jsx monolith)
- **Tooling debt** — missing tooling that would improve quality (e.g. OpenAPI not yet wired)
- **Migration debt** — temporary incompatibilities between spec and code (e.g. `com.example.demo` package)

### 20.2 TECH-DEBT.md

`TECH-DEBT.md` in the repo root is the single register. Every entry has:
- **What:** one sentence describing the debt
- **Why accepted:** why the shortcut was taken
- **Impact:** what breaks or degrades if left unaddressed
- **Trigger:** the condition that should prompt fixing it (e.g. "when team > 3 devs", "before v1.0")

### 20.3 Adding Debt

When you intentionally take a shortcut, add an entry to `TECH-DEBT.md` in the same PR. If you discover existing debt (not logged), add it. The register is never a blocker — it is a visibility tool.

### 20.4 Paying Down Debt

- Debt items with a "Trigger" whose condition is now met should be scheduled in the current or next iteration
- Each iteration review (after the iteration PR merges): scan `TECH-DEBT.md` for triggered items
- Paying down debt gets its own PR with `refactor(...)` or `chore(...)` prefix — never bundled into a feature PR
- Remove the entry from `TECH-DEBT.md` when the debt is fully resolved

---

## 21. Architecture: Working Principle, Attributes & Modular Design

### 21.1 Working Principle — Modular Monolith, Microservice-Ready

The system is deployed as a **single Spring Boot application today**, but designed with
**microservice-extractable domain boundaries**. Every domain is a cohesive cluster of
`Entity + Service + Controller + Repository`. When extraction is justified by scale, each
cluster can become its own service without architectural surgery.

**Do not pre-extract.** No Kafka, message bus, gRPC, or service mesh until real scale demands
it. Complexity must be earned. The current monolith is the right architecture for this stage.

#### Domain Module Map (verified against the codebase)
| Domain | Core Entities | Future Service Boundary |
|--------|--------------|------------------------|
| Identity & Auth | `User`, `JwtUtil`, `SecurityConfig`, `MFA` | identity-service |
| Work Management | `WorkItem`, `Sprint`, `WorkLog`, `WorkItemLink` | work-service |
| PM Artifacts (RAID) | `Risk`, `Assumption`, `Issue`, `Decision`, `ActionItem` | raid-service |
| Customization | `FieldDef`, `FieldLayout`, `Workflow`, `WorkflowStatus` | config-service |
| Knowledge | `KnowledgeSpace`, `Article`, `ArticleVersion` | knowledge-service |
| Collaboration | `Comment`, `Attachment`, `Meeting`, `Notification` | collab-service |
| Releases | `Release`, `CrossProjectDependency`, `Stakeholder` | release-service |
| RBAC | `RoleDef`, `RolePermission`, `PermissionScheme` | (stays shared) |
| Events | `AppEvent`, `EventService` | (stays shared — audit bus) |
| AI Orchestration | (iteration 10+) | ai-service |

**Rule:** When adding a new feature, identify which domain it belongs to and add it to that
cluster. Never create a cross-domain entity. Never put two domain's business logic in one
service class.

### 21.2 Architectural Attributes (Quality Attributes)

| Attribute | How It Is Achieved |
|-----------|-------------------|
| **Maintainability** | One way per operation. Tooling enforces it. No drive-by refactors. |
| **Modularity** | Domain cohesion — each domain owns its entity/service/controller/repo. No cross-domain leakage. |
| **Horizontal Scalability** | Stateless JWT (no server sessions). Add instances, not complexity. |
| **Security** | Defense-in-depth: Spring Security at the edge, `RbacService` in every service, API-enforced privacy. |
| **Auditability** | Append-only `events` table. Every mutation emits an event. Full state reconstruction always possible. |
| **Extensibility** | Customization (FieldDef, Workflow) is a deliberate separate layer. AI is a toggleable overlay. |
| **Simplicity** | No abstraction without demonstrated need. Three similar lines > a premature abstraction. |
| **Testability** | JUnit 5 + real Postgres (Testcontainers). Behavior proved, not mocked away. |
| **Observability** | Event store enables time-travel debugging and compliance reconstruction. |

### 21.3 Request Flow (end-to-end)

```
Browser (React SPA)
  └─ apiClient.js              ← single HTTP gateway, sets JWT header
       └─ Spring Boot /api/v1/
            └─ SecurityConfig  ← JWT filter (stateless verify)
                 └─ Controller ← parse + delegate only
                      └─ RbacService.check()  ← permission gate
                           └─ Service         ← business logic
                                └─ Repository ← JPA query
                                     └─ PostgreSQL
                                └─ EventService.emit()  ← append to `events`
```

**Every write path emits an event. Every read path goes through RBAC.**

### 21.4 Database Contract

- Schema: Flyway-only (never manual). Sequential integers, no gaps on a branch.
- Tables: plural snake_case (`work_items`, `project_members`).
- Events: append-only (`events`). Never UPDATE or DELETE from this table.
- Current high-water mark on `main`: **V29**. Next new migration: **V30__.sql**.

---

## 22. UI/UX Design System — Look, Feel & Interaction

### 22.1 Visual Personality

**Professional, dense, operational.** The reference point is tools like Linear, Notion Pro, or
a Bloomberg terminal — not a consumer app. Information density is a feature. Users are
professionals who spend 8+ hours in the tool; visual noise and empty whitespace are waste.

- Navy (`brand-navy`) dominates. It anchors headers, nav, and primary actions.
- Orange/amber are accents only — CTAs, live indicators, chevrons. Use sparingly.
- Neutrals carry body content. The page background is `neutral-50`. Cards are `white` with `shadow-sm`.
- Semantic colors signal status, never decoration.

### 22.2 Layout Shell

Every screen uses the same shell — never create a one-off layout:

```
┌──────────────────────────────────────────────────────┐
│  Top Bar (h-14, bg-white, border-b neutral-200)       │
├──────┬───────────────────────────────────────────────┤
│ Nav  │                                               │
│ w-56 │   Main Content Area                           │
│ or   │   (scrollable, p-6, neutral-50 bg)            │
│ w-12 │                                               │
│ col- │                                               │
│lapse │                                               │
└──────┴───────────────────────────────────────────────┘
```

- **Left nav**: `w-56` expanded, `w-12` icon-only collapsed. State in React Context.
- **Top bar**: workspace switcher, search, notifications, user avatar.
- **Main area**: `bg-neutral-50 min-h-screen`. Content in cards (`bg-white rounded-lg shadow-sm`).
- Never create page-specific nav, toolbars, or wrapper layouts outside this shell.

### 22.3 Expand / Shrink Patterns

All animated transitions use the brand motion tokens (from `tailwind.config.js`):

| Pattern | CSS approach | Duration | Easing |
|---------|-------------|----------|--------|
| Sidebar collapse/expand | `w-56` ↔ `w-12` | `duration-fast` (150ms) | `ease-out-quint` |
| Detail panel (slide-in) | `translate-x-full` → `translate-x-0` | `duration-fast` (150ms) | `ease-out-quint` |
| Section accordion | `max-h-0 overflow-hidden` → `max-h-screen` | `duration-slow` (320ms) | `ease-out-quint` |
| Page transitions | opacity + slight translate-y | `duration-base` (220ms) | `ease-out-quint` |
| Dropdown / popover | scale + opacity | `duration-[120ms]` | `ease-out-quint` |
| Drag & sort | none (direct) | `duration-instant` | — |

**Never** use `spring` easing for UI chrome — it's reserved for microinteractions (badges, counters).
**Never** use bounce, sparkle, or decorative motion.

### 22.4 Component Rules

Every component in `works-frontend/src/components/works/` follows `button.jsx`:
- Written with `cva` variants + `cn()` composition.
- Token classes only — no raw hex, px, or font names.
- Hover: one shade deeper (navy → navy-tint; neutral-100 → neutral-200).
- Focus: `ring-2 ring-brand-navy-tint/40 ring-offset-2`.
- Active: `active:translate-y-px` (1px down — already in Button).
- Disabled: `opacity-50 pointer-events-none`.
- Transition: `duration-[120ms]` on all interactive elements.

#### Loading & Async States
- Button loading: `Loader2` spinning icon (already in Button, reuse this pattern).
- Data loading: skeleton shimmer using `bg-neutral-200 animate-pulse rounded`.
- Page loading: spinner centered in content area, not full-screen overlay.

#### Empty States
Every empty state must have three elements:
1. A lucide icon (neutral-300, size `h-10 w-10`).
2. A title explaining WHY it's empty (`text-neutral-700 font-semibold`).
3. A next-step prompt or action button.
Never show a blank area or just "No items found."

#### Error States
- Inline field errors: `text-semantic-danger text-xs` below the field.
- Toast/banner errors: `semantic-danger-surface bg` with danger border.
- Always state: what went wrong + what the user can do.
- API errors are mapped from `{ code, message, field? }` in `apiClient`.

### 22.5 Density & Spacing

- Base unit: 4px (Tailwind default scale).
- Standard row height: `h-9` (36px) for list items, table rows, inputs.
- Card padding: `p-4` (small cards) or `p-6` (feature cards).
- Section spacing: `space-y-4` between cards; `space-y-6` between page sections.
- Max content width: `max-w-7xl mx-auto` for full-width pages.
- No arbitrary spacing values (`p-[13px]` fails lint).

### 22.6 Typography Hierarchy

| Role | Classes |
|------|---------|
| Page title | `text-xl font-bold text-neutral-900` |
| Section header | `text-base font-semibold text-neutral-700` |
| Card label | `text-xs font-semibold text-neutral-600 uppercase tracking-wide` |
| Body text | `text-sm text-neutral-700` |
| Secondary / meta | `text-xs text-neutral-400` |
| Monospace / code | `font-mono text-sm text-neutral-700` |

### 22.7 Interaction Principles

- **Same everywhere**: every list, every form, every table uses the same patterns — no bespoke UX per feature.
- **Keyboard-first**: every action reachable by keyboard. Focus management is required for modals and panels.
- **Instant feedback**: button loading states, optimistic UI for non-destructive mutations.
- **Reversible destructives**: destructive actions require confirmation (`danger` variant + modal).
- **No hidden complexity**: show the real state. Role-restricted content shows a locked state, not nothing.

---

## 23. How AI Tools Auto-Follow These Rules (Never Repeat Yourself)

### The mechanism
`CLAUDE.md` is the **single source of truth**. Every AI tool reads a derived copy of it:

```
CLAUDE.md  ──► .github/copilot-instructions.md   (GitHub Copilot)
           ──► .cursor/rules/bsmart.mdc           (Cursor — alwaysApply: true)
           ──► .windsurfrules                      (Windsurf / Codeium)
           ──► AGENTS.md                           (cross-tool standard)
```

**Whenever you update a rule here, regenerate:**
```bash
node scripts/generate-ai-rules.mjs
```
Commit the regenerated files alongside the CLAUDE.md change. CI fails if they're stale
(`node scripts/generate-ai-rules.mjs --check`).

### What this means in practice
- **You never repeat design rules to an AI tool.** They are always present in context.
- **Rules are enforced by machines, not memory.** ESLint, Checkstyle, and guardrails.sh
  catch violations before they reach PR review.
- **Any new principle you add here** becomes permanent the moment you run the generator.
  It will be followed by Claude Code, Cursor, Copilot, and Windsurf on every subsequent task.

### To add a new rule permanently
1. Edit `CLAUDE.md` (this file) — the appropriate section.
2. `node scripts/generate-ai-rules.mjs` — regenerate derived files.
3. Commit: `CLAUDE.md` + all four derived files in one commit.
4. Done. Every AI tool and every teammate is in sync.

---

*Verified against the codebase on 2026-06-01. Source specs: Capability Map v3.5, Complete
Iteration Guide, Tech Stack & Architecture, Brand & Identity (bSmart Works master package).
Where spec and code conflict, code is canonical and the conflict is flagged ⚠️.*
