<!-- AUTO-EXTRACTED from 05-Capability-Map-Expansion-v3_5.docx on 2026-05-31. Source of truth = the .docx in the
     same folder. Regenerate with: python3 scripts/extract-specs.py -->

> **Provenance:** machine-extracted from `05-Capability-Map-Expansion-v3_5.docx` (Capability Map Expansion v3.5).
> This Markdown mirror exists so every AI tool and teammate can read/diff the spec in-repo.
> Where this spec and the **code** disagree, the code is canonical — see [`/CLAUDE.md`](../../CLAUDE.md) (⚠️ flags).

---

CAPABILITY MAP EXPANSION — v3.5

bSmart Works

AI Control Plane · Role-Tuned Productivity · Unification Architecture

6 new capabilities · 79 new sub-features · Every AI feature has a fallback · 5 role-tuned surfaces

Companion to: Master Capability Map v3

Prepared for: Deepak Pandey  ·  BCITS  ·  May 2026

## Part 0 — What v3.5 Adds (and What It Doesn't)

This expansion document adds exactly three things to the v3 capability map. It is deliberately focused — not a free-for-all addition of features. Each new capability earns its place by addressing a specific architectural or product gap.

### 0.1 The three additions

> 1. AI Control Plane (capability Z)
> Every user, workspace, capability, and context can toggle AI on or off. Every AI feature has a documented deterministic fallback. AI cost caps prevent runaway spend. Auditors can verify which actions involved AI.
> This addresses: regulated customer requirements, individual user preferences, cost control, fallback reliability.
>
> 2. Five role-tuned productivity surfaces (capabilities U through Y)
> Developer Workspace, Scrum Master Cockpit, Product Owner Workspace, Leadership Console, Admin Operations Center.
> These are role-aware views into the same underlying data — not five separate apps. Each role gets a tuned home page, dedicated dashboards, AI surface tuned for their workflow, and a small set of role-specific features.
> This addresses: 'one-size-fits-all' UI fatigue. Generic PM tools treat developers, SMs, POs, executives, admins identically. Real productivity comes from role-aware UX.
>
> 3. Unification architecture (Part 3 of this document)
> Explicit documentation of how every capability connects — single event store, single identity model, single query language, single AI orchestration layer, single customization framework, single knowledge layer, single UI design system.
> This addresses: the silent decay that destroys feature-rich products over time. Without explicit unification discipline, every capability drifts into its own conventions and the product becomes Frankenstein.
>

### 0.2 What v3.5 deliberately does NOT add

- More work item types or fields — v3 already covers domain extensibility
- New compliance rule templates — v3 covers the rule engine; templates can be added later as content
- New integration connectors — v3 covers the integration framework; specific connectors are content
- Industry-specific verticals (insurance, healthcare, etc.) — out of scope; BCITS focus is utility
- Whitelabeled multi-product portfolio — deferred to a possible v4

### 0.3 Updated totals

|  | v3 | v3.5 addition | Total |
| --- | --- | --- | --- |
| Capabilities | 20 | +6 | 26 |
| Sub-features | 267 | +79 | 346 |
| Iterations | 18 | +2 | 20 |
| AI-touched sub-features | ~160 | ~50 | ~210 |
| Fully customizable sub-features | ~150 | ~60 | ~210 |

### 0.4 How to read this document

This document is a companion to the v3 Master Capability Map. Read v3 first; this expansion assumes familiarity with v3's terminology and the 20 original capabilities (A through T).

Each new capability (Z, U, V, W, X, Y) follows the same structure as v3 capabilities: purpose, use cases, benefits, AI integration, customization, iteration, sub-features. New: each capability now also documents what happens when AI is OFF for that capability.

## Part 1 — The AI Control Plane

The most important addition in v3.5. Without this, the AI-at-the-center commitment in v3 is unsellable to a meaningful segment of BCITS's target customers — utilities that are regulated, security-conscious, or cost-disciplined. The Control Plane makes AI a feature, not a mandate.

### 1.1 Why a Control Plane matters

- Regulatory: some utility customers cannot send operational data to external AI providers without explicit consent and audit
- Cost: AI calls accumulate. Without caps, monthly bills can surprise; with caps, AI usage stays predictable
- Privacy: individual users may not want AI processing their work patterns even when org policy allows
- Distraction: some users find AI suggestions disrupting; toggle for clean UI
- Fallback reliability: when AI service is degraded or down, every feature must keep working
- Trust: a product where AI cannot be turned off feels like surveillance, not assistance

### 1.2 The four-level scope hierarchy

AI on/off is not a binary at the user level. It's a layered policy:

| Level | Who sets | What it controls | Wins over |
| --- | --- | --- | --- |
| 1. Workspace policy | Workspace admin | Whether AI is enabled at all for this workspace; locks downstream | Everything below |
| 2. Capability-level toggle | Workspace admin | Specific capabilities can have AI disabled (e.g., compliance) while others enabled | User preferences within the capability |
| 3. User preference | Individual user | Personal toggle for AI features in their own UI (within admin allows) | In-context overrides for that user |
| 4. In-context override | Any user (transient) | Per-board / per-item / per-action toggle for sensitive contexts | Nothing — most local |

> The conflict resolution rule
> Higher level wins when restrictive. Admin can't force AI on for a user who wants it off. User can't force AI on when admin has it off. The product respects the most-restrictive setting in the hierarchy.
>

### 1.3 What happens when AI is OFF — the fallback contract

Every AI feature in v3 has a documented deterministic fallback. The product never breaks when AI is off — it degrades gracefully. The table below summarizes fallbacks for v3 capabilities; each capability section in this document and v3 documents its own behavior more specifically.

