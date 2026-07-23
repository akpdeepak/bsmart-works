---
status: current-execution-plan
live_status: github
authority: requirements-sequencing
created: 2026-07-22
supersedes_progress_for: MASTER-COMPLETION-ROADMAP.md §9 (phase plan) — this is the actionable, sliced version
---

# bSmart Works — Forward Execution Plan (Phases 2–8)

> **Purpose.** The ordered, PR-sized backlog to finish the transformation from today's state. Phases 0
> and 1 are complete. This plan is the resumption anchor for the next working session: start at the top
> of the lowest incomplete phase, take one slice, follow RED → GREEN → REFACTOR, and merge through
> protected `main` before starting the next. **One scope at a time.**
>
> Status of each EPIC is in `MASTER-COMPLETION-ROADMAP.md` (reconciled to code 2026-07-21, post-#525).
> Ground truth is executable code + GitHub checks, never a prose ledger.

## How to resume (next session)

1. `git fetch origin main && git checkout -B <branch> origin/main`.
2. Pick the **next unchecked slice** in the lowest incomplete phase below (default: **4.1**).
3. Open a draft PR early; write the smallest failing test first; implement; run the changed profile
   (`node scripts/verify.mjs --profile changed`); merge only when required checks are green.
4. **Stop for a human checkpoint** on any slice tagged **[DECISION]** — data-model, RBAC,
   tenant-isolation, irreversible-migration, cost, or identity/security decisions require Deepak's
   sign-off before code (AGENTS.md hard-stop).
5. Update the checkbox here and the EPIC row in `MASTER-COMPLETION-ROADMAP.md` on merge.

## Guardrails that stay in force (do not regress)

- All four "Do not do now" guardrails remain RESPECTED (AI approval gate, no autonomous mutating
  agents, only the 3 low-code builders, work-aware messaging).
- Every slice touching auth/tenant data ships an **unauthorized** and a **cross-tenant** test.
- New AI surfaces route through the AI Control Plane with a deterministic fallback.
- Schema changes are forward-only Flyway migrations; compute the next number from migration files.

---

## Phase 2 — Finish structural refactors (unblocks clean feature work)

- [ ] **2.1 EPIC-4 AppShell decomposition** — extract feature-state, routing, and overlays out of the
  ~2,937-line `AppShell.jsx` into modules; lower the size ratchet in steps until it reflects a real
  ceiling, not a pin.
- [ ] **2.2 EPIC-3 root carve** — move the ~71 flat-root `com.bcits.works` files into domain modules;
  tighten the ArchUnit root-package budget as they move.
- [ ] **2.3 Custom work-type hierarchy validation** — `WorkItemCommandService.validateParentType` must
  also consult `WorkItemTypeConfig.validParentTypes`, so custom types are hierarchy-enforced.

**Exit:** AppShell under a real ceiling; flat root materially reduced; custom-type parent rules enforced.

## Phase 3 — Close EPICs 7–12 to full scope

- [ ] **3.1 EPIC-9 messaging consolidation** **[DECISION]** — resolve the orphan phase4 `/messenger`
  backend (#522): consolidate onto `internal-messaging` or drop it + its tables via a forward
  migration; add threads and read/unread state.
- [ ] **3.2 EPIC-7 Today brief + attention UI** — route the AI daily brief through the control plane
  (deterministic fallback exists); surface the max-5 `attention` list (already built server-side) in
  the Today UI.
- [ ] **3.3 EPIC-12 deployment intelligence** — real deploy/DORA signals (today it is a Flyway
  `installed_rank` read).

**Exit:** EPICs 7–12 each meet their full plan + DoD.

## Phase 4 — Complete the V1.6 overlay (mostly the missing frontend) — **START HERE**

- [ ] **4.1 Skills / People-Graph frontend** — UI over the merged `SkillService` API: skill catalogue,
  per-person skills, and the "who holds skill X" graph query. *(Non-decision; highest immediate value.)*
- [ ] **4.2 Framework-aware UI** — consume `GET /projects/{id}/capabilities` to hide sprint surfaces on
  Kanban/Waterfall/Lean; add the framework picker on project create/edit.
- [ ] **4.3 Inline BQL filters** — an inline BQL filter drawer on Work/Reports list surfaces (today
  they use a faceted chip bar; BQL is confined to the Lab and widgets).
- [ ] **4.4 Dynamic BQL query boards** — a board whose columns/contents are driven by a BQL query.
- [ ] **4.5 Brand-placement system** — extend the existing shell+portal branding to the remaining
  surfaces (onboarding, reports, exports, email, PWA); fix `logo.jsx` to read tenant `branding.logoUrl`.
- [ ] **4.6 EPIC-23 onboarding content** — seed a starter template/playbook library (engine exists;
  content is bring-your-own today).

**Exit:** V1.6 overlay is functional end-to-end, not backend-only.

## Phase 5 — AI-native elevation + superseded-scope decisions

- [ ] **5.1 Live-AI provider wiring** **[DECISION]** — configure a model provider/key so EPIC-13/14/15
  produce real output (control plane, budget, audit, fallback already built). Cost/provider is a
  Deepak decision.
- [ ] **5.2 EPIC-14 semantic retrieval** — layer embeddings/semantic ranking over the deterministic
  `RetrievalScorer`.
- [ ] **5.3 EPIC-15 canvas depth** — richer block types and AI artifact templates.
- [ ] **5.4 SAML / OAuth2 SSO** **[DECISION]** — identity EPIC; design record first.
- [ ] **5.5 jOOQ typed-query layer** **[DECISION]** — persistence EPIC; reverses JPA-only.
- [ ] **5.6 Native iOS (Swift) + Android (Kotlin)** **[DECISION]** — separate platform repos; large.

**Exit:** each a full gated EPIC; every [DECISION] item has an accepted design record before code.

## Phase 6 — Quality / NFR / E2E / a11y / i18n (run continuously, then a closure sweep)

- [ ] **6.1 E2E** — grow Playwright from 3 specs to real journeys across all six modes.
- [ ] **6.2 i18n** — externalize the ~80% remaining strings (catalogue is 100%, ~8% wired); native
  review.
- [ ] **6.3 Accessibility** — axe across all surfaces + manual SR / keyboard / RTL passes.
- [ ] **6.4 Load testing** — k6/Gatling on hot paths against the P50/P95/P99 budgets (RB-40 §5).
- [ ] **6.5 Coverage** — include controllers/services/repos in the JaCoCo scope and raise the floor;
  add a frontend coverage threshold.

**Exit:** gates are meaningful; NFR budgets proven with a versioned benchmark profile.

## Phase 7 — Infra target-state (all [DECISION]; each needs a checkpoint)

- [ ] **7.1 Terraform IaC + AWS topology** **[DECISION]** — ECS/EKS, RDS Multi-AZ, ElastiCache, S3,
  CloudFront, Secrets Manager, ECR.
- [ ] **7.2 OpenTelemetry** — → CloudWatch / Grafana / Prometheus.
- [ ] **7.3 Message broker** **[DECISION]** — Kafka/RabbitMQ/SQS event backbone (reverses ADR-0001).
- [ ] **7.4 Canary-enable the default-off flags** **[DECISION]** — move `tenant.filter.binding.enabled`
  and the distributed rate-limit to a Redis/ElastiCache-backed store and flip on, canary-first.

**Exit:** AWS deploy verified from an immutable release tag.

## Phase 8 — Certification & release

- [ ] **8.1 SOC 2 / ISO 27001** external evidence program (the control matrix already maps
  code → control).
- [ ] **8.2 Full-system verification** — penetration test, end-to-end verify, tagged release.

---

## Recommended sequencing / critical path

1. **Phase 2 first** — the refactors unblock clean feature work.
2. **Phase 4 next** — highest user-visible value (the V1.6 UIs the product is missing); **4.1** and
   **4.2** are the fastest wins and are not decision-class.
3. **Phase 6 runs continuously** alongside 2–5, not deferred to the end.
4. **Phase 5 [DECISION] items and all of Phase 7** wait for an explicit checkpoint before code — they
   are large, irreversible, or cost-bearing.

## Open tech-debt (tracked)

- **#522** — orphan phase4 `/messenger` backend duplicates EPIC-9 internal-messaging (owned by 3.1).
- **#523**, **#524** — closed by #525.
- Custom work-type parent-validation gap (owned by 2.3).
