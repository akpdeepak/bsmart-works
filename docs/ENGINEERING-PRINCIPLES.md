# bSmart Works — Engineering Principles

End-to-end development practices across three lenses: **Product**, **Developer**, and
**Architecture**. This is the human-facing companion to [`CLAUDE.md`](../CLAUDE.md) (the
machine-facing rules every AI tool reads). Where this document states a rule, CLAUDE.md
encodes it for tools and the automation in §4 enforces it.

> **The one-line philosophy:** *One product, one data model, one design system, one set of
> rules — enforced by machines, not memory.* Consistency that depends on people remembering
> is consistency that decays. Everything here is wired to a check that fails the build.

---

## 1. Product Principles

How we decide *what* to build and *whether* it earns its place.

### 1.1 Every feature earns its place
The v3.5 capability map added exactly three things and said no to the rest. Copy that
discipline. A feature ships only if it closes a specific product or architectural gap — not
because it's interesting. When in doubt, cut it.

### 1.2 Build to the active iteration, not the roadmap
There are 20 iterations. Working ahead is the most expensive mistake on this project: it
creates half-built surfaces that block the iterations underneath them. Confirm the active
iteration before starting. **Do not build iteration N+1 while N is in scope.**

### 1.3 Defaults for the 80%, customization for the 20%
The product ships opinionated defaults that work for most teams out of the box. Customization
is a deliberate, separate layer — never the price of entry. If a new user must configure
something to get value, the default is wrong.

### 1.4 AI is opt-in and always has a fallback
Every AI feature must answer: *"What happens when AI is off, over budget, or unavailable?"*
The deterministic fallback is part of the feature, not an afterthought. AI can be toggled at
workspace / capability / user / context scope. No AI feature ships without its fallback documented.

### 1.5 Honest software
Information density is a feature, not a flaw. Don't hide complexity behind oversimplified UI.
Empty states explain *why* they're empty and *what to do next*. Errors say *what went wrong*
and *what to do about it*. Privacy is enforced at the API, not just hidden in the UI.

### 1.6 Compliance and audit are first-class
Compliance rules, SLA violations, and the audit trail are core data, not bolt-ons. This is why
we event-source from day one (§3.2). If a change can't be reconstructed and audited, it isn't done.

---

## 2. Developer Principles

How we write code so any developer — or AI tool — produces the same shape.

### 2.1 One job per layer
| Layer | Does | Never does |
|-------|------|------------|
| Controller | Parse HTTP, call service, return response | Business logic, RBAC, DB access |
| Service | Business logic + authorization (`RbacService`) | HTTP concerns, raw SQL in controllers |
| Repository | Data access (Spring Data JPA) | Business decisions |
| React component | Render one responsibility | Inline HTTP, raw styling values |
| `apiClient` | All HTTP + error-shape parsing | UI rendering |

When a file starts doing two jobs, split it before it grows.

### 2.2 Tokens, not literals
No raw hex, pixel, or font value ever appears in a component. Use the design tokens:
`brand-navy`, `brand-orange`, `neutral-600`, `semantic-danger`. This is lint-enforced
(`bg-[#0B2F5C]`, `p-[15px]`, and `works-*` names all fail). The token set is the contract;
arbitrary values break theming, dark mode, and white-label.

### 2.3 One way to do each thing
- One HTTP path: the `apiClient` wrapper. No inline `fetch`/`axios`.
- One error shape: `{ code, message, field? }` via a single `@ControllerAdvice`.
- One component pattern: `cva` + `cn()` (see `button.jsx`). New components follow it.
- One migration path: Flyway. Never touch the schema by hand.

Sameness is the point — it's what lets a developer (or AI) drop into any file and recognize it.

### 2.4 Validate at the boundary
Every incoming DTO is `@Valid`. Trust nothing from the client. Validation lives at the edge so
the service layer can assume clean input.

### 2.5 Scope discipline
Change what the task needs and nothing more. No speculative abstractions, no "while I'm here"
refactors riding along in a feature PR, no error handling for cases that can't occur. Out-of-scope
improvements get their own issue/PR.

### 2.6 Comments explain *why*, not *what*
The code says what it does. A comment justifies a non-obvious decision. If the code needs a
comment to be understood, prefer making the code clearer first.

### 2.7 Tests prove behavior
JUnit 5 + Testcontainers for the backend (real Postgres, not mocks, for anything touching the
DB). A change isn't done until its behavior is demonstrated — by a test, or by running the app.

---

## 3. Architecture Principles

The structural decisions that compound. Made once at iteration 1, paid back every iteration after.