| v3 Capability | What works without AI | What's hidden | What degrades |
| --- | --- | --- | --- |
| A — Identity & Workspace | All auth, SSO, MFA, workspace mgmt | AI member suggestions | Nothing — capability is mostly deterministic |
| B — Work Management Core | Full CRUD, custom types, fields, history | Story drafts, duplicate detection, AC generation | Manual entry replaces auto-drafts |
| C — Workflow & Automation | All workflows, automations, rules | AI rule suggestions, plain-language rule creation | Rules created via visual builder only |
| D — Custom Fields & Schema | All field types, layouts, validation | AI field-type suggestions | Admin manually picks field types |
| E — Search & Query | Full-text search, manual WIQL | Natural language → WIQL | Users learn WIQL or rely on visual filter builder |
| F — Agile Execution Surface | Boards, sprints, backlogs, reports | AI sprint commit suggestion, anomaly explanations | SM uses velocity math; charts show raw data |
| G — Collaboration | Comments, attachments, @mentions, real-time | AI summaries, AI-drafted comments | Users read full threads; write comments manually |
| H — PM Artifacts | RAID logs, decisions, meetings, actions | AI risk suggestions, action item extraction | PM categorizes manually |
| I — Knowledge Repository | Articles, search, version history | RAG Q&A, AI drafts, related-article suggestions | Keyword search; manual article writing |
| J — Reports & Dashboards | All dashboards, gadgets, scheduled delivery | AI executive summaries, anomaly detection | Charts shown without narrative; manual reading |
| K — Compliance Engine | Rule evaluation, violations, audit log | AI rule suggestions, compliance posture narrative | Rules built manually; posture shown as data |
| L — KPI Framework | All metrics, snapshots, layered access | AI team-health narrative, anomaly explanation | Numbers without explanation |
| M — SLA Engine | Policy definition, evaluation, escalation | Breach prediction, SLA communication drafting | Reactive (alert on breach) instead of predictive |
| N — Service Management | Customer portal, queues, SLAs, KB | Article suggestion at intake, smart routing | Manual triage and routing |
| O — AI Orchestration | This capability is entirely AI | All — capability is invisible when AI is off | Conversational command falls back to keyword + exact commands |
| P — Conversational Command | Capability is largely AI | Natural language parsing | Command bar accepts exact slash-commands and search only |
| Q — Integration & API | All connectors, webhooks, OAuth | AI integration suggestions, AI config helpers | Admin configures manually |
| R — Universal Customization | Templates, versioning, sandbox | AI config suggestions, impact analysis | Admin reads docs; tests in sandbox manually |
| S — Mobile, Real-time, Polish | Mobile apps, push, real-time co-presence | Mobile AI summaries | Mobile reads full content |
| T — Security & Audit | Audit log, encryption, access policies | Anomaly detection on access patterns | Threshold-based alerts instead of AI judgment |

### 1.4 What the user actually sees

Concrete UI behavior when AI is on vs off:

| UI element | AI ON | AI OFF |
| --- | --- | --- |
| AI assistant button (top right) | Visible, opens AI panel with context-aware actions | Hidden completely; no replacement |
| Conversational command bar | Accepts natural language; suggests completions | Accepts exact commands (/) and keyword search only; visible but degraded |
| 'Generate with AI' buttons (e.g., on story create) | Visible; one click drafts content | Hidden completely |
| AI summaries on dashboards | Visible above charts | Hidden; charts shown standalone |
| Smart suggestions (assignee, type, etc.) | Inline suggestions next to fields | Hidden; user picks from full list |
| AI-generated drafts (in editors) | Available via toolbar | Toolbar shows only formatting controls |
| Anomaly explanations on charts | Visible as info icon with hover narrative | Hidden; chart shown without narrative |
| AI executive briefing | Generated weekly; visible in console | Replaced with structured digest (no narrative) |

### 1.5 Cost discipline built in

- Every AI call logged with token count and cost
- Per-workspace monthly budget cap, admin-configured
- At 80% consumption: admin alerted; AI continues with degraded model tier (Haiku instead of Sonnet)
- At 100% consumption: AI auto-disables until next billing cycle; admin can override with explicit confirmation
- Per-user rate limits prevent single-user runaway
- Cached responses for similar prompts (e.g., 'summarize this sprint' for same data) — reduces redundant calls by ~40%
- Smaller models for simpler tasks (Haiku for intent detection, Sonnet for generation)

### 1.6 Audit and compliance posture

> What auditors can verify
> Every AI invocation is logged: timestamp, user, capability, prompt size, model tier, tokens, cost, AI policy state at the time (on/off).
> Auditors can verify: 'Was AI on when this compliance violation was created?' or 'Did this customer's data ever pass through an AI provider?' or 'What was the AI usage in the period under review?'
> AI-off state is recorded as explicitly as AI-on. This is what makes Works sellable to regulated customers.
>

## Part 1 — AI Control Plane Capability Detail

| Z | AI Control Plane Choose your AI level. Honest fallbacks for every off-state. |
| --- | --- |

##### Purpose

AI-at-the-center is the product's strategic bet, but not every user, every workspace, every moment needs AI. Some users find AI distracting. Some workspaces must comply with regulations that limit external AI use. Some teams want to opt out for cost reasons. The AI Control Plane provides multi-level scoping (workspace, capability, user, in-context) with documented fallbacks for every off-state.

##### Use cases (concrete BCITS scenarios)

- Regulated utility customer enables Works with AI completely disabled — no data leaves the workspace; tool operates fully on deterministic logic
- Workspace admin turns off AI for compliance rules (deterministic only) but keeps AI on for story drafting
- Individual engineer prefers no AI suggestions in their daily flow; toggles off; UI surfaces fewer AI buttons
- Cost-conscious admin sets a monthly AI budget cap; system automatically degrades to deterministic when 80% consumed
- Per-board context: 'Turn off AI on this critical incident board — no AI-generated text'

##### Benefits

- Sellable to AI-skeptical or regulation-bound customers — AI is opt-in, not forced
- Per-user preference respected — distraction-free for those who want it
- Hard cost ceiling — runaway AI spend impossible
- Every AI feature has a documented deterministic fallback — no broken experience when AI is off
- Audit log records AI-off states — auditors can verify which actions had AI involvement

