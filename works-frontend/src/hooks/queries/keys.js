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

export const workspaceSetupKeys = {
  all: ['workspace-setup'],
  status: (workspaceId) => ['workspace-setup', workspaceId, 'status'],
};
