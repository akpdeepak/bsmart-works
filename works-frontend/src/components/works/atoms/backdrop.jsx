// Full-bleed click-catcher rendered behind an overlay (modal, command palette). A real <button>
// so the click-to-dismiss affordance stays keyboard/AT-reachable and jsx-a11y-clean; it is not a
// tab stop (Escape and the close control are the primary paths). Visually a dimming scrim.
export function Backdrop({ onClick, label }) {
  return (
    <button
      type="button"
      aria-label={label}
      tabIndex={-1}
      onClick={onClick}
      className="absolute inset-0 cursor-default bg-neutral-900/50 dark:bg-black/70"
    />
  );
}
