'use strict';
const { decodeRoom, getBase } = require('./_shared');
const { configured, store, creationAllowed } = require('./_links');

function reply(res, status, obj) {
  res.statusCode = status;
  res.setHeader('Content-Type', 'application/json; charset=utf-8');
  res.setHeader('Cache-Control', 'no-store');
  res.setHeader('X-Content-Type-Options', 'nosniff');
  return res.end(JSON.stringify(obj));
}

module.exports = async function handler(req, res) {
  if (req.method !== 'POST') {
    res.setHeader('Allow', 'POST');
    return reply(res, 405, { error: 'Only POST is supported' });
  }
  if (!configured()) return reply(res, 503, { error: 'Short-link storage is not connected yet. The full link still works.' });

  let payload;
  try {
    payload = typeof req.body === 'string' ? JSON.parse(req.body) : req.body;
  } catch (_) { return reply(res, 400, { error: 'Invalid request' }); }
  const code = payload?.code;
  if (!decodeRoom(code)) return reply(res, 400, { error: 'Invalid meeting details' });

  try {
    if (!(await creationAllowed(req))) return reply(res, 429, { error: 'Too many links created. Please try again later.' });
    const id = await store(code);
    const base = getBase(req);
    return reply(res, 201, { id, url: `${base}/r/${id}`, imageUrl: `${base}/og/${id}` });
  } catch (e) {
    console.error('RoomLink storage failed:', e.message);
    return reply(res, 503, { error: 'Short-link service is temporarily unavailable. The full link still works.' });
  }
};
