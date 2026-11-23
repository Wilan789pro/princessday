/**
 * Test double for the Upstash Redis REST API. Interprets the commands the
 * store sends, keeps data in memory and records every command, so tests can
 * prove exactly which keys an action touches.
 */
export function createFakeUpstash({ now = Date.now, failOn = null } = {}) {
  const data = new Map(); // key -> { type, value, until }
  const log = [];

  const live = (k) => {
    const e = data.get(k);
    if (e && e.until && e.until <= now()) data.delete(k);
    return data.get(k);
  };

  const exec = (args) => {
    const [op, ...a] = args.map(String);
    log.push([op, ...a]);
    if (failOn && failOn(op, a)) return { error: 'ERR injected failure' };
    switch (op) {
      case 'HSET': {
        const [key, ...fv] = a;
        const e = live(key) ?? { type: 'hash', value: new Map() };
        for (let i = 0; i < fv.length; i += 2) e.value.set(fv[i], fv[i + 1]);
        data.set(key, e);
        return { result: fv.length / 2 };
      }
      case 'HGETALL': {
        const e = live(a[0]);
        return { result: e ? [...e.value.entries()].flat() : [] };
      }
      case 'ZADD': {
        const [key, score, member] = a;
        const e = live(key) ?? { type: 'zset', value: new Map() };
        e.value.set(member, Number(score));
        data.set(key, e);
        return { result: 1 };
      }
      case 'ZRANGE': {
        const e = live(a[0]);
        const members = e ? [...e.value.entries()].sort((x, y) => x[1] - y[1]).map(([m]) => m) : [];
        return { result: a.includes('REV') ? members.reverse() : members };
      }
      case 'ZREM': {
        const e = live(a[0]);
        return { result: e && e.value.delete(a[1]) ? 1 : 0 };
      }
      case 'DEL':
        return { result: data.delete(a[0]) ? 1 : 0 };
      case 'EXISTS':
        return { result: live(a[0]) ? 1 : 0 };
      case 'GET': {
        const e = live(a[0]);
        return { result: e ? String(e.value) : null };
      }
      case 'SET': {
        const [key, value, ...opts] = a;
        if (opts.includes('NX') && live(key)) return { result: null };
        const ex = opts.indexOf('EX');
        data.set(key, { type: 'string', value, until: ex >= 0 ? now() + Number(opts[ex + 1]) * 1000 : 0 });
        return { result: 'OK' };
      }
      case 'INCR': {
        const e = live(a[0]) ?? { type: 'string', value: '0', until: 0 };
        e.value = String(Number(e.value) + 1);
        data.set(a[0], e);
        return { result: Number(e.value) };
      }
      default:
        return { error: `ERR unknown command ${op}` };
    }
  };

  const fetchImpl = async (url, init) => {
    if (init.headers.Authorization !== 'Bearer test-token') return { ok: false, status: 401, json: async () => ({}) };
    const body = JSON.parse(init.body);
    const result = url.endsWith('/pipeline') ? body.map(exec) : exec(body);
    return { ok: true, status: 200, json: async () => result };
  };

  return { fetchImpl, data, log, keys: () => [...data.keys()] };
}
