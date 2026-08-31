// frontend/src/lib/queryClient.ts
// TanStack Query client configuration.
// - staleTime: 60s (avoid hammering API for data that rarely changes)
// - retry: 1 (don't retry 401s infinitely — the interceptor handles token refresh)
// - networkMode: 'always' (works inside Capacitor WebView where navigator.onLine can be unreliable)

import { QueryClient } from '@tanstack/react-query';

export const queryClient = new QueryClient({
  defaultOptions: {
    queries: {
      staleTime: 2 * 60 * 1000, // 2 minutes cache validity
      gcTime: 10 * 60 * 1000,   // 10 minutes garbage collection
      retry: 1,
      networkMode: 'always',
      refetchOnWindowFocus: false, // Do not spam requests on window switch/tab focus
      refetchOnReconnect: 'always',
    },
    mutations: {
      networkMode: 'always',
    },
  },
});
