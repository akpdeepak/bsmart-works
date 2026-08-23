# bSmart Works — Master Product, UI/UX, Accessibility, UAT and Release Audit

**Audit date:** 15 August 2026  
**Scope:** `works-frontend`, `works-backend`, database migrations, CI/CD, deployment examples, tests and documented product surfaces  
**Audit mode:** code-first static implementation trace, API-contract comparison, security/tenant-boundary review, interaction-pattern inspection and test-coverage review  
**Release recommendation:** **NO-GO for production**  
**Static product-readiness score:** **51/100**  
**Runtime release confidence:** **Not established**

> This is an implementation audit, not a screenshot-only critique. The app could not be built or started in the supplied environment: frontend dependencies were absent and package downloads failed; Maven dependency resolution failed; only Java 17 runtime was present while the project requires Java 21; `javac` and Docker were unavailable. No current-run product screenshots or executable UAT evidence could therefore be captured. Visual, responsive and accessibility findings are limited to static component/style/test evidence. Every runtime result below is explicitly marked **Not run** or **Cannot verify**; none is represented as passed.

## 1. Executive decision

bSmart Works is an unusually broad platform with substantial code depth: work management, agile planning, role cockpits, knowledge authoring, service management, customer self-service, messaging, dashboards, reporting, automation, AI controls, audit/security administration and PWA scaffolding all exist. The repository also contains strong engineering foundations—versioned database migrations, optimistic work-item updates, extensive unit/integration tests, CI gates, RBAC abstractions, token revocation infrastructure, passkeys, knowledge versioning and service-customer ownership checks.

That breadth is not yet production-safe. The review confirmed eight independent P0 classes: broken email activation, client logout that does not revoke server tokens, portal logout with the same weakness, MFA secret disclosure to a third-party QR service, cross-participant exposure of internal messages, cross-customer access to support conversations, cross-tenant report list/create/schedule access, and deployment defaults that do not fail closed on production secrets and tenant controls. Unified search and AI description assist are wired to nonexistent or incompatible APIs. Offline claims are not supported by the actual save path. CORS omits `PATCH`, blocking legitimate browser mutations. The E2E suite covers only three Scrum Cockpit cases in desktop Chromium, with conditional assertions that can pass when core controls are absent.

**Decision:** do not launch externally or use for sensitive enterprise/customer data until all P0s and the release-evidence gate are closed. A controlled internal pilot can be reconsidered after Phase 0, with synthetic/non-sensitive data and security sign-off.

### Top 10 launch blockers

1. Email verification link lands on an unhandled frontend route; new accounts cannot reliably activate.
2. Internal logout clears local state but never calls the backend revocation endpoint.
3. Customer portal logout also leaves its token valid server-side.
4. MFA enrollment sends the full `otpauth` URI and secret to `api.qrserver.com`.
5. Internal direct/group conversations are readable and mutable without participant membership checks.
6. Customer support conversations are scoped only by workspace and conversation ID, not customer account/identity.
7. Reports and report schedules have cross-tenant authorization gaps on list/create/list-by-report paths.
8. Production deployment can start with known/empty security defaults; deployment preflight does not enforce required secrets.
9. No executable release evidence: build, automated tests, browser UAT, accessibility and responsive QA could not be run in the supplied environment.
10. Core promoted experiences—global search, AI description assist, offline save and browser `PATCH` flows—are broken or materially incomplete by contract trace.

### Top 10 product improvements after blockers

1. Replace the monolithic shell/prop plumbing with route-scoped loaders, feature stores and bounded modules.
2. Use a real router and encode selected item, tab, filter and modal context in shareable URLs.
3. Rebuild messaging around participant authorization, event publication, unread/read state, search, threads/replies, attachments and responsive panes.
4. Complete the service-agent workspace with request detail, customer history, notes, linking, reassignment picker, SLA timeline, search and bulk operations.
5. Make report permissions explicit (`view_reports`, `manage_reports`, owner/admin), generate artifacts for scheduled delivery and expose audit history.
6. Implement true offline-first write capture, cached read models, queued/conflict states and honest connectivity copy.
7. Consolidate global search on a versioned response contract with relevance, snippets, facets, keyboard navigation and failure states.
8. Add SSO/OIDC/SAML, session/device management, MFA recovery/disable and secure first-party QR rendering.
9. Standardize feedback states, form semantics, responsive behavior, design tokens and WCAG 2.2 AA validation.
10. Establish a release-quality matrix: Chromium/Firefox/WebKit, desktop/tablet/mobile, keyboard/screen reader, tenant isolation, degraded network, offline, conflicts and performance budgets.

## 2. Audit method and evidence limits

### 2.1 Trace method

For critical flows, the audit followed this chain:

`visible control → React state/handler → API client → HTTP method/path/payload → Spring controller → service/RBAC → repository/entity/migration → response shape → client state update → loading/success/error feedback`

Findings are based on observed code, not filenames or intended comments alone. A feature is classified as complete only when the chain is coherent in code; it remains runtime-unverified until executed.

### 2.2 Repository inventory

| Area | Static inventory | Audit interpretation |
|---|---:|---|
| Frontend source | 697 JS/JSX files; 408 production JS/JSX files | Large product surface with meaningful modular components but heavy shell concentration |
| Frontend views/components | 61 production views; 193 components | Broad product coverage |
| Frontend tests | 255 test files; 24 accessibility test files; 34 stories | Strong unit/component quantity; accessibility and runtime matrix remain narrow |
| Frontend E2E | 1 Playwright spec; 3 Chromium desktop scenarios | Insufficient release coverage |
| Backend source | 782 main Java files | Substantial domain implementation |
| Controllers/services/repositories/entities | 151 / 173 / 159 / 159 | Deep backend breadth; authorization consistency is the central risk |
| Backend tests | 274 test files | Strong quantity, but configured coverage exclusions omit major layers |
| Migrations | 128 Flyway migrations | Mature schema history; production migration defaults are unsafe |
| API surface | ~792 endpoint annotations; ~574 normalized unique paths | Enterprise-scale API; client/server contract drift is present |
| Frontend API calls | 616 literal calls; ~447 normalized shapes | High integration surface; static comparison found material mismatches |

### 2.3 Runtime attempts

| Check | Result | Consequence |
|---|---|---|
| `npm ci` | Failed: dependency downloads/DNS and cache constraints | No frontend build, lint, unit, Storybook, axe or Playwright execution |
| Maven wrapper compile/test bootstrap | Failed resolving Maven dependencies | No backend compilation or test execution |
| Java toolchain | Java 17 runtime only; project needs Java 21; no `javac` | Backend cannot be built locally |
| Docker/Compose | Docker absent | No database-backed local stack |
| Browser audit/screenshots | App could not be started | No visual-runtime or interaction confirmation |

These are environment blockers, not proof that repository tests fail. They are nevertheless a release-evidence blocker: production readiness cannot be signed off without a reproducible green run.

## 3. Architecture and flow assessment

### 3.1 What is structurally strong

- Work-item reads apply membership scoping and batch-attach tags, field values and star state, avoiding obvious per-item N+1 behavior.
- Work-item updates have version/optimistic-lock semantics; workflows and definition-of-done validation are represented.
- Knowledge includes block editing, debounced autosave, publishing, versions, diff/restore, comments, public share and presence/soft-lock concepts.
- Customer service requests are generally account-owned, and AI-generated service replies use a human-approval draft path.
- Internal and customer identities/tokens are separated. Backend logout/revocation infrastructure exists; the client simply fails to invoke it.
- WebAuthn/passkey infrastructure, security/audit views, migration history and CI workflows demonstrate serious enterprise intent.
- The shell includes a mobile drawer, command palette, role-aware navigation and deep links to major surfaces.
- Dark-mode/design-token usage is extensive, and component/story/test investment is visible.

### 3.2 Main structural constraint

`AppShell.jsx` is 2,360 lines, `BlockEditor` 2,176, `KnowledgeView` 1,545 and `RouteOutlet.jsx` 926. `RouteOutlet` destructures hundreds of fields from a single model. This makes route ownership, loading/error isolation, caching, permissions and testability difficult. It also drives shell-wide overfetch and creates a high regression radius.

### 3.3 Target architecture principle

Use route-scoped bounded contexts: each route owns its loader/query cache, mutation hooks, permission policy, error boundary and optimistic state. Shared identity/workspace/design primitives remain global; domain state does not. The frontend API layer should be generated or contract-tested from the backend schema, with one normalized error envelope and explicit pagination types.

## 4. Scorecard

### 4.1 Scoring model

The scores are static readiness estimates, not runtime certification. Each dimension was assessed from the feature statuses and findings in Sections 5–6. Overall score uses: **Functional 35%, UX 20%, UI 10%, Accessibility 10%, Mobile 10%, Enterprise 15%**. Status anchors are: complete/coherent in code 100; functional but needs polish 75; partial 50; major gaps 25; broken/missing 0. Unexecuted behavior is not promoted to “passed.”

| Module | Functional | UX | UI | Accessibility | Mobile | Enterprise | Overall |
|---|---:|---:|---:|---:|---:|---:|---:|
| Authentication & account | 35 | 45 | 72 | 45 | 50 | 30 | **42** |
| Shell, IA & navigation | 70 | 62 | 75 | 58 | 70 | 60 | **66** |
| Work management | 75 | 68 | 74 | 60 | 58 | 70 | **70** |
| Agile & Scrum | 78 | 70 | 74 | 62 | 60 | 66 | **71** |
| Knowledge & collaboration | 74 | 72 | 74 | 62 | 58 | 70 | **70** |
| Unified search & discovery | 10 | 35 | 70 | 58 | 65 | 35 | **35** |
| Messaging | 25 | 30 | 60 | 52 | 15 | 20 | **30** |
| Service desk & portal | 55 | 48 | 66 | 58 | 60 | 55 | **56** |
| Reports & dashboards | 45 | 55 | 70 | 58 | 62 | 30 | **50** |
| AI, automation & integrations | 40 | 50 | 66 | 55 | 58 | 35 | **47** |
| Admin, security & governance | 35 | 52 | 72 | 60 | 60 | 25 | **46** |
| Mobile, PWA & offline | 20 | 45 | 62 | 55 | 25 | 35 | **35** |
| Design system, accessibility & quality | 50 | 55 | 68 | 45 | 35 | 45 | **50** |
| **Portfolio average** | **47** | **53** | **69** | **56** | **52** | **44** | **51** |

### 4.2 Score traceability

| Score driver | Upward evidence | Downward evidence |
|---|---|---|
| Functional | Rich domain breadth; coherent work/knowledge/versioning paths; extensive backend services | Broken verification/search/AI assist/offline; messaging/report authorization defects; stubs |
| UX | Role-aware shell, command palette, work/knowledge depth, empty-state components | Silent failures, partial agent workspace, fragmented navigation, misleading real-time/offline/AI promises |
| UI | Design tokens, dark mode, reusable components and stories | Raw palette drift, fixed layouts, large inconsistent surfaces; no runtime visual QA |
| Accessibility | 24 axe-oriented tests and semantic primitives | Limited screen coverage; no keyboard, screen reader, zoom/reflow, contrast or device matrix evidence |
| Mobile | Mobile drawer and responsive utilities across many surfaces | 22/61 views contain no breakpoint utility; Messenger fixed panes; no mobile E2E |
| Enterprise | RBAC abstraction, migrations, audit, passkeys, revocation, tenant tests | P0 tenant/object-auth gaps; insecure production defaults; SSO absent; compliance claims not evidence-backed |

