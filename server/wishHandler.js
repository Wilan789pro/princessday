/**
 * /api/wish – server side of "A Wish Upon a Star".
 *
 * PRIVACY: the wish text is never stored, never logged and never echoed back.
 * DELIVERY: only when RESEND_API_KEY, WISH_TO_EMAIL and WISH_FROM_EMAIL are all
 * set as SERVER environment variables. Otherwise the endpoint runs in
 * "dry-run" mode: it validates the wish and reports what would happen, but
 * sends nothing anywhere.
 *
 * Rate limiting below is in-memory and therefore BEST-EFFORT ONLY: on serverless
 * hosting each instance has its own memory and it resets on cold start. For
 * strong guarantees use the host's firewall rate limits or a shared store.
 */
import { isWealthWish, validateWish } from '../shared/wishRules.js';

export const MAX_BODY_BYTES = 2048;
const PER_IP_LIMIT = 5; // per hour
const PER_IP_WINDOW_MS = 60 * 60 * 1000;
const GLOBAL_DAILY_LIMIT = 40;
const MIN_COMPOSE_MS = 1200; // humans take longer than this to write a wish

const JSON_HEADERS = {
  'Content-Type': 'application/json; charset=utf-8',
  'Cache-Control': 'no-store',
  'X-Robots-Tag': 'noindex',
};

const reply = (status, body) => ({ status, headers: JSON_HEADERS, body: JSON.stringify(body) });

export function isDeliveryConfigured(env) {
  return Boolean(env.RESEND_API_KEY && env.WISH_TO_EMAIL && env.WISH_FROM_EMAIL);
}

/** Real delivery via Resend's HTTP API (no SDK needed). Only called when configured. */
export async function sendViaResend({ apiKey, to, from, text }) {
  const res = await fetch('https://api.resend.com/emails', {
    method: 'POST',
    headers: { Authorization: `Bearer ${apiKey}`, 'Content-Type': 'application/json' },
    // Plain text: the wish is delivered exactly as written, with no HTML interpretation.
    body: JSON.stringify({ from, to, subject: 'A wish from the Garden of Wishes', text }),
  });
  if (!res.ok) throw new Error(`delivery failed (${res.status})`);
}

/**
 * @param {{ env?: Record<string,string|undefined>, now?: () => number, send?: typeof sendViaResend }} [deps]
 */
export function createWishHandler({ env = process.env, now = Date.now, send = sendViaResend } = {}) {
  const perIp = new Map(); // ip -> timestamps
  let day = { key: '', count: 0 };

  const limited = (ip) => {
    const t = now();
    const recent = (perIp.get(ip) ?? []).filter((x) => t - x < PER_IP_WINDOW_MS);
    perIp.set(ip, recent);
    const dayKey = new Date(t).toISOString().slice(0, 10);
    if (day.key !== dayKey) day = { key: dayKey, count: 0 };
    if (recent.length >= PER_IP_LIMIT || day.count >= GLOBAL_DAILY_LIMIT) return true;
    recent.push(t);
    day.count += 1;
    return false;
  };

  /**
   * @param {{ method: string, headers: Record<string,string|undefined>, rawBody: string, ip: string }} req
   */
  return async function handleWish({ method, headers, rawBody, ip }) {
    const configured = isDeliveryConfigured(env);

    if (method === 'GET') {
      return reply(200, { delivery: configured ? 'email' : 'dry-run' });
    }
    if (method !== 'POST') return reply(405, { status: 'error', error: 'method-not-allowed' });

    const allowed = (env.WISH_ALLOWED_ORIGINS ?? '').split(',').map((s) => s.trim()).filter(Boolean);
    if (allowed.length && headers.origin && !allowed.includes(headers.origin)) {
      return reply(403, { status: 'error', error: 'origin' });
    }
    if (!(headers['content-type'] ?? '').includes('application/json')) {
      return reply(415, { status: 'error', error: 'content-type' });
    }
    if (Buffer.byteLength(rawBody ?? '', 'utf8') > MAX_BODY_BYTES) {
      return reply(413, { status: 'error', error: 'too-large' });
    }

    let body;
    try {
      body = JSON.parse(rawBody);
    } catch {
      return reply(400, { status: 'error', error: 'bad-json' });
    }
    if (!body || typeof body !== 'object') return reply(400, { status: 'error', error: 'bad-json' });

    // Honeypot field (invisible to humans) and a minimum compose time.
    if (body.website || typeof body.composeMs !== 'number' || body.composeMs < MIN_COMPOSE_MS) {
      return reply(400, { status: 'error', error: 'rejected' });
    }

    const v = validateWish(body.wish);
    if (!v.ok) return reply(400, { status: 'error', error: v.error });

    // The joke wish: never delivered, never stored, never logged.
    if (isWealthWish(v.value)) return reply(200, { status: 'rejected', reason: 'wealth' });

    if (limited(ip || 'unknown')) return reply(429, { status: 'error', error: 'rate-limited' });

    if (!configured) return reply(200, { status: 'accepted', delivery: 'dry-run' });

    try {
      await send({ apiKey: env.RESEND_API_KEY, to: env.WISH_TO_EMAIL, from: env.WISH_FROM_EMAIL, text: v.value });
      return reply(200, { status: 'accepted', delivery: 'email' });
    } catch {
      // Deliberately no details: nothing about the wish reaches the logs.
      console.error('[wish] delivery failed');
      return reply(502, { status: 'error', error: 'delivery-failed' });
    }
  };
}

/** Reads a Node request body with a hard size cap (used by the dev server and Vercel adapter). */
export function readRawBody(req, limit = MAX_BODY_BYTES) {
  return new Promise((resolve) => {
    if (typeof req.body === 'string') return resolve(req.body);
    if (req.body && typeof req.body === 'object' && !Buffer.isBuffer(req.body)) return resolve(JSON.stringify(req.body));
    if (Buffer.isBuffer(req.body)) return resolve(req.body.toString('utf8'));
    let size = 0;
    const chunks = [];
    req.on('data', (c) => {
      size += c.length;
      if (size > limit + 1) {
        // Keep just enough to report "too large" without buffering everything.
        return;
      }
      chunks.push(c);
    });
    req.on('end', () => resolve(Buffer.concat(chunks).toString('utf8')));
    req.on('error', () => resolve(''));
  });
}

export function clientIp(req) {
  const fwd = req.headers['x-forwarded-for'];
  const first = Array.isArray(fwd) ? fwd[0] : fwd?.split(',')[0];
  return (first || req.socket?.remoteAddress || 'unknown').trim();
}
