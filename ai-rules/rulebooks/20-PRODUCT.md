# Rule Book 20 — Product & Delivery

> Owns *what we build and whether it earns its place*. Read after the
> [Orchestrator](../00-ORCHESTRATOR.md). The live iteration number is in Orchestrator §6.
> **Enforced by:** the PR template (scope + iteration check) and human product review; the
> discipline here is mostly judgment, backed by `check-dod-sync`.

---

## 1. Every feature earns its place
The v3.5 capability map added exactly three things and said no to the rest — copy that discipline.
A feature ships only if it closes a specific product or architectural gap, not because it's
interesting. **When in doubt, cut it.**

## 2. Build to the active iteration, not the roadmap
There are 20 iterations (Orchestrator §6). Working ahead is the most expensive mistake on this
project — it creates half-built surfaces that block the iterations beneath them. **Confirm the
active iteration before starting. Never build iteration N+1 while N is in scope.**

## 3. Defaults for the 80%, customization for the 20%
Ship opinionated defaults that work for most teams out of the box. Customization is a deliberate,
separate layer — **never the price of entry**. If a new user must configure something to get value,
the default is wrong. (One customization framework — RB-40 / unification layers — never per-feature
settings silos.)

## 4. Honest software
Information density is a feature, not a flaw — don't hide complexity behind oversimplified UI.
Empty states explain *why* they're empty and *what to do next*; errors say *what went wrong* and
*what to do about it*; privacy is enforced at the API, not hidden in the UI (RB-40 §1, RB-30 states).

## 5. Compliance and audit are first-class
Compliance rules, SLA violations, and the audit trail are **core data, not bolt-ons** — this is why
we event-source from day one (RB-10 §3). If a change can't be reconstructed and audited, it isn't
done. SLA is **one engine in two contexts** (internal delivery + customer commitments) — not two
implementations.

## 6. PM traceability (non-negotiable process)
Every unit of work traces to its capability and iteration: **capability → iteration → issue → PR →
verification.** A PR states which capability/iteration it serves. Work with no traceable product
reason doesn't get merged. Keep the iteration's current-status accurate (Orchestrator §6, §2 step 6).

---

### How this connects
- *Is the work justified and in-scope?* → here (RB-20).
- *Is it tenant-safe, auditable, within budget/NFR?* → RB-40.
- *How is it built?* → RB-10. *How does it look and read?* → RB-30.
