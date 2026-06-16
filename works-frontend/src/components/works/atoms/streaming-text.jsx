// bSmart Works — streaming text display atom (WI-27).
//
// Renders token-streaming text with a blinking cursor while streaming is active.
// When streaming=false the cursor disappears and the text is read back statically.
//
// Accessibility:
//   • aria-live="polite" so screen readers announce incremental content as it arrives
//     without interrupting the current utterance.
//   • aria-label is set to a human description during streaming for assistive tech
//     that does not support live regions well.
//   • The cursor element is aria-hidden — it is purely decorative.

/**
 * @param {{
 *   text: string,
 *   streaming?: boolean,
 *   className?: string,
 * }} props
 */
export function StreamingText({ text, streaming = false, className }) {
  return (
    <span
      className={className}
      aria-live="polite"
      aria-label={streaming ? 'AI is writing…' : undefined}
    >
      {text}
      {streaming && (
        <span
          className="ml-0.5 inline-block h-4 w-0.5 bg-brand-navy animate-pulse align-text-bottom"
          aria-hidden="true"
        />
      )}
    </span>
  );
}
