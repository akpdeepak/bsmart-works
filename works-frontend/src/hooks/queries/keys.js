// bSmart Works — shared TanStack Query key factories (ONE Source).
//
// One place that defines the cache key for each server resource, so every consumer of a resource
// reads and invalidates the same cache entry instead of issuing its own uncoordinated fetch with a
// duplicated URL string. See docs/analysis/ONE-source.md §A.

export const usersKeys = {
  all: ['users'],
  list: (workspaceId) => ['users', workspaceId],
};

export const projectsKeys = {
  all: ['projects'],
  list: (workspaceId) => ['projects', workspaceId],
};

export const featureFlagsKeys = {
  all: ['feature-flags'],
  list: (workspaceId) => ['feature-flags', workspaceId],
};

export const workspaceSetupKeys = {
  all: ['workspace-setup'],
  status: (workspaceId) => ['workspace-setup', workspaceId, 'status'],
};

export const workItemsKeys = {
  all: ['work-items'],
  // projectId is optional — null when querying workspace-wide. Consistent null keeps the cache
  // key stable so optimistic updates and invalidations always hit the same entry.
  list: (workspaceId, projectId) => ['work-items', workspaceId, projectId ?? null],
  detail: (id) => ['work-items', id],
};

export const savedViewsKeys = {
  all: ['saved-views'],
  list: (workspaceId, projectId) => ['saved-views', workspaceId, projectId ?? null],
};