##### AI integration

This capability IS about controlling AI — it's the meta-layer. AI cannot turn AI off; only admins and users can. AI usage is fully logged regardless of state.

##### What happens when AI is OFF

This capability is exactly about defining what 'AI off' means for every other capability. Each other capability has explicit fallback behavior documented in this doc.

##### Customization extension points

Workspace-level AI policy. Per-capability toggles. Per-user preferences (within admin policy bounds). In-context overrides. Per-workspace AI budget caps.

##### Iteration

NEW iteration 19 (foundational — must ship with AI features)

##### Sub-features (14)

| # | Sub-feature | What it does | AI assist? | Customizable? |
| --- | --- | --- | --- | --- |
| 1 | Workspace-level AI policy | Admin sets: AI enabled / disabled / opt-in per user. Locks downstream. | — | Adm |
| 2 | Per-capability AI toggle | Admin disables AI for specific capabilities (e.g., compliance) while enabling others. | — | Adm |
| 3 | Per-user AI preference | User toggles AI for themselves (within admin policy bounds). | — | Full |
| 4 | In-context AI override | Per-page / per-board / per-item AI toggle for sensitive contexts. | — | Full |
| 5 | AI budget caps | Per-workspace monthly $/token cap with auto-degradation when threshold hit. | — | Adm |
| 6 | AI usage dashboard | Per workspace / user / capability: tokens consumed, cost, rate. | — | — |
| 7 | AI fallback documentation | Per AI feature, the documented deterministic behavior when AI is off. | — | — |
| 8 | AI off-state UI | When AI is off, AI buttons / panels are hidden, not just dimmed. Clean UI. | — | — |
| 9 | Conversational command bar (degraded) | When AI is off, command bar falls back to keyword search + exact commands. | — | — |
| 10 | AI audit log | Every AI call: prompt, model, tokens, cost, outcome, user state, off/on context. | — | — |
| 11 | AI provider configuration | Admin selects AI provider (Anthropic default; future: Azure OpenAI, on-prem). | — | Adm |
| 12 | Data boundary controls | Admin restricts which data types can be sent to AI (e.g., no PII, no financial). | — | Adm |
| 13 | Model tier selection | Admin picks: Haiku (fast/cheap) / Sonnet (balanced) / Opus (high-quality) per use case. | — | Adm |
| 14 | Sandbox / preview mode | AI features can be tested in a sandbox without affecting production data. | — | Adm |

## Part 2 — Role-Tuned Productivity Surfaces

### 2.1 Why role-tuned UX matters

Generic PM tools treat every user identically. Developers see the same UI as executives; Scrum Masters see the same as Admins. This creates two problems:

- Information overload — users wade through irrelevant UI to find what they need
- Tool friction becomes a tax on productivity — every interaction takes longer than it should

Role-tuned UX inverts this. Each role gets a home page, dashboards, AI surface, and small set of role-specific features tuned to their daily reality. Underneath, it's the same data, same permissions, same workflows. Only the surface changes.

> Important: not five separate apps
> The five role surfaces (U, V, W, X, Y) are different views into the same Works. Same work items. Same compliance rules. Same KPIs. Same audit log.
> A developer might also be a Scrum Master; they switch surfaces with one click. An admin might also be a leader; they have access to both surfaces.
> This is unification through configuration, not unification through forks.
>

### 2.2 The five role surfaces at a glance

| Role | Surface | Primary daily activity | Key new capabilities |
| --- | --- | --- | --- |
| Developer | Developer Workspace (U) | Code, review PRs, update work items | IDE extension, focus mode, standup helper, personal velocity |
| Scrum Master | Scrum Master Cockpit (V) | Planning, standup, retro, impediment tracking | Sprint planning helper, retro toolkit, impediment tracker |
| Product Owner | Product Owner Workspace (W) | Backlog refinement, roadmap, stakeholder mgmt | Roadmap, customer feedback aggregation, release notes auto-draft |
| Leader / Mgmt | Leadership Console (X) | Cross-team rollup, strategic theme tracking | AI executive briefing, customer health, resource allocation |
| Admin | Admin Operations Center (Y) | User lifecycle, license mgmt, audit, integrations | Onboarding playbooks, AI cost dashboard, integration health |

| U | Developer Workspace The daily home for engineers — built around their flow. |
| --- | --- |

##### Purpose

Generic PM tools treat developers as one of many user types. Works inverts this — developers get a purpose-built workspace tuned to their daily reality: focus time, code context, PR linking, IDE integration, personal velocity (private). This is the surface engineers actually want to live in.

##### Use cases (concrete BCITS scenarios)

- Engineer's morning: opens their personal home — yesterday's work, today's PRs needing review, blocked items, today's focus block
- While coding in VS Code, the extension shows the work item context in a sidebar — description, AC checklist, recent comments
- Engineer commits with 'WEB-1247: fix CSRF refresh on login' — Works auto-links the commit to the work item and updates status
- Mid-afternoon focus block — notifications are muted; only P0 incidents break through
- End of day: standup helper auto-drafts 'yesterday I shipped X, today I'm on Y, blocker is Z' from work item activity

##### Benefits

- Engineers spend their time engineering, not project-managing
- Code and work item context are connected — no tab-switching
- Personal metrics stay private — visible only to engineer, never to manager
- Standup prep auto-generated from actual work, not memory
- Focus mode protects deep work without missing critical alerts

##### AI integration

AI drafts standup updates from actual git and work item activity. AI suggests PRs to review based on expertise and current load. AI summarizes long comment threads on assigned items. AI proposes work item updates from commit messages. AI explains unfamiliar code context when work item touches new files.

##### What happens when AI is OFF

Developer workspace still works — focus mode, PR linking, standup helper all function. Standup helper falls back to a manual template. PR review queue uses simple round-robin / availability heuristics instead of expertise matching. Comment summaries are hidden; full threads shown instead.

##### Customization extension points

Custom focus-mode schedules. Custom notification rules. Custom standup template. Custom IDE-extension settings. Custom 'definition of done' checklists per type.