## 5. Feature status and gap matrix

Legend: 🔴 broken; 🟠 major gaps; 🟡 partial; 🟢 complete/coherent in static code; 🔵 cannot verify at runtime.

| Module | Capability | Status | Code-backed interpretation | Benchmark principle |
|---|---|---|---|---|
| Auth | Signup/email activation | 🔴 | Backend emits `/verify?token=…`; frontend does not route or consume it | Activation is a tested, recoverable end-to-end journey |
| Auth | Password login/reset | 🟡 | Main APIs and reset route exist; runtime/email delivery unverified | Clear state, secure autocomplete, recovery feedback |
| Auth | Logout/revocation | 🔴 | Backend revokes; both clients only clear local storage/state | Logout invalidates the server session immediately |
| Auth | MFA/passkeys | 🟠 | Backend depth exists; QR secret leaks externally; recovery/disable/session UX absent | First-party provisioning and lifecycle management |
| Auth | SSO | 🔴 | Visible controls are disabled “coming soon” | Enterprise IdP, domain discovery and admin enforcement |
| Shell | Role-aware navigation | 🟢 / 🔵 | Implemented with mobile drawer, More menu and role lenses; not run | Progressive disclosure without duplicate destinations |
| Shell | URL/deep-link state | 🟡 | Top-level routes exist; selected item/tab/filter are not encoded | Shareable, restorable application state |
| Work | CRUD, workflow, custom fields | 🟢 / 🔵 | Broad coherent static implementation with RBAC/versioning | Fast create/edit with explicit project context |
| Work | Board/backlog/sprints | 🟡 | Rich implementation; first-page board and hard-coded project fallbacks | Full-dataset integrity and visible scope |
| Work | Offline/conflicts | 🔴 | Queue exists but normal edits never enter it | Honest offline state and durable queued mutations |
| Knowledge | Author/version/publish | 🟢 / 🔵 | Strong editor/autosave/version/diff/restore concepts | Notion/Confluence-grade recoverability and status |
| Knowledge | PATCH mutations | 🔴 in cross-origin browser | Backend/client use PATCH but CORS allow-list omits it | Every supported method passes preflight |
| Search | Unified work + knowledge | 🔴 | Client expects wrong response shapes and calls missing path | One typed contract with relevance/snippets/facets |
| Messaging | Conversation privacy | 🔴 | Workspace permission substitutes for participant authorization | Slack/Teams-style object membership on every operation |
| Messaging | Real-time and message fidelity | 🔴 | Send path publishes no chat event; reactions/names not persisted in response shape | Event-driven updates, stable message DTO |
| Messaging | Collaboration UX | 🟠 | No search/thread/edit/delete/typing/unread/settings; attachment disabled | Complete conversation lifecycle and responsive split view |
| Service | Customer request ownership | 🟢 / 🔵 | Owned-request service paths exist | Customer isolation at service and repository layers |
| Service | Support chat isolation | 🔴 | Conversation lookup omits customer/account check | Object-level customer authorization |
| Service | Agent console | 🟠 | Queue/transition summary exists; detail and operating tools are sparse | ServiceNow/JSM-style queue-to-resolution workspace |
| Portal | Self-service + KB | 🟡 | Functional breadth exists; errors collapse to empty and search is shallow | Trustworthy failures, contextual knowledge deflection |
| Reports | Builder/templates/schedules | 🟡 | Rich UI and CRUD exist; authorization and delivery semantics are unsafe/incomplete | Explicit ownership, generated artifact, audit trail |
| AI | Control plane | 🟡 / 🔵 | Many governed endpoints exist; work-item assist calls missing endpoints | Capability discovery must match every visible affordance |
| Integrations | Calendar | 🔴 | Provider methods return empty/synthetic data | Real OAuth sync with provenance and error states |
| Admin | Security/compliance | 🟠 | Rich surfaces; evidence bundles contain hard-coded/unverified claims | Controls report measured state, not marketing assertions |
| PWA | Install/shell caching | 🟡 / 🔵 | Service worker/scaffolding exists; data/offline behavior incomplete | Offline contract covers both reads and writes |
| Quality | Unit/integration/CI | 🟢 / 🔵 | High test count and CI definitions; could not execute | Reproducible green pipeline on supported toolchain |
| Quality | E2E/browser/device | 🔴 | Three conditional Scrum tests, Chromium desktop only | Critical-journey and risk-based cross-browser matrix |

## 6. Master audit register

Severity: **P0** release/security blocker; **P1** major journey/enterprise defect; **P2** important usability/quality debt; **P3** minor improvement or strength to preserve.

