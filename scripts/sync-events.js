// Google Calendar -> Webflow CMS "Events" sync. Run by .github/workflows/sync-events.yml.
//
// Reads the church's public Google Calendar, then makes the Events collection match the
// upcoming events: creates new ones, updates changed ones, removes past, cancelled and deleted
// ones, and publishes what changed. Items are matched by the "Google event ID" field, so it is
// safe to run as often as you like; an unchanged calendar makes no writes.
//
// Env (secrets marked *):
//   GOOGLE_API_KEY *        API key with the Google Calendar API enabled
//   GOOGLE_CALENDAR_ID      e.g. abc123@group.calendar.google.com (calendar must be public)
//   WEBFLOW_TOKEN *         Webflow site API token with CMS read + write
//   WEBFLOW_COLLECTION_ID   the Events collection
//   EVENTS_DAYS_AHEAD       how far ahead to sync (default 120)
//   EVENTS_SKIP             optional regex; events whose title matches are left out (case-insensitive)
//   EVENTS_TIMEZONE         display timezone for the Time text (default America/Chicago)
//   DRY_RUN=1               log what would change, write nothing

const env = process.env;
const TZ = env.EVENTS_TIMEZONE || 'America/Chicago';
const DAYS = Number(env.EVENTS_DAYS_AHEAD || 120);
const SKIP = env.EVENTS_SKIP ? new RegExp(env.EVENTS_SKIP, 'i') : null;
const DRY = env.DRY_RUN === '1';
const WF = 'https://api.webflow.com/v2';

function need(name) {
  if (!env[name]) throw new Error(`Missing ${name}`);
  return env[name];
}

/* ---------- formatting ---------- */

// Parts of an instant in the display timezone.
function parts(date) {
  const p = {};
  for (const { type, value } of new Intl.DateTimeFormat('en-US', {
    timeZone: TZ, year: 'numeric', month: 'short', day: 'numeric', weekday: 'short',
    hour: 'numeric', minute: '2-digit', hour12: true,
  }).formatToParts(date)) p[type] = value;
  return p;
}
// "6pm", "6:30pm"
function clock(p, withMeridiem = true) {
  const m = p.minute === '00' ? '' : ':' + p.minute;
  return p.hour + m + (withMeridiem ? p.dayPeriod.toLowerCase() : '');
}
const sameDay = (a, b) => a.year === b.year && a.month === b.month && a.day === b.day;

// All-day dates have no time. Store them at noon in the display timezone so Webflow's date
// formatting can never tip them onto the day before or after.
function noonOn(ymd) {
  const [y, m, d] = ymd.split('-').map(Number);
  const guess = new Date(Date.UTC(y, m - 1, d, 12));
  const local = parts(guess);
  const h = (Number(local.hour) % 12) + (local.dayPeriod === 'PM' ? 12 : 0);
  return new Date(guess.getTime() + (12 - h) * 3600e3);
}
function minusDay(ymd) {
  const d = new Date(ymd + 'T00:00:00Z'); d.setUTCDate(d.getUTCDate() - 1);
  return d.toISOString().slice(0, 10);
}

export function timeText(ev) {
  if (ev.start.date) {
    const last = minusDay(ev.end?.date || ev.start.date); // Google's all-day end is exclusive
    if (last <= ev.start.date) return 'All day';
    const e = parts(noonOn(last));
    return `Through ${e.weekday}, ${e.month} ${e.day}`;
  }
  const s = parts(new Date(ev.start.dateTime));
  if (!ev.end?.dateTime) return clock(s);
  const e = parts(new Date(ev.end.dateTime));
  if (!sameDay(s, e)) return clock(s);
  if (s.hour === e.hour && s.minute === e.minute) return clock(s);
  // "6:30–8pm" when both share am/pm, else "11am–1pm"
  return clock(s, s.dayPeriod !== e.dayPeriod) + '–' + clock(e);
}

