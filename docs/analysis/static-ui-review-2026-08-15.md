# bSmart Works — Static UI Improvement Review

**Date:** 15 August 2026  
**Scope:** implemented React views, shell/navigation, design tokens, reusable primitives, interaction states, responsive utilities and accessibility markup  
**Review mode:** static source inspection of real production code  
**Static UI-improvement maturity:** **59/100**  
**Runtime visual verification:** **Pending — application could not be started in the supplied environment**

> This is a code-level UI improvement review, not a screenshot-led visual audit. The frontend could not be built because dependencies were unavailable and installation failed in the supplied environment. No current-run screen captures were possible. Layout, contrast, clipping, rendering, motion, focus order and device behavior must be confirmed in a runnable build before any visual issue is considered closed.

## 1. Executive verdict

bSmart Works already has the ingredients of a credible premium enterprise UI: a restrained navy/orange identity, a complete neutral/semantic palette, dark mode, defined typography/radius/elevation/motion tokens, high-contrast and reduced-motion CSS, density modes, a two-tier navigation model, command palette, reusable Button/Card/PageLayout/EmptyState/AsyncBoundary/Tabs/Modal/Drawer primitives and strong focus/ARIA investment.

The product does not yet express that system consistently. Only 25 of 61 production view files reference the canonical `PageLayout`—some are intentionally nested tabs, but several top-level experiences still hand-build their own wrappers and headers. The canonical `DataTable` is not used by a production view. Four views use raw Tailwind color families, dominated by Messenger’s indigo/violet/amber styling. Messenger also contains extensive light-only surfaces and fixed panes. Twenty-two production views contain no responsive breakpoint utility. Small 24–28 px icon controls and 9–10 px text appear in high-density authoring and configuration surfaces. Navigation offers many overlapping entry points: six modes, contextual sub-rail, More, role lenses, BQL, global command/search and satellite cockpits.

The visual foundation should be retained. The main work is **convergence**: one page grammar, one data-surface grammar, one responsive master-detail pattern, one state model, one semantic palette and a smaller set of canonical navigation destinations.

### Highest-impact improvements

1. Standardize every top-level screen on `PageLayout + PageHeader + route-scoped actions`.
2. Adopt the existing `DataTable`, `Tabs`, `Card`, `AsyncBoundary`, `Modal` and `Drawer` primitives instead of local variants.
3. Simplify the topbar and navigation so users see one primary location for each task.
4. Rebuild Messenger and Knowledge as responsive master-detail experiences with tokenized colors and complete dark mode.
5. Establish phone/tablet compositions for boards, tables, dashboards, agent consoles and editors—not just breakpoint utilities.
6. Replace 9–10 px operational text and 24–28 px touch controls where they carry important meaning/actions.
7. Make loading, empty, partial, offline, permission, error, success and conflict states visually consistent.
8. Reserve orange for primary action/attention; use semantic tokens for status and neutral surfaces for structure.
9. Reduce card nesting and border noise; use whitespace and typography for hierarchy before elevation.
10. Add screenshot-based visual regression, dark/light, long-content, 400% zoom and mobile E2E gates.

## 2. Evidence inventory

| Evidence | Static result | UI interpretation |
|---|---:|---|
| Production JS/JSX files | 408 | Large UI surface; local variation can easily outrun the design system |
| Production view files | 61 | Includes top-level views and nested dashboard/cockpit subviews |
| Views referencing `PageLayout` | 25 | Incomplete adoption; some non-users are legitimate nested views |
| Views referencing `AsyncBoundary` | 30 | Good foundation, but async state treatment is not universal |
| Views referencing `EmptyState` | 33 | Strong component availability and reasonable adoption |
| Views using canonical Tabs imports | 5 | Several views still hand-build tab bars |
| Production view use of canonical `DataTable` | 0 | Sorting, density, editing, column and virtualization behavior cannot converge |
| Raw `<Button>` component uses | 487 | Good component adoption |
| Raw `<button>` uses | 397 | Many justified bespoke controls, but large consistency/a11y review surface |
| Raw inputs/selects/textareas | 307 / 149 / 72 | Form primitives are not yet the default across the product |
| `focus-visible` occurrences | 1,331 | Strong focus-style intent |
| ARIA attribute occurrences | 1,667 | Strong semantic intent; runtime/manual validation still required |
| Production views with responsive tokens | 39 of 61 | 22 view files have no breakpoint utility; intrinsic responsiveness remains unverified |
| Raw palette view files | 4 | Concentrated drift, especially Messenger |
| Raw hex values in production JS/JSX | 25 | Mostly centralized token constants; verify remaining programmatic uses |
| `text-2xs`/`text-3xs` occurrences | 66 | 9–10 px labels are too small for many operational contexts |
| Horizontal overflow containers | 29 | Appropriate for some data surfaces; mobile task completion must be validated |

