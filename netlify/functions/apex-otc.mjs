const jsonHeaders = {
  'Content-Type': 'application/json',
  'Cache-Control': 'no-store',
};

const json = (statusCode, body) => ({
  statusCode,
  headers: jsonHeaders,
  body: JSON.stringify(body),
});

const apexBase = () => String(process.env.APEX_OTC_BASE || process.env.APEX_WORKER_BASE || '').trim().replace(/\/+$/, '');

export async function handler(event) {
  if (event.httpMethod !== 'GET') return json(405, { error: 'Method not allowed' });

  const base = apexBase();
  if (!base) return json(500, { error: 'APEX_OTC_BASE is not configured in Netlify.' });

  const params = event.queryStringParameters || {};
  const target = new URL('/otc', base);
  for (const [key, value] of Object.entries(params)) {
    if (value !== undefined && value !== null && value !== '') target.searchParams.set(key, value);
  }

  try {
    const response = await fetch(target, { headers: { accept: 'application/json' } });
    const text = await response.text();
    return {
      statusCode: response.status,
      headers: jsonHeaders,
      body: text,
    };
  } catch (error) {
    return json(502, { error: error.message || 'Apex worker unavailable' });
  }
}