| ID | Module | Screen/Flow | Feature | Current State | Finding | Type | Severity P0-P3 | User Impact | Missing/Partial Requirement | Recommended Solution | UX Pattern | Benchmark Principle | Backend Change | Frontend Change | Acceptance Criteria | Evidence |
|---|---|---|---|---|---|---|---|---|---|---|---|---|---|---|---|---|
| AUTH-01 | Auth | Signup → email → activation | Email verification | Broken | Email points to `/verify`, but the public router does not recognize it and AuthScreens only parses reset-password | Functional | P0 | New users cannot activate accounts | Routed verification state and token consumption | Add public VerifyEmail route with pending/success/expired/retry states | Guided activation | Activation is one tested journey | Keep token validation; add resend/rate limit if absent | Route `/verify`, call `/auth/verify`, remove dev-only coupling | Valid link activates once; invalid/expired shows recovery; login works after activation | `AuthController.java:86-130`; `AuthScreens.jsx`; `AppShell.jsx:1591-1593` |
| AUTH-02 | Auth | Internal sign out | Token revocation | Broken | Client clears user/local storage but never calls `/auth/logout`, although backend blocklists the JTI | Security | P0 | Retained/stolen token remains usable until expiry | Server-side logout invocation | POST logout before local teardown; clear locally even if network fails; record failure telemetry | Secure sign-out | Logout revokes the active session | Existing endpoint retained; test JTI rejection | Call endpoint and show non-blocking completion | After sign-out, replaying the token returns 401; local state is cleared | `AppShell.jsx:748-752`; `AuthController.java:249+` |
| AUTH-03 | Portal | Customer sign out | Portal token revocation | Broken | Portal only removes `PORTAL_KEY` and session state | Security | P0 | Customer token remains valid after sign-out | Portal revocation call | Invoke portal logout/revoke endpoint, then clear client state | Secure sign-out | All identity surfaces use the same revocation guarantee | Verify endpoint invalidates the correct portal token scope | Call endpoint from `logout` | Replayed portal token is rejected after sign-out | `CustomerPortal.jsx:210`; portal auth controller logout endpoint |
| AUTH-04 | Auth/Account | MFA enrollment | QR provisioning | Unsafe | Full `otpAuthUri`, including TOTP secret, is sent in a query string to `api.qrserver.com` | Security/Privacy | P0 | Third party or logs can capture MFA seed and generate valid codes | First-party QR rendering | Render QR locally from the URI; never transmit it off origin; rotate exposed enrollment secrets | First-party secret provisioning | Secrets never leave trusted boundary | Allow reissue/invalidate enrollment seed | Use audited local QR library/canvas; redact URI from telemetry | Network trace contains no TOTP URI/secret; reissued setup invalidates old seed | `account-view.jsx:65` |
| AUTH-05 | Auth | Enterprise login | SSO | Missing but promoted | Provider and SAML buttons are disabled and labeled “coming soon” | Enterprise/Functional | P1 | Enterprise prospects cannot use mandated IdP login | OIDC/SAML, domain discovery, enforcement, JIT/SCIM policy | Hide until available or implement end-to-end with admin setup/test | Progressive capability disclosure | Never promote unavailable auth paths | Add IdP config, callback, enforcement, audit | Add enabled state, domain routing, errors and fallback policy | Configured IdP login/logout works; admin can test and enforce; unavailable paths are not shown | `AuthScreens.jsx:337-347` |
| AUTH-06 | Account | Security settings | Password/session/MFA lifecycle | Partial | Backend supports password change, but account UI lacks it; active sessions, device revocation, MFA disable/recovery are absent | Functional/Enterprise | P1 | Users cannot fully secure or recover accounts | Complete security lifecycle | Add password change, session/device list/revoke, MFA recovery/disable and recent-security events | Security center | Users can inspect and terminate credentials | Add session inventory/revoke and recovery-code lifecycle | Add accessible settings flows and confirmations | User can change password, revoke one/all sessions, recover or disable MFA with step-up auth | `AuthController.java:229+`; `account-view.jsx` |
| AUTH-07 | Auth | Login/recovery/MFA forms | Form semantics | Partial | MFA input lacks robust label/autocomplete; forgot email relies on placeholder; password visibility control is removed from keyboard tab order | Accessibility | P2 | Keyboard and assistive-tech users lose context/control | Labels, descriptions, autocomplete, keyboard access, errors | Use associated labels, `aria-describedby`, correct autocomplete, keyboard-operable reveal button | Accessible form | WCAG 2.2 AA form semantics | Normalize field-error envelope if needed | Fix labels, focus, live errors and reveal control | Axe plus keyboard/screen-reader checks pass; errors are announced and focus is retained | `AuthScreens.jsx` static form inspection |
| AUTH-08 | Auth/Realtime | All authenticated use | Token storage and SSE auth | Risky | JWTs live in localStorage; realtime JWT is placed in an `access_token` query parameter | Security | P1 | XSS or URL/log leakage increases account compromise blast radius | Safer browser session model and scoped realtime ticket | Prefer secure HttpOnly/SameSite cookies or short-lived memory token; mint one-use SSE ticket | Short-lived delegated token | Bearer credentials do not persist in URLs/storage unnecessarily | Add cookie/session or ephemeral SSE-ticket endpoint | Remove long-lived JWT from EventSource URL/localStorage | Browser history/logs contain no long-lived JWT; XSS cannot read session credential | `lib/realtime.js:15-24`; `SecurityConfig.java:170-177`; API client storage |
| AUTH-09 | Auth | MFA/verification/recovery | Small-screen layout | Partial | Fixed widths such as `w-96` risk overflow on narrow devices | Mobile/UI | P2 | Auth becomes clipped or horizontally scrollable | Reflow down to 320 CSS px and zoom | Use `w-full max-w-sm`, safe gutters and long-error wrapping | Responsive auth card | WCAG reflow; mobile-first forms | None | Replace fixed width and test long localization/error states | No horizontal scroll at 320 px/400% zoom; tap targets meet minimum | `AuthScreens.jsx` Tailwind inspection |
| NAV-01 | Shell | Application startup | Data loading | Overfetched | Shell startup issues 12+ broad calls, plus dashboard/release calls, before route-specific needs are known | Performance/UX | P1 | Slow time-to-use; many failure points; mobile bandwidth cost | Route-scoped data dependencies and progressive rendering | Move to query cache and loaders per route; prefetch only likely next data | App shell + route loaders | Shell loads identity/navigation; route loads domain data | Support batch/bootstrap endpoint only for stable global context | Introduce route loaders, skeleton/error boundaries | Shell interactive quickly; unopened modules issue no data calls; failures isolate by route | `AppShell.jsx:602-651` and initial effects |
| NAV-02 | Shell | Deep linking/back/refresh | Router state | Partial | Hand-rolled router intentionally omits selected item/tab/filter sub-state | UX/Functional | P2 | Links cannot reproduce context; refresh/back loses work state | URL-addressable nested state | Adopt a tested router; define routes for detail/tab/filter; preserve unsaved-draft guard | Stateful deep link | Shareable/restorable work context | Stable resource IDs and filter serialization | Router migration with route-level boundaries | Copying URL reproduces current workspace/screen/item/tab/filter; back works predictably | `lib/routes.js` header comment; route tables |
| NAV-03 | Shell | Primary navigation | IA density | Functional, complex | Six modes, More menu, satellites and role cockpits create overlapping destinations and cognitive load | UX/IA | P2 | Users struggle to form a stable mental model | Role/task-based IA with consistent object locations | Consolidate around Work, Knowledge, Service, Insights, Admin; personalize shortcuts, not taxonomy | Progressive disclosure | One canonical home per object/task | None | Rationalize labels/order and preserve commands | Tree test ≥80% correct destination for top tasks; no duplicate canonical routes | `sidebar-nav.jsx`; `AppShell.jsx` navigation model |
| NAV-04 | Shell | Projects route/list | Label consistency | Inconsistent | A project-related route/surface is labeled “Teams,” blurring project vs team concepts | UX/Content | P3 | Misnavigation and wrong expectations | Stable domain vocabulary | Define project/team glossary and audit labels/routes/breadcrumbs | Consistent noun model | Same object has same name everywhere | Align API names only if domain model changes | Rename label and add migration-safe redirect if needed | Users can distinguish project container from team membership in tests | Route/view label inspection |
| NAV-05 | Shell | Unknown authenticated URL | Not-found recovery | Missing | Unrecognized paths fall to another view rather than a dedicated 404/recovery state | Functional/UX | P2 | Broken links appear to succeed and disorient users | Explicit not-found/forbidden states | Add authenticated 404 with safe destinations and telemetry | Recoverable routing | Never silently redirect invalid resource context | Return typed 404/403 consistently | Route error boundary and not-found page | Invalid route shows clear 404; foreign object shows non-disclosing 404/403 policy | Router switch/default inspection |
| NAV-06 | Shell | Route rendering | State ownership | High-risk | `RouteOutlet` receives/destructures hundreds of values; `AppShell` is 2,360 lines | Maintainability/Reliability | P1 | Small changes can regress unrelated modules; slow delivery | Bounded feature modules | Extract route models/hooks, permission policies and error boundaries; enforce complexity budgets | Route composition | Local state and effects live with owning feature | Create typed facade/BFF contracts as needed | Split shell/outlet; lazy-load features | No route needs giant shared model; route tests mount with small contracts; file complexity gate passes | `AppShell.jsx` LOC; `RouteOutlet.jsx:25`, 926 LOC |
| WORK-01 | Work | Create/quick add | Project selection | Unsafe default | Create uses selected project or first project, then literal `PROJ-WORKS`; quick add always first project/fallback | Functional/UX | P1 | Items can be created in the wrong project or fail in empty workspaces | Explicit visible project context | Require project selection when ambiguous; remember recent valid project; support empty-workspace onboarding | Contextual creation | Destructive/lasting context is never silently guessed | Reject inaccessible/missing project with typed validation | Show project in composer; disable submit until valid | No create request uses synthetic fallback; multi-project user confirms visible target | `AppShell.jsx:755-779` |
| WORK-02 | Work | Board/list/bulk/drag | Pagination | Partial | Board loads the default first page and warns when total exceeds loaded; operations see only partial data | Functional | P1 | Users miss items and make decisions on incomplete board | Full-dataset pagination/infinite loading and scoped actions | Cursor/page loading per column or virtualized complete query; clearly scope bulk actions | Progressive collection loading | Collection completeness is explicit | Add board-optimized/cursor endpoint if needed | Infinite/virtualized load with count and retry | All matching items become reachable; filters/counts/actions remain correct beyond 50 | Work-item list response + board warning/load logic |
| WORK-03 | Work/PWA | Edit while offline → reconnect | Offline queue | Broken | Queue/sync code exists, but normal edits do not call `queueDraft`; only conflict resolution requeues | Reliability/UX | P1 | “Saved offline” promise is false; edits fail or are lost | Capture every supported offline mutation and expose state | Route mutations through offline-aware command queue; cache read model; show queued/sync/conflict states | Offline outbox | Offline claims match durable behavior | Idempotency keys, sync contract and conflict DTO | Queue on edit/create; pending badges; retry/cancel | Offline edit survives reload and syncs once; conflict is deterministic; unsupported actions are disabled honestly | `AppShell.jsx:1665-1683`; `lib/offline.js`; `offline-banner.jsx` |
| WORK-04 | Agile | Sprint load/create/metrics | Workspace project scope | Unsafe default | Multiple sprint paths default or submit literal `PROJ-WORKS` | Functional | P1 | Sprint data can be wrong or operations fail outside seeded project | Active project required in all agile flows | Centralize project context; remove magic ID; enforce route/project invariant | Scoped workspace | Every mutation carries explicit visible scope | Validate project membership and project/workspace relation | Disable actions until valid project selected | No production request contains `PROJ-WORKS`; switching project refreshes all sprint panels | `AppShell.jsx:993-999,1416` |
| WORK-05 | Work | Update/transition | Concurrency and DoD | Strong, runtime unverified | Version/optimistic locking and transition/DoD checks are represented | Functional/Reliability | P3 | Protects users from silent overwrite and invalid completion | Preserve and surface conflict causality | Keep server-authoritative versioning; show field-level conflict comparison | Optimistic concurrency | Never silently overwrite concurrent edits | Maintain version requirement and typed 409 | Clear conflict resolver with keep mine/server/manual merge | Two-user edit produces 409 and understandable resolution; DoD failures identify unmet rules | Work-item update/service/version code; conflict components |
| WORK-06 | Projects | Project list | KPI loading | Inefficient | One `/kpi/project` call is launched per project | Performance | P2 | Slow/noisy for large portfolios; rate-limit pressure | Batched portfolio metrics | Add batch aggregate endpoint or include summary in project list | Bulk read model | Avoid client N+1 calls | Add workspace/project-ID batch KPI endpoint | One request and per-card skeleton/error | 100 projects require O(1) KPI requests; partial metric failure does not blank list | `AppShell.jsx:655+` |
| KNOW-01 | Knowledge/Comments | Edit home article/block comments | Browser PATCH | Broken cross-origin | Client/backend use PATCH, but CORS allows only GET/POST/PUT/DELETE/OPTIONS | Functional/Platform | P1 | Legitimate browser edits fail at preflight in cross-origin deployment | All supported HTTP verbs in CORS policy | Add PATCH; derive allow-list from API needs; add preflight integration tests | Consistent mutation transport | Browser and API method contracts agree | Update CORS config/tests | Preserve PATCH calls and show typed failure | OPTIONS preflight permits PATCH from configured origins; mutation succeeds end-to-end | `SecurityConfig.java` CORS block; `@PatchMapping` scan |
| KNOW-02 | Knowledge | Author → autosave → version → publish | Editorial lifecycle | Strong, runtime unverified | Block editor, 900 ms autosave, versions/diff/restore, review/publish and presence concepts exist | Functional/UX | P3 | Strong foundation for knowledge work | Preserve recoverability and explicit state | Runtime-test autosave race, navigation guard, permissions, conflicts and long documents | Recoverable editor | Users always know saved/published/version state | Maintain version/audit semantics | Add deterministic save state and failure recovery if gaps surface | No lost edits under latency; version/restore permissions enforced; status announced accessibly | Knowledge view/editor/services static trace |
| KNOW-03 | Search | Global search | Work/article contract | Broken | Client expects `{content,totalElements}` from both; work endpoint returns raw list + headers, and `/knowledge/search` does not exist (`/articles/search` does) | Functional | P1 | Valid results appear as “No results”; failures are silently hidden | One versioned search response | Add unified search endpoint or normalize adapters; reject malformed payload; surface partial errors | Federated search | Relevance with transparent partial failure | Return typed grouped hits, totals, snippets and cursor | Call correct path; parse each contract; show loading/error/empty separately | Known work item/article query returns both; one-source failure is visible; keyboard works | `lib/search.js:15-20`; `ArticleSearchController.java`; work-item read controller |
| KNOW-04 | Knowledge | Public share/embed | External reading | Implemented in code, unverified | Public routes recognize share/embed patterns, but no live security/caching/revocation test was possible | Security/UX | P2 | External sharing could leak or break without runtime proof | Expiry/revocation, no-index, least data, clear external state | Add E2E for valid/expired/revoked/foreign links and cache headers | Capability link | Share links are scoped, expiring and revocable | Enforce token scope/expiry and safe DTO | Branded error/recovery and copy-link feedback | Revoked/expired link never serves content; public DTO omits private metadata | `PublicRoutes.jsx`; public share controllers/services |
| MSG-01 | Messaging | Conversation list/detail/send | Participant authorization | Broken | Workspace `work_read/work_write` checks replace participant membership checks; list exposes all non-support workspace conversations | Security/Privacy | P0 | Unrelated workspace members can read direct/group messages and mutate conversations | Object-level participant authorization on every read/write | Central `requireParticipant`/`requireConversationAdmin`; list only caller membership; non-disclosing 404 | Private collaboration | Workspace membership never grants private-message access | Participant-scoped repository queries and service guard | Handle 404/removed state | Non-participant cannot list/get/send/react/read/pin/summarize; participant can; audited tests cover every endpoint | `InternalMessagingController.java:89-350` |
| MSG-02 | Messaging | Create/add/remove participants | Membership validation | Broken/unsafe | Creator is not reliably added; arbitrary user IDs can be added/removed without workspace-membership validation | Security/Functional | P0 | Conversation can be orphaned or include foreign/nonexistent principals | Creator membership, workspace validation, role rules | Service owns participant mutations; validate workspace member; protect last admin/creator | Safe group lifecycle | Membership changes are authorized and invariant-safe | Add transactional conversation service and constraints | Replace raw ID entry with member picker | Creator is participant/admin; foreign ID rejected; last admin cannot be removed; events audited | `InternalMessagingController.java:98-210` |
| MSG-03 | Messaging | Send → receiver update | Realtime delivery | Broken | Frontend subscribes to chat events, but send controller publishes no realtime chat event | Functional/UX | P1 | Receivers do not see new messages until refresh/reload | Event publication and reconnect/backfill | Publish after committed write; sequence IDs; resume/backfill after reconnect | Event-driven chat | New message appears promptly and exactly once | Emit scoped event/outbox; authorize subscription | Merge/dedupe events; reconnect and unread state | Two sessions receive message within target; reconnect recovers missed messages without duplicates | `InternalMessagingController.sendMessage`; realtime client subscription |
| MSG-04 | Messaging | Reload/reactions/names | Message DTO | Broken/partial | Backend messages lack frontend-consumed `reactions` and `senderName`; UI does not call mark-read/remove/pin APIs comprehensively | Functional | P1 | Names degrade to “Team member”; reactions/pins/read state disappear or are one-way | Stable conversation DTO and complete commands | Introduce message DTO with sender/reactions/read/pin; contract-test it | Stable message model | Reload preserves all visible semantics | Query aggregates/batches related state | Consume DTO; wire add/remove/read/pin | Reload produces identical names/reactions/pins; read/unread updates accurately | `InternalMessagingController.java`; `messenger-view.jsx` |
| MSG-05 | Messaging | Daily collaboration | Search/threads/edit/delete/typing/unread/files | Major gaps | Expected conversation capabilities are absent; attachment control is explicitly disabled | Functional/UX | P2 | Messaging cannot replace enterprise chat workflow | Prioritized collaboration roadmap | Build unread first, then search/reply/edit/delete/files/typing/settings with retention policy | Incremental chat maturity | Core chat lifecycle before AI extras | Add indexed search, attachment policy, edit/delete audit | Add discoverable controls, states and keyboard flows | User can find, reply, edit/delete per policy, attach allowed file, navigate unread | `messenger-view.jsx:773`; controller surface scan |
| MSG-06 | Messaging | Add participant | People picker | Poor | Uses `window.prompt` asking for raw user ID | UX/Accessibility | P2 | Users cannot discover people and may enter invalid IDs; browser modal is inaccessible/inconsistent | Searchable workspace member picker | Combobox with name/email/avatar, selected chips and permission explanation | People picker | Never expose internal IDs as primary input | Member search endpoint can be reused/batched | Replace prompt with accessible dialog/combobox | Keyboard can search/select; invalid/foreign principals never submit | `messenger-view.jsx:841` |
| MSG-07 | Messaging | Mobile conversation | Responsive split view | Broken/major gap | Fixed `w-72` conversation rail plus optional participant rail; no responsive breakpoint behavior in view | Mobile/UI | P1 | Chat is cramped/clipped on phones | Single-pane mobile navigation with back transition | Use responsive master-detail; collapse secondary rail; retain draft/scroll | Responsive master-detail | One primary task per small viewport | None | Breakpoint state and mobile toolbar | 320–428 px supports list→conversation→details without horizontal scroll; composer remains visible | `messenger-view.jsx:471` and breakpoint scan |
| MSG-08 | Messaging | Load/actions | Error feedback | Weak | Numerous catches are empty or reduce failures to stale/empty data | Reliability/UX | P2 | Users cannot distinguish no data, permission loss or outage | Typed error state with retry and telemetry | Central query/mutation hooks; inline retry; non-destructive toast for action failure | Honest state | Empty, error and permission are distinct | Standard error envelope | Remove swallowed catches; retain user input on retry | Simulated 401/403/404/500/offline each produces correct recoverable UI | Messenger and repository-wide empty-catch scan |
| SERV-01 | Service/Portal | Customer support conversation | Customer object authorization | Broken | Portal service loads a conversation by workspace + ID but does not verify account/customer ownership | Security/Privacy | P0 | One customer can read or post to another customer’s conversation if ID is known/guessed | Account/customer predicate on every conversation operation | Load by workspace + conversation + account/customer; return non-disclosing 404; add adversarial tests | Tenant object isolation | Identity, tenant and object ownership all match | Replace `loadScoped` with ownership-aware query/guard | Handle 404 without leaking object existence | Customer A cannot get/post to B’s conversation; agent path remains authorized | `SupportChatPortalController.java`; `SupportChatService.java:483-486` |
| SERV-02 | Service | Queue → request detail → resolution | Agent workspace | Major gaps | UI exposes queue summaries and a few transitions, but lacks rich detail, customer context, comments, link-to-work, priority editing, reassignment picker, search, pagination and bulk actions | Functional/UX | P1 | Agents context-switch and cannot efficiently resolve requests | End-to-end operating console | Create split queue/detail workspace with SLA timeline, customer history and complete commands | Queue-to-resolution console | ServiceNow/JSM-style contextual resolution | Reuse existing link/edit/assign/transition APIs; fill missing reads | Add detail drawer/page, filters, bulk and guarded actions | Agent can triage, inspect history, comment, link, assign, reprioritize and resolve without leaving console | `service-view.jsx`; service controllers compared to visible actions |
| SERV-03 | Service | Assign request | Assignee validation | Unsafe | Assignment accepts arbitrary assignee ID without validating workspace membership/role | Security/Data integrity | P1 | Requests can point to invalid/foreign users; notifications/audit become unreliable | Valid eligible-assignee policy | Validate workspace membership and service role; expose eligible assignees endpoint | Guarded people picker | Assignment targets are discoverable and authorized | Add service-layer predicate and integrity tests | Use eligible member picker; remove raw IDs | Foreign/nonmember ID rejected; eligible agent assign succeeds and is audited | Service assignment controller/service static trace |
| SERV-04 | Portal | Dashboard/requests/types/KB/detail | Loading/error/empty | Broken trust states | Fetch failures are swallowed into defaults or empty lists | Reliability/UX | P1 | Customers believe they have no requests/content when service is unavailable | Separate loading, empty, offline, forbidden and error states | Route-level error boundary, inline retry, status/support reference | Honest self-service | Never present outage as “nothing here” | Standard portal error envelope/correlation ID | Preserve last good data and show retry | Forced 500/offline shows error with retry; genuine empty remains distinct | `CustomerPortal.jsx` promise/catch paths |
| SERV-05 | Portal | Customer chat/AI | Promise vs behavior | Misleading | Copy says assistant answers instantly, while AI output is stored as a pending draft for human approval; no immediate customer-visible answer in that path | UX/Trust | P1 | Customer waits under false expectation and may duplicate requests | Honest automation disclosure and visible queue status | Change copy to “AI-assisted support”; send immediate acknowledgement and status; define response SLA | Expectation setting | Automation claims reflect actual human-in-loop behavior | Return explicit response mode/status and ETA | Render acknowledgement/pending state, not silent wait | When AI draft is pending, customer sees truthful acknowledgement and next step; no “instant” promise | Portal chat copy; `SupportChatService` AI draft path |
| SERV-06 | Portal | Support chat | Realtime | Partial | “Real-time” experience polls about every eight seconds | UX/Performance | P2 | Delayed replies, battery/network waste and inconsistent presence | Push or honest polling semantics | Use authenticated SSE/WebSocket with reconnect/backfill, or call it periodic refresh | Realtime conversation | Realtime has measurable latency and reconnect behavior | Publish customer-scoped events | Subscribe/dedupe and show connection state | New message appears within SLO without fixed polling; reconnect backfills exactly once | `CustomerPortal.jsx` polling effect |
| SERV-07 | Portal/Knowledge | KB search | Search quality | Partial | Portal search is primarily title-based with limited relevance/snippets/facets | UX/Functional | P2 | Customers fail to deflect tickets even when answers exist | Full-text relevance and contextual suggestions | Search body/title/tags; highlight snippets; suggest during request composition | Knowledge deflection | Search reduces effort before ticket creation | Indexed FTS with safe public visibility predicates | Search results with snippets, filters and no-result guidance | Body-term query returns relevant permitted article; private content never appears | Portal KB controller/repository query inspection |
| REP-01 | Reports | List/create | Workspace authorization | Broken | List trusts caller-supplied `workspaceId` without RBAC; create saves caller-supplied workspace without membership check | Security/Tenant | P0 | Authenticated user can enumerate or create reports in another workspace | Membership/RBAC at controller/service boundary | Require `view_reports` for list and `manage_reports` for create; derive/validate workspace; centralize policy | Tenant-scoped collection | Every tenant collection query binds caller membership | Add scoped service/repository; adversarial tests for list/create | Handle 403/non-disclosing policy; do not send arbitrary inaccessible workspace | Foreign workspace list/create rejected; permitted workspace succeeds | `ReportController.java:52-81`; tenant binding default off |
| REP-02 | Reports | Update/delete | Report ownership/permission | Over-permissive | Any user with `view_items` can update or delete a report | Security/Data integrity | P1 | Basic viewers can alter/delete shared reporting assets | `view_reports` vs `manage_reports`, owner/admin policy | Define permission matrix; optimistic version/audit; prevent accidental deletion | Governed shared asset | View never implies manage/delete | Enforce owner/admin or `manage_reports`; soft delete/version | Hide/disable actions and explain permission | Viewer cannot mutate/delete; owner/admin can; concurrent edit protected; audit records actor | `ReportController.java:69-96` |
| REP-03 | Reports | Schedule manager open | Schedule metadata authorization | Broken | `GET /report-schedules?reportId=…` skips `requireReportAccess` and directly queries by report ID | Security/Tenant | P0 | Foreign report schedule recipients/cadence metadata may be exposed | Report access check before transitive child list | Call `requireReportAccess(reportId)` and owner/manage rules; cover central-filter-off case | Transitive authorization | Child access inherits verified parent scope | Add guard and repository scoping | Treat foreign as non-disclosing 404/empty per policy | Foreign report ID cannot reveal schedules; owner permitted; tests run with tenant filter off | `ReportScheduleController.java:60-64` |
| REP-04 | Reports | Scheduled delivery | Generated artifact | Partial/misnamed | Scheduler sends an in-app/email “report ready” link; it does not render or attach a snapshot/export | Functional/Trust | P1 | Recipients expect a delivered report but receive only a link to client-rendered current data | Explicit link-notification vs immutable export semantics | Rename to “scheduled reminder/link” or generate snapshot/PDF/CSV with authorization-at-run and retention | Scheduled artifact | Delivery content and time semantics are explicit | Add render/export job, immutable snapshot, failure/retry/audit if promised | Copy/config distinguishes link, attachment and export formats | Scheduled export contains expected as-of data and recipient scope; failure is visible/retriable | `ReportDeliveryScheduler.java` class comment and `deliver` |
| REP-05 | Reports | Report schedule recipients | Recipient integrity | Partial | Comma-delimited IDs are read directly; scheduler queries users by ID and builds `viewAs` links | Security/Data integrity | P1 | Foreign/invalid recipients or unsafe impersonation-like scope parameters may be created | Valid workspace recipients and server-derived scope | Normalize recipient relation table; validate membership; authorize `viewAs` server-side rather than trusting URL | Governed sharing | Recipient scope is resolved server-side | Validate recipients, permissions and report visibility at schedule/run/open | Searchable recipient picker and scope explanation | Foreign recipient rejected; link cannot elevate data with edited `viewAs`; removals reflected before next run | `ReportDeliveryScheduler.java:recipientIds/deliver`; schedule model/service |
| REP-06 | Reports | Builder/list/schedule | Runtime correctness | Rich, unverified | Builder, sections, templates and schedule manager are present but no end-to-end run was possible | Functional/UX | P2 | Export/data accuracy and save conflict behavior remain unknown | Golden-dataset validation and visual/export parity | Add deterministic report fixtures, query lineage, save/version conflict and export tests | Explainable analytics | Every number is traceable to a definition/query | Expose metric metadata/as-of/query status | Show source, filters, freshness and partial errors | Golden dataset produces exact values across builder, view and export; saved filters restore | `reportbuilder-view.jsx`; reporting controllers/services/tests |
| AI-01 | AI/Work | Suggest description/stream | API contract | Broken | Frontend calls `/ai/assist/suggest-description` and `/ai/assist/stream`; backend controller has neither; query-JWT filter only accepts realtime stream path | Functional | P1 | Visible AI assist appears inert and silently falls back | Capability discovery and versioned endpoint contract | Map UI to existing `/ai/generate` or implement endpoints; never silently mask contract errors | Graceful capability gating | Only expose AI action when supported and explain fallback | Add endpoint or capability-advertised mapping; secure stream ticket | Use correct API; explicit disabled/fallback/error state | Contract test proves path/payload/response; unsupported capability is hidden; stream authenticates safely | `lib/ai-assist.js:34,73`; `AiAssistController.java`; `SecurityConfig.java:170-177` |
| AI-02 | Integrations | Calendar | External sync | Stub | Google/Microsoft fetch returns empty; meeting creation returns synthetic ID/audit rather than provider/work persistence | Functional/Enterprise | P1 | Users believe meetings are integrated when nothing is synchronized | Real OAuth provider implementation, storage, retries and provenance | Hide/label beta until real; implement provider adapters and sync status | Connected integration | External actions have verifiable provider result | Token lifecycle, webhook/sync, meeting/work mapping, idempotency | Connection state, sync errors, source badge and retry | Provider meeting appears with stable ID; refresh/token failure recoverable; duplicate retry prevented | Calendar integration service static trace |
| AI-03 | Admin/Integrations | Custom domain verify | Domain ownership | Unsafe manual path | Background job performs DNS verification, but exposed service/API verify path can mark VERIFIED immediately without DNS proof | Security/Enterprise | P1 | An admin can create a false VERIFIED ownership record; impact depends on downstream routing/activation not evidenced here | One authoritative DNS challenge verification path | Remove bypass in production; verify challenge and propagation; audit attempts; rate limit | Verified ownership | Domain activation requires DNS proof | Make service verify execute DNS check; gate any test bypass by non-prod profile | Add challenge/status/retry UI; no surface currently found | Calling verify without DNS record never marks verified; valid record does; bypass cannot load in prod | `CustomDomainController.java:89-92`; `CustomDomainService.java:131-151`; verification job |
| AI-04 | Integrations | OAuth/webhooks/connectors | Operational readiness | Broad, unverified | Multiple integration classes exist, but no provider sandbox, webhook signature, retry/idempotency or secret-rotation run was possible | Enterprise/Reliability | P2 | Integrations may duplicate, drift or fail silently | Provider certification matrix and operational controls | Add contract/sandbox tests, webhook replay defense, DLQ, reconciliation, rotation and health UI | Observable integration | Every external side effect is idempotent and diagnosable | Provider adapters, idempotency keys, signed webhook validation, health metrics | Connection health, last sync, error/retry UI | Certified providers pass connect/sync/revoke/expiry/replay/rate-limit tests | Integration controllers/services/workflows; runtime unavailable |
| SEC-01 | Deployment/Security | Production boot/deploy | Fail-closed configuration | Broken | Known JWT default, empty encryption/blind-index secrets, test KMS values, tenant binding/rate limits off; production example and deploy preflight do not enforce the full set | Security/Enterprise | P0 | Token forgery, unrecoverable encrypted data, weak tenant controls or unthrottled abuse in production | Environment validation and secure production profile | Add startup validator that refuses production with defaults/missing secrets; secret manager; explicit prod flags; preflight checklist | Secure-by-default deploy | Production cannot start insecurely | `@Profile(prod)` validation; remove known defaults; secret rotation; enable tenant/rate policies | Deployment pipeline validates only presence/format, never logs secrets | Prod boot fails for each missing/default secret; secure config passes; rotation documented/tested | `application.properties:24-26,42,105,125,146,162,169`; `deploy/env/production.example`; deploy workflow |
| SEC-02 | Admin/Security | Compliance evidence export | Assurance accuracy | Misleading | Evidence services hard-code or infer claims such as MFA/passkey readiness, TLS 1.3, AES-256 at rest and BYOK without verifying deployed controls; “ready” can be metadata-only | Trust/Compliance | P1 | Customers/auditors can receive false assurance; legal/reputational risk | Measured evidence with provenance, time, scope and control owner | Replace claims with collected evidence or “not verified”; version bundle; reviewer sign-off; download actual artifact | Evidence provenance | Compliance UI reports observed controls, not aspiration | Build collectors/attestations and immutable bundle storage | Label status/limitations; preview source/time; require acknowledgement | Every claim links to measured/configured evidence; unavailable control is not marked ready; exported file is retrievable | Compliance/evidence services and Security Center copy |
| SEC-03 | Security | Tenant filter | Central tenant binding | Disabled by default | `tenant.filter.binding.enabled=false`; correctness depends on every controller/service remembering explicit scope | Security/Architecture | P1 | One missed guard becomes cross-tenant exposure—as reports demonstrate | Defense-in-depth tenant binding on every request/query | Enable centrally in production; use system escape hatch only for audited jobs; add tenant mutation tests | Tenant context | Secure default plus explicit exceptional scope | Bind authenticated tenant/workspace and enforce repository filters | None beyond correct workspace selection/errors | Cross-tenant test suite covers every repository/controller; filter enabled in prod; system jobs audited | `application.properties:146`; TenantScope/filter code; report counterexamples |
| SEC-04 | Security | Abuse protection | Distributed/write rate limits | Disabled by default | Distributed limiter false and write cap zero | Security/Reliability | P1 | Brute force, spam or expensive mutation abuse can overwhelm multi-node deployment | Per-identity/IP/tenant limits with shared counters and safe exceptions | Enable distributed limits in prod; tune login, invite, chat, AI, export, webhook and mutations; expose retry-after | Predictable throttling | Multi-node controls are consistent and observable | Shared limiter, policy config, metrics and bypass audit | Handle 429 with countdown/retry preservation | Load tests enforce thresholds across two nodes; `Retry-After` present; internal jobs unaffected | `application.properties:156-169` |
| SEC-05 | API | Auth/error failures | Error envelope | Inconsistent | JWT filter writes ad-hoc `{"error":…}` and may omit consistent content type/correlation fields while client supports legacy fallbacks | Platform/UX | P2 | Error handling diverges; accessibility/support messages lose context | One documented error schema | Standardize code/message/fieldErrors/correlationId/retryable; content type; contract tests | Typed recoverable error | Client never guesses error shape | Shared exception/filter writer | One error parser and mapped user messages | 400/401/403/404/409/422/429/500 all match schema without leaking secrets | JWT filter and shared exception handlers/client parser |
| SEC-06 | Database/Deploy | Migration startup | Flyway safety | Unsafe production defaults | Repair-on-migrate true, validation false and out-of-order true | Reliability/Enterprise | P1 | Drift can be hidden or migrations applied unexpectedly | Strict validation and explicit recovery runbook | In prod: validate true, repair false, out-of-order false; backup/dry-run/rollback gates | Controlled schema change | Drift blocks deploy and repair is deliberate | Profile-specific Flyway config and migration verification | Pipeline preflight/migration status | Tampered checksum blocks release; repair requires explicit audited operation; rollback/restore rehearsed | `application.properties:22-26` |
| SEC-07 | Deployment | Antivirus/network config | Environment portability | Brittle | Default ClamAV target includes a hard-coded WSL-style host assumption | Reliability | P2 | Attachment scanning may silently fail or deployment becomes environment-specific | Explicit health-checked dependency config | Remove host default; fail/disable uploads according to security policy; readiness check | Dependency health | Security dependency failure is visible and safe | Typed scan service health and fail-open/closed policy | Show upload unavailable/retry, not generic failure | Production refuses insecure scan configuration; outage behavior matches policy | `application.properties` ClamAV properties |
| DS-01 | Design system | Cross-product visual language | Tokens/colors | Partial drift | Extensive tokens/dark mode coexist with 84 raw palette-class uses and 25 raw hex values | UI/Maintainability | P2 | Inconsistent hierarchy, theming and contrast; costly redesign | Semantic token-only product surfaces | Map raw colors to semantic roles; lint forbidden palettes/hex; document exceptions | Semantic design tokens | Meaning survives theme/brand changes | None | Refactor and add style lint | No unauthorized raw palette/hex in production views; light/dark/brand contrast passes | Static Tailwind/hex scan across 408 production files |
| DS-02 | Responsive | All views | Breakpoint/reflow coverage | Partial | 22 of 61 production views have no responsive breakpoint utilities; some may be intrinsically fluid, but no runtime reflow proof exists | Mobile/Accessibility | P1 | Dense enterprise screens may clip or become unusable on phone/tablet/zoom | Responsive layout contract per surface | Define min supported viewports; use container queries/master-detail; test long content/locales/zoom | Responsive enterprise workspace | Reflow without losing task completion | Pagination/query sizes tuned for devices as needed | Surface-specific responsive states | Every P0/P1 journey completes at phone/tablet/desktop and 400% zoom without horizontal task scroll | Static responsive-token scan; no device E2E |
| DS-03 | Design system | Forms/actions | Primitive consistency | Partial | Hundreds of raw buttons/inputs/selects/textareas coexist with components, increasing focus/error/size drift | UI/Accessibility | P2 | Inconsistent interaction and duplicated accessibility bugs | Canonical field/action primitives | Migrate high-risk forms first; enforce labels, errors, disabled/loading, focus ring and touch size in primitives | Accessible component system | Defaults carry semantics; exceptions are rare | Standard field-error data shape | Codemod/refactor and lint new raw controls | New surfaces use approved primitives; audited raw-control count trends to zero | Static counts: 397 buttons, 307 inputs, 149 selects, 72 textareas in production JS/JSX |
| DS-04 | Accessibility | Product-wide | WCAG evidence | Partial | 24 a11y test files run axe serious/critical on selected surfaces; no complete keyboard, focus, screen-reader, contrast, zoom/reflow or touch-target evidence | Accessibility/QA | P1 | Disabled users face unknown blockers; conformance cannot be claimed | WCAG 2.2 AA test matrix and VPAT-ready evidence | Combine automated axe with manual keyboard, NVDA/JAWS/VoiceOver, contrast, zoom and cognitive review | Layered accessibility QA | Automated scans are a floor, not certification | Accessible error/status semantics | Remediate by journey; add focus management and announcements | Zero critical/serious axe; all P0 journeys pass manual matrix; exceptions documented with owner/date | A11y tests/config scan; runtime unavailable |
| QA-01 | Quality | Critical journeys | E2E breadth | Insufficient | Only `e2e/cockpit.spec.js` exists, with three Scrum Cockpit tests in desktop Chromium | QA/Reliability | P1 | Regressions in auth, work, knowledge, service, messaging, reporting, security and offline can ship | Risk-based E2E suite | Add journey suites with tenant fixtures, API setup and deterministic cleanup | Test pyramid capstone | E2E protects revenue/security-critical journeys | Test data factory/seed endpoints isolated to test | Stable selectors and accessible assertions | P0/P1 journey matrix passes in CI on Chromium/Firefox/WebKit and key mobile viewport | `works-frontend/e2e/cockpit.spec.js`; Playwright config |
| QA-02 | Quality | Scrum Cockpit E2E | Assertion strength | Weak | Some core assertions/actions run only `if (count())`, allowing missing controls to produce a passing test | QA | P1 | Tests can be green when primary UI is absent | Fail-fast mandatory controls; optional only with explicit fixture condition | Replace conditional presence with `expect(...).toBeVisible()`; deterministic data | Deterministic E2E | Absence of required UI is a failure | Reliable fixture/setup | Stable roles/test IDs only where needed | Deleting/renaming required control fails test; fixture guarantees state | `e2e/cockpit.spec.js` conditional count branches |
| QA-03 | Quality | Coverage gates | Coverage representativeness | Misleading | Frontend thresholds cover mainly `components/works`; backend first gate excludes controllers, repositories, services and many other business layers; service-only gate is 48% | QA/Governance | P1 | Green coverage can coexist with untested authorization/contracts | Risk-weighted coverage and mutation/contract tests | Include security boundaries, controllers/services and frontend views/hooks/libs; ratchet thresholds | Meaningful quality gate | Coverage measures risk-bearing code | Add authorization/contract/mutation tests | Expand view/hook tests where logic remains client-side | All P0 policies have negative tests; changed-code threshold ≥80%; exclusions justified | Vite/Vitest coverage config; Maven JaCoCo excludes/rules |
| QA-04 | Release | Build/test/browser | Reproducible evidence | Cannot verify | Supplied environment could not install/build/run the stack | Release/Operational | P0 | No evidence that product compiles, migrates, starts or passes tests in target environment | Hermetic supported toolchain and one-command validation | Pin Node/Java; lock/cache dependencies; Compose/testcontainers; CI artifacts; smoke environment | Reproducible release | Release is proven, not inferred | Build image and migration/smoke endpoint | Production-like preview for UAT | Fresh runner executes build, tests, migrations and smoke/E2E from documented command with signed artifacts | Audit runtime attempts documented in Section 2.3 |
| QA-05 | Quality | CI/unit/integration | Existing foundation | Strong, unverified | CI defines lint, unit, build, Storybook, backend coverage/integration and E2E workflows; repository has 255 frontend and 274 backend tests | QA | P3 | Provides a strong base for remediation | Preserve while closing blind spots | Keep gates, make artifacts/reports visible, add required risk suites | Defense in depth | Multiple fast gates precede E2E | Maintain test tags and migration checks | Maintain component/story/a11y tests | CI on supported runner is green; reports retained; branch protection requires all risk gates | `.github/workflows`; test inventory |
| PERF-01 | Frontend | Large editor/views | Bundle/runtime complexity | High-risk | Several components exceed 500–2,000 LOC; route model is extremely wide | Performance/Maintainability | P1 | Larger bundles, slow rerenders and fragile state coupling | Lazy boundaries and measurable performance budgets | Split by route/panel; memoize based on profiling; virtualize large collections; budget chunks/LCP/INP | Performance by architecture | Optimize from measurement, isolate change | Consider tailored read models | Lazy load and localized state | No initial chunk includes unopened heavy editors; INP/LCP/bundle budgets pass on reference devices | Static LOC inventory: AppShell 2360, BlockEditor 2176, KnowledgeView 1545, RouteOutlet 926 |
| PERF-02 | Reliability | Repository-wide async paths | Swallowed exceptions | Weak | Static scan found 33 empty catch blocks | Reliability/UX | P2 | Failures become stale or false-empty UI and are hard to support | Central observable failure policy | Classify ignorable errors narrowly; log correlation; user retry for task-impacting errors | Resilient feedback | Silence is an explicit, reviewed exception | Correlation/error codes | Replace empty catches with state/telemetry | Fault injection yields user feedback or documented harmless fallback; no raw empty catches in critical flows | Static empty-catch scan |