##### Iteration

NEW iteration 19 (with IDE extension in iteration 20)

##### Sub-features (13)

| # | Sub-feature | What it does | AI assist? | Customizable? |
| --- | --- | --- | --- | --- |
| 1 | Personal developer home | Customized landing page showing today's work, PRs, blockers, focus blocks. | AI | Full |
| 2 | VS Code / JetBrains extension | IDE sidebar with work item context, commit linking, in-editor status updates. | AI | Adm |
| 3 | Commit ↔ work item linking | Auto-detect work item keys in commit messages; bi-directional links. | AI | Full |
| 4 | PR ↔ work item linking | GitHub/GitLab PR auto-links to work item; PR status syncs to item status. | AI | Full |
| 5 | Code review queue | Personalized queue of PRs needing your review, ranked by urgency and expertise. | AI★ | Full |
| 6 | Focus mode | Suppress non-urgent notifications during scheduled focus blocks; only P0 breaks through. | AI | Full |
| 7 | Standup helper | Auto-drafts 'yesterday / today / blockers' from work item and git activity. | AI★ | Full |
| 8 | Personal velocity (private) | Engineer's own cycle time, throughput, completion rate — visible only to them. | AI | — |
| 9 | Time blocking | Calendar-integrated focus block scheduler. | AI | Full |
| 10 | Definition-of-done checklists | Per type or per epic checklists that must complete before resolving. | AI | Full |
| 11 | Local dev helpers | CLI tool (`works` command) for transitions, comments, search from terminal. | AI | — |
| 12 | Code context on work item | Show commits, branches, files touched, PR status alongside the work item. | AI | — |
| 13 | Pair / mob programming sessions | Multi-engineer attribution on a work item for collaborative work. | — | — |

| V | Scrum Master Cockpit Sprint planning, standup, retro — the SM's daily toolkit, unified. |
| --- | --- |

##### Purpose

Scrum Masters live in sprint cycles. Their day-to-day involves planning, facilitating standups, tracking impediments, running retros, and protecting team health. Works's Scrum Master Cockpit surfaces all of these in one place — connected to the work, not living in side notebooks.

##### Use cases (concrete BCITS scenarios)

- Sprint planning: SM opens cockpit, sees team's recent velocity, current capacity, suggested commit, drag-drop items from refined backlog
- Daily standup: cockpit shows who hasn't updated since yesterday, surfaces blockers and stale items, runs the facilitation flow
- Mid-sprint: cockpit flags scope creep, stale items, members with zero assignments — all in one risk panel
- Retro: cockpit pulls sprint data automatically — what shipped, what slipped, why — and structures the retro discussion
- Sprint review prep: cockpit auto-drafts the sprint summary for stakeholder delivery

##### Benefits

- Scrum ceremonies are tool-supported, not tool-burdened
- Impediments are tracked as first-class objects, not buried in chat
- Retro action items don't get lost — they auto-populate as tracked PM artifacts
- Team health visible continuously, not just at sprint boundaries
- Cross-sprint patterns surface — same impediments recurring, scope creep trends

##### AI integration

AI suggests sprint commitment based on velocity and known capacity. AI flags risk items mid-sprint with explanation. AI generates retro discussion topics from sprint data. AI drafts sprint review summary. AI surfaces patterns across sprints (recurring impediments, repeated scope creep sources).

##### What happens when AI is OFF

Cockpit fully functional. Sprint commit suggestion shows raw velocity numbers; SM does the math manually. Risk flagging uses fixed rules (e.g., 'item In Progress > 5 days') instead of AI judgment. Retro topics use generic template prompts. Sprint summary is a fill-in-the-blank template the SM completes.

##### Customization extension points

Custom standup flow (questions, order, time limits). Custom retro templates and frameworks (4Ls, Start/Stop/Continue, etc.). Custom impediment categories. Custom risk thresholds.

##### Iteration

NEW iteration 19

##### Sub-features (12)

| # | Sub-feature | What it does | AI assist? | Customizable? |
| --- | --- | --- | --- | --- |
| 1 | Sprint planning helper | Capacity calculator, commit suggestion based on velocity, item suggestion from refined backlog. | AI★ | Full |
| 2 | Standup facilitator | Sequential flow per team member, time-boxed, auto-records updates, flags missing. | AI | Full |
| 3 | Impediment tracker | First-class artifact (not buried in comments) with owner, severity, age, escalation. | AI | Full |
| 4 | Mid-sprint risk panel | Live view of scope creep, stale items, zero-assignment members, breach predictions. | AI★ | Full |
| 5 | Retro toolkit | Template gallery (4Ls, Start/Stop/Continue, Mad/Sad/Glad), action item capture. | AI★ | Full |
| 6 | Sprint review prep | Auto-drafts sprint summary, demos list, metrics for stakeholder delivery. | AI★ | Full |
| 7 | Team health composite | Predictability, scope stability, flow efficiency — composite scores over time. | AI★ | Full |
| 8 | Cross-sprint pattern detection | Recurring impediments, repeated estimation misses, sources of scope creep. | AI★ | Full |
| 9 | Sprint goal builder | AI helps draft sprint goal from selected items; goal visible everywhere. | AI★ | — |
| 10 | Working agreements | Team-level documented norms surfaced during ceremonies (DoD, DoR, etc.). | AI | Full |
| 11 | Velocity & predictability dashboard | Per-team rolling metrics with trend visualization. | AI | Full |
| 12 | Capacity planner | Team capacity with PTO, on-call, focus-time deductions. | AI | Full |

| W | Product Owner Workspace Backlog refinement, roadmap, stakeholders — the PO's strategic surface. |
| --- | --- |

##### Purpose

Product Owners are not just bigger Scrum Masters — they own product direction, prioritization, customer outcomes. Works's PO workspace gives them roadmap views, backlog refinement helpers, customer feedback aggregation, OKR linkage, and release planning — all connected to the work being done.

