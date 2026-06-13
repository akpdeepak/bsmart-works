---
applyTo: "**"
---

<!-- GENERATED FROM ai-rules/ — do not edit by hand.
     Edit the source in ai-rules/ and run: node scripts/generate-ai-rules.mjs
     This file is the GitHub Copilot (governance/security) view of the same rules. -->

# Rule Book 40 — Governance, Security & Compliance

> Owns the cross-cutting commitments that protect tenants, data, and trust. Most of this book is
> **spec-authoritative** (`05 §1`, `06 §5`, `07 §4`) and describes what must be true as these
> iterations land — it is the content that was missing from every other layer. Read after the
> [Orchestrator](../00-ORCHESTRATOR.md). Precedence: [`SOURCE-OF-TRUTH.md`](../SOURCE-OF-TRUTH.md).

---

## 1. Multi-tenancy — hard workspace isolation *(spec `06 §5.2`, `07 §4.5`)*

**The single catastrophic risk for a product sold to multiple DISCOMs is cross-tenant leakage.**
Tenant isolation is **not** RBAC — RBAC decides what a user may do *within* their tenant; isolation
guarantees they can never see *another* tenant's data.

- **Every row is owned by a workspace.** `workspace_id` is present on tenant-scoped tables and on
  every event in `events`.
- **Every query is workspace-scoped — no exceptions.** No repository method returns rows across
  workspaces. Scoping is applied centrally (e.g. a Hibernate filter / mandatory predicate), not
  re-typed per query, so it cannot be forgotten.
- **BQL is scoped at compilation** (RB-10 §6) — a user-authored query cannot escape its tenant.
- **Field-level security** *(spec `06 §5.5`)*: sensitive fields are visible per-field, per-role,
  **enforced server-side** — not hidden in the UI. Manager drill-down into individuals is blocked
  at the API.
- **Enforcement (partial):** `guardrails.sh` blocks any repository `@Query` SELECT lacking a
  workspace token, and **warns** on raw-`JdbcTemplate` `work_items` SQL in a Controller/Service that
  carries no tenant-scope signal anywhere in the file (workspace token, id-scope key, or `RbacService`
  call) — a coarse tripwire for new unscoped raw-SQL surfaces, not the guarantee. The leak-proof
  guarantee remains a **central Hibernate tenant filter / mandatory predicate applied once** (this §1:
  "scoping applied centrally, not re-typed per query"), tracked as **#243** (needs sign-off). A
  per-statement grep was deliberately rejected as too false-positive-prone (see
  `docs/INSIGHTS-AI-ALIGNMENT-REVIEW.md` §1.2). Every feature ships an **unauthorized** and a
  **cross-tenant** test.

## 2. AI Control Plane *(spec `05 §1.2–1.6`)*

AI is one orchestration layer with **one budget, one audit trail, one fallback contract** — no
capability calls a model on its own terms.

- **Scope hierarchy (most-restrictive-wins):** AI can be toggled at **workspace → capability →
  user → in-context**. The most restrictive enabled scope governs. Off at workspace = off
  everywhere downstream.
- **Fallback contract — mandatory per capability.** Every AI feature answers *"what happens when
  AI is off, over budget, or unavailable?"* The deterministic fallback (e.g. manual BQL/visual
  builder, rules engine) is part of the feature, not an afterthought. **No fallback documented = it
  does not ship.**
- **Cost discipline (per workspace):** a monthly budget cap; at **80%** spend, degrade to the
  cheaper model tier (Haiku); at **100%**, auto-disable AI for the workspace and serve fallbacks.
  Per-user rate limits. **Response caching** for repeated prompts (meaningful spend reduction).
- **Model tiering:** cheap/fast tier (Haiku) for classification and intent; capable tier (Sonnet)
  for generation. Never default everything to the expensive tier.
- **Audit — every invocation logged:** timestamp, user, workspace, capability, prompt size, model
  tier, tokens in/out, cost, and the AI-policy state at call time. This is core data (RB-20 §5).
- **Data boundary:** redact PII before it leaves the server to a model; respect data residency
  (§4); AI calls originate **server-side only** (RB-10 §8).

## 3. Data governance & the audit/erasure reconciliation *(spec `06 §5.5` ⟷ `06 §5.1`)*