## 7. Numbered journey audits

Because the product could not run, these are code-backed journey audits rather than screenshot annotations. Visual rendering, focus movement and responsive behavior must be re-audited after a successful start.

### 7.1 New user: signup → verify → login → secure account

1. **Working in code:** signup, login, forgot/reset password, backend email verification, backend logout/revocation, MFA and passkey infrastructure.
2. **Broken:** the emailed `/verify` URL is not a handled public frontend route; production does not expose the development verification token.
3. **Unsafe:** MFA QR sends the seed off-origin; logout is never called by either client.
4. **Confusing:** disabled SSO buttons advertise unavailable enterprise auth; security settings omit session and MFA lifecycle actions.
5. **Accessibility risk:** incomplete labels/autocomplete and keyboard-inaccessible password reveal; fixed-width auth panels.
6. **Target flow:** domain-aware login → explicit verification pending state → link opens verification route → success and return-to-login → optional secure first-party MFA/passkey setup → account security page with sessions/recovery/revocation.

### 7.2 Individual contributor: open Today/My Work → create → edit → move → resolve conflict

1. **Working in code:** role-aware entry, My Work endpoint, work-item CRUD, workflows, custom fields, optimistic versions, transitions, WIP and DoD concepts.
2. **Broken/unsafe:** quick create silently chooses first project or magic ID; offline edits do not enter the queue.
3. **Incomplete:** board initially represents a limited page; bulk/drag semantics over an incomplete dataset are unsafe.
4. **Performance:** shell loads broad cross-product data before the current route is known.
5. **Target flow:** shell paints identity/navigation → route loads My Work → create always exposes project → optimistic mutation with pending state → server confirms or field-level conflict panel appears → offline state queues with durable status and reconnect outcome.

