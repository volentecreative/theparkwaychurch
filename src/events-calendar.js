/* Church calendar. One Events Collection List is the source for everything:
   - every item with vci-event-start (+ vci-event-end): hidden once ended; its [vci-event="month"] /
     [vci-event="day"] date tile is filled; a [vci-event="toggle"] opens its [vci-event="details"]
     (removed when the body is empty).
   - [vci-calendar="upcoming"] list: shows only the next vci-calendar-limit events.
   - [vci-calendar="featured"]: hidden when none of its events are left.
   - .ics links become webcal:// so calendar apps subscribe.
   - [vci-calendar="component"]: month grid ([vci-calendar="month"] pane: title, prev, next, today,
     grid with one [vci-calendar="day"] template + [vci-calendar="chip"]) synced with the agenda
     ([vci-calendar="agenda"]: agenda-title, show-month, empty, and the event list itself).
     Picking a day narrows the agenda to it; [vci-calendar-view] buttons switch views on mobile
     (the month pane carries is-collapsed in agenda view). Day combos: is-outside, is-past,
     is-today, is-selected. */
(function () {
  var MONTHS = ['january', 'february', 'march', 'april', 'may', 'june', 'july', 'august', 'september', 'october', 'november', 'december'];
  function key(y, m, d) { return y * 10000 + (m + 1) * 100 + d; }
  function dkey(d) { return key(d.getFullYear(), d.getMonth(), d.getDate()); }
  function fromKey(k) { return new Date(Math.floor(k / 10000), Math.floor(k / 100) % 100 - 1, k % 100); }
  function addDays(d, n) { return new Date(d.getFullYear(), d.getMonth(), d.getDate() + n); }
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
  var shortMonth = fmt({ month: 'short' }), monthYear = fmt({ month: 'long', year: 'numeric' }), longDay = fmt({ weekday: 'long', month: 'long', day: 'numeric' });

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
    var toggle = $(el, '[vci-event="toggle"]'), details = $(el, '[vci-event="details"]');
    if (toggle && details) {
      if (!details.textContent.trim()) { toggle.remove(); details.remove(); }
      else toggle.addEventListener('click', function () {
        var open = details.classList.toggle('is-open');
        toggle.setAttribute('aria-expanded', open);
        toggle.textContent = open ? 'Hide details' : 'Details';
      });
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
  all(document, 'a[href*=".ics"]').forEach(function (a) {
    a.setAttribute('href', a.getAttribute('href').replace(/^https?:/i, 'webcal:'));
  });

  var comp = q(document, 'component');
  if (!comp) return;
  var grid = q(comp, 'grid'), dayTpl = grid && q(grid, 'day');
  if (!dayTpl) return;
  var chipTpl = q(dayTpl, 'chip');
  if (chipTpl) chipTpl.remove();
  dayTpl.remove();
  var monthPane = q(comp, 'month'), agenda = q(comp, 'agenda'), title = q(comp, 'title');
  var agendaTitle = q(comp, 'agenda-title'), showMonth = q(comp, 'show-month'), empty = q(comp, 'empty');
  var prev = q(comp, 'prev'), next = q(comp, 'next'), todayBtn = q(comp, 'today');

  var list = events.filter(function (ev) { return !ev.ended && ev.el.getAttribute('vci-calendar') === 'event'; });
  list.forEach(function (ev) { var h = $(ev.el, 'h1,h2,h3,h4,h5,h6'); ev.title = (h || ev.el).textContent.trim(); ev.time = (ev.el.getAttribute('vci-event-time') || '').trim(); });
  var lastEnd = list.reduce(function (m, ev) { return Math.max(m, ev.end); }, today);
  var view = new Date(now.getFullYear(), now.getMonth(), 1), selected = 0;
  var firstMonth = +view, lastMonth = +new Date(Math.floor(lastEnd / 10000), Math.floor(lastEnd / 100) % 100 - 1, 1);

  var holidayCache = {};
  function nth(y, m, wd, n) {
    if (n > 0) return dkey(new Date(y, m, 1 + (wd - new Date(y, m, 1).getDay() + 7) % 7 + (n - 1) * 7));
    var l = new Date(y, m + 1, 0); return dkey(new Date(y, m, l.getDate() - (l.getDay() - wd + 7) % 7));
  }
  function easter(y) {
    var a = y % 19, b = Math.floor(y / 100), c = y % 100, d = Math.floor(b / 4), e = b % 4;
    var f = Math.floor((b + 8) / 25), g = Math.floor((b - f + 1) / 3), h = (19 * a + b - d - g + 15) % 30;
    var i = Math.floor(c / 4), k = c % 4, l = (32 + 2 * e + 2 * i - h - k) % 7, m = Math.floor((a + 11 * h + 22 * l) / 451);
    var mo = Math.floor((h + l - 7 * m + 114) / 31);
    return new Date(y, mo - 1, (h + l - 7 * m + 114) % 31 + 1);
  }
  function holidays(y) {
    if (holidayCache[y]) return holidayCache[y];
    var e = easter(y), h = {};
    h[key(y, 0, 1)] = "New Year's Day"; h[key(y, 1, 14)] = "Valentine's Day";
    h[dkey(addDays(e, -7))] = 'Palm Sunday'; h[dkey(addDays(e, -2))] = 'Good Friday'; h[dkey(e)] = 'Easter Sunday';
    h[dkey(addDays(e, 49))] = 'Pentecost'; h[nth(y, 4, 0, 2)] = "Mother's Day"; h[nth(y, 4, 1, -1)] = 'Memorial Day';
    h[nth(y, 5, 0, 3)] = "Father's Day"; h[key(y, 6, 4)] = 'Independence Day'; h[nth(y, 8, 1, 1)] = 'Labor Day';
    h[key(y, 9, 31)] = 'Reformation Day'; h[nth(y, 10, 4, 4)] = 'Thanksgiving';
    h[key(y, 11, 24)] = 'Christmas Eve'; h[key(y, 11, 25)] = 'Christmas Day';
    return (holidayCache[y] = h);
  }
  function on(k) { return list.filter(function (ev) { return ev.start <= k && ev.end >= k; }); }
  function fill(root, name, text) { var el = q(root, name); if (el) { if (text) el.textContent = text; else el.remove(); } }
  function setEnabled(btn, ok) { if (btn) { btn.classList.toggle('is-disabled', !ok); btn.setAttribute('aria-disabled', !ok); } }

  function render() {
    var y = view.getFullYear(), mo = view.getMonth(), first = new Date(y, mo, 1);
    var start = addDays(first, -first.getDay()), cells = Math.ceil((first.getDay() + new Date(y, mo + 1, 0).getDate()) / 7) * 7;
    if (title) title.textContent = monthYear.format(first);
    setEnabled(prev, +view > firstMonth); setEnabled(next, +view < lastMonth); setEnabled(todayBtn, +view !== firstMonth);
    grid.textContent = '';
    for (var i = 0; i < cells; i++) {
      var date = addDays(start, i), k = dkey(date), evs = on(k), cell = dayTpl.cloneNode(true);
      cell.classList.toggle('is-outside', date.getMonth() !== mo);
      cell.classList.toggle('is-past', k < today);
      cell.classList.toggle('is-today', k === today);
      cell.classList.toggle('is-selected', k === selected);
      fill(cell, 'day-month', '');
      fill(cell, 'day-number', String(date.getDate()));
      var holiday = holidays(date.getFullYear())[k];
      fill(cell, 'day-holiday', holiday);
      if (!evs.length) fill(cell, 'day-dot', '');
      var holder = q(cell, 'day-events');
      if (holder && chipTpl) evs.forEach(function (ev) {
        var chip = chipTpl.cloneNode(true);
        fill(chip, 'chip-time', ev.time);
        fill(chip, 'chip-title', ev.title);
        chip.addEventListener('click', function (e) { e.preventDefault(); e.stopPropagation(); select(k, ev); });
        holder.appendChild(chip);
      });
      cell.setAttribute('role', 'button');
      cell.setAttribute('tabindex', '0');
      cell.setAttribute('aria-pressed', k === selected);
      cell.setAttribute('aria-label', longDay.format(date) + (holiday ? ', ' + holiday : '') + (evs.length ? ': ' + evs.map(function (ev) { return ev.title; }).join(', ') : ''));
      (function (k) {
        cell.addEventListener('click', function () { select(k === selected ? 0 : k); });
        cell.addEventListener('keydown', function (e) { if (e.key === 'Enter' || e.key === ' ') { e.preventDefault(); select(k === selected ? 0 : k); } });
      })(k);
      grid.appendChild(cell);
    }
    var from = selected || key(y, mo, 1), to = selected || key(y, mo, new Date(y, mo + 1, 0).getDate()), shown = 0;
    list.forEach(function (ev) { var inRange = ev.start <= to && ev.end >= from; ev.el.style.display = inRange ? '' : 'none'; if (inRange) shown++; });
    if (agendaTitle) agendaTitle.textContent = selected ? longDay.format(fromKey(selected)) : monthYear.format(first);
    if (showMonth) showMonth.hidden = !selected;
    if (empty) empty.hidden = shown > 0;
  }
  function select(k, ev) {
    selected = k;
    render();
    if (ev && agenda) {
      var t = $(ev.el, '[vci-event="toggle"]');
      if (t && t.getAttribute('aria-expanded') !== 'true') t.click();
      agenda.scrollTop += ev.el.getBoundingClientRect().top - agenda.getBoundingClientRect().top;
    }
  }
  function go(month) { return function (e) { e.preventDefault(); if (month() < firstMonth || month() > lastMonth) return; view = new Date(month()); selected = 0; render(); }; }
  function shift(n) { return function () { return +new Date(view.getFullYear(), view.getMonth() + n, 1); }; }
  if (prev) prev.addEventListener('click', go(shift(-1)));
  if (next) next.addEventListener('click', go(shift(1)));
  if (todayBtn) todayBtn.addEventListener('click', go(function () { return firstMonth; }));
  if (showMonth) showMonth.addEventListener('click', function () { select(0); });

  var views = all(comp, '[vci-calendar-view]');
  views.forEach(function (btn) {
    btn.addEventListener('click', function () {
      var v = btn.getAttribute('vci-calendar-view');
      views.forEach(function (b) { var on = b === btn; b.classList.toggle('is-active', on); b.setAttribute('aria-pressed', on); });
      if (monthPane) monthPane.classList.toggle('is-collapsed', v === 'agenda');
    });
  });
  render();
})();