Required: data export, **right-to-be-forgotten**, access audit, data residency (GDPR / India DPDP).

**The conflict:** the architecture commits to an **append-only event log that is never deleted**
(RB-10 §3, ENGINEERING-PRINCIPLES §1.6 & §3.2), yet DPDP/GDPR require **erasure** of personal data.
Both cannot be literally true if personal data lives inside the immutable log.

> **DECISION (2026-06-04 — Deepak): crypto-shredding + PII-vault tokenization.** The event log stays
> append-only and immutable; **raw personal data is never stored inside an event** (or projection,
> index, or log line). Instead:
>
> - **PII lives in a separate, mutable PII vault**, keyed by an opaque per-subject token. Events and
>   read-models reference the **token**, never the raw personal field.
> - Each subject's vault record is encrypted under a **per-subject data key**, envelope-encrypted via
>   the KMS in §4 (BYOK where a tenant requires it).
> - **"Forget" = destroy the per-subject key and purge the vault record.** The event history and its
>   causal structure stay intact and auditable; the personal data becomes cryptographically
>   unrecoverable. This satisfies erasure **and** preserves the immutable audit trail.
>
> **Binding rules (detailed design lands with the compliance iterations, 7–9):**
> 1. **No raw PII outside the vault** — not in event payloads, projections, search indexes, logs, or
>    metrics; only tokens/ciphertext. (A `guardrails.sh` "no-PII-in-events" check is added once the
>    PII field inventory exists.)
> 2. **Backups must honour erasure** — a backup that can resurrect a destroyed key or pre-shred PII
>    defeats the right. Key retention ≤ backup retention, and key destruction propagates to
>    replicas/caches.
> 3. **Projections re-derivable from tokenized events alone** — a read-model rebuild after erasure
>    must never need the purged PII.
> 4. **Maintain a PII field inventory + data-residency map** (which vault, which region) — the single
>    artifact the access-audit and residency requirements both read from.
>
> *Scope:* this fixes the **architecture**. The PII field inventory, key-management/rotation design,
> retention windows, and backup-expiry mechanics are detailed designs to produce — and validate with
> legal/DPO — at the **start of iterations 7–9**, before any of this is built.

## 4. Security depth *(spec `06 §5.4`, `07 §4.6`)*

Engineering-surface hardening is in RB-10 §8. The platform commitments:

- **In transit:** TLS 1.3 minimum. **At rest:** AES-256. **BYOK** via KMS for tenants that require it.
- **Identity:** MFA for admins; **WebAuthn / passkeys**; **conditional access** (IP allow-list,
  device, geo, time-of-day).
- **Assurance:** annual penetration test + bug bounty; dependency/security scanning in CI (RB-10 §9).
- **Certification roadmap:** SOC 2 Type 2 + ISO 27001 targeted at **iteration 19**.

## 5. Non-functional budgets *(spec `06 §5.3`)*

Performance is a contract, not a vibe. Test against these (ms):

| Operation | P50 | P95 | P99 |
|-----------|----:|----:|----:|
| Page load | 300 | 800 | 2000 |
| Work-item create | 100 | 300 | 1000 |
| Search / query | 150 | 500 | 1500 |
| Board drag-drop | 50 | 150 | 500 |
| Dashboard render | 500 | 1500 | 3000 |
| AI (cached) | 100 | 300 | 1000 |
| AI (uncached) | 2000 | 5000 | 10000 |
| File upload | 1500 | 3000 | 8000 |

**Target infrastructure** *(spec `07 §2.4, §4.7`)*: AWS — ECS/EKS, RDS (Multi-AZ), ElastiCache
(Redis) for cache + AI response cache, S3 + CloudFront, Secrets Manager, ECR; **Terraform** IaC;
**OpenTelemetry → CloudWatch / Grafana / Prometheus**. Current local stack is Docker Compose
(RB-10 §9); the gap to AWS is a deliberate, planned step, not an assumption.

---

### What's enforced here
Today: server-side AI, security headers, CORS, rate limiting, dependency scanning → `guardrails.sh`
+ ESLint + CI. **To be added:** the workspace-scope query check (§1) and, as features land, NFR
checks against §5 and AI-budget/audit instrumentation (§2). Until a check exists, these are review
gates — flag them in the PR.
