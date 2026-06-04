<!-- PROVENANCE: This is the markdown-formatted export of `06-Complete-Iteration-Guide` —
     the same Complete Iteration Guide source as the machine-extracted mirror at
     `docs/specifications/06-iteration-guide.md`. The two are NOT independent specs: this file
     preserves the document's heading/bold structure (the capability-tag formatting that Part 7
     spec-selection relies on), while the `specifications/` copy is a formatting-stripped
     auto-extraction kept in sync with the .docx via `scripts/extract-specs.py`.

     This file is GUIDE_PATH for `docs/REFACTOR_MASTER_PROMPT.md` — the refactor pipeline parses
     Part 7 of THIS file as its spec source. Per `CLAUDE.md` / `SOURCE-OF-TRUTH.md`, where the
     spec and the code disagree on HOW it is built, the code is canonical; the spec governs WHAT
     must be true. Do not hand-edit beyond this header — keep the two guide copies aligned to the
     same source. -->

*bSmart Works — Complete Iteration Guide*

**THE COMPLETE ITERATION GUIDE**

**bSmart Works**

*A BCITS Product*

**The Pinnacle of Project Delivery — Built for BCITS, by BCITS**

*20 iterations · 26 capabilities · 346+ sub-features · Every feature with use cases and benefits*

*AI-native · Universally customizable · Privacy-respecting · Compliance-first*

Prepared for: Deepak Pandey  ·  BCITS  ·  May 2026

# **Executive Overview**

This document is the master iteration-wise guide for bSmart Works. It consolidates everything specified across the previous design documents — Build Spec v1, Amendment v2, Master Capability Map v3, and Capability Map Expansion v3.5 — organized as a value-driven iteration roadmap rather than a build-order roadmap.

## **What this document contains**

- Part 1: Product naming, brand alignment, and the meaning of 'Works'

- Part 2: The five architectural commitments that distinguish Works

- Part 3: The seven unification layers that keep the product coherent

- Part 4: UI / UX principles for a clean, professional, engaging experience

- Part 5: Architectural attributes — what makes Works production-grade

- Part 6: BCITS brand application — colors, logo, typography, spacing, iconography

- Part 7: The 20 iterations — features, use cases, benefits, UX, AI, customization, time

- Part 8: AI Control Plane summary — the four-level on / off architecture

- Part 9: Five role-tuned productivity surfaces

- Part 10: Honest considerations and decision framework

## **How to read this document**

**For executives: **read Parts 1, 2, 4, 10 (about 12 pages) — what Works is, what makes it distinctive, the UX commitments, and the decision framework.

**For product / project managers: **read Parts 1-6 plus the walking-skeleton sections of Part 7.

**For engineering: **read Part 7 end-to-end. Each iteration is a self-contained build plan.

**For designers: **focus on Parts 4 and 6 plus the UX notes in each iteration.

## **The 20 iterations at a glance**

| **Iter** | **Theme** | **Walking skeleton — what the user can do after this** |
| --- | --- | --- |
| 1 (MVP) | Foundation — The Works MVP | After iteration 1, a BCITS team of 5-10 can adopt Works as their daily PM tool. |
| 2 | Sprints — Scrum + Reports | After iteration 2, BCITS Scrum teams fully replace sprint-planning Excel and standup notes with Works. |
| 3 | Workflows, Permissions & Custom Fields | After iteration 3, an Works workspace can be tailored to any BCITS team's specific process — utility custom types, role-aware permissions, custom workflows.. |
| 4 | PM Artifacts — RAID, Decisions, Meetings | After iteration 4, BCITS PMs and EPC managers have their full toolkit — RAID, decisions, meetings, action items, lessons learned. |
| 5 | Knowledge Repository + Versions | After iteration 5, BCITS has a workspace knowledge base — runbooks, ADRs, customer KB, onboarding guides — searchable, versioned, linkable to work.. |
| 6 | Reports, Dashboards & Insights | After iteration 6, BCITS has visibility into delivery at every layer — individual, team, project, org. |
| 7 | Compliance Rules Engine | After iteration 7, BCITS has its strategic differentiator activated. |
| 8 | SLA Engine — Internal & Generalized | After iteration 8, BCITS engineering teams have explicit SLA commitments tracked in-tool. |
| 9 | Service Management — Customer Portal | After iteration 9, Works is sellable to BCITS's first paying utility customers as a customer-facing service management product. |
| 10 | AI Orchestration Foundation + AI Control Plane | After iteration 10, Works has the AI architecture in place. |
| 11 | AI Expansion + Conversational Command Bar | After iteration 11, Works is fully AI-native. |
| 12 | KPI Framework with Privacy Guardrails | After iteration 12, BCITS has visibility into team, project, and organizational health — without the trust-destroying surveillance pattern of individual comparison.. |
| 13 | Automation Engine + Integrations | After iteration 13, Works is integrated with BCITS's existing tooling. |
| 14 | Developer Workspace + IDE Extension | After iteration 14, BCITS engineers have a meaningfully better experience than in Jira / ADO / OpenProject. |
| 15 | Scrum Master Cockpit + Product Owner Workspace | After iteration 15, BCITS Scrum Masters and Product Owners have meaningfully better workflows. |
| 16 | Leadership Console + Admin Operations Center | After iteration 16, BCITS leadership and administration have meaningfully better daily workflows. |
| 17 | Universal Customization Engine | After iteration 17, Works is genuinely universally customizable — admins tune every behavior without engineering tickets. |
| 18 | Mobile + Real-time + Performance | After iteration 18, Works is a fully modern 2026 product — works on every device, real-time collaborative, performant, observable.. |
| 19 | Enterprise Security + Compliance Certifications | After iteration 19, Works meets enterprise security and compliance bars. |
| 20 | Polish, Advanced AI, Marketplace Foundation | After iteration 20, Works is commercially complete — sellable to enterprise customers, internationally, with a third-party ecosystem, fully accessible, fully secure.. |

# **Part 1 — Product Vision and Naming**

## **1.1 The name: bSmart Works**

Works is **where work gets done** — plain, confident, unmistakable. It carries an industrial heritage (a 'works' is a place of engineering and production) that fits BCITS's utility roots, and it doubles as a promise: it works.

### **Why ****'****Works****'**** fits BCITS**

- Single word — easy to say, remember, and write

- Strong consonants — confident and decisive, fits utility-domain customers

- Universally understood meaning — no translation issues across markets

- Fits the bSmart family naming convention (lowercase b, capitalized second word)

- Implies aspiration — customers reach the peak of their delivery

- Distinct from generic PM tool names — stronger brand recall

### **Brand family alignment**

bSmart Works joins the established bSmart product family at BCITS:

| **Product** | **Purpose** |
| --- | --- |
| bSmart IoT | Smart metering communication infrastructure |
| bSmart MDM | Meter Data Management — billing-grade data integrity |
| bSmart ORMS | Outage and Restoration Management |
| bSmart GIS | Utility geographic information system |
| bSmart UHES | Utility head-end system for AMR |
| bSmart Works (new) | Project delivery workspace — used to deliver on the other bSmart products |

### **Tagline candidates**

- "Where work gets done." — most aligned with the name (recommended primary)

- "Where work peaks." — short and punchy (recommended alternate)

- "Work, done right." — ties to BCITS quality positioning

- "The peak of project delivery." — value statement

## **1.2 Product positioning**

bSmart Works is **the AI-native, universally customizable, utility-aware project workspace.** It combines the rigor of enterprise PM tools with the modern productivity expectations of 2026 — AI woven through every action, conversational command interface, role-tuned surfaces, native compliance — while staying clean, fast, and professional.

### **Three positioning claims**

- AI-native: AI in every capability, not a sidebar. Opt-in with documented fallbacks for every off-state.

- Universally customizable: every behavior has admin-accessible extension points. Versioning, sandbox, rollback built in.

- Utility-aware: PM Artifacts (RAID, decisions), domain vocabulary, compliance engine — encoded for utility delivery.

# **Part 2 — The Five Architectural Commitments**

These commitments distinguish bSmart Works from every alternative. They are decided once, held forever — they shape every iteration.

### **Commitment 1: Compliance is a first-class primitive**

Compliance rules, violations, audit log, dashboards are not bolt-ons — they are part of the foundation. Every project automatically inherits workspace compliance rules. This is the strategic differentiator for BCITS's regulated utility customers.

### **Commitment 2: SLA is one engine, two contexts**

The same engine powers internal delivery SLAs ('P0 bugs resolved in 4 hours') and external customer SLAs ('incident response in 30 minutes'). Configured once, applied everywhere. Eliminates the JSM-vs-Jira split that fragments other products.

### **Commitment 3: Configuration without code**

Every behavior is admin-configurable through UI. Workflows, custom fields, rules, automations, KPIs, dashboards — all via visual builders. Code-level extension exists only for genuinely novel logic. The bar for code is high.

### **Commitment 4: Privacy by design at every layer**

Individual data is private by default. Team metrics are aggregated. Manager views explicitly cannot drill into individual data — enforced at the API, not just the UI. Prevents the manager-surveillance anti-pattern.

### **Commitment 5: Event-sourced from day one**

Every state change is an immutable event. Audit log is automatic. Compliance regenerations are deterministic. Customer and regulator reviews have a single source of truth. Decided at iteration 1, paying compounding dividends throughout.

| **Why these five** They answer the five most-asked questions a utility-industry buyer will pose: 1. 'Can we prove we're compliant?' — Commitment 1 2. 'Can we offer customer SLAs without a separate product?' — Commitment 2 3. 'Can our admins configure this themselves?' — Commitment 3 4. 'Will managers misuse this for surveillance?' — Commitment 4 5. 'Can we reconstruct what happened during an audit?' — Commitment 5 |
| --- |

# **Part 3 — The Seven Unification Layers**

Unification is the discipline that keeps the product coherent across 20 iterations and 346 sub-features. These seven layers each have one canonical implementation used everywhere.

### **Layer 1: Data — one event store**

- Every state change writes to the shared event store; everything reads from it

- New capabilities cannot have their own data — they write events and read projections

### **Layer 2: Identity — one user, one permissions model**

- Same identity across web, mobile, API, IDE extension, command bar

- Field-level security defined once, enforced everywhere

### **Layer 3: Query — WIQL is the one query language**

- Same syntax in filters, automations, compliance rules, KPI definitions, dashboards

- Natural language → WIQL is the AI surface on one query language

### **Layer 4: AI Orchestration — one service powers every AI feature**

- Single budget, single audit trail, single fallback policy

- Turning AI off in one place doesn't leave it on elsewhere

### **Layer 5: Customization — one configuration framework**

- Same versioning, sandbox, rollback across all configurable surfaces

- Same import / export format

### **Layer 6: Knowledge — one repository linkable from everywhere**

- Articles linkable from work items, RAID artifacts, decisions, customer requests

- RAG-based AI search uses the same knowledge base across all capabilities

### **Layer 7: UI — one design system, role surfaces are configurations**

- Same design tokens, same component library, same interaction patterns

- Role surfaces are layout configurations on top of shared components, not separate apps

| **What unification prevents** Drift — capabilities diverging into separate conventions Silos — features that don't talk to each other Re-implementation — building permission checks five times instead of once Audit gaps — events captured in one place but not another AI fragmentation — different capabilities using different providers |
| --- |

# **Part 4 — UI / UX Principles**

Stated goal: simple, clean, professional, easy to use, visually engaging, higher engagement, smooth experience. Translating these into concrete design principles:

## **4.1 UI principles**

### **Visual hierarchy and breathing room**

- Three-tier hierarchy on every page: primary action / secondary info / tertiary detail

- Whitespace is a feature — cards have generous padding, tables breathe

- Single accent color (BCITS Orange) used sparingly — only primary actions and critical alerts

- Navy and neutral grays carry 90% of visual weight; orange punctuates

### **Component consistency**

- Reusable component library — one implementation per component

- Two button variants only: Primary (orange) and Secondary (outlined); tertiary actions are text links

- All cards share border radius (8px), subtle shadow, padding (16-24px)

- Form fields share label position, validation, error styling

### **Navigation architecture**

