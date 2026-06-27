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

export async function handler(event) {
  if (event.httpMethod !== 'GET') return json(405, { error: 'Method not allowed' });

  const base = apiBase();
  if (!base) return json(500, { error: 'SIGNAL_API_BASE is not configured in Netlify.' });

  const broker = event.queryStringParameters?.broker || 'quotex';
  const asset = event.queryStringParameters?.asset || '';
  if (!asset) return json(400, { error: 'asset is required' });

  const target = new URL('/trendquotex/mtf-analysis', base);
  target.searchParams.set('broker', broker);
  target.searchParams.set('asset', asset);

  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), 8000);

  try {
    const response = await fetch(target, {
      headers: { accept: 'application/json' },
      signal: controller.signal,
    });
    const text = await response.text();
    return {
      statusCode: response.status,
      headers: jsonHeaders,
      body: text,
    };
  } catch (error) {
    return json(502, { error: error.name === 'AbortError' ? 'MTF upstream timeout' : error.message || 'MTF upstream unavailable' });
  } finally {
    clearTimeout(timer);
  }
}
