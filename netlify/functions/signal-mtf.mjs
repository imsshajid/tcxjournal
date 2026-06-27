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
const bridgeBase = () => String(process.env.SIGNAL_BRIDGE_BASE || process.env.SIGNAL_GROUPS_URL || '').trim().replace(/\/api\/a\/?$/i, '').replace(/\/+$/, '');
const mtfAuthorization = () => String(process.env.SIGNAL_MTF_AUTHORIZATION || '').trim();
const bridgeAuthorization = () => String(process.env.SIGNAL_BRIDGE_AUTHORIZATION || process.env.SIGNAL_GROUPS_AUTHORIZATION || '').trim();
const MTF_LADDER = ['M5', 'M15', 'M30', 'H1', 'H4', 'D1'];

function mtfTargets(base, broker, asset) {
  const roots = [
    { root: mtfBase(), authorization: mtfAuthorization() },
    { root: bridgeBase(), authorization: bridgeAuthorization() },
    { root: base, authorization: '' },
  ].filter(({ root }) => root);

  const seen = new Set();
  return roots.flatMap(({ root, authorization }) => {
    if (seen.has(root)) return [];
    seen.add(root);

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

    return [brokerDirect, quotexDirect, legacyTrend, netlifyFunction].map((url) => ({ url, authorization }));
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
  if (!base && !mtfBase() && !bridgeBase()) return json(500, { error: 'SIGNAL_API_BASE, SIGNAL_MTF_BASE, or SIGNAL_BRIDGE_BASE is not configured in Netlify.' });

  const broker = event.queryStringParameters?.broker || 'quotex';
  const asset = event.queryStringParameters?.asset || '';
  if (!asset) return json(400, { error: 'asset is required' });

  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), 18000);

  try {
    const bridgeMtf = await fetchBridgeMtfAnalysis({ broker, asset, signal: controller.signal });
    if (bridgeMtf) return json(200, bridgeMtf);

    let lastStatus = 502;
    let lastPreview = '';

    for (const target of mtfTargets(base, broker, asset)) {
      const response = await fetch(target.url, {
        headers: {
          accept: 'application/json',
          ...(target.authorization ? { authorization: target.authorization } : {}),
        },
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

      if (parsed && /unauthorized/i.test(String(parsed.error || parsed.message || ''))) {
        lastStatus = response.status;
        lastPreview = text.slice(0, 180);
        continue;
      }
    }

    return json(502, {
      error: 'MTF upstream did not return usable JSON and bridge analysis fallback could not build an MTF matrix.',
      status: lastStatus,
      preview: lastPreview,
    });
  } catch (error) {
    return json(502, { error: error.name === 'AbortError' ? 'MTF upstream timeout' : error.message || 'MTF upstream unavailable' });
  } finally {
    clearTimeout(timer);
  }
}

async function fetchBridgeMtfAnalysis({ broker, asset, signal }) {
  const root = bridgeBase();
  const authorization = bridgeAuthorization();
  if (!root || !authorization) return null;

  const startedJobs = await Promise.all(MTF_LADDER.map(async (tf) => {
    try {
      const startUrl = new URL(`/${broker}/analyze-custom`, root);
      const response = await fetch(startUrl, {
        method: 'POST',
        headers: {
          accept: 'application/json',
          'content-type': 'application/json',
          authorization,
        },
        body: JSON.stringify({ broker, timeframe: tf, assets: [asset] }),
        signal,
      });
      const parsed = safeJson(await response.text());
      if (!response.ok || !parsed?.job_id) return null;
      return { tf, jobId: parsed.job_id };
    } catch {
      return null;
    }
  }));

  const rows = await Promise.all(startedJobs.filter(Boolean).map((job) => pollBridgeAnalysis({ ...job, root, broker, authorization, signal })));
  const timeframes = rows.reduce((acc, row) => {
    if (row) acc[row.tf] = row.raw;
    return acc;
  }, {});

  return Object.keys(timeframes).length
    ? { timeframes, source: 'infinity-bridge-analyze-custom', degraded: true }
    : null;
}

async function pollBridgeAnalysis({ root, broker, tf, jobId, authorization, signal }) {
  const statusUrl = new URL(`/${broker}/analyze-status/${encodeURIComponent(jobId)}`, root);

  for (let attempt = 0; attempt < 12; attempt += 1) {
    if (attempt) await delay(700);
    try {
      const response = await fetch(statusUrl, {
        headers: { accept: 'application/json', authorization },
        signal,
      });
      const parsed = safeJson(await response.text());
      const result = Array.isArray(parsed?.results) ? parsed.results[0] : null;
      if (response.ok && result) {
        return {
          tf,
          raw: {
            source: 'infinity-bridge-analyze-custom',
            asset: result.asset,
            tendency: result.tendency,
            call_count: result.call_count,
            put_count: result.put_count,
            doji_count: result.doji_count,
          },
        };
      }
    } catch {
      return null;
    }
  }

  return null;
}

function delay(ms) {
  return new Promise((resolve) => setTimeout(resolve, ms));
}
