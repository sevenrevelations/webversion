'use strict';
(() => {
  // Browser-only configuration. Keep the App Inventor build in its existing repository.
  // Set gatewayBase only after deploying the optional allowlisted Blobby gateway.
  const sameOriginGateway = '';
  window.BLOBBY_WEB_CONFIG = Object.freeze({
    buildTarget: 'web',
    gatewayBase: sameOriginGateway,
    gatewayTimeoutMs: 10000,
    aboutBlankLauncher: true,
    serviceWorker: true
  });
})();
