---
name: Feature spec
about: "Ready check before any feature enters the active sprint. A work item without this is not ready."
title: "[feat] "
labels: feature
---

<!-- Definition of Ready — complete all sections before moving to In Progress.
     Incomplete items block the sprint commitment (CLAUDE.md §5, ENGINEERING-PRINCIPLES.md §1.2). -->

## What (one sentence)
<!-- The single job this feature does. Becomes the PR title. -->

## Why (user / business value)
<!-- Which persona benefits and how. Link to the capability map / iteration goal. -->

## Iteration
<!-- Which of the 20 iterations does this belong to? Confirm with the product owner. -->
- Iteration:
- Capability map reference:

## Acceptance criteria
<!-- Specific, testable. Each item becomes a test case or a DoD checklist item.
     Format: "Given … when … then …" or a bullet list of verifiable outcomes. -->
- [ ]
- [ ]
- [ ]

## Out of scope
<!-- Explicitly name what this feature does NOT do. Prevents scope creep in the PR. -->

## Definition of Ready (tick all before sprint start)
- [ ] Acceptance criteria are specific and testable
- [ ] The iteration this belongs to is confirmed
- [ ] Any Flyway migration needed is identified (next: V27+)
- [ ] API contract (request/response shape) is agreed if backend work is involved
- [ ] UI behaviour is described if frontend work is involved (or Figma ref linked)
- [ ] RBAC / privacy implications are noted
- [ ] AI fallback is documented if this feature involves AI

## Notes / references
<!-- Figma links, related issues, spec doc sections, external dependencies. -->
