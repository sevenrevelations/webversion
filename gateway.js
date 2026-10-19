'use strict';
(() => {
  const cfg = window.BLOBBY_WEB_CONFIG || {};
  const ALLOWED = new Set(['health', 'music.search', 'music.resolve']);
  function base() { return String(cfg.gatewayBase || '').replace(/\/$/, ''); }
  function configured() { return /^https?:\/\//i.test(base()) || base().startsWith('/'); }
  async function request(action, payload = {}, options = {}) {
    if (!ALLOWED.has(action)) throw new Error('Unsupported Blobby gateway action.');
    if (!configured()) throw new Error('Blobby gateway is not configured.');
    const controller = new AbortController();
    const externalSignal = options.signal;
    let aborted = false;
    const abort = () => { aborted = true; controller.abort(); };
    externalSignal?.addEventListener?.('abort', abort, { once: true });
    const timeout = setTimeout(() => controller.abort(), Number(cfg.gatewayTimeoutMs) || 10000);
    try {
      const res = await fetch(`${base()}/blobby-gateway`, {
        method: 'POST',
        headers: { 'content-type': 'application/json' },
        body: JSON.stringify({ action, payload }),
        signal: controller.signal,
        credentials: 'omit',
        cache: 'no-store'
      });
      const data = await res.json().catch(() => ({}));
      if (!res.ok || data?.ok === false) throw new Error(data?.error || `Gateway request failed (${res.status}).`);
      return data?.data ?? data;
    } catch (err) {
      if (aborted || externalSignal?.aborted) {
        const e = new DOMException('Aborted', 'AbortError');
        throw e;
      }
      throw err;
    } finally {
      clearTimeout(timeout);
      externalSignal?.removeEventListener?.('abort', abort);
    }
  }
  window.BlobbyGateway = Object.freeze({ configured, request, allowedActions: () => [...ALLOWED] });
})();
