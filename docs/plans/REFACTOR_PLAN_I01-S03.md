# Refactor Plan — I01-S03 · Cap A · App shell (topbar, sidenav, workspace switcher)

**Iteration:** 1 (Foundation) · **Mode:** AUTO (autonomous run authorized by Deepak for all of Iteration 1).
**Spec:** guide Part 7, Iteration 1 — *"App shell — consistent navigation chrome. Topbar holds workspace switcher, global search, notifications, user menu."*
**Classification:** **Partial** — three-zone shell + sidenav + global search + (S02) real workspace switcher exist; the topbar was missing **notifications** and a **user menu**.

## Phase 1 — analysis
- Three-zone shell (sidebar · topbar · scrollable content) is present (RB-30 §4 mandatory) ✓.
- Topbar had global search + a dark-mode glyph + Create; **no notifications affordance, no user menu**. Sign-out was a bare `↩` glyph in the sidebar footer (no accessible name, not in the topbar as the spec dictates).
- A polished `SidebarNav` organism (brand-navy, lucide, full a11y) **exists but is unused** — App.jsx renders a legacy inline white sidebar. That is a second parallel shell implementation (RB-30 / unification-layer concern). Converging them is a large monolith decomposition → **parked** (don't risk regressing S02's switcher, don't build ahead).

## Phase 2 — scope (in)
1. **`UserMenu` organism** (`components/works/organisms/user-menu.jsx`) — pure/presentational avatar→dropdown: identity (name/email/role), Settings, theme toggle, Sign out. Five states, keyboard + Escape, `role="menu"`/`menuitem`, accessible trigger. Tested (Vitest/RTL). Wired into the topbar.
2. **Notifications bell in the topbar** — icon button + unread-count badge (brand-orange), accessible label reflecting unread count, navigates to the notifications view.
3. **Topbar cleanup** — fold theme toggle into the user menu (removed the standalone glyph); `aria-label` on the global-search input; sidebar footer is now identity-only (sign-out lives in the topbar user menu, per spec).

## Out of scope (parked → PARKED.md)
- Converge App.jsx's inline legacy sidebar onto the `SidebarNav` organism (eliminate the parallel shell) → tech-debt / monolith decomposition.
- Cmd-K command palette + keyboard shortcuts → **Iteration 18** (I18-S09/S10) — not built ahead.
- Breadcrumbs on detail pages → revisit when views become routed pages (detail is a side panel today).

## Tests / validation
- New `UserMenu` Vitest suite (renders trigger, opens menu, identity shown, Settings/Sign-out/theme callbacks, Escape closes, a11y names). Full frontend suite green; lint clean; production build OK. Backend untouched.

## Risk
- Low: additive topbar change + one new pure component. No backend, no schema, no API change. Sign-out path preserved (relocated to the menu). Revert = revert the branch.
