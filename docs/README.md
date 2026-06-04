# bSmart Works — Documentation

The canonical source of truth for product, brand, and architecture decisions.

## Engineering
- [Engineering Principles](ENGINEERING-PRINCIPLES.md) — product, developer, and architecture practices + how they're enforced
- [CLAUDE.md](../CLAUDE.md) — machine-readable rules (every AI tool reads this)
- [CONTRIBUTING.md](../CONTRIBUTING.md) — setup and daily workflow

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