### 7.3 Product/agile team: backlog → sprint → board → ceremony/report

1. **Working in code:** backlog, sprints, Scrum Cockpit, capacity/ceremonies/retro/standup and sprint reporting are broadly implemented.
2. **Scope defect:** several sprint functions fall back to `PROJ-WORKS` rather than the visible project.
3. **Test weakness:** only this domain has E2E coverage, but required controls are sometimes conditionally asserted and only desktop Chromium runs.
4. **Target flow:** project is route-level invariant → backlog and sprint share one explicit scope → move/start/complete enforce capacity/WIP/DoD → ceremony artifacts link to sprint/work items → report values are reproducible from a golden dataset.

### 7.4 Knowledge worker: find/create/edit/review/publish/share

1. **Working in code:** spaces/articles, block editing, autosave, versions/diff/restore, comments, review/publish, public share and presence/lock concepts.
2. **Broken:** global discovery calls the wrong knowledge search path/shape; browser `PATCH` preflight fails in cross-origin deployment.
3. **Unverified risks:** autosave races, long-document performance, keyboard block reordering, focus after panel transitions, public-link expiry/revocation and mobile editor reflow.
4. **Target flow:** scoped search with snippets → clear draft/review/published state → autosave status with retry → version compare/restore → share dialog with audience/expiry/revocation → safe public reader.

