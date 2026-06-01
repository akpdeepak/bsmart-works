// bSmart Works — TanStack Query client (CLAUDE.md §16).
// Single instance shared across the entire app via QueryClientProvider in main.jsx.
// All data fetching goes through useQuery/useMutation + the apiClient wrapper — never raw fetch.
import { QueryClient } from '@tanstack/react-query'

export const queryClient = new QueryClient({
  defaultOptions: {
    queries: {
      staleTime: 30_000,          // data stays fresh for 30s — avoids redundant re-fetches
      retry: 1,                   // one automatic retry on network failure
      refetchOnWindowFocus: false, // don't silently re-fetch when user tabs back
    },
    mutations: {
      retry: 0,                   // mutations never auto-retry — surface errors immediately
    },
  },
})
