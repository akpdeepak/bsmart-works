# bSmart Works — UI/UX Benchmark & Engagement Roadmap

> **Goal:** make bSmart Works a measurably better product for its users by borrowing the proven
> UI/UX engagement mechanics, productivity science, and design practices of best-in-class products
> (ChatGPT, Claude, Facebook/Meta, LinkedIn, Jira, Confluence, Microsoft) — adapted to an
> enterprise work tool, and grounded in what the bSmart Works codebase *actually* does today.
>
> **Thesis:** bSmart Works is **not** a weak product that needs rescuing. Its *interface*
> foundations (design tokens, cognitive-load laws, accessibility, command palette, role-based
> shell) already rival the benchmarks. The untapped value sits in three layers it has **never
> built**: the **behavioral layer** (activation, engagement), the **measurement layer** (UX
> metrics, funnels), and the **validation layer** (usability testing, experimentation). That is
> where the next gain in engagement and productivity lives.
>
> Status: **proposed** · owner: Deepak Pandey · created 2026-06-14 · siblings:
> [`UIUX-EXECUTION-PLAN.md`](./UIUX-EXECUTION-PLAN.md) (**the live execution plan + status ledger +
> session triggers** — start/resume the work from here) ·
> [`DESIGN-CONSISTENCY-PROGRAM.md`](./DESIGN-CONSISTENCY-PROGRAM.md) (convergence) ·
> [`UX-PROGRESS.md`](./UX-PROGRESS.md) (live extraction log) ·
> [`UX-CODEBASE-ANALYSIS.md`](./UX-CODEBASE-ANALYSIS.md) (extraction roadmap). Governed by the
> rule books in [`rulebooks/`](../rulebooks) — especially RB-20 (Product), RB-30 (Design), RB-40
> (Governance/AI).
>
> **Single source for premium UI/UX work.** This document now **absorbs** the *Premium UI/UX
> End-to-End Roadmap* (formerly `docs/PREMIUM-UX-ROADMAP.md`, now a pointer here) — itself the
> absorber of the *Design-Consistency Convergence Program*. The trigger phrase *"execute the premium
> UI/UX design roadmap"* resolves to **Part H** of this document (run Part A — Converge & Lock, then
> Part B — Elevate, in order). Parts A–G are the external-benchmark, behavioral, and measurement
> layers; Part H is the internal converge-and-elevate program; **Part I** maps how they fit together.

---

## Table of contents