- Two-tier: sidenav for capability, topbar for global (workspace switcher, search, notifications, profile)

- Sidenav grouped: My Works, Projects, Management, Workspace

- Breadcrumb on every detail page; tabs for sub-sections

### **Progressive disclosure**

- Don't show everything at once; empty states guide to the next action

- Advanced features behind 'Show advanced options'

- Configuration UI layered: basic on top, advanced collapsed

### **Loading and feedback**

- Skeleton loading (layout placeholders), not spinners

- Optimistic UI — actions appear committed immediately; gracefully revert on failure

- Long operations show progress with estimated time and cancel

- Toast notifications auto-dismiss in 4 seconds

## **4.2 UX principles**

### **Reduced friction**

- One primary action per screen — the user knows what to do next

- Three-click rule: any feature reachable in three clicks or fewer

- Smart defaults — don't ask what you can infer

- Undo for destructive actions — toast with 'Undo' visible for 8 seconds

### **Confirmation only when needed**

- Reversible actions: no confirmation, just do it with undo

- Irreversible actions: clear confirmation; explicit 'I understand' for the most dangerous

- Bulk operations: preview before commit

### **Forgiveness and recovery**

- Auto-save drafts every 5 seconds

- Soft delete with 30-day retention, restorable from trash

- Version history on work items, articles, configuration

### **Power user paths**

- Comprehensive keyboard shortcuts; Cmd-K command palette from anywhere

- Inline editing on lists — no modal

- Drag-drop everywhere sensible; markdown shortcuts in editors

### **Accessibility by default**

- WCAG 2.2 AA conformance

- Keyboard-only navigation for every feature

- Color never the only indicator — icons, text, position carry meaning too

- Visible high-contrast focus indicators; verified contrast in light and dark themes

### **Onboarding through doing**

- No mandatory tutorial videos — learn by using

- Contextual inline help, not separate pages

- Sample workspace template with example data for new workspaces

- Smart, dismissable hints shown once

# **Part 5 — Architectural Attributes**

What makes bSmart Works production-grade — the decisions that determine reliability, scalability, security, and longevity.

## **5.1 Reliability**

- Event-sourced: every state change is an immutable event; system state is reconstructible

- Idempotent operations: same request twice produces same result — safe to retry

- Fail-safe defaults: when uncertain, fail closed (deny) rather than open (grant)

- Graceful degradation: AI off, integration down, real-time disconnected — core features still work

- Append-only audit log: tamper-evident with cryptographic chain

## **5.2 Scalability**

- Stateless services: horizontal scaling by adding instances

- Multi-tenant with hard isolation: no cross-tenant leakage

- Read replicas for query-heavy operations

- Async processing for heavy operations: AI, bulk, scheduled reports

- CDN-backed static assets — fast globally

## **5.3 Performance targets**

| **Operation** | **P50** | **P95** | **P99** |
| --- | --- | --- | --- |
| Page load (any page) | 300 ms | 800 ms | 2000 ms |
| Work item creation | 100 ms | 300 ms | 1000 ms |
| Search query | 150 ms | 500 ms | 1500 ms |
| Board drag-drop | 50 ms | 150 ms | 500 ms |
| Dashboard load (10 widgets) | 500 ms | 1500 ms | 3000 ms |
| AI response (cached) | 100 ms | 300 ms | 1000 ms |
| AI response (uncached) | 2000 ms | 5000 ms | 10000 ms |
| File upload (10 MB) | 1500 ms | 3000 ms | 8000 ms |

## **5.4 Security**

- Encryption at rest (AES-256) and in transit (TLS 1.3 minimum)

- Customer-managed keys (BYOK) optional for enterprise

- MFA enforced for admin roles; passkey (WebAuthn) support

- Conditional access: IP allowlist, device trust, geo, time-of-day

- Annual third-party penetration tests + bug bounty

- SOC 2 Type 2 and ISO 27001 (earned in iteration 19)

## **5.5 Privacy**

- Data minimization: collect only what's necessary

- Field-level security: per-field, per-role, server-enforced

- Layered KPI privacy: individual private, API-enforced no-manager-drill-down

- GDPR / DPDP: data export, right to be forgotten, access audit trail

- Data residency options; AI data boundary controls

## **5.6 Observability**

- Distributed tracing via OpenTelemetry

- Structured logging with correlation IDs

- Metrics on every operation: latency, error rate, throughput

- In-product status page; alerting on SLA breaches and anomalies

## **5.7 Cost**

- AI cost per workspace tracked and budgeted

- Slow database queries flagged for optimization

- Storage tiering: hot on SSD, cold on cheaper tier

- Caching reduces redundant computation; per-customer cost attribution

# **Part 6 — BCITS Brand Application**

bSmart Works inherits the BCITS brand identity established by the bSmart product family. This section makes the application concrete.

## **6.1 Color system — primary palette**

| **Token** | **Hex** | **Usage** |
| --- | --- | --- |
| Works Navy (primary) | #0B2F5C | Brand, headers, primary text, logo background |
| Works Blue (secondary) | #1E4D8C | Secondary headers, links, accents |
| Works Orange (action) | #E94E1B | Primary buttons, critical alerts, AI button — used sparingly |
| Works Teal (success) | #0E7C5E | Success states, Done status, healthy indicators |
| Works Warn (attention) | #B97A00 | Warning states, watch indicators |
| Works Danger (alert) | #C0392B | Error states, critical violations, blocked |

## **6.2 Color system — neutral palette**

| **Token** | **Hex** | **Usage** |
| --- | --- | --- |
| Neutral 900 (text) | #0F1A2A | Primary body text |
| Neutral 700 | #3C4858 | Secondary body text |
| Neutral 600 | #5A6B7E | Muted text, captions |
| Neutral 400 | #9AA8BC | Disabled text, placeholders |
| Neutral 200 | #E5E9EF | Borders, dividers |
| Neutral 100 | #F2F4F8 | Card backgrounds |
| Neutral 50 | #F7F9FC | Page background |

## **6.3 Logo system**

Works inherits the bSmart wordmark style with four variants:

- logo-primary — full wordmark 'bSmart Works' in Navy on light

- logo-icon — glyph only (rising bars + orange chevron) for app icons

- logo-mono — monochrome for print and single-color contexts

- logo-reverse — white wordmark for dark backgrounds

| **Logo design rationale** Three rising bars represent momentum — the rhythm of delivery. Orange chevron points forward — delivery, motion, getting work done. Lowercase 'b' connects to the bSmart family; capitalized 'Works' carries the product name. Navy-on-light is the primary lockup; reverse and mono are derivatives. |
| --- |

## **6.4 Typography**

- Primary: Inter — modern, neutral, excellent screen rendering

- Mono: JetBrains Mono — clear 0/O/l/1 distinction for code and IDs

- Fallback: -apple-system, Segoe UI, Roboto

| **Style** | **Size** | **Weight** | **Usage** |
| --- | --- | --- | --- |
| Display | 32 px | 700 | Page titles, hero headers |
| H1 | 24 px | 700 | Section headers |
| H2 | 20 px | 600 | Subsection headers |
| H3 | 16 px | 600 | Card titles |
| Body | 14 px | 400 | Default text |
| Caption | 12 px | 400 | Metadata, timestamps |
| Mono | 13 px | 500 | Code, IDs |

## **6.5 Spacing, layout, iconography**

- Base unit 4px; all spacing is a multiple of 4

- Card padding 16 or 24px; section gap 24px

- Max content width: 1280px dashboards, 880px reading pages

- Border radius: 4px small, 8px cards, 12px modals, 16px containers

- Single icon library: Lucide (1.5px stroke); sizes 16/20/24/32px

# **Part 7 — The 20 Iterations**

Each iteration is a self-contained value delivery — what the user can do after it that they couldn't before. Iterations vertically stack: each builds on all prior iterations without rework.

| **Iteration 1 is the MVP** After iteration 1, a BCITS team can adopt Works as their daily PM tool, replacing Excel and email for basic project tracking. This is the smallest thing that delivers real value. Every subsequent iteration adds a coherent layer — sprints (2), customization (3), PM artifacts (4), and so on through iteration 20. No iteration depends on a future iteration. Each iteration's value is realized in that iteration. |
| --- |

| **ITER** **1** | **MVP — RELEASE 1.0** **Foundation — The Works MVP** *A working PM tool one team can adopt within 3-4 weeks. Replaces Excel + email for basic project tracking.* |
| --- | --- |

| **Walking skeleton — what the user can do after this iteration** After iteration 1, a BCITS team of 5-10 can adopt Works as their daily PM tool. It replaces Excel for tracking, email for comments, and chat-screenshots for status updates. |
| --- |

### **Features in this iteration**

| **Cap A**  ·  **Authentication ****&**** identity** Email + password signup with email verification, MFA via TOTP, password reset, session management. |
| --- |

| **Cap A**  ·  **Workspaces** Top-level multi-tenant container. Each BCITS team or customer gets a workspace with branding, members, settings. |
| --- |

| **Cap A**  ·  **App shell — topbar, sidenav, workspace switcher** Consistent navigation chrome. Topbar holds workspace switcher, global search, notifications, user menu. |
| --- |

| **Cap A**  ·  **Event store foundation** Append-only immutable log of every state change. Foundation for audit, compliance, KPI, history reconstruction. |
| --- |

| **Cap B**  ·  **Projects** Containers with unique key prefix (WEB, AMR), lead, members, archive option, slug-based URLs. |
| --- |

| **Cap B**  ·  **Default WorkItem types** 7 built-in types — Epic, Story, Task, Bug, Sub-task, Incident, Service Request — with icons, colors, default workflows. |
| --- |

| **Cap B**  ·  **WorkItem CRUD with rich text** Create / read / update / delete with title, description (WYSIWYG), status, assignee, due date, tags. Optimistic concurrency. |
| --- |

| **Cap F**  ·  **Kanban board (basic)** Column-based board mapped to default statuses. Drag-drop status changes. Card density modes. |
| --- |

| **Cap G**  ·  **Comments with @mentions** Threaded comments on work items, @mention notifications, internal-only flag toggle. |
| --- |

| **Cap G**  ·  **Notifications — in-app + email** Per-user preferences by type. Smart batching to prevent inbox flood. Daily digest option. |
| --- |

| **Cap E**  ·  **Full-text search** Postgres-backed search across titles, descriptions, comments. Recent and starred boosts. |
| --- |

| **Cap J**  ·  **Personal home (My Works)** Per-user landing page showing assigned items, recent activity, mentions, notifications. |
| --- |

### **Use cases — concrete BCITS scenarios**

- BCITS WEB Portal team creates a workspace, invites 8 members, creates first project, starts logging bugs and stories

- Engineering lead replaces the team's Excel tracker with the Works Kanban board in week 1

- Support engineer logs a customer-reported incident with description and screenshot attachment

- Team lead runs daily standup looking at the Kanban board — no separate tool needed

### **Benefits**

- Replaces fragmented Excel + email for basic project tracking within one team

- Familiar work-item paradigm — minimal learning curve for anyone who has used Jira or OpenProject

- Foundation event log means future iterations deliver compliance, KPI, audit without rebuilding

- Single workspace per team enables clean rollout to 1-2 pilot teams before company-wide adoption

### **UI / UX considerations**

Works MVP must feel cleaner than Jira from day one. Three principles: one primary action per screen with the Works Orange button (the only orange element on most pages); navigation never more than two levels deep; empty states with helpful guidance, never blank screens. The Kanban board offers density modes (compact / comfortable / spacious) as a user preference.

### **AI integration**

*Iteration 1 ships without AI. The AI Control Plane arrives in iteration 10, after the foundation stabilizes. This is deliberate — prove the deterministic experience first, then layer AI on top.*

### **Customization extension points**

*Workspace branding (logo, primary color). Per-user theme (light / dark / auto). Timezone and locale. Default WorkItem assignee rules.*

### **Estimated time**

8-12 weeks for a small team (1-2 engineers + AI). 16-24 weeks for solo + AI.

| **ITER** **2** | **RELEASE 2.0** **Sprints — Scrum + Reports** *Adds backlog, sprints, and basic sprint reports. The team can now run formal Scrum cycles inside Works.* |
| --- | --- |

