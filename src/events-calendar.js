/* Church calendar. One Events Collection List is the source for everything:
   - every item with vci-event-start (+ vci-event-end): hidden once ended; its [vci-event="month"] /
     [vci-event="day"] date tile is filled; its [vci-event="details"] is removed when the body is empty.
   - [vci-event="link"][vci-event-slug] (the event_card Small variant) links to /events#slug, the
     event's card in the full list (each item's id is its slug).
   - landing on /events#slug outlines that card for a moment (.is-highlighted).
   - [vci-calendar="upcoming"] list: shows only the next vci-calendar-limit events.
   - [vci-calendar="featured"]: hidden when none of its events are left.
   - .ics links become webcal:// so calendar apps subscribe.
   - Google Calendar subscribe links hand Apple devices the feed instead.
   - [vci-calendar="component"]: the /events upcoming list and its empty message. */
(function () {
  var MONTHS = ['january', 'february', 'march', 'april', 'may', 'june', 'july', 'august', 'september', 'october', 'november', 'december'];
  function key(y, m, d) { return y * 10000 + (m + 1) * 100 + d; }
  function dkey(d) { return key(d.getFullYear(), d.getMonth(), d.getDate()); }
  function fromKey(k) { return new Date(Math.floor(k / 10000), Math.floor(k / 100) % 100 - 1, k % 100); }
  function parse(v) {
    v = (v || '').trim();
    var m = v.match(/^(\d{4})-(\d{2})-(\d{2})/);
    if (m) return key(+m[1], m[2] - 1, +m[3]);
    m = v.match(/([A-Za-z]+)\.?\s+(\d{1,2}),?\s+(\d{4})/);
    if (m) for (var i = 0; i < 12; i++) if (MONTHS[i].indexOf(m[1].toLowerCase().slice(0, 3)) === 0) return key(+m[3], i, +m[2]);
    var t = new Date(v);
    return isNaN(t) ? 0 : dkey(t);
  }
  function $(root, sel) { return root.querySelector(sel); }
  function all(root, sel) { return Array.prototype.slice.call(root.querySelectorAll(sel)); }
  function q(root, name) { return $(root, '[vci-calendar="' + name + '"]'); }
  function fmt(opts) { return new Intl.DateTimeFormat(undefined, opts); }
  var shortMonth = fmt({ month: 'short' });

  var now = new Date(), today = dkey(now);

  // Every event, wherever it is listed.
  var events = all(document, '[vci-event-start]').map(function (el) {
    var start = parse(el.getAttribute('vci-event-start'));
    var end = Math.max(start, parse(el.getAttribute('vci-event-end')) || start);
    var ev = { el: el, start: start, end: end, ended: !start || end < today };
    if (ev.ended) { el.style.display = 'none'; return ev; }
    var d = fromKey(start), m = $(el, '[vci-event="month"]'), day = $(el, '[vci-event="day"]');
    if (m) m.textContent = shortMonth.format(d);
    if (day) day.textContent = d.getDate();
    var details = $(el, '[vci-event="details"]');
    if (details && !details.textContent.trim()) details.remove();
    var link = $(el, '[vci-event="link"][vci-event-slug]');
    if (link) {
      var slug = link.getAttribute('vci-event-slug').trim();
      if (slug) link.setAttribute('href', (link.getAttribute('href') || '/events').split('#')[0] + '#' + encodeURIComponent(slug));
    }
    return ev;
  });

  all(document, '[vci-calendar="upcoming"]').forEach(function (list) {
    var n = parseInt(list.getAttribute('vci-calendar-limit'), 10) || 4;
    all(list, '[vci-event-start]').forEach(function (el) {
      if (el.style.display !== 'none' && n-- <= 0) el.style.display = 'none';
    });
  });
  all(document, '[vci-calendar="featured"]').forEach(function (block) {
    if (!all(block, '[vci-event-start]').some(function (el) { return el.style.display !== 'none'; })) block.style.display = 'none';
  });
  all(document, 'a[href*=".ics"]').forEach(function (a) { // the feed itself, not a link that carries it (Google's cid=)
    var href = a.getAttribute('href');
    if (/^https?:\/\/[^?#]*\.ics(?:[?#]|$)/i.test(href)) a.setAttribute('href', href.replace(/^https?:/i, 'webcal:'));
  });

  // "Add to your calendar" points at Google Calendar's subscribe page (works anywhere, no script needed). Apple
  // devices get the feed itself instead, so Apple Calendar subscribes: iPhone, iPad, and Safari on a Mac.
  var ua = navigator.userAgent;
  var ios = /iPhone|iPad|iPod/.test(ua) || (/Macintosh/.test(ua) && navigator.maxTouchPoints > 1);
  var macSafari = /Macintosh/.test(ua) && /Safari/.test(ua) && !/Chrome|Chromium|Edg|Firefox|OPR/.test(ua);
  if (ios || macSafari) all(document, 'a[href*="calendar.google.com/calendar/render"][href*="cid="]').forEach(function (a) {
    var feed = new URL(a.href).searchParams.get('cid');
    if (!/^webcal:/i.test(feed || '')) return;
    a.setAttribute('href', feed);
    a.removeAttribute('target');
  });

  // /events#slug (from a Small card): outline that event's card once it has scrolled into view.
  function landOn() {
    var id = decodeURIComponent(location.hash.slice(1));
    var target = id && document.getElementById(id);
    if (!target || !target.hasAttribute('vci-event-start') || target.style.display === 'none') return;
    target.classList.remove('is-highlighted');
    void target.offsetWidth; // restart if it was already lit
    target.classList.add('is-highlighted');
    clearTimeout(landOn.t);
    landOn.t = setTimeout(function () { target.classList.remove('is-highlighted'); }, 2400);
  }
  landOn();
  window.addEventListener('hashchange', landOn);

  // [vci-calendar="component"]: the full upcoming list; [vci-calendar="empty"] shows when nothing is left.
  var comp = q(document, 'component');
  if (!comp) return;
  var empty = q(comp, 'empty');
  if (empty) empty.hidden = events.some(function (ev) { return !ev.ended && comp.contains(ev.el); });
})();
