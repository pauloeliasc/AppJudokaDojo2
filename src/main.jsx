import {StrictMode} from 'react';
import {createRoot} from 'react-dom/client';
import App from './App.tsx';
import './index.css';

createRoot(document.getElementById('root')!).render(
  <StrictMode>
    <App />
  </StrictMode>,
);

// Register Service Worker for PWA support (only in production)
if ('serviceWorker' in navigator) {
  if ((import.meta as any).env?.PROD) {
    window.addEventListener('load', () => {
      navigator.serviceWorker.register('/sw.js')
        .then((reg) => {
          console.log('Service Worker registrado com sucesso:', reg.scope);
        })
        .catch((err) => {
          console.error('Falha ao registrar Service Worker:', err);
        });
    });
  } else {
    // In development, actively unregister any existing service workers to prevent stale cache issues
    navigator.serviceWorker.getRegistrations().then((registrations) => {
      for (const registration of registrations) {
        registration.unregister().then((success) => {
          if (success) {
            console.log('Service Worker antigo desregistrado com sucesso no ambiente de desenvolvimento.');
            // Clear caches to force a fresh fetch of all dev modules without forcing a reload loops
            caches.keys().then((keys) => {
              for (const key of keys) {
                caches.delete(key);
              }
            });
          }
        });
      }
    });
  }
}

