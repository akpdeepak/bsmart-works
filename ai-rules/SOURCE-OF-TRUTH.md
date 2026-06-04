# bSmart Works — Source of Truth & Precedence Policy

> **Read this before resolving any contradiction between documents.** It decides which
> source wins, for every kind of content. It exists so that Claude Code, Codex, Copilot,
> Cursor, and Windsurf all resolve conflicts the *same* way, every time.
>
> Version 1.0 · last verified 2026-06-01 · owner: Deepak Pandey

---

## 1. The three content domains and their authority

Authority is assigned by **content domain**, not by filename. Decide which domain a fact
belongs to, then apply that domain's source of truth.

| Domain | Source of truth | What it covers |
|--------|-----------------|----------------|
| **Tech Stack** (implementation reality) | `CLAUDE.md` + `AGENTS.md` | The stack as actually built: language, framework, build tool, frontend framework + language, auth mechanism, ORM/query approach, package naming, table naming, API versioning/path style, event-store table, dependency choices, "how it is built today". |
| **Software Specs** (product + architecture requirements) | `05-Capability-Map-Expansion-v3.5` + `06-Complete-Iteration-Guide` + `07-Tech-Stack-and-Architecture` (architectural-attributes content only) | Capabilities, the 20 iterations, the 5 architectural commitments, the 7 unification layers, the AI Control Plane, multi-tenancy, NFR/performance targets, security/privacy/data-governance requirements, WIQL, field-level security — "what must be true / what we are building toward". |
| **Runbook / Playbook** (how to build, run, deploy, operate) | **All five documents combined** | Branching, environments/secrets, release, testing, PR flow, dependencies, CD, observability, tech-debt, the execution protocol, plus the specs' operational intent (AWS topology, Terraform, OpenTelemetry, performance budgets to test against, AI cost-ops thresholds, security/compliance ops). |

---

## 2. The rule that resolves the `07` overlap

`07-Tech-Stack-and-Architecture` is a **mixed document**. Split its content:

- **Its stack choices are Tech Stack** → `CLAUDE.md`/`AGENTS.md` **win and override them**.
  (Angular, Gradle, Spring Boot 3.x, OAuth2/SAML, jOOQ, singular tables, `com.bcits.works.*`,
  unversioned `/api/...`, `event_log`, RabbitMQ/SQS — all superseded; see the ledger in §4.)
- **Its architectural attributes & requirements are Software Spec** → **authoritative**.
  (Multi-tenant hard isolation, reliability, scalability, security depth, observability target,
  performance intent, AWS/Terraform/OTel target infrastructure.)

> **Test:** *"What is built and how it's built today"* → CLAUDE/AGENTS.
> *"What must be true and what we're building toward"* → specs.

---

## 3. Conflict-resolution order (apply top-down)

1. **Is it a tech-stack implementation fact?** → `CLAUDE.md`/`AGENTS.md` win. Full stop.
   Ignore any spec text that disagrees (it is recorded as superseded in §4).
2. **Is it a product or architecture requirement?** → the three specs win.
   (`07` counts only for architectural attributes, not for stack choices.)
3. **Is it operational** (build / run / deploy / test / release / incident)? → combine all
   sources: **CLAUDE/AGENTS govern current mechanics; specs govern target-state and thresholds.**
4. **Still ambiguous, or two specs disagree?** → **escalate to Deepak.** Never guess on data
   model, security, tenant isolation, or RBAC.

---

## 4. Tech-Stack Reconciliation Ledger — CLAUDE/AGENTS override the specs

Wherever this table applies, **ignore the spec and follow the canonical column.** If any of
these is ever intentionally reverted (e.g. the package rename), **update this ledger first.**

