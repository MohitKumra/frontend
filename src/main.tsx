import React from 'react';
import ReactDOM from 'react-dom/client';
import { BrowserRouter } from 'react-router-dom';
import { QueryClientProvider } from '@tanstack/react-query';
import { Toaster } from 'react-hot-toast';
import { MotionConfig } from 'framer-motion';

import App from './App';
import { queryClient } from './lib/queryClient';
import { initTheme } from './platform/theme';
import { OnboardingRoot } from './features/onboarding/components/OnboardingProvider';
import './index.css';

// Theme is applied synchronously by the inline <script> in index.html before any
// JS runs, so the correct theme is already on <html> for first paint. We still
// call initTheme() (fire-and-forget) to keep the stored preference in sync, but
// we no longer block React's first render on an async storage read.
void initTheme();

ReactDOM.createRoot(document.getElementById('root')!).render(
  <React.StrictMode>
    <BrowserRouter>
      {/* Global reduced-motion switch for framer-motion: when the OS/browser
          prefers reduced motion, MotionConfig disables transform/layout
          animations app-wide (opacity stays). This is a cheap, safe lever that
          noticeably helps low-end / older devices without touching 50+ files. */}
      <MotionConfig reducedMotion="user">
        <QueryClientProvider client={queryClient}>
          <OnboardingRoot>
            <App />
          </OnboardingRoot>
          <Toaster
            position="top-right"
            containerStyle={{ zIndex: 110 }}
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
      </MotionConfig>
    </BrowserRouter>
  </React.StrictMode>
);
