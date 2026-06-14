// Loading skeleton for an analysis tab (RB-30 §6 — animate-pulse, not a spinner or empty-flash).
export function CockpitSkeleton({ rows = 3 }) {
  return (
    <div className="space-y-3" aria-busy="true" aria-label="Loading">
      <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
        {Array.from({ length: 4 }).map((_, i) => (
          <div key={i} className="h-20 rounded-xl bg-neutral-100 dark:bg-neutral-800 animate-pulse" />
        ))}
      </div>
      {Array.from({ length: rows }).map((_, i) => (
        <div key={i} className="h-16 rounded-xl bg-neutral-100 dark:bg-neutral-800 animate-pulse" />
      ))}
    </div>
  );
}
