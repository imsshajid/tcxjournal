const headers = {
  'content-type': 'application/json',
  'access-control-allow-origin': '*',
  'access-control-allow-methods': 'GET, OPTIONS',
  'access-control-allow-headers': 'content-type',
};

exports.handler = async (event) => {
  if (event.httpMethod === 'OPTIONS') {
    return { statusCode: 204, headers, body: '' };
  }

  if (event.httpMethod !== 'GET') {
    return { statusCode: 405, headers, body: JSON.stringify({ ok: false, error: 'method not allowed' }) };
  }

  return {
    statusCode: 200,
    headers,
    body: JSON.stringify({
      ok: true,
      authCenterUrl: String(
        process.env.AUTH_CENTER_URL
        || process.env.TCX_SECURITY_ORIGIN
        || process.env.VITE_TCX_SECURITY_ORIGIN
        || 'https://auth.tradingcandle.co'
      ).trim(),
    }),
  };
};
