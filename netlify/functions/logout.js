const { buildClearedDeviceCookie, buildClearedSessionCookie } = require('./_lib/auth');

const headers = {
  'content-type': 'application/json',
  'access-control-allow-origin': '*',
  'access-control-allow-methods': 'POST, OPTIONS',
  'access-control-allow-headers': 'content-type',
};

exports.handler = async (event) => {
  if (event.httpMethod === 'OPTIONS') {
    return { statusCode: 204, headers, body: '' };
  }

  if (event.httpMethod !== 'POST') {
    return { statusCode: 405, headers, body: JSON.stringify({ ok: false, error: 'method not allowed' }) };
  }

  return {
    statusCode: 200,
    headers,
    multiValueHeaders: {
      'Set-Cookie': [
        buildClearedSessionCookie(),
        buildClearedDeviceCookie(),
      ],
    },
    body: JSON.stringify({ ok: true }),
  };
};
