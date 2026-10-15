'use strict';
const { decodeRoom, formatTime, html: esc, zoneAbbr, zoneName, getBase } = require('./_shared');

module.exports = async function handler(req, res) {
  const code = Array.isArray(req.query.code) ? req.query.code[0] : req.query.code;
  const room = decodeRoom(code);
  if (!room) {
    res.statusCode = 404;
    res.setHeader('Content-Type', 'text/html; charset=utf-8');
    return res.end('<!doctype html><title>Room not found | RoomLink</title><main style="font:20px system-ui;max-width:650px;margin:12vh auto;padding:24px"><h1>Room link not found</h1><p>This link is incomplete or invalid.</p><a href="/">Make a new RoomLink</a></main>');
  }

  const base = getBase(req);
  const pageUrl = `${base}/r/${encodeURIComponent(code)}`;
  const imageUrl = `${base}/og/${encodeURIComponent(code)}`;
  const meetingTime = `${formatTime(room.time)} ${zoneAbbr(room.zone)}`;
  const description = [room.schedule, meetingTime, room.meetingId ? `ID ${room.meetingId}` : '', room.passcode ? `Passcode ${room.passcode}` : ''].filter(Boolean).join(' · ');
  const displayName = esc(room.name);
  const details = [
    room.meetingId ? ['Meeting ID', room.meetingId] : null,
    room.passcode ? ['Passcode', room.passcode] : null,
    room.password ? ['Room password', room.password] : null,
  ].filter(Boolean);
  const detailMarkup = details.map(([label, value]) => `<div class="detail"><span>${esc(label)}</span><strong>${esc(value)}</strong></div>`).join('');

  const document = `<!doctype html>
<html lang="en"><head><meta charset="utf-8"><meta name="viewport" content="width=device-width, initial-scale=1">
<title>${displayName} — ${esc(meetingTime)} | RoomLink</title>
<meta name="description" content="${esc(description)}">
<meta property="og:type" content="website">
<meta property="og:site_name" content="RoomLink">
<meta property="og:title" content="${displayName} — ${esc(meetingTime)}">
<meta property="og:description" content="${esc(description)}">
<meta property="og:url" content="${esc(pageUrl)}">
<meta property="og:image" content="${esc(imageUrl)}">
<meta property="og:image:secure_url" content="${esc(imageUrl)}">
<meta property="og:image:width" content="1200"><meta property="og:image:height" content="630">
<meta property="og:image:type" content="image/png">
<meta property="og:image:alt" content="RoomLink meeting card for ${displayName}, ${esc(meetingTime)}">
<meta name="twitter:card" content="summary_large_image">
<meta name="twitter:image" content="${esc(imageUrl)}">
<style>
:root{color-scheme:dark;--muted:#a6b2cb;--gold:#ffb479}*{box-sizing:border-box}
body{margin:0;background:radial-gradient(ellipse at 80% 3%,#34405f,#111827 55%,#0a101d);min-height:100vh;color:#f9fafb;font:16px/1.5 system-ui,-apple-system,BlinkMacSystemFont,'Segoe UI',sans-serif;padding:22px}
.wrap{max-width:720px;margin:5vh auto 28px}.brand{font-size:15px;font-weight:850;color:var(--gold);letter-spacing:.16em;text-decoration:none}
.card{margin-top:30px;background:#172235;border:1px solid #354056;border-radius:25px;padding:38px;box-shadow:0 26px 90px #0005}
.pill{display:inline-block;background:#34374b;color:#ffb479;font-size:12px;letter-spacing:.12em;font-weight:850;padding:8px 13px;border-radius:100px}
h1{font-size:clamp(29px,6vw,49px);line-height:1.13;margin:23px 0 11px;overflow-wrap:anywhere}
.time{color:#ffc99e;font-size:clamp(28px,6vw,41px);font-weight:800;margin:0 0 2px}.schedule{color:#bdc7db;font-size:17px;margin-top:0}
.details{display:flex;flex-wrap:wrap;gap:12px;margin:26px 0}.detail{background:#222f45;border:1px solid #34435d;border-radius:13px;flex:1 1 140px;min-width:0;padding:14px 16px}.detail span{display:block;font-size:12px;color:#bbc5d7}.detail strong{display:block;font-size:20px;overflow-wrap:anywhere;margin-top:4px}
.join{display:block;padding:16px 20px;background:#e98d56;color:#21150e;font-size:18px;font-weight:850;text-align:center;text-decoration:none;border-radius:14px}.join:hover{background:#ffac77}
.notice{color:#bac4d6;font-size:13px;margin:21px 0 0}.footer{color:#b0b9cd;font-size:14px;text-align:center;margin-top:24px}.footer a{color:#ffb479}
@media(max-width:530px){.wrap{margin:2vh auto}.card{padding:26px 20px;border-radius:19px}}
</style></head><body>
<div class="wrap"><a class="brand" href="/">ROOMLINK</a>
<main class="card"><span class="pill">ZOOM MEETING</span><h1>${displayName}</h1>
<p class="time">${esc(meetingTime)}</p><p class="schedule">${esc(room.schedule)} · ${esc(zoneName(room.zone))}</p>
${detailMarkup ? `<div class="details">${detailMarkup}</div>` : ''}
<a class="join" href="${esc(room.zoom)}">Join Zoom meeting →</a>
<p class="notice">Only join meetings you recognize. This page is a meeting directory card, not an official Zoom website. Anyone with this link can view the meeting details.</p></main>
<div class="footer">Made with <a href="/">RoomLink</a> · Free meeting cards, no account needed</div></div>
</body></html>`;
  res.statusCode = 200;
  res.setHeader('Content-Type', 'text/html; charset=utf-8');
  res.setHeader('Cache-Control', 'public, max-age=3600, s-maxage=86400');
  res.setHeader('X-Content-Type-Options', 'nosniff');
  res.setHeader('Content-Security-Policy', "default-src 'none'; style-src 'unsafe-inline'; img-src 'self'; base-uri 'none'; frame-ancestors 'none'; form-action 'none'");
  res.end(document);
};
