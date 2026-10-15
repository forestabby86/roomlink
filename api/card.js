'use strict';
const sharp = require('sharp');
const { decodeRoom, formatTime, html: esc, zoneAbbr, THEMES } = require('./_shared');
const { expand } = require('./_links');

function lines(text, maxChars, maxLines = 2) {
  const words = text.split(/\s+/);
  const output = [];
  let line = '';
  for (const word of words) {
    if ((line + (line ? ' ' : '') + word).length > maxChars && line) {
      output.push(line);
      line = word;
    } else line += (line ? ' ' : '') + word;
  }
  if (line) output.push(line);
  if (output.length > maxLines) {
    const arr = output.slice(0,maxLines);
    arr[maxLines-1] = arr[maxLines-1].slice(0,Math.max(3,maxChars-2)) + '…';
    return arr;
  }
  return output.map(s=>s.length>maxChars+5?s.slice(0,maxChars)+'…':s);
}

function svg(room) {
  const t = THEMES[room.theme] || THEMES.copper;
  const titleLines = lines(room.name, 28, 2);
  const titleSize = titleLines.some(t => t.length >= 29) ? 53 : 61;
  const titleText = titleLines.map((line,index)=>`<text x="64" y="${160 + index * 72}" font-family="Arial,Helvetica,sans-serif" font-size="${titleSize}" font-weight="800" letter-spacing="-1.3" fill="#ffffff">${esc(line)}</text>`).join('');
  const offset = (titleLines.length-1)*62;
  const timeY = 252 + offset;
  const footerY = 589;
  const fields = [
    room.meetingId ? ['MEETING ID',room.meetingId] : null,
    room.passcode ? ['PASSCODE',room.passcode] : null,
    room.password ? ['ROOM PASSWORD',room.password] : null,
  ].filter(Boolean);
  const cols = fields.length;
  const startY = 425;
  const gap = 15;
  const totalWidth = 1072;
  const w = cols ? (totalWidth - gap*(cols-1))/cols : 0;
  const cards = fields.map(([label,value],index)=>{
    const x = 64 + index*(w+gap);
    const valueSize = value.length > 25 ? 23 : value.length > 15 ? 29 : 36;
    const displayValue = value.length>32 ? value.slice(0,31)+'…' : value;
    return `<rect x="${x}" y="${startY}" width="${w}" height="112" rx="18" fill="${t.panel}" stroke="${t.stroke}" stroke-width="1"/>
      <text x="${x+22}" y="${startY+33}" font-family="Arial,Helvetica,sans-serif" font-weight="700" font-size="19" letter-spacing="1.8" fill="${t.label}">${esc(label)}</text>
      <text x="${x+22}" y="${startY+84}" font-family="Arial,Helvetica,sans-serif" font-weight="750" font-size="${valueSize}" fill="#ffffff">${esc(displayValue)}</text>`;
  }).join('');
  return `<svg xmlns="http://www.w3.org/2000/svg" width="1200" height="630" viewBox="0 0 1200 630">
    <rect x="0" y="0" width="1200" height="630" fill="${t.bg}"/>
    <rect x="0" y="0" width="13" height="630" fill="${t.accent}"/>
    <circle cx="1090" cy="-54" r="260" fill="${t.orbit}"/>
    <circle cx="1110" cy="-65" r="191" fill="${t.orbit2}"/>
    <rect x="64" y="35" width="198" height="43" rx="21" fill="${t.pill}"/>
    <text x="84" y="64" font-family="Arial,Helvetica,sans-serif" font-size="18" font-weight="800" letter-spacing="2" fill="${t.accent}">ZOOM MEETING</text>
    <text x="1135" y="65" text-anchor="end" font-family="Arial,Helvetica,sans-serif" font-size="19" font-weight="800" letter-spacing="2" fill="${t.accent}">ROOMLINK</text>
    ${titleText}
    <text x="64" y="${timeY+35}" font-family="Arial,Helvetica,sans-serif" font-weight="800" font-size="57" letter-spacing="-1" fill="${t.accent}">${esc(formatTime(room.time))} ${esc(zoneAbbr(room.zone))}</text>
    <text x="67" y="${timeY+85}" font-family="Arial,Helvetica,sans-serif" font-size="29" fill="${t.muted}">${esc(room.schedule.length>36 ? room.schedule.slice(0,35)+'…' : room.schedule)}</text>
    ${cards}
    <text x="66" y="${footerY}" font-family="Arial,Helvetica,sans-serif" font-size="20" fill="${t.footer}">Tap the shared link to join the meeting</text>
    <text x="1135" y="${footerY}" text-anchor="end" font-family="Arial,Helvetica,sans-serif" font-size="19" font-weight="800" fill="${t.accent}">FREE · NO LOGIN</text>
  </svg>`;
}

module.exports = async function handler(req,res) {
  const reference = Array.isArray(req.query.code) ? req.query.code[0] : req.query.code;
  let code;
  try { code = await expand(reference); } catch (_) { code = null; }
  const room = decodeRoom(code);
  if (!room) { res.statusCode = 404; return res.end('Room not found'); }
  try {
    const png = await sharp(Buffer.from(svg(room)), {density: 96}).png({compressionLevel: 9, palette: true, quality: 95}).toBuffer();
    res.statusCode = 200;
    res.setHeader('Content-Type','image/png');
    res.setHeader('Cache-Control','public, max-age=86400, s-maxage=604800, immutable');
    res.setHeader('X-Content-Type-Options', 'nosniff');
    res.end(png);
  } catch (err) {
    console.error('Image render failed',err);
    res.statusCode = 500;
    res.end('Could not render meeting image');
  }
};

module.exports._svg = svg;
