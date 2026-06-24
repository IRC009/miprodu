import React from 'react';

/**
 * Wraps React.lazy with a retry mechanism.
 * If the import fails (e.g., due to a new deployment where old chunks are gone),
 * it reloads the page to fetch the latest version.
 */
export const lazyWithRetry = (componentImport) =>
  React.lazy(async () => {
    try {
      return await componentImport();
    } catch (error) {
      console.error('Error loading chunk:', error);
      
      const isReloadPending = window.sessionStorage.getItem('lazy-reload-pending') === 'true';
      
      if (isReloadPending) {
        throw error;
      }
      
      window.sessionStorage.setItem('lazy-reload-pending', 'true');
      
      // Clean up service workers and caches to prevent loading old chunk mappings
      if ('serviceWorker' in navigator) {
        try {
          const regs = await navigator.serviceWorker.getRegistrations();
          for (let r of regs) {
            await r.unregister();
          }
        } catch (swErr) {
          console.error('Error clearing SW in lazy retry:', swErr);
        }
      }
      
      if ('caches' in window) {
        try {
          const keys = await caches.keys();
          for (let k of keys) {
            await caches.delete(k);
          }
        } catch (cacheErr) {
          console.error('Error clearing caches in lazy retry:', cacheErr);
        }
      }
      
      // Forzar recarga limpia añadiendo un query param
      const url = new URL(window.location.href);
      url.searchParams.set('t', Date.now().toString());
      window.location.replace(url.toString());
      
      return { default: () => null };
    }
  });
