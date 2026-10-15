'use strict';

// Version 1 room link schema, encoded directly in the URL.
// This is NOT encryption. Do not put private credentials in these links.
const ZONES = {
  'America/New_York': ['ET', 'Eastern Time'],
  'America/Chicago': ['CT', 'Central Time'],
  'America/Denver': ['MT', 'Mountain Time'],
  'America/Phoenix': ['MST', 'Arizona Time'],
  'America/Los_Angeles': ['PT', 'Pacific Time'],
  'America/Anchorage': ['AKT', 'Alaska Time'],
  'Pacific/Honolulu': ['HST', 'Hawaii Time'],
  'Europe/London': ['UK', 'UK Time'],
  'Europe/Berlin': ['CET/CEST', 'Central European Time'],
  'Australia/Sydney': ['AET', 'Australian Eastern Time'],
  'UTC': ['UTC', 'Coordinated Universal Time'],
};

function normalizeString(s, max) {
  return typeof s === 'string' ? s.trim().slice(0, max) : '';
}

function parseZoomLink(value) {
  try {
    const url = new URL(value);
    const host = url.hostname.toLowerCase();
    if (url.protocol !== 'https:' || !(
      host === 'zoom.us' || host.endsWith('.zoom.us') ||
      host === 'zoom.com' || host.endsWith('.zoom.com') ||
      host === 'zoomgov.com' || host.endsWith('.zoomgov.com')
    )) return null;
    if (url.username || url.password) return null;
    if (url.href.length > 2048) return null;
    return url;
  } catch (_) {
    return null;
  }
}

function decodeRoom(code) {
  if (typeof code !== 'string' || code.length < 12 || code.length > 5000 || !/^[A-Za-z0-9_-]+$/.test(code)) return null;
  try {
    const json = Buffer.from(code, 'base64url').toString('utf8');
    const array = JSON.parse(json);
    if (!Array.isArray(array) || array.length !== 9 || array[0] !== 1) return null;
    const [_, n, s, t, z, i, p, w, u] = array;
    const name = normalizeString(n, 80);
    const schedule = normalizeString(s, 48);
    const time = normalizeString(t, 5);
    const zone = normalizeString(z, 48);
    const meetingId = normalizeString(i, 32);
    const passcode = normalizeString(p, 60);
    const password = normalizeString(w, 60);
    const zoom = normalizeString(u, 2048);
    if (!name || !schedule || !/^([01]\d|2[0-3]):[0-5]\d$/.test(time) || !ZONES[zone] || !parseZoomLink(zoom)) return null;
    return { name, schedule, time, zone, meetingId, passcode, password, zoom };
  } catch (_) {
    return null;
  }
}

function formatTime(s) {
  const [h, m] = s.split(':').map(Number);
  const hr = h % 12 || 12;
  return `${hr}:${String(m).padStart(2, '0')} ${h >= 12 ? 'PM' : 'AM'}`;
}
function html(s) {
  return String(s).replace(/&/g, '&amp;').replace(/</g, '&lt;')
    .replace(/>/g, '&gt;').replace(/"/g, '&quot;').replace(/'/g, '&#39;');
}
function zoneAbbr(zone) { return ZONES[zone]?.[0] || zone; }
function zoneName(zone) { return ZONES[zone]?.[1] || zone; }
function getBase(req) {
  const rawHost = String(req.headers['x-forwarded-host'] || req.headers.host || 'localhost:3000').split(',')[0].trim();
  // Host is never reflected into markup unless it passes this conservative check.
  const host = /^[A-Za-z0-9.:-]+$/.test(rawHost) ? rawHost : 'localhost:3000';
  const proto = String(req.headers['x-forwarded-proto'] || (host.startsWith('localhost') ? 'http' : 'https')).split(',')[0].trim();
  return `${proto === 'http' ? 'http' : 'https'}://${host}`;
}

module.exports = { ZONES, decodeRoom, formatTime, html, zoneAbbr, zoneName, getBase, parseZoomLink };