## 3. UI maturity scorecard

This rubric is broader than the pure “UI styling” column in the master audit because it includes state design, responsive composition and accessibility UI. Scores are static estimates, not rendered-screen certification.

| Dimension | Weight | Score | Main evidence |
|---|---:|---:|---|
| Visual foundations | 15% | **78** | Defined brand, neutral, semantic, typography, radius, elevation, motion, focus, density, dark/high-contrast tokens |
| Component consistency | 15% | **56** | Strong primitive library but incomplete adoption; no production-view DataTable use |
| Hierarchy and density | 15% | **62** | Clear page/card patterns coexist with dense tabs/cards, tiny metadata and local wrappers |
| Navigation and orientation | 15% | **60** | Strong mode/sub-rail/command concepts; too many overlapping destinations and topbar controls |
| Feedback and state design | 10% | **52** | AsyncBoundary/EmptyState/skeletons exist; silent errors and spinner/local-state variation remain |
| Responsive and reflow | 15% | **45** | Mobile drawer exists; complex workspaces lack proven mobile compositions |
| Accessibility UI | 10% | **55** | Strong focus/ARIA primitives; small targets/text, hover actions and manual validation gaps |
| Premium finish | 5% | **58** | Calm foundation; raw palette, inconsistent chrome and border/card density reduce cohesion |
| **Weighted total** | **100%** | **59** | Static review only |

## 4. Existing design system to preserve

### 4.1 Color

- Keep `brand-navy` as the structural/navigation color and `brand-orange` as the primary action/accent.
- Keep the custom neutral ramp; it is calmer and more product-specific than default Tailwind gray.
- Use `semantic-success`, `semantic-warning`, `semantic-danger` and `semantic-info` for meaning. Do not introduce local indigo/violet/red/amber families.
- Never use color alone for status: retain text, icon, shape or pattern.
- Correct the undefined `brand-green` classes in AI confidence UI; the configured equivalent is semantic success.

### 4.2 Typography

- Keep Inter for UI and JetBrains Mono for identifiers/BQL/code.
- Use the existing hierarchy: display/title/heading/subheading/body/body-sm/caption/overline.
- Operational body text should normally remain 13–14 px or above; reserve 10–12 px for non-critical metadata that is still contrast-safe.
- Avoid `text-3xs` (9 px) and most `text-2xs` (10 px) for actions, chart labels, form instructions, navigation or decision data.

### 4.3 Shape, spacing and elevation

- Keep 8 px controls/cards (`rounded-md`) and 12 px containers (`rounded-lg`); reserve the 22 px radius for rare branded/hero treatments.
- Use the existing page rhythm: 24 px base padding, 32 px from medium viewports; card padding 16 or 24 px.
- Prefer one border or one low elevation, not both repeatedly. Nested sections should normally use neutral background/spacing instead of another rounded bordered card.
- Reserve `shadow-lg/xl` for modal, drawer, palette and true overlays; application content cards should remain flat/outlined or `shadow-sm/md`.

### 4.4 Motion and density

- Keep 150/220/320 ms motion tokens and the global reduced-motion override.
- Use density modes consistently for rows/cards rather than local per-view padding decisions.
- Motion must explain a relationship: open/close, reorder, optimistic update or state transition. Avoid decorative animation in dense enterprise screens.

## 5. Screen and surface review