function plain(html) {
  return String(html || '')
    .replace(/<br\s*\/?>/gi, '\n').replace(/<\/(p|div|li)>/gi, '\n').replace(/<[^>]+>/g, '')
    .replace(/&nbsp;/g, ' ').replace(/&amp;/g, '&').replace(/&lt;/g, '<').replace(/&gt;/g, '>')
    .replace(/&quot;/g, '"').replace(/&#39;/g, "'")
    .replace(/[ \t]+\n/g, '\n').replace(/\n{3,}/g, '\n\n').trim();
}

function slugify(s) {
  return s.normalize('NFKD').replace(/[̀-ͯ]/g, '').toLowerCase()
    .replace(/[^a-z0-9]+/g, '-').replace(/^-+|-+$/g, '').slice(0, 60).replace(/-+$/, '') || 'event';
}

// One Google event -> Webflow fieldData.
export function toFields(ev) {
  const allDay = !!ev.start.date;
  const start = allDay ? noonOn(ev.start.date) : new Date(ev.start.dateTime);
  const end = allDay ? noonOn(minusDay(ev.end?.date || ev.start.date))
    : ev.end?.dateTime ? new Date(ev.end.dateTime) : null;
  const name = (ev.summary || 'Untitled event').trim();
  const location = (ev.location || '').trim();
  const time = timeText(ev);
  // Recurring instances share a title, so the date and a bit of the id keep slugs unique.
  const id = String(ev.id).replace(/[^a-z0-9]/gi, '').toLowerCase();
  const date = (ev.start.date || ev.start.dateTime).slice(0, 10).replace(/-/g, '');
  return {
    name: name.slice(0, 256),
    slug: `${slugify(name)}-${date}-${id.slice(-6)}`,
    start: start.toISOString(),
    end: end ? end.toISOString() : null,
    'all-day': allDay,
    time,
    location,
    details: location ? `${time} · ${location}` : time,
    description: plain(ev.description).slice(0, 2000),
    'calendar-link': ev.htmlLink || null,
    'google-event-id': String(ev.id),
  };
}

/* ---------- Google ---------- */

async function googleEvents() {
  const now = new Date();
  const until = new Date(now.getTime() + DAYS * 864e5);
  const out = [];
  let pageToken;
  do {
    const q = new URLSearchParams({
      key: need('GOOGLE_API_KEY'), singleEvents: 'true', orderBy: 'startTime',
      timeMin: now.toISOString(), timeMax: until.toISOString(), maxResults: '250',
    });
    if (pageToken) q.set('pageToken', pageToken);
    const url = `https://www.googleapis.com/calendar/v3/calendars/${encodeURIComponent(need('GOOGLE_CALENDAR_ID'))}/events?${q}`;
    const res = await fetch(url);
    if (!res.ok) throw new Error(`Google Calendar ${res.status}: ${(await res.text()).slice(0, 500)}`);
    const body = await res.json();
    out.push(...(body.items || []));
    pageToken = body.nextPageToken;
  } while (pageToken);
  return out.filter((ev) => ev.status !== 'cancelled' && !(SKIP && SKIP.test(ev.summary || '')));
}

/* ---------- Webflow ---------- */

async function wf(method, path, body) {
  for (let attempt = 0; ; attempt++) {
    const res = await fetch(WF + path, {
      method,
      headers: { authorization: `Bearer ${need('WEBFLOW_TOKEN')}`, 'content-type': 'application/json', accept: 'application/json' },
      body: body ? JSON.stringify(body) : undefined,
    });
    if (res.status === 429 && attempt < 5) {
      const wait = Number(res.headers.get('retry-after') || 5);
      await new Promise((r) => setTimeout(r, wait * 1000));
      continue;
    }
    const text = await res.text();
    if (!res.ok) {
      const err = new Error(`Webflow ${method} ${path} ${res.status}: ${text.slice(0, 500)}`);
      err.status = res.status;
      throw err;
    }
    return text ? JSON.parse(text) : {};
  }
}

async function webflowItems(cid) {
  const out = [];
  for (let offset = 0; ; offset += 100) {
    const body = await wf('GET', `/collections/${cid}/items?limit=100&offset=${offset}`);
    out.push(...(body.items || []));
    if (out.length >= (body.pagination?.total ?? 0) || !(body.items || []).length) return out;
  }
}

const chunks = (a, n) => Array.from({ length: Math.ceil(a.length / n) }, (_, i) => a.slice(i * n, i * n + n));

// Compare only the fields this sync owns, normalised the way Webflow returns them.
function differs(item, fields) {
  const have = item.fieldData || {};
  return Object.keys(fields).some((k) => {
    let a = have[k], b = fields[k];
    if (k === 'start' || k === 'end') { a = a ? new Date(a).getTime() : null; b = b ? new Date(b).getTime() : null; }
    if (k === 'all-day') { a = !!a; b = !!b; }
    if (a === undefined || a === '') a = null;
    if (b === undefined || b === '') b = null;
    return a !== b;
  });
}

/* ---------- sync ---------- */

export async function sync() {
  const cid = need('WEBFLOW_COLLECTION_ID');
  const events = await googleEvents();
  const items = await webflowItems(cid);
  const byGid = new Map();
  const strays = []; // items without an id, or duplicates: not ours to keep
  for (const it of items) {
    const gid = it.fieldData?.['google-event-id'];
    if (!gid || byGid.has(gid)) strays.push(it); else byGid.set(gid, it);
  }

  const create = [], update = [];
  const keep = new Set();
  for (const ev of events) {
    const fields = toFields(ev);
    const item = byGid.get(fields['google-event-id']);
    if (!item) { create.push(fields); continue; }
    keep.add(item.id);
    if (differs(item, fields) || item.isDraft) update.push({ id: item.id, fields });
  }
  const remove = items.filter((it) => !keep.has(it.id) && !strays.includes(it)).concat(strays);

  console.log(`Calendar: ${events.length} upcoming. Webflow: ${items.length} items. ` +
    `Create ${create.length}, update ${update.length}, remove ${remove.length}.`);
  for (const f of create) console.log('  + ' + f.slug);
  for (const u of update) console.log('  ~ ' + u.fields.slug);
  for (const it of remove) console.log('  - ' + (it.fieldData?.slug || it.id));
  if (DRY) { console.log('DRY_RUN: nothing written.'); return { create, update, remove }; }

  const publish = [];
  for (const batch of chunks(create, 100)) {
    const body = await wf('POST', `/collections/${cid}/items`, {
      items: batch.map((fieldData) => ({ fieldData, isDraft: false, isArchived: false })),
    });
    for (const it of body.items || []) publish.push(it.id);
  }
  for (const batch of chunks(update, 100)) {
    await wf('PATCH', `/collections/${cid}/items`, {
      items: batch.map((u) => ({ id: u.id, fieldData: u.fields, isDraft: false, isArchived: false })),
    });
    publish.push(...batch.map((u) => u.id));
  }
  for (const batch of chunks(publish, 100)) {
    await wf('POST', `/collections/${cid}/items/publish`, { itemIds: batch });
  }
  for (const batch of chunks(remove, 100)) {
    const ids = batch.map((it) => ({ id: it.id }));
    // Take it off the published site first (fails harmlessly if it was never published).
    try { await wf('DELETE', `/collections/${cid}/items/live`, { items: ids }); }
    catch (e) { if (e.status !== 404 && e.status !== 409) throw e; }
    await wf('DELETE', `/collections/${cid}/items`, { items: ids });
  }
  console.log('Done.');
  return { create, update, remove };
}

if (import.meta.url === `file://${process.argv[1]}`) {
  sync().catch((e) => { console.error(e.message); process.exit(1); });
}
