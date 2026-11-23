/**
 * /api/experience – the public "experience epoch".
 *
 * Visitor progress (crystals, discoveries, completed animations, the bouquet…)
 * lives in each browser. When the owner presses RESET ENTIRE EXPERIENCE in the
 * vault, the epoch changes; every browser compares it with the one it last saw
 * and, if different, clears its own progress – on any device.
 * Contains no wishes and no secrets.
 */
import { originGate, preflight, reply } from './http.js';

export function createExperienceHandler({ env = process.env, store }) {
  return async function handleExperience({ method, headers }) {
    const gate = originGate(env, headers, { methods: 'GET, OPTIONS', headers: 'Content-Type' });
    if (gate.refused) return gate.refused;
    if (method === 'OPTIONS') return preflight(gate.cors);
    if (method !== 'GET') return reply(405, { status: 'error', error: 'method-not-allowed' }, gate.cors);
    if (!store) return reply(200, { epoch: null }, gate.cors);
    try {
      return reply(200, { epoch: await store.getEpoch() }, gate.cors);
    } catch {
      return reply(200, { epoch: null }, gate.cors);
    }
  };
}