| Surface | Static health | What is working | Main UI improvement | Target pattern |
|---|---|---|---|---|
| Global shell/topbar | Needs improvement | Strong branded command bar, workspace switcher, global search, notifications, user controls | Too many simultaneous controls; center search can become cramped on small widths; role lens/More/BQL/AI compete | Desktop command bar; tablet compact actions; mobile search/action icons with progressive disclosure |
| Mode rail + sub-rail | Needs improvement | Clear active accents, role visibility, collapse, badges, keyboard focus | Six modes plus More/satellites/lenses create taxonomy overlap; 10 px mode labels | One canonical destination map; role shortcuts personalize order without duplicating objects |
| Today/dashboard | Good foundation | Strong skeleton, daily clarity, attention cards, responsive grids | Card and information density can compete; new/attention/status signals need one hierarchy | One primary focus block, 3–4 KPIs, then modular secondary widgets |
| My Works | Good foundation | Canonical PageLayout, clear tabs, sort, keyboard-capable rows | Hand-built tabs and repeated compact rows; assignee IDs are exposed instead of names | Canonical Tabs; unified work-row component; visible owner/project/status hierarchy |
| Board | Major improvement | Familiar columns, WIP signals, drag/drop and skeleton | Local page wrapper/header; horizontal desktop board is not a complete phone design; hover-only edit/delete | Desktop board + mobile list/column switcher; persistent More action; explicit loaded scope |
| Backlog/sprint | Needs improvement | Epic rail, sprint capacity, inline create and empty states | Dense headers, many small labels, hidden dates/goals, local headings despite PageLayout | Progressive sprint summary; filters in toolbar; details in expandable secondary row |
| Work-item detail | Good foundation | Dedicated detail organism and tabs | Large detail surface needs consistent sticky header, save/conflict status and responsive drawer/full-page modes | 360/720 px drawer on desktop; full-screen task editor on phone |
| Knowledge | Major improvement | Rich block editor, autosave status, tree, properties/comments/presence | Fixed multi-pane desktop shell, many 24–28 px controls, dense toolbars, partial mobile evidence | Responsive page tree → editor → properties; one pane on phone; contextual toolbar; 44 px touch hit areas |
| Unified search | Good UI, broken function | Canonical PageLayout, labeled searchbox, keyboard result model, tabs and saved refinements | Empty results will currently mask contract failure; result hierarchy needs query highlighting/facets when fixed | Spotlight search with type groups, snippets, facets, saved search and partial-error state |
| Messenger | Critical UI convergence | Clear list/thread/composer concept and useful empty states | Fixed 288 px rail + optional details, light-only surfaces, raw indigo/violet palette, tiny reactions/actions, no mobile master-detail | Tokenized Slack/Teams-style responsive list/thread/details with durable unread and dark mode |
| Service Desk | Major improvement | Customers/requests/CSAT surfaces exist | Hand-built page, dense tabs/cards, limited agent context and action hierarchy | Queue/list + request detail; primary SLA/action rail; filters/search in a standard toolbar |
| Support Inbox | Needs improvement | Canonical PageLayout, explicit AI draft approval, list/thread pattern and good error state | Mobile stacks list and thread rather than navigating between them; header actions can crowd | Responsive agent master-detail; back navigation on phone; sticky SLA/status/actions |
| Customer Portal | Needs improvement | Branded self-service shell and top navigation | Horizontal nav and content states need phone verification; errors can look empty; chat timing copy is misleading | Mobile bottom/compact nav, explicit request status timeline, honest offline/error states |
| Reports/dashboards | Needs improvement | Broad dashboard/report/chart components and role dashboards | Multiple local card/table/chart grammars, dense small chart labels, unclear metric freshness/definition | Canonical widget card, metric metadata, chart/table switch, drill path and responsive stacked cards |
| Report Builder | Good foundation | PageLayout, section composition, templates and schedules | Builder/settings/schedule hierarchy can become modal/card heavy; delivery terminology unclear | Canvas + property panel; sticky save/version state; explicit schedule mode and recipient summary |
| Admin/settings | Needs improvement | Tabs, PageLayout and governance breadth | Four settings subviews and many forms/tables use local layouts/controls; high information density | Left settings IA + consistent detail form; canonical field, table and save bar |
| Security/compliance | Needs improvement | Strong high-level dashboards, PageHeader, semantic statuses | Repeated bordered cards, local chart/table grammar and high assurance copy create visual overconfidence | Evidence-first control list with source/time/status; fewer cards; drillable exceptions |
| Auth/onboarding/account | Needs improvement | Branded forms, modal setup, security and appearance surfaces | Fixed widths, disabled SSO promotion, account page is a long stack of similar cards; small security instructions | Responsive auth card; stepper; account settings sub-nav; sessions/MFA lifecycle summary |
| AI/integrations/developer | Needs improvement | Consistent high-level primitives and explanatory states | Some capabilities are stubs; one undefined token; technical terminology overwhelms outcomes | Capability cards with availability, owner, data scope, last run, health and configuration CTA |
| Public reader/embed | Pending visual verification | Separate public surfaces exist | Cannot confirm branding, reading measure, consent/privacy metadata, print and small-screen rendering | Reading-width article, minimal chrome, publisher/time/share status and accessible print styles |

## 6. UI improvement register

Priority: **UI-P1** task completion, responsive or accessibility blocker; **UI-P2** major consistency/clarity issue; **UI-P3** polish/refinement.