| **Walking skeleton — what the user can do after this iteration** After iteration 2, BCITS Scrum teams fully replace sprint-planning Excel and standup notes with Works. Sprint reviews have a live, drillable report. |
| --- |

### **Features in this iteration**

| **Cap F**  ·  **Backlog with capacity bar** Ranked product backlog with drag-drop ordering, refinement view, sprint capacity indicator. |
| --- |

| **Cap F**  ·  **Sprints (Scrum)** Time-boxed sprints with start/end dates, goal, capacity. Plan → Start → Active → Complete lifecycle. |
| --- |

| **Cap B**  ·  **WorkItem links ****&**** parent / sub-task** Relationship types: blocks, blocked-by, relates-to, duplicates, parent / sub-task. Visual link graph. |
| --- |

| **Cap F**  ·  **Swimlanes and quick filters** Group board by Epic, assignee, label. One-click chips (My items / Blockers / High priority). |
| --- |

| **Cap J**  ·  **Sprint reports** Burndown, velocity, commitment vs delivery, scope-change timeline, item outcomes. |
| --- |

| **Cap E**  ·  **Saved filters** Named persistent filters with sharing, ownership, subscribe-for-updates. |
| --- |

| **Cap G**  ·  **Attachments** Upload files with preview, virus scan, configurable size limits. Access scoped to work item permissions. |
| --- |

| **Cap G**  ·  **Activity log per work item** Chronological log of every change with diffs. Filterable by event type. |
| --- |

### **Use cases — concrete BCITS scenarios**

- Scrum team plans Sprint 1 — drags 15 stories from backlog with goal 'Stabilize portal, ship SAML'

- Mid-sprint, the team links a P0 incident to its parent epic to track scope addition

- Sprint review meeting opens the auto-generated sprint report to show stakeholders what shipped and what slipped

- Engineer attaches a design mockup to a story; PM previews without downloading

### **Benefits**

- Scrum teams have everything they need without external tools

- Sprint reports auto-generated from event data — no manual compilation

- Linked work items make dependencies visible — blockers identified before they delay delivery

- Saved filters become team-level knowledge of what matters

### **UI / UX considerations**

Sprint board reuses the Kanban from MVP — same visual language, with a sprint header showing goal and timeline. Swimlanes are an optional toggle, not always-on clutter. Sprint reports use the MVP design tokens — same color system, same typography — with rich data visualization.

### **AI integration**

*No AI yet. Continuing the foundation-first principle.*

### **Customization extension points**

*Custom sprint length (1, 2, 3, 4 weeks). Custom board columns per project. Custom link types beyond defaults.*

### **Estimated time**

4-6 weeks.

| **ITER** **3** | **RELEASE 3.0** **Workflows, Permissions ****&**** Custom Fields** *Works becomes configurable — teams customize workflows, fields, layouts, permissions to match their actual process.* |
| --- | --- |

| **Walking skeleton — what the user can do after this iteration** After iteration 3, an Works workspace can be tailored to any BCITS team's specific process — utility custom types, role-aware permissions, custom workflows. |
| --- |

### **Features in this iteration**

| **Cap C**  ·  **Visual workflow editor** Drag-drop builder for statuses and transitions per WorkItem type. Status categories. Color coding. |
| --- |

| **Cap C**  ·  **Roles and permissions matrix** Permission scheme — rows are permissions, columns are roles. Role assignment per project. |
| --- |

| **Cap C**  ·  **Field visibility rules per role** Per field, per role: Hidden / Read-only / Editable. Server-enforced field-level security. |
| --- |

| **Cap D**  ·  **Custom WorkItem types** Admin creates types like 'Meter Rollout', 'Tariff Change', 'Substation Commission' specific to BCITS. |
| --- |

| **Cap D**  ·  **Custom field library (17+ types)** Text, number, currency, date, select, multi-select, user picker, URL, checkbox, file, JSON, and more. |
| --- |

| **Cap D**  ·  **Layout designer** Drag-drop layout per type — field grouping, ordering, sections, columns. |
| --- |

| **Cap C**  ·  **Workflow conditions, validators, post-functions** Per-transition rules — 'only assignee can resolve', 'require comment on rejection', 'auto-set field'. |
| --- |

| **Cap E**  ·  **WIQL — Work Item Query Language** Composable query syntax used in filters, automations, rules, dashboards. One language everywhere. |
| --- |

### **Use cases — concrete BCITS scenarios**

- BCITS AMR team adds 'Substation Code', 'Meter Make', 'Firmware Version' fields to track utility-specific data

- Admin restricts customer-PII fields to support-agent role only — engineers cannot see customer details

- BCITS workflow: Bug → Triage → Investigating → Fix → Code Review → QA → Verified → Closed with role-gated transitions

- Power user writes WIQL filter 'priority = Highest AND assignee = currentUser() AND status != Done' for daily focus

### **Benefits**

- Domain data lives with the work — no spreadsheet sidebars

- Permission system protects sensitive customer data while enabling collaboration

- Workflow rigor without external scripting — process compliance built in

- WIQL is one syntax across all of Works — learn once, apply everywhere

### **UI / UX considerations**

Workflow editor is a horizontal flow diagram with drag-drop status nodes. Permission matrix is a clean checkbox grid with bulk-toggle by category. Custom field creation is wizard-based. Layout designer is true WYSIWYG drag-drop, not form-based config.

### **AI integration**

*Still no AI surface. Underlying data being captured (field types chosen, common WIQL queries) will feed AI suggestions later.*

### **Customization extension points**

*This iteration is largely about customization. Workflow per type per workspace. Field visibility per role per field. WIQL anywhere a filter appears.*

### **Estimated time**

4-6 weeks.

| **ITER** **4** | **RELEASE 4.0** **PM Artifacts — RAID, Decisions, Meetings** *Adds project-management vocabulary alongside software vocabulary. RAID logs, decision registers, action items, meeting notes — all first-class.* |
| --- | --- |

| **Walking skeleton — what the user can do after this iteration** After iteration 4, BCITS PMs and EPC managers have their full toolkit — RAID, decisions, meetings, action items, lessons learned. PM ceremonies move into Works. |
| --- |

### **Features in this iteration**

| **Cap H**  ·  **Risks register** Probability × impact matrix, mitigation plan, owner, review date, status. Linked to work items. |
| --- |

| **Cap H**  ·  **Assumptions log** Logged assumptions with rationale, validation status, owner, expiry date. Auto-prompt on expiry. |
| --- |

| **Cap H**  ·  **PM-style issues log** Project-level problems (distinct from software bugs) — problem, impact, resolution path. |
| --- |

| **Cap H**  ·  **Dependencies tracker** Cross-team / cross-project dependencies with deadline, status, blocker indicators. |
| --- |

| **Cap H**  ·  **Decisions register** Decision, alternatives considered, rationale, date, owner, supporting links, related risks. |
| --- |

| **Cap H**  ·  **Meeting notes** Structured capture — agenda, attendees, notes, decisions made, action items emitted. |
| --- |

| **Cap H**  ·  **Action items** Tasks from meetings/reviews with owner, due date, status. Auto-tracked, reminders, completion. |
| --- |

| **Cap H**  ·  **RAID dashboard per project** Single view of all open Risks, Assumptions, Issues, Dependencies. Heat indicators by severity. |
| --- |

| **Cap H**  ·  **Stakeholder register** Stakeholders with role, influence, interest, communication frequency, last-contacted date. |
| --- |

| **Cap H**  ·  **Lessons learned** Post-project knowledge — what worked, what didn't. Taggable, searchable, linkable. |
| --- |

### **Use cases — concrete BCITS scenarios**

- BCITS PM logs a risk: 'Substation 14 may not be commissioned by Sept 30 due to land dispute. Probability 60%, impact High.'

- Steering committee meeting captured as structured notes with auto-extracted action items assigned to attendees

- Architecture decision recorded: 'Chosen comms: LoRaWAN. Alternatives: NB-IoT, Sigfox. Date Mar 2026.'

- Project closure — team captures lessons learned, tagged for future projects to reference

### **Benefits**

- Works now speaks both software and project-management language

- Risks have probability × impact — proper risk management, not just status

- Decisions become permanent searchable knowledge — no 'who decided what when' archaeology

- Meeting action items become tracked artifacts with owners and deadlines

- RAID logs are regulator-and-auditor-ready for BCITS utility customers

### **UI / UX considerations**

PM artifacts get their own sidenav section under 'Project Management', distinguished from 'Work Items'. Each artifact type has a list view plus detail page. RAID dashboard uses heatmap visualization. Meeting notes use a block-based editor with structured sections (Agenda / Notes / Decisions / Actions).

### **AI integration**

*No AI surface yet, but data models are AI-friendly — meeting notes structured for later action-item extraction, decisions structured for later **'**find related decisions**'** search.*

### **Customization extension points**

*Custom risk categories. Custom impact / probability scales. Custom decision templates. Custom RAID review cadence. Custom meeting templates per type.*

### **Estimated time**

5-7 weeks.

| **ITER** **5** | **RELEASE 5.0** **Knowledge Repository + Versions** *Centralized workspace knowledge base — runbooks, ADRs, onboarding docs, customer KB. Plus version / release planning.* |
| --- | --- |

| **Walking skeleton — what the user can do after this iteration** After iteration 5, BCITS has a workspace knowledge base — runbooks, ADRs, customer KB, onboarding guides — searchable, versioned, linkable to work. |
| --- |

### **Features in this iteration**

| **Cap I**  ·  **Knowledge spaces** Workspace-level spaces (Engineering, Support, HR) with separate permissions and article hierarchy. |
| --- |

| **Cap I**  ·  **Rich article editor** Block-based editor with markdown shortcuts, embeds, tables, code blocks, Mermaid diagrams, images. |
| --- |

| **Cap I**  ·  **Article templates** Runbook, ADR, post-mortem, onboarding, KB article, troubleshooting guide. |
| --- |

| **Cap I**  ·  **Version history ****&**** restore** Every save creates a version. Diff view. Restore any prior version. |
| --- |

| **Cap I**  ·  **Article ↔ WorkItem linking** Bi-directional — articles cite work items, items link to articles. Context preserved. |
| --- |

| **Cap I**  ·  **Inline comments on articles** Discuss specific sections without polluting content. Comment threading. |
| --- |

| **Cap I**  ·  **Drafts ****&**** publishing workflow** Author → Review → Publish with required approvals before public visibility. |
| --- |

| **Cap I**  ·  **Article analytics** Views, helpful votes, citations from work items, search terms. Stale-article detection. |
| --- |

| **Cap J**  ·  **Versions and Releases** Define version (e.g., 'Portal v4.2.0'), assign items to fix/affect version, release / archive lifecycle. |
| --- |

| **Cap J**  ·  **Time tracking and worklogs** Manual time entries — original estimate, remaining, time spent. Per-user worklog history. |
| --- |

### **Use cases — concrete BCITS scenarios**

- Engineering team writes runbook 'Recover AMR mesh after substation outage' — linked from the incident type's default content

- Architecture team captures ADR: 'Why PostgreSQL over MongoDB for the meter event store'

- Onboarding doc auto-suggested when a new BCITS member joins a workspace

- Customer-facing KB article 'How to read your smart meter consumption report' published to customer portal

- Release planning — PM creates 'Portal v4.2.0', drags ready stories in, sees release scope visualization

### **Benefits**

- Knowledge survives team changes — runbooks, ADRs, playbooks become permanent organizational memory

- Linked to work items — knowledge has context

- Versioned and restorable — bad edits never destroy good content

- Sets up future RAG-based AI search (iteration 11) — knowledge already structured

- Releases give engineering a clear delivery rhythm

### **UI / UX considerations**

Knowledge gets its own sidenav section. Reading view is documentation-style (single column, generous whitespace, embedded TOC). Editor is full-width block-based. Article ↔ WorkItem links appear as inline cards. Version history is a side panel with diff-on-click.

### **AI integration**

*Knowledge structured for future RAG ingestion in iteration 11. Article templates designed with AI-friendly section markers.*

