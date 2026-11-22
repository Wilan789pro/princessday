import { defineConfig, type Plugin, type Connect } from 'vite';
import react from '@vitejs/plugin-react';
import { birthdayResponse, birthdayAssetResponse, timeResponse, resolveNow } from './server/birthdayAccess.js';

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

export default defineConfig({
  plugins: [react(), birthdayApi()],
  build: { target: 'es2020', cssTarget: 'safari15' },
});