| ID | Surface | Finding | Evidence | Priority | Recommended improvement | Acceptance criteria |
|---|---|---|---|---|---|---|
| UI-SYS-01 | Page structure | Top-level screens do not consistently use canonical page/header grammar | `ai-studio`, `board`, `knowledge`, `releases`, `service`, `sprint` lack PageLayout/PageHeader reference | UI-P2 | Migrate top-level routes to PageLayout; nested tabs stay layout-free | Every top-level route has one h1, one action zone, sanctioned width/padding and route breadcrumb |
| UI-SYS-02 | Data surfaces | Canonical DataTable exists but production views do not use it | No non-test view references `DataTable` | UI-P2 | Adopt for admin, reporting, settings, compliance and BQL tables | Sorting, density, columns, editing, empty/loading and virtualization share one behavior |
| UI-SYS-03 | Tabs | Multiple views hand-build tab bars | Hand-rolled tablists in AI Studio, Leadership, My Works and Scrum Cockpit | UI-P2 | Use Tabs/TabList/Tab/TabPanel or extend it once for scrollable/contained variants | Arrow/Home/End, focus, selected state and overflow are identical across views |
| UI-SYS-04 | Cards | Most views hand-build white/border/rounded card chrome | Only eight production view files reference Card | UI-P2 | Extend Card variants for KPI, section, interactive and flush content; migrate repeated chrome | Same card role has same radius, padding, border/elevation and heading hierarchy |
| UI-SYS-05 | Forms | Raw inputs/selects/textareas remain widespread | 307/149/72 raw controls in production code | UI-P2 | Consolidate Field/FormField/Input/Select/Textarea with labels, help, error, required and loading states | Form controls have consistent height, spacing, errors, focus, disabled and autocomplete behavior |
| UI-SYS-06 | Async states | AsyncBoundary adoption is incomplete; local spinners/skeletons remain | 30 view files use AsyncBoundary; 12 spinner occurrences and local skeletons exist | UI-P2 | Require route/section async-state matrix; use layout-matched skeletons and retry | Loading/empty/error/partial/permission/offline are visually distinct and never collapse to empty |
| UI-SYS-07 | Color tokens | Messenger and settings/knowledge contain raw palette classes | Raw indigo/violet/red/emerald/amber and `dark:text-blue-300` | UI-P2 | Map all to brand/semantic/neutral tokens; lint default palette in production views | Zero unauthorized default palette classes; themes retain semantic meaning |
| UI-SYS-08 | Undefined token | AI high-confidence badge uses `brand-green`, which is not configured | `ai-command-bar.jsx:212`; no brand-green in Tailwind config | UI-P1 | Replace with semantic success tokens and add token-class test/lint | High-confidence badge has intended background/text in production build and AA contrast |
| UI-SYS-09 | Small text | 9–10 px type is used across navigation, charts, editor and metadata | 66 `text-2xs/text-3xs` occurrences | UI-P2 | Raise operational labels to 12–14 px; reserve tiny text for non-essential bounded metadata | No action/form/nav/decision data below 12 px; zoom/reflow and contrast pass |
| UI-SYS-10 | Touch targets | Important icon controls are frequently 24–28 px | `w-6 h-6`, `w-7 h-7`, `p-0.5/p-1` controls in board, knowledge, block editor, releases | UI-P1 | Use 36 px desktop hit area and 44 px coarse-pointer/mobile target while icons remain 16–20 px | Pointer target audit passes; adjacent controls do not overlap at 200/400% zoom |
| UI-SYS-11 | Density | Spacing density tokens exist but local padding dominates views | Density variables/DataTable support vs many local `px/py/p` choices | UI-P2 | Route lists/tables/cards through density-aware primitives | Compact/comfortable/spacious changes are coherent and never hide information |
| UI-SYS-12 | Elevation | Some content surfaces combine border, shadow and nested cards | Card patterns and 25 `shadow-xl/2xl` occurrences | UI-P3 | Reserve high elevation for overlays; flatten nested content with spacing/neutral surfaces | Page has a clear 0–3 elevation hierarchy; content cards do not visually float unnecessarily |
| UI-SHELL-01 | Topbar | Global search, BQL, More, role lens, AI, Create, inbox and profile compete | `AppShell.jsx:1748-1926` | UI-P1 | Define priority by viewport: search + create + inbox + profile; move secondary actions into command/More | At 320/390/768/1440 px, topbar has no clipping and primary search/create remain understandable |
| UI-SHELL-02 | Navigation | Six modes plus sub-surfaces, More and satellites create overlapping wayfinding | `nav-model.js` MODES/SETUP/SATELLITES/LENSES | UI-P2 | Choose one canonical location per route; role lens changes order/emphasis, not taxonomy | Tree test for top tasks reaches ≥80% first-choice success; no duplicate canonical label/path |
| UI-SHELL-03 | Mode labels | Mode rail labels use 10 px text | `mode-rail.jsx` `text-2xs` | UI-P2 | Increase label size or use icon+tooltip with fewer, clearer mode names | Labels are readable at default and 200% zoom; rail remains stable in localization |
| UI-SHELL-04 | Orientation | Breadcrumb model exists but not all screens visibly use it | Breadcrumb trail code; uneven PageLayout adoption | UI-P2 | Show mode/surface breadcrumb on deep/admin/editor views; simplify on shallow pages | User can identify current area and parent from every non-home route |
| UI-SHELL-05 | Mobile navigation | Drawer exists, but complex mode/sub-rail interaction is unverified | AppShell off-canvas aside under `md` | UI-P1 | Mobile drawer opens to current mode, supports one-level drill, closes/restores focus predictably | Phone user reaches every permitted route without two horizontal rails or focus loss |
| UI-SHELL-06 | Global search affordance | Search pill competes with other topbar tools and duplicates command/AI concepts | Topbar search, command palette, AI command and BQL controls | UI-P2 | One unified command/search entry with typed modes/results and explicit AI switch | One shortcut/control handles navigate/search/create/ask without ambiguous duplicate buttons |
| UI-WORK-01 | Board | Board hand-builds page header and layout | `board-view.jsx:265+` | UI-P2 | Use PageLayout no-padding board variant with canonical header/toolbar | Board title, count, scope, group, filters and create align with other work views |
| UI-WORK-02 | Board mobile | Horizontal columns are a desktop pattern, not a phone task flow | `overflow-x-auto`, `min-w-56` columns | UI-P1 | On phone use column tabs/list; on tablet allow horizontal board with snap and count | User can view/move/create without precision horizontal scrolling; no hidden critical actions |
| UI-WORK-03 | Board actions | Edit/delete appear only on hover with very small padding | `board-view.jsx:491-501` | UI-P1 | Provide persistent More menu on card; hover can reveal shortcuts in addition | Keyboard/touch users can discover and activate every card action; target size passes |
| UI-WORK-04 | Backlog | Sprint headers combine status, goal, capacity, dates and actions in one dense row | `backlog-view.jsx:222-240` | UI-P2 | Establish primary summary line plus collapsible metadata/action row | At 320–768 px, status/name/capacity remain visible; secondary data reflows or expands |
| UI-WORK-05 | Detail panel | Detail needs consistent save/conflict/version visibility and responsive mode | work-item detail organism and shell selection | UI-P2 | Sticky header with ID/title/status/save state; desktop drawer, phone full-screen route | Save/conflict state stays visible; back/close restores context; no nested scroll traps |
| UI-KNOW-01 | Knowledge workspace | Fixed 256 px tree and multi-pane editor lack proven small-screen composition | `knowledge-view.jsx:477-480` and side panels | UI-P1 | Implement responsive tree/editor/properties master-detail; collapse panes by breakpoint | Phone shows one task pane; tablet supports two; desktop supports resizable three-pane layout |
| UI-KNOW-02 | Editor controls | Numerous 24–28 px buttons and tiny labels reduce touch/readability | BlockEditor and knowledge component scans | UI-P1 | Enlarge hit areas, group commands, move rare actions into overflow, add tooltips/shortcuts | All commands work by touch/keyboard; toolbar fits without clipping; important labels ≥12 px |
| UI-KNOW-03 | Editor hierarchy | Rich feature count creates competing toolbars/panels | BlockEditor 2,176 LOC; KnowledgeView 1,545 LOC | UI-P2 | Progressive disclosure: writing first, selection toolbar contextual, properties/comments on demand | Default authoring state focuses on content; secondary panels never reduce reading measure below usable width |
| UI-KNOW-04 | Save/publish state | Tiny “Saving/Saved” text can be missed | `knowledge-view.jsx:1129-1132` | UI-P2 | Persistent compact status in header with error/retry and last-saved time; announce changes | User can distinguish local editing, saving, saved, offline, conflict, review and published states |
| UI-MSG-01 | Messenger theme | Local indigo/violet/amber scheme breaks product identity | Messenger raw palette classes | UI-P2 | Use navy/orange only for structure/action; semantic colors for incident/status; neutral message surfaces | Messenger looks native to bSmart Works in light/dark themes; token lint passes |
| UI-MSG-02 | Messenger dark mode | Main conversation chrome contains many light-only backgrounds/texts | Messenger list/thread/composer classes lack dark counterparts | UI-P1 | Apply surface/text/border tokens through reusable chat primitives | Full list/thread/composer/details pass dark screenshot/contrast checks with no white islands |
| UI-MSG-03 | Messenger responsive | Fixed conversation rail and optional participant rail have no mobile state model | `w-72`, fixed-height container, optional `w-64` | UI-P1 | Desktop three-pane; tablet two-pane; phone list→thread→details with back navigation | 320–428 px has no horizontal task scroll; draft/scroll position survives navigation |
| UI-MSG-04 | Message actions | Reaction/action controls are tiny and hover-centric | Messenger reaction buttons/emoji picker | UI-P1 | 36/44 px hit areas, visible selected reaction state, contextual More menu | Touch, keyboard and screen-reader users can add/remove/open actions without hover |
| UI-MSG-05 | Chat container height | `calc(100vh - 160px)` is brittle with banners, browser UI and mobile keyboard | Messenger main container | UI-P2 | Use shell flex/min-height model and dynamic viewport units; sticky composer inside route | Composer stays visible with offline bar, zoom and software keyboard; no double vertical scroll |
| UI-SERV-01 | Service Desk | Top-level page uses local wrapper and mixed card grammar | `service-view.jsx` | UI-P2 | PageLayout + standard tabs/toolbar + queue/detail composition | Customers/requests/CSAT share one header, tabs, loading/error and action grammar |
| UI-SERV-02 | Agent context | Queue cards do not prioritize SLA/customer/action context | Service view vs available request fields | UI-P1 | List row: status/SLA/title/customer/assignee; detail: history, actions, linked work | Agent can identify next urgent action without opening multiple screens |
| UI-SUP-01 | Support Inbox mobile | One-column grid will stack list and active thread instead of behaving as navigation | `support-inbox-view.jsx` responsive grid | UI-P1 | Phone state shows either list or thread with back; desktop split view remains | Selecting a chat replaces list on phone; back returns to same scroll/filter; composer remains visible |
| UI-PORT-01 | Customer portal navigation | Horizontal nav and self-service states need dedicated phone treatment | `CustomerPortal.jsx` top nav | UI-P1 | Compact top/bottom navigation, request status timeline and clear support entry | All portal tasks complete at 320/390 px; no clipped tabs; active route announced |
| UI-REP-01 | Reports/charts | Multiple chart/card/table grammars reduce scan consistency | report/dashboard/shared view components | UI-P2 | Canonical widget card with title, definition, freshness, scope, chart/table toggle and drill | Every metric shows unit/time/scope; widgets align and stack consistently across roles |
| UI-REP-02 | Chart legibility | Many chart labels use 10 px text | chart molecule scans | UI-P2 | Minimum 12 px labels, direct labels where possible, accessible table summary | Labels are legible at 200% zoom; nonvisual alternative exposes same values/relationships |
| UI-ADMIN-01 | Settings | Configuration surfaces are dense and locally structured | settings3 subviews; raw forms/table primitives | UI-P2 | Stable settings sub-nav, section description, canonical fields/table and sticky save bar | Unsaved state/validation/permission are visible; long forms retain context |
| UI-SEC-01 | Compliance | Repeated bordered cards and large status numbers can imply certainty without evidence context | `compliance-view.jsx` card grids | UI-P2 | Reduce card chrome; pair status with source, time, scope, owner and evidence link | Every compliance status shows provenance and uncertainty; exception list drives next action |
| UI-AUTH-01 | Auth | Disabled SSO buttons advertise unavailable capability | `AuthScreens.jsx:337-347` | UI-P2 | Feature-gate unavailable providers; show only working login methods and admin help | No disabled “coming soon” primary auth option appears in production |
| UI-AUTH-02 | Auth/account responsive | Fixed-width cards/controls and long stacked account cards reduce mobile usability | AuthScreens fixed widths; account stacked cards | UI-P1 | `w-full max-w-sm`, safe gutters; account settings side/sub-nav and responsive sections | 320 px/400% zoom has no horizontal scroll; security task remains understandable |
| UI-A11Y-01 | Hover/focus/touch | Many actions are visually revealed on hover even where focus handling exists | Board and editor group-hover patterns | UI-P1 | Keep focus-within, add persistent mobile More menu and visible selected states | No action is available only on hover; coarse-pointer audit passes |
| UI-A11Y-02 | Contrast | Tiny muted text and translucent white/nav labels are high-risk | `text-2xs/3xs`, `text-white/40`, `text-neutral-400` | UI-P1 | Run token/state contrast matrix; strengthen operational labels; retain muted only for secondary metadata | All body/controls meet 4.5:1; large/icon/non-text meet applicable 3:1 |
| UI-A11Y-03 | Charts/status | Some charts/statuses rely strongly on color/bar height | compliance/dashboard chart patterns | UI-P2 | Add values, labels, patterns/icons and accessible data summaries | Meaning remains clear in grayscale, high contrast and screen reader output |
| UI-A11Y-04 | Focus management | Canonical Modal/Drawer are strong, but local dialog/overlay implementations remain | Modal/Drawer focus traps vs onboarding/local overlays | UI-P2 | Route all dialogs/drawers/popovers through tested primitives; add trigger relationship | Escape, trap, initial focus and restoration pass for every overlay |
| UI-CONT-01 | Vocabulary | “Projects” and “Teams” are used ambiguously | nav model projects surface labeled Teams | UI-P2 | Define object taxonomy and rename consistently across nav/header/filter/breadcrumb | Users correctly distinguish workspace, team and project in navigation tests |
| UI-CONT-02 | Technical language | BQL, control-plane and compliance terms are prominent without progressive explanation | Shell BQL chip and technical admin/AI surfaces | UI-P3 | Outcome-first labels with expert terminology secondary/help text | Non-expert persona can complete core task; expert shortcuts remain available |

