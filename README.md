# bSmart Works — AI Rules (canonical source)

This folder is the **single canonical source** for every AI-tool instruction file in the repo.
Humans read it directly; the per-tool files (`CLAUDE.md`, `AGENTS.md`,
`.github/copilot-instructions.md`, `.cursor/rules/*`, `.windsurfrules`) are **generated** from it.
Edit the rules **here**, regenerate, commit. Never hand-edit a generated file.

## What's in here
| File | Role |
|------|------|
| `00-ORCHESTRATOR.md` | **Read first.** Control plane: what / why / when / how, enforcement binding, routing to the rule books, and the single home for volatile facts (iteration, migration number). |
| `SOURCE-OF-TRUTH.md` | Precedence policy + stack reconciliation ledger (code-vs-spec). |
| `rulebooks/05-TASK-EXECUTION.md` | How any task — user-raised or self-identified — goes from idea to merged-on-remote, gated end to end. |
| `rulebooks/10-ENGINEERING.md` | Stack, architecture, data/Flyway, API, BQL, testing, security surface, ops. |
| `rulebooks/20-PRODUCT.md` | Earns-its-place, iteration discipline, defaults-vs-customization, compliance-as-data, traceability. |
| `rulebooks/30-DESIGN.md` | The single design system (tokens, layout, interaction, states, a11y, content). |
| `rulebooks/40-GOVERNANCE.md` | Multi-tenant isolation, AI Control Plane, security depth, data governance/DPDP, NFR budgets. |

## ⚠️ Do NOT delete your existing files
- **Per-tool files** (`CLAUDE.md`, `AGENTS.md`, `.github/copilot-instructions.md`,
  `.cursor/rules/bsmart.mdc`, `.windsurfrules`) are what the tools actually read. They are
  **regenerated** from this folder by the generator — **replaced in place, never hand-deleted.**
  Delete them before the generator is wired and the tools have nothing to read.
- **The `.docx` specs** are the product/architecture source of truth — keep them (move to `specs/`).
- **`ENGINEERING-PRINCIPLES.md`** — keep it as the human intro (or later fold it into these books).

## Will dropping this folder in "just work"? Not on its own
AI tools read **specific filenames at specific paths**, not folders. This folder is the *source*.
It goes live only when the generator emits the per-tool files from it and writes them to:

```
repo-root/
├─ CLAUDE.md                          # generated — Claude Code (root + nested/@import)
├─ AGENTS.md                          # generated — cross-tool (Codex, etc.)
├─ .windsurfrules                     # generated — Windsurf
├─ .cursor/rules/bsmart.mdc           # generated — Cursor (alwaysApply core)
├─ .github/
│  ├─ copilot-instructions.md         # generated — short repo-wide core
│  └─ instructions/
│     ├─ backend.instructions.md      # generated — applyTo: **/*.java, db/migration/**
│     ├─ frontend.instructions.md     # generated — applyTo: works-frontend/**
│     └─ governance.instructions.md   # generated — applyTo: **  (tenant/AI/compliance)
├─ ai-rules/                          # THIS folder — canonical source (hand-edited)
│  ├─ 00-ORCHESTRATOR.md
│  ├─ SOURCE-OF-TRUTH.md
│  └─ rulebooks/*.md
├─ specs/                             # the .docx specs (reference)
├─ ENGINEERING-PRINCIPLES.md          # human intro
└─ scripts/generate-ai-rules.mjs      # the generator (transform, not copy)
```

## Activation — 3 steps
1. **Add this `ai-rules/` folder** to the repo root. (Rename it if you prefer — just keep it
   consistent in the generator.)
2. **Update & run the generator** so it assembles the per-tool files from `ai-rules/` (short
   always-on core + path-scoped slices) and writes them to the paths above; commit them.
   ```bash
   node scripts/generate-ai-rules.mjs          # regenerate from ai-rules/
   node scripts/generate-ai-rules.mjs --check   # CI fails if any generated file is stale
   ```
3. **Done** — the tools pick up the generated files automatically at their standard locations.
   The `--check` step in CI keeps every file in sync with this folder forever.

> The generator update is the **one remaining build**. Ask Claude to produce it and the regenerated
> per-tool files, and this becomes genuinely drop-in.

## Before go-live — 3 decisions
1. **Append-only vs right-to-be-forgotten** (RB-40 §3) — confirm the crypto-shredding / PII-vault
   approach before the compliance iterations.
2. **RB-05 right-sizing lanes + self-identified-work guardrail** — confirm or adjust.
3. **Stamp the version + date** in the headers of `00-ORCHESTRATOR.md` and `SOURCE-OF-TRUTH.md`.
