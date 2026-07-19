# Rule Book 20 — Product & Delivery

> Owns *what we build and whether it earns its place*. Read after the
> [Orchestrator](../00-ORCHESTRATOR.md). Live work status is the GitHub task/program state.
> Scope and product judgment are required-review controls; automation validates traceability fields,
> not whether a feature deserves to exist.

---

## 1. Every feature earns its place
The v3.5 capability map added exactly three things and said no to the rest — copy that discipline.
A feature ships only if it closes a specific product or architectural gap, not because it's
interesting. **When in doubt, cut it.**

## 2. Build to the active task and program
Build only the approved GitHub task in the active program/milestone. Historical iteration numbers are
requirement metadata, not a universal scheduler. Work outside the task is captured separately rather
than smuggled into the current PR.

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
Feature work traces **requirement/capability → program/milestone → issue → PR → verification**. Bugs,
chores, and policy work trace to their issue and owning area without inventing a capability/iteration.
Live status is generated from GitHub events rather than copied into a prose ledger.

---

### How this connects
- *Is the work justified and in-scope?* → here (RB-20).
- *Is it tenant-safe, auditable, within budget/NFR?* → RB-40.
- *How is it built?* → RB-10. *How does it look and read?* → RB-30.
