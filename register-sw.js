'use strict';
(() => {
  if (!window.BLOBBY_WEB_CONFIG?.serviceWorker || !('serviceWorker' in navigator)) return;
  window.addEventListener('load', () => {
    navigator.serviceWorker.register('./sw.js', { scope: './' }).catch(err => console.warn('Blobby service worker unavailable:', err));
  }, { once: true });
})();