##### Use cases (concrete BCITS scenarios)

- Backlog refinement session: PO opens workspace, sees AI-prioritized backlog, customer feedback themes, dependency conflicts
- Quarterly roadmap review: PO drags themes across quarters, sees which work items support which themes, flags themes with no work behind them
- Customer feedback synthesis: 47 recent feedback items auto-clustered into 5 themes, ranked by frequency and sentiment
- Release planning: PO drags ready items into next release, sees scope impact on dates, auto-drafts release notes
- Stakeholder communication: PO sees stakeholder map, who cares about what, sends targeted release updates

##### Benefits

- Strategic thinking happens with the strategic surface, not in spreadsheets
- Customer voice surfaces continuously — not just at QBR
- OKR-to-work-item linkage makes business outcomes visible
- Release notes write themselves from completed work
- Stakeholder communication is targeted, not blast-emails

##### AI integration

AI prioritizes backlog from declared criteria (customer value, effort, strategic alignment). AI clusters customer feedback into themes. AI proposes which items belong in which release. AI drafts release notes from completed work. AI identifies stakeholders to notify per change. AI suggests OKR linkages.

##### What happens when AI is OFF

Workspace fully functional. Backlog uses manual prioritization (drag-rank). Customer feedback shown as a flat list — clustering disabled. Release notes is a manual editor with completed-items inserted as a list. Stakeholder map is manually maintained. OKR linkage is manual selection.

##### Customization extension points

Custom prioritization criteria (value/effort/risk/strategic-fit weightings). Custom roadmap themes. Custom OKR hierarchies. Custom release note templates. Custom stakeholder roles.

##### Iteration

NEW iteration 19

##### Sub-features (13)

| # | Sub-feature | What it does | AI assist? | Customizable? |
| --- | --- | --- | --- | --- |
| 1 | Product roadmap | Visual timeline of themes/epics across quarters with status, scope, dates. | AI | Full |
| 2 | Backlog refinement helper | AI ranks backlog by criteria you define; suggests items needing detail. | AI★ | Full |
| 3 | Idea capture | Lightweight inbox for new ideas; auto-classifies by area; promotes to story when ready. | AI★ | Full |
| 4 | Customer feedback aggregation | Pull from portal, email, comments; cluster into themes with sentiment. | AI★ | Full |
| 5 | Feature voting | Customer-facing voting on backlog ideas (portal integration). | AI | Full |
| 6 | OKR linkage | Link work items to OKRs; visualize progress toward objectives. | AI | Full |
| 7 | Release planning | Drag-drop items into releases; scope vs date tradeoffs visualized. | AI★ | Full |
| 8 | Release notes auto-draft | AI drafts user-facing release notes from completed items; PO edits and publishes. | AI★ | Full |
| 9 | Stakeholder map | Stakeholders with role, influence, interest, communication frequency. | AI | Full |
| 10 | Stakeholder communication | Targeted release/status updates to relevant stakeholders. | AI★ | Full |
| 11 | Theme tracking | Strategic themes that span multiple epics/sprints; progress rollup per theme. | AI | Full |
| 12 | Discovery / spike management | Lightweight tracking for research, prototypes, spikes with outcomes. | AI | Full |
| 13 | Customer interview log | Structured capture of customer conversations linkable to features. | AI | Full |

| X | Leadership Console Cross-team rollup, strategic themes, AI executive briefing. |
| --- | --- |

##### Purpose

Executives and engineering leaders don't live in sprints — they live in quarters and themes. Works's Leadership Console gives them aggregated views across all projects and teams, strategic theme tracking, resource allocation insight, risk portfolio across the organization, and an AI-drafted weekly executive briefing.

##### Use cases (concrete BCITS scenarios)

- CTO's Monday morning: opens console, sees weekly AI executive briefing — what shipped, what slipped, key risks, customer SLA health
- VP Engineering reviewing resource allocation: which teams are overcommitted, which capacity is underused, where to rebalance
- Quarterly review: drilling into strategic themes — for each theme, which items contributed, what's left, what's at risk
- Customer health snapshot: across all customer workspaces, who is high-risk (SLA breaches, escalations, low CSAT)
- Board prep: console auto-generates the project & engineering section of the board deck

##### Benefits

- Strategic visibility without manual rollup work every Monday
- Decisions backed by data, not anecdote
- AI briefing replaces 'send me a status update' emails
- Cross-team patterns visible — same problems recurring in different teams
- Customer health surfaces before churn becomes a surprise

##### AI integration

AI generates weekly executive briefing tailored to leader's stated priorities. AI identifies anomalies in metrics and explains them. AI summarizes cross-team risk portfolio. AI predicts which customers are at churn risk based on recent activity. AI proposes resource rebalancing.

##### What happens when AI is OFF

Console fully functional with dashboards and rollups. Executive briefing is a structured digest (no narrative) — items completed, items at risk, SLA met %, compliance posture. Customer risk uses fixed thresholds (X breaches in Y days = at risk). No anomaly explanations; just charts with raw data.

##### Customization extension points

Custom executive briefing schedule and content. Custom themes / strategic areas. Custom rollup hierarchies. Custom risk thresholds. Custom customer health composites.

##### Iteration

NEW iteration 20

##### Sub-features (13)