### **Customization extension points**

*Custom article templates. Custom space hierarchy. Custom permission schemes per space. Custom publishing workflows.*

### **Estimated time**

4-6 weeks.

| **ITER** **6** | **RELEASE 6.0** **Reports, Dashboards ****&**** Insights** *Self-service reporting — dashboards with widgets, full-page reports, scheduled delivery. Visibility for leads, managers, executives.* |
| --- | --- |

| **Walking skeleton — what the user can do after this iteration** After iteration 6, BCITS has visibility into delivery at every layer — individual, team, project, org. This is the natural Phase 1 gate for internal validation. |
| --- |

### **Features in this iteration**

| **Cap J**  ·  **Dashboard designer** Drag-drop grid with widgets. Personal, team, project, organization-level dashboards. |
| --- |

| **Cap J**  ·  **Widget library (20+ widgets)** Pie, bar, line, two-dim, scorecard, filter result, sprint health, burndown, cumulative flow. |
| --- |

| **Cap J**  ·  **Custom report builder** Visual builder for full-page reports with sections: chart, table, narrative, KPI grid. |
| --- |

| **Cap J**  ·  **Scheduled report delivery** Email or in-app delivery on a schedule. Per-recipient personalization. |
| --- |

| **Cap J**  ·  **Report templates** Sprint, release, project status, weekly digest, monthly executive summary, customer status. |
| --- |

| **Cap J**  ·  **Drill-down navigation** Click any chart element to see underlying items. Drill maintains filters and context. |
| --- |

| **Cap J**  ·  **Export PDF / Excel / PNG** Static exports for stakeholders without Works access. |
| --- |

| **Cap J**  ·  **Embeddable read-only dashboards** iframe-embeddable URLs for internal portals and customer-facing status pages. |
| --- |

### **Use cases — concrete BCITS scenarios**

- Team lead's daily dashboard: open bugs, sprint progress, blocked items, recent activity — one view, no filtering

- VP Engineering's weekly report auto-delivered Monday 8 AM — velocity trend, customer SLA health, open critical risks

- Project status report exported as PDF for steering committee

- Customer status page embedded into BCITS portal — customers see their requests and resolution status

### **Benefits**

- Self-service reporting — no separate BI deployment needed

- Scheduled delivery keeps stakeholders current without manual report prep

- Drill-down makes dashboards entry points to the underlying work, not dead ends

- Exports cover stakeholders without Works access (board members, regulators, customers)

### **UI / UX considerations**

Dashboard designer uses a 12-column responsive grid with snap-to-grid drag-drop. Widgets resize fluidly. Color palette stays muted — data takes center role. Empty dashboard state has a 'Start from template' guided flow, not a blank canvas.

### **AI integration**

*Still no AI in UI, but dashboard usage data captured for later AI-suggested-dashboards.*

### **Customization extension points**

*Custom dashboard layouts. Custom widget extensions. Custom report templates. Custom delivery routes. Custom calculated metrics.*

### **Estimated time**

5-7 weeks.

| **ITER** **7** | **RELEASE 7.0** **Compliance Rules Engine** *Native compliance — rule definitions, violation tracking, dashboards, audit log. The strategic differentiator for BCITS**'**s regulated customers.* |
| --- | --- |

| **Walking skeleton — what the user can do after this iteration** After iteration 7, BCITS has its strategic differentiator activated. Compliance posture is visible at a glance. Works becomes meaningfully different from Jira / ADO / OpenProject. |
| --- |

### **Features in this iteration**

| **Cap K**  ·  **Rule definition (visual builder)** WIQL scope + assertion + threshold + severity + notify-to. Test-before-activate. Save as template. |
| --- |

| **Cap K**  ·  **Seeded rule library (20+ templates)** Orphan story, stale item, missing estimate, scope creep, sprint without goal, unassigned in-progress. |
| --- |

| **Cap K**  ·  **Continuous rule evaluation** Rules run on every state change for continuous rules; periodic for scheduled rules. |
| --- |

| **Cap K**  ·  **Violation lifecycle** Open → Acknowledged → Resolved or Won't-Fix with audit trail. Bulk acknowledgement. |
| --- |

| **Cap K**  ·  **Severity routing** Per rule: notify item owner / project admin / specific user / Slack channel / email list. |
| --- |

| **Cap K**  ·  **Escalation policies** If not acknowledged in X hours, escalate to Y. Multi-step escalation chains. |
| --- |

| **Cap K**  ·  **Compliance dashboard** Severity breakdown, 30-day trend, rules × projects heatmap, drill-down to violations. |
| --- |

| **Cap K**  ·  **Compliance audit log** Append-only log of rule changes, violations, acknowledgements, resolutions. Regulator-ready exports. |
| --- |

| **Cap B**  ·  **Auto status duration tracking** Automatic projection of time each item spent in each status. Computed from event log. No manual logging. |
| --- |

### **Use cases — concrete BCITS scenarios**

- Engineering quality rule: 'Stories must have acceptance criteria before In Progress' — violations notify team lead

- Sprint hygiene rule: 'Sprint members must have at least one assigned item by Day 2' — catches forgotten members

- BCITS regulatory rule: 'Incidents affecting > 1000 meters must have root-cause analysis within 7 days'

- Audit prep: compliance officer exports last quarter's compliance posture as PDF for regulator review

- Status duration: 'P0 bugs average 4 hours in Triaging — too long; target is 1 hour'

### **Benefits**

- Compliance becomes operational, not aspirational — issues caught in hours, not at quarter-end

- Audit trail built-in — every violation, acknowledgement, resolution logged

- Custom rules — BCITS defines what compliance means for utility delivery

- Auto status duration enables honest cycle-time analysis without manual logging

- This is the capability that most differentiates Works against Jira / Azure DevOps / OpenProject

### **UI / UX considerations**

Compliance dashboard is the most data-dense screen but stays scannable through hierarchy: severity cards on top, trend chart, top-rules table, rules × projects heatmap, drill-down violations. Color usage restrained — red critical, amber warning, blue info. 'Resolve / Ack' buttons inline on every violation.

### **AI integration**

*Still no AI surface, but the rules engine is structured so AI suggestions in iteration 11 can propose new rules from observed patterns.*

### **Customization extension points**

*The visual rule builder is itself the customization framework. Custom severities, custom notification routing, custom escalation, custom violation lifecycle states.*

### **Estimated time**

6-8 weeks.

| **ITER** **8** | **RELEASE 8.0** **SLA Engine — Internal ****&**** Generalized** *Unified SLA engine for internal delivery commitments, ready for external customer SLAs in iteration 9.* |
| --- | --- |

| **Walking skeleton — what the user can do after this iteration** After iteration 8, BCITS engineering teams have explicit SLA commitments tracked in-tool. Code review delays and P0 resolution times become visible and managed. |
| --- |

### **Features in this iteration**

| **Cap M**  ·  **SLA policy definition** Scope (WIQL) + business-hours calendar + targets (response, resolution) + start/pause/stop triggers. |
| --- |

| **Cap M**  ·  **Business-hours calendars** Per-policy calendar (Mon-Fri 9-6 IST) with holidays and time zones. |
| --- |

| **Cap M**  ·  **Multiple SLA targets per policy** First response, resolution, escalation — multiple targets within one policy. |
| --- |

| **Cap M**  ·  **Pause / resume triggers** Auto-pause on 'Waiting on customer'; auto-resume on customer response. Full audit. |
| --- |

| **Cap M**  ·  **Visible countdown timers** On the work item — 'Resolve in 2h 14m'. Color changes as SLA approaches breach. |
| --- |

| **Cap M**  ·  **SLA escalation** Auto-reassign or notify when SLA at X% consumed or breached. Multiple escalation steps. |
| --- |

| **Cap M**  ·  **SLA reporting** Met / breached rates by period, team, policy. Trend analysis. |
| --- |

| **Cap M**  ·  **SLA audit log** Every start, pause, resume, breach logged immutably. Sourced from event store. |
| --- |

| **Cap M**  ·  **Bulk SLA application** Apply policy to many existing items at once with preview before commit. |
| --- |

### **Use cases — concrete BCITS scenarios**

- Internal SLA: 'P0 bugs resolved within 4 business hours, P1 within 16' — auto-applied based on priority

- Code review SLA: 'PRs reviewed within 24 business hours' — escalates to team lead at 22 hours

- Production incident SLA: 'P0 incidents acknowledged within 15 minutes, resolved within 4 hours'

- Compliance SLA: 'CEA-mandated incident reports filed within 24 hours of detection'

### **Benefits**

- Same engine that powers external customer SLAs in iteration 9 — no separate system to learn

- Business-hours aware — SLA pauses outside business hours, doesn't unfairly count weekends

- Visible countdown drives behavior — agents see the clock and work to it

- Escalation prevents silent breaches — alerts before, not after

### **UI / UX considerations**

SLA timer is a small badge on work item header — green (>50% remaining), amber (<50%), red-pulsing (breached). The work item detail page has a dedicated SLA panel with the full timeline including pause/resume events. SLA reports use the existing widget library.

### **AI integration**

*No AI yet. SLA breach prediction arrives in iteration 11.*

### **Customization extension points**

*Custom SLA policies. Custom business-hours calendars. Custom escalation chains. Custom pause/resume triggers. Custom customer-facing terminology.*

### **Estimated time**

5-7 weeks.

| **ITER** **9** | **RELEASE 9.0** **Service Management — Customer Portal** *External customer portal with self-service requests, queues, customer-facing SLAs, customer KB. The external face of Works — and the point Works becomes sellable.* |
| --- | --- |

| **Walking skeleton — what the user can do after this iteration** After iteration 9, Works is sellable to BCITS's first paying utility customers as a customer-facing service management product. This is the recommended commercial gate. |
| --- |

### **Features in this iteration**

| **Cap N**  ·  **Customer accounts** External user identity scoped to a customer organization. Separate auth flow from internal users. |
| --- |

| **Cap N**  ·  **Branded customer portal** White-labeled per customer — logo, colors, custom domain. Separate from internal Works UI. |
| --- |

| **Cap N**  ·  **Request types** Incident / Change Request / Service Request plus admin-defined custom types. |
| --- |

| **Cap N**  ·  **Portal forms per request type** Custom form per type with conditional fields. Visual form designer. Validation. |
| --- |

| **Cap N**  ·  **Agent queues** Pre-filtered work views for support agents — All open, Mine, Unassigned, High priority. |
| --- |

| **Cap M**  ·  **Customer-facing SLA** Countdown timer visible to both customer and agent. Built on iteration 8's SLA engine. |
| --- |

| **Cap N**  ·  **Customer-facing knowledge base** Subset of internal KB published to portal. Customer-search-optimized. |
| --- |

| **Cap N**  ·  **Customer satisfaction (CSAT)** Post-resolution rating with optional comment. CSAT trends in reporting. |
| --- |

| **Cap N**  ·  **Customer dashboard** Customer sees their open requests, history, SLA status, recent resolutions. |
| --- |

| **Cap N**  ·  **Multi-tier customer SLAs** Different SLA targets per customer tier (Platinum 30-min, Gold 2-hour, Silver 8-hour). |
| --- |

### **Use cases — concrete BCITS scenarios**

- BCITS utility customer logs an AMR mesh outage incident through their branded portal

- Customer admin submits change request for new user accounts — flows to BCITS support team

- Support agent picks up the incident from their queue, sees SLA timer counting down, resolves within target

- Customer rates resolved incident 4/5 — CSAT data flows back to BCITS quality team

- Platinum customer sees Platinum-tier SLA terms on their portal; Gold customer sees their own tier

### **Benefits**

- Self-service deflects routine tickets — customers solve their own problems via KB

- White-labeling means customer sees their brand, not generic Works

- Same SLA engine as internal — agents and customers see the same timer

- Integrated with internal work — what customer files becomes an internal Incident, no re-entry

- Works becomes sellable to existing BCITS utility customers as a packaged offering

### **UI / UX considerations**

Customer portal uses a separate, lighter visual identity — customer-friendly. Internal Works stays focused on power-user workflows. The portal must work for non-technical users — large hit targets, friendly labels, no jargon. Request submission is a 2-step flow (pick type → fill form), not one intimidating form.

