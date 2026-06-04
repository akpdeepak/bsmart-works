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
- **Enforcement to add:** a `guardrails.sh` check that fails any repository query lacking workspace
  scoping (the natural neighbour of the existing RBAC-in-controller check). Every feature ships an
  **unauthorized** and a **cross-tenant** test.

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

> **[DECISION REQUIRED — Deepak]** There is a head-on conflict no document has resolved: the
> architecture commits to an **append-only event log that is never deleted** (RB-10 §3,
> ENGINEERING-PRINCIPLES §1.6 & §3.2), yet DPDP/GDPR require **erasure** of personal data. These
> cannot both be literally true.
>
> **Recommended resolution: crypto-shredding / PII-vault tokenization.** Keep the event log
> append-only and immutable, but store personal fields indirected through a per-subject key (or a
> separate PII vault keyed by token). "Forget" then means destroying the key / vault record: the
> event history stays intact and auditable, while the personal data becomes unrecoverable. This
> preserves both invariants. Confirm this approach before the compliance iterations (7–9) begin.

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
