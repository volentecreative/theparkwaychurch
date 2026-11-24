// Church calendar (iCal feed) -> Webflow CMS "Events" sync. Run by .github/workflows/sync-events.yml.
//
// Reads the church's public iCal feed (Church Community Builder's public calendar today; any
// provider that publishes an .ics feed works: Google, Outlook, Planning Center, iCloud), expands
// repeating events, then makes the Events collection match the upcoming events: creates new
// ones, updates changed ones, removes past, cancelled and deleted ones, and publishes what
// changed. Events typed into the CMS by hand (no Event ID) are left alone, so the site can mix
// both. Items are matched by the "Event ID" field (slug google-event-id, kept from the first
// version), so it is safe to run as often as you like; an unchanged calendar makes no writes.
//
// Env (secrets marked *):
//   EVENTS_ICAL_URL         the public .ics feed (webcal:// is fine)
//   WEBFLOW_TOKEN *         Webflow site API token with CMS read + write
//   WEBFLOW_COLLECTION_ID   the Events collection
//   EVENTS_DAYS_AHEAD       how far ahead to sync (default 120)
//   EVENTS_SKIP             optional regex; events whose title matches are left out (case-insensitive)
//   EVENTS_HOME             regex for the church's own address, left off the card's Details line
//                           so on-site events show a room ("Chapel") or nothing (default below)
//   EVENTS_TIMEZONE         display timezone, and for feed times with no zone (default America/Chicago)
//   EVENTS_DEMO             demo mode for designing the cards: 1 (= 6) or a number. Tops the list up
//                           to that many with the feed's recent past events moved forward by whole
//                           weeks (real titles, rooms and descriptions). Real upcoming events always
//                           come first. Unset it and the next run removes the demo items.
//   DRY_RUN=1               log what would change, write nothing

const env = process.env;
const TZ = env.EVENTS_TIMEZONE || 'America/Chicago';
const DAYS = Number(env.EVENTS_DAYS_AHEAD || 120);
const SKIP = env.EVENTS_SKIP ? new RegExp(env.EVENTS_SKIP, 'i') : null;
const DRY = env.DRY_RUN === '1';
const DEMO = !env.EVENTS_DEMO || env.EVENTS_DEMO === '0' || env.EVENTS_DEMO === 'false' ? 0
  : env.EVENTS_DEMO === '1' || env.EVENTS_DEMO === 'true' ? 6 : Math.max(0, Number(env.EVENTS_DEMO) || 0);
const HOME = new RegExp(env.EVENTS_HOME || '5600 Virginia|^The Parkway Church$|McKinney|TX 750', 'i');
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
  const location = (ev.location || '').replace(/\s+/g, ' ').trim();
  const time = timeText(ev);
  // On-site events: show the room ("Chapel") rather than the church's own address.
  const place = location.split(/\s*,\s*/).filter((part) => part && !HOME.test(part)).join(', ');
  // Recurring instances share a title, so the date and a bit of the id keep slugs unique.
  let h = 5381; for (const c of String(ev.id)) h = ((h * 33) ^ c.charCodeAt(0)) >>> 0;
  const id = h.toString(36);
  const date = (ev.start.date || ev.start.dateTime).slice(0, 10).replace(/-/g, '');
  return {
    name: name.slice(0, 256),
    slug: `${slugify(name)}-${date}-${id.slice(-6)}`,
    start: start.toISOString(),
    end: end ? end.toISOString() : null,
    'all-day': allDay,
    time,
    location,
    details: place ? `${time} · ${place}` : time,
    description: plain(ev.description).slice(0, 2000),
    'calendar-link': ev.htmlLink || null,
    'google-event-id': String(ev.id),
  };
}

/* ---------- iCal ---------- */

// Offset of a timezone from UTC at an instant, in ms.
function tzOffset(ms, tz) {
  const p = {};
  for (const { type, value } of new Intl.DateTimeFormat('en-US', {
    timeZone: tz, hourCycle: 'h23', year: 'numeric', month: 'numeric', day: 'numeric',
    hour: 'numeric', minute: 'numeric', second: 'numeric',
  }).formatToParts(new Date(ms))) p[type] = Number(value);
  return Date.UTC(p.year, p.month - 1, p.day, p.hour % 24, p.minute, p.second) - ms;
}
// A wall-clock time in a timezone -> the instant (ms).
function zoned(y, mo, d, h, mi, sec, tz) {
  const guess = Date.UTC(y, mo - 1, d, h, mi, sec);
  let ms = guess - tzOffset(guess, tz);
  ms = guess - tzOffset(ms, tz); // settle across a DST change
  return ms;
}

