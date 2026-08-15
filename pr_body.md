## Summary
Upgraded skeletons to use premium shimmer animations instead of pulse, and added deferred CSS rendering to AsyncBoundary to avoid loading flashes.

## Scope
- `works-frontend/tailwind.config.js`: Added shimmer and fade-in keyframes/animations.
- `works-frontend/src/components/works/atoms/skeleton.jsx`: Applied motion-safe shimmer and staggered delays.
- `works-frontend/src/components/works/atoms/async-boundary.jsx`: Applied opacity-0 and fade-in to the loading wrapper to prevent loading flashes.

## Validation
Locally verified via Storybook that the animations trigger properly, and the AsyncBoundary delays the rendering of skeletons to prevent layout shift and flash of loading.

## TDD
TDD: not applicable — reason: purely presentational CSS and UI animation updates.

<!-- bsmart-pr-evidence
{
  "protocol": "bsmart-pr/v1",
  "task": "GH-565",
  "planUrl": "https://github.com/akpdeepak/bsmart-works/pull/565",
  "acceptance": [
    { "id": "AC-1", "evidence": ["TEST-1"] }
  ],
  "validation": [
    { "id": "TEST-1", "command": "npm run storybook", "status": "passed" }
  ],
  "tdd": {
    "applicable": false,
    "reason": "purely presentational CSS and UI animation updates"
  }
}
-->