| # | Sub-feature | What it does | AI assist? | Customizable? |
| --- | --- | --- | --- | --- |
| 1 | Cross-team rollup dashboard | Aggregated metrics across all teams under the leader's scope. | AI★ | Full |
| 2 | Strategic theme tracker | Each theme has progress, contributing items, owners, risks. | AI★ | Full |
| 3 | Resource allocation view | Who is on what, capacity utilization, over/under-allocation. | AI★ | Full |
| 4 | Risk portfolio | All open risks across projects, ranked by impact×probability. | AI★ | Full |
| 5 | Customer health dashboard | Per-customer composite of SLA, escalations, CSAT, churn risk. | AI★ | Full |
| 6 | AI executive briefing | Weekly auto-generated narrative briefing tailored to leader's priorities. | AI★ | Full |
| 7 | Strategy-to-execution map | Visual link from OKRs / strategic themes down to specific work. | AI | Full |
| 8 | Decision register access | Searchable view of all major decisions across projects with context. | AI | Full |
| 9 | Investment summary | Where engineering hours are flowing by theme, project, customer. | AI | Full |
| 10 | Board deck auto-draft | Generates quarterly board deck slides for the engineering section. | AI★ | Full |
| 11 | Anomaly detection | AI flags unusual patterns in metrics with proposed explanations. | AI★ | Adm |
| 12 | Drill-down with privacy guardrails | Leaders can drill into team aggregates but not individual data (API-enforced). | — | — |
| 13 | Goal cascade | Org OKRs cascade to team OKRs cascade to work items — full traceability. | AI | Full |

| Y | Admin Operations Center User lifecycle, licenses, workspace health, integration monitoring. |
| --- | --- |

##### Purpose

Workspace administrators handle the unglamorous but essential operations — onboarding, offboarding, license management, integration health, audit reviews, capacity monitoring. Works's Admin Operations Center makes these tasks fast and audit-ready.

##### Use cases (concrete BCITS scenarios)

- New hire onboarding: admin runs onboarding playbook — creates user, assigns roles, adds to teams, provisions integrations — in 3 clicks
- Quarterly access review: admin sees all users, their last activity, their roles, anomalies, can bulk-deactivate inactive users
- AI cost review: admin sees workspace's AI spend by user, by feature, sets caps before next billing cycle
- Integration broke: admin sees Slack webhook failing for 2 days, retries, replays missed events
- SOC 2 audit prep: admin generates compliance evidence package — access reviews, audit logs, MFA enforcement, encryption status

##### Benefits

- Onboarding from 90 minutes to 9 minutes
- Offboarding is 100% reliable — no orphaned access
- AI cost stays inside budget — visible before billing surprises
- Integration health prevents silent data loss
- Audit prep is on-demand, not a 2-week scramble

##### AI integration

AI generates onboarding playbooks from role definitions. AI flags unusual access patterns (login from new geo, mass-export). AI proposes role consolidation when permission patterns overlap. AI drafts customer access reports. AI suggests integration health remediations.

##### What happens when AI is OFF

Operations Center fully functional. Onboarding playbooks are admin-authored templates. Access pattern anomalies use fixed rules (geo change > 1000 km, etc.). Role analysis is manual. Customer reports use fixed templates. Integration remediations are documented in KB, admin follows manually.

##### Customization extension points

Custom onboarding playbooks per role. Custom role definitions. Custom access review schedules. Custom AI cost caps and alerts. Custom integration health rules.

##### Iteration

NEW iteration 20

##### Sub-features (14)

| # | Sub-feature | What it does | AI assist? | Customizable? |
| --- | --- | --- | --- | --- |
| 1 | User lifecycle automation | Onboarding / offboarding playbooks with role-aware steps and audit trail. | AI★ | Full |
| 2 | License / seat management | Track active seats, available seats, cost per seat, growth projection. | AI | Full |
| 3 | Bulk config operations | Bulk apply role changes, team membership, feature toggles with preview. | AI | — |
| 4 | Workspace health monitor | Storage usage, API call rates, AI cost, integration status — single dashboard. | AI★ | Full |
| 5 | AI cost dashboard | Cost by user, by feature, by capability; budget vs actual; alerts on threshold. | AI | Full |
| 6 | Audit log explorer | Filterable, exportable browse of all audit events with saved queries. | AI★ | — |
| 7 | Integration health dashboard | Status of all webhooks, OAuth connections, native integrations; retry / replay UI. | AI★ | Full |
| 8 | Access review | Periodic review prompts; bulk-deactivate inactive users; report generation. | AI★ | Full |
| 9 | Compliance evidence package | On-demand SOC 2 / ISO 27001 evidence bundle generation. | AI★ | Full |
| 10 | Anomaly detection (security) | AI flags unusual login patterns, permission escalations, data exports. | AI★ | Adm |
| 11 | Role consolidation analyzer | Find overlapping roles and propose consolidation. | AI★ | — |
| 12 | Data retention policies | Configure per-entity retention; automatic deletion with audit trail. | AI | Full |
| 13 | Workspace backup & restore | Scheduled exports; point-in-time restore (within retention window). | — | Adm |
| 14 | Operations playbook library | Reusable admin playbooks for common operations — install once, run many times. | AI★ | Full |

## Part 3 — The Unification Architecture

The third addition in v3.5: explicit documentation of how every capability connects. This is not a feature — it is an architectural discipline. Without it, every capability drifts into its own conventions over time, and the product becomes the very Frankenstein it set out to replace.

### 3.1 Seven unification layers

Works has seven layers where unification is enforced. Each layer has one canonical implementation, used everywhere.

#### Layer 1 — Data: one event store

- Every state change in every capability writes to the same append-only event store
- Every report, dashboard, compliance check, KPI snapshot reads from the same event store (directly or via projections)
- This is what makes status duration tracking honest, audit logs immutable, and history reconstruction reliable
- Implication: a new capability cannot 'have its own data' — it writes events to the shared store and reads projections

#### Layer 2 — Identity: one user, one permissions model

- Same user identity across web, mobile, API, IDE extension, command bar
- Same permission system across all capabilities — no capability has its own auth
- Field-level security, role-based access, conditional access — all defined once, enforced everywhere

#### Layer 3 — Query: WIQL is the one query language

- Same WIQL syntax used in filters, automations, compliance rules, KPI definitions, dashboard gadgets, SLA scopes
- Users learn it once; it works everywhere
- Natural language → WIQL translation is the AI surface on top of one query language, not five different syntaxes

#### Layer 4 — AI Orchestration: one service powers every AI feature

- Every 'AI assist' button across the product calls the same AI orchestration service
- Single budget, single audit trail, single fallback policy, single model selection
- Adding AI to a new capability does not require building new AI infrastructure
- Turning AI off in one place doesn't accidentally leave it on elsewhere

