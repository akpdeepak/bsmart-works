// bSmart Works — unified search hook (WI-30).
// 300 ms debounce prevents a request on every keystroke; the query is only sent once the user
// pauses. `enabled` gates the query to meaningful input (≥ 2 chars) and a known workspace.

import { useQuery } from '@tanstack/react-query';
import { useState, useEffect } from 'react';
import { searchClient } from '@/lib/search';
import { searchKeys } from '@/hooks/queries/keys';

export { searchKeys };

export function useSearch(workspaceId, query, filters = {}) {
  const [debouncedQuery, setDebouncedQuery] = useState(query);

  useEffect(() => {
    const id = setTimeout(() => setDebouncedQuery(query), 300);
    return () => clearTimeout(id);
  }, [query]);

  return useQuery({
    queryKey: searchKeys.results(workspaceId, debouncedQuery, filters),
    queryFn: () => searchClient.search(workspaceId, debouncedQuery, filters),
    enabled: Boolean(workspaceId) && debouncedQuery.trim().length >= 2,
    staleTime: 30_000,
  });
}
