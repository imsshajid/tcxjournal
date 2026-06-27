const jsonHeaders = {
  'Content-Type': 'application/json',
  'Cache-Control': 'no-store',
};

const json = (statusCode, body) => ({
  statusCode,
  headers: jsonHeaders,
  body: JSON.stringify(body),
});

const apiBase = () => String(process.env.SIGNAL_API_BASE || process.env.API_BASE || '').trim().replace(/\/+$/, '');
const mtfBase = () => String(process.env.SIGNAL_MTF_BASE || '').trim().replace(/\/+$/, '');

function mtfTargets(base, broker, asset) {
  const roots = Array.from(new Set([mtfBase(), base].filter(Boolean)));
  return roots.flatMap((root) => {
    const brokerDirect = new URL(`/${broker}/mtf-analysis`, root);
    brokerDirect.searchParams.set('asset', asset);

    const quotexDirect = new URL('/quotex/mtf-analysis', root);
    quotexDirect.searchParams.set('asset', asset);

    const legacyTrend = new URL('/trendquotex/mtf-analysis', root);
    legacyTrend.searchParams.set('broker', broker);
    legacyTrend.searchParams.set('asset', asset);

    const netlifyFunction = new URL('/.netlify/functions/mtf-analysis', root);
    netlifyFunction.searchParams.set('broker', broker);
    netlifyFunction.searchParams.set('asset', asset);

    return [brokerDirect, quotexDirect, legacyTrend, netlifyFunction];
  });
}

function safeJson(text) {
  try {
    return JSON.parse(text);
  } catch {
    return null;
  }
}

export async function handler(event) {
  if (event.httpMethod !== 'GET') return json(405, { error: 'Method not allowed' });

  const base = apiBase();
  if (!base && !mtfBase()) return json(500, { error: 'SIGNAL_API_BASE or SIGNAL_MTF_BASE is not configured in Netlify.' });

  const broker = event.queryStringParameters?.broker || 'quotex';
  const asset = event.queryStringParameters?.asset || '';
  if (!asset) return json(400, { error: 'asset is required' });

  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), 8000);

  try {
    let lastStatus = 502;
    let lastPreview = '';

    for (const target of mtfTargets(base, broker, asset)) {
      const response = await fetch(target, {
        headers: { accept: 'application/json' },
        signal: controller.signal,
      });
      const text = await response.text();
      const parsed = safeJson(text);
      lastStatus = response.status;
      lastPreview = text.slice(0, 180);

      if (response.ok && parsed) {
        return {
          statusCode: response.status,
          headers: jsonHeaders,
          body: JSON.stringify(parsed),
        };
      }

      if (parsed && parsed.error === 'AUTH_REQUIRED') {
        return json(502, {
          error: 'SignalX MTF requires its own logged-in session. Use the backend API root in SIGNAL_API_BASE instead of the SignalX Netlify site URL.',
        });
      }
    }

    return json(502, {
      error: 'MTF upstream did not return JSON. Check SIGNAL_API_BASE; it must be the backend root that serves /quotex/mtf-analysis.',
      status: lastStatus,
      preview: lastPreview,
    });
  } catch (error) {
    return json(502, { error: error.name === 'AbortError' ? 'MTF upstream timeout' : error.message || 'MTF upstream unavailable' });
  } finally {
    clearTimeout(timer);
  }
}