## 7. Target UI specifications

These specifications build on the implemented tokens; they do not introduce a new visual brand.

### 7.1 Global shell

| Viewport | Recommended composition |
|---|---|
| Desktop ≥1280 px | 56 px topbar; 72 px mode rail; 208 px collapsible sub-rail; route content; contextual panel only when needed |
| Tablet 768–1279 px | 56 px topbar; mode/sub-rail collapsible; global search remains; secondary role/BQL/AI controls move to command/More |
| Phone <768 px | 56 px topbar; menu, compact logo/current-area label, search icon, inbox, profile; one off-canvas navigation level at a time |

- Topbar primary order: **current workspace/area → search/command → primary create → inbox → profile**.
- BQL, role preview, AI command and setup tools remain discoverable through search/command and contextual menus.
- Route header uses breadcrumb, one h1, short description only when useful, one primary action and at most two visible secondary actions.

### 7.2 Page and card grammar

| Element | Target |
|---|---|
| Workspace content | `max-w-workspace`, 24 px padding; 32 px from medium viewport |
| Reading/editor content | `max-w-reading`; preserve 60–80 character measure |
| Page heading | 24–32 px depending on surface; one h1 |
| Section heading | 18–20 px; card heading 16 px |
| Body/row text | 13–14 px minimum for enterprise density |
| Caption/metadata | 12 px minimum when operationally relevant |
| Card radius | 12 px; 8 px for controls and nested groups |
| Card padding | 16 px compact; 24 px standard |
| Section spacing | 24 px within group; 32–48 px between major page regions |
| Elevation | Flat/outlined content; small shadow for interactive/floating; large only for overlay |