| Dimension | Spec said (`05`/`06`/`07`) | Canonical — CLAUDE/AGENTS | Note |
|-----------|---------------------------|---------------------------|------|
| Backend framework | Spring Boot 3.2+ | **Spring Boot 4.0.x** | per `pom.xml` |
| Frontend framework | Angular 18+ (default) or React | **React 19.2 + Vite 8** | per `package.json` |
| Frontend language | TypeScript (both paths) | **JavaScript / JSX** | stray `@types/react` unused |
| Build tool | Gradle (Kotlin DSL) preferred, or Maven | **Maven** (`pom.xml`, `mvnw`) | |
| Persistence / query | JPA + Hibernate + **jOOQ** | **JPA + Hibernate** (no jOOQ) | |
| Auth | Spring Security 6 + **OAuth2 + SAML** | **Spring Security + JWT (stateless)**, MFA TOTP | SSO not yet built |
| Backend package | `com.bcits.works.<domain>` | **`com.example.demo`** (flat) | rename is its own task; do not fragment |
| DB table naming | singular (`work_item`, `project`) | **plural** (`work_items`, `projects`) | |
| Entity / mapping | `<Domain>Entity` + MapStruct mapper + `<Domain>EventPublisher` | **`<Entity>` + `EventService` / `AppEvent`** | |
| API path | `/api/work-items` (unversioned) | **`/api/v1/work-items`** (versioned, kebab) | |
| Event store table | `event_log` | **`events`** | `event_log` dropped in V20 |
| Message broker | RabbitMQ / SQS early, Kafka at scale | **none yet** — no Kafka/bus until scale | per CLAUDE §21.1 |

---

## 5. Software-Spec authority map — specs win; honor when building forward

These requirements are **spec-authoritative**. CLAUDE/AGENTS are currently silent or thinner on
them; that is a documentation gap to close, not a reason to skip them.

| Requirement | Source | Status in CLAUDE/AGENTS |
|-------------|--------|-------------------------|
| Multi-tenant **hard workspace isolation** (every query workspace-scoped; `workspace_id` on events) | `06 §5.2`, `07 §4.5`, event schema | Absent — add |
| **AI Control Plane**: 4-level scope (most-restrictive-wins), per-workspace budget caps (80%→Haiku, 100%→auto-disable), response caching, model tiering, per-call audit schema | `05 §1.2–1.6` | Principle only; detail missing |
| **WIQL** — the one query language across filters, automations, compliance, KPIs, dashboards | `06 §3 Layer 3` | Absent — add |
| **Field-level security** (per-field, per-role, server-enforced) | `06 §5.5`, `06 §3 Layer 2` | Absent (RBAC ≠ field-level) |
| **NFR / performance budgets** (P50/P95/P99 table) | `06 §5.3` | Absent — add |
| **Data governance**: GDPR/DPDP, right-to-be-forgotten, data residency, AI data-boundary; reconcile vs append-only audit | `06 §5.5` + `06 §5.1` | Tension **resolved** in RB-40 §3 (crypto-shredding / PII-vault); detailed design at iter 7–9 |
| **Security depth**: TLS 1.3 min, AES-256 at rest, BYOK/KMS, WebAuthn/passkeys, conditional access, SOC 2 Type 2 + ISO 27001 (iteration 19) | `06 §5.4`, `07 §4.6` | Absent — add |
| **Target infra**: AWS (ECS/EKS, RDS Multi-AZ, ElastiCache/Redis, S3, CloudFront, Secrets Manager, ECR), Terraform IaC, OpenTelemetry → CloudWatch/Grafana/Prometheus | `07 §2.4`, `07 §4.7` | Roadmap-only mention |
| **Five architectural commitments** (compliance-first, SLA one-engine/two-contexts, config-without-code, privacy-by-design, event-sourced) | `06 §2` | Partial / implicit |
| **Seven unification layers** (one event store, one identity, one query language, one AI orchestration, one customization, one knowledge, one design system) | `06 §3`, `05 §3` | Partial |

---

## 6. Runbook / Playbook inputs — take all

The operational layer draws from **every** source. Operating rule: **current mechanics from
CLAUDE/AGENTS; target-state and thresholds from the specs.**

- **From CLAUDE/AGENTS:** branching (§7), environments & secrets (§8), release management (§9),
  testing strategy (§10), PR flow & size (§11), dependencies (§12), CD/deploy (§13),
  logging & observability (§14), technical-debt process (§20), the execution protocol (§21/§24).
- **From the specs:** target AWS deploy topology + Terraform (`07 §2.4`); OpenTelemetry →
  CloudWatch/Grafana/Prometheus (`07 §4.7`, `06 §5.6`); performance budgets to test against
  (`06 §5.3`); AI cost-ops thresholds and degrade/disable behavior (`05 §1.5`); security &
  compliance operations and the cert calendar — SOC 2 / ISO 27001 in iteration 19 (`06 §5.4`).

---

## 7. Maintenance

- This file is consulted **before** resolving any cross-document contradiction.
- Update the **ledger (§4)** before any intentional stack change — never after.
- Re-verify the ledger and the spec authority map **after each iteration**; bump the version
  and date in the header.
- This precedence policy itself is not overridden by any other document.
