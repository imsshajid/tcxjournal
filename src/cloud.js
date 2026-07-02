const DEFAULT_AUTH_CENTER_URL = 'https://auth.tradingcandle.co';

let authCenterUrl = String(
  import.meta.env.VITE_TCX_SECURITY_ORIGIN
  || import.meta.env.VITE_TCX_AUTH_CENTER_URL
  || import.meta.env.VITE_TCX_SECURITY_URL
  || DEFAULT_AUTH_CENTER_URL
).trim().replace(/\/+$/, '');

export const cloudConfigured = true;

function normalizeAuthCenterUrl(value) {
  return String(value || DEFAULT_AUTH_CENTER_URL).trim().replace(/\/+$/, '') || DEFAULT_AUTH_CENTER_URL;
}

export async function loadPublicConfig() {
  try {
    const response = await fetch('/.netlify/functions/public-config', {
      method: 'GET',
      cache: 'no-store',
    });
    const data = await response.json().catch(() => ({}));
    if (response.ok && data?.authCenterUrl) {
      authCenterUrl = normalizeAuthCenterUrl(data.authCenterUrl);
    }
    return data || {};
  } catch {
    return {};
  }
}

export function getTcxSecurityPortalUrl(returnTo = window.location.href) {
  const url = new URL(authCenterUrl || DEFAULT_AUTH_CENTER_URL);
  url.searchParams.set('app', 'journal');
  url.searchParams.set('returnTo', returnTo);
  return url.href;
}

export function redirectToTcxSecurity(returnTo = window.location.href) {
  window.location.href = getTcxSecurityPortalUrl(returnTo);
}

export async function getTcxSecuritySession() {
  const response = await fetch('/.netlify/functions/session', {
    method: 'GET',
    credentials: 'include',
    cache: 'no-store',
  });
  const data = await response.json().catch(() => ({}));
  if (!response.ok || !data?.authenticated || !data?.session) return null;
  return data.session;
}

export async function logoutTcxSecurity() {
  await fetch('/.netlify/functions/logout', {
    method: 'POST',
    credentials: 'include',
    cache: 'no-store',
  }).catch(() => {});
}