### 7.3 Controls and feedback

- Buttons: 32 px compact desktop, 36 px standard desktop, 40–44 px prominent/mobile.
- Icon visual size: 16–20 px inside a 36/44 px hit area.
- One orange primary action per local decision area; danger remains semantic red.
- Every mutation exposes: ready → pending → success or error; optimistic changes remain visibly pending.
- Inline validation stays next to the field; page-level failure includes a correlation/support reference where available.
- Destructive action names the object and consequence; recoverable deletion offers undo or trash.

### 7.4 Responsive master-detail patterns

| Surface | Desktop | Tablet | Phone |
|---|---|---|---|
| Work item | Board/list + detail drawer | List/board + larger drawer | Full-screen detail route |
| Knowledge | Tree + editor + optional properties | Tree/editor or editor/properties | One pane with Back/Properties actions |
| Messenger | Conversations + thread + optional details | Conversations + thread | Conversations → thread → details |
| Service/support | Queue + request/conversation detail | Queue/detail | Queue → full-screen detail |
| Settings | Settings nav + detail | Collapsible nav + detail | Settings list → detail route |
| Report builder | Section canvas + properties | Canvas with drawer | Section list → section editor |

### 7.5 Data and dashboard grammar

- A metric card must show: label, value, unit, comparison/target where relevant, time range and click/drill affordance.
- A chart must show: title, metric definition/help, time/scope, values accessible as text/table, and empty/partial/error states.
- Tables use sticky headers only when scroll container is explicit; first column remains meaningful on mobile.
- On phone, replace wide tables with prioritized rows/cards or a controlled horizontal data view—never hide required columns without a disclosure path.
- Use density modes for row height and keep touch mode independent from compact desktop density.

