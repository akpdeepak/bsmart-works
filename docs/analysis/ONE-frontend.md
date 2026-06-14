# ONE Philosophy — Frontend Audit (bSmart Works)

> Auditor: Principal Software Architect + UX. Scope: `works-frontend/src`.
> Dimensions: **ONE Function & Feature** (single responsibility) and **ONE Design** (UI/UX
> minimalism within the single design system, RB-30). Date: 2026-06-13.
> Token-violation claims verified against `tailwind.config.js` — `z-modal/z-dropdown/z-panel/z-sticky`
> are **defined named tokens** (config 100–109, RB-30 §9) and are **not** violations.

## Executive ranking (highest impact first)

| # | Violation | File | Severity | Best standalone PR? |
|---|-----------|------|----------|---------------------|
| 1 | God-component: ~150 `useState`, 79 `fetch*`, 44 `handle*` in one render | `App.jsx` | Critical | Decompose in ordered slices |
| 2 | 5 role dashboards + 5 widget registries in one file | `dashboard-view.jsx` | High | **Yes — clean, low-risk (PR F2)** |
| 3 | 9-feature config kitchen-sink, 52 props | `settings3-view.jsx` | High | Yes (per-domain split) |
| 4 | 11 cockpit tabs inline, 44 props | `scrum-master-cockpit-view.jsx` | High | Yes (tab extraction) |
| 5 | 61-prop detail panel, 6+ responsibilities | `work-item-detail-panel.jsx` | High | Yes (per-tab extraction) |
| 6 | Auth flows (5 full-screen states) inline in `App()` | `App.jsx:2580–2810` | Medium | Yes |
| 7 | Inline knowledge/create modals in shell render | `App.jsx:4059–4290` | Medium | Yes |
| 8 | Raw hex `#94A3B8` token violation | `work-item-detail-panel.jsx:263` | Low | **Yes (PR F4)** |
| 9 | `bg-neutral-400` meaning / `text-neutral-400` readable text | `dashboard-view.jsx:629,714,786`; `scrum-master-cockpit-view.jsx:258,490` | Low | **Yes (PR F4)** |

---

## ONE Function & Feature

### App.jsx — the prime God-component, 4385 lines (`App.jsx:144`)
- **The Problem:** A single `App()` (line 144) holds ~150 `useState` (145–512), 79 `fetch*`, 44
  `handle*`, 13 `useEffect`s, the keyboard/shortcut engine (581–609), realtime/presence (615–634), URL
  routing (639–655), the auth state machine (148–169, 855–968), and the shell render (2939–4057) that
  prop-drills into **~40 view conditionals** (3170–3986). State for 18 iterations lives in one closure.
  Views are extracted but their state/fetches are not. File-level `eslint-disable` (line 1) because it
  can no longer be reasoned about.
- **The ONE Solution:** Shrink `App.jsx` to a routing shell + providers (~150 lines). Decomposition map:

  | Unit | What moves in | Source lines |
  |------|---------------|--------------|
  | `screens/auth/*` | login/signup/verify/MFA/forgot/reset + state | 148–169, 855–968, 2580–2810 |
  | `providers/SessionProvider` | `currentUser`, `token`, `userRole`, `can`, logout | 146–147, 254–258, 724–734 |
  | `providers/WorkspaceProvider` | `activeWorkspaceId`, `workspaces`, presence, realtime | 287–294, 615–634, 697–722 |
  | `providers/WorkItemsProvider` | `workItems`/`projects`/`users` + CRUD handlers | 174–199, 757–794 |
  | `providers/ToastProvider` | `toast`, `showToast`, `reportError` wiring | 173, 118–122 |
  | `hooks/useGlobalShortcuts` | keydown engine + `goToRef` | 581–609 |
  | `hooks/useRouterSync` | pushState/popstate ↔ `view` | 537–543, 639–655 |
  | `router/AppRoutes` | the 40 `view === …` conditionals → a route table | 3170–3986 |

- **Extraction ORDER (safest first):** 1) auth screens, 2) inline modals, 3) ToastProvider, 4)
  shortcut/router hooks, 5) Session→Workspace providers, 6) WorkItemsProvider, 7) per-cockpit state,
  8) AppRoutes last.
- **Refactored Code (goal):**
  ```jsx
  export default function App() {
    const { user } = useSession();
    if (!user) return <AuthScreens onAuthenticated={signIn} />;
    return (<ToastProvider><WorkspaceProvider><WorkItemsProvider>
      <AppShell><AppRoutes /></AppShell>
    </WorkItemsProvider></WorkspaceProvider></ToastProvider>);
  }
  ```
- **Risk/effort:** **L overall**, each step S–M. **PR F1** lands the lowest-risk slice now: the three
  module-scope units (`getTimeOfDay`, `AiComplianceSuggestion`, `SprintItemList`) that already live
  outside `App()` and are passed in as props → their own files. Steps 2–8 are staged for a checkpoint.

