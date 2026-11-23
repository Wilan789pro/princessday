/**
 * Small HTTP helpers shared by /api/wish, /api/vault and /api/experience.
 *
 * CROSS-ORIGIN: the site on GitHub Pages calls these endpoints on another host.
 * Only origins listed in WISH_ALLOWED_ORIGINS (comma-separated, e.g.
 * https://wilan789pro.github.io) receive CORS headers; any other Origin is
 * refused with 403. Without the list, browsers can only call same-origin.
 * (CORS limits browsers, not other clients – it is not authentication.)
 */
import { createHash } from 'node:crypto';

export const MAX_BODY_BYTES = 2048;

const JSON_HEADERS = {
  'Content-Type': 'application/json; charset=utf-8',
  'Cache-Control': 'no-store',
  'X-Robots-Tag': 'noindex',
};

export const reply = (status, body, extra = {}) => ({ status, headers: { ...JSON_HEADERS, ...extra }, body: JSON.stringify(body) });

export function allowedOrigins(env) {
  return (env.WISH_ALLOWED_ORIGINS ?? '')
    .split(',')
    .map((o) => o.trim().replace(/\/+$/, ''))
    .filter(Boolean);
}

export function corsHeaders(origin, { methods = 'GET, POST, OPTIONS', headers = 'Content-Type' } = {}) {
  return {
    'Access-Control-Allow-Origin': origin,
    'Access-Control-Allow-Methods': methods,
    'Access-Control-Allow-Headers': headers,
    'Access-Control-Max-Age': '600',
    Vary: 'Origin',
  };
}

/**
 * Applies the origin policy. Returns either a finished 403 response, or the
 * CORS headers to attach (empty for same-origin / non-browser requests).
 */
export function originGate(env, headers, corsOptions) {
  const origin = headers.origin;
  const allowed = allowedOrigins(env);
  if (origin && allowed.length && !allowed.includes(origin)) {
    return { refused: reply(403, { status: 'error', error: 'origin' }) };
  }
  return { cors: origin && allowed.includes(origin) ? corsHeaders(origin, corsOptions) : {} };
}

export const preflight = (cors) => ({ status: 204, headers: { 'Cache-Control': 'no-store', ...cors }, body: '' });

/** Parses a JSON POST body with size and content-type checks. Returns { body } or { error, status }. */
export function parseJson(headers, rawBody) {
  if (!(headers['content-type'] ?? '').includes('application/json')) return { status: 415, error: 'content-type' };
  const declared = Number(headers['content-length']);
  if (rawBody === null || (Number.isFinite(declared) && declared > MAX_BODY_BYTES) || Buffer.byteLength(rawBody ?? '', 'utf8') > MAX_BODY_BYTES) {
    return { status: 413, error: 'too-large' };
  }
  try {
    const body = JSON.parse(rawBody);
    if (!body || typeof body !== 'object' || Array.isArray(body)) return { status: 400, error: 'bad-json' };
    return { body };
  } catch {
    return { status: 400, error: 'bad-json' };
  }
}

/**
 * Reads a Node request body with a hard size cap (used by the dev server and
 * Vercel adapters). Resolves to null when the body is larger than the limit,
 * without buffering the excess.
 */
export function readRawBody(req, limit = MAX_BODY_BYTES) {
  return new Promise((resolve) => {
    const capped = (str) => (Buffer.byteLength(str, 'utf8') > limit ? null : str);
    if (typeof req.body === 'string') return resolve(capped(req.body));
    if (req.body && typeof req.body === 'object' && !Buffer.isBuffer(req.body)) return resolve(capped(JSON.stringify(req.body)));
    if (Buffer.isBuffer(req.body)) return resolve(capped(req.body.toString('utf8')));
    let size = 0;
    let over = false;
    const chunks = [];
    req.on('data', (c) => {
      size += c.length;
      if (size > limit) over = true;
      if (!over) chunks.push(c);
    });
    req.on('end', () => resolve(over ? null : Buffer.concat(chunks).toString('utf8')));
    req.on('error', () => resolve(''));
  });
}

export function clientIp(req) {
  const fwd = req.headers['x-forwarded-for'];
  const first = Array.isArray(fwd) ? fwd[0] : fwd?.split(',')[0];
  return (first || req.socket?.remoteAddress || 'unknown').trim();
}

/** Rate-limit keys use a short hash of the IP, so raw addresses are never stored. */
export const ipKey = (ip) => createHash('sha256').update(`prism:${ip || 'unknown'}`).digest('hex').slice(0, 16);

/** Generic adapter: Node req/res ↔ handler({ method, headers, rawBody, ip }). */
export async function runHandler(handle, req, res) {
  const r = await handle({
    method: req.method ?? 'GET',
    headers: req.headers,
    rawBody: req.method === 'POST' ? await readRawBody(req) : '',
    ip: clientIp(req),
  });
  res.statusCode = r.status;
  for (const [k, v] of Object.entries(r.headers)) res.setHeader(k, v);
  res.end(r.body);
}