## 8. Premium UI principles for bSmart Works

1. **Calm by default.** Neutral surfaces, navy orientation and one orange action; status colors appear only where meaning requires them.
2. **Content before chrome.** Typography and whitespace define sections before borders, shadows and nested cards.
3. **One obvious next action.** A page can have many capabilities but only one visually dominant CTA per decision area.
4. **Progressive complexity.** Basic work is visible immediately; BQL, AI, configuration and bulk tools appear through context or command search.
5. **Stable object identity.** Work-item ID, project, status and assignee appear consistently in rows, cards, drawers, search and notifications.
6. **Honest state.** Empty, failed, partial, offline, conflict and permission states never masquerade as each other.
7. **Responsive task design.** Mobile is a sequence of complete tasks, not the desktop canvas squeezed narrower.
8. **Accessible by construction.** Primitives carry keyboard, focus, labels, status announcements and target sizing; screen teams do not reimplement them.

## 9. Phased UI remediation

### UI Phase 0 — Stabilize the system

- Fix undefined token and default-palette drift.
- Define supported minimum font/target sizes and enforce lint where practical.
- Create an inventory mapping every top-level route to PageLayout, PageHeader, state boundary, responsive pattern and owning primitive.
- Add Storybook states for light/dark, loading, empty, error, long text and narrow viewport.