function unescape(v) {
  return v.replace(/\\n/gi, '\n').replace(/\\([,;\\])/g, '$1');
}

// "DTSTART;TZID=America/Chicago:20260201T090000" -> { date: true|false, y.., ms }
function parseWhen(params, value, tz) {
  const m = value.match(/^(\d{4})(\d{2})(\d{2})(?:T(\d{2})(\d{2})(\d{2})(Z)?)?$/);
  if (!m) return null;
  const [y, mo, d] = [+m[1], +m[2], +m[3]];
  if (!m[4] || /VALUE=DATE(?!-)/.test(params)) return { date: true, y, mo, d };
  const [h, mi, sec] = [+m[4], +m[5], +m[6]];
  const zone = (params.match(/TZID=([^;:]+)/) || [])[1];
  const ms = m[7] ? Date.UTC(y, mo - 1, d, h, mi, sec) : zoned(y, mo, d, h, mi, sec, zone || tz);
  return { date: false, y, mo, d, h, mi, sec, ms, tz: m[7] ? 'UTC' : zone || tz };
}

export function parseIcs(text) {
  const lines = text.replace(/\r\n/g, '\n').replace(/\n[ \t]/g, '').split('\n');
  const cal = { tz: null, events: [] };
  let ev = null;
  for (const line of lines) {
    if (line === 'BEGIN:VEVENT') { ev = { exdates: [] }; continue; }
    if (line === 'END:VEVENT') { cal.events.push(ev); ev = null; continue; }
    const i = line.indexOf(':'); if (i < 0) continue;
    const head = line.slice(0, i), value = line.slice(i + 1);
    const name = head.split(';')[0].toUpperCase(), params = head.slice(name.length);
    if (!ev) { if (name === 'X-WR-TIMEZONE') cal.tz = value.trim(); continue; }
    if (name === 'EXDATE') ev.exdates.push(...value.split(',').map((v) => [params, v.trim()]));
    else ev[name] = name === 'DTSTART' || name === 'DTEND' || name === 'RECURRENCE-ID' ? [params, value.trim()] : value;
  }
  return cal;
}

const DAY = 864e5, WD = ['SU', 'MO', 'TU', 'WE', 'TH', 'FR', 'SA'];
const ymd = (t) => { const d = new Date(t); return [d.getUTCFullYear(), d.getUTCMonth() + 1, d.getUTCDate()]; };
const pad = (n) => String(n).padStart(2, '0');

// Calendar days (as UTC-midnight ms) an RRULE produces, in order, from the first event's date.
function* ruleDays(rule, y, mo, d) {
  const r = Object.fromEntries(rule.split(';').map((kv) => kv.split('=')));
  const freq = r.FREQ, step = Math.max(1, +(r.INTERVAL || 1));
  const first = Date.UTC(y, mo - 1, d);
  const byday = r.BYDAY ? r.BYDAY.split(',').map((t) => { const m = t.match(/^([+-]?\d+)?([A-Z]{2})$/); return { n: m[1] ? +m[1] : 0, wd: WD.indexOf(m[2]) }; }) : null;
  const bymonthday = r.BYMONTHDAY ? r.BYMONTHDAY.split(',').map(Number) : null;
  for (let k = 0; k < 5000; k++) {
    let days = [];
    if (freq === 'DAILY') days = [first + k * step * DAY];
    else if (freq === 'WEEKLY') {
      const wkst = WD.indexOf(r.WKST || 'MO');
      const weekStart = first - ((new Date(first).getUTCDay() - wkst + 7) % 7) * DAY + k * step * 7 * DAY;
      const want = byday ? byday.map((b) => b.wd) : [new Date(first).getUTCDay()];
      for (let i = 0; i < 7; i++) { const t = weekStart + i * DAY; if (want.includes(new Date(t).getUTCDay())) days.push(t); }
    } else if (freq === 'MONTHLY' || freq === 'YEARLY') {
      const months = freq === 'MONTHLY' ? 1 : 12;
      const base = new Date(Date.UTC(y, mo - 1 + k * step * months, 1));
      const Y = base.getUTCFullYear(), M = base.getUTCMonth();
      const len = new Date(Date.UTC(Y, M + 1, 0)).getUTCDate();
      if (byday) {
        for (const b of byday) {
          const all = [];
          for (let dd = 1; dd <= len; dd++) if (new Date(Date.UTC(Y, M, dd)).getUTCDay() === b.wd) all.push(Date.UTC(Y, M, dd));
          if (!b.n) days.push(...all); else { const t = b.n > 0 ? all[b.n - 1] : all[all.length + b.n]; if (t) days.push(t); }
        }
      } else for (const md of bymonthday || [d]) { const dd = md > 0 ? md : len + md + 1; if (dd >= 1 && dd <= len) days.push(Date.UTC(Y, M, dd)); }
      days.sort((a, b) => a - b);
    } else { yield first; return; } // unsupported rule: just the first date
    for (const t of days) if (t >= first) yield t;
  }
}