### dashboard-view.jsx — 5 role dashboards + 5 widget registries in one file (`dashboard-view.jsx:1188`)
- **The Problem:** Five complete dashboards + bespoke registries (`DEVELOPER_REGISTRY` 370–505,
  `SCRUM_MASTER` 550–671, `PRODUCT_OWNER` 716–850, `EXECUTIVE` 896–1017, `ADMIN` 1056–1150), each with a
  `*Today` renderer; the export is just a role switch (1290–1296). ~7 screens in one module.
- **The ONE Solution:** One file per role dashboard; shared atoms (`TodayCard`, `HealthRing`, `MiniBar`,
  `Empty`, `TodaySurface`) into a shared module; `DashboardView` becomes a ~40-line role router.
- **Refactored Code:**
  ```jsx
  const ROLE_VIEW = { 'developer': DeveloperDashboard, 'scrum-master': ScrumMasterDashboard,
    'product-owner': ProductOwnerDashboard, 'executive': ExecutiveDashboard, 'admin': AdminDashboard };
  export function DashboardView({ dashboardRole, ...shared }) {
    const Surface = ROLE_VIEW[dashboardRole] ?? ROLE_VIEW.developer;
    return <Surface {...shared} />;
  }
  ```
- **Risk/effort:** **M.** Pure structural move; strong test coverage. This is **PR F2** — safe, high-impact.

### settings3-view.jsx — 9 unrelated config features, 52 props (`settings3-view.jsx:305`)
- **The Problem:** Destructures 52 props and renders 9 tabs (workflows, custom fields, field layout,
  field visibility, permissions matrix, item types + delegated Status/Detail-Fields), with **three
  separate drag-and-drop implementations**. Four unrelated mental models in one surface.
- **The ONE Solution:** Split by domain into `WorkflowSettingsView`, `FieldSettingsView`,
  `PermissionsView`, `ItemTypeView`, each owning its own state + fetches; the 52 props collapse.
- **Risk/effort:** **M.** Pair with App.jsx provider step 7. Staged (Lane C).

### scrum-master-cockpit-view.jsx — 11 tabs inline, 44 props (`scrum-master-cockpit-view.jsx:118`)
- **The Problem:** 44 props; 11 tabs rendered inline; the project-selector `onChange` fires 9 fetch
  handlers at once (line 209). Distinct intents (my-day, ceremony CRUD, impediment tracking, four AI
  analyses) in one 937-line render.
- **The ONE Solution:** Extract each tab to its own component; cockpit becomes a role-aware tab router;
  co-locate each tab's data/fetch. Staged (Lane C).

### work-item-detail-panel.jsx — 61 props, 6+ responsibilities (`work-item-detail-panel.jsx:127`)
- **The Problem:** 61 props; mixes details, comments + @mentions + AI summary, typed links & hierarchy,
  attachment upload, activity log, plus an inline `RichTextEditor`. A 1007-line panel is itself an app.
- **The ONE Solution:** Per-tab components fed by a `DetailItemProvider` so the panel passes
  `selectedItem` + context, not 61 props. Staged (Lane C).

### customization-view.jsx — 7 config surfaces, one state bag (`customization-view.jsx:39`)
- **The Problem:** Best of the six (tabs already delegated), but one state bag + one `load` dispatcher
  fans to 18 endpoints; any state change re-renders all seven tabs.
- **The ONE Solution:** Give each tab its own data hook; parent becomes a pure tab router + permission
  guard; `ImpactDialog`/`withImpact` stays a small shared util. Staged (Lane C).

---

## ONE Design

### A surface should drive ONE primary intent — tabbed "hubs" dilute it
- **The Problem:** `settings3` (9 tabs), `scrum-master-cockpit` (11), `customization` (7) each present a
  wall of unrelated tabs. RB-20 §4 permits density, but density must serve *one* intent per screen.
- **The ONE Solution:** Regroup tab clusters by intent into distinct nav destinations (RB-30 §7). The
  design fix and the single-responsibility fix are the same extraction.

### Raw hex literal in the status dot (`work-item-detail-panel.jsx:263`)
- **The Problem:** `style={{ backgroundColor: statusMeta?.color || '#94A3B8' }}` — raw hex fallback
  violates RB-30 §1.
- **The ONE Solution:** Token fallback (`bg-neutral-300`); apply the inline `backgroundColor` only when
  data-driven `statusMeta.color` exists. **PR F4.**

### `neutral-400` for readable text / `bg-neutral-400` for meaning (`dashboard-view.jsx:629,714,786`; `scrum-master-cockpit-view.jsx:258,490`)
- **The Problem:** RB-30 §2 forbids `neutral-400` for readable text (disabled/placeholder, fails AA).
  Used to encode progress/LOW priority and to render an "AI" label + attendance icon.
- **The ONE Solution:** `neutral-600` for muted-but-readable text; semantic tokens where colour carries
  meaning. **PR F4.**

---

## Summary of safest, highest-impact standalone PRs
1. **PR F1** — module-scope leaf components out of `App.jsx` (S).
2. **PR F2** — `dashboard-view` → per-role files + shared atoms (M, well-tested).
3. **PR F4** — token fixes (S).
4. **(Lane C)** settings3 / cockpit / detail-panel / customization splits + the App.jsx provider steps.
