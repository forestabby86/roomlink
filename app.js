'use strict';
const $ = (id) => document.getElementById(id);
const fields = ['room-name','zoom-url','schedule','time','zone','meeting-id','passcode','password'];
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
    passcode: $('passcode').value.trim(), password: $('password').value.trim()
  };
}
function prettyTime(time) {
  const [hour, minute] = String(time || '09:00').split(':').map(Number);
  if (!Number.isFinite(hour) || !Number.isFinite(minute)) return '9:00 AM';
  return `${hour%12||12}:${String(minute).padStart(2,'0')} ${hour>=12?'PM':'AM'}`;
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
function encodeRoom(d) {
  const payload = [1,d.name,d.schedule,d.time,d.zone,d.meetingId,d.passcode,d.password,d.zoom];
  const bytes = new TextEncoder().encode(JSON.stringify(payload));
  let binary = '';
  for (const byte of bytes) binary += String.fromCharCode(byte);
  return btoa(binary).replace(/\+/g,'-').replace(/\//g,'_').replace(/=+$/,'');
}
function updatePreview() {
  const d = getDetails();
  const time = `${prettyTime(d.time)} ${abbr[d.zone] || d.zone}`;
  $('preview-name').textContent = d.name || 'Your meeting name';
  $('preview-time').textContent = time;
  $('preview-schedule').textContent = d.schedule || 'Meeting days';
  $('caption-title').textContent = `${d.name || 'Your meeting name'} — ${time}`;
  $('caption-subtitle').textContent = [d.schedule || 'Meeting days', d.meetingId ? `Meeting ID ${d.meetingId}` : 'Meeting details'].join(' · ');
  const pairs = [["MEETING ID",d.meetingId],["PASSCODE",d.passcode],["ROOM PASSWORD",d.password]].filter((p)=>p[1]);
  if (!pairs.length) pairs.push(['MEETING ID','••• ••• ••••'],['PASSCODE','—']);
  const holder = $('image-fields');
  holder.replaceChildren();
  for (const [label, value] of pairs) {
    const item = document.createElement('div'); item.className='image-field';
    const l = document.createElement('small'); l.textContent=label;
    const val = document.createElement('strong'); val.textContent=value;
    item.append(l,val); holder.append(item);
  }
}
function resetIfEdited() {
  $('result-panel').hidden = true;
  $('form-message').textContent = '';
  updatePreview();
}
fields.forEach(id => $(id).addEventListener('input', resetIfEdited));
$('public-consent').addEventListener('change', () => $('form-message').textContent='');
$('zoom-url').addEventListener('input', ()=>{
  const url = $('zoom-url').value;
  if (!$('meeting-id').dataset.manual) {
    const hit = url.match(/\/j\/(\d{9,13})(?:\b|\/|\?)/);
    if (hit) $('meeting-id').value = hit[1];
  }
  updatePreview();
});
$('meeting-id').addEventListener('input',()=> $('meeting-id').dataset.manual='true');
$('room-form').addEventListener('submit', (event) => {
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
  const link = `${location.origin}/r/${code}`;
  $('share-url').value = link;
  $('whatsapp-button').href = 'https://wa.me/?text=' + encodeURIComponent(link);
  $('test-button').href = link;
  $('result-panel').hidden = false;
  $('form-message').textContent = '';
  if (location.protocol === 'file:') {
    $('form-message').textContent = 'This is the local demo. Publish the project to Vercel first to create working public links.';
  }
  $('result-panel').scrollIntoView({behavior:'smooth',block:'nearest'});
});
$('copy-button').addEventListener('click',async () => {
  const value = $('share-url').value;
  try { await navigator.clipboard.writeText(value); }
  catch (_) { $('share-url').select(); document.execCommand('copy'); }
  $('copy-button').textContent='Copied ✓';
  setTimeout(()=> $('copy-button').textContent='Copy',2000);
});
updatePreview();
