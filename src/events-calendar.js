/* Events calendar. Why custom code: Webflow can't lay a Collection List out as a calendar
   (empty days, weeks, paging through dates).

   The events come from a normal Collection List of the Events CMS collection, so the calendar
   works with whatever fills that collection: the iCal sync (any provider that publishes a feed:
   CCB, Google, Outlook, Planning Center, iCloud...) or events typed into the CMS by hand.
   Each Collection Item carries:
     vci-calendar="event"  vci-event-start="<Start>"  vci-event-end="<End>"  vci-event-time="<Time>"
   (dates bound to the CMS fields, as Webflow prints them, e.g. "November 29, 2026"; End and Time
   are optional) and a heading with the event name.

   The grid is a rolling window, not a calendar month: it starts on the Sunday of this week and
   shows 5 weeks (so at least 4 full weeks ahead of today), with the month named on the first
   day shown and on every 1st. Set vci-calendar-weeks="4" (or any number) on the component to
   change the window. The arrows page by a whole window; it never starts before this week, and
   stops at the last event.

   Everything visible is built and styled in Webflow; this only copies and fills it:
     [vci-calendar="component"]
       [vci-calendar="title"]                     date range is written here
       [vci-calendar="prev" | "next" | "today"]   paging buttons (get is-disabled at the ends)
       [vci-calendar="grid"]
         [vci-calendar="day"]                     ONE day, copied for every day shown. Gets the
                                                  combos is-past, is-today and is-month-start.
           [vci-calendar="day-month"]             kept only on the first day shown and on 1sts
           [vci-calendar="day-number"]
           [vci-calendar="day-dot"]               kept only on days with events (the phone view)
           [vci-calendar="day-events"]
             [vci-calendar="chip"]                ONE event chip, copied per event that day
               [vci-calendar="chip-time"] [vci-calendar="chip-title"]
   Choosing a chip, or a day with events, scrolls to that event in the list and gives it the
   combo is-highlighted for a moment.

   Anywhere on the page, items with vci-event-start whose event has ended are hidden, and a
   [vci-calendar="featured"] block (the "Coming up" list) is hidden when none of its items are
   left. */
