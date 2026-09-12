import { createHmac, randomBytes, timingSafeEqual } from 'crypto';

/** How long a minted QR token remains valid (client refreshes ~every 15s). */
export const QR_TOKEN_TTL_MS = 20_000;
export const QR_REFRESH_MS = 15_000;

/** Short attendance codes rotate on this cadence when regenerated. */
export const SHORT_CODE_TTL_MS = 5 * 60_000;

export type QrSource = 'dynamic_qr' | 'desktop_qr';

function signingSecret() {
  const secret = process.env.JWT_SECRET || process.env.SUPABASE_JWT_SECRET;
  if (!secret) {
    if (process.env.NODE_ENV === 'production') {
      throw new Error('JWT_SECRET is required to mint QR tokens');
    }
    return 'fallback-secret-for-development-only';
  }
  return secret;
}

function sign(body: string) {
  return createHmac('sha256', signingSecret()).update(body).digest('base64url');
}

/**
 * Opaque attendance QR token — does not embed student PII.
 * Format: v1.<sessionId>.<expMs>.<source>.<nonce>.<sig>
 */
export function mintQrToken(sessionId: string, source: QrSource = 'dynamic_qr') {
  const exp = Date.now() + QR_TOKEN_TTL_MS;
  const nonce = randomBytes(8).toString('hex');
  const body = `v1.${sessionId}.${exp}.${source}.${nonce}`;
  const token = `${body}.${sign(body)}`;
  return { token, expiresAt: new Date(exp), refreshMs: QR_REFRESH_MS };
}

export function verifyQrToken(token: string): {
  sessionId: string;
  source: QrSource;
  expiresAt: number;
} {
  const parts = String(token || '').trim().split('.');
  if (parts.length !== 6 || parts[0] !== 'v1') {
    throw new Error('Invalid QR token format.');
  }

  const [, sessionId, expRaw, source, nonce, sig] = parts;
  if (!sessionId || !expRaw || !sig || !nonce) {
    throw new Error('Invalid QR token format.');
  }
  if (source !== 'dynamic_qr' && source !== 'desktop_qr') {
    throw new Error('Invalid QR token source.');
  }

  const body = `v1.${sessionId}.${expRaw}.${source}.${nonce}`;
  const expected = sign(body);
  const a = Buffer.from(sig);
  const b = Buffer.from(expected);
  if (a.length !== b.length || !timingSafeEqual(a, b)) {
    throw new Error('Invalid or tampered QR token.');
  }

  const exp = Number(expRaw);
  if (!Number.isFinite(exp)) {
    throw new Error('Invalid QR token expiry.');
  }
  // Small clock skew allowance
  if (Date.now() > exp + 2000) {
    throw new Error('This QR code has expired. Scan the current code on screen.');
  }
  if (exp - Date.now() > QR_TOKEN_TTL_MS + 30_000) {
    throw new Error('Invalid QR token expiry.');
  }

  return { sessionId, source, expiresAt: exp };
}

/** Compact QR payload — token only (plus version marker for scanners). */
export function encodeQrPayload(token: string) {
  return JSON.stringify({ v: 1, tok: token });
}

export function extractQrTokenFromScan(raw: string): string | null {
  const text = String(raw || '').trim();
  if (!text) return null;

  if (text.startsWith('v1.') && text.split('.').length === 6) {
    return text;
  }

  try {
    const parsed = JSON.parse(text);
    if (typeof parsed?.tok === 'string') return parsed.tok;
    if (typeof parsed?.token === 'string') return parsed.token;
    if (typeof parsed?.qrToken === 'string') return parsed.qrToken;
  } catch {
    // not JSON
  }

  return null;
}

/** Legacy client QR: { sessionId, t/timestamp, source } */
export function parseLegacyQrPayload(raw: string): {
  sessionId: string;
  qrTimestamp: number;
  source: QrSource;
} | null {
  try {
    const parsed = JSON.parse(raw);
    if (!parsed?.sessionId) return null;
    const qrTimestamp = Number(parsed.t ?? parsed.timestamp);
    if (!Number.isFinite(qrTimestamp)) return null;
    const source: QrSource =
      parsed.source === 'desktop_qr' || parsed.method === 'desktop_qr'
        ? 'desktop_qr'
        : 'dynamic_qr';
    return { sessionId: String(parsed.sessionId), qrTimestamp, source };
  } catch {
    return null;
  }
}

export function generateShortAttendanceCode() {
  return Math.floor(100000 + Math.random() * 900000).toString();
}

export function shortCodeExpiry(from = new Date(), sessionEndsAt?: Date | null) {
  const byTtl = new Date(from.getTime() + SHORT_CODE_TTL_MS);
  if (sessionEndsAt && sessionEndsAt.getTime() < byTtl.getTime()) {
    return sessionEndsAt;
  }
  return byTtl;
}

export function isShortCodeValid(session: {
  attendance_code?: string | null;
  code_expires_at?: Date | null;
  status: string;
}, code: string) {
  if (session.status !== 'active') return false;
  if (!session.attendance_code || session.attendance_code !== String(code).trim()) return false;
  if (session.code_expires_at && new Date(session.code_expires_at) < new Date()) return false;
  return true;
}