// One VEVENT -> the instances (Google-Calendar-shaped, so toFields can stay as it is) between
// from and until.
export function instances(ev, calTz, from, until) {
  const tz = calTz || TZ;
  const s = parseWhen(ev.DTSTART[0], ev.DTSTART[1], tz); if (!s) return [];
  const e = ev.DTEND ? parseWhen(ev.DTEND[0], ev.DTEND[1], tz) : null;
  const dateStr = (t) => { const [Y, M, D] = ymd(t); return `${Y}-${pad(M)}-${pad(D)}`; };
  const len = s.date ? (e ? Math.round((Date.UTC(e.y, e.mo - 1, e.d) - Date.UTC(s.y, s.mo - 1, s.d)) / DAY) : 1) : e ? e.ms - s.ms : 0;
  const ex = new Set(ev.exdates.map(([p, v]) => { const w = parseWhen(p, v, s.tz || tz); return !w ? null : w.date ? `d${w.y}${pad(w.mo)}${pad(w.d)}` : w.ms; }));
  const rule = ev.RRULE ? Object.fromEntries(ev.RRULE.split(';').map((kv) => kv.split('='))) : {};
  const untilRule = rule.UNTIL ? parseWhen('', rule.UNTIL, s.tz || tz) : null;
  const untilMs = untilRule ? (untilRule.date ? Date.UTC(untilRule.y, untilRule.mo - 1, untilRule.d) + DAY - 1 : untilRule.ms) : Infinity;
  const count = rule.COUNT ? +rule.COUNT : Infinity;
  const out = [];
  const days = ev.RRULE ? ruleDays(ev.RRULE, s.y, s.mo, s.d) : [Date.UTC(s.y, s.mo - 1, s.d)];
  let n = 0;
  for (const day of days) {
    const [Y, M, D] = ymd(day);
    const startMs = s.date ? Date.UTC(Y, M - 1, D) : zoned(Y, M, D, s.h, s.mi, s.sec, s.tz);
    if (startMs > untilMs || n >= count) break;
    n++;
    const endMs = s.date ? startMs + len * DAY : startMs + len;
    if ((s.date ? endMs : Math.max(endMs, startMs + 1)) <= from || ex.has(startMs) || ex.has(`d${Y}${pad(M)}${pad(D)}`)) continue;
    if (startMs > until) break;
    const key = s.date ? `${Y}${pad(M)}${pad(D)}` : `${Y}${pad(M)}${pad(D)}T${pad(s.h)}${pad(s.mi)}`;
    out.push({
      id: ev.RRULE ? `${ev.UID}_${key}` : ev.UID,
      summary: unescape(ev.SUMMARY || ''),
      location: unescape(ev.LOCATION || ''),
      description: unescape(ev.DESCRIPTION || '').replace(/^Group:[^\n]*\n?/, ''),
      htmlLink: ev.URL || null,
      start: s.date ? { date: dateStr(startMs) } : { dateTime: new Date(startMs).toISOString() },
      end: s.date ? { date: dateStr(endMs) } : { dateTime: new Date(endMs).toISOString() },
      status: (ev.STATUS || '').toLowerCase(),
      recurrenceKey: key,
    });
  }
  return out;
}

export function upcoming(text, now = Date.now()) {
  const cal = parseIcs(text);
  const until = now + DAYS * DAY;
  const all = [], moved = new Map();
  for (const ev of cal.events) {
    if (ev['RECURRENCE-ID']) { // a single changed occurrence of a repeating event
      const w = parseWhen(ev['RECURRENCE-ID'][0], ev['RECURRENCE-ID'][1], cal.tz || TZ);
      if (w) moved.set(`${ev.UID}_${w.date ? `${w.y}${pad(w.mo)}${pad(w.d)}` : `${w.y}${pad(w.mo)}${pad(w.d)}T${pad(w.h)}${pad(w.mi)}`}`, ev);
      continue;
    }
    all.push(...instances(ev, cal.tz, now, until));
  }
  const out = [];
  for (const inst of all) {
    const o = moved.get(inst.id);
    if (o) {
      const [r] = instances({ ...o, RRULE: undefined }, cal.tz, now, until);
      if (r) out.push({ ...r, id: inst.id });
    } else out.push(inst);
  }
  return out
    .filter((ev) => ev.status !== 'cancelled' && !(SKIP && SKIP.test(ev.summary)))
    .sort((a, b) => new Date(a.start.dateTime || a.start.date) - new Date(b.start.dateTime || b.start.date));
}

