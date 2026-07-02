const crypto = require('crypto');

const DEFAULT_SESSION_COOKIE_NAME = 'msa_session';
const DEFAULT_DEVICE_COOKIE_NAME = 'msa_device';

function getSessionCookieName() {
  return String(process.env.SESSION_COOKIE_NAME || DEFAULT_SESSION_COOKIE_NAME).trim() || DEFAULT_SESSION_COOKIE_NAME;
}

function getDeviceCookieName() {
  return String(process.env.DEVICE_COOKIE_NAME || DEFAULT_DEVICE_COOKIE_NAME).trim() || DEFAULT_DEVICE_COOKIE_NAME;
}

function getPreviousSecrets() {
  return String(process.env.JWT_SECRET_PREVIOUS || process.env.JWT_PREVIOUS_SECRETS || '')
    .split(/[,\n]+/)
    .map((value) => value.trim())
    .filter(Boolean);
}

function getJwtVersion() {
  return String(process.env.JWT_VERSION || '1').trim() || '1';
}

function getSessionCookieDomain() {
  return String(process.env.SESSION_COOKIE_DOMAIN || '').trim();
}

function getSessionCookieSameSite() {
  const sameSite = String(process.env.SESSION_COOKIE_SAMESITE || 'Lax').trim().toLowerCase();
  if (sameSite === 'none') return 'None';
  if (sameSite === 'strict') return 'Strict';
  return 'Lax';
}

function shouldUseSecureCookie() {
  const raw = String(process.env.SESSION_COOKIE_SECURE || 'true').trim().toLowerCase();
  return !(raw === '0' || raw === 'false' || raw === 'no');
}

function b64urlEncode(input) {
  return Buffer.from(input)
    .toString('base64')
    .replace(/=/g, '')
    .replace(/\+/g, '-')
    .replace(/\//g, '_');
}

function b64urlDecodeToString(input) {
  const b64 = String(input).replace(/-/g, '+').replace(/_/g, '/');
  const pad = b64.length % 4 ? '='.repeat(4 - (b64.length % 4)) : '';
  return Buffer.from(b64 + pad, 'base64').toString('utf8');
}

function timingSafeEqual(a, b) {
  const ba = Buffer.from(String(a));
  const bb = Buffer.from(String(b));
  return ba.length === bb.length && crypto.timingSafeEqual(ba, bb);
}

function readCookie(event, name) {
  const raw = event.headers?.cookie || '';
  const parts = raw.split(';').map((part) => part.trim());
  for (const part of parts) {
    const [key, ...rest] = part.split('=');
    if (key === name) return decodeURIComponent(rest.join('='));
  }
  return '';
}

function readSessionToken(event) {
  return readCookie(event, getSessionCookieName());
}

async function verifyToken(token) {
  if (!token) return null;
  const parts = String(token).split('.');
  if (parts.length !== 3) return null;

  const secret = process.env.JWT_SECRET;
  if (!secret) throw new Error('JWT_SECRET is not configured');

  const [header, payload, signature] = parts;
  const secrets = [secret, ...getPreviousSecrets()];
  const valid = secrets.some((candidate) => {
    const expected = b64urlEncode(crypto.createHmac('sha256', candidate).update(`${header}.${payload}`).digest());
    return timingSafeEqual(expected, signature);
  });
  if (!valid) return null;

  try {
    const data = JSON.parse(b64urlDecodeToString(payload));
    const now = Math.floor(Date.now() / 1000);
    if (data?.exp && Number(data.exp) < now) return null;
    if (String(data?.ver || '') !== getJwtVersion()) return null;
    return data;
  } catch {
    return null;
  }
}

async function verifySession(event) {
  return verifyToken(readSessionToken(event));
}

function readDeviceSecret(event) {
  return readCookie(event, getDeviceCookieName());
}

function hashDeviceSecret(secret) {
  return crypto.createHash('sha256').update(String(secret || '')).digest('hex');
}

async function verifyBoundSession(event) {
  const session = await verifySession(event);
  if (!session) return null;

  const expectedDeviceHash = String(session.deviceCookieHash || '').trim();
  if (!expectedDeviceHash) return null;

  const deviceSecret = readDeviceSecret(event);
  if (!deviceSecret) return null;

  return timingSafeEqual(hashDeviceSecret(deviceSecret), expectedDeviceHash) ? session : null;
}

function buildClearedCookie(name) {
  const parts = [`${name}=`];
  parts.push('Path=/');
  const domain = getSessionCookieDomain();
  if (domain) parts.push(`Domain=${domain}`);
  parts.push('HttpOnly');
  if (shouldUseSecureCookie()) parts.push('Secure');
  parts.push(`SameSite=${getSessionCookieSameSite()}`);
  parts.push('Max-Age=0');
  parts.push('Expires=Thu, 01 Jan 1970 00:00:00 GMT');
  return parts.join('; ');
}

function buildClearedSessionCookie() {
  return buildClearedCookie(getSessionCookieName());
}

function buildClearedDeviceCookie() {
  return buildClearedCookie(getDeviceCookieName());
}

module.exports = {
  buildClearedDeviceCookie,
  buildClearedSessionCookie,
  verifyBoundSession,
};
