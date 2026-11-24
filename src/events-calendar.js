/* Events month calendar. Why custom code: Webflow can't lay a Collection List out as a month
   grid (empty days, weeks, moving between months).

   The events come from a normal Collection List of the Events CMS collection, so the calendar
   works with whatever fills that collection: the iCal sync (any provider that publishes a feed:
   CCB, Google, Outlook, Planning Center, iCloud...) or events typed into the CMS by hand.
   Each Collection Item carries:
     vci-calendar="event"  vci-event-start="<Start>"  vci-event-end="<End>"  vci-event-time="<Time>"
   (dates bound to the CMS fields, as Webflow prints them, e.g. "November 29, 2026"; End and Time
   are optional) and a heading with the event name.

   Everything visible is built and styled in Webflow; this only copies and fills it:
     [vci-calendar="component"]
       [vci-calendar="title"]                     month name is written here
       [vci-calendar="prev" | "next" | "today"]   month buttons (get is-disabled at the ends)
       [vci-calendar="grid"]
         [vci-calendar="day"]                     ONE day, copied for every day shown. Gets the
                                                  combos is-outside (other month) and is-today.
           [vci-calendar="day-number"]
           [vci-calendar="day-dot"]               kept only on days with events (the phone view)
           [vci-calendar="day-events"]
             [vci-calendar="chip"]                ONE event chip, copied per event that day
               [vci-calendar="chip-time"] [vci-calendar="chip-title"]
   Choosing a chip, or a day with events, scrolls to that event in the list and gives it the
   combo is-highlighted for a moment. Events that have already ended are hidden from the list.
   Months run from this month to the month of the last event. */
