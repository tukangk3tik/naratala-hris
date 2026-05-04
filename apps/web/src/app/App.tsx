import { QueryClientProvider } from '@tanstack/react-query';
import { BrowserRouter } from 'react-router-dom';
import { Toaster } from 'sonner';
import { useState } from 'react';
import { AuthProvider } from '../shared/auth/AuthProvider.js';
import { makeQueryClient } from '../shared/api/queries.js';
import { AppRoutes } from './routes.js';

export function App(): JSX.Element {
  const [client] = useState(() => makeQueryClient());
  return (
    <QueryClientProvider client={client}>
      <BrowserRouter>
        <AuthProvider>
          <AppRoutes />
        </AuthProvider>
        <Toaster richColors position="top-right" />
      </BrowserRouter>
    </QueryClientProvider>
  );
}