(function () {
  var MONTHS = ['january', 'february', 'march', 'april', 'may', 'june', 'july', 'august',
    'september', 'october', 'november', 'december'];
  // A calendar day as a number, yyyymmdd, so days compare and sort simply.
  function key(y, m, d) { return y * 10000 + (m + 1) * 100 + d; }
  function dkey(d) { return key(d.getFullYear(), d.getMonth(), d.getDate()); }
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
    return isNaN(t) ? 0 : dkey(t);
  }
  function fromKey(k) { return new Date(Math.floor(k / 10000), Math.floor(k / 100) % 100 - 1, k % 100); }
  function addDays(d, n) { return new Date(d.getFullYear(), d.getMonth(), d.getDate() + n); }
  function q(root, name) { return root.querySelector('[vci-calendar="' + name + '"]'); }
  function hide(el) { el.style.display = 'none'; }

  var now = new Date(), today = dkey(now);

  // Ended events: hidden wherever they are listed.
  Array.prototype.forEach.call(document.querySelectorAll('[vci-event-start]'), function (el) {
    var start = parse(el.getAttribute('vci-event-start'));
    var end = Math.max(start, parse(el.getAttribute('vci-event-end')) || start);
    if (start && end < today) { hide(el); el.__ended = true; }
  });
  Array.prototype.forEach.call(document.querySelectorAll('[vci-calendar="featured"]'), function (block) {
    var items = block.querySelectorAll('[vci-event-start]'), left = 0;
    for (var i = 0; i < items.length; i++) if (!items[i].__ended) left++;
    if (!left) hide(block);
  });

  var comp = document.querySelector('[vci-calendar="component"]');
  if (!comp) return;
  var grid = q(comp, 'grid'), dayTpl = grid && q(grid, 'day');
  if (!dayTpl) return;
  var chipTpl = q(dayTpl, 'chip');
  if (chipTpl) chipTpl.parentNode.removeChild(chipTpl);
  dayTpl.parentNode.removeChild(dayTpl);
  var reduce = window.matchMedia && matchMedia('(prefers-reduced-motion: reduce)').matches;

  // Events from the Collection List, in list order (sorted by Start in Webflow).
  var byDay = {}, last = today, n = 0;
  Array.prototype.forEach.call(document.querySelectorAll('[vci-calendar="event"]'), function (el) {
    if (el.__ended) return;
    var start = parse(el.getAttribute('vci-event-start'));
    if (!start) return;
    var end = Math.max(start, parse(el.getAttribute('vci-event-end')) || start);
    if (!el.id) el.id = 'event-' + start + '-' + (++n);
    var head = el.querySelector('h1, h2, h3, h4, h5, h6');
    var ev = { el: el, title: (head || el).textContent.trim(), time: (el.getAttribute('vci-event-time') || '').trim() };
    // Every day the event covers (capped, in case of a bad end date).
    for (var d = fromKey(start), i = 0; i < 62; i++, d = addDays(d, 1)) {
      var k = dkey(d);
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

  var weeks = Math.max(1, parseInt(comp.getAttribute('vci-calendar-weeks'), 10) || 5);
  var first = addDays(now, -now.getDay()); // Sunday of this week
  var page = 0, lastPage = 0;
  while (dkey(addDays(first, (lastPage + 1) * weeks * 7)) <= last) lastPage++;

  var title = q(comp, 'title'), prev = q(comp, 'prev'), next = q(comp, 'next'), todayBtn = q(comp, 'today');
  var I = window.Intl;
  var monthFmt = I ? new I.DateTimeFormat(undefined, { month: 'short' }) : null;
  var rangeFmt = I ? new I.DateTimeFormat(undefined, { month: 'long', day: 'numeric' }) : null;
  var dayFmt = I ? new I.DateTimeFormat(undefined, { weekday: 'long', month: 'long', day: 'numeric' }) : null;
  function monthName(d) { return monthFmt ? monthFmt.format(d) : MONTHS[d.getMonth()].slice(0, 3); }
  function longDate(d) { return rangeFmt ? rangeFmt.format(d) : MONTHS[d.getMonth()] + ' ' + d.getDate(); }

  function setEnabled(btn, on) {
    if (!btn) return;
    btn.classList.toggle('is-disabled', !on);
    btn.setAttribute('aria-disabled', on ? 'false' : 'true');
  }
  function fill(root, name, text) { var el = q(root, name); if (el) el.textContent = text; }
  function drop(root, name) { var el = q(root, name); if (el) el.parentNode.removeChild(el); }

  function render() {
    var start = addDays(first, page * weeks * 7), days = weeks * 7, end = addDays(start, days - 1);
    if (title) title.textContent = longDate(start) + ' – ' + longDate(end) +
      (end.getFullYear() !== now.getFullYear() ? ', ' + end.getFullYear() : '');
    setEnabled(prev, page > 0);
    setEnabled(next, page < lastPage);
    setEnabled(todayBtn, page > 0);

    while (grid.firstChild) grid.removeChild(grid.firstChild);
    for (var i = 0; i < days; i++) {
      var date = addDays(start, i), k = dkey(date);
      var cell = dayTpl.cloneNode(true), list = byDay[k] || [];
      cell.removeAttribute('id');
      if (k < today) cell.classList.add('is-past');
      if (k === today) { cell.classList.add('is-today'); cell.setAttribute('aria-current', 'date'); }
      if (date.getDate() === 1) cell.classList.add('is-month-start');
      // Month name on the first day shown and wherever a new month begins.
      if (i === 0 || date.getDate() === 1) fill(cell, 'day-month', monthName(date));
      else drop(cell, 'day-month');
      fill(cell, 'day-number', String(date.getDate()));
      var dot = q(cell, 'day-dot');
      if (dot) { if (list.length) dot.setAttribute('aria-hidden', 'true'); else drop(cell, 'day-dot'); }
      var holder = q(cell, 'day-events');
      if (holder && chipTpl) list.forEach(function (ev) {
        var chip = chipTpl.cloneNode(true);
        if (ev.time) fill(chip, 'chip-time', ev.time); else drop(chip, 'chip-time');
        fill(chip, 'chip-title', ev.title);
        if (chip.tagName === 'A') chip.setAttribute('href', '#' + ev.el.id);
        chip.addEventListener('click', function (e) { e.preventDefault(); e.stopPropagation(); show(ev); });
        holder.appendChild(chip);
      });
      if (list.length) {
        // The whole day opens its first event: on phones the chips are hidden and only the dot shows.
        cell.setAttribute('role', 'button');
        cell.setAttribute('tabindex', '0');
        cell.setAttribute('aria-label', (dayFmt ? dayFmt.format(date) : date.toDateString()) + ': ' +
          list.map(function (ev) { return ev.title; }).join(', '));
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
    if (target < 0 || target > lastPage || target === page) return;
    page = target; render();
  }; }
  if (prev) prev.addEventListener('click', go(function () { return page - 1; }));
  if (next) next.addEventListener('click', go(function () { return page + 1; }));
  if (todayBtn) todayBtn.addEventListener('click', go(function () { return 0; }));
  render();
})();
