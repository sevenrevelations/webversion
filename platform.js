'use strict';
(() => {
  const target = 'web';
  const lowEnd = ((navigator.hardwareConcurrency || 8) <= 4) || ((navigator.deviceMemory || 8) <= 4);
  const standalone = window.matchMedia?.('(display-mode: standalone)')?.matches || navigator.standalone === true;
  const platform = Object.freeze({
    target,
    isWeb: true,
    isAppInventor: false,
    lowEnd,
    standalone,
    version: 'stage15-web-20261018'
  });
  window.BlobbyPlatform = platform;
  document.documentElement.dataset.buildTarget = target;
  document.documentElement.dataset.webStandalone = String(standalone);
})();
