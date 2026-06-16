// bSmart Works — AI assist button atom (WI-27).
//
// Reusable "AI assist" trigger with three visual states:
//   idle      — Sparkles icon + label; action available
//   suggesting — Loader2 spinning + "Thinking…"; action in-flight
//   fallback  — renders null; AI is off/unavailable, manual field is the only path
//
// The fallback state (returning null) is the deterministic fallback contract (RB-40 §2):
// when AI is off the button is absent, not merely disabled — the manual field is always
// present and always sufficient.

import { Sparkles, Loader2 } from 'lucide-react';
import { Button } from '@/components/works/button';
import { cn } from '@/lib/utils';

/**
 * @param {{
 *   onClick: () => void,
 *   suggesting?: boolean,
 *   fallback?: boolean,
 *   disabled?: boolean,
 *   label?: string,
 *   className?: string,
 * }} props
 */
export function AiAssistButton({
  onClick,
  suggesting = false,
  fallback = false,
  disabled = false,
  label = 'AI assist',
  className,
}) {
  // Deterministic fallback: when AI is off / unavailable, render nothing.
  // The manual field (description textarea, etc.) is always present and is the only path.
  if (fallback) return null;

  return (
    <Button
      variant="ghost"
      size="sm"
      onClick={onClick}
      disabled={disabled || suggesting}
      aria-label={suggesting ? 'AI is thinking…' : label}
      className={cn('gap-1 text-brand-navy', className)}
    >
      {suggesting ? (
        <Loader2 size={14} className="animate-spin" aria-hidden="true" />
      ) : (
        <Sparkles size={14} aria-hidden="true" />
      )}
      <span>{suggesting ? 'Thinking…' : label}</span>
    </Button>
  );
}
