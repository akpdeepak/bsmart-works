// KR-075 — AI auto-tagging suggestion chips.
// Renders a horizontal strip of suggested tag names. Each chip has an Accept (✓) and Dismiss (×)
// button. Accept calls onAccept(tagName) so the parent can create the tag if needed and apply it.
// Design tokens only (RB-30 §1).

import { useState } from 'react';
import { Check, X } from 'lucide-react';

/**
 * @param {{ suggestions: string[], onAccept: (name: string) => void,
 *           onDismiss: (name: string) => void }} props
 */
export function TagSuggestionChips({ suggestions, onAccept, onDismiss }) {
  const [dismissed, setDismissed] = useState(new Set());
  const [accepted, setAccepted] = useState(new Set());

  const visible = (suggestions || []).filter(
    (name) => !dismissed.has(name) && !accepted.has(name),
  );

  if (visible.length === 0) return null;

  const handleAccept = (name) => {
    setAccepted((prev) => new Set([...prev, name]));
    onAccept?.(name);
  };

  const handleDismiss = (name) => {
    setDismissed((prev) => new Set([...prev, name]));
    onDismiss?.(name);
  };

  return (
    <div className="flex flex-wrap gap-1.5" role="list" aria-label="Suggested tags">
      {visible.map((name) => (
        <span
          key={name}
          role="listitem"
          className="inline-flex items-center gap-0.5 pl-2.5 pr-1 py-0.5 rounded-full bg-semantic-success-surface border border-semantic-success/30 text-xs font-medium text-semantic-success"
        >
          {name}
          <button
            type="button"
            aria-label={`Accept tag "${name}"`}
            onClick={() => handleAccept(name)}
            className="h-4 w-4 rounded-full flex items-center justify-center hover:bg-semantic-success/20 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-semantic-success/40"
          >
            <Check className="h-2.5 w-2.5" aria-hidden="true" />
          </button>
          <button
            type="button"
            aria-label={`Dismiss tag "${name}"`}
            onClick={() => handleDismiss(name)}
            className="h-4 w-4 rounded-full flex items-center justify-center hover:bg-semantic-danger/20 text-neutral-400 hover:text-semantic-danger focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-semantic-danger/40"
          >
            <X className="h-2.5 w-2.5" aria-hidden="true" />
          </button>
        </span>
      ))}
    </div>
  );
}