### 7.5 Teammate: open chat → message/reply/react → add participant → resume on mobile

1. **Privacy failure:** workspace permission exposes conversations without participant checks.
2. **Functional failure:** send does not publish a chat event; the reload DTO loses sender/reaction semantics.
3. **UX gaps:** raw-ID participant prompt; missing unread/search/reply/edit/delete/files; empty catches.
4. **Mobile failure:** fixed multi-pane widths without a small-screen master-detail model.
5. **Target flow:** participant-scoped list → conversation DTO with cursor/unread/reactions → committed message publishes sequenced event → reconnect backfills → searchable member picker enforces workspace → responsive one-pane navigation preserves draft and scroll.

### 7.6 Customer/agent: self-service → request/chat → triage → resolve → CSAT

1. **Working in code:** customer identities, account-owned requests, service queue/transitions, SLA/CSAT concepts, knowledge deflection and AI draft approval.
2. **Privacy failure:** support conversation lookup does not prove customer/account ownership.
3. **Trust failure:** portal collapses errors to empty; “instant” assistant copy conflicts with human approval; “real-time” polls every eight seconds.
4. **Agent gap:** the agent UI is a queue summary rather than a full queue-to-resolution workspace.
5. **Target flow:** portal shows truthful request/chat status → customer-isolated conversation → agent opens contextual request detail with customer history/SLA → comments/links/assignment/priority/transition → customer gets push update → closure invites CSAT.

### 7.7 Manager/admin: report → schedule → security/compliance → deploy

1. **Working in code:** report builder/templates/schedules, dashboards, security center, audit and evidence services are extensive.
2. **Authorization failure:** report list/create/list-schedules paths lack correct tenant access checks; viewers may update/delete.
3. **Delivery gap:** report scheduling is a link reminder, not an exported snapshot.
4. **Assurance failure:** compliance bundles can state unmeasured/hard-coded controls.
5. **Deployment failure:** production does not fail closed on secrets, tenant filter, rate limits or migration safety.
6. **Target flow:** explicit report owner/manage policy → traceable data/freshness → schedule generates authorized immutable artifact or clearly states link reminder → evidence bundle cites measured source/time → prod boot validates every required control.

## 8. UAT test pack

All cases have status **Not run — environment blocked** unless marked **Static fail confirmed**. “Static fail” means the implementation chain is conclusively inconsistent; it does not claim a browser execution.