### **AI integration**

*Still no AI surface, but the customer portal is designed to be the highest-value AI surface later: smart article suggestion at intake, request categorization, draft responses.*

### **Customization extension points**

*Domain customization (custom subdomain or full custom domain). Branding per customer. Custom request types. Custom forms. Customer-facing SLA terminology. Multi-language portal.*

### **Estimated time**

8-10 weeks.

| **ITER** **10** | **RELEASE 10.0** **AI Orchestration Foundation + AI Control Plane** *AI arrives — architected as opt-in, with on/off control at workspace, capability, user, and context levels. Every AI feature has a deterministic fallback.* |
| --- | --- |

| **Walking skeleton — what the user can do after this iteration** After iteration 10, Works has the AI architecture in place. Two AI surfaces work for opt-in users. Customers who can't use AI have a complete deterministic experience. |
| --- |

### **Features in this iteration**

| **Cap O**  ·  **AI Orchestration service** Central service all AI calls flow through. Intent detection, entity resolution, plan generation, validation, execution. |
| --- |

| **Cap O**  ·  **Confirmation-first pattern** AI proposes, system validates, user confirms, system executes deterministically. AI never silently mutates. |
| --- |

| **Cap Z**  ·  **Workspace AI policy** Admin sets AI enabled / disabled / opt-in per user. Locks downstream toggles within bounds. |
| --- |

| **Cap Z**  ·  **Per-capability AI toggle** Admin disables AI for specific capabilities while enabling others (e.g., off for compliance, on for story drafting). |
| --- |

| **Cap Z**  ·  **Per-user AI preference** User toggles AI for themselves within admin policy bounds. |
| --- |

| **Cap Z**  ·  **AI budget caps** Per-workspace monthly cap. Auto-degrade to cheaper model at 80%, auto-disable at 100%. |
| --- |

| **Cap Z**  ·  **AI usage dashboard** Per workspace / user / capability: tokens consumed, cost, rate. Cost projections. |
| --- |

| **Cap Z**  ·  **AI audit log** Every AI call: prompt, model, tokens, cost, outcome, on/off state. Auditable. |
| --- |

| **Cap Z**  ·  **Fallback documentation** Per AI feature, the deterministic behavior when AI is off. Documented and tested. |
| --- |

| **Cap Z**  ·  **Model tier selection** Admin picks model (Haiku fast/cheap, Sonnet balanced, Opus high-quality) per use case. |
| --- |

| **Cap Z**  ·  **Data boundary controls** Admin restricts which data types can be sent to AI (e.g., no PII, no financial). |
| --- |

| **Cap O**  ·  **Natural language → WIQL** First AI surface: 'open bugs assigned to me last week' becomes WIQL with preview. |
| --- |

| **Cap O**  ·  **Summarization** Second AI surface: comment threads, sprints, dashboards summarized. |
| --- |

### **Use cases — concrete BCITS scenarios**

- Regulated utility customer enables Works with AI completely disabled — no data leaves their workspace

- BCITS admin enables AI for engineering teams, disables it for the compliance team (deterministic only)

- Individual engineer toggles AI off for themselves — prefers cleaner UI without suggestions

- Cost-conscious admin sets ₹50,000/month AI budget — system auto-degrades at 80% consumed

- Engineer types 'open bugs assigned to Rahul fixed last week' — AI generates WIQL, shows preview, user confirms

### **Benefits**

- AI is opt-in — sellable to regulated, security-conscious, AI-skeptical customers

- Every AI feature has a documented deterministic fallback — no broken experience when AI is off

- Cost discipline built in — runaway AI spend impossible

- Audit log makes AI invocations regulator-verifiable

- Foundation for the rest of AI features — they all use this orchestration layer

### **UI / UX considerations**

AI button (topbar) is Works Orange — the highest-visibility accent. When AI is off, the button disappears entirely, not just dims. AI panels open as a side-rail (non-blocking), not a modal. Confirmation prompts use the same pattern across all AI features: 'Here's what I'll do: [plan]. [Confirm] [Edit] [Cancel].'

### **AI integration**

*This iteration IS about AI. Two surfaces ship — natural language to WIQL (high-utility, low-risk) and summarization (no-mutation). More in iteration 11.*

### **Customization extension points**

*The AI Control Plane is the customization surface for AI itself. Every AI behavior is policy-controlled.*

### **Estimated time**

6-8 weeks.

| **ITER** **11** | **RELEASE 11.0** **AI Expansion + Conversational Command Bar** *AI woven into every capability. The conversational command bar enables natural language input — type what you want, system does it after confirmation.* |
| --- | --- |

| **Walking skeleton — what the user can do after this iteration** After iteration 11, Works is fully AI-native. Opt-in users experience meaningfully greater productivity. Opt-out users have an unchanged deterministic product. |
| --- |

### **Features in this iteration**

| **Cap P**  ·  **Conversational command bar** 'Add Priya as developer in WEB team, email priya@bcits.com' parsed, validated, executed after confirmation. |
| --- |

| **Cap P**  ·  **Multi-action plans** 'Find P0 bugs assigned to me, move to In Progress, add comment Starting work today' — multi-step. |
| --- |

| **Cap P**  ·  **Plan preview ****&**** inline edit** Before executing, show exactly what will happen. User can edit any step before confirming. |
| --- |

| **Cap P**  ·  **Voice input** Microphone button — speak the command. Useful on mobile and for accessibility. |
| --- |

| **Cap P**  ·  **Multilingual command** Hindi, Hinglish, English. 'Bug WEB-1247 ko Rahul ko assign karo' works. |
| --- |

| **Cap O**  ·  **Smart triage on incoming items** AI suggests assignee, priority, component, similar past items from title and description. |
| --- |

| **Cap O**  ·  **Story / AC / test case generation** Specialized AI generators with templates. User confirms before content is saved. |
| --- |

| **Cap O**  ·  **AI comment drafting** AI drafts comments in context-appropriate tone. User edits before posting. |
| --- |

| **Cap O**  ·  **Anomaly explanation on charts** When dashboards show anomalies, AI explains why with citations. |
| --- |

| **Cap K**  ·  **AI-suggested compliance rules** AI observes patterns and proposes rules. Admin reviews, edits, activates. |
| --- |

| **Cap M**  ·  **SLA breach prediction** AI predicts likely breaches based on current trajectory and history. |
| --- |

| **Cap I**  ·  **RAG over knowledge base** AI answers grounded in workspace knowledge with citations. Powers KB Q&A. |
| --- |

| **Cap I**  ·  **AI article drafting** User describes the need; AI drafts; user edits and publishes. Templates respected. |
| --- |

| **Cap N**  ·  **Article suggestion at intake** Customer types problem; AI suggests KB articles to deflect ticket creation. |
| --- |

| **Cap N**  ·  **Smart customer request routing** AI auto-routes to the right team/agent by category, tier, expertise. |
| --- |

### **Use cases — concrete BCITS scenarios**

- PM types: 'Create a story in WEB: Implement OTP verification for portal login, assign to me, priority High'

- Support engineer asks: 'find similar past incidents' — AI returns ranked list with resolution patterns

- Customer types 'how do I read my consumption report' on portal — AI suggests 3 KB articles before ticket creation

- Product owner asks AI to draft release notes from completed sprint items — AI generates customer-friendly notes

- Dashboard shows velocity dropped 30% — AI explains 'Likely due to 2 team members on leave this sprint'

### **Benefits**

- Natural language access for non-power users — no learning WIQL or workflow editor

- Story / test case / runbook writing accelerated 5-10x

- Customer self-service deflection rate increases via KB suggestions

- Dashboards explain themselves — no need to ask an analyst what changed

- Multilingual command bar lowers the adoption barrier for non-English-first users

### **UI / UX considerations**

Command bar is the most prominent UI element — wide, top-center, with placeholder hints cycling through example commands. AI suggestions appear inline (not separate panels), feeling integrated. The AI button expands into a context-aware panel showing what AI can do on the current page.

### **AI integration**

*Iteration 11 is the broad AI expansion. Every capability gets an AI surface. All built on the iteration 10 orchestration layer.*

### **Customization extension points**

*Custom AI prompts per workspace (organizational tone). Custom command aliases. Custom AI assistants per role. Custom data boundaries.*

### **Estimated time**

8-10 weeks.

| **ITER** **12** | **RELEASE 12.0** **KPI Framework with Privacy Guardrails** *Layered metrics — individual data private by default, team data aggregated, manager view cannot drill into individuals. API-enforced privacy.* |
| --- | --- |

| **Walking skeleton — what the user can do after this iteration** After iteration 12, BCITS has visibility into team, project, and organizational health — without the trust-destroying surveillance pattern of individual comparison. |
| --- |

### **Features in this iteration**

| **Cap L**  ·  **Metric definitions and snapshots** Define via safe formula builder (not raw SQL). Snapshots saved per period — immutable. |
| --- |

| **Cap L**  ·  **Default metric catalog** Velocity, commitment accuracy, cycle time, lead time, rework, WIP, blocked time, bug escape, PR turnaround. |
| --- |

| **Cap L**  ·  **Custom metric builder** Safe formula primitives — sum, avg, percentile, count, ratio. Validation prevents privacy violations. |
| --- |

| **Cap L**  ·  **Personal view (private)** Individual's own metrics — visible only to them. Cycle time, throughput, completion rate. |
| --- |

| **Cap L**  ·  **Team view (aggregated)** Team-level metrics with no individual breakdown. Velocity, distribution, predictability. |
| --- |

| **Cap L**  ·  **Project view** Project-level rollup across contributing teams. Velocity per team, cross-team blockers. |
| --- |

| **Cap L**  ·  **Manager view (privacy-enforced)** Manager sees teams' aggregated metrics. API-enforced — no individual data access via UI or API. |
| --- |

| **Cap L**  ·  **Executive / Org view** Org-level trends. Cross-team velocity, customer SLA health, compliance posture. |
| --- |

| **Cap L**  ·  **Voluntary individual sharing** Engineer can choose to share personal metrics with specific people (e.g., during 1:1). |
| --- |

| **Cap L**  ·  **Team health composite** Predictability, scope stability, flow efficiency — composed scores over time. |
| --- |

| **Cap L**  ·  **Cycle time distribution** Histogram with median, P85, outlier flagging. Drill-down to outlier items. |
| --- |

| **Cap L**  ·  **AI team-health narrative** AI generates narrative: 'Predictability improved; scope stability declined due to mid-sprint additions.' |
| --- |

### **Use cases — concrete BCITS scenarios**

- Engineer's personal cycle-time dashboard — visible only to them. They voluntarily share before a 1:1.

- Team lead's team-health dashboard — predictability 82% (healthy), scope stability 68% (watch)

- Engineering manager sees 5 teams — only aggregated; cannot drill into individual engineer data even via API

- Executive sees org-wide velocity trend, compliance posture, customer SLA health on board-prep dashboard

- AI narrative: 'WEB team predictability dropped 12% this quarter. Likely cause: 3 mid-sprint scope additions from P0 escalations.'

### **Benefits**

- Healthy metrics culture — no individual-engineer comparison anti-pattern

- Privacy enforced at API, not just UI — managers cannot bypass via raw queries

- Default metric catalog gives BCITS reasonable defaults, customizable later

- Snapshots immutable — historical metrics never change retroactively, audit-safe

- AI narratives explain trends — managers know not just what changed but why

### **UI / UX considerations**

Layer switcher prominent at the top of the Performance section (Individual / Team / Project / Manager / Org). Privacy banner clearly visible on aggregated views. A locked-by-design 'Individual engineer comparison unavailable' callout explicitly frames this as a deliberate choice, not a missing feature.

### **AI integration**

*AI narratives use the iteration 10/11 orchestration layer. AI cannot bypass privacy guardrails — the orchestration layer enforces the same API access controls.*

### **Customization extension points**

*Custom metric definitions. Custom dashboards per layer. Custom health-composite thresholds. Per-workspace stricter-than-default privacy policy.*

### **Estimated time**

5-7 weeks.