### 3.1 Seven unification layers — never fork them
One product means exactly one of each: **event store · identity model · query language ·
AI orchestration · customization framework · knowledge repository · UI design system.**
No capability gets its own data store, its own auth, or its own UI conventions. The moment a
feature wants its own silo, that's the smell to stop and reuse the shared layer.

### 3.2 Event-source from day one
Every state change emits an event to the append-only event table. Events are never updated or
deleted. This is what makes audit, compliance reconstruction, and time-travel debugging possible
later — and it cannot be retrofitted. The single event store is **`events`** (mapped by `AppEvent`,
written by `EventService`); the dead `event_log` table was dropped in V20.

### 3.3 Canonical vocabulary, everywhere
One concept, one name, across Java / DB / REST:
`WorkItem` ↔ `work_items` ↔ `/api/v1/work-items`. Tables are plural; REST paths are plural
kebab-case under `/api/v1/`. A rename ripples through all three or none.

### 3.4 Stateless and horizontally scalable
JWT auth carries its own state — no server-side sessions. Services hold no request state between
calls. This is what lets the app scale by adding instances rather than rearchitecting.

### 3.5 Security and privacy are enforced server-side
RBAC lives in `RbacService`, checked in the service layer — never trusted to the controller or
the UI. Manager drill-down into individuals is blocked at the API. If the only thing stopping
unauthorized access is a hidden button, it isn't stopped.

### 3.6 Align with what the team can own
The stack (Java 21 / Spring Boot / PostgreSQL / React) is chosen so BCITS can maintain it
forever. A technically fancier tool the team can't own is worth less than a solid one they can.
Don't add Kafka, a search cluster, or a new language until scale actually demands it.

### 3.7 Match reality, migrate deliberately
The spec describes a target (`com.bcits.works.*`, TypeScript, Gradle); the code is the present
(`com.bcits.works` flat — TD-001 rename complete 2026-06-08, JavaScript, Maven). Build to the
code that exists. Closing a spec-vs-code gap is its own planned migration with its own PR —
never a drive-by change inside a feature.

---

## 4. How These Are Enforced (Not Just Documented)

Principles that rely on memory decay. Each rule below is wired to a check that fails the build.

| Principle | Enforced by | When it fires |
|-----------|-------------|---------------|
| Tokens not literals (§2.2) | ESLint rules in `works-frontend/eslint.config.js` | On save, pre-commit, CI |
| No inline fetch/axios (§2.3) | ESLint `no-restricted-syntax` / `no-restricted-imports` | On save, pre-commit, CI |
| WCAG 2.1 AA a11y (§2.2) | `eslint-plugin-jsx-a11y` in `eslint.config.js` | On save, pre-commit, CI |
| Brand/arch cross-cutting rules | `scripts/guardrails.sh` (hex, `works-*`, packages, migrations, RBAC-in-controller, `gray-*`, z-index) | Pre-commit, CI |
| Java style consistency (§2.1) | Checkstyle (`works-backend/config/checkstyle/checkstyle.xml`) | `./mvnw verify`, CI |
| AI rules never drift | `scripts/generate-ai-rules.mjs --check` | Pre-commit, CI |
| DoD checklist never drifts | `scripts/check-dod-sync.sh` (version tag in CLAUDE.md + PR template must match) | Pre-commit, CI |
| Frontend behavior verified | Vitest + React Testing Library (`npm test`) | Pre-commit, CI |
| Backend logic verified | JUnit 5 + JaCoCo coverage gate (`./mvnw -B test`) | CI |
| Definition of Done (§2.5, §1.4) | `.github/pull_request_template.md` | Every PR |
| The whole gate | `.github/workflows/ci.yml` | Every push & PR — **blocks merge** |

### The single source of truth
[`CLAUDE.md`](../CLAUDE.md) is canonical. Every AI-tool rules file
(`.github/copilot-instructions.md`, `.cursor/rules/bsmart.mdc`, `.windsurfrules`, `AGENTS.md`)
is **generated** from it:

```bash
node scripts/generate-ai-rules.mjs        # regenerate after editing CLAUDE.md
node scripts/generate-ai-rules.mjs --check # CI fails if any file is stale
```

Never hand-edit the generated files. Change a rule once in CLAUDE.md, regenerate, commit.
That is how every AI tool and every teammate — regardless of login or machine — stays consistent.

### Activate the local hooks (once per clone)
```bash
npm install            # repo root — installs husky and wires the pre-commit hook
cd works-frontend && npm ci   # so the hook can lint staged files
```

### Tightening over time
Checkstyle ships in reporting mode (`failOnViolation=false`) so it doesn't break the current
baseline. Once `./mvnw checkstyle:check` is clean, flip it to `true` in `works-backend/pom.xml`
to make style violations block merges too.
