import {StrictMode} from 'react';
import {createRoot} from 'react-dom/client';
import App from './App.tsx';
import './index.css';

createRoot(document.getElementById('root')!).render(
  <StrictMode>
    <App />
  </StrictMode>,
);

// Service Worker Registration & Smooth Update lifecycle
if ('serviceWorker' in navigator) {
  window.addEventListener('load', () => {
    navigator.serviceWorker.register('/sw.js')
      .then((reg) => {
        // Listen for new version updates in background
        reg.onupdatefound = () => {
          const installingWorker = reg.installing;
          if (installingWorker) {
            installingWorker.onstatechange = () => {
              if (installingWorker.state === 'installed' && navigator.serviceWorker.controller) {
                installingWorker.postMessage({ type: 'SKIP_WAITING' });
              }
            };
          }
        };
      })
      .catch((err) => {
        console.warn('Aviso Service Worker:', err);
      });
  });

  // Reload page smoothly when the new Service Worker activates to prevent stale code
  let refreshing = false;
  navigator.serviceWorker.addEventListener('controllerchange', () => {
    if (!refreshing) {
      refreshing = true;
      window.location.reload();
    }
  });
}

// Global self-healing for chunk mismatch errors when app is updated on Android/iOS
window.addEventListener('error', (e) => {
  if (e.message && (e.message.includes('Loading chunk') || e.message.includes('dynamically imported module') || e.message.includes('Failed to fetch'))) {
    console.warn("Detectada versão desatualizada de scripts em cache. Atualizando página...");
    const hasReloaded = sessionStorage.getItem('chunk_reloaded');
    if (!hasReloaded) {
      sessionStorage.setItem('chunk_reloaded', '1');
      window.location.reload();
    }
  }
});