| **ITER** **13** | **RELEASE 13.0** **Automation Engine + Integrations** *Visual automation builder, native integrations with Slack / GitHub / GitLab / email / calendar. Works becomes part of BCITS**'**s broader IT fabric.* |
| --- | --- |

| **Walking skeleton — what the user can do after this iteration** After iteration 13, Works is integrated with BCITS's existing tooling. Engineers, support staff, and customers interact through whichever interface fits their flow. |
| --- |

### **Features in this iteration**

| **Cap C**  ·  **Automation engine** Visual builder — 'When [trigger], if [condition], then [action]'. Multi-step chains. Branching logic. |
| --- |

| **Cap C**  ·  **Scheduled automations** Cron-style rules. 'Every Monday 9 AM, post sprint summary to team channel.' |
| --- |

| **Cap C**  ·  **Automation library / templates** Pre-built rule templates installed with one click. Community + BCITS internal library. |
| --- |

| **Cap C**  ·  **Test mode for automations** Dry-run mode to preview effects before activating. |
| --- |

| **Cap C**  ·  **Automation audit log** Append-only log of every run with inputs and outputs. Failure tracking. |
| --- |

| **Cap Q**  ·  **Outbound webhooks** Per event type, with retry, signing, dead-letter queue. Integrate with BCITS internal systems. |
| --- |

| **Cap Q**  ·  **Public REST API + OAuth 2.0** Fully documented OpenAPI 3.1 spec. Every UI action available via API. |
| --- |

| **Cap A**  ·  **SSO (SAML, OIDC) and SCIM** Single sign-on, SCIM 2.0 provisioning. Enterprise identity ready. |
| --- |

| **Cap Q**  ·  **Slack connector (native)** Link channels to projects. /works commands. Send work-item updates to channels. |
| --- |

| **Cap Q**  ·  **GitHub / GitLab connector** PR linking, commit references, automatic status sync. |
| --- |

| **Cap Q**  ·  **Email connector** Inbound: email → work item. Outbound: notifications, digests. |
| --- |

| **Cap Q**  ·  **Calendar (Google / Outlook)** Sprint dates and ceremonies sync to team calendar. Meeting notes link to events. |
| --- |

### **Use cases — concrete BCITS scenarios**

- Automation: 'When customer-portal request created with severity P0, assign to on-call, notify #incidents Slack, set SLA timer'

- Engineer's GitHub PR linked to WEB-1247 — when merged, item auto-transitions to Done with merge-commit link

- Email integration: customer emails support@bcits.com → creates a customer-facing work item with proper request type

- Slack: team lead types '/works sprint summary' in #engineering — bot posts current sprint health

- Calendar: sprint planning meeting auto-created in team Google Calendar with all members as attendees

### **Benefits**

- No 'and now a 5th tool' fatigue — Works works with what BCITS uses

- Routine work disappears — automations handle it

- Engineering workflows (code → review → merge → release) tracked end-to-end

- Email-driven customer interactions captured as structured work items

- Works becomes the home base, not yet another silo

### **UI / UX considerations**

Automation builder uses node-and-arrow visual flow. Test mode is side-by-side preview: 'If activated now, this rule would affect 23 items.' Connectors are wizard-guided OAuth setup — under 5 minutes per integration.

### **AI integration**

*AI proposes automation rules from observed patterns. AI assists integration config via natural language.*

### **Customization extension points**

*Custom automation rules. Custom webhook payloads. Custom OAuth scopes. Custom event types. Custom integration UIs.*

### **Estimated time**

6-8 weeks.

| **ITER** **14** | **RELEASE 14.0** **Developer Workspace + IDE Extension** *Purpose-built surface for engineers — IDE extension, focus mode, standup helper, private personal velocity. The first role-tuned surface.* |
| --- | --- |

| **Walking skeleton — what the user can do after this iteration** After iteration 14, BCITS engineers have a meaningfully better experience than in Jira / ADO / OpenProject. The Developer Workspace is a clear adoption driver. |
| --- |

### **Features in this iteration**

| **Cap U**  ·  **Developer Workspace home** Today's work, PRs to review, blockers, focus blocks, recent activity. |
| --- |

| **Cap U**  ·  **VS Code extension** Sidebar with work item context. Inline commit linking. Status updates from editor. AC checklist in IDE. |
| --- |

| **Cap U**  ·  **JetBrains extension** Feature parity for IntelliJ / PyCharm / WebStorm users. |
| --- |

| **Cap U**  ·  **Code review queue** Personalized queue of PRs needing review, ranked by urgency and expertise. |
| --- |

| **Cap U**  ·  **Focus mode** Suppress non-urgent notifications during scheduled focus blocks. Only P0 incidents break through. |
| --- |

| **Cap U**  ·  **Standup helper** Auto-drafts yesterday / today / blockers from work item and git activity. User edits before posting. |
| --- |

| **Cap U**  ·  **Personal velocity (private)** Own cycle time, throughput, completion rate. Private. Never visible to manager. |
| --- |

| **Cap U**  ·  **Time blocking** Calendar-integrated focus block scheduler. Works respects blocked time. |
| --- |

| **Cap U**  ·  **Definition-of-done checklists** Per type or epic — checklists that must complete before resolving. |
| --- |

| **Cap U**  ·  **CLI tool (works command)** Terminal interface for transitions, comments, search. Power-user productivity. |
| --- |

| **Cap U**  ·  **Code context on work item** Commits, branches, files touched, PR status alongside the work item. |
| --- |

### **Use cases — concrete BCITS scenarios**

- Engineer's morning: opens Developer Workspace — 3 PRs to review, 2 items In Progress, 1 P0 incident waiting

- In VS Code, sidebar shows WEB-1247 context — description, AC, recent comments — as engineer codes

- Engineer commits 'WEB-1247: fix CSRF refresh' — Works auto-links, updates status when PR opens

- Afternoon focus block — Slack muted, only P0 incident notifications get through

- End of day: standup helper drafts 'Shipped WEB-1247, on WEB-988-1 tomorrow, blocked on design review' — engineer confirms

### **Benefits**

- Engineers spend time engineering, not project-managing

- Code and work item context connected — no tab switching

- Personal velocity private — psychological safety preserved

- Standup auto-drafted from actual work, not memory

- Focus mode protects deep work without missing critical alerts

### **UI / UX considerations**

Developer Workspace home is information-dense but uses cards with clear hierarchy. IDE extension is keyboard-first. CLI tool follows Unix conventions. Focus mode shows a status indicator — others see 'In focus until 12 PM' on the engineer's avatar.

### **AI integration**

*AI drafts standup updates. AI ranks the PR review queue. AI explains unfamiliar code on linked items. AI proposes item updates from commit messages.*

### **Customization extension points**

*Custom focus-mode schedules. Custom notification rules. Custom standup template. Custom IDE-extension settings. Custom DoD checklists.*

### **Estimated time**

6-8 weeks.

| **ITER** **15** | **RELEASE 15.0** **Scrum Master Cockpit + Product Owner Workspace** *Two more role-tuned surfaces — SM cockpit for sprint/standup/retro/impediments, PO workspace for roadmap/backlog/customer-feedback/release-notes.* |
| --- | --- |

| **Walking skeleton — what the user can do after this iteration** After iteration 15, BCITS Scrum Masters and Product Owners have meaningfully better workflows. These role-tuned surfaces are the most demo-able product addition. |
| --- |

### **Features in this iteration**

| **Cap V**  ·  **Sprint planning helper** Capacity calculator, AI-suggested commit based on velocity, refined-item suggestion list. |
| --- |

| **Cap V**  ·  **Standup facilitator** Sequential per-member flow, time-boxed, auto-records updates, flags missing. |
| --- |

| **Cap V**  ·  **Impediment tracker** First-class artifact with owner, severity, age, escalation. Not buried in chat. |
| --- |

| **Cap V**  ·  **Mid-sprint risk panel** Live view of scope creep, stale items, zero-assignment members, breach predictions. |
| --- |

| **Cap V**  ·  **Retro toolkit** Template gallery (4Ls, Start/Stop/Continue, Mad/Sad/Glad), action capture, anonymous mode. |
| --- |

| **Cap V**  ·  **Sprint review prep** Auto-drafts sprint summary, demo list, metrics for stakeholders. |
| --- |

| **Cap V**  ·  **Cross-sprint pattern detection** Recurring impediments, repeated estimation misses, common scope-creep sources. |
| --- |

| **Cap W**  ·  **Product roadmap** Visual timeline of themes / epics across quarters. Status, scope, dates per theme. |
| --- |

| **Cap W**  ·  **Backlog refinement helper** AI ranks backlog by criteria (value/effort/strategic-fit). Suggests items needing detail. |
| --- |

| **Cap W**  ·  **Idea capture inbox** Lightweight inbox. Auto-classifies by area. Promotes to story when ready. |
| --- |

| **Cap W**  ·  **Customer feedback aggregation** Pull from portal, email, comments. Cluster into themes with sentiment. |
| --- |

| **Cap W**  ·  **OKR linkage** Link items to OKRs. Visualize progress at item, epic, theme level. |
| --- |

| **Cap W**  ·  **Release notes auto-draft** AI drafts user-facing release notes from completed items. PO edits and publishes. |
| --- |

| **Cap W**  ·  **Stakeholder map** Stakeholders with role, influence, interest. Targeted release / status communication. |
| --- |

### **Use cases — concrete BCITS scenarios**

- Scrum Master opens cockpit Monday — risk panel shows 2 stale items, 1 P0 customer addition, predicted breach on WEB-988-1

- Standup runs in cockpit — each member's turn, time-boxed 2 min, updates auto-recorded

- Retro: SM picks Mad/Sad/Glad template, team contributes, action items auto-emitted as tracked artifacts

- PO sees AI-clustered customer feedback: 47 items → 5 themes (auth, mobile UI, billing accuracy, reports, integrations)

- PO drags 8 ready items into 'Portal v4.2.0' — AI drafts release notes from item descriptions

- PO sees 3 stakeholders care about SAML rollout — sends targeted update only to them

### **Benefits**

- Scrum ceremonies are tool-supported, not tool-burdened

- Impediments tracked as first-class objects, not buried in chat

- Retro action items don't get lost — they auto-populate as tracked artifacts

- PO has a strategic surface — roadmap, customer voice, release planning in one place

- Customer feedback synthesizes into themes — no manual reading of 47 emails

### **UI / UX considerations**

SM Cockpit is dashboard-style with prominent action buttons (Start standup, Plan sprint, Run retro). PO Workspace is timeline-and-card style — roadmap front and center. Both reuse the MVP design system — tuned layouts, no new visual language.

### **AI integration**

*AI proposes sprint commit, generates retro topics, clusters customer feedback, drafts release notes. All on the iteration 10/11 foundation.*

### **Customization extension points**

*Custom standup flow. Custom retro templates. Custom impediment categories. Custom prioritization criteria. Custom roadmap themes. Custom OKR hierarchies.*

### **Estimated time**

7-9 weeks.

| **ITER** **16** | **RELEASE 16.0** **Leadership Console + Admin Operations Center** *Two more role surfaces — Leadership Console for cross-team rollup and AI executive briefing, Admin Ops Center for user lifecycle and operations.* |
| --- | --- |

| **Walking skeleton — what the user can do after this iteration** After iteration 16, BCITS leadership and administration have meaningfully better daily workflows. All 5 role surfaces are live — Developer, SM, PO, Leadership, Admin. |
| --- |

### **Features in this iteration**

| **Cap X**  ·  **Cross-team rollup dashboard** Aggregated metrics across all teams under the leader's scope. Permission-aware. |
| --- |

| **Cap X**  ·  **AI executive briefing** Weekly auto-generated narrative tailored to the leader's priorities. Configurable tone, length, focus. |
| --- |

| **Cap X**  ·  **Strategic theme tracker** Each theme: progress, contributing items, owners, risks. Drill-down to underlying work. |
| --- |

| **Cap X**  ·  **Resource allocation view** Who is on what, capacity utilization, over/under-allocation. Rebalancing suggestions. |
| --- |

