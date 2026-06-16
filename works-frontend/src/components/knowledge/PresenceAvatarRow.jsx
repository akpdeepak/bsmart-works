// PresenceAvatarRow — stacked avatar row for article-level presence indicators.
// KR-065: Real-time presence indicators in Know Studio. Shows up to 4 viewer
// avatars as overlapping circles with a +N overflow badge for additional viewers.
// Tooltip on hover shows the full list of names.
// Design tokens only (RB-30 §1); WCAG 2.1 AA (aria-label on container).

const MAX_SHOWN = 4;

/**
 * PresenceAvatarRow — renders presence avatars for viewers of an article.
 *
 * @param {{
 *   presences: Array<{ userId: string, displayName: string, avatarInitial?: string }>,
 * }} props
 */
export function PresenceAvatarRow({ presences = [] }) {
  if (presences.length === 0) return null;

  const shown = presences.slice(0, MAX_SHOWN);
  const overflow = presences.length - MAX_SHOWN;
  const allNames = presences.map((p) => p.displayName).join(', ');

  return (
    <div
      className="flex items-center -space-x-1.5"
      aria-label={`${presences.length} ${presences.length === 1 ? 'person' : 'people'} currently viewing`}
      title={allNames}
    >
      {shown.map((p) => {
        const initial = p.avatarInitial || (p.displayName ? p.displayName.charAt(0).toUpperCase() : '?');
        return (
          <div
            key={p.userId}
            className="w-7 h-7 rounded-full bg-brand-navy/20 text-brand-navy text-xs font-semibold flex items-center justify-center ring-2 ring-white dark:ring-neutral-800 flex-shrink-0 select-none"
            title={p.displayName}
            aria-hidden="true"
          >
            {initial}
          </div>
        );
      })}

      {overflow > 0 && (
        <div
          className="w-7 h-7 rounded-full bg-neutral-200 dark:bg-neutral-700 text-neutral-600 dark:text-neutral-300 text-xs font-semibold flex items-center justify-center ring-2 ring-white dark:ring-neutral-800 flex-shrink-0 select-none"
          title={presences.slice(MAX_SHOWN).map((p) => p.displayName).join(', ')}
          aria-hidden="true"
        >
          +{overflow}
        </div>
      )}
    </div>
  );
}
