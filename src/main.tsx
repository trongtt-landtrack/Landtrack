import {StrictMode} from 'react';
import {createRoot} from 'react-dom/client';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import App from './App.tsx';
import './index.css';

const queryClient = new QueryClient({
  defaultOptions: {
    queries: {
      staleTime: 1000 * 60 * 5, // 5 minutes
      gcTime: 1000 * 60 * 30, // 30 minutes
      retry: 1,
      refetchOnWindowFocus: false,
    },
  },
});

const ALLOWED_DOMAINS = [
  'ais-dev-yc5m26qonetltxs6ccuw7v-246082613320.asia-southeast1.run.app',
  'ais-pre-yc5m26qonetltxs6ccuw7v-246082613320.asia-southeast1.run.app',
  'localhost'
];

if (!ALLOWED_DOMAINS.includes(window.location.hostname)) {
  window.location.href = 'https://google.com';
} else {
  createRoot(document.getElementById('root')!).render(
    <StrictMode>
      <QueryClientProvider client={queryClient}>
        <App />
      </QueryClientProvider>
    </StrictMode>,
  );
}