| **Cap X**  ·  **Risk portfolio** All open risks across projects, ranked by impact × probability. Aggregated from RAID logs. |
| --- |

| **Cap X**  ·  **Customer health dashboard** Per-customer composite of SLA, escalations, CSAT, churn-risk indicators. |
| --- |

| **Cap X**  ·  **Strategy-to-execution map** Visual link from OKRs / themes down to specific work items. Full traceability. |
| --- |

| **Cap X**  ·  **Board deck auto-draft** Generates quarterly board deck slides for the engineering / delivery section. |
| --- |

| **Cap Y**  ·  **User lifecycle automation** Onboarding / offboarding playbooks with role-aware steps and audit trail. |
| --- |

| **Cap Y**  ·  **License / seat management** Active seats, available seats, cost per seat, growth projection. Renewal alerts. |
| --- |

| **Cap Y**  ·  **Workspace health monitor** Storage, API rates, AI cost, integration status — single admin dashboard. |
| --- |

| **Cap Y**  ·  **AI cost dashboard** Cost by user, feature, capability. Budget vs actual. Threshold alerts. |
| --- |

| **Cap Y**  ·  **Audit log explorer** Filterable, exportable browse of all audit events. Saved queries. Pattern surfacing. |
| --- |

| **Cap Y**  ·  **Integration health dashboard** Status of webhooks, OAuth connections, integrations. Retry / replay on failure. |
| --- |

| **Cap Y**  ·  **Access review** Periodic review prompts. Bulk-deactivate inactive users. Report generation. |
| --- |

| **Cap Y**  ·  **Compliance evidence package** On-demand SOC 2 / ISO 27001 evidence bundle. Audit-ready PDFs. |
| --- |

### **Use cases — concrete BCITS scenarios**

- CTO's Monday: Leadership Console shows AI briefing — what shipped, what slipped, key risks, customer SLA health

- VP Engineering sees WEB team over-allocated, AMR under-utilized — AI suggests rebalancing 2 engineers

- Quarterly board prep: 'Generate board deck' creates a 12-slide engineering section with current data

- Admin onboards a new hire — playbook creates user, assigns roles, adds to teams, provisions integrations in 9 minutes

- Quarterly access review — admin sees 23 inactive users, bulk-deactivates with audit log entry

- AI cost: admin sees the workspace on track to hit budget cap on day 25 — adjusts before billing

### **Benefits**

- Strategic visibility without manual rollup every Monday

- AI briefing replaces 'send me a status update' emails

- Resource imbalances surface before they become attrition issues

- Onboarding from 90 minutes to 9 minutes

- Offboarding is 100% reliable — no orphaned access

- Compliance evidence on-demand — auditor prep from weeks to minutes

### **UI / UX considerations**

Leadership Console is glance-and-go — large stat cards, AI briefing prominent, drill-down on hover. Admin Ops Center is operational — checklists, status indicators, action buttons. Both reuse the design system. The AI executive briefing is an editable, schedulable card.

### **AI integration**

*AI generates briefings, predicts churn risk, proposes resource rebalancing, drafts board decks, generates compliance reports, detects access anomalies. All on iteration 10/11.*

### **Customization extension points**

*Custom briefing schedule and content. Custom themes. Custom rollup hierarchies. Custom onboarding playbooks. Custom AI cost caps.*

### **Estimated time**

8-10 weeks.

| **ITER** **17** | **RELEASE 17.0** **Universal Customization Engine** *Configuration framework — templates, versioning, sandbox, rollback. Makes Works usable across BCITS**'**s diverse customer base without per-team forks.* |
| --- | --- |

| **Walking skeleton — what the user can do after this iteration** After iteration 17, Works is genuinely universally customizable — admins tune every behavior without engineering tickets. BCITS onboards new customers with template-based config. |
| --- |

### **Features in this iteration**

| **Cap R**  ·  **Workspace settings (centralized)** Branding, locale, timezone, working calendar, defaults — one settings surface for all config. |
| --- |

| **Cap R**  ·  **Configuration templates** Save current config as template. Apply to new workspace. Internal library + customer-shareable. |
| --- |

| **Cap R**  ·  **Configuration versioning** Every config change creates a version. Diff view. Roll back to any prior version. |
| --- |

| **Cap R**  ·  **Sandbox mode** Preview workspace where config changes are tested before promotion. Realistic test data. |
| --- |

| **Cap R**  ·  **Config import / export** Move config between workspaces as JSON / YAML. Backup. Source-control friendly. |
| --- |

| **Cap R**  ·  **Lockable settings** Admin locks settings so users cannot change them. Useful for compliance-bound customers. |
| --- |

| **Cap R**  ·  **Configuration diff** Compare two config versions side by side. Useful for support and audit. |
| --- |

| **Cap R**  ·  **Config impact analysis** Before applying, show what existing data and users will be affected. |
| --- |

| **Cap R**  ·  **Custom forms designer** Drag-drop form builder for any data-entry surface. Conditional fields. Custom validation. |
| --- |

| **Cap R**  ·  **Custom views / pages** Build custom landing pages with chosen widgets and content. Per-role assignments. |
| --- |

| **Cap R**  ·  **Extension API (code-level)** JavaScript-based extension points for rare cases UI is insufficient. Sandboxed. |
| --- |

### **Use cases — concrete BCITS scenarios**

- BCITS support creates a 'Utility Customer Workspace Template' with all utility custom types, fields, workflows, rules — applies to each new customer

- Admin tests a workflow change in sandbox — sees 47 items would auto-transition, decides to bulk-acknowledge first

- Customer A's config diverges from template — admin runs diff, decides which customizations to merge back

- Quarterly: admin exports config as JSON, commits to source control, full audit trail of changes

### **Benefits**

- BCITS doesn't need engineering tickets for routine config changes

- Customer onboarding configs stored as reusable templates

- Configuration versioning means bad changes are recoverable

- Sandbox prevents production breakage from experimentation

- Code-level extension exists for the rare cases UI cannot express

### **UI / UX considerations**

Configuration surface is hierarchical — Workspace → Capabilities → Settings. Each setting has inline version history. Sandbox is a labeled separate environment with obvious visual distinction. Impact analysis is a pre-confirmation summary: 'Affects 47 items, 3 users, 2 automations. Continue?'

### **AI integration**

