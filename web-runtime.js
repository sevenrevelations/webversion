'use strict';
(() => {
  if (window.BlobbyPlatform?.target !== 'web') return;
  let viewport, frame, notice, currentUrl = '';
  let resizeObserver;

  function ensureViewport() {
    if (viewport) return viewport;
    viewport = document.createElement('section');
    viewport.id = 'blobbyWebViewport';
    viewport.className = 'blobby-web-viewport';
    viewport.hidden = true;
    viewport.setAttribute('aria-label', 'Web page viewport');

    notice = document.createElement('div');
    notice.className = 'blobby-web-frame-notice';
    notice.innerHTML = '<strong>Loading page…</strong><span>Some websites do not permit embedding. If a page refuses to display, use the ↗ button to open it directly.</span>';

    frame = document.createElement('iframe');
    frame.id = 'blobbyWebFrame';
    frame.className = 'blobby-web-frame';
    frame.name = 'blobby-web-frame';
    frame.referrerPolicy = 'strict-origin-when-cross-origin';
    frame.allow = 'clipboard-read; clipboard-write; fullscreen; autoplay; encrypted-media; picture-in-picture';
    frame.sandbox = 'allow-forms allow-modals allow-popups allow-popups-to-escape-sandbox allow-presentation allow-same-origin allow-scripts allow-downloads';
    frame.setAttribute('loading', 'eager');
    frame.addEventListener('load', () => {
      window.setTimeout(() => { if (notice) notice.hidden = true; }, 120);
    });

    const fallback = document.createElement('button');
    fallback.type = 'button';
    fallback.className = 'blobby-web-open-external';
    fallback.textContent = '↗ Open directly';
    fallback.title = 'Open this page in a normal browser tab';
    fallback.addEventListener('click', () => {
      if (currentUrl) window.open(currentUrl, '_blank', 'noopener,noreferrer');
    });

    viewport.append(frame, notice, fallback);
    document.body.append(viewport);
    updateBounds();
    resizeObserver = new ResizeObserver(updateBounds);
    ['browserTabs', 'addressbarBlock', 'bookmarksBar'].forEach(id => {
      const node = document.getElementById(id);
      if (node) resizeObserver.observe(node);
    });
    window.addEventListener('resize', updateBounds, { passive: true });
    window.addEventListener('blobby:ui-mode', syncVisibility);
    window.addEventListener('blobby:license-locked', syncVisibility);
    window.addEventListener('blobby:license-unlocked', syncVisibility);
    return viewport;
  }

  function updateBounds() {
    if (!viewport) return;
    let top = 0;
    for (const id of ['browserTabs', 'addressbarBlock', 'bookmarksBar']) {
      const node = document.getElementById(id);
      if (!node || node.hidden || getComputedStyle(node).display === 'none') continue;
      const r = node.getBoundingClientRect();
      if (r.bottom > top && r.top < innerHeight) top = Math.max(top, r.bottom);
    }
    viewport.style.setProperty('--web-viewport-top', `${Math.max(0, Math.ceil(top))}px`);
  }

  function syncVisibility() {
    ensureViewport();
    const unlocked = document.body.dataset.licenseState === 'unlocked';
    const browser = document.documentElement.dataset.baseUiMode === 'browser';
    const panelOpen = document.documentElement.dataset.panelOpen === 'true';
    viewport.hidden = !(unlocked && browser);
    viewport.classList.toggle('panel-behind', panelOpen);
    updateBounds();
  }

  function navigate(url) {
    ensureViewport();
    currentUrl = String(url || '').trim();
    if (!currentUrl) return;
    notice.hidden = false;
    notice.firstElementChild.textContent = 'Loading page…';
    frame.src = currentUrl;
    syncVisibility();
  }

  function home() {
    ensureViewport();
    viewport.hidden = true;
    currentUrl = '';
    frame.removeAttribute('src');
  }

  function refresh() {
    if (!frame || !currentUrl) return;
    notice.hidden = false;
    try { frame.src = currentUrl; } catch {}
  }

  window.addEventListener('blobby:demo-command', event => {
    const { command, payload } = event.detail || {};
    if (command === 'NAVIGATE' || command === 'BACK' || command === 'FORWARD') navigate(payload);
    else if (command === 'REFRESH') refresh();
    else if (command === 'HOME') home();
  });

  document.addEventListener('DOMContentLoaded', () => {
    ensureViewport();
    syncVisibility();
  }, { once: true });

  window.BlobbyWebRuntime = Object.freeze({ navigate, home, refresh, currentUrl: () => currentUrl });
})();