#### Layer 5 — Customization: one configuration framework

- Same versioning, sandbox, rollback for workspace settings, workflows, custom fields, dashboards, automations, compliance rules
- Same audit log for configuration changes
- Same import/export format
- Adding a new customizable capability automatically gets versioning, sandbox, and rollback for free

#### Layer 6 — Knowledge: one repository, linkable from everywhere

- Knowledge articles can be linked from work items, RAID artifacts, decisions, customer requests
- RAG-based AI search uses the same knowledge base across all capabilities
- No 'project wikis' or 'team wikis' or 'team handbooks' as separate things — one knowledge space, scoped by permission

#### Layer 7 — UI: one design system, role surfaces are configurations

- Same design tokens (colors, typography, spacing) across all surfaces
- Same component library (buttons, badges, forms, tables)
- Same interaction patterns (drag-drop, command palette, keyboard shortcuts)
- Role surfaces are layout configurations on top of the same components — not separately-coded apps

### 3.2 What this means in practice

> Concrete example: a developer files a bug
> 1. They use the same command bar everyone uses (UI unification)
> 2. Their identity and permissions come from the same auth system (identity unification)
> 3. The work item create writes to the shared event store (data unification)
> 4. The new bug is queryable via the same WIQL anyone else uses (query unification)
> 5. AI smart-routing uses the same AI service that powers other features (AI unification)
> 6. The compliance engine evaluates rules against the new bug using the shared query system (no double-write)
> 7. The KPI framework counts the bug in cycle-time metrics from the shared event store
> 8. Linked knowledge articles are searchable from any UI surface (knowledge unification)
> All seven layers are involved in this single action, and none of them need separate code for the developer's surface vs the SM's surface vs the leader's view.
>

### 3.3 What unification prevents

- Drift — capabilities slowly diverging into separate conventions
- Silos — features that don't talk to each other (e.g., RAID risks not appearing in leadership risk portfolio)
- Re-implementation — building permission checks five times instead of one
- Audit gaps — events captured in one place but not another
- Configuration sprawl — each capability inventing its own settings UX
- AI fragmentation — different capabilities using different AI providers with different budgets

### 3.4 The discipline required

Unification is not a feature you can ship. It is a discipline you practice from iteration 1 forward. The architecture decisions that enable unification — append-only event store, shared identity, single query language, single AI orchestration — must be made early and held to.

If you add a new capability and find yourself thinking 'this needs its own data store' or 'this needs its own auth' or 'this needs its own AI integration' — that is the moment to pause and ask: how do we use the existing layers instead?

Every exception erodes the foundation. Every shortcut taken in iteration 8 becomes the bug that's impossible to fix in iteration 18.

## Part 4 — Updated Iteration Roadmap (v3.5)

With AI Control Plane and 5 role surfaces added, the roadmap expands from 18 to 20 iterations. The new iterations are 19 and 20, but the AI Control Plane (capability Z) is foundational — it must be designed in from iteration 10 onward, not added at the end.