*AI proposes config templates from natural language (**'**we**'**re a regulated utility doing AMR rollouts**'**). AI generates config from patterns. AI flags risky configurations.*

### **Customization extension points**

*Customization itself is customizable — admin locks settings, exposes others. Per-workspace privacy policies override defaults.*

### **Estimated time**

6-8 weeks.

| **ITER** **18** | **RELEASE 18.0** **Mobile + Real-time + Performance** *Native mobile apps, real-time co-presence, performance hardening. Works feels like a 2026 product on every device.* |
| --- | --- |

| **Walking skeleton — what the user can do after this iteration** After iteration 18, Works is a fully modern 2026 product — works on every device, real-time collaborative, performant, observable. |
| --- |

### **Features in this iteration**

| **Cap S**  ·  **Native iOS app** Swift-based with push notifications, biometric auth, offline drafts. Parity for common workflows. |
| --- |

| **Cap S**  ·  **Native Android app** Kotlin-based with feature parity. Material Design 3. |
| --- |

| **Cap S**  ·  **Mobile-optimized PWA** Responsive PWA — works without app install. Offline via service worker. |
| --- |

| **Cap S**  ·  **Offline mode** Read and create drafts offline; sync on reconnect. Conflict resolution UI. |
| --- |

| **Cap S**  ·  **Push notifications** Per-user, per-event-type with quiet hours and snooze. P0 overrides quiet hours. |
| --- |

| **Cap S**  ·  **Biometric auth** Face ID / Touch ID / Android biometric for app unlock. |
| --- |

| **Cap S**  ·  **Real-time co-presence** Live cursors, simultaneous editing without conflicts. WebSocket-based. |
| --- |

| **Cap S**  ·  **Real-time updates** Server-sent events propagate updates to all open clients within 1 second. |
| --- |

| **Cap S**  ·  **Command palette** Cmd-K fuzzy search across all actions, items, people. |
| --- |

| **Cap S**  ·  **Keyboard shortcuts** Comprehensive shortcuts for every common action. Customizable per user. |
| --- |

| **Cap S**  ·  **Performance SLAs** P95 latency targets per operation. Monitoring. Regressions caught in CI. |
| --- |

| **Cap S**  ·  **Observability** OpenTelemetry tracing across services. Structured logs. In-product status page. |
| --- |

### **Use cases — concrete BCITS scenarios**

- AMR field engineer logs site observations from phone in low-bandwidth area — draft saved offline, syncs later

- On-call engineer triages P0 incident from a coffee shop — receives critical push despite quiet hours

- Executive opens Leadership Console on tablet during a board meeting — same experience as desktop

- Two engineers in different cities triage the same incident — see each other's cursors and edits live

- Power user opens Cmd-K, types 'create story portal login', selects the action — form opens

### **Benefits**

- Mobile is first-class, not an afterthought

- Offline drafts sync — connectivity issues don't lose work

- Real-time eliminates 'stale view' bugs

- Performance feels instant for common operations

- Observability built in — fast incident diagnosis

### **UI / UX considerations**

Mobile apps use platform-native patterns (iOS Navigation, Android Material), not a wrapped web view. Touch targets meet 44pt minimum. Bottom navigation for primary actions. Real-time presence is subtle — small avatars in the editor corner, not intrusive.

### **AI integration**

*AI on mobile uses smaller, faster models for low latency. AI offline falls back to cached prompts. Mobile summaries are shorter, optimized for small screens.*

### **Customization extension points**

*Mobile-specific dashboards. Mobile push preferences. Per-workspace performance tier. Per-user keyboard shortcut customization.*

### **Estimated time**

8-10 weeks.

| **ITER** **19** | **RELEASE 19.0** **Enterprise Security + Compliance Certifications** *SOC 2 / ISO 27001 ready. Advanced security — data residency, customer-managed keys, conditional access, comprehensive audit.* |
| --- | --- |

| **Walking skeleton — what the user can do after this iteration** After iteration 19, Works meets enterprise security and compliance bars. BCITS can sell to security-conscious utilities, regulated industries, and government customers. |
| --- |

### **Features in this iteration**

| **Cap T**  ·  **Passkeys (WebAuthn)** Phishing-resistant auth. Replaces password for security-conscious organizations. |
| --- |

| **Cap T**  ·  **Conditional access policies** IP allowlist, device requirements, geo restrictions, time-of-day. Per-workspace and per-role. |
| --- |

| **Cap T**  ·  **Append-only audit log (enhanced)** Every event, immutable, with cryptographic chain. Tamper-evident. |
| --- |

| **Cap T**  ·  **Audit log UI (browsable)** Filter, search, export. Pattern detection. Saved queries. |
| --- |

| **Cap T**  ·  **Audit log streaming** Stream to external SIEM (Splunk, Datadog, ELK) for centralized monitoring. |
| --- |

| **Cap T**  ·  **Data residency options** Workspace stored in India, EU, US, etc. based on customer requirements. |
| --- |

| **Cap T**  ·  **Encryption at rest with BYOK** AES-256 with customer-managed keys option. Customer provides KMS key. |
| --- |

| **Cap T**  ·  **Anomaly detection on access** AI flags unusual patterns (new geo, mass-export, permission escalation). |
| --- |

| **Cap T**  ·  **Data export (GDPR / DPDP)** Per-user data export for data subject access requests. |
| --- |

| **Cap T**  ·  **Right to be forgotten** Per-user data deletion with audit log preservation. |
| --- |

| **Cap T**  ·  **Penetration test program** Annual third-party pen tests. Results under NDA. Continuous internal red-teaming. |
| --- |

| **Cap T**  ·  **Compliance certifications** SOC 2 Type 2, ISO 27001 — earned this iteration. Required for enterprise sales. |
| --- |

### **Use cases — concrete BCITS scenarios**

- Utility customer requires data residency in India — Works provisions workspace in India region

- Customer CISO requires customer-managed keys — admin configures BYOK with the customer's KMS

- Suspicious activity — admin sees anomaly alert (new login from Singapore at 3 AM), forces logout, investigates

- GDPR data subject access request — admin exports all data for one user in 5 minutes

- Customer requests SOC 2 report — admin generates compliance evidence package, sends under NDA

### **Benefits**

- Sellable to enterprise customers — security is not an after-the-fact retrofit

- Compliance certifications open enterprise sales channels

- Customer-managed keys answer 'we can't trust the vendor with our data'

- Data residency answers regulatory requirements

- Cryptographic audit chain provides forensic-grade evidence

### **UI / UX considerations**

Security surface is admin-centric — operational dashboards, clear and complete. Audit log explorer uses the same filtering UX as work item search. Compliance evidence package is one-click generation with status (Building → Ready → Downloaded).

### **AI integration**

*AI anomaly detection on access patterns. AI generates audit report narratives. AI proposes security policy improvements from incident patterns.*

### **Customization extension points**

*Custom audit retention. Custom data residency regions. Custom key management. Custom access policies. Custom anomaly thresholds.*

### **Estimated time**

8-10 weeks.

| **ITER** **20** | **RELEASE 20.0** **Polish, Advanced AI, Marketplace Foundation** *Final polish, advanced AI (multi-step agents, custom assistants), and the foundation for a third-party marketplace.* |
| --- | --- |

| **Walking skeleton — what the user can do after this iteration** After iteration 20, Works is commercially complete — sellable to enterprise customers, internationally, with a third-party ecosystem, fully accessible, fully secure. |
| --- |

### **Features in this iteration**

| **Cap O**  ·  **Multi-step AI agents** Agents that complete complex tasks — 'Triage all P0 customer requests from last 24 hours' across capabilities. |
| --- |

| **Cap O**  ·  **Custom AI assistants** Workspace-defined assistants with personas — 'BCITS Compliance Assistant', 'AMR Domain Expert'. |
| --- |

| **Cap O**  ·  **AI memory / context** AI remembers conversation context, preferences, workspace history across sessions. |
| --- |

| **Cap R**  ·  **App marketplace (foundation)** Third-party extensions installable to a workspace. Listing infrastructure. Permission scoping. |
| --- |

| **Cap R**  ·  **Developer portal** Documentation, SDK, sandbox for third-party developers to build Works extensions. |
| --- |

| **Cap O**  ·  **Conversational dashboards** Dashboards from natural language: 'Show velocity per team, last 6 sprints, with predictability composite'. |
| --- |

| **Cap S**  ·  **Performance hardening (final)** P95 targets met across all operations. Load testing at 10x scale. Query optimization. |
| --- |

| **Cap A**  ·  **Accessibility audit (WCAG 2.2 AA)** Full audit and remediation. Screen reader optimization. Keyboard-only navigation. |
| --- |

| **Cap T**  ·  **Final security hardening** Static + dynamic analysis, pen test, bug bounty launch, security disclosure policy. |
| --- |

| **Cap A**  ·  **Localization (10+ languages)** UI in English, Hindi, Spanish, French, German, Portuguese, Japanese, Mandarin, Arabic, Korean. |
| --- |

| **Cap I**  ·  **Advanced knowledge features** Document templates, multi-author collaboration, structured data extraction. |
| --- |

| **Cap N**  ·  **Customer chat support** Real-time chat on customer portal with AI tier-1 + human escalation. |
| --- |

### **Use cases — concrete BCITS scenarios**

- Multi-step agent: 'Triage all P0 customer requests from last 24 hours — categorize, suggest assignees, draft responses' — 12 requests in 8 minutes

- Custom assistant: BCITS Compliance Assistant answers 'what's our current CEA compliance status?' with citations

- Third-party developer publishes 'Works GitLab Issue Sync' — BCITS workspaces install with one click

- Hindi-speaking BCITS engineer uses Works fully in Hindi UI

- Accessibility: a blind engineer at a customer org uses Works fully via screen reader

### **Benefits**

- Works is genuinely 2026-modern across all dimensions

- Third-party marketplace creates an ecosystem — Works isn't isolated

- Localization opens international markets beyond India

- Accessibility is real (audited), not aspirational

- Custom AI assistants make Works feel uniquely tuned to each customer

### **UI / UX considerations**

Final polish — micro-interactions, animation refinement, edge-case handling. Marketplace UI is curated and trusted-feeling. Accessibility doesn't compromise design — accessible IS the design.

### **AI integration**

*Multi-step agents via Claude function calling. Custom assistants with workspace-specific system prompts. AI memory using long context. Conversational dashboards via natural language to widget composition.*

### **Customization extension points**

*Custom AI assistant personas. Custom marketplace extensions. Custom localization. Custom accessibility preferences.*

### **Estimated time**

10-14 weeks.

# **Part 8 — AI Control Plane Summary**

The AI Control Plane makes Works's AI-at-center commitment compatible with regulated, security-conscious, and AI-skeptical customers. Every AI feature has documented on / off states with deterministic fallbacks.

## **8.1 Four-level scope hierarchy**

| **Level** | **Who sets** | **What it controls** | **Default** |
| --- | --- | --- | --- |
| Workspace policy | Workspace admin | AI enabled / disabled / opt-in across the workspace | Enabled, user opt-out allowed |
| Capability toggle | Workspace admin | Specific capabilities AI-off while others on | Inherits workspace policy |
| User preference | Individual user | Personal toggle within admin bounds | Inherits workspace default |
| In-context override | Anyone (transient) | Per-board / per-item toggle for sensitive contexts | Inherits user preference |

Higher-level restriction wins. Admin can't force AI on for a user who wants it off. The most-restrictive setting applies.

## **8.2 What****'****s hidden when AI is off**

- AI assistant button (topbar) — entirely hidden, not dimmed

- 'Generate with AI' buttons in editors — hidden

- AI suggestions next to fields — hidden

- AI summaries and anomaly explanations on dashboards — hidden; charts shown standalone

- AI executive briefing — replaced with a structured digest

## **8.3 What still works when AI is off**

- All work item CRUD, board operations, sprints, comments

- All search — full-text and WIQL (natural language → WIQL hidden)

- Conversational command bar — degrades to keyword search + exact commands

- All compliance rules, SLA tracking, KPI computation

- All dashboards (without AI narrative), integrations, automations, customizations

## **8.4 Cost discipline**

- Per-workspace monthly AI budget (admin-configurable)

- At 80%: auto-degrade to a cheaper model tier (Haiku instead of Sonnet)

- At 100%: auto-disable; admin can override with explicit confirmation

- Per-user rate limits; response caching (~40% reduction); smaller models for simple tasks

| **Audit and compliance** Every AI invocation logged: timestamp, user, capability, prompt size, model tier, tokens, cost, AI policy state. Auditors can verify: 'Was AI on when this happened?' or 'Did this customer's data ever pass through an AI provider?' AI-off state recorded as explicitly as AI-on. This makes Works sellable to regulated customers. |
| --- |

# **Part 9 — Five Role-Tuned Productivity Surfaces**

Five purpose-built surfaces, one per primary role. Same underlying data, same permissions — only the surface changes. Role surfaces are layout configurations on top of shared components, not separate apps.

## **9.1 At a glance**

| **Role** | **Surface** | **Primary daily activity** | **Iteration** |
| --- | --- | --- | --- |
| Developer | Developer Workspace (Cap U) | Code, review PRs, update work items | 14 |
| Scrum Master | Scrum Master Cockpit (Cap V) | Planning, standup, retro, impediments | 15 |
| Product Owner | Product Owner Workspace (Cap W) | Backlog refinement, roadmap, stakeholders | 15 |
| Leader / Mgmt | Leadership Console (Cap X) | Cross-team rollup, strategic themes | 16 |
| Admin | Admin Operations Center (Cap Y) | User lifecycle, licenses, integrations | 16 |

## **9.2 Developer Workspace highlights**

- VS Code and JetBrains IDE extensions with work item context

- Code review queue ranked by expertise; focus mode with notification suppression

- AI-drafted standup updates from git and work item activity

- Personal velocity dashboard (private to engineer); CLI tool

## **9.3 Scrum Master Cockpit highlights**

- Sprint planning helper with AI commitment suggestion; standup facilitator

- Impediment tracker as first-class artifact; mid-sprint risk panel

- Retro toolkit; cross-sprint pattern detection

## **9.4 Product Owner Workspace highlights**

- Visual product roadmap; AI-prioritized backlog refinement

- Customer feedback aggregation with theme clustering; OKR linkage

- AI-drafted release notes; stakeholder map

## **9.5 Leadership Console highlights**

- Cross-team rollup; AI weekly executive briefing

- Strategic theme tracking; resource allocation with rebalancing suggestions

- Customer health dashboard; board deck auto-draft

## **9.6 Admin Operations Center highlights**

- User lifecycle playbooks; license / seat management

- AI cost dashboard; workspace health monitor

- Audit log explorer; compliance evidence package generation

# **Part 10 — Honest Considerations and Decision Framework**

## **10.1 Realistic timeline expectations**

20 iterations is at the edge of what a small team can deliver in 24-30 months. Honest probabilities:

| **Team configuration** | **Reach iter 6 (BCITS-usable)** | **Reach iter 12 (sellable)** | **Reach iter 20 (complete)** |
| --- | --- | --- | --- |
| Solo + AI | 50% | 10% | <5% |
| Small team (2-3 + AI) | 75% | 40% | 15% |
| Right-sized team (4-6 + AI) | 90% | 70% | 45% |
| Full product team (8-12 + AI) | 95% | 90% | 75% |

*Recommendation: build iterations 1-6 with a small team to validate adoption. Assemble a right-sized team only after Phase 1 demonstrates demand. Phase-gate at iterations 6, 9, 12, and 18.*

## **10.2 AI cost economics**

- Internal BCITS scale (200 users): ~₹2.2 lakh/month at full feature use

- Commercial scale (5000 users): ~₹55 lakh/month — eats margin

- Mitigations: caching (40% reduction), model tiering, per-workspace caps, AI-off toggle

- AI-on revenue (paid AI tier) offsets cost; AI-off customers generate no AI spend

## **10.3 This product is ambitious**

Works covers 26 capabilities and 346+ sub-features across 20 iterations. Building this requires a small team minimum (3-5 engineers, 1 designer, 1 product/PM), 18-30 months, and a ₹50 lakh - ₹1.5 crore commitment depending on team composition and location.

## **10.4 Decision framework**

| **Three paths forward** Path A — Build the full product (iterations 1-20). Committed team, 24-30 month investment. Highest differentiation. Path B — Build iterations 1-6, validate BCITS internal adoption, then commit to 7-20 based on demonstrated need. Lower risk, longer to market. Path C — Build iterations 1-9 (through Service Management), become sellable to first paying customers, then decide on Phase 2 based on customer revenue. Balanced risk-reward. |
| --- |

*Recommendation: Path C. Iterations 1-9 give BCITS a sellable product ending with customer portal and SLAs — the minimum for commercial sale. The Phase 2 decision is made with customer data in hand.*

## **10.5 What we are NOT building**

- ERP modules (HR, payroll, procurement, finance)

- Code IDE (we link to GitHub / GitLab; we don't host code)

- General-purpose document editor, spreadsheet, or chat platform

- Video conferencing (we integrate with Zoom / Teams)

- Specialized billing, GIS, BIM, or learning-management systems

- Multi-product portfolio strategic planning (possibly a later version)

# **Closing**

bSmart Works is **20 iterations, 26 capabilities, 346+ sub-features, 5 architectural commitments, 7 unification layers, 5 role-tuned surfaces, and an AI Control Plane that makes the whole thing sellable to even AI-skeptical customers.**

It joins the bSmart family of BCITS products. It encodes 25 years of BCITS's utility-domain expertise. It is the workspace customers use to deliver on the other bSmart products.

The path forward is phase-gated: build the MVP, prove adoption with a BCITS team, expand to iteration 6, decide on iterations 7-9 based on need, commit to 10-20 with customer revenue validation.

The decision is leadership's. The plan is documented. The roadmap is honest about probabilities, costs, and risks. The architecture is committed. The brand is established.

***Where work gets done.***

*End of document.*

Page  of