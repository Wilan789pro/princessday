import { birthdayAssetResponse } from '../server/birthdayAccess.js';
import { send } from './_send.js';

export default async function handler(req, res) {
  const url = new URL(req.url, 'http://localhost');
  send(res, await birthdayAssetResponse(url.searchParams.get('name'), Date.now()));
}
