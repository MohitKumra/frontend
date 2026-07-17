import React from 'react';
import ReactDOM from 'react-dom/client';
import { BrowserRouter } from 'react-router-dom';
import { QueryClientProvider } from '@tanstack/react-query';
import { Toaster } from 'react-hot-toast';

import App from './App';
import { queryClient } from './lib/queryClient';
import { initTheme } from './platform/theme';
import { OnboardingRoot } from './features/onboarding/components/OnboardingProvider';
import './index.css';

// Import Inter font
const link = document.createElement('link');
link.rel = 'stylesheet';
link.href = 'https://fonts.googleapis.com/css2?family=Inter:wght@400;500;600;700;800&display=swap';
document.head.appendChild(link);

// Initialize theme before first paint to avoid flash of wrong theme
initTheme().then(() => {
  ReactDOM.createRoot(document.getElementById('root')!).render(
    <React.StrictMode>
      <BrowserRouter>
        <QueryClientProvider client={queryClient}>
          <OnboardingRoot>
            <App />
          </OnboardingRoot>
          <Toaster
            position="top-right"
            toastOptions={{
              duration: 3200,
              className: 'toast-enter',
              style: {
                background: 'var(--color-surface-raised)',
                color: 'var(--color-text-primary)',
                border: '1px solid var(--color-border)',
                borderRadius: '12px',
                fontSize: '14px',
                boxShadow: 'var(--shadow-lg)',
              },
            }}
          />
        </QueryClientProvider>
      </BrowserRouter>
    </React.StrictMode>,
  );
});
