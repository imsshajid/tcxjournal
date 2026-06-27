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
const bridgeBase = () => String(process.env.SIGNAL_BRIDGE_BASE || process.env.SIGNAL_GROUPS_URL || '').trim().replace(/\/api\/a\/?$/i, '').replace(/\/+$/, '');
const bridgeAuth = () => String(process.env.SIGNAL_BRIDGE_AUTHORIZATION || process.env.SIGNAL_GROUPS_AUTHORIZATION || '').trim();

function brokerEndpoint(broker) {
  const value = String(broker || '').toLowerCase();
  if (value === 'iqoption') return 'iqoption';
  if (value === 'pocket' || value === 'pocketoption') return 'pocket';
  return 'quotex';
}

function payoutRequests(base, broker) {
  const bridge = bridgeBase();
  const auth = bridgeAuth();
  const endpoint = brokerEndpoint(broker);
  if (bridge && auth) {
    return [
      { url: `${bridge}/quotex/payout`, headers: { accept: 'application/json', authorization: auth } },
      { url: `${bridge}/${endpoint}/payout`, headers: { accept: 'application/json', authorization: auth } },
    ];
  }

  const unified = new URL('/quotex/payout', base);
  unified.searchParams.set('broker', broker);
  return [
    { url: unified.toString(), headers: { accept: 'application/json' } },
    { url: new URL('/quotex/payout', base).toString(), headers: { accept: 'application/json' } },
    { url: new URL(`/${endpoint}/payout`, base).toString(), headers: { accept: 'application/json' } },
  ];
}

export async function handler(event) {
  if (event.httpMethod !== 'GET') return json(405, { error: 'Method not allowed' });

  const base = apiBase();
  if (!base && !(bridgeBase() && bridgeAuth())) return json(500, { error: 'SIGNAL_API_BASE or SIGNAL_BRIDGE_BASE is not configured in Netlify.' });

  const broker = event.queryStringParameters?.broker || 'quotex';
  let lastStatus = 502;
  let lastBody = '';

  try {
    for (const request of payoutRequests(base || 'https://example.invalid', broker)) {
      const response = await fetch(request.url, { headers: request.headers });
      const body = await response.text();
      lastStatus = response.status;
      lastBody = body;
      if (response.ok) {
        return {
          statusCode: response.status,
          headers: jsonHeaders,
          body,
        };
      }
    }
  } catch (error) {
    return json(502, { error: error.message || 'Payout upstream unavailable' });
  }

  return {
    statusCode: [401, 403].includes(lastStatus) ? 502 : lastStatus,
    headers: jsonHeaders,
    body: [401, 403].includes(lastStatus)
      ? JSON.stringify({ error: 'Payout server rejected the bridge request.' })
      : lastBody || JSON.stringify({ error: 'Payout upstream unavailable' }),
  };
}
