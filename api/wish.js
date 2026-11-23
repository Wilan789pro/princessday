import { runHandler } from '../server/http.js';
import { createWishHandler } from '../server/wishHandler.js';
import { getStore } from '../server/wishStore.js';

// Persistent storage only (Upstash Redis) – no in-memory fallback in production.
const handle = createWishHandler({ env: process.env, store: getStore(process.env) });

export default function handler(req, res) {
  return runHandler(handle, req, res);
}
