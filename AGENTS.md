<!-- GENERATED FROM CLAUDE.md — do not edit by hand.
     Edit CLAUDE.md and run: node scripts/generate-ai-rules.mjs
     This file is the cross-tool AGENTS.md view of the same rules. -->

# bSmart Works — AI Development Context

> **For AI tools:** This file is the single source of truth for coding decisions in this repo.
> Read it fully before writing code or answering questions about this project.
> **Every fact below is verified against the actual codebase, not just the spec docs.**
> Where the spec and the code disagree, the code wins and the gap is flagged with ⚠️.

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
| Styling | Tailwind CSS 3.4 — token classes only (see §4) |
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

### Database (Flyway — current high-water mark: **V19** on `main`; note V16 was skipped)
- **All schema changes via Flyway migrations only.** Never alter the DB manually.
- Next migration is **`V20__<description>.sql`**. Naming: `V{n}__{snake_case_description}.sql`.
  (Existing on `main`: …V14, V15 seed_brand_and_identity, V17 mfa_totp, V18 project_slugs,
  V19 data_quality_cleanup, V20 drop_dead_event_log.)
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
- **Radius tokens (verified):** `rounded-sm` 4px · `rounded` / `rounded-md` 8px · `rounded-lg` 12px · `rounded-xl` 16px
- Card: `rounded-lg` — Panel: `rounded-md` — Pill/badge: `rounded-full`

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

The library lives in `works-frontend/src/components/works/`. Currently 3 exist:
`Button` (`button.jsx`, cva variants: primary/secondary/ghost/danger/action/link),
`Logo` (`logo.jsx`), `StatusBadge` (`status-badge.jsx`).

When adding a component:
1. Use `cva` for variants + `cn()` for merging — match `button.jsx` exactly.
2. Token classes only — no raw hex/px/font.
3. Export from the same `works/` folder.
4. Build toward the target inventory incrementally — do not assume more than the 3 that exist.

**Target component inventory** (build as features require, in this rough priority order):
`Input`, `Select`, `Textarea`, `Checkbox`, `RadioGroup`, `Toggle`,
`Badge`, `Tooltip`, `Dropdown` / `ContextMenu`, `Modal` / `Dialog`,
`Collapsible`, `Tabs`, `Breadcrumb`, `Avatar`, `Skeleton`,
`Toast` / `Notification`, `Table`, `Pagination`, `Sidebar`, `CommandPalette`

---

### 4.14 Logo Usage

- `logo-primary.svg` — light backgrounds · `logo-reverse.svg` — navy/dark backgrounds
- `logo-mono.svg` — single-color/print · `logo-icon.svg` — favicon/avatar/small (≥24px)

Use the `<Logo>` component or reference `/logo-*.svg`. Never distort, recolor, or crop the logo.

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

**Current status (inferred from migrations V1–V19 on `main`):** the project is around **iteration 2–3**
(work items + sprints landed; RBAC/tiers seeded). Confirm the active iteration with Deepak
before building forward. **Do not implement iteration N+1 features while iteration N is in scope.**

---

## 6. What NOT To Do

**Architecture / Backend**
- Don't add features, abstractions, or generalization beyond the task.
- Don't create capability-specific auth, data models, or UI patterns. One of each, unified.
- Don't change DB schema without a Flyway migration (next is `V21`).
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
- Don't assume the 30-component library exists — only Button, Logo, StatusBadge do.
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

---

## 7. Definition of Done (Every PR)

**Backend**
- [ ] New endpoints have `@Valid` DTO validation, under `/api/v1/`, plural kebab path
- [ ] New tables/columns have a Flyway migration (`V21+`), plural table names
- [ ] RBAC check in service layer (not controller)
- [ ] Errors use the standard `{ code, message, field? }` shape
- [ ] New code added to `com.example.demo` (no new top-level packages without a rename plan)
- [ ] AI features have documented fallback behavior

**Frontend / UI**
- [ ] No raw hex/px/font in frontend — token classes only (`brand-*`, `neutral-*`, `semantic-*`)
- [ ] New components follow the `button.jsx` cva + `cn()` pattern
- [ ] Every interactive element has all 5 states: default, hover, active, disabled, focus ring
- [ ] Every new section or panel supports expand/collapse with localStorage persistence
- [ ] Loading states use skeleton screens — no content-area spinners
- [ ] Empty states include: icon + why it's empty + CTA to fix it
- [ ] Form errors are inline beneath the field, not toast-only
- [ ] Page-level actions sit in the sticky header top-right, not floating or in sidebar
- [ ] No Tailwind `gray-*` classes — only `neutral-*` from the token set
- [ ] Orange/amber appear at most 1–2 times per screen

---

*Verified against the codebase on 2026-05-31. Source specs: Capability Map v3.5, Complete
Iteration Guide, Tech Stack & Architecture, Brand & Identity (bSmart Works master package).
Where spec and code conflict, code is canonical and the conflict is flagged ⚠️.*
