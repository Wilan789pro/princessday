import { runHandler } from '../server/http.js';
import { createVaultHandler } from '../server/vaultHandler.js';
import { getStore } from '../server/wishStore.js';

const handle = createVaultHandler({ env: process.env, store: getStore(process.env) });

export default function handler(req, res) {
  return runHandler(handle, req, res);
}
