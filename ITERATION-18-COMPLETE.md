# Iteration 18 — Mobile + Real-time + Performance (Cap S) (completion)

Iteration 18 makes bSmart Works feel like a 2026 product on every device: a mobile-optimized PWA,
real-time collaboration, offline-tolerant editing, and built-in performance + observability. It is
layered cleanly on the existing data model, the event store, and the AI Control Plane — no new
visual language, no disturbance to the iterations beneath it (RB-30, Orchestrator §6).

> **Scope note — native apps.** The spec lists native iOS (Swift) and Android (Kotlin) apps
> alongside the PWA. In this React + Spring **monorepo** the mobile experience is delivered as the
> **mobile-optimized PWA** the spec offers ("works without app install") — installable, offline,
> push-capable. Native app shells are separate platform repos and are out of scope for this
> codebase; the PWA gives feature parity for common workflows on the phone today.

> **No live model in this build.** AI on mobile follows the same rule as every prior iteration —
> capabilities route through the AI Control Plane with deterministic fallbacks; this iteration adds
> no new model dependency.

## 1. What shipped

| Sub-feature | What shipped | Key surface |
|---|---|---|
| Mobile-optimized PWA | Service worker (`public/sw.js`): precached app-shell, network-first navigations with an offline fallback, stale-while-revalidate static assets, web-push + notification-click handlers; registered from `main.jsx`; manifest already present | `public/sw.js`, `src/lib/sw-register.js` |
| Offline mode | On-device draft queue (`lib/offline`), connectivity tracking, auto-sync on reconnect; server reconciles each draft with optimistic concurrency on `work_items.version` → APPLIED / CONFLICT / MISSING | `POST /api/v1/sync/work-item-drafts`, `DraftSyncService` |
| Conflict resolution UI | Side-by-side "your edit vs server" with keep-mine (re-queue against the new version, re-sync) or keep-theirs (discard) | `ConflictResolver`, `OfflineBanner` |
| Real-time updates | SSE stream per workspace; every workspace-scoped event broadcasts via `EventService` → clients invalidate their queries within a second | `GET /api/v1/realtime/stream`, `RealtimeService` |
| Real-time co-presence | Heartbeat-driven roster with cursor coords; live "who's here" avatars; stale entries pruned | `/api/v1/realtime/presence`, `PresenceService`, `PresenceBar` |
| Push notifications | Per-event-type toggles, quiet-hours window (wrap-around aware), snooze, and **P0 overrides quiet hours**; web-push subscription registry | `/api/v1/push/preferences`, `/api/v1/push/subscriptions` (V51), `PushPreferenceService`, `PushSettingsPanel` |
| Command palette | Cmd-K palette now runs **server-side fuzzy search across items + people** (workspace-scoped), merged with static actions | `GET /api/v1/command-palette/search`, `CommandSearchService` |
| Keyboard shortcuts | Catalogue + **per-user customizable** bindings; "?" opens a grouped help overlay marking customized keys | `/api/v1/shortcuts`, `lib/shortcuts`, `ShortcutsHelp` |
| Performance SLAs | Per-operation P50/P95/P99 monitor (bounded ring buffer) compared to the RB-40 §5 budgets; over-budget flag | `GET /api/v1/observability/performance`, `PerformanceMonitor(+Filter)` |
| Observability | In-product status page (component health: API, DB, real-time) | `GET /api/v1/status`, `StatusPage` |
| Biometric app-unlock | Local WebAuthn platform-authenticator unlock helpers (feature-detected; degrade gracefully) | `lib/biometric` |

## 2. Governance & quality

- **Tenant isolation (RB-40 §1):** SSE fan-out, presence, and command search are bucketed by
  `workspaceId`; no path returns or broadcasts across tenants. The SSE endpoint authorises
  `view_items` before an emitter is registered.
- **RBAC in the service layer (RB-10 §2):** every workspace-scoped endpoint checks `RbacService`;
  offline-draft sync re-checks edit permission per draft.
- **Auth for SSE:** the browser `EventSource` API can't set headers, so the JWT rides as an
  `access_token` query param that the existing JWT filter validates identically.
- **Migration:** `V51__iteration18_mobile_realtime_perf.sql` — extends `notification_preferences`,
  adds push_subscriptions and user_shortcuts. Forward-only; Flyway high-water mark now **V51**
  (Orchestrator §6).
- **Tests:** 28 new backend unit tests (push-preference delivery logic incl. quiet-hours/snooze/P0,
  presence roster + pruning, percentile/over-budget maths, draft-sync conflict detection); 40+ new
  frontend tests across the libs and organisms. Lint, build, guardrails, and the full suites are
  green.

## 3. Walking skeleton

After iteration 18, a user can: install Works to their phone home screen; keep working on a flaky
connection (drafts save locally and sync later, with a clear conflict prompt if the item changed);
see teammates' presence and get others' changes live; tune push delivery with quiet hours, snooze,
and a P0 override; jump anywhere with Cmd-K (now finding items and people, not just pages); learn and
customize keyboard shortcuts; and check system health from an in-product status page — with
per-operation latency measured against the published budgets.
