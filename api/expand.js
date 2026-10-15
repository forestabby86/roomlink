'use strict';
const { decodeRoom } = require('./_shared');
const { isShortId, expand } = require('./_links');
module.exports = async function handler(req, res) {
  res.setHeader('Content-Type', 'application/json; charset=utf-8');
  res.setHeader('Cache-Control', 'no-store');
  res.setHeader('X-Content-Type-Options','nosniff');
  const id = req.query?.id;
  if (req.method !== 'GET' || !isShortId(id)) {
    res.statusCode=400;return res.end(JSON.stringify({error:'Invalid short link'}));
  }
  try {
    const code = await expand(id);
    if (!decodeRoom(code)) { res.statusCode=404;return res.end(JSON.stringify({error:'Meeting not found'})); }
    res.statusCode=200;return res.end(JSON.stringify({code}));
  } catch (e) { res.statusCode=503;return res.end(JSON.stringify({error:'Storage unavailable'})); }
};
