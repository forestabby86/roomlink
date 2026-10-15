
'use strict';

// RoomLink Version 1 and Version 2 support.
// Meeting credentials in URLs are not encrypted.

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

const THEMES = Object.freeze({
  copper: {
    bg:'#111a2b', accent:'#ffb785',
    orbit:'#27334d', orbit2:'#303d57',
    pill:'#3d3540', panel:'#273247',
    stroke:'#43516c', muted:'#c5d0e1',
    label:'#bbcadf', footer:'#a5b5c9'
  },
  ocean: {
    bg:'#0b2240', accent:'#85e1f1',
    orbit:'#17466b', orbit2:'#235a76',
    pill:'#153c58', panel:'#153a59',
    stroke:'#2e6585', muted:'#d1e8f3',
    label:'#b9dbe9', footer:'#b1cbdf'
  },
  forest: {
    bg:'#112723', accent:'#b9e5ad',
    orbit:'#284a42', orbit2:'#33594a',
    pill:'#26413a', panel:'#24413b',
    stroke:'#4b7365', muted:'#d8e9de',
    label:'#c7decd', footer:'#b9d5c1'
  },
  plum: {
    bg:'#24172f', accent:'#ffc0df',
    orbit:'#483154', orbit2:'#5b3c60',
    pill:'#503048', panel:'#432d4d',
    stroke:'#78526f', muted:'#e5d9ee',
    label:'#e7cfe2', footer:'#cdb7d3'
  }
});

function normalizeString(s, max) {
  return typeof s === 'string'
    ? s.trim().slice(0, max)
    : '';
}

function parseZoomLink(value) {
  try {
    const url = new URL(value);
    const host = url.hostname.toLowerCase();

    if (url.protocol !== 'https:' || !(
      host === 'zoom.us' ||
      host.endsWith('.zoom.us') ||
      host === 'zoom.com' ||
      host.endsWith('.zoom.com') ||
      host === 'zoomgov.com' ||
      host.endsWith('.zoomgov.com')
    )) return null;

    if (url.username || url.password) return null;
    if (url.href.length > 2048) return null;

    return url;
  } catch (_) {
    return null;
  }
}

function decodeRoom(code) {
  if (
    typeof code !== 'string' ||
    code.length < 12 ||
    code.length > 5000 ||
    !/^[A-Za-z0-9_-]+$/.test(code)
  ) return null;

  try {
    const json = Buffer.from(
      code, 'base64url'
    ).toString('utf8');

    const array = JSON.parse(json);

    if (
      !Array.isArray(array) ||
      !(
        (array[0] === 1 && array.length === 9) ||
        (array[0] === 2 && array.length === 10)
      )
    ) return null;

    const [
      version, n, s, t, z, i, p, w, u, themeInput
    ] = array;

    const name = normalizeString(n, 80);
    const schedule = normalizeString(s, 48);
    const time = normalizeString(t, 5);
    const zone = normalizeString(z, 48);
    const meetingId = normalizeString(i, 32);
    const passcode = normalizeString(p, 60);
    const password = normalizeString(w, 60);
    const zoom = normalizeString(u, 2048);

    if (
      !name ||
      !schedule ||
      !/^([01]\d|2[0-3]):[0-5]\d$/.test(time) ||
      !ZONES[zone] ||
      !parseZoomLink(zoom)
    ) return null;

    if (
      version === 2 &&
      (
        typeof themeInput !== 'string' ||
        !Object.hasOwn(THEMES, themeInput)
      )
    ) return null;

    const theme = version === 1
      ? 'copper'
      : themeInput;

    return {
      name, schedule, time, zone,
      meetingId, passcode, password,
      zoom, theme
    };
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
  return String(s)
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#39;');
}

function zoneAbbr(zone) {
  return ZONES[zone]?.[0] || zone;
}

function zoneName(zone) {
  return ZONES[zone]?.[1] || zone;
}

function getBase(req) {
  const rawHost = String(
    req.headers['x-forwarded-host'] ||
    req.headers.host ||
    'localhost:3000'
  ).split(',')[0].trim();

  const host = /^[A-Za-z0-9.:-]+$/.test(rawHost)
    ? rawHost
    : 'localhost:3000';

  const proto = String(
    req.headers['x-forwarded-proto'] ||
    (host.startsWith('localhost') ? 'http' : 'https')
  ).split(',')[0].trim();

  return `${proto === 'http' ? 'http' : 'https'}://${host}`;
}

module.exports = {
  ZONES,
  THEMES,
  decodeRoom,
  formatTime,
  html,
  zoneAbbr,
  zoneName,
  getBase,
  parseZoomLink
};