// "20261115T123000" + 21 days -> "20261206T123000" (wall clock kept, so DST can't move the hour)
function shiftDays(value, days) {
  const m = value.match(/^(\d{4})(\d{2})(\d{2})(.*)$/);
  if (!m) return value;
  const d = new Date(Date.UTC(+m[1], +m[2] - 1, +m[3] + days));
  return `${d.getUTCFullYear()}${pad(d.getUTCMonth() + 1)}${pad(d.getUTCDate())}${m[4]}`;
}

// Demo mode: up to `count` sample events made from the feed's most recent past one-off events
// (one per title), each moved forward by whole weeks so it keeps its weekday and time and lands
// about a week after the previous one. Ids start with "demo:" so they never collide with real ones.
export function demo(text, count, now = Date.now()) {
  if (count <= 0) return [];
  const cal = parseIcs(text);
  const past = [];
  for (const ev of cal.events) {
    if (ev.RRULE || ev['RECURRENCE-ID'] || !ev.DTSTART || (ev.STATUS || '').toLowerCase() === 'cancelled') continue;
    const [inst] = instances(ev, cal.tz, -Infinity, Infinity);
    if (!inst || (SKIP && SKIP.test(inst.summary))) continue;
    const t = new Date(inst.start.dateTime || inst.start.date + 'T12:00:00Z').getTime();
    if (t < now) past.push({ ev, t, title: inst.summary.replace(/\([^)]*\)/g, '').trim().toLowerCase() }); // "Membership Class (11/15/26)" = one title
  }
  past.sort((a, b) => b.t - a.t);
  const seen = new Set(), out = [];
  for (const p of past) {
    if (out.length >= count) break;
    if (seen.has(p.title)) continue;
    seen.add(p.title);
    const target = now + (out.length + 1) * 7 * DAY;
    const weeks = Math.max(1, Math.round((target - p.t) / (7 * DAY)));
    const shifted = { ...p.ev,
      DTSTART: [p.ev.DTSTART[0], shiftDays(p.ev.DTSTART[1], weeks * 7)],
      DTEND: p.ev.DTEND && [p.ev.DTEND[0], shiftDays(p.ev.DTEND[1], weeks * 7)] };
    const [inst] = instances(shifted, cal.tz, now, Infinity);
    if (inst) out.push({ ...inst, id: `demo:${inst.id}_${inst.recurrenceKey}`, htmlLink: null });
  }
  return out;
}

async function calendarEvents() {
  const url = need('EVENTS_ICAL_URL').replace(/^webcal:/i, 'https:');
  const res = await fetch(url);
  if (!res.ok) throw new Error(`Calendar feed ${res.status}: ${(await res.text()).slice(0, 300)}`);
  const text = await res.text();
  const real = upcoming(text);
  const fill = demo(text, DEMO - real.length);
  if (fill.length) console.log(`EVENTS_DEMO is on: adding ${fill.length} demo event(s). Unset it before launch.`);
  return real.concat(fill)
    .sort((a, b) => new Date(a.start.dateTime || a.start.date) - new Date(b.start.dateTime || b.start.date));
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
  const events = await calendarEvents();
  const items = await webflowItems(cid);
  const byGid = new Map();
  const strays = []; // duplicates of an id: not ours to keep
  const handmade = []; // no Event ID: added in the CMS by hand, so never touched here
  for (const it of items) {
    const gid = it.fieldData?.['google-event-id'];
    if (!gid) handmade.push(it);
    else if (byGid.has(gid)) strays.push(it); else byGid.set(gid, it);
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
  const remove = items.filter((it) => !keep.has(it.id) && !strays.includes(it) && !handmade.includes(it)).concat(strays);

  console.log(`Calendar: ${events.length} upcoming. Webflow: ${items.length} items (${handmade.length} added by hand, left alone). ` +
    `Create ${create.length}, update ${update.length}, remove ${remove.length}.`);
  for (const f of create) console.log('  + ' + f.slug + (f['google-event-id'].startsWith('demo:') ? ' (demo)' : ''));
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