| UAT ID | Priority | Persona | Prerequisites, data setup & entry condition | Steps | Expected result | Negative/edge coverage | Status / evidence |
|---|---|---|---|---|---|---|---|
| UAT-A01 | P0 | New user | Unique inbox; unverified account; entry at signup | Sign up; open email link; complete verification; sign in | Pending state is clear; link activates once; login succeeds | Expired, reused, tampered token; resend throttling | **Static fail confirmed:** `/verify` not routed |
| UAT-A02 | P0 | Member | Active user/token; authenticated shell | Sign out; replay captured token against protected API | UI returns to auth; server rejects replay | Network loss during logout; two tabs | **Static fail confirmed:** client omits logout API |
| UAT-A03 | P0 | Customer | Active portal session/token | Sign out; replay token on owned-request API | Portal state clears and token is rejected | Offline sign-out; browser back; two tabs | **Static fail confirmed:** portal omits logout API |
| UAT-A04 | P0 | Member | MFA not enabled; network recorder | Enroll MFA; scan; confirm; inspect all network requests | Secret never leaves origin; code enables MFA | Wrong/expired code; restart enrollment invalidates old seed | **Static fail confirmed:** off-origin QR URL |
| UAT-A05 | P1 | Enterprise admin/user | Test IdP metadata/domain | Configure/test/enforce SSO; login/logout; JIT user | IdP flow works with safe fallback/admin recovery | Bad signature, disabled user, IdP outage, domain collision | Not run; UI says coming soon |
| UAT-A06 | P1 | Member | Two active devices; MFA enabled | List sessions; revoke one/all; change password; recover MFA | Revoked device fails; password change revokes per policy | Current-session revoke; lost authenticator | Not run; required UI absent |
| UAT-W01 | P1 | Contributor | User in two projects; current route project B | Quick-create item | Project B is visible/selected; item appears only there | No projects; archived/inaccessible last project | **Static fail confirmed:** first/magic project fallback |
| UAT-W02 | P1 | Contributor | Project with >50 matching items | Open board; scroll/filter; bulk-select; drag last-page item | All items reachable; counts/actions refer to intended scope | Page failure/retry; concurrent insert; filter change | Not run; static first-page limitation |
| UAT-W03 | P1 | Mobile field user | Installed PWA; item cached; online initially | Go offline; edit; reload; reconnect | Edit is durable/queued; status visible; syncs once | Conflict, rejected permission, token expiry, storage quota | **Static fail confirmed:** normal mutations never queue |
| UAT-W04 | P1 | Two contributors | Same versioned item in two sessions | Both edit same field; save A then B; resolve B | B receives understandable conflict; selected resolution persists | Different-field merge; item deleted; workflow changed | Not run; static concurrency path exists |
| UAT-AG01 | P1 | Scrum master | Two projects with distinct sprints | Switch project; create sprint; open report/metrics | Every request/result uses selected project | No active sprint; archived project; permission loss | **Static fail confirmed:** `PROJ-WORKS` fallbacks |
| UAT-K01 | P1 | Knowledge editor | Cross-origin frontend/API; article with block comment/home mapping | Execute PATCH-backed edits | Preflight and mutation succeed; save state updates | 401/403/409/500; offline | **Static fail confirmed:** CORS omits PATCH |
| UAT-K02 | P1 | Editor/reviewer | Draft article; second editor; long content | Edit/autosave; submit; review; publish; version diff/restore | No lost edits; state/permissions clear; restored version audited | Navigation mid-save; lock expiry; simultaneous edits | Not run; code path broadly present |
| UAT-K03 | P2 | External reader | Valid, expired and revoked share links | Open each link logged out | Valid safe content renders; expired/revoked reveal no content | Guess IDs; cache after revoke; private metadata | Not run |
| UAT-S01 | P1 | Member | Known work item/article containing unique term | Use global search; open each result | Both result types appear with correct totals/snippets | One backend fails; zero results; special chars; paging | **Static fail confirmed:** paths/shapes mismatch |
| UAT-M01 | P0 | Members A/B/C | A/B direct conversation; C same workspace but not participant | As C list/get/send/react/pin/summarize by known IDs | No conversation or metadata is disclosed; all mutations denied | Removed participant; workspace admin policy; guessed message ID | **Static fail confirmed:** participant guard absent |
| UAT-M02 | P0 | Member/admin | Workspace member and foreign/nonexistent user IDs | Create group; add/remove participants | Creator is admin/participant; only eligible members selectable | Remove last admin; add foreign ID; self-removal | **Static fail confirmed:** raw IDs/invariants absent |
| UAT-M03 | P1 | Two members | Conversation open in two browsers | Send/react/read/pin; disconnect/reconnect receiver | Updates arrive once; names/reactions/read/pins survive reload | Event loss/duplicate/order; token expiry | **Static fail confirmed:** no send event; DTO mismatch |
| UAT-M04 | P1 | Mobile member | 320/390/428 px viewports; long thread/draft | Navigate list→thread→details; type/send; back | No horizontal scroll; draft/position preserved; composer usable | Keyboard open, rotation, long names/attachments | Not run; static fixed-pane defect |
| UAT-SV01 | P0 | Customers A/B | Same workspace; separate accounts/conversations | A requests B conversation ID and posts | Non-disclosing denial; B data unchanged | Sequential/random IDs; closed conversation | **Static fail confirmed:** ownership check absent |
| UAT-SV02 | P1 | Agent | Queue with SLA states, customer history and unassigned request | Search/filter; open detail; assign; comment; link item; reprioritize; resolve | Entire flow works with context and audit | Invalid assignee; SLA breach during edit; conflict | Not run; UI capability gaps |
| UAT-SV03 | P1 | Customer | Portal APIs forced 500/offline/empty | Open dashboard, list, detail and KB | Error/offline distinct from empty; retry preserves context | 401 expiry; deleted request; slow network | **Static fail confirmed:** errors swallowed |
| UAT-SV04 | P1 | Customer/agent | AI support enabled with human approval | Ask question; observe customer; approve/reject agent draft | Customer sees honest pending status; approved reply arrives | AI unavailable/budget exceeded; rejection; long delay | Not run; copy/behavior mismatch static |
| UAT-R01 | P0 | Foreign workspace member | User A in W1; known W2 ID | List/create reports using W2 workspace ID | Denied without revealing W2 data; no report created | Owner-only list; template path; malformed workspace | **Static fail confirmed:** RBAC missing |
| UAT-R02 | P0 | Foreign workspace member | Known foreign report ID with schedules | List schedules by foreign report ID | Non-disclosing denial | Unknown ID; report deleted; central filter off | **Static fail confirmed:** guard omitted |
| UAT-R03 | P1 | Viewer/owner/admin | Shared report with roles | Viewer edit/delete; owner edit; schedule recipients | Viewer blocked; owner/admin controlled; audit/version retained | Concurrent edit; last owner; foreign recipient | **Static fail confirmed:** `view_items` permits mutations |
| UAT-R04 | P1 | Manager | Golden dataset and daily schedule | Schedule email+in-app PDF/CSV or link mode; advance clock | Delivery matches selected mode, recipient scope and as-of values | Job retry, mail failure, recipient removed, report deleted | Not run; current implementation is link notification only |
| UAT-AI01 | P1 | Contributor | AI capability enabled/disabled; work item draft | Request description suggestion and stream | Supported action returns/streams; disabled state is explicit | Budget exceeded, provider timeout, prompt injection | **Static fail confirmed:** endpoints absent |
| UAT-I01 | P1 | Integration admin | Google/Microsoft sandbox tenant | Connect; fetch meetings; create/link; refresh/revoke | Stable provider IDs, provenance and health state | Expired token, rate limit, duplicate callback, webhook replay | Not run; calendar provider is stub |
| UAT-D01 | P0 | Platform engineer | Production-like secret matrix and two tenants | Boot with each missing/default secret; boot secure; test cross-tenant calls | Insecure boot fails; secure boot passes; tenant isolation holds | Secret rotation; KMS outage; migration drift | **Static fail confirmed:** defaults/preflight not fail-closed |
| UAT-C01 | P1 | Compliance owner/auditor | Known control states, including deliberately disabled controls | Generate/download evidence bundle; inspect provenance | Claims match observed state with source/time/scope; file is retrievable | Missing collector; stale data; partial failure; unauthorized user | **Static fail confirmed:** hard-coded/unverified claims |
| UAT-X01 | P1 | Keyboard/screen-reader user | Supported browsers + NVDA/JAWS/VoiceOver; P0 journeys | Complete auth, create/edit, search, publish, chat, service, report | Logical focus/order, announced status/errors, accessible names, no traps | 200/400% zoom, reduced motion, high contrast | Not run |
| UAT-X02 | P1 | Mobile/tablet user | 320, 390, 768, 1024 px; touch; throttled network | Complete all P0/P1 journeys | Reflow, touch targets, usable overlays/tables and retained input | Rotation, software keyboard, long locale/content | Not run |

## 9. Recommended automated E2E scenarios

| E2E ID | Scenario and actors | UI path | API/security assertions | Data/state assertions | Required matrix |
|---|---|---|---|---|---|
| E2E-01 | Signup, verify, login, logout/replay | Public signup → email link → login → sign out | Verification token one-use; logout revokes JTI | User state transitions unverified→active; audit event | Chromium/Firefox/WebKit; mobile auth viewport |
| E2E-02 | Password reset + session revocation | Forgot → email → reset → account sessions | Reset token one-use; old tokens rejected | Password/version updated; sessions revoked per policy | Three browsers |
| E2E-03 | MFA/passkey lifecycle | Account security → enroll/challenge/recover/disable | No off-origin secret; step-up required | Credential added/removed; audit events | Chromium/WebKit + mobile |
| E2E-04 | Tenant isolation sweep | Direct API plus UI for W1/W2 actors | Negative list/get/create/update/delete on report, chat, service, work, knowledge | No foreign rows/events/notifications | API suite on every PR; two-tenant fixture |
| E2E-05 | Work item complete journey | My Work → create → detail → workflow → board | Correct visible project; version header/body; permissions | Item/tags/fields/status/history consistent | Three browsers; desktop/mobile |
| E2E-06 | Concurrency/offline | Two browsers + network toggle | 409 conflict DTO; idempotent sync/retry | One final version; queued record cleared once | Chromium multi-context + mobile viewport |
| E2E-07 | Agile project scoping | Project A/B backlog/sprint/cockpit | Every request contains selected project; no magic fallback | Counts/items/metrics remain isolated | Three browsers |
| E2E-08 | Knowledge editorial lifecycle | Search → create/edit/autosave → review/publish → restore/share | PATCH preflight; role checks; public token expiry | Versions, publication state and restored content exact | Three browsers; keyboard; mobile reader |
| E2E-09 | Unified search | Cmd-K/search page → work/article hits | Correct unified contract; partial backend failure surfaced | Rank/type/snippet/total/open target correct | Three browsers; keyboard-only |
| E2E-10 | Private messaging | A/B conversation, C outsider; reconnect | Participant guard on every endpoint; sequenced event; no JWT in logs | Sender/reaction/read/pin survives reload; unread exact | Two browser contexts + mobile |
| E2E-11 | Customer service isolation/resolution | Customer portal A/B + agent console | Customer ownership; eligible assignment; transition permissions | Request/chat/SLA/CSAT/audit linked correctly | Portal mobile + agent desktop |
| E2E-12 | Report authorization and delivery | Build/save/share/schedule/run/open | `view_reports`/`manage_reports`; recipient scope; edited `viewAs` cannot elevate | Golden metrics and immutable snapshot/export exact | Desktop browsers + scheduler clock control |
| E2E-13 | Integration lifecycle | Connect sandbox provider → sync → token expiry → revoke | OAuth state/PKCE, webhook signature/replay, idempotency | External/internal IDs linked once; health status correct | Provider sandbox nightly |
| E2E-14 | Production configuration | Build image → migrate → boot → smoke | Missing/default secrets fail; rate/tenant controls on; migration drift blocks | Health/readiness and audit evidence | Ephemeral production-like environment |
| E2E-15 | Accessibility regression | P0 journeys via keyboard + axe | No critical/serious axe; focus/status semantics | No task-blocking keyboard or screen-reader defect | Automated each PR + manual release matrix |
| E2E-16 | Responsive/performance | P0 journeys on reference devices/network | API call budget, no request storm, no long-lived URL token | LCP/INP/chunk/error budgets retained | 320/390/768/1440 px; fast/slow network |

