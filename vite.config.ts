import { defineConfig, loadEnv, type Plugin, type Connect } from 'vite';
import react from '@vitejs/plugin-react';
import { birthdayResponse, birthdayAssetResponse, timeResponse, resolveNow } from './server/birthdayAccess.js';
import { createWishHandler } from './server/wishHandler.js';
import { createVaultHandler } from './server/vaultHandler.js';
import { createExperienceHandler } from './server/experienceHandler.js';
import { getStore } from './server/wishStore.js';
import { runHandler } from './server/http.js';

/**
 * Mounts the same /api endpoints used in production onto the Vite dev and
 * preview servers. The ?now= test clock is honoured ONLY by `vite dev`.
 */
function birthdayApi(): Plugin {
  const middleware =
    (allowTestClock: boolean): Connect.NextHandleFunction =>
    async (req, res, next) => {
      if (!req.url?.startsWith('/api/')) return next();
      const url = new URL(req.url, 'http://localhost');
      const now = resolveNow(url.searchParams.get('now'), allowTestClock);
      let r;
      if (url.pathname === '/api/time') r = timeResponse(now);
      else if (url.pathname === '/api/birthday') r = await birthdayResponse(now);
      else if (url.pathname === '/api/birthday-asset') r = await birthdayAssetResponse(url.searchParams.get('name'), now);
      else return next();
      res.statusCode = r.status;
      for (const [k, v] of Object.entries(r.headers as Record<string, string>)) res.setHeader(k, v);
      res.end(r.body);
    };
  return {
    name: 'princess-prism-birthday-api',
    configureServer(server) {
      server.middlewares.use(middleware(true));
    },
    configurePreviewServer(server) {
      server.middlewares.use(middleware(false));
    },
  };
}

/**
 * /api/wish, /api/vault and /api/experience on the dev and preview servers.
 * Server-only settings (never VITE_*) come from the shell or an untracked .env.
 * `vite dev` may use an in-memory store (lost on restart) when no Redis is
 * configured; `vite preview` behaves like production and needs real storage.
 */
function wishVaultApi(env: Record<string, string>): Plugin {
  const mount = (allowMemory: boolean): Connect.NextHandleFunction => {
    const store = getStore(env, { allowMemory });
    const routes: Record<string, ReturnType<typeof createWishHandler>> = {
      '/api/wish': createWishHandler({ env, store }),
      '/api/vault': createVaultHandler({ env, store }),
      '/api/experience': createExperienceHandler({ env, store }),
    };
    return async (req, res, next) => {
      const path = (req.url ?? '').split('?')[0];
      const handle = routes[path];
      if (!handle) return next();
      await runHandler(handle, req, res);
    };
  };
  return {
    name: 'princess-prism-wish-vault-api',
    configureServer(server) {
      server.middlewares.use(mount(true));
    },
    configurePreviewServer(server) {
      server.middlewares.use(mount(false));
    },
  };
}

export default defineConfig(({ mode }) => {
  const env = loadEnv(mode, process.cwd(), '');
  const pick = (k: string) => env[k] ?? '';
  const serverEnv = Object.fromEntries(
    [
      'VAULT_ACCESS_CODE',
      'VAULT_SESSION_SECRET',
      'WISH_ALLOWED_ORIGINS',
      'UPSTASH_REDIS_REST_URL',
      'UPSTASH_REDIS_REST_TOKEN',
      'KV_REST_API_URL',
      'KV_REST_API_TOKEN',
    ].map((k) => [k, pick(k)]),
  );
  // `--mode pages`: GitHub Pages build. Served from /princessday/, and there is
  // no server there, so the local /api middleware is not mounted either (a
  // local `vite preview --mode pages` then behaves like the real static host).
  const pages = mode === 'pages';
  return {
    base: pages ? '/princessday/' : '/',
    plugins: pages ? [react()] : [react(), birthdayApi(), wishVaultApi(serverEnv)],
    build: { target: 'es2020', cssTarget: 'safari15' },
  };
});
