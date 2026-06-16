import { useEffect, useRef } from 'react';

// Atom — animated checkmark that plays a stroke-draw once on mount (WI-24).
// Used for save-confirmation, onboarding step complete, item done.
// Technique: stroke-dasharray + stroke-dashoffset set to the path length, then
// a rAF-deferred transition sets dashoffset to 0 so the check "draws itself in".
// Respects prefers-reduced-motion: index.css collapses transition-duration to 0.01ms
// so the draw completes near-instantly without animation.
//
// Usage:
//   <SuccessCheck />                              — 24px, default aria-label
//   <SuccessCheck size={32} aria-label="Done" />  — custom size + label

export function SuccessCheck({ size = 24, className = '', 'aria-label': ariaLabel = 'Success' }) {
  const pathRef = useRef(null);

  useEffect(() => {
    const path = pathRef.current;
    if (!path) return;
    const len = path.getTotalLength();
    // Start fully hidden — dashoffset equals the full path length.
    path.style.strokeDasharray = `${len}`;
    path.style.strokeDashoffset = `${len}`;
    // rAF deferred: browser has painted the initial hidden state; now animate to visible.
    const id = requestAnimationFrame(() => {
      path.style.transition = `stroke-dashoffset 220ms cubic-bezier(0.22, 1, 0.36, 1)`;
      path.style.strokeDashoffset = '0';
    });
    return () => cancelAnimationFrame(id);
  }, []);

  return (
    <svg
      width={size}
      height={size}
      viewBox="0 0 24 24"
      fill="none"
      role="img"
      aria-label={ariaLabel}
      className={className}
    >
      {/* Circle ring — rendered immediately; check draws in. */}
      <circle
        cx="12"
        cy="12"
        r="10"
        stroke="currentColor"
        strokeWidth="2"
        className="text-semantic-success"
      />
      {/* Check path — stroke-draw animation via dashoffset (see useEffect above). */}
      <path
        ref={pathRef}
        d="M7 12.5l3.5 3.5L17 9"
        stroke="currentColor"
        strokeWidth="2.5"
        strokeLinecap="round"
        strokeLinejoin="round"
        className="text-semantic-success"
      />
    </svg>
  );
}
