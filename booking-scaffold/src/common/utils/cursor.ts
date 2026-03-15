import { createHmac } from 'crypto';

/** Payload для курсора пагинации (composite key для стабильной сортировки) */
export interface CursorPayload {
  createdAt: string; // ISO string
  id: string;
}

const SEP = '.';

/**
 * Кодирует payload в подписанный курсор: base64url(JSON).base64url(HMAC-SHA256).
 * Секрет из env CURSOR_SECRET.
 */
export function encodeCursor(payload: CursorPayload, secret: string): string {
  const raw = JSON.stringify(payload);
  const payloadB64 = base64url(Buffer.from(raw, 'utf8'));
  const sig = createHmac('sha256', secret).update(raw).digest();
  const sigB64 = base64url(sig);
  return `${payloadB64}${SEP}${sigB64}`;
}

/**
 * Декодирует и проверяет подпись курсора. При неверной подписи бросает BadRequestException.
 */
export function decodeCursor(cursor: string, secret: string): CursorPayload {
  const idx = cursor.lastIndexOf(SEP);
  if (idx === -1) {
    throw new Error('Invalid cursor format');
  }
  const payloadB64 = cursor.slice(0, idx);
  const sigB64 = cursor.slice(idx + 1);
  const raw = Buffer.from(base64urlDecode(payloadB64), 'base64').toString('utf8');
  const expectedSig = createHmac('sha256', secret).update(raw).digest();
  const expectedSigB64 = base64url(expectedSig);
  if (expectedSigB64 !== sigB64) {
    throw new Error('Invalid cursor signature');
  }
  return JSON.parse(raw) as CursorPayload;
}

function base64url(buf: Buffer): string {
  return buf.toString('base64').replace(/\+/g, '-').replace(/\//g, '_').replace(/=+$/, '');
}

function base64urlDecode(str: string): string {
  let b64 = str.replace(/-/g, '+').replace(/_/g, '/');
  const pad = b64.length % 4;
  if (pad) b64 += '='.repeat(4 - pad);
  return b64;
}
