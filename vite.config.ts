import { defineConfig, loadEnv, type Plugin, type Connect } from 'vite';
import react from '@vitejs/plugin-react';
import { birthdayResponse, birthdayAssetResponse, timeResponse, resolveNow } from './server/birthdayAccess.js';
import { createWishHandler, readRawBody, clientIp } from './server/wishHandler.js';

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
 * /api/wish on the dev and preview servers. Server-only env vars (never VITE_*)
 * are read from the shell or an untracked .env file. Without them the
 * endpoint runs in dry-run mode and sends nothing.
 */
function wishApi(env: Record<string, string>): Plugin {
  const handle = createWishHandler({ env });
  const middleware: Connect.NextHandleFunction = async (req, res, next) => {
    if (!req.url?.startsWith('/api/wish')) return next();
    const r = await handle({
      method: req.method ?? 'GET',
      headers: req.headers as Record<string, string | undefined>,
      rawBody: req.method === 'POST' ? await readRawBody(req) : '',
      ip: clientIp(req),
    });
    res.statusCode = r.status;
    for (const [k, v] of Object.entries(r.headers as Record<string, string>)) res.setHeader(k, v);
    res.end(r.body);
  };
  return {
    name: 'princess-prism-wish-api',
    configureServer(server) {
      server.middlewares.use(middleware);
    },
    configurePreviewServer(server) {
      server.middlewares.use(middleware);
    },
  };
}

export default defineConfig(({ mode }) => {
  const env = loadEnv(mode, process.cwd(), '');
  const serverEnv = {
    RESEND_API_KEY: env.RESEND_API_KEY ?? '',
    WISH_TO_EMAIL: env.WISH_TO_EMAIL ?? '',
    WISH_FROM_EMAIL: env.WISH_FROM_EMAIL ?? '',
    WISH_ALLOWED_ORIGINS: env.WISH_ALLOWED_ORIGINS ?? '',
  };
  // `--mode pages`: GitHub Pages build. Served from /princessday/, and there is
  // no server there, so the local /api middleware is not mounted either (a
  // local `vite preview --mode pages` then behaves like the real static host).
  const pages = mode === 'pages';
  return {
    base: pages ? '/princessday/' : '/',
    plugins: pages ? [react()] : [react(), birthdayApi(), wishApi(serverEnv)],
    build: { target: 'es2020', cssTarget: 'safari15' },
  };
});
