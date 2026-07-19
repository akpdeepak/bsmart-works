// Motion choreography constants (WI-24).
// Single source of truth — matches tailwind.config.js transitionDuration /
// transitionTimingFunction so Tailwind classes and JS-driven inline styles
// are always in sync. Import from here; never hard-code durations or easings.

// Named duration tokens (ms). Matches `transitionDuration` in tailwind.config.js.
export const DURATION = {
  instant: 0,
  fast:    150,  // hover, press — immediate tactile response
  base:    220,  // panels, accordions, drawers — main UI transitions
  slow:    320,  // page / large transitions
  slower:  480,  // long, deliberate animations
};

// Named easing tokens. Matches `transitionTimingFunction` in tailwind.config.js.
export const EASING = {
  outQuint: 'cubic-bezier(0.22, 1, 0.36, 1)',   // exits & general UX — fast out, gentle arrival
  spring:   'cubic-bezier(0.34, 1.56, 0.64, 1)', // press / drag — physicality with slight overshoot
  linear:   'linear',
};

// Role → (duration, easing) mapping for every UI surface type.
// Keeps choreography decisions in one place; consumers reference by role.
export const MOTION_ROLE = {
  hover:     { duration: DURATION.fast,  easing: EASING.outQuint },
  press:     { duration: DURATION.fast,  easing: EASING.spring },
  panel:     { duration: DURATION.base,  easing: EASING.outQuint },
  modal:     { duration: DURATION.base,  easing: EASING.outQuint },
  drawer:    { duration: DURATION.base,  easing: EASING.outQuint },
  accordion: { duration: DURATION.base,  easing: EASING.outQuint },
  toast:     { duration: DURATION.base,  easing: EASING.outQuint },
  page:      { duration: DURATION.slow,  easing: EASING.outQuint },
  enter:     { duration: DURATION.base,  easing: EASING.outQuint },   // content appearance (fade-in, scale-up)
  exit:      { duration: DURATION.fast,  easing: EASING.outQuint },   // content disappearance (exits should be faster)
  expand:    { duration: DURATION.base,  easing: EASING.outQuint },   // height/width expansion (collapsible sections)
  collapse:  { duration: DURATION.fast,  easing: EASING.outQuint },   // height/width contraction
};

/**
 * Returns a CSS `transition` shorthand value for the given role.
 *
 * @param {keyof typeof MOTION_ROLE} role  - Surface role (e.g. 'modal', 'drawer').
 * @param {string}                   property - CSS property to transition (default 'all').
 * @returns {string}  e.g. `'all 220ms cubic-bezier(0.22, 1, 0.36, 1)'`
 */
export function motionTransition(role, property = 'all') {
  const { duration, easing } = MOTION_ROLE[role] ?? MOTION_ROLE.panel;
  return `${property} ${duration}ms ${easing}`;
}
