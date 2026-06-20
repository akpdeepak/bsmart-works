# EPIC 06 - Simplified Information Architecture and Navigation

## Blueprint references

- Implementation blueprint: EPIC 6 - Simplified Information Architecture and Navigation
- UI/UX expanded blueprint: simplified product experience architecture and navigation
- User correction: preserve the rail modes as Home, Deliver, Insight, Service, Know, Extend

## Objective

Keep the primary navigation calm and predictable by enforcing the six-mode rail while keeping every
existing destination reachable through More, command palette, role lenses, or contextual entrypoints.

## Scope in this EPIC slice

- Keep `MODES` limited to Home, Deliver, Insight, Service, Know, Extend.
- Move setup/admin destinations out of the primary rail into `SETUP_DESTINATIONS`.
- Preserve command-palette reachability for setup/admin destinations under More.
- Map setup/admin active views to the Extend rail orientation row.
- Add navigation model tests so the six-mode contract cannot drift.

## Acceptance criteria checklist

- [x] Rail has exactly the six approved modes.
- [x] Setup is not a top-level rail mode.
- [x] Setup/admin destinations remain reachable through command palette under More.
- [x] Active setup/admin views still orient the user in the rail/sub-rail shell.
- [x] Existing destination visibility continues to use server-authoritative surface lists or tier fallback.

## Validation planned

- `cd works-frontend && npm test -- nav-model`
- `cd works-frontend && npm run build`
- `npm run verify`

## Follow-on notes

- Later EPIC 6 slices can simplify sub-rail ordering and role-aware defaults without expanding the
  primary rail beyond the six-mode contract.