### Current E2E disposition

- Existing automated E2E: three Scrum Cockpit scenarios in `works-frontend/e2e/cockpit.spec.js`.
- Required change: mandatory controls must be asserted directly, not guarded by `if (count())`.
- Browser coverage: add Firefox and WebKit; add at least one phone and one tablet project.
- Data setup: create deterministic per-test tenant fixtures via API, never shared seeded IDs such as `PROJ-WORKS`.
- Security: every object API needs positive owner/member tests and negative foreign-tenant/non-participant tests.

## 10. World-class product benchmark playbook

These are pattern benchmarks, not claims of pixel parity with a named product.

| Product area | Principle to adopt | Practical bSmart Works application |
|---|---|---|
| Linear/Jira-style work management | Fast, explicit scope; keyboard efficiency; complete collections | Visible project in every create; full board pagination; command menu actions with confirmation and undo |
| Notion/Confluence-style knowledge | Recoverable editing, clear publishing state, powerful discovery | Deterministic autosave status; version provenance; unified FTS with snippets; safe share lifecycle |
| Slack/Teams-style messaging | Participant privacy, durable message model, event-driven state | Participant service guard; sequenced events; unread/read/reaction/pin DTO; threads/search/files; responsive master-detail |
| JSM/ServiceNow-style service | Queue-to-resolution context and measurable SLA | Split queue/detail, customer 360, SLA timeline, notes, linkage, assignment/priority, bulk and audit |
| Tableau/Power BI-style reporting | Traceable metrics, immutable exports, governed sharing | Metric definitions/freshness, golden datasets, owner/manage policy, as-of export and delivery audit |
| Microsoft/Google enterprise identity | Managed IdP, session lifecycle and secure recovery | OIDC/SAML, domain discovery/enforcement, session/device revoke, recovery codes, first-party MFA provisioning |
| Mature SaaS platform operations | Secure-by-default configuration and reproducible release | Production profile validator, tenant defense in depth, distributed rate limits, strict migrations, signed CI artifacts |

### Cross-product experience rules

1. **Never guess durable scope.** Project, workspace, customer, report audience and assignee must be visible and validated.
2. **Never disguise an error as empty.** Loading, empty, partial, offline, forbidden and failed are separate states.
3. **Never promote a stub.** “Coming soon,” synthetic integration results and inert AI controls should be feature-gated or removed.
4. **Never rely on the UI for authorization.** Tenant, membership, object ownership and action permission are enforced in a service policy for every endpoint.
5. **Make async work observable.** Pending, saved, queued, synced, conflict, failed and retrying states use one vocabulary across work, knowledge, chat, reports and integrations.
6. **Use canonical contracts.** Shared pagination, error and identity DTOs remove client guesses and silent fallbacks.
7. **Design small-screen workflows, not compressed desktop screens.** Use single-pane task progression, bottom sheets/drawers and touch-safe actions.
8. **Treat accessibility as release behavior.** Keyboard, focus, status announcements, reflow and assistive technology are tested on complete journeys.

## 11. Phased remediation roadmap

No calendar estimate is asserted because team size, ownership, environment access and release window were not provided. The phases are dependency-ordered. Each phase has an exit gate; later work should not bypass it.

### Phase 0 — Contain security and stop unsafe release

**Scope**

- Fix AUTH-01 through AUTH-04, MSG-01/02, SERV-01, REP-01/03, AI-03 and SEC-01.
- Add negative tenant/object-authorization tests for every affected endpoint before refactoring.
- Remove/feature-gate SSO, calendar, custom-domain manual verification, “instant AI,” “real-time” and offline claims that are not true.
- Refuse production boot with insecure secrets/settings; turn on strict tenant and migration controls in a production profile.
- Establish a reproducible Java 21/Node toolchain and production-like CI environment.

**Primary owners:** security lead, backend platform lead, identity owner, messaging/service/report domain owners, DevOps/SRE.  
**Exit gate:** all P0 tests pass; fresh-run build/migrate/start succeeds; security review signs tenant and credential boundaries; no externally visible unsupported claim remains.

### Phase 1 — Restore core journey correctness

**Scope**

- Fix global search contracts, AI assist contract/capability gating and CORS PATCH.
- Remove all `PROJ-WORKS`/first-project silent defaults; make route project context explicit.
- Implement board pagination/completeness and honest empty/error states.
- Complete server logout behavior in both clients and account security lifecycle.
- Correct report manage permissions, recipients and scheduling terminology.

**Primary owners:** frontend platform, work/knowledge/report teams, API governance, QA.  
**Exit gate:** UAT-A01–A06, W01–W04, AG01, K01–K03, S01 and R01–R04 pass on golden data; API contract suite is required in CI.

### Phase 2 — Make collaboration and service operationally complete

**Scope**

- Rebuild messaging on participant-scoped service/DTO/event contracts; add unread/search/reply/edit/delete/files/people picker and mobile master-detail.
- Build service split queue/detail console, customer context, link/comment/priority/assignment controls and SLA timeline.
- Replace customer chat polling with scoped push/reconnect or truthfully label periodic refresh.
- Make portal error/offline/expiry/retry states trustworthy.
- Implement actual calendar providers or remove the feature until certified.

**Primary owners:** messaging, service/portal, realtime platform, integrations, product design/accessibility.  
**Exit gate:** UAT-M01–M04, SV01–SV04 and I01 pass; two-browser realtime and adversarial customer isolation E2E are green.

### Phase 3 — Architecture, performance and mobile/accessibility hardening

**Scope**

- Decompose AppShell/RouteOutlet and heavy views; introduce route loaders, query caching and error boundaries.
- Adopt a real router with restorable item/tab/filter state.
- Remove project KPI N+1, virtualize large lists/editors based on profiling and enforce chunk/request/INP/LCP budgets.
- Standardize semantic tokens and field/action primitives; eliminate critical raw-control accessibility drift.
- Complete phone/tablet layouts and WCAG 2.2 AA journey matrix.

**Primary owners:** frontend architecture, design system, performance, accessibility, domain teams.  
**Exit gate:** all P0/P1 journeys pass keyboard, screen-reader, 320/390/768/1440 px and cross-browser matrices; performance budgets are recorded and enforced.

### Phase 4 — Enterprise assurance and reporting maturity

**Scope**

- Implement/certify OIDC/SAML, managed sessions, domain policies and recovery.
- Replace hard-coded compliance claims with measured collectors, provenance and signed review.
- Generate immutable scheduled report exports with retention, retry, audit and recipient-scope enforcement.
- Certify integration OAuth/webhook/idempotency/rotation/reconciliation paths.
- Add distributed abuse protection dashboards, incident runbooks, backup/restore and migration drills.

**Primary owners:** enterprise platform, compliance/security, reporting/data, integrations, SRE.  
**Exit gate:** enterprise control evidence is independently reviewable; disaster/migration/rotation drills pass; report golden datasets and export parity pass.

### Phase 5 — Product simplification and adoption

**Scope**

- Validate navigation/task taxonomy with role-based tree tests and first-use studies.
- Consolidate overlapping cockpit/destination concepts and clarify project/team vocabulary.
- Add product analytics for task success, search success, time-to-triage, time-to-first-value and error recovery—not just clicks.
- Run pilot cohorts, close severity-weighted feedback and publish a documented support/training model.

**Primary owners:** product, research/design, customer success, analytics, documentation.  
**Exit gate:** task-success targets met by target personas; support and operational ownership accepted; remaining risks explicitly waived by accountable owners.

## 12. Release acceptance gates

| Gate | Required evidence | Current state |
|---|---|---|
| Security and privacy | Zero open P0; adversarial tenant, participant, customer and token-replay tests | **Fail** |
| Build and migration | Fresh runner builds frontend/backend, migrates clean DB and upgrades representative DB | **Cannot verify** |
| Functional UAT | All P0/P1 UAT cases pass with evidence and defect links | **Not run; multiple static failures** |
| API contracts | Client/server schema tests for search, AI, messaging, reports, errors and pagination | **Fail by static mismatch** |
| Browser/device | Chromium, Firefox, WebKit; phone/tablet/desktop; supported OS matrix | **Fail: Chromium desktop Scrum-only E2E** |
| Accessibility | WCAG 2.2 AA automated + manual journey evidence | **Cannot verify / insufficient scope** |
| Performance | Agreed LCP/INP/bundle/API-call/large-data budgets on reference devices | **Cannot verify** |
| Reliability | Offline/degraded network/conflict/reconnect/job retry/backup-restore drills | **Fail or cannot verify** |
| Enterprise operations | Secure prod profile, secrets/rotation, rate limits, strict migrations, SSO/integration certification | **Fail** |
| Product truth | No UI copy promises unsupported real-time/offline/AI/compliance/integration behavior | **Fail** |

## 13. Final readiness assessment

### Maturity

**Feature-rich pre-production platform / controlled-pilot maturity.** The implementation is beyond a prototype: there is real domain depth and a strong test/codebase foundation. It is not production-ready because authorization, identity lifecycle, deployment safety and core client/server contracts fail on multiple high-value paths.

### Recommendation

**NO-GO for public, customer or sensitive-data production use.**  
**Conditional internal pilot:** only after Phase 0 exits, using synthetic/non-sensitive data, with tenant-isolation tests, secure production-like configuration and a reproducible green pipeline.

### What would change the decision

The decision can move to **conditional GO** when:

1. all P0 findings are closed with negative tests and independent security review;
2. the supported toolchain builds, migrates, starts and passes CI from a clean runner;
3. P0/P1 UAT and E2E suites pass across the defined browser/device/accessibility matrix;
4. product copy and controls match actual capability; and
5. accountable owners accept the residual P2/P3 register with dates and risk rationale.

## 14. Follow-up runtime audit checklist

When a runnable environment is available, the next audit must capture current-run evidence for:

- desktop (1440), tablet (768/1024) and phone (320/390/428) screenshots for every primary route;
- light/dark/brand themes, long content, empty, loading, partial, error, offline, conflict and permission-denied states;
- keyboard focus order, modal/drawer focus trap/restore, screen-reader names/status announcements, contrast and 200/400% zoom;
- network traces for startup call budget, tokens/PII in URLs, CORS preflight, retries, realtime reconnect and offline sync;
- golden-dataset correctness for boards, dashboards, sprint reports, SLAs, reports and exports;
- two-tenant/two-customer/three-participant adversarial traces;
- browser console, failed requests, unhandled promise rejections and memory/long-task profiles;
- screenshots tied back to the master register Evidence column, converting static UI hypotheses into verified defects or closures.

---

**Audit integrity note:** repository comments and tests were used as supporting evidence, not proof of runtime behavior. Strong implementations are identified as strengths, but runtime status remains unverified wherever execution was unavailable. Security findings were based on direct controller/service/client traces and should be triaged immediately by the owning engineers.
