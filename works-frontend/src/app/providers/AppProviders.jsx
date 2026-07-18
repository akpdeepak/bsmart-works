import { StrictMode } from 'react';
import { QueryClientProvider } from '@tanstack/react-query';
import { ErrorBoundary } from '@/components/works/error-boundary';
import { DialogProvider } from '@/lib/dialog';
import { I18nProvider } from '@/lib/i18n';
import { queryClient } from '@/lib/query-client';

export function AppProviders({ children }) {
  return (
    <StrictMode>
      <QueryClientProvider client={queryClient}>
        <ErrorBoundary>
          <I18nProvider>
            <DialogProvider>{children}</DialogProvider>
          </I18nProvider>
        </ErrorBoundary>
      </QueryClientProvider>
    </StrictMode>
  );
}
