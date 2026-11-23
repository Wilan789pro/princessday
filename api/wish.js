import { clientIp, createWishHandler, readRawBody } from '../server/wishHandler.js';
import { send } from './_send.js';

// Created once per serverless instance (so the best-effort rate limiter lives
// for the life of the instance). Reads server-only env vars; dry-run without them.
const handle = createWishHandler({ env: process.env });

export default async function handler(req, res) {
  send(
    res,
    await handle({
      method: req.method,
      headers: req.headers,
      rawBody: req.method === 'POST' ? await readRawBody(req) : '',
      ip: clientIp(req),
    }),
  );
}
