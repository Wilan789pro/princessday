import { runHandler } from '../server/http.js';
import { createExperienceHandler } from '../server/experienceHandler.js';
import { getStore } from '../server/wishStore.js';

const handle = createExperienceHandler({ env: process.env, store: getStore(process.env) });

export default function handler(req, res) {
  return runHandler(handle, req, res);
}
