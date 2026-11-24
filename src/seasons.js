/* Season wordmark. Seasons live in the CMS (Name, Start Month, End Month); a hidden list on the page
   carries one [vci-season="item"] per season with vci-season-name / -start / -end. From 7 days
   before a season starts, [vci-season="name"] shows it and [vci-season="qualifier"] reads
   "Begins December 1"; otherwise the current season shows and the qualifier is removed.
   Event lists are not affected. Runs before script-draw so the write-on draws the right word. */
(function () {
  var names = document.querySelectorAll('[vci-season="name"]');
  if (!names.length) return;
  var ABBR = ['jan', 'feb', 'mar', 'apr', 'may', 'jun', 'jul', 'aug', 'sep', 'oct', 'nov', 'dec'];
  function month(v) { v = (v || '').trim().toLowerCase(); var n = parseInt(v, 10); return n >= 1 && n <= 12 ? n - 1 : ABBR.indexOf(v.slice(0, 3)); }
  var seasons = Array.prototype.map.call(document.querySelectorAll('[vci-season="item"]'), function (it) {
    return { name: (it.getAttribute('vci-season-name') || '').trim(), s: month(it.getAttribute('vci-season-start')), e: month(it.getAttribute('vci-season-end')) };
  }).filter(function (x) { return x.name && x.s >= 0 && x.e >= 0; });
  function at(d) {
    var m = d.getMonth();
    for (var i = 0; i < seasons.length; i++) { var x = seasons[i]; if (x.s <= x.e ? m >= x.s && m <= x.e : m >= x.s || m <= x.e) return x; }
  }
  var now = new Date(), current = at(now), soon = at(new Date(now.getFullYear(), now.getMonth(), now.getDate() + 7));
  var show = soon || current, upcoming = soon && soon !== current;
  if (!show) return;
  Array.prototype.forEach.call(names, function (el) { if (el.textContent.trim() !== show.name) el.textContent = show.name; });
  var label = upcoming && 'Begins ' + new Intl.DateTimeFormat(undefined, { month: 'long' }).format(new Date(2000, show.s, 1)) + ' 1';
  Array.prototype.forEach.call(document.querySelectorAll('[vci-season="qualifier"]'), function (el) {
    if (label) el.textContent = label; else el.remove();
  });
})();
