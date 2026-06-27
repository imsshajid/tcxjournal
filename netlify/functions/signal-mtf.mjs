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

function isEnabled(value) {
  return ['1', 'true', 'yes', 'on'].includes(String(value || '').trim().toLowerCase());
}

function getTimeframes(payload) {
  return payload?.timeframes || payload?.data?.timeframes || null;
}

export async function handler(event) {
  if (event.httpMethod !== 'GET') return json(405, { error: 'Method not allowed' });

  const base = apiBase();
  if (!base && !mtfBase() && !bridgeBase()) return json(500, { error: 'SIGNAL_API_BASE, SIGNAL_MTF_BASE, or SIGNAL_BRIDGE_BASE is not configured in Netlify.' });

  const broker = event.queryStringParameters?.broker || 'quotex';
  const asset = event.queryStringParameters?.asset || '';
  const timeframe = String(event.queryStringParameters?.timeframe || 'M1').toUpperCase();
  const advanced = isEnabled(event.queryStringParameters?.advanced);
  if (!asset) return json(400, { error: 'asset is required' });

  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), advanced ? 30000 : 12000);

  try {
    if (advanced) {
      const directMtf = await fetchDirectMtfAnalysis({ base, broker, asset, signal: controller.signal });
      const bridgeMtf = await fetchBridgeMtfAnalysis({
        broker,
        asset,
        timeframes: [...new Set([timeframe, ...MTF_LADDER])],
        signal: controller.signal,
      });
      if (directMtf || bridgeMtf) return json(200, mergeMtfPayloads({ directMtf, bridgeMtf }));
    }

    const bridgeMtf = await fetchBridgeMtfAnalysis({ broker, asset, timeframes: [timeframe], signal: controller.signal });
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

async function fetchDirectMtfAnalysis({ base, broker, asset, signal }) {
  for (const target of mtfTargets(base, broker, asset)) {
    try {
      const response = await fetch(target.url, {
        headers: {
          accept: 'application/json',
          ...(target.authorization ? { authorization: target.authorization } : {}),
        },
        signal,
      });
      const text = await response.text();
      const parsed = safeJson(text);
      if (response.ok && parsed && getTimeframes(parsed)) {
        return {
          ...parsed,
          timeframes: getTimeframes(parsed),
          source: parsed.source || 'direct-mtf-analysis',
        };
      }
    } catch (error) {
      if (error.name === 'AbortError') throw error;
    }
  }

  return null;
}

function mergeMtfPayloads({ directMtf, bridgeMtf }) {
  const directFrames = getTimeframes(directMtf);
  const bridgeFrames = getTimeframes(bridgeMtf);

  if (!directFrames && bridgeFrames) return bridgeMtf;
  if (!directFrames) return {
    timeframes: {},
    source: 'mtf-unavailable',
    degraded: true,
  };

  const mergedFrames = Object.fromEntries(Object.entries(directFrames).map(([tf, row]) => [
    tf,
    {
      ...row,
      bridge_confirmation: bridgeFrames?.[tf] || null,
    },
  ]));

  return {
    ...directMtf,
    timeframes: mergedFrames,
    bridge_timeframes: bridgeFrames || {},
    source: bridgeFrames ? 'direct-mtf-analysis+infinity-bridge-analyze-custom' : directMtf.source,
    degraded: !bridgeFrames,
  };
}

async function fetchBridgeMtfAnalysis({ broker, asset, timeframes, signal }) {
  const root = bridgeBase();
  const authorization = bridgeAuthorization();
  if (!root || !authorization) return null;

  const selectedTimeframes = Array.isArray(timeframes) && timeframes.length ? timeframes : MTF_LADDER;
  const startedJobs = await Promise.all(selectedTimeframes.map(async (tf) => {
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
  const timeframeRows = rows.reduce((acc, row) => {
    if (row) acc[row.tf] = row.raw;
    return acc;
  }, {});

  return Object.keys(timeframeRows).length
    ? { timeframes: timeframeRows, timeframe_order: selectedTimeframes, source: 'infinity-bridge-analyze-custom', degraded: true }
    : null;
}

async function pollBridgeAnalysis({ root, broker, tf, jobId, authorization, signal }) {
  const statusUrl = new URL(`/${broker}/analyze-status/${encodeURIComponent(jobId)}`, root);

  for (let attempt = 0; attempt < 18; attempt += 1) {
    if (attempt) await delay(800);
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
