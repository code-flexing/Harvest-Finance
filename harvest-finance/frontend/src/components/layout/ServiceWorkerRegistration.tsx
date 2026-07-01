'use client';

import { useEffect } from 'react';

const VISIT_COUNT_KEY = "harvest-pwa-visit-count-v1";

const INSTALL_PROMPT_SHOWN_KEY = "harvest-pwa-install-prompt-shown-v1";

export function ServiceWorkerRegistration() {
  useEffect(() => {
    if ('serviceWorker' in navigator && process.env.NODE_ENV === 'production') {
      navigator.serviceWorker
        .register('/sw.js')
        .then((registration) => {
          console.log('Service Worker registered with scope:', registration.scope);

          registration.addEventListener('updatefound', () => {
            const newWorker = registration.installing;
            if (newWorker) {
              newWorker.addEventListener('statechange', () => {
                if (newWorker.state === 'installed' && navigator.serviceWorker.controller) {
                  console.log('New Service Worker available');
                }
              });
            }
          });
        })
        .catch((error) => {
          console.error('Service Worker registration failed:', error);
        });

      let deferredPrompt: BeforeInstallPromptEvent | null = null;

      // Track visits after app load, independent of beforeinstallprompt event.
      const incrementVisitCount = () => {
        const shown = window.localStorage.getItem(INSTALL_PROMPT_SHOWN_KEY) === "1";
        if (shown) return;

        const raw = window.localStorage.getItem(VISIT_COUNT_KEY);
        const count = raw ? Number(raw) : 0;
        const next = count + 1;
        window.localStorage.setItem(VISIT_COUNT_KEY, String(next));
        if (next >= 3 && deferredPrompt) {
          window.localStorage.setItem(INSTALL_PROMPT_SHOWN_KEY, "1");
          void deferredPrompt.prompt().then(() => deferredPrompt?.userChoice).catch(() => {});
        }
      };


      const incrementAndMaybePrompt = async () => {
        try {
          const shown = window.localStorage.getItem(INSTALL_PROMPT_SHOWN_KEY) === "1";
          if (shown) return;

          const raw = window.localStorage.getItem(VISIT_COUNT_KEY);
          const count = raw ? Number(raw) : 0;
          const next = count + 1;
          window.localStorage.setItem(VISIT_COUNT_KEY, String(next));

          // Acceptance criteria: show after 3 visits to eligible users.
          if (next >= 3 && deferredPrompt) {
            window.localStorage.setItem(INSTALL_PROMPT_SHOWN_KEY, "1");
            await deferredPrompt.prompt();
            await deferredPrompt.userChoice;
          }
        } catch {
          // no-op
        }
      };

      window.addEventListener('beforeinstallprompt', (e) => {
        e.preventDefault();
        deferredPrompt = e as BeforeInstallPromptEvent;

        // If user already reached eligibility, show prompt now.
        incrementVisitCount();
      });

      // Increment visit count immediately on app load.
      incrementVisitCount();


      navigator.serviceWorker.addEventListener('message', (event) => {
        if (event.data?.type === 'SYNC_TRIGGERED') {
          window.dispatchEvent(new CustomEvent('harvest-sync-triggered'));
        }
      });
    }
  }, []);

  return null;
}


interface BeforeInstallPromptEvent extends Event {
  prompt(): Promise<void>;
  userChoice: Promise<{ outcome: 'accepted' | 'dismissed' }>;
}