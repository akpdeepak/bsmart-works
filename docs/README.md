# bSmart Works — Documentation

The canonical source of truth for product, brand, and architecture decisions.

## Engineering
- [Engineering Principles](ENGINEERING-PRINCIPLES.md) — product, developer, and architecture practices + how they're enforced
- [CLAUDE.md](../CLAUDE.md) — machine-readable rules (every AI tool reads this)
- [CONTRIBUTING.md](../CONTRIBUTING.md) — setup and daily workflow

## Design & UI/UX
The **unified UI/UX program** lives in two synchronized docs (governed by RB-30, the canonical design
law in `ai-rules/rulebooks/30-DESIGN.md`). Everything else below is reference, log, or pointer.
- [UIUX-BENCHMARK-ROADMAP.md](UIUX-BENCHMARK-ROADMAP.md) — **the reference roadmap** (Parts A–I:
  current-state scorecard, benchmark study, engagement/measurement, feature roadmap, and the premium
  "Converge & Lock → Elevate" program incl. the Premium Bar §H.2.1). Its §2 holds the full **document map**.
- [UIUX-EXECUTION-PLAN.md](UIUX-EXECUTION-PLAN.md) — **the live execution ledger + session triggers**
  (start/resume the program from here).
- [UX-PROGRESS.md](UX-PROGRESS.md) — append-only progress log · [UX-CODEBASE-ANALYSIS.md](UX-CODEBASE-ANALYSIS.md) — historical baseline (2026-06-05)
- [A11Y.md](A11Y.md) — accessibility audit and WCAG 2.2 strategy · [I18N.md](I18N.md) — i18n runtime & pattern
- Surface specs: [KNOW-STUDIO.md](KNOW-STUDIO.md) / [plans/KNOW-STUDIO-PLAN.md](plans/KNOW-STUDIO-PLAN.md) · [plans/sprint-cockpit-ux-plan.md](plans/sprint-cockpit-ux-plan.md)
- Superseded (pointers): [PREMIUM-UX-ROADMAP.md](PREMIUM-UX-ROADMAP.md) · [DESIGN-CONSISTENCY-PROGRAM.md](DESIGN-CONSISTENCY-PROGRAM.md) → both now Part H of the roadmap

## Product specifications
Each spec has a **readable Markdown mirror** (machine-extracted, so AI tools and PRs can read/diff
it) next to the canonical `.docx`. Regenerate the mirrors with `python3 scripts/extract-specs.py`.

| Readable mirror | Canonical source |
|-----------------|------------------|
| [05-capability-map-v3.5.md](specifications/05-capability-map-v3.5.md) | `specifications/05-Capability-Map-Expansion-v3_5.docx` |
| [06-iteration-guide.md](specifications/06-iteration-guide.md) | `specifications/06-Complete-Iteration-Guide.docx` |
| [07-tech-stack-architecture.md](specifications/07-tech-stack-architecture.md) | `specifications/07-Tech-Stack-and-Architecture.docx` |
| — | `specifications/00-Expert-Product-Review.docx` |

## Spec-refactor pipeline
A reusable, self-iterating workflow that walks every capability-tagged feature spec across all 20
iterations, one spec per run, refactoring/building each to the guide.
- [REFACTOR_MASTER_PROMPT.md](REFACTOR_MASTER_PROMPT.md) — the master prompt; parameters set once,
  then pasted **verbatim** every run. `GUIDE_PATH` → the guide below; `AI_RULES_PATH` → `CLAUDE.md`;
  `DEPLOY_TARGET` → local production build.
- [bsmart-works-iteration-guide.md](bsmart-works-iteration-guide.md) — `GUIDE_PATH`: the
  markdown-formatted export of `06-Complete-Iteration-Guide` the pipeline parses (Part 7). Same
  source as the machine-extracted [06-iteration-guide.md](specifications/06-iteration-guide.md);
  this copy preserves the heading/bold structure spec-selection relies on.
- `REFACTOR_TRACKER.md` — the living spec ledger; **generated on the pipeline's first run**, not committed here.

## Brand
- [brand/README.md](brand/README.md) — logo variants, construction, exact colours, usage rules
- [brand/brand-and-identity.md](brand/brand-and-identity.md) — full brand spec (Markdown mirror)
- `brand/Works-Brand-and-Identity.docx` — canonical source
- [brand/source-logos/](brand/source-logos/) — the four source SVGs (primary, reverse, mono, icon)
- Canonical design tokens & reference components also live in the design bundle
  (`works-master-package/03-design-and-mockups/works-bundle/` — `tokens/`, `tailwind.config.ts`).
  The frontend `tailwind.config.js` is the implemented subset; reconcile new tokens against the bundle.

> When a spec and the code disagree, **the code is canonical** and the gap is flagged with ⚠️
> in CLAUDE.md. Specs describe the target; close gaps via deliberate, separate migrations.
