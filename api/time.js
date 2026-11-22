import { timeResponse } from '../server/birthdayAccess.js';
import { send } from './_send.js';

export default function handler(_req, res) {
  send(res, timeResponse(Date.now()));
}