1. [Executive summary](#1-executive-summary)
2. [How to read this document](#2-how-to-read-this-document)
3. [Part A — Current-state scorecard (code-grounded)](#part-a--current-state-scorecard-code-grounded)
4. [Part B — Benchmark design DNA](#part-b--benchmark-design-dna)
5. [Part C — Design philosophy & engagement framework layer](#part-c--design-philosophy--engagement-framework-layer)
6. [Part D — The feature roadmap (four horizons)](#part-d--the-feature-roadmap-four-horizons)
7. [Part E — Sequencing & dependencies](#part-e--sequencing--dependencies)
8. [Part F — First milestone: HEART + activation funnel](#part-f--first-milestone-heart--activation-funnel)
9. [Part G — Distillation: top adoptions, ranked](#part-g--distillation-top-adoptions-ranked)
10. [Part H — Premium UI/UX Program (Converge & Lock → Elevate)](#part-h--premium-uiux-program-converge--lock--elevate)
11. [Part I — How the benchmark horizons and the premium program fit together](#part-i--how-the-benchmark-horizons-and-the-premium-program-fit-together)
12. [Appendix — evidence index](#appendix--evidence-index)

---

## 1. Executive summary

The single most important reframing: **in consumer apps "engagement" means harvesting attention;
in an enterprise work tool it must mean the opposite — getting users to value fast, preserving
flow, and building a daily habit of *usefulness*.** bSmart Works should borrow the *mechanics* of
the great products (triggers, progress, personalization, variable feedback, speed) but point them
at productivity, not time-on-app. This aligns with the existing "Calm Cockpit, operational not
playful" ethos (RB-30 / CLAUDE.md §4, §22).

The throughline of the whole audit:

> bSmart Works has mastered the **interface layer** (tokens, Hick/Fitts/Miller/Gestalt/Jakob,
> WCAG a11y, ⌘K palette) but never built the **behavioral layer** (activation, engagement
> frameworks), the **measurement layer** (HEART, funnels), or the **validation layer** (usability
> testing, A/B). Those three layers are the roadmap.

The three highest-leverage moves, in order:

1. **Activation funnel** — a setup wizard + completeness meter + 60-second first value. There is
   *no onboarding at all* today; a new workspace lands on a blank app. This directly violates the
   product North Star ("value in 30–60s").
2. **HEART metrics + funnel instrumentation** — so engagement is *measured*, not guessed. This is
   the prerequisite that makes every other improvement legible.
3. **Speed discipline (Doherty <400 ms)** — optimistic-UI everywhere + real query caching +
   prefetch. TanStack Query is installed but unused; every navigation refetches cold.

---

## 2. How to read this document

- **Part A** is the *evidence*: what the code does today (five parallel deep-reads of the
  frontend). Everything downstream is justified against it.
- **Part B** is the *source material*: the design DNA of each benchmark product.
- **Part C** is the *why*: the engagement/productivity/design principles, frameworks, methods, and
  practices to adopt — the layer this document exists to add.
- **Part D** is the *what*: a prioritized feature roadmap across four horizons, each item tagged
  with what · why · how · which product it's borrowed from.
- **Parts E–G** are *execution*: sequencing, the first milestone, and the ranked distillation.

Precedence note (RB-00 / SOURCE-OF-TRUTH): where this document and the code disagree on *how it is
built today*, the code wins (Part A is kept honest). Where they disagree on *what we are building
toward*, this roadmap is the target.

---

## Part A — Current-state scorecard (code-grounded)

Derived from a structured audit of `works-frontend/src` (≈379 JSX/JS files, a 4,090-line
`App.jsx`, 104 components under `components/works`). This is the baseline the roadmap improves on.

### A.1 Already best-in-class — do **not** rebuild

| Area | Evidence in code | Comparable to |
|---|---|---|
| Three-zone shell + two-tier role/tier nav | `templates/three-zone-layout.jsx`; `lib/nav-model.js` (7 modes, 6 lenses, tier-gated VIEWER→OWNER); `organisms/mode-rail.jsx`, `organisms/sub-rail.jsx` | Jira / Linear nav |
| Design tokens, machine-enforced | `tailwind.config.js` (brand/neutral/semantic colors, radius, z-scale, motion); ESLint + `scripts/guardrails.sh` block raw hex/px/`gray-*`/arbitrary z-index | Fluent / ADS rigor |
| Command palette + keyboard system | `organisms/command-palette.jsx`; `lib/shortcuts.js` (`g+x` sequences, `?` help, server-overridable); `organisms/shortcuts-help.jsx` | Linear / Slack |
| Dark mode · motion tokens · reduced-motion | class strategy persisted to `localStorage`; `duration-fast/base/slow`; `@media (prefers-reduced-motion)` in `index.css` | MS / Linear |
| Accessibility (WCAG 2.1 AA) | `eslint-plugin-jsx-a11y`; modal focus-trap + restore (`molecules/modal.jsx`); live-region toasts; `*.a11y.test.jsx` files; Storybook a11y addon set to `error` | MS Inclusive Design |
| i18n + formatting | `lib/i18n.jsx` (10 languages, RTL, locale persistence); `lib/format.js` (smart relative/absolute dates, numbers, durations) | Enterprise-grade |
| Role dashboards / "Today" cockpit | 5 persona dashboards (`dashboards/*-dashboard.jsx`), configurable widgets, saved per-role layouts, `today-canvas.jsx` | Better than Jira defaults |
| Bulk actions · skeletons · empty states · collapsible-with-persistence · native DnD board | `organisms/bulk-edit-bar.jsx`, `atoms/skeleton.jsx`, `atoms/empty-state.jsx`, `atoms/collapsible.jsx`, board drag-drop in `App.jsx` | Jira parity |

### A.2 The five gap-clusters — where the benchmarks are genuinely ahead

1. **Speed / perceived performance**
   - TanStack Query is installed but **unused** (zero `useQuery`); data is fetched via raw
     `useEffect` + `api.raw`/`api.send` scattered across views.
   - **No route code-splitting** — 40+ eager view imports in a 4,090-line `App.jsx`; the whole app
     (incl. admin-only views) ships to every user.
   - **No virtual scrolling** (`@tanstack/react-virtual` absent) for large lists.
   - **No prefetch-on-hover**; every navigation loads cold.
   - **Optimistic UI is fragile** — creates apply immediately but failures don't roll back;
     invalidation is blunt (`invalidateQueries()` → flicker).

2. **List ergonomics**
   - Creation is **modal-only** (`create-work-item-dialog.jsx`); no inline quick-add.
   - **No list-level keyboard** (`j/k/e/n/Enter`); shortcuts are page-level only.
   - **Saved views are API-complete but UI-invisible** (`lib/saved-views.js` exists; no
     rename/delete/reorder surface).

3. **First-run & guidance** — *the biggest single gap*
   - **No onboarding, no setup wizard, no project templates, no tours, no tooltips.** A new
     workspace lands on a blank app. Directly contradicts the product North Star.

4. **Design-system completeness**
   - Missing primitives: Select, Textarea, Checkbox, RadioGroup, Toggle, Tooltip, Tabs, Table,
     Breadcrumb, Pagination, PageHeader.
   - **No generic `Card`** — three competing implementations (`stat-card`, `dashboard-widget-card`,
     `report-section-card`).
   - **Badge sprawl** — 6 ad-hoc badges (`status/priority/role/ai/lapse/sla`) instead of variants.
   - **Storybook ≈4% coverage** (4 of 104 components) — the system is invisible to designers/PMs.

5. **Depth surfaces**
   - Detail panel shell is 2-column (PR #217) but the **Details tab is a dense field-grid, not
     content-first**, and the **Activity feed is a raw event list, not a narrative**.
   - Knowledge editor (`BlockEditor.jsx`) is **single-author** — no real-time presence/conflict.
   - **Search** has no standalone surface and no full-text/body search (⌘K + title/id only).
   - Admin config is **form-heavy** — no visual workflow/chart/permission/layout builders, no live
     preview.
   - AI is **reactive only** — never proactive or contextual, despite a mature Control Plane.

---

## Part B — Benchmark design DNA

The compressed "what each product is actually good at," across the three lenses that matter here.

| Product | Signature engagement move | Signature productivity move | Design principle it embodies |
|---|---|---|---|
| **ChatGPT** | Streaming response holds attention; memory personalizes | Zero-chrome conversational input; lowest friction-to-answer | Get out of the way; one input, infinite output |
| **Claude** | Calm, trustworthy tone; Projects group context | Artifacts (side-by-side canvas) = think + produce together | Content-first, honest, low-ego; reading-grade typography |
| **Facebook / Meta** | Hook Model + variable-reward feed; ML ranking; notifications | Optimistic UI, instant feedback, infinite scroll | Move fast; data decides; perceived performance |
| **LinkedIn** | Endowed-progress (profile %), social proof, re-engagement nudges | Inline composer; "people/jobs you may know" suggestions | Completeness as a goal-gradient; proactive prompts |
| **Jira** | Momentum (boards visibly moving); notifications/mentions | Inline quick-add, JQL saved filters, bulk ops, keyboard | Make work visible; configurable to the team |
| **Confluence** | Real-time co-presence; @mentions; comments | Templates, page tree, inline editing | Collaboration as the default state |
| **Microsoft (Office / Copilot)** | Copilot contextual prompts; familiarity / habit | Ribbon (recognition > recall), templates, deep keyboard | Fluent: *Coherent · Inclusive · Adaptive*; "solve for one, extend to many" |

---

## Part C — Design philosophy & engagement framework layer

This is the layer the document exists to add. bSmart's CLAUDE.md §4.15 already codifies the
*interface* cognitive laws (Hick, Fitts, Miller, Gestalt, Jakob, Progressive Disclosure). What
follows is everything *above* that — the behavioral, structural, research, and operational layers.

### C.0 The reframe — enterprise engagement ≠ consumer attention

Adopt the **mechanics** of consumer engagement, but invert the **goal**:

| Consumer goal (reject) | Enterprise goal (adopt) |
|---|---|
| Maximize time-on-app | Minimize time-to-value |
| Variable reward → dopamine loop | Variable *relevance* → the daily check pays off |
| Notifications that pull you back | Notifications that close open work loops |
| Infinite scroll | Bounded, prioritized "Today" |
| Streaks for their own sake | Progress that reflects real work done |

Every engagement technique below is filtered through this inversion.

### C.1 User engagement — the behavioral frameworks (bSmart's biggest blind spot)

| Framework / principle | Who runs on it | Apply to bSmart as… |
|---|---|---|
| **Fogg Behavior Model** — B = Motivation × Ability × Prompt | LinkedIn, MS Copilot | Any stalled workflow = low ability or missing prompt. Add the *prompt* (proactive Today nudges) + raise *ability* (templates, inline quick-add) |
| **Hook Model** — Trigger → Action → Variable reward → Investment | FB, LinkedIn | Healthy version: mention/notification = trigger; act on item = action; *visible progress* = reward; configuring your cockpit = investment that raises switching cost |
| **Endowed-progress / Goal-gradient** | LinkedIn profile %, Duolingo | A workspace/project **setup-completeness meter** + sprint/goal progress bars to pull new users to activation |
| **Zeigarnik effect** — open loops nag | Jira badges, email drafts | Persistent "assigned to me / awaiting you" counts; auto-saved drafts; "left in review" reminders |
| **Variable feedback (ethical)** | feeds | A personalized "Today" that surfaces genuinely *different, relevant* items each visit — relevance, not randomness |
| **Social proof / reciprocity** | LinkedIn, Confluence | @mentions, comment reactions, "N teammates viewing" presence — light social signals that pull collaboration |
| **Peak-End rule** — judged by peak + finish | Apple, Duolingo | Design the *moment of completion* (sprint complete, item done) within the calm aesthetic |
| **Von Restorff (isolation) effect** | — | Already embodied: single-orange-accent rule (one CTA stands out). Keep it disciplined |

**bSmart-specific:** the plumbing exists (SSE presence, notifications, the `events` store, role
dashboards) but none of the *behavioral design* on top. Highest-leverage: the **activation funnel**
(setup wizard → completeness meter → first value in 60s).

### C.2 Productivity — the speed & flow principles

| Principle | Exemplar | bSmart status → action |
|---|---|---|
| **Doherty Threshold (<400 ms)** — productivity collapses past ~400 ms | Linear, Superhuman | ❌ No perf budget → optimistic UI everywhere + Query cache + prefetch; set a 400 ms SLO in CI |
| **Recognition over recall** | MS ribbon, palettes | ✅ Command palette exists → extend to *every* action |
| **Flow-state preservation (no interruption)** | Linear, Notion | ⚠️ Modal-first creation breaks flow → inline quick-add; ambient (not modal) notifications |
| **Conservation of complexity (Tesler's Law)** | Jira (JQL *and* visual builder) | ⚠️ You expose BQL but no visual builder → casual users carry the complexity. Add visual builders over BQL |
| **Smart defaults > configuration** | Gmail, MS | ⚠️ Powerful config, blank-slate defaults → ship opinionated template defaults |
| **Batching** | Jira bulk ops, Gmail | ✅ Bulk bar exists → add a preview-the-change wizard |
| **Keyboard-first** | Linear, Superhuman | ⚠️ Global shortcuts strong; **list-level `j/k/e/n`** missing |
| **Optimistic UI** | Meta, Linear | ⚠️ Happy-path only → add rollback on failure |

### C.3 Design principles (the stated philosophies)

| Source | Principle | What to borrow |
|---|---|---|
| **Don Norman** (Design of Everyday Things) | Affordance · Feedback · Constraints · Mapping | Every control should *look* like what it does and confirm it happened — audit the detail panel |
| **Nielsen's 10 heuristics** | Visibility of status, match to real world, error prevention, recognition>recall… | Run a heuristic evaluation of each surface (a method never applied here) |
| **Dieter Rams** | "Less, but better" | "Calm Cockpit" already aligns — keep the single-accent discipline |
| **MS Fluent** | Coherent · Inclusive · Adaptive · Beautiful; "solve for one, extend to many" | Elevate *Inclusive Design* from a lint rule to a stated principle |
| **Atlassian ADS** | "Bold, optimistic, practical, with a wink" | Name the product *voice/personality* (implied in microcopy rules, not stated) |
| **Claude / Anthropic** | Calm, honest, content-first | Apply to detail panel (content-first) and activity-as-narrative |

### C.4 Frameworks (structural) — have vs. need

| Framework | Purpose | bSmart |
|---|---|---|
| **Atomic Design** | Component structure | ✅ Have it |
| **Design Tokens (W3C)** | Single styling source | ✅ Strong, enforced |
| **WCAG 2.1 AA** | Accessibility | ✅ Enforced |
| **Double Diamond / Design Thinking** | Discover → Define → Develop → Deliver | ❌ Delivery-only; no discovery track |
| **Jobs-to-be-Done** | Design around the user's "job" | ❌ Not used — would sharpen persona dashboards |
| **Google HEART** (Happiness, Engagement, Adoption, Retention, Task-success; Goals→Signals→Metrics) | **UX measurement** | ❌ **Critical miss** — can't improve engagement you don't measure |
| **AARRR / activation funnel** | Acquisition → Activation → Retention | ❌ No funnel instrumentation |
| **Lean UX** (build-measure-learn) | Reduce design waste | ❌ No measure loop |

**Standout gap: HEART** — adopt as the UX-metrics framework so Section C.1's engagement work is
measurable, not vibes.

### C.5 Methods (research & validation) — currently absent

| Method | What it does | Adopt for bSmart |
|---|---|---|
| **Usability testing** (5 users ≈ 85% of issues) | Watch real users struggle | Run on onboarding + detail panel first |
| **Heuristic evaluation** | Expert review vs Nielsen's 10 | Cheap; do it this iteration |
| **A/B testing / experimentation** | Meta/LinkedIn/MS run thousands | Pair with a feature-flag layer; test onboarding variants |
| **Journey mapping + JTBD interviews** | Find friction across a flow | Map "plan a sprint" / "triage my work" |
| **Tree testing / card sorting** | Validate IA/nav | Validate the 7-mode nav against real mental models |
| **Session analytics / funnel analysis** | See where users drop | Instrument the activation funnel |
| **Dogfooding** | Use your own tool | Run bSmart's roadmap *in* bSmart |

### C.6 Practices (how the work is run)

| Practice | Benchmark | bSmart |
|---|---|---|
| **Component-driven dev + Storybook** | Atlassian, MS | ⚠️ Installed, ≈4% coverage → make it the design-system shop window |
| **Design Ops / system governance** | All | ✅ Rule-enforcement exists; add *visual* governance (Storybook + Chromatic, already configured) |
| **Telemetry-informed design** | Meta, MS | ❌ Instrument everything (within DPDP, RB-40) |
| **Continuous discovery (dual-track)** | SVPG teams | ❌ Add a discovery track beside delivery |
| **Inclusive Design** | MS | ⚠️ Lint-level → make it a practice (personas with disabilities) |
| **UX-writing discipline** | All | ✅ Microcopy rules — strong |
| **Performance budgets** | Google, Linear | ❌ Set bundle + Doherty-400 ms budgets in CI |
| **Progressive rollout of UX changes** | All | ❌ Needs the feature-flag layer |

---

## Part D — The feature roadmap (four horizons)

Each item: **what · why · how · borrowed from.** Almost nothing here is greenfield — it rides
existing strengths (AI Control Plane, the `events` store, the `Workflow`/`FieldDef`/`Dashboard`
config layer, the design-token system).

### Horizon 1 — Quick wins (days–2 weeks each; highest ROI; mostly *finishing* half-built things)

| # | What | Why | How | Borrowed from |
|---|---|---|---|---|
| 1 | **First-run onboarding + project templates** | #1 gap; new users hit a blank app and churn. Templates convert "blank slate" → "value in 60s" (the North Star) | Setup wizard (workspace → template → invite); ship Scrum / Kanban / Bug-tracking / RAID seed templates via the existing `Workflow`+`FieldDef`+`Dashboard` config layer; a completeness checklist widget on Today | **Jira** (templates), **LinkedIn** (completeness) |
| 2 | **Inline quick-add on lists** | Modal-per-create kills flow and loses list context; capture cost should be ≈0 | Press `N`/`+` → editable row at top of backlog/board; Enter saves, Esc cancels; keep the dialog as the power path | **Jira backlog**, **Linear** |
| 3 | **List-level keyboard rhythm** (`j/k/e/n/Enter`) | Global `g+x` shortcuts are strong but the *list* isn't a keyboard surface; power users live in lists | Extend `lib/shortcuts.js` with a focused-list context; wire selection state in board/backlog/my-works | **Linear**, **Jira**, **Gmail** |
| 4 | **Surface saved views** | Backend done (`lib/saved-views.js`) but invisible — pure waste | Render saved views as first-class sidebar items per list section, with rename/delete/reorder | **Jira** (saved filters/JQL) |
| 5 | **Optimistic-UI rollback** | A failed create currently *stays* in the list; blunt invalidation flickers | `useMutation` `onMutate`/`onError`/`setQueryData` rollback (also slice 1 of the Query migration) | **Meta**, **Linear** |

### Horizon 2 — Foundations (1–2 iterations)

| # | What | Why | How | Borrowed from |
|---|---|---|---|---|
| 6 | **Performance pass** — adopt TanStack Query + route `lazy()` + virtual scroll + prefetch-on-hover | Cold-load on every nav, full-app bundle, no big-list virtualization: the gap between "functional" and "instant" (Doherty) | Migrate fetches to `useQuery` (cache/dedup/SWR); `React.lazy` + Suspense per route; `@tanstack/react-virtual` on >100-row lists; `prefetchQuery` on row hover | **Meta**, **LinkedIn 3×3**, **Linear** |
| 7 | **Complete the design system** — form controls (Select/Textarea/Checkbox/Radio/Toggle), generic `Card`, `Tabs`, `Tooltip`, `Table`, `Breadcrumb`, `PageHeader`; consolidate 6 badges → 1; Storybook to ≈80% of atoms/molecules | Every form re-implements inputs; 3 cards duplicate shadow/padding; designers can't see the system | Build missing atoms with the `cva`+`cn()` pattern. **This is the full Premium Program work-stream A-WS1 → run it via [Part H](#part-h--premium-uiux-program-converge--lock--elevate), not as a one-off** | **Atlassian ADS**, **MS Fluent 2** |
| 8 | **Unified Error / Empty / Loading states + retry** | No `ErrorState`; can't distinguish "failed" vs "no results" vs "no permission"; no retry affordance | One `<AsyncBoundary>` (skeleton ↔ error+retry ↔ empty) wrapping data surfaces; map the `{code,message,field}` API shape to it | **all** |
| 9 | **Notification center + toast queue + prefs UI** | Single-toast slot drops bursts; SSE exists but inbox/triage is sparse; `NotificationPreference` has no surface | Stack/queue toasts; build a notification panel off the SSE stream; expose the preference entity (mute/snooze/quiet-hours) | **Meta**, **LinkedIn** |

### Horizon 3 — Differentiators (2–4 iterations; where bSmart pulls *ahead*)

| # | What | Why | How | Borrowed from |
|---|---|---|---|---|
| 10 | **AI-native UX** — contextual + proactive + streaming + a canvas | AI is architecturally excellent (Control Plane, fallbacks) but *reactive*; the benchmarks make AI ambient | Inline "draft description / fill fields" in detail panel; proactive Today nudges ("5 overdue — bulk-reschedule?"); **stream** AI token-by-token; an **Artifacts-style** side canvas for AI-built reports/articles — all on the existing capability + fallback layer (RB-40 §2) | **ChatGPT/Claude** (streaming, Artifacts), **MS Copilot** (contextual) |
| 11 | **Content-first detail + narrative activity feed** | Detail shell is 2-column (PR #217) but the Details *tab* is a dense field-grid and Activity is a raw event dump | Lead with title/description prose at reading width; render `events` as human sentences ("Rahul moved this to In Progress · 2h ago") | **Claude** (editorial), **Confluence** |
| 12 | **Real-time collaborative knowledge editor + inline comments + templates** | `BlockEditor.jsx` is rich but single-author — no presence/conflict; no page templates | SSE-driven presence + soft-lock/merge; inline block comments; seed article templates (PRD, runbook, retro) | **Confluence**, **Notion** |
| 13 | **Search overhaul** — standalone surface + full-text body + facets | Search is modal-only and title/id-only; no article-body or comment search | Dedicated search page with facets (type/space/date/status) + full-text over items + articles; keep ⌘K as the quick entry | **Jira/Confluence search** |
| 14 | **Board swimlanes/grouping + bulk-change preview wizard** | Board is fixed to 3 status columns; bulk edit is one-field-flat with no preview | Group-by assignee/type/epic/release swimlanes; a bulk wizard that previews the diff before commit | **Jira** |
| 15 | **Visual builders + live preview** (workflow, chart, permission matrix, field layout) | Admin config is form/table-heavy; admins write BQL by hand for simple charts (Tesler's Law violated) | Drag-drop workflow states/transitions; visual metric/dimension chart picker over BQL; live preview of layout/visibility changes | **Jira workflow editor**, **MS** |

### Horizon 4 — Platform maturity

| # | What | Why | How | Borrowed from |
|---|---|---|---|---|
| 16 | **Mobile/tablet responsive redesign** | Shell has a drawer but views are desktop-only; native apps are separate repos, so web mobile matters | Breakpoint-aware layouts for board/detail/lists; touch targets; stacked columns < 1024px | **all** |
| 17 | **Personalization** — density toggle, theme-toggle UI, layout prefs | Density/theme exist in CSS but have no user-facing control | Comfortable/compact/spacious density; explicit theme switch; persist via the user-prefs path | **Linear**, **MS** |
| 18 | **Help & discoverability** — tooltips w/ shortcut hints, contextual help, optional tours | Power features are invisible until `?`; no tooltips | Tooltip atom (from #7) showing label + shortcut on icon buttons; first-use coachmarks | **MS**, **LinkedIn** |
| 19 | **Decompose `App.jsx`** (enabler) | 4,090 lines / 100+ `useState` is the substrate blocking #6, #10, #11 | Extract per-view hooks + fetchers; continue the `UX-PROGRESS.md` decomposition | (internal enabler) |

---

## Part E — Sequencing & dependencies

- **#5 → #6** are the same thread: do the optimistic-rollback fix *as* the first slice of the Query migration.
- **#7 (design system)** unblocks #8 (`AsyncBoundary`), #11, #15, #18 — build the primitives before the surfaces that consume them.
- **#19 (App.jsx decomposition)** is the quiet enabler for #6/#10/#11 — schedule it *alongside*, not after.
- **Part F (HEART + funnel)** should land *before or with* Horizon 1 #1, so onboarding is measured from day one.
- Everything rides existing strengths — AI Control Plane (RB-40), the `events` store, the
  `Workflow`/`FieldDef`/`Dashboard` config layer, the design-token system. Confirm the active
  iteration (CLAUDE.md §6) before scheduling; do not build ahead of it (RB-20).

```
Part F (measure) ─┬─► H1 #1 onboarding ──► H1 #2-#4 list ergonomics ──► H1 #5 ─┐
                  │                                                            ├─► H2 #6 perf
   H2 #7 design system ──► H2 #8 async states ──► H3 #11/#15 surfaces          │
                  └─► H2 #9 notifications                                      │
   H4 #19 App.jsx decomposition (continuous enabler) ───────────────────────►─┘
```

---

## Part F — First milestone: HEART + activation funnel

**Why first:** you cannot improve engagement or productivity you do not measure, and the activation
funnel is both the biggest gap and the thing most worth measuring. This milestone makes every later
horizon legible.

**HEART goals → signals → metrics (starter set):**

| Dimension | Goal | Signal | Metric |
|---|---|---|---|
| **Happiness** | Users trust the tool | In-app sentiment / CSAT | Periodic micro-survey score |
| **Engagement** | Daily habit of value | Returns + meaningful actions | DAU/WAU; actions per active day |
| **Adoption** | New workspaces reach value | Setup completion | % workspaces hitting "first value" event |
| **Retention** | Teams keep using it | Week-N return | W1/W4 workspace retention |
| **Task success** | Core jobs are fast | Funnel completion + time | Create-item & plan-sprint success rate + time-on-task |

**Activation funnel to instrument (AARRR-style):**

```
Sign up → Create/seed workspace → Apply a template → Create first work item
        → Invite a teammate → Return on day 2
```

**How (within RB-40 / DPDP — no PII to third parties, server-side, auditable):**
1. Emit lightweight UX-telemetry events into the existing `events` store (or a sibling table) for
   each funnel step — reuse `EventService`, do not bolt on an external tracker.
2. Define a "first value" event explicitly (e.g., first work item created in a real project).
3. Build a small internal **HEART/funnel dashboard** using the existing `Dashboard`/BQL stack —
   dogfood it.
4. Gate new UX changes behind a feature flag (prerequisite for A/B; see Part C.6) so onboarding
   variants can be compared.

---

## Part G — Distillation: top adoptions, ranked

Ranked by combined **engagement + productivity** impact (the lens you asked for):

1. **Activation funnel** (Fogg + endowed-progress): setup wizard → completeness meter → 60-second
   first value. *Engagement: highest. There is zero onboarding today.* — **Jira / LinkedIn**
2. **HEART metrics + funnel instrumentation**: makes engagement measurable; enables everything
   else. — **Google / Meta**
3. **Speed discipline (Doherty <400 ms)**: optimistic-everywhere + Query cache + prefetch; CI perf
   budget. *Productivity: highest.* — **Linear / Meta**
4. **Flow preservation**: inline quick-add + list-level keyboard + ambient (never modal)
   notifications. — **Linear / Jira**
5. **Proactive / contextual AI** (Fogg "prompt"): your AI is reactive; make it nudge. *Engagement +
   productivity.* — **MS Copilot / Claude**
6. **Tesler's-Law visual builders**: a visual layer over BQL/workflows so casual users aren't
   handed the complexity. — **Jira**
7. **Validation methods**: usability test + heuristic-eval onboarding and the detail panel *before*
   building more. *Cheap, high-signal.* — **all**

**The throughline:** bSmart has mastered the *interface* layer but never built the *behavioral*,
*measurement*, or *validation* layers. That is where the next gain in engagement and productivity
lives.

---

## Part H — Premium UI/UX Program (Converge & Lock → Elevate)

> **The trigger-phrase program.** Saying *"execute the premium UI/UX design roadmap"* means running
> this whole program, in order: **Part A — Converge & Lock** (finish adopting the existing design
> system across every surface and lock it so it can't drift), then **Part B — Elevate** (premium
> depth on the converged base). This Part absorbs the former `docs/PREMIUM-UX-ROADMAP.md` and, through
> it, the *Design-Consistency Convergence Program*. Governed by RB-30, executed per RB-05. No feature
> change — the Feature Parity Ledger (RB-20 §1) holds.

### H.0 Why this exists (and what it is *not*)

bSmart Works already has a **mature, machine-governed design system** — not a greenfield. So this is
a **convergence + elevation** program, never a redesign or a token rework:

- **Tokens are single-source and enforced** (`tailwind.config.js` + `src/index.css`); ESLint +
  `guardrails.sh` block raw hex, `gray-*`, `works-*`, arbitrary `z-[]`/`p-[]` at save · pre-commit · CI.
- **Canonical primitives + `cva`+`cn()` pattern exist** (`atoms/button.jsx`), dark mode universal,
  three-zone shell app-wide.
- **Convergence is ~60% done:** `App.jsx` ~8,400 → ~4,300 lines, ~95 views extracted, emoji→Lucide
  largely complete.
- **Standout surfaces already premium:** role-tuned Today dashboards, Scrum Master Cockpit, AI Studio,
  BQL builder, pivot-chart engine, ⌘K palette, real-time SSE presence + offline sync, i18n ×10 (incl.
  Arabic RTL), PWA.

Visual target = the **"Calm Cockpit"** direction (navy primary, single orange accent, Lucide,
expand-in-place, persona "Today", role-based nav). Brand origin: `docs/brand/brand-and-identity.md`.

### H.1 Convergence scorecard (design-system lens, 2026-06-14)

Complements [Part A](#part-a--current-state-scorecard-code-grounded) (which is the engagement/perf
lens). Same codebase, finer-grained on system adoption:

| Dimension | State | Evidence (approx.) |
|---|---|---|
| Tokens (colour/space/radius/z/width) | ✅ Canonical, enforced | only **3 raw hex** repo-wide (`organisms/status-management-tab.jsx`) |
| Three-zone shell | ✅ Canonical | `templates/three-zone-layout.jsx`, app-wide |
| Modal / FormField / Empty / Skeleton / Toast / ErrorBoundary | ✅ Exist, a11y-correct | `components/works/**` |
| Dark mode | ✅ Universal | `dark:` pairs everywhere |
| **Shared `Card`** | ❌ Missing | ~85 hand-rolled card blocks across 29+ views |
| **Shared `Tabs`** | ❌ Missing | tab bars rebuilt per view |
| **Shared `DataTable`** | ❌ Missing | hand-rolled `<table>` per view |
| **Shared `PageHeader`** | ❌ Missing | headers hand-coded; `h1` scale varies |
| Content width | ⚠️ Drifted | ~10 distinct `max-w-*`; RB-30 sanctions only `max-w-7xl` + `max-w-[880px]` |
| Page padding | ⚠️ Drifted | `p-4 / p-6 / p-8` mixed at page level |
| `Modal` adoption | ⚠️ Low | ~5 / 95 views; others build inline dialogs |
| `Button` adoption | ⚠️ Mixed | ~55 inline `<button>` vs ~114 `<Button>` |
| Error / Loading states | ⚠️ Partial | error ~29/95, loading ~19/95 |
| Control labelling (a11y) | ⚠️ Partial | systematic `aria-label`/`htmlFor` ~29/95 |
| `cva` adoption | ⚠️ Low (by design) | 4/~101 — `cva` matters for *stateful* components only |
| Storybook coverage | ⚠️ Low | 4/~101 components |
| Routing / deep-link | ❌ Missing | `App.jsx` syncs URL by hand; sub-state lost on reload |
| Inclusivity (colour-blind / high-contrast / SR charts) | ❌ Missing | charts colour-only; no HC theme |

> **Read the metric correctly:** the target is **zero hand-rolled cards/tables/headers/dialogs in
> `views/`**, not "100% `cva`".

### H.2 Definition of done (exit criteria)

A surface is **converged** when: (1) it renders through one `PageLayout` (shell → `PageHeader` →
content) with exactly one of the two sanctioned widths + one padding rhythm; (2) no hand-rolled
card/table/tab-bar/dialog/icon-button — all from `components/works/**`; (3) every data region handles
**default · loading · empty (with next action) · error (what + what-next) · partial**, and every
control has the five interaction states (RB-30 §1); (4) zero raw hex/arbitrary values; (5) every
control labelled, keyboard-operable, visible focus, WCAG 2.1 AA, **no `eslint-disable`**; (6) light +
dark verified. A surface is **premium** when, on top of converged, it meets its Part-B items
(density, motion, deep-link, inclusivity) where applicable.

### H.3 The unified primitive library

Build once, in `cva`+`cn()`, dark-complete, a11y, RTL, with a Storybook story.

| Primitive | Part | Replaces / Adds |
|---|---|---|
| `Card` (`elevated`/`outlined`/`flat`) | A | ~85 inline card blocks; header/body/footer slots |
| `PageHeader` | A | per-view headers; title + breadcrumb slot + actions slot; one `h1` scale |
| `Tabs` | A | per-view tab bars; roving-tabindex, `aria-selected`, active indicator |
| `DataTable` (+ head/body/row/cell) | A→B | hand-rolled `<table>`; **B adds** sticky header, multi-sort, column resize/reorder/show-hide, row-select + bulk bar (`z-bulkbar`), inline edit, density-aware, **virtualized** |
| `IconButton` | A | icon-only `<button>`s; enforced `aria-label`; sizes 16/20/24 |
| `Drawer` / `SidePanel` | A | inline right-panels; wraps shell overlay + collapse |
| `Confirm` (over `Modal`) | A | ad-hoc confirm dialogs; pairs with `useDialog()` |
| Form set: `Checkbox` `Radio` `Toggle/Switch` `Select`/`Combobox` | A | raw inputs; completes the `FormField` family |
| `Badge` consolidation | A | status/priority/role/meta badges → one `Badge variant` |
| `Tooltip` | B | hover/focus, delay, `aria-describedby` |
| `Popover` | B | generic anchored overlay (`z-dropdown`/`z-panel`) |
| `DatePicker` | B | keyboard + locale + RTL |
| `Pagination` | B | list endpoints (RB-10 §4) |
| `Breadcrumb` | B | mode → surface → record (Nav theme) |
| `Progress` | B | determinate/indeterminate |
| `Slider` | B | new |
| `Alert` (standalone) | B | inline banner, semantic tones |

### H.4 Part A — Converge & Lock (the "last 40%")

- **A-WS1 · Fill the missing shared primitives** *(highest leverage)* — build the Part-A rows above
  (Card, PageHeader, Tabs, DataTable base, IconButton, Drawer, Confirm, form set, Badge). Each deletes
  dozens of hand-rolled copies.
- **A-WS2 · Standardise the page skeleton** — one `PageLayout` composes shell → `PageHeader` → content
  wrapper exposing only two widths (`width="dashboard"` → `max-w-7xl`, `width="reading"` →
  `max-w-[880px]`) and one padding rhythm. This is what makes pages *feel* the same.
- **A-WS3 · Adopt across all ~95 views** *(mechanical convergence)* — view-by-view via the proven
  **extract-loop** (byte-identical extract → ESLint `no-undef` proves the prop set → RTL test → live
  smoke → small squash-merge). **Start with the 4 exemplars** (~20% of view code, all patterns):
  `pm-view.jsx` · `bql-view.jsx` · `admin-ops-view.jsx` · `compliance-view.jsx`.
- **A-WS4 · Lock it so it cannot regress** — new structural guardrails scoped to `views/` (ban raw
  `<table>`, inline card-chrome cluster, raw `<button>`; restrict page-level `max-w-*` to the two
  sanctioned values; warn on a data view with no empty/error branch); re-enable guardrails on 100% of
  `views/` (delete every remaining `eslint-disable`); Storybook → visual regression (Chromatic; ≥ 50
  stories); a one-page `docs/COMPONENT-SYSTEM.md` (when `cva` vs `cn()`; a11y checklist; icon sizes;
  token notes).

### H.5 Part B — Elevate (premium depth on the converged base)

**Theme 1 — Design-system depth**
- **1.1 Premium primitives:** the Part-B rows above (Tooltip, Popover, DatePicker, Pagination,
  Breadcrumb, Progress, Slider, Alert).
- **1.2 Elevation & density:** 3-level elevation ramp (`shadow-sm/md/lg` → resting/hover/overlay) + a
  global **density mode** (compact/comfortable/spacious) via a `useDensity()` hook + token-driven
  padding scale (generalize the board's existing toggle). *Data-dense DISCOM users want compact.*
- **1.3 Motion choreography:** standardize panel/modal/toast/accordion entrance-exit on `duration-base`
  + `out-quint`; reserve `spring` for press/drag; optimistic-update shimmer + success check-morph.
- **1.4 Token additions:** `text-2xs`/`text-3xs` (retire the `App.jsx` `text-[10px]` exemption);
  focus-ring alias; categorical chart-palette tokens.

**Theme 2 — Navigation & shell**
- **2.1 Real router + deep-linkable state** (React Router / TanStack): view + sub-state (selected item,
  active tab, filters, panel-open) in the URL. *Large refactor → its own task; **stop-and-ask**
  (touches `App.jsx` / TD-003).*
- **2.2 Breadcrumbs** in the top context bar (uses the `Breadcrumb` primitive).
- **2.3 Command palette → action layer:** extend `command-palette.jsx` to actions (create, change
  status, assign, run saved view, toggle theme) + recent/frequent.
- **2.4 Persisted view state:** filters/sort/density/collapsed-rails/open-tab per surface (URL +
  per-user pref) so context survives reload and is shareable.

**Theme 3 — Data surfaces**
- **3.1 Premium `DataTable`:** virtualization, multi-sort, column ops, bulk bar, inline edit,
  density-aware — unifies BQL results, reports, admin lists.
- **3.2 Board & list scale:** virtual scroll for 1000+ cards; lazy-load off-screen charts
  (`IntersectionObserver`). *Holds RB-40 §5 NFR budgets.*
- **3.3 Richer analytics:** comparison charts (plan-vs-actual, period-over-period),
  capacity/utilization heatmaps, workflow Sankey — **extend** the pivot engine; interactive legend;
  drill-through into `DataTable`.
- **3.4 Detail-panel polish:** inline-edit affordances, presence cursors in panel, "what changed since
  you last viewed" diff on the Activity tab.

**Theme 4 — AI & inclusivity**
- **4.1 Deeper, honest AI:** title/description suggestions, task breakdown, duplicate detection — each
  **routes through the AI Control Plane** with a visible verdict badge and a documented deterministic
  fallback. *RB-40 §2: no fallback documented = it does not ship; AI budget/scope is **stop-and-ask**.*
- **4.2 Streaming affordances:** token-streaming, "thinking" states, stop/regenerate, cached-vs-live
  indicator — consistent across AI Studio, conversational dashboards, comment summarize.
- **4.3 Inclusivity → WCAG 2.2 AA:** colour-blind-safe categorical chart palette (never colour-only —
  pair shape/label); **high-contrast theme** as a third mode; **screen-reader chart fallback** (every
  chart exposes an accessible `<table>`); audit `neutral-400`-as-text misuse.

### H.6 Colours & visual specs (cross-cutting)

- **Keep the brand spine:** `brand-navy` primary; `brand-orange` the single sparing CTA accent
  (RB-30 §2) — do **not** broaden the accent palette.
- **Add, in tokens only:** categorical chart palette (6–8 hues, colour-blind-safe); high-contrast theme
  variables; `text-2xs`/`text-3xs`. All via `tailwind.config.js` — never raw hex (guardrail BLOCK).
- **Spec hygiene:** flip `z-[]` + arbitrary-spacing guardrails **WARN → BLOCK** once baseline clean.

### H.7 Unified sequencing (one ordered program)

| Phase | Scope | Notes |
|---|---|---|
| **0 — Prove (days)** | A-WS1 start: `Card` + `PageHeader` + `Tabs`; 3 structural lint rules (warn-only); pilot-migrate the 4 exemplar views | foundation |
| **1 — Core primitives (1–2 wk)** | A-WS1 finish: `DataTable` base + `Drawer` + `IconButton` + form set + `Badge`; A-WS2 `PageLayout`; migrate ~20 data-heavy views; token adds `text-2xs/3xs` | |
| **2 — Breadth (2–3 wk)** | A-WS3 remaining views; app-wide loading/empty/error + `aria-label` sweep; A-WS4 Storybook + visual regression; build Part-B premium primitives | |
| **3 — Harden + Premium P0 (ongoing)** | A-WS4 flip lint to error, remove all `eslint-disable`, `React.lazy` per route, dark-contrast audit; **Premium P0:** inclusivity (colour-blind palette, HC theme, SR charts), elevation/density spec, motion choreography, guardrail WARN→BLOCK | base now premium-ready |
| **4 — Premium P1** | breadcrumbs (2.2), command-palette actions (2.3), premium `DataTable` (3.1), density preference (1.2), surface polish pass | builds on converged base |
| **5 — Premium P2 (stop-and-ask)** | router/deep-linking (2.1, `App.jsx`), board virtualization (3.2), richer analytics (3.3), deeper/streaming AI (4.1–4.2) | each its own gated task |

Each step is a **small, single-purpose, lint-clean PR** through RB-05 — no big-bang rewrite, no
feature change.

### H.8 Tracking & metrics (drive to zero / 100%)

inline card blocks in `views/` → **0** · raw `<table>` / raw `<button>` in `views/` → **0** · distinct
page-level `max-w-*` → **2** · views with full loading/empty/error → **100%** · views with
`eslint-disable` → **0** · Storybook stories → **≥ 50** w/ visual-regression · charts with SR fallback
→ **100%** · themes shipped → **light/dark/high-contrast**. Logged newest-first in
`docs/UX-PROGRESS.md`, tagged `[consistency]` / `[premium]`.

### H.9 Governance & references

Canonical design law: RB-30 — this program *adopts* it. Process: RB-05 (every migration a gated PR;
scope discipline RB-10 §9 / RB-20). Tenant/AI/NFR: RB-40 (§2 AI fallback, §5 NFR budgets). DoD per
item: tests prove behaviour · tokens not literals · WCAG AA · unauthorized + cross-tenant tests where
data is touched · NFR budget on hot paths · CI green; **AI + structural items need a Deepak checkpoint
(stop-and-ask)**. History: `docs/UX-CODEBASE-ANALYSIS.md`, `docs/UX-PROGRESS.md`; absorbed:
`docs/PREMIUM-UX-ROADMAP.md` (pointer), `docs/DESIGN-CONSISTENCY-PROGRAM.md`.

---

## Part I — How the benchmark horizons and the premium program fit together

Parts A–G (benchmark) and Part H (premium) are **complementary lenses on the same app**, not two
competing roadmaps. The premium program is the **visual/system substrate**; the benchmark layers add
**behavior, measurement, and external-pattern depth** on top.

**The mental model:**

```
Premium Part A (Converge & Lock)  ── the foundation: one system, locked, no drift
        │
        ├─►  Premium Part B (Elevate)  ≈  Benchmark Horizon 3 differentiators   ← same work
        │
        └─►  Benchmark Part C/F (behavioral + measurement)  ← NET-NEW, premium has none
```

**Overlap map — where an item appears in both (do it once):**

| Benchmark item (Part D / F) | Premium item (Part H) | How to treat it |
|---|---|---|
| H2 #7 Complete the design system | A-WS1 + A-WS2 + A-WS3 | **Same work** — run the Premium program; #7 is the summary |
| H2 #6 perf (virtual scroll, route split) | 3.2 board/list scale; Phase 3 `React.lazy` | Same; sequence under Premium Phase 1–3 |
| H2 #8 unified Error/Empty/Loading | DoD (3) + A-WS3 state sweep | Same; folded into convergence DoD |
| H4 #17 personalization (density, theme) | 1.2 density + 4.3 high-contrast theme | Same |
| H4 #18 help/tooltips | 1.1 `Tooltip` primitive | Same |
| H4 #19 App.jsx decomposition | 2.1 router + deep-link | Related; both gated stop-and-ask |
| H3 #10 AI-native (contextual/proactive/streaming) | 4.1 + 4.2 | Same |
| H3 #11 content-first detail + narrative activity | 3.4 detail-panel polish | Same |
| H3 #13/#14 search / DataTable / swimlanes | 3.1 premium `DataTable` | Premium covers the table; search facets are benchmark-unique |

**Net-new in the benchmark layers (not in the premium program) — the genuinely additive value:**

- **Part C** behavioral frameworks (Fogg, Hook, endowed-progress, Zeigarnik, Peak-End).
- **Part F** measurement: HEART metrics + the activation funnel + instrumentation.
- **Horizon 1 #1** first-run onboarding + project templates (the #1 product gap).
- **Horizon 1 #2–#4** inline quick-add, list-level keyboard, saved-views UI.
- **Horizon 3 #13** search overhaul (standalone surface + full-text + facets).
- **Horizon 3 #15** visual admin builders (workflow/chart/permission/layout).
- **Part C.5/C.6** research methods + practices (usability testing, A/B, telemetry-informed design).

**Net-new in the premium program (not in the benchmark layers):**

- The **lock** mechanism (structural guardrails on `views/`, `eslint-disable` removal, visual
  regression) — without it, every gain drifts back.
- The complete **primitive library** spec (Part-A + Part-B) and the `PageLayout` skeleton.
- **Inclusivity to WCAG 2.2 AA** (colour-blind palette, high-contrast theme, SR chart fallback).

**Recommended combined order:** Premium **Phase 0–1** (foundation: primitives + `PageLayout` + 4
exemplars) → **Part F** (stand up HEART + funnel, so everything after is measured) → **Horizon 1**
activation + list-ergonomics wins (high ROI, ride the new primitives) → Premium **Phase 2–3** (breadth
+ harden + Premium P0 inclusivity) → **Horizon 3 ≈ Premium Part B** differentiators → Premium **Phase
5 / Horizon 4** stop-and-ask items (router, virtualization, deeper AI).

---

## Appendix — evidence index

This roadmap is grounded in a structured audit of `works-frontend/src` (2026-06-14). Key artifacts
referenced:

- **Shell & nav:** `templates/three-zone-layout.jsx`, `lib/nav-model.js`, `organisms/mode-rail.jsx`, `organisms/sub-rail.jsx`
- **Interaction:** `organisms/command-palette.jsx`, `lib/shortcuts.js`, `organisms/shortcuts-help.jsx`, `organisms/bulk-edit-bar.jsx`, `atoms/collapsible.jsx`
- **Design system:** `tailwind.config.js`, `index.css`, `components/works/{atoms,molecules,organisms,templates}`, `scripts/guardrails.sh`, `.storybook/`
- **Data/state:** `App.jsx` (≈4,090 lines), `lib/apiClient.js`, `lib/query-client.js` (installed, unused), `lib/saved-views.js`
- **Surfaces:** `views/{board,backlog,my-works,dashboard,reportbuilder,bql}-view.jsx`, `dashboards/*-dashboard.jsx`, `work-item-detail/*`, `BlockEditor.jsx`
- **Cross-cutting:** `lib/format.js`, `lib/i18n.jsx`, `lib/realtime.js` (SSE), `atoms/{skeleton,empty-state,toast}.jsx`, `molecules/modal.jsx`
- **AI:** `organisms/ai-command-bar.jsx`, `lib/ai.js`, backend `Ai*` + `rulebooks/40-GOVERNANCE.md` §2

> Maintenance: when an item ships, log it in [`UX-PROGRESS.md`](./UX-PROGRESS.md) and check it off
> here. Where this roadmap and the code diverge on *current* state, update Part A — the code wins.
