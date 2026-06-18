const json = (statusCode, body) => ({
  statusCode,
  headers: {
    'Content-Type': 'application/json',
    'Cache-Control': 'no-store',
  },
  body: JSON.stringify(body),
});

export async function handler(event) {
  if (event.httpMethod !== 'GET') return json(405, { error: 'Method not allowed' });

  const apiKey = process.env.FIREBASE_WEB_API_KEY || process.env.VITE_FIREBASE_API_KEY;
  const authorization = event.headers.authorization || event.headers.Authorization || '';
  const token = authorization.startsWith('Bearer ') ? authorization.slice(7) : '';

  if (!apiKey) return json(503, { error: 'TCX Security is not configured' });
  if (!token) return json(401, { error: 'Missing identity token' });

  try {
    const response = await fetch(`https://identitytoolkit.googleapis.com/v1/accounts:lookup?key=${encodeURIComponent(apiKey)}`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ idToken: token }),
    });
    const payload = await response.json();
    const identity = payload.users?.[0];

    if (!response.ok || !identity?.localId) {
      return json(401, { error: 'Invalid or expired identity token' });
    }

    return json(200, {
      verified: true,
      tag: 'TCX_SECURITY_VERIFIED',
      product: 'TCX Journal',
      userId: identity.localId,
      emailVerified: Boolean(identity.emailVerified),
      provider: identity.providerUserInfo?.[0]?.providerId || 'google.com',
      verifiedAt: new Date().toISOString(),
    });
  } catch {
    return json(502, { error: 'Identity verification service unavailable' });
  }
}
