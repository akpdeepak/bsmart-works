# Claude Code — install prompt

> **Status: already applied.** This prompt was used to bootstrap the `ai-rules/` system into this repo.
> The generator is live, per-tool files are generated, and CI enforces sync via `--check`.
> This file is kept as a historical record — do not re-run it.

Prerequisite: the `ai-rules/` folder (including `generate-ai-rules.mjs`) is committed to the repo.
Then paste the prompt below into Claude Code, run from the repo root.

---

You are installing the bSmart Works AI-rules system into this repository. Follow the
task-execution discipline in `ai-rules/rulebooks/05-TASK-EXECUTION.md` while you do it.

Context: `ai-rules/` is the new **canonical source** for all AI-tool instruction files. The
per-tool files (`CLAUDE.md`, `AGENTS.md`, `.github/copilot-instructions.md`, `.cursor/rules/*`,
`.windsurfrules`) must be **generated** from it, never hand-written.

Do this, on a branch — do not commit to `main` directly:

1. **Orient.** Confirm you are at the repo root. Verify `ai-rules/` exists with
   `00-ORCHESTRATOR.md`, `SOURCE-OF-TRUTH.md`, and `rulebooks/05,10,20,30,40`. Note the real
   project layout: confirm the frontend directory name (expected `works-frontend/`), the Flyway
   migration path (expected `works-backend/src/main/resources/db/migration/`), and whether
   `scripts/`, `.github/workflows/ci.yml`, and a husky pre-commit hook already exist.

2. **Add the generator.** Move `generate-ai-rules.mjs` (in the `ai-rules/` package) to
   `scripts/generate-ai-rules.mjs`. Open it and adjust the two constants at the top
   (`BACKEND_GLOB`, `FRONTEND_GLOB`) to match the actual layout you confirmed in step 1.

3. **Generate.** Run `node scripts/generate-ai-rules.mjs` from the repo root. It will (re)write
   the per-tool files at their standard paths: `CLAUDE.md`, `AGENTS.md`, `.windsurfrules`,
   `.cursor/rules/bsmart.mdc`, `.github/copilot-instructions.md`, and
   `.github/instructions/{delivery-process,backend,frontend,product,governance}.instructions.md`.

4. **Verify.** Confirm every file above exists at the right path. Run
   `node scripts/generate-ai-rules.mjs --check` and confirm it exits 0. Spot-check that
   `.github/copilot-instructions.md` is the short core (not a 2000-line monolith) and that each
   `*.instructions.md` has the correct `applyTo` frontmatter.

5. **Wire enforcement.** Add `node scripts/generate-ai-rules.mjs --check` as a step in
   `.github/workflows/ci.yml` so a stale generated file fails CI, and to the husky pre-commit hook
   if one exists. Do not remove or weaken existing checks.

6. **Delete nothing.** The old hand-written `CLAUDE.md` / `AGENTS.md` / `copilot-instructions.md`
   are **replaced in place** by the generated versions — git showing them as modified is expected
   and correct. Leave `ENGINEERING-PRINCIPLES.md` untouched. Optionally move the `.docx` spec files
   into `specs/`. Do **not** touch database schema, security, or RBAC code — nothing in this task
   requires it.

7. **Close out.** Use a branch named `chore/ai-rules-generator`. Open a PR whose description states
   what changed, that the per-tool files were generated from `ai-rules/`, and how you verified it.
   In the PR description, flag these open items for Deepak — **do not resolve them yourself**:
   (a) the append-only-vs-right-to-be-forgotten decision in
   `ai-rules/rulebooks/40-GOVERNANCE.md` §3; (b) the two RB-05 judgment calls (right-sizing lanes,
   self-identified-work guardrail); (c) the version/date stamps in the `00-ORCHESTRATOR.md` and
   `SOURCE-OF-TRUTH.md` headers. **Stop and ask me before merging.**
