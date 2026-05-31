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
- **Two event tables exist:** `event_log` (V1) and `events` (V4) — overlapping purpose. This
  violates the "single event store" principle. Pick one before building more on event sourcing.

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
  (Existing on `main`: …V14, V15 seed_brand_and_identity, V17 mfa_totp, V18 project_slugs, V19 data_quality_cleanup.)
- **Table names are PLURAL.** Verified existing tables:
  `users, projects, project_members, workspaces, workspace_members, work_items,
  work_item_links, sprints, comments, attachments, notifications, notification_preferences,
  tags, starred_items, saved_filters, roles, permissions, role_audit_log,
  password_reset_tokens, event_log, events`
- Event sourcing: append-only event table — **append only, never delete/update rows.**
  (⚠️ resolve the `event_log` vs `events` duplication first.)

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

### Colors — Use These Exact Token Names (Never Raw Hex)
```
brand.navy        #0B2F5C   → class: bg-brand-navy / text-brand-navy   (PRIMARY, dominant)
brand.navy-tint   #1E4D8C   → bg-brand-navy-tint                       (hover/secondary)
brand.orange      #E94E1B   → bg-brand-orange                          (ACCENT — sparingly)
brand.amber       #F39200   → bg-brand-amber                           (accent, chevron gradient end)

neutral.50 #F7F9FC · 100 #F2F4F8 · 200 #E5E9EF · 300 #C9D2DF · 400 #9AA8BC · 600 #5A6B7E · 700 #2A3B52 · 900 #0F1A2A

semantic.success #0E7C5E (success-surface #E8F3EE)
semantic.warning #B97A00 (warning-surface #FFF4E5)
semantic.danger  #C0392B (danger-surface  #FDE7E7)
semantic.info    #1E4D8C (info-surface    #E5EDF7)
```
**Never put a raw hex value in a component — always the token class.**
Orange/amber are accents; navy dominates. (Verified against `works-frontend/tailwind.config.js`
on `main`: the brand-teal token was migrated to `brand-amber`; these values are canonical.)

### Typography
```
sans: Inter (300 light, 400, 600 semibold, 700 bold)   mono: JetBrains Mono
```
Existing pattern (from `logo.jsx`): "bSmart" in `font-light text-neutral-600`, "Works" in
`font-bold text-brand-navy`.

### Spacing & Radius
- Spacing: Tailwind scale only (4px grid). No arbitrary values like `p-[13px]`.
- Radius tokens (verified): `sm 4px` · `DEFAULT/md 8px` · `lg 12px` · `xl 16px`.
- Transition: `duration-[120ms]` is the house default (see `button.jsx`).

### Components (Current Reality — only 3 exist)
The component library lives in `works-frontend/src/components/works/`. **Currently:**
`Button` (`button.jsx`, cva variants: primary/secondary/ghost/danger/action/link),
`Logo` (`logo.jsx`), `StatusBadge` (`status-badge.jsx`).

When adding components: follow the `button.jsx` pattern (cva + `cn()`), use token classes only,
and add to this folder. The brand doc defines a target inventory — build toward it incrementally;
do not assume a 30-component library already exists.

### Logo Usage (assets in `works-frontend/public/`)
- `logo-primary.svg` — light backgrounds   · `logo-reverse.svg` — navy/dark backgrounds
- `logo-mono.svg` — single-color/print      · `logo-icon.svg` — favicon/avatar/small (≥24px)

Use the `<Logo>` component or reference `/logo-*.svg`. Never distort or recolor the logo.

### UI Tone
Operational, not playful. Information density is a feature. Same navigation, shortcuts, and
interaction patterns everywhere. Empty states explain why + next step. Errors say what went
wrong + what to do.

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

- Don't add features, abstractions, or generalization beyond the task.
- Don't create capability-specific auth, data models, or UI patterns. One of each, unified.
- Don't put raw hex, px, or font names in components — use token classes.
- Don't change DB schema without a Flyway migration (next is `V20`).
- Don't use singular table names — the convention is plural (`work_items`, `users`).
- Don't create `com.bcits.works.*` packages yet — match existing `com.example.demo`.
- Don't put RBAC logic in controllers.
- Don't make AI calls from the frontend.
- Don't assume the 30-component library exists — only Button, Logo, StatusBadge do.
- Don't add error handling for scenarios that cannot happen.
- Don't write comments describing WHAT the code does — only WHY, and only when non-obvious.
- Don't implement iteration N+1 features while iteration N is in scope.

---

## 7. Definition of Done (Every PR)

- [ ] New endpoints have `@Valid` DTO validation, under `/api/v1/`, plural kebab path
- [ ] New tables/columns have a Flyway migration (`V20+`), plural table names
- [ ] RBAC check in service layer (not controller)
- [ ] Errors use the standard `{ code, message, field? }` shape
- [ ] No raw hex/px/font in frontend — token classes only (`brand-*`, `neutral-*`, `semantic-*`)
- [ ] New components follow the `button.jsx` cva + `cn()` pattern
- [ ] AI features have documented fallback behavior
- [ ] New code added to `com.example.demo` (no new top-level packages without a rename plan)

---

*Verified against the codebase on 2026-05-31. Source specs: Capability Map v3.5, Complete
Iteration Guide, Tech Stack & Architecture, Brand & Identity (bSmart Works master package).
Where spec and code conflict, code is canonical and the conflict is flagged ⚠️.*
