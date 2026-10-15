'use strict';
// Internal-only storage helper. Never expose the REST token in browser-side code.
const crypto = require('node:crypto');

const SHORT_ID = /^[A-Za-z0-9_-]{10}$/;
function isShortId(value) { return typeof value === 'string' && SHORT_ID.test(value); }

function configured() {
  return Boolean(process.env.roomlink_KV_REST_API_URL && process.env.roomlink_KV_REST_API_TOKEN);
}

async function redis(command) {
  if (!configured()) throw new Error('Short-link storage is not configured');
  const endpoint = process.env.roomlink_KV_REST_API_URL;
  if (!/^https:\/\//.test(endpoint)) throw new Error('Storage endpoint must use HTTPS');
  const response = await fetch(endpoint, {
    method: 'POST',
    headers: {
      'Authorization': `Bearer ${process.env.roomlink_KV_REST_API_TOKEN}`,
      'Content-Type': 'application/json'
    },
    body: JSON.stringify(command),
    signal: AbortSignal.timeout(5000)
  });
  if (!response.ok) throw new Error(`Storage error: ${response.status}`);
  const result = await response.json();
  if (result.error) throw new Error('Storage command failed');
  return result.result;
}

async function expand(codeOrId) {
  if (!isShortId(codeOrId)) return codeOrId;
  const result = await redis(['GET', `roomlink:meeting:${codeOrId}`]);
  return typeof result === 'string' ? result : null;
}

async function store(code) {
  for (let attempt = 0; attempt < 5; attempt++) {
    const id = crypto.randomBytes(7).toString('base64url'); // 10 characters, 56 random bits
    const ok = await redis(['SET', `roomlink:meeting:${id}`, code, 'NX']);
    if (ok === 'OK') return id;
  }
  throw new Error('Unable to allocate a unique meeting ID');
}

async function creationAllowed(req) {
  // Lightweight, anonymous hourly limit. Hash the IP; do not save raw IP addresses.
  const ip = String(req.headers?.['x-forwarded-for'] || req.headers?.['x-real-ip'] || 'unknown').split(',')[0].trim().slice(0, 80);
  const key = crypto.createHmac('sha256', process.env.roomlink_KV_REST_API_TOKEN)
    .update(ip).digest('hex').slice(0, 24);
  const rateKey = `roomlink:limit:${key}:${Math.floor(Date.now()/3600000)}`;
  const uses = Number(await redis(['INCR', rateKey]));
  if (uses === 1) await redis(['EXPIRE', rateKey, 3600]);
  return uses <= 20;
}

module.exports = { isShortId, configured, redis, expand, store, creationAllowed };
