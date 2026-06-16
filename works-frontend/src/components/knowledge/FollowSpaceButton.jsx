import { useState } from 'react';
import { Bell, BellOff } from 'lucide-react';
import { api } from '@/lib/apiClient';
import { cn } from '@/lib/utils';

/**
 * Follow/unfollow toggle for a knowledge space (KR-068).
 * Shows Bell/BellOff icon and follower count.
 * POST /knowledge-spaces/{id}/follow toggles; state update is optimistic.
 *
 * Props:
 *   spaceId           {string}  — the space id
 *   workspaceId       {string}  — (unused by fetch; kept for symmetry and future use)
 *   initialFollowing  {boolean} — starting state from the parent's space data
 *   initialCount      {number}  — starting follower count
 */
export function FollowSpaceButton({
  spaceId,
  initialFollowing = false,
  initialCount = 0,
}) {
  const [following, setFollowing] = useState(!!initialFollowing);
  const [count, setCount] = useState(Number(initialCount) || 0);
  const [busy, setBusy] = useState(false);

  const toggle = () => {
    if (busy || !spaceId) return;
    // Optimistic update
    const nextFollowing = !following;
    setFollowing(nextFollowing);
    setCount((c) => nextFollowing ? c + 1 : Math.max(0, c - 1));
    setBusy(true);
    api.send(`/knowledge-spaces/${encodeURIComponent(spaceId)}/follow`, { method: 'POST' })
      .then((res) => {
        setFollowing(!!res.following);
        if (typeof res.followerCount === 'number') setCount(res.followerCount);
      })
      .catch(() => {
        // Revert optimistic update on error
        setFollowing(!nextFollowing);
        setCount((c) => nextFollowing ? Math.max(0, c - 1) : c + 1);
      })
      .finally(() => setBusy(false));
  };

  return (
    <button
      type="button"
      onClick={toggle}
      disabled={busy}
      aria-pressed={following}
      aria-label={following ? 'Unfollow space' : 'Follow space'}
      title={following ? 'Stop following this space' : 'Follow this space for new articles'}
      className={cn(
        'flex items-center gap-1 text-xs px-2.5 py-1 rounded-lg border transition-colors',
        'focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-brand-navy-tint/40',
        'disabled:opacity-50 disabled:cursor-not-allowed',
        following
          ? 'border-brand-navy-tint/40 bg-brand-navy-tint/10 text-brand-navy dark:text-white'
          : 'border-neutral-200 dark:border-neutral-700 text-neutral-600 dark:text-neutral-400 hover:border-brand-navy hover:text-brand-navy'
      )}
    >
      {following
        ? <Bell className="h-3.5 w-3.5" aria-hidden="true" />
        : <BellOff className="h-3.5 w-3.5" aria-hidden="true" />}
      <span className="hidden sm:inline">{following ? 'Following' : 'Follow'}</span>
      {count > 0 && (
        <span className="text-neutral-500 tabular-nums" aria-label={`${count} follower${count !== 1 ? 's' : ''}`}>
          {count}
        </span>
      )}
    </button>
  );
}

export default FollowSpaceButton;
