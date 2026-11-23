/* Current season name. Why custom code: Webflow can't pick content by today's date on a static
   page (CMS date filters are worked out at publish time, so they'd go stale between publishes).

   The seasons live in the CMS (Seasons collection: Name, Start Month, End Month), so the church
   can change them without touching code. A page that shows the season carries a hidden
   Collection List of Seasons whose items each hold one element:
     vci-season="item"  vci-season-name="Fall"  vci-season-start="August"  vci-season-end="November"
   (months as the option names, or 1-12). A season may wrap the year: December to January.

   Then any element with vci-season="name" gets its text replaced by the season we're in today
   (visitor's own date). If nothing matches, the text written in the Designer stays as it is.
   Runs before script-draw, so the write-on draws the right word. */
(function () {
  var MONTHS = ['jan', 'feb', 'mar', 'apr', 'may', 'jun', 'jul', 'aug', 'sep', 'oct', 'nov', 'dec'];
  function month(v) {
    v = (v || '').trim().toLowerCase();
    var n = parseInt(v, 10);
    if (n >= 1 && n <= 12) return n - 1;
    return MONTHS.indexOf(v.slice(0, 3));
  }

  var targets = document.querySelectorAll('[vci-season="name"]');
  if (!targets.length) return;
  var items = document.querySelectorAll('[vci-season="item"]');
  var now = new Date().getMonth(), current = null;
  for (var i = 0; i < items.length && !current; i++) {
    var it = items[i], name = (it.getAttribute('vci-season-name') || '').trim();
    var s = month(it.getAttribute('vci-season-start')), e = month(it.getAttribute('vci-season-end'));
    if (!name || s < 0 || e < 0) continue;
    if (s <= e ? now >= s && now <= e : now >= s || now <= e) current = name;
  }
  if (!current) return;
  for (var j = 0; j < targets.length; j++) {
    if (targets[j].textContent.trim() !== current) targets[j].textContent = current;
  }
})();
