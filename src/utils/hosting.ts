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
 * Where an API path is served:
 * - a configured backend (VITE_API_BASE_URL) → `${base}${path}`
 * - otherwise a same-origin server (dev, preview, Vercel) → `${path}`
 * - otherwise (static hosting, no backend) → null: not connected
 */
export function apiEndpoint(path: string, o: { apiBase: string; staticHosting: boolean }): string | null {
  if (o.apiBase) return `${o.apiBase}${path}`;
  return o.staticHosting ? null : path;
}

/** Where wishes go (null = not connected, nothing is sent). */
export function wishEndpoint(o: { apiBase: string; staticHosting: boolean }): string | null {
  return apiEndpoint('/api/wish', o);
}

const here = { apiBase: API_BASE_URL, staticHosting: STATIC_HOSTING };
export const VAULT_ENDPOINT = apiEndpoint('/api/vault', here);
export const EXPERIENCE_ENDPOINT = apiEndpoint('/api/experience', here);