(function () {
  var comp = document.querySelector('[vci-calendar="component"]');
  if (!comp) return;
  function q(root, name) { return root.querySelector('[vci-calendar="' + name + '"]'); }
  var grid = q(comp, 'grid'), dayTpl = grid && q(grid, 'day');
  if (!dayTpl) return;
  var chipTpl = q(dayTpl, 'chip');
  if (chipTpl) chipTpl.parentNode.removeChild(chipTpl);
  dayTpl.parentNode.removeChild(dayTpl);

  var MONTHS = ['january', 'february', 'march', 'april', 'may', 'june', 'july', 'august',
    'september', 'october', 'november', 'december'];
  // A calendar day as a number, yyyymmdd, so days compare and sort simply.
  function key(y, m, d) { return y * 10000 + (m + 1) * 100 + d; }
  function parse(v) {
    v = (v || '').trim();
    var m = v.match(/^(\d{4})-(\d{2})-(\d{2})/);
    if (m) return key(+m[1], m[2] - 1, +m[3]);
    m = v.match(/([A-Za-z]+)\.?\s+(\d{1,2}),?\s+(\d{4})/);
    if (m) {
      var mi = -1, name = m[1].toLowerCase();
      for (var i = 0; i < 12; i++) if (MONTHS[i].indexOf(name.slice(0, 3)) === 0) { mi = i; break; }
      if (mi >= 0) return key(+m[3], mi, +m[2]);
    }
    var t = new Date(v);
    return isNaN(t) ? 0 : key(t.getFullYear(), t.getMonth(), t.getDate());
  }
  function fromKey(k) { return new Date(Math.floor(k / 10000), Math.floor(k / 100) % 100 - 1, k % 100); }

  var now = new Date(), today = key(now.getFullYear(), now.getMonth(), now.getDate());
  var reduce = window.matchMedia && matchMedia('(prefers-reduced-motion: reduce)').matches;

  // Events from the Collection List, in list order (sorted by Start in Webflow).
  var byDay = {}, last = today, n = 0;
  Array.prototype.forEach.call(document.querySelectorAll('[vci-calendar="event"]'), function (el) {
    var start = parse(el.getAttribute('vci-event-start'));
    if (!start) return;
    var end = Math.max(start, parse(el.getAttribute('vci-event-end')) || start);
    if (end < today) { el.style.display = 'none'; return; }
    if (!el.id) el.id = 'event-' + start + '-' + (++n);
    var head = el.querySelector('h1, h2, h3, h4, h5, h6');
    var ev = { el: el, title: (head || el).textContent.trim(), time: (el.getAttribute('vci-event-time') || '').trim() };
    // Every day the event covers (capped, in case of a bad end date).
    for (var d = fromKey(start), i = 0; i < 62; i++, d.setDate(d.getDate() + 1)) {
      var k = key(d.getFullYear(), d.getMonth(), d.getDate());
      if (k > end) break;
      (byDay[k] = byDay[k] || []).push(ev);
    }
    if (end > last) last = end;
  });

  function show(ev) {
    var el = ev.el;
    el.setAttribute('tabindex', '-1');
    el.scrollIntoView({ behavior: reduce ? 'auto' : 'smooth', block: 'center' });
    try { el.focus({ preventScroll: true }); } catch (e) { el.focus(); }
    el.classList.add('is-highlighted');
    clearTimeout(el.__hl);
    el.__hl = setTimeout(function () { el.classList.remove('is-highlighted'); }, 2500);
  }

  var minMonth = now.getFullYear() * 12 + now.getMonth();
  var maxMonth = Math.floor(last / 10000) * 12 + Math.floor(last / 100) % 100 - 1;
  var month = minMonth;
  var title = q(comp, 'title'), prev = q(comp, 'prev'), next = q(comp, 'next'), todayBtn = q(comp, 'today');
  var fmt = window.Intl ? new Intl.DateTimeFormat(undefined, { month: 'long', year: 'numeric' }) : null;
  var dayFmt = window.Intl ? new Intl.DateTimeFormat(undefined, { weekday: 'long', month: 'long', day: 'numeric' }) : null;

  function setEnabled(btn, on) {
    if (!btn) return;
    btn.classList.toggle('is-disabled', !on);
    btn.setAttribute('aria-disabled', on ? 'false' : 'true');
  }
  function fill(root, name, text) { var el = q(root, name); if (el) el.textContent = text; }

  function render() {
    var y = Math.floor(month / 12), m = month % 12;
    var first = new Date(y, m, 1), days = new Date(y, m + 1, 0).getDate();
    if (title) title.textContent = fmt ? fmt.format(first) : MONTHS[m] + ' ' + y;
    setEnabled(prev, month > minMonth);
    setEnabled(next, month < maxMonth);
    setEnabled(todayBtn, month !== minMonth);

    while (grid.firstChild) grid.removeChild(grid.firstChild);
    var lead = first.getDay(), cells = Math.ceil((lead + days) / 7) * 7;
    for (var i = 0; i < cells; i++) {
      var date = new Date(y, m, 1 - lead + i);
      var k = key(date.getFullYear(), date.getMonth(), date.getDate());
      var cell = dayTpl.cloneNode(true), list = byDay[k] || [];
      cell.removeAttribute('id');
      if (date.getMonth() !== m) cell.classList.add('is-outside');
      if (k === today) { cell.classList.add('is-today'); cell.setAttribute('aria-current', 'date'); }
      fill(cell, 'day-number', String(date.getDate()));
      var dot = q(cell, 'day-dot');
      if (dot) { if (list.length) dot.setAttribute('aria-hidden', 'true'); else dot.parentNode.removeChild(dot); }
      var holder = q(cell, 'day-events');
      if (holder && chipTpl) list.forEach(function (ev) {
        var chip = chipTpl.cloneNode(true);
        fill(chip, 'chip-time', ev.time);
        var t = q(chip, 'chip-time'); if (t && !ev.time) t.parentNode.removeChild(t);
        fill(chip, 'chip-title', ev.title);
        if (chip.tagName === 'A') chip.setAttribute('href', '#' + ev.el.id);
        chip.addEventListener('click', function (e) { e.preventDefault(); e.stopPropagation(); show(ev); });
        holder.appendChild(chip);
      });
      if (list.length) {
        // The whole day opens its first event: on phones the chips are hidden and only the dot shows.
        var label = (dayFmt ? dayFmt.format(date) : date.toDateString()) + ': ' +
          list.map(function (ev) { return ev.title; }).join(', ');
        cell.setAttribute('role', 'button');
        cell.setAttribute('tabindex', '0');
        cell.setAttribute('aria-label', label);
        (function (ev) {
          cell.addEventListener('click', function () { show(ev); });
          cell.addEventListener('keydown', function (e) {
            if (e.key === 'Enter' || e.key === ' ') { e.preventDefault(); show(ev); }
          });
        })(list[0]);
      }
      grid.appendChild(cell);
    }
  }

  function go(to) { return function (e) {
    e.preventDefault();
    var target = to();
    if (target < minMonth || target > maxMonth || target === month) return;
    month = target; render();
  }; }
  if (prev) prev.addEventListener('click', go(function () { return month - 1; }));
  if (next) next.addEventListener('click', go(function () { return month + 1; }));
  if (todayBtn) todayBtn.addEventListener('click', go(function () { return minMonth; }));
  render();
})();
