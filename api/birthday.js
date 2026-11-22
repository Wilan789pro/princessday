import { birthdayResponse } from '../server/birthdayAccess.js';
import { send } from './_send.js';

// Production: the server clock is authoritative. No test-clock override here.
export default async function handler(_req, res) {
  send(res, await birthdayResponse(Date.now()));
}
