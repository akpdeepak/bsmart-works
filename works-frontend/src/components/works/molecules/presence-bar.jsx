// presence-bar.jsx — compact co-viewer avatar row + soft-lock banner.
// WI-29: SSE presence indicators for the collaborative knowledge editor.
//
// Props:
//   viewers    — PresenceUser[] (already filtered to exclude self)
//   lockGranted — boolean — false when another user holds the edit lock
//   lockedBy   — string | null — display name of the lock holder
//
// Design tokens only (RB-30 §1). Lucide icon for lock. Avatar atom for viewer chips.
// WCAG 2.1 AA: role="status", aria-label, aria-hidden on decorative icons.

import { Lock } from 'lucide-react';
import { Avatar } from '@/components/works/atoms/avatar';

export function PresenceBar({ viewers = [], lockGranted = true, lockedBy = null }) {
  if (lockGranted && viewers.length === 0) return null;

  return (
    <div className="flex items-center gap-2" role="status" aria-label="Article viewers">
      {/* Soft-lock banner — shown when another user holds the edit lock */}
      {!lockGranted && lockedBy && (
        <span className="flex items-center gap-1 text-xs text-semantic-warning bg-semantic-warning-surface px-2 py-1 rounded-md">
          <Lock size={12} aria-hidden="true" />
          {lockedBy} is editing — you are in read-only mode
        </span>
      )}

      {/* Co-viewers avatar stack — max 4 shown, then +N overflow chip */}
      {viewers.length > 0 && (
        <div
          className="flex -space-x-1"
          aria-label={`${viewers.length} other viewer${viewers.length !== 1 ? 's' : ''}`}
        >
          {viewers.slice(0, 4).map((v) => (
            <Avatar
              key={v.userId}
              name={v.name}
              size={6}
              className="ring-2 ring-white dark:ring-neutral-800"
              title={v.name}
            />
          ))}
          {viewers.length > 4 && (
            <span
              className="flex items-center justify-center w-6 h-6 rounded-full bg-neutral-200 text-neutral-600 text-xs ring-2 ring-white dark:ring-neutral-800"
              aria-label={`${viewers.length - 4} more viewers`}
            >
              +{viewers.length - 4}
            </span>
          )}
        </div>
      )}
    </div>
  );
}