**Exit gate:** token lint passes; no undefined class; canonical primitive variants cover all common page/table/tab/card/form needs.

### UI Phase 1 — Converge shell and work management

- Simplify topbar/navigation and reconcile Projects vs Teams.
- Migrate Board, Sprint, Releases and My Works tabs/headers/toolbars.
- Adopt DataTable for suitable work/admin/report surfaces.
- Implement persistent/touch-safe work-card actions and mobile board/list mode.

**Exit gate:** core work journeys are visually consistent and complete at desktop/tablet/phone with keyboard and touch.

### UI Phase 2 — Rebuild complex master-detail experiences

- Tokenize and complete Messenger dark mode; implement responsive list/thread/details.
- Refactor Knowledge pane behavior, toolbar density, touch targets and save/publish state.
- Convert Service Desk and Support Inbox to the standard queue/detail pattern.
- Improve portal phone navigation and truthful status/error states.

**Exit gate:** messaging, knowledge and service journeys pass responsive, dark/light, long-content, keyboard and screen-reader verification.

### UI Phase 3 — Enterprise and analytics polish

- Standardize dashboard/report widget, chart, table, metric-definition and freshness patterns.
- Simplify admin/settings forms and compliance evidence hierarchy.
- Reorganize account security into clear subsections and responsive tasks.
- Add localization expansion, high-contrast, reduced-motion and print checks.

**Exit gate:** executive/admin/reporting surfaces use one visual grammar and expose metric/control provenance clearly.

### UI Phase 4 — Visual regression and release governance

- Capture approved baseline screenshots for every top-level route and primary state.
- Run cross-browser visual regression at supported viewports in light/dark themes.
- Add automated contrast/axe checks plus manual keyboard, zoom and screen-reader journeys.
- Require design-system and accessibility review for new primitives or exceptions.

**Exit gate:** signed visual baseline, zero critical/serious automated accessibility defects, and documented manual exceptions with owners.

## 10. Runtime visual-QA closure matrix

The following evidence is required before converting this review into a verified UI audit.

| Area | States to capture | Viewports/themes | Checks |
|---|---|---|---|
| Auth/onboarding | default, validation, loading, verify success/fail, MFA, SSO hidden/available | 320, 390, 768, 1440; light/dark | Reflow, labels, focus, keyboard, long error, password-manager/autocomplete |
| Shell/navigation | each role tier/lens, workspace menu, command, More, mobile drawer | 320, 390, 768, 1024, 1440 | No clipping, orientation, focus restoration, localization expansion |
| Work/board/backlog | empty, 1/50/500 items, filters, drag, WIP, conflict, offline | phone/tablet/desktop; light/dark | Complete data scope, touch drag alternative, hover independence, sticky behavior |
| Work detail | each tab, edit pending/success/error/conflict, long title/fields | phone/tablet/desktop | Drawer/full-page mode, scroll/focus, save state, target sizes |
| Knowledge | tree/editor/properties/comments, autosave, review/publish, public share | phone/tablet/desktop; light/dark | Pane behavior, reading width, toolbar wrap, long doc, keyboard block editing |
| Messenger | empty/list/thread/details, unread, reactions, errors, long message | phone/tablet/desktop; light/dark | Token fidelity, one-pane mobile, composer/keyboard, target size, reconnect state |
| Service/portal | queue/detail, SLA states, AI draft, request timeline, outage | customer phone; agent desktop/tablet | Priority hierarchy, honest states, back navigation, accessible status |
| Reports/dashboards | no/partial/full data, drill, builder, schedule, export | tablet/desktop/phone summary | Label legibility, metric provenance, table alternative, density, print/export parity |
| Settings/security | viewer/admin/owner, validation, unsaved, evidence gaps | tablet/desktop/phone | Form grouping, save bar, permission state, focus/error summary |
| Global | long localization, 200/400% zoom, high contrast, reduced motion | supported browsers/OS | Contrast, reflow, motion, focus order, touch targets, visual regression |

## 11. Completion criteria

The UI improvement programme is complete only when:

1. every top-level route has an approved responsive composition and canonical primitives;
2. token/default-palette/undefined-class checks pass;
3. no critical task depends on hover, tiny text or sub-minimum hit areas;
4. every async route distinguishes loading, empty, partial, error, offline, forbidden and conflict states;
5. light/dark/high-contrast/zoom/localization screenshots pass across the supported viewport matrix;
6. critical journeys pass keyboard and screen-reader validation; and
7. visual regression baselines are reviewed and protected in CI.

---

**Evidence limit:** without a running build, no claim is made about actual pixel rendering, font loading, measured contrast, clipping, scroll behavior, animation quality or device/browser correctness. The recommendations above are grounded in the implemented class/component structure and must be closed with current-run screenshots and interaction evidence.
