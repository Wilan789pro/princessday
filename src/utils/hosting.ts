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
