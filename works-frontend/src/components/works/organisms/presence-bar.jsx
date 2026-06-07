import { Avatar } from '@/components/works/atoms/avatar';
import { cn } from '@/lib/utils';

// Organism (iteration 18, Cap S — real-time co-presence). The subtle "who's here" cluster of
// avatars the spec asks for (small, in a corner, not intrusive). Shows up to `max` present users
// plus an overflow chip; the current user is filtered out. Decorative-but-labelled (each avatar has
// a title + the group is labelled), tokens only.
export function PresenceBar({ present = [], currentUserId, max = 4, className }) {
  const others = present.filter((p) => p.userId !== currentUserId);
  if (others.length === 0) return null;

  const shown = others.slice(0, max);
  const overflow = others.length - shown.length;

  return (
    <div
      className={cn('flex items-center', className)}
      aria-label={`${others.length} other${others.length === 1 ? '' : 's'} viewing this workspace`}
    >
      <div className="flex -space-x-2">
        {shown.map((p) => (
          <div key={p.userId} className="rounded-full ring-2 ring-white dark:ring-neutral-900" title={titleFor(p)}>
            <Avatar name={p.name || p.userId} size={6} />
          </div>
        ))}
      </div>
      {overflow > 0 && (
        <span className="ml-1 inline-flex h-6 min-w-6 items-center justify-center rounded-full bg-neutral-200 px-1 text-xs font-semibold text-neutral-700 dark:bg-neutral-700 dark:text-neutral-200">
          +{overflow}
        </span>
      )}
    </div>
  );
}

function titleFor(p) {
  const name = p.name || p.userId;
  return p.location ? `${name} · ${p.location}` : name;
}
