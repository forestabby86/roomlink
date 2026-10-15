'use strict';
const $ = (id) => document.getElementById(id);
const fields = ['room-name','zoom-url','schedule','time','zone','meeting-id','passcode','password'];
const themes = new Set(['copper','ocean','forest','plum']);
const abbr = {
  'America/New_York': 'ET', 'America/Chicago': 'CT', 'America/Denver': 'MT',
  'America/Phoenix': 'MST', 'America/Los_Angeles': 'PT', 'America/Anchorage': 'AKT',
  'Pacific/Honolulu': 'HST', 'Europe/London': 'UK', 'Europe/Berlin': 'CET/CEST',
  'Australia/Sydney': 'AET', 'UTC': 'UTC'
};
function getDetails() {
  return {
    name: $('room-name').value.trim(), zoom: $('zoom-url').value.trim(),
    schedule: $('schedule').value.trim(), time: $('time').value,
    zone: $('zone').value, meetingId: $('meeting-id').value.trim(),
    passcode: $('passcode').value.trim(), password: $('password').value.trim(),
    theme: document.querySelector('input[name="theme"]:checked')?.value || 'copper'
  };
}
function prettyTime(time) {
  const [hour, minute] = String(time || '09:00').split(':').map(Number);
  if (!Number.isInteger(hour) || hour < 0 || hour > 23 || !Number.isInteger(minute) || minute < 0 || minute > 59) return '9:00 AM';
  return `${hour % 12 || 12}:${String(minute).padStart(2, '0')} ${hour >= 12 ? 'PM' : 'AM'}`;
}
function allowedZoomUrl(raw) {
  try {
    const url = new URL(raw);
    const h = url.hostname.toLowerCase();
    return url.protocol === 'https:' && !url.username && !url.password &&
      (h === 'zoom.us' || h.endsWith('.zoom.us') || h === 'zoom.com' || h.endsWith('.zoom.com') ||
      h === 'zoomgov.com' || h.endsWith('.zoomgov.com')) && raw.length <= 2048;
  } catch (_) { return false; }
}
function base64urlEncode(input) {
  const bytes = new TextEncoder().encode(JSON.stringify(input));
  let binary = '';
  for (const byte of bytes) binary += String.fromCharCode(byte);
  return btoa(binary).replace(/\+/g, '-').replace(/\//g, '_').replace(/=+$/,'');
}
function encodeRoom(d) {
  return base64urlEncode([2,d.name,d.schedule,d.time,d.zone,d.meetingId,d.passcode,d.password,d.zoom,d.theme]);
}
async function decodeExistingLink(raw) {
  const url = new URL(raw);
  if (!['https:','http:'].includes(url.protocol)) throw Error('Invalid link');
  const found = url.pathname.match(/^\/r\/([A-Za-z0-9_-]+)\/?$/);
  const code = found?.[1] || (url.pathname === '/api/room' ? url.searchParams.get('code') : null);
  if (!code || code.length > 5000 || !/^[A-Za-z0-9_-]+$/.test(code)) throw Error('Not a RoomLink meeting URL');
  if (/^[A-Za-z0-9_-]{10}$/.test(code)) {
    const response = await fetch(`/api/expand?id=${encodeURIComponent(code)}`);
    if (!response.ok) throw Error('Short link could not be loaded');
    const data = await response.json();
    return decodeExistingLink(`${location.origin}/r/${data.code}`);
  }
  const normalized = code.replace(/-/g,'+').replace(/_/g,'/');
  const bytes = Uint8Array.from(atob(normalized.padEnd(Math.ceil(normalized.length/4)*4,'=')), c=>c.charCodeAt(0));
  const payload = JSON.parse(new TextDecoder('utf-8',{fatal:true}).decode(bytes));
  if (!Array.isArray(payload) || !((payload[0] === 1 && payload.length === 9) || (payload[0] === 2 && payload.length === 10))) throw Error('Invalid version');
  const [version,name,schedule,time,zone,meetingId,passcode,password,zoom,theme] = payload;
  if ([name,schedule,time,zone,meetingId,passcode,password,zoom].some(x=>typeof x !== 'string') ||
    !name.trim() || !schedule.trim() || !/^([01]\d|2[0-3]):[0-5]\d$/.test(time) || !abbr[zone] || !allowedZoomUrl(zoom) ||
    [name,schedule,time,zone,meetingId,passcode,password,zoom].some((x,i)=>x.length > [80,48,5,48,32,60,60,2048][i])) throw Error('Invalid meeting details');
  if (version === 2 && !themes.has(theme)) throw Error('Unknown card theme');
  return {name,schedule,time,zone,meetingId,passcode,password,zoom,theme:version === 2 ? theme : 'copper'};
}
function updatePreview() {
  const d = getDetails();
  const time = `${prettyTime(d.time)} ${abbr[d.zone] || d.zone}`;
  $('meeting-image').dataset.theme = d.theme;
  $('preview-name').textContent = d.name || 'Your meeting name';
  $('preview-time').textContent = time;
  $('preview-schedule').textContent = d.schedule || 'Meeting days';
  $('caption-title').textContent = `${d.name || 'Your meeting name'} — ${time}`;
  $('caption-subtitle').textContent = [d.schedule || 'Meeting days', d.meetingId ? `Meeting ID ${d.meetingId}` : 'Meeting details'].join(' · ');
  const pairs = [['MEETING ID',d.meetingId],['PASSCODE',d.passcode],['ROOM PASSWORD',d.password]].filter((p)=>p[1]);
  if (!pairs.length) pairs.push(['MEETING ID','••• ••• ••••'],['PASSCODE','—']);
  const holder = $('image-fields');
  holder.replaceChildren();
  for (const [label, value] of pairs) {
    const item = document.createElement('div'); item.className = 'image-field';
    const l = document.createElement('small'); l.textContent = label;
    const val = document.createElement('strong'); val.textContent = value;
    item.append(l,val); holder.append(item);
  }
}
function resetIfEdited() {
  $('result-panel').hidden = true;
  $('form-message').textContent = '';
  $('share-feedback').textContent = '';
  updatePreview();
}
fields.forEach(id => $(id).addEventListener('input', resetIfEdited));
document.querySelectorAll('input[name="theme"]').forEach(radio => radio.addEventListener('change', resetIfEdited));
$('public-consent').addEventListener('change', () => { $('form-message').textContent = ''; });
$('zoom-url').addEventListener('input', ()=>{
  const url = $('zoom-url').value;
  if (!$('meeting-id').dataset.manual) {
    const hit = url.match(/\/j\/(\d{9,13})(?:\b|\/|\?)/);
    if (hit) $('meeting-id').value = hit[1];
  }
  updatePreview();
});
$('meeting-id').addEventListener('input',()=> { $('meeting-id').dataset.manual='true'; });
$('load-link-button').addEventListener('click',async()=>{
  try {
    const d = await decodeExistingLink($('existing-link').value.trim());
    const from = {
      'room-name':d.name,'zoom-url':d.zoom, 'schedule':d.schedule,'time':d.time,
      'zone':d.zone,'meeting-id':d.meetingId,'passcode':d.passcode,'password':d.password
    };
    for (const [id,value] of Object.entries(from)) $(id).value = value;
    const themeOption = document.querySelector(`input[name="theme"][value="${d.theme}"]`);
    if (themeOption) themeOption.checked = true;
    $('meeting-id').dataset.manual = d.meetingId ? 'true' : '';
    $('public-consent').checked = false;
    $('load-message').textContent = 'Loaded! Update anything you like, then create a new link below.';
    resetIfEdited();
    $('room-name').focus();
  } catch (_) {
    $('load-message').textContent = 'Could not read that link. Paste the full RoomLink meeting URL (the one with /r/ in it).';
  }
});
$('room-form').addEventListener('submit', async (event) => {
  event.preventDefault();
  const d = getDetails();
  if (!allowedZoomUrl(d.zoom)) {
    $('form-message').textContent = 'Please paste a complete, secure Zoom meeting URL (zoom.us or zoom.com).';
    $('zoom-url').focus();
    return;
  }
  if (!$('public-consent').checked) {
    $('form-message').textContent = 'Please confirm that you understand the details will be public.';
    return;
  }
  const code = encodeRoom(d);
  let link = `${location.origin}/r/${code}`;
  const button = $('create-btn');
  button.disabled = true;
  button.textContent = 'Creating your short link…';
  try {
    const response = await fetch('/api/shorten', {
      method:'POST', headers:{'Content-Type':'application/json'},
      body: JSON.stringify({code})
    });
    const result = await response.json();
    if (!response.ok || !result.url) throw Error(result.error || 'Short links are unavailable');
    link = result.url;
    $('form-message').textContent = 'Your short RoomLink is ready!';
  } catch (err) {
    $('form-message').textContent = 'Short links are unavailable right now. Your full-length meeting link still works.';
  } finally {
    button.disabled = false;
    button.innerHTML = 'Create my RoomLink <span>↗</span>';
  }
  $('share-url').value = link;
  $('whatsapp-button').href = 'https://wa.me/?text=' + encodeURIComponent(link);
  $('test-button').href = link;
  const shareId = link.slice(link.lastIndexOf('/') + 1);
  $('download-card').href = `${location.origin}/og/${shareId}`;
  $('result-panel').hidden = false;
  if (location.protocol === 'file:') {
    $('form-message').textContent = 'This is the local demo. Publish the project to Vercel first to create working public links.';
  }
  $('result-panel').scrollIntoView({behavior:'smooth',block:'nearest'});
});
async function copyText(value, fallbackInput) {
  if (navigator.clipboard && window.isSecureContext) {
    try { await navigator.clipboard.writeText(value); return true; } catch (_) { /* fallback below */ }
  }
  if (fallbackInput) {
    fallbackInput.focus(); fallbackInput.select();
    try { return document.execCommand('copy'); } catch (_) { return false; }
  }
  // Create a temporary input for older mobile browsers.
  const temp = document.createElement('textarea');
  temp.value = value; temp.style.position='fixed'; temp.style.opacity='0';
  document.body.append(temp); temp.select();
  try { return document.execCommand('copy'); }
  catch (_) { return false; }
  finally { temp.remove(); }
}
$('copy-button').addEventListener('click',async () => {
  const ok = await copyText($('share-url').value,$('share-url'));
  $('copy-button').textContent = ok ? 'Copied ✓' : 'Select & copy';
  $('share-feedback').textContent = ok ? 'Meeting link copied.' : 'Select the link above and copy it manually.';
  setTimeout(()=> $('copy-button').textContent='Copy',2300);
});
$('copy-invite').addEventListener('click',async()=>{
  const d = getDetails();
  const lines = [d.name,`${d.schedule} · ${prettyTime(d.time)} ${abbr[d.zone]||d.zone}`,
    d.meetingId ? `Meeting ID: ${d.meetingId}` : '',d.passcode ? `Passcode: ${d.passcode}` : '',
    d.password ? `Room password: ${d.password}` : '',`Join here: ${$('share-url').value}`].filter(Boolean);
  const ok = await copyText(lines.join('\n'));
  $('share-feedback').textContent = ok ? 'Full meeting invitation copied.' : 'Unable to copy on this browser. Try Copy above.';
});
if (navigator.share) {
  $('device-share').hidden=false;
  $('device-share').addEventListener('click', async()=>{
    try { await navigator.share({title:getDetails().name,url:$('share-url').value}); }
    catch (_) { /* dismissed by the user */ }
  });
}
updatePreview();
