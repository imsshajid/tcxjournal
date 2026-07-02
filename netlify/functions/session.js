const { verifyBoundSession } = require('./_lib/auth');

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

  try {
    const session = await verifyBoundSession(event);
    return {
      statusCode: 200,
      headers,
      body: JSON.stringify({
        ok: true,
        authenticated: !!session,
        session: session ? {
          sub: String(session.sub || ''),
          tier: String(session.tier || ''),
          accountId: String(session.accountId || ''),
          memberUsername: String(session.memberUsername || ''),
          accountMask: String(session.accountMask || ''),
          accessKind: String(session.accessKind || ''),
          adminAccess: !!session.adminAccess,
          googleSub: String(session.googleSub || ''),
          googleEmail: String(session.googleEmail || ''),
          googleName: String(session.googleName || ''),
          googlePicture: String(session.googlePicture || ''),
          googleEmailVerified: !!session.googleEmailVerified,
          exp: Number(session.exp || 0),
        } : null,
      }),
    };
  } catch (error) {
    return { statusCode: 500, headers, body: JSON.stringify({ ok: false, error: error.message || 'session failed' }) };
  }
};
