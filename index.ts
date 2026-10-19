const MUSIC_API_ORIGIN = (Deno.env.get('MUSIC_API_ORIGIN') || 'https://blobby-music-api.onrender.com').replace(/\/$/, '');
const allowedOrigins = new Set(
  (Deno.env.get('ALLOWED_ORIGINS') || '')
    .split(',')
    .map(v => v.trim())
    .filter(Boolean)
);

const rateBuckets = new Map<string, { count: number; resetAt: number }>();
function rateLimited(req: Request) {
  const now = Date.now();
  const key = (req.headers.get('x-forwarded-for') || req.headers.get('cf-connecting-ip') || 'unknown').split(',')[0].trim();
  const bucket = rateBuckets.get(key);
  if (!bucket || bucket.resetAt <= now) { rateBuckets.set(key, { count: 1, resetAt: now + 60_000 }); return false; }
  bucket.count += 1;
  return bucket.count > 120;
}

function cors(origin: string | null) {
  const allow = !origin || allowedOrigins.size === 0 || allowedOrigins.has(origin) ? (origin || '*') : 'null';
  return {
    'access-control-allow-origin': allow,
    'access-control-allow-methods': 'POST,OPTIONS',
    'access-control-allow-headers': 'content-type,authorization,apikey,x-client-info',
    'vary': 'Origin',
  };
}

function json(origin: string | null, status: number, body: unknown) {
  return new Response(JSON.stringify(body), {
    status,
    headers: { ...cors(origin), 'content-type': 'application/json; charset=utf-8', 'cache-control': 'no-store' },
  });
}

function cleanText(value: unknown, max: number) {
  return String(value ?? '').trim().slice(0, max);
}

function validSoundCloudUrl(value: unknown) {
  try {
    const u = new URL(String(value || ''));
    if (u.protocol !== 'https:') return null;
    const host = u.hostname.toLowerCase();
    const ok = host === 'soundcloud.com' || host === 'www.soundcloud.com' || host === 'on.soundcloud.com' || host.endsWith('.soundcloud.com');
    return ok ? u.toString() : null;
  } catch {
    return null;
  }
}

Deno.serve(async req => {
  const origin = req.headers.get('origin');
  if (req.method === 'OPTIONS') return new Response(null, { status: 204, headers: cors(origin) });
  if (req.method !== 'POST') return json(origin, 405, { ok: false, error: 'Method not allowed.' });
  if (origin && allowedOrigins.size === 0) return json(origin, 503, { ok: false, error: 'Gateway origin allowlist is not configured.' });
  if (origin && !allowedOrigins.has(origin)) return json(origin, 403, { ok: false, error: 'Origin not allowed.' });
  if (rateLimited(req)) return json(origin, 429, { ok: false, error: 'Too many requests.' });

  let input: any;
  try { input = await req.json(); } catch { return json(origin, 400, { ok: false, error: 'Invalid JSON.' }); }
  const action = cleanText(input?.action, 40);
  const payload = input?.payload && typeof input.payload === 'object' ? input.payload : {};

  try {
    if (action === 'health') {
      return json(origin, 200, { ok: true, data: { status: 'ok', service: 'blobby-gateway' } });
    }

    if (action === 'music.search') {
      const q = cleanText(payload.q, 120);
      const provider = cleanText(payload.provider, 32);
      const limit = Math.max(1, Math.min(12, Number(payload.limit) || 12));
      if (!q) return json(origin, 400, { ok: false, error: 'Search query required.' });
      if (!['youtube_music', 'soundcloud'].includes(provider)) return json(origin, 400, { ok: false, error: 'Unsupported provider.' });
      const upstream = new URL(`${MUSIC_API_ORIGIN}/search`);
      upstream.searchParams.set('q', q);
      upstream.searchParams.set('provider', provider);
      upstream.searchParams.set('limit', String(limit));
      const res = await fetch(upstream, { headers: { accept: 'application/json' } });
      const data = await res.json().catch(() => ({}));
      if (!res.ok) return json(origin, 502, { ok: false, error: data?.detail || 'Music search provider failed.' });
      return json(origin, 200, { ok: true, data });
    }

    if (action === 'music.resolve') {
      const url = validSoundCloudUrl(payload.url);
      if (!url) return json(origin, 400, { ok: false, error: 'Unsupported music URL.' });
      const upstream = new URL(`${MUSIC_API_ORIGIN}/resolve`);
      upstream.searchParams.set('url', url);
      const res = await fetch(upstream, { headers: { accept: 'application/json' } });
      const data = await res.json().catch(() => ({}));
      if (!res.ok) return json(origin, 502, { ok: false, error: data?.detail || 'Music resolver failed.' });
      return json(origin, 200, { ok: true, data });
    }

    return json(origin, 400, { ok: false, error: 'Unsupported gateway action.' });
  } catch (err) {
    console.error('blobby-gateway error', err);
    return json(origin, 502, { ok: false, error: 'Gateway temporarily unavailable.' });
  }
});
