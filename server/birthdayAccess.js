/**
 * SERVER-SIDE GATE FOR THE 25TH CHAMBER
 * -------------------------------------
 * This file (and everything in /server) is never imported by the frontend,
 * so nothing here ends up in the public JavaScript bundle.
 *
 * The real birthday content lives in server/birthday-content.json and any
 * private images in server/birthday-assets/. They are only returned once the
 * SERVER clock has passed the unlock moment – the device clock is irrelevant.
 */
import { readFile } from 'node:fs/promises';
import path from 'node:path';

/** Midnight at the start of 18 December 2026 in Mauritius (UTC+4, no DST). */
export const UNLOCK_AT_ISO = '2026-12-18T00:00:00+04:00';
export const UNLOCK_AT_MS = Date.parse(UNLOCK_AT_ISO);

const SERVER_DIR = path.resolve(process.cwd(), 'server');
const CONTENT_FILE = path.join(SERVER_DIR, 'birthday-content.json');
const ASSET_DIR = path.join(SERVER_DIR, 'birthday-assets');

const NO_STORE = {
  'Cache-Control': 'no-store, max-age=0',
  'Content-Type': 'application/json; charset=utf-8',
  'X-Robots-Tag': 'noindex',
};

const MIME = {
  '.jpg': 'image/jpeg',
  '.jpeg': 'image/jpeg',
  '.png': 'image/png',
  '.webp': 'image/webp',
  '.gif': 'image/gif',
  '.avif': 'image/avif',
  '.mp4': 'video/mp4',
  '.mp3': 'audio/mpeg',
  '.m4a': 'audio/mp4',
};

/** Current time, optionally overridden ONLY when the caller allows it (local dev). */
export function resolveNow(testNow, allowTestClock) {
  if (allowTestClock && testNow) {
    const t = Date.parse(testNow);
    if (!Number.isNaN(t)) return t;
  }
  return Date.now();
}

export function timeResponse(now = Date.now()) {
  return { status: 200, headers: NO_STORE, body: JSON.stringify({ serverTime: now }) };
}

export async function birthdayResponse(now = Date.now()) {
  if (now < UNLOCK_AT_MS) {
    return {
      status: 403,
      headers: NO_STORE,
      body: JSON.stringify({ status: 'locked', unlocksAt: UNLOCK_AT_ISO, serverTime: now }),
    };
  }
  try {
    const content = JSON.parse(await readFile(CONTENT_FILE, 'utf8'));
    return {
      status: 200,
      headers: NO_STORE,
      body: JSON.stringify({ status: 'open', serverTime: now, content }),
    };
  } catch (err) {
    return {
      status: 500,
      headers: NO_STORE,
      body: JSON.stringify({ status: 'error', serverTime: now, message: 'Birthday content could not be read.' }),
    };
  }
}

export async function birthdayAssetResponse(name, now = Date.now()) {
  if (now < UNLOCK_AT_MS) {
    return { status: 403, headers: NO_STORE, body: JSON.stringify({ status: 'locked' }) };
  }
  const safe = typeof name === 'string' ? path.basename(name) : '';
  if (!/^[\w.-]+$/.test(safe) || safe.startsWith('.')) {
    return { status: 400, headers: NO_STORE, body: JSON.stringify({ status: 'bad-request' }) };
  }
  const type = MIME[path.extname(safe).toLowerCase()];
  if (!type) return { status: 415, headers: NO_STORE, body: JSON.stringify({ status: 'unsupported' }) };
  try {
    const data = await readFile(path.join(ASSET_DIR, safe));
    return { status: 200, headers: { 'Content-Type': type, 'Cache-Control': 'private, max-age=3600' }, body: data };
  } catch {
    return { status: 404, headers: NO_STORE, body: JSON.stringify({ status: 'not-found' }) };
  }
}