| Iteration | Theme | Capabilities (changes from v3 in bold context) |
| --- | --- | --- |
| 1 | Skeleton + Auth | A (identity foundation), B (workspaces) |
| 2 | Projects & WorkItems (core) | B (work item CRUD) |
| 3 | Workflows + Permissions + Field Visibility | C (workflows), B (field-level permissions) |
| 4 | Custom Fields & Layouts | D (custom fields) |
| 5 | Search & WIQL | E (search & query) |
| 6 | Boards + Backlog + Sprints + Links | F (agile execution) |
| 7 | Comments + Attachments + Activity + Notifications | G (collaboration) |
| 8 | Versions + Time + Dashboards + Reports + SLA | J (reports), M (SLA engine) |
| 9 | Automation + Webhooks + API + SSO | C (automation), Q (integration), A (SSO) |
| 9.5 | Compliance Rules Engine | K (compliance) |
| 10 | AI Layer (foundation) + AI Control Plane | O (AI orchestration), Z (AI Control Plane) — Z is foundational, must ship with O |
| 10.5 | KPI Framework with Privacy | L (KPI with privacy guardrails) |
| 11 | Service Management (customer portal) | N (customer portal) |
| 12 | Real-time + Mobile + Polish + Security | S (mobile, real-time), T (security) |
| 13 | PM Artifacts (RAID, decisions, meetings) | H (PM artifacts) |
| 14 | Knowledge Repository | I (knowledge) |
| 15 | Conversational Command Interface | P (command bar) |
| 16 | AI Expansion (across all capabilities) | O (deepening — every capability's AI surface) |
| 17 | Universal Customization Engine | R (customization framework) |
| 18 | Enterprise Hardening + Compliance Certifications | T (SOC 2, ISO 27001 prep) |
| 19 | NEW: Developer Workspace + Scrum Master Cockpit + Product Owner Workspace | U, V, W (role-tuned surfaces — phase 1) |
| 20 | NEW: Leadership Console + Admin Operations Center + IDE Extension | X, Y, U.IDE (role-tuned surfaces — phase 2) |

> Honest timeline implications
> 20 iterations is at the edge of what a small team (3-5 engineers + AI) can deliver in 24-30 months.
> Solo + AI: 5-10% probability of reaching iteration 18; <5% of reaching all 20.
> Small team (2-3 engineers + AI): 50% probability of reaching iteration 12, 25% of iteration 18, 10% of all 20.
> Realistic team (4-6 engineers + AI): 70% probability of reaching all 20 in 24-30 months.
> Recommendation: build v2 foundation (iterations 1-12) first; validate adoption; assemble team for v3/v3.5 expansion based on validated need.
>

## Part 5 — Honest Implications of v3.5

### 5.1 The AI Control Plane is a serious engineering project

It is tempting to think 'AI on/off is just a feature flag.' It isn't. To do this honestly, the engineering needed includes:

- Permission inheritance — workspace policy overriding capability toggle overriding user preference overriding in-context override; correctly, every time
- Fallback wiring — every AI feature must have a deterministic fallback path, tested, maintained, documented
- Cost telemetry — every AI call instrumented; aggregated; surfaced to admin in real time
- Budget enforcement — at 100% budget, cleanly degrading to off without breaking in-flight requests
- UI state management — AI elements hidden when off; not just disabled (visually clean)
- Audit log — every AI event logged including off-state
- Sandbox / preview — admin can test AI changes without affecting production

Honest estimate: AI Control Plane alone is ~2-3 weeks of focused engineering across iterations 10 and 11. Built right, it pays dividends across all subsequent AI work. Built wrong, it becomes the source of subtle bugs forever.

### 5.2 Role surfaces multiply UI work, not back-end work

This is good news. The role surfaces (U, V, W, X, Y) primarily add:

- New home pages (5 of them, plus the default 'My Works')
- Custom dashboards tuned per role
- Role-aware command bar suggestions and quick actions
- A small set of role-specific features (impediment tracker, focus mode, AI executive briefing, etc.)

They do NOT add:

- New data models
- New permission systems
- New AI infrastructure
- New workflows or compliance frameworks

Estimated cost: iterations 19 and 20 combined are roughly the engineering effort of one earlier iteration (e.g., iteration 8). Heavy on UI work, moderate on back-end.

### 5.3 Unification is the discipline that pays for itself

Unification is not a feature you build — it is a discipline you practice. The dividends compound:

- Iteration 1: choose append-only event store. Cost: ~1 week extra setup.
- Iteration 8: dashboards 'just work' because they read from the same events. Saved: ~3 weeks.
- Iteration 9.5: compliance engine 'just works' because rules query the same data. Saved: ~6 weeks.
- Iteration 10.5: KPI framework 'just works' because metrics read from the same events. Saved: ~8 weeks.
- Iteration 13: PM artifacts share permissions and audit. Saved: ~2 weeks.
- Iteration 14: knowledge linkable from everywhere because there's one knowledge repo. Saved: ~3 weeks.
- Iterations 19-20: role surfaces compose existing components — no rework. Saved: ~6 weeks.

Total savings vs Frankenstein approach: ~28 weeks. Cost of upfront discipline: ~4 weeks. ROI: 7x.

### 5.4 What sells, what doesn't

What sells about v3.5: AI Control Plane is a key enterprise-sales differentiator. Most AI-native products force AI on. BCITS will hear 'we cannot send our data to AI providers' from utility customers; v3.5 answers that with documented fallbacks for every capability. Sellable to the most security-conscious customer.

What doesn't sell on its own: Unification architecture. Customers don't buy 'unification' — they buy outcomes. But they notice unification when it's absent (drift, inconsistency, broken workflows). Practice the discipline; let the absence-of-pain be the proof.

What sells obviously: Role surfaces. Developers, SMs, POs, leaders, admins can each see their tuned experience in a demo. This is the most demo-able addition in v3.5.

## Part 6 — Complete Capability Map (v3 + v3.5)

All 26 capabilities, with sub-feature count and AI/customization profile, organized for executive scan.

| # | Capability | Sub-features | AI-touched |
| --- | --- | --- | --- |
| A | Identity & Workspace Foundation | 14 | 2/14 |
| B | Work Management Core | 15 | 8/15 |
| C | Workflow & Process Automation | 12 | 8/12 |
| D | Custom Fields & Schema Extensibility | 10 | 8/10 |
| E | Search, Filters & Query Language | 10 | 7/10 |
| F | Agile Execution Surface | 14 | 14/14 |
| G | Collaboration & Communication | 13 | 10/13 |
| H | PM Artifacts — RAID, Decisions, Meetings | 12 | 12/12 |
| I | Centralized Knowledge Repository | 14 | 14/14 |
| J | Reports, Dashboards & Insights | 14 | 11/14 |
| K | Compliance Rules Engine | 14 | 9/14 |
| L | KPI Framework with Privacy Guardrails | 13 | 9/13 |
| M | SLA Engine — Internal & Customer Unified | 12 | 9/12 |
| N | Service Management & Customer Portal | 15 | 12/15 |
| O | AI Orchestration Layer | 18 | 12/18 |
| P | Conversational Command Interface | 13 | 10/13 |
| Q | Integration, API & Extensibility | 14 | 9/14 |
| R | Universal Customization Engine | 14 | 11/14 |
| S | Mobile, Real-time & Performance | 12 | 7/12 |
| T | Enterprise Security, Audit & Governance | 14 | 3/14 |
| Z | AI Control Plane (NEW) | 14 | 0/14 |
| U | Developer Workspace (NEW) | 13 | 11/13 |
| V | Scrum Master Cockpit (NEW) | 12 | 11/12 |
| W | Product Owner Workspace (NEW) | 13 | 12/13 |
| X | Leadership Console (NEW) | 13 | 12/13 |
| Y | Admin Operations Center (NEW) | 14 | 12/14 |

## Part 7 — Closing

v3.5 completes the architectural picture of Works: 26 capabilities, 346 sub-features, 20 iterations. It adds the AI Control Plane (which makes Works sellable to AI-skeptical and regulated customers), five role-tuned productivity surfaces (which makes Works productive for the people who actually use it daily), and the unification architecture (which keeps the whole thing from collapsing into Frankenstein over time).

None of these are 'extra features.' They are architectural completion — finishing the picture that v3 started.

> Decision framework (final)
> Approve v3.5 scope at planning time if: BCITS commits to building the strategically distinctive product with full role coverage and enterprise-grade AI controls.
> Build v3.5 incrementally if: AI Control Plane (Part 1) ships with iteration 10; role surfaces (Part 2) sequence after v3 base is stable; unification (Part 3) is practiced from iteration 1.
> Build v3 only if: BCITS prefers a smaller scope, accepts a less differentiated product, and is okay forcing AI on all users.
>

End of v3.5 expansion document.