/**
 * Static hosting (GitHub Pages) has no server: the /api/* endpoints do not exist.
 * The `pages` build mode (npm run build:pages) sets this so the app makes no
 * same-origin API calls and says honestly what is unavailable. Nothing
 * server-side moves into the browser.
 */
export function isStaticHosting(env: { MODE?: string; VITE_STATIC_HOSTING?: string }): boolean {
  return env.MODE === 'pages' || env.VITE_STATIC_HOSTING === 'true';
}

export const STATIC_HOSTING = isStaticHosting(import.meta.env);

/**
 * Optional PUBLIC address of a separately hosted backend (e.g. a Vercel
 * deployment of this repo's api/ functions): VITE_API_BASE_URL.
 * It is configuration, not a secret – never put credentials in VITE_ variables.
 * Only http(s) URLs are accepted; anything else counts as "not configured".
 */
export function normaliseApiBase(raw: string | undefined | null): string {
  const v = (raw ?? '').trim().replace(/\/+$/, '');
  return /^https?:\/\/[^\s/]+/i.test(v) ? v : '';
}

export const API_BASE_URL = normaliseApiBase(import.meta.env.VITE_API_BASE_URL);

/**
 * Where wishes go:
 * - a configured backend (VITE_API_BASE_URL) → `${base}/api/wish`
 * - otherwise a same-origin server (dev, preview, Vercel) → `/api/wish`
 * - otherwise (static hosting, no backend) → null: not connected, nothing is sent
 */
export function wishEndpoint(o: { apiBase: string; staticHosting: boolean }): string | null {
  if (o.apiBase) return `${o.apiBase}/api/wish`;
  return o.staticHosting ? null : '/api/wish';
}
