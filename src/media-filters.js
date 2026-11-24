/* Finsweet filter bar: [vci-filters="count"] shows how many options are checked in its dropdown (its toggle gets .is-active).
   When the filters change, every dropdown that isn't open opens next time scrolled to the top: Finsweet's empty facets
   re-sort its options, so an old scroll position would land somewhere arbitrary. The open one keeps its place while
   you pick in it. (A closed list is display:none and can't be scrolled, so the reset waits until it opens.)
   The active-filter tags row needs nothing here: Finsweet only puts it in the page while a filter is applied. */
(function () {
  var form = document.querySelector('[fs-list-element="filters"]');
  if (!form || !form.querySelector('[vci-filters="count"]')) return;
  var dds = Array.prototype.slice.call(form.querySelectorAll('.w-dropdown'));
  var stale = [];
  var last = null;

  function isOpen(dd) { return !!dd.querySelector('.w-dropdown-toggle.w--open'); }

  function update() {
    var now = Array.prototype.map.call(form.querySelectorAll('input:checked'), function (i) {
      return i.name + '=' + (i.getAttribute('fs-list-value') || i.value);
    }).join('|');
    if (last !== null && now !== last) dds.forEach(function (dd, i) { if (!isOpen(dd)) stale[i] = true; });
    last = now;
    dds.forEach(function (dd) {
      var count = dd.querySelector('[vci-filters="count"]');
      if (!count) return;
      var n = dd.querySelectorAll('input:checked').length;
      if (count.textContent !== String(n)) count.textContent = n;
      count.classList.toggle('is-empty', !n);
      dd.querySelector('.w-dropdown-toggle').classList.toggle('is-active', !!n);
    });
  }

  dds.forEach(function (dd, i) {
    var toggle = dd.querySelector('.w-dropdown-toggle');
    var area = dd.querySelector('[vci-scroll="area"]');
    if (!toggle || !area) return;
    new MutationObserver(function () {
      if (stale[i] && isOpen(dd)) { area.scrollTop = 0; stale[i] = false; }
    }).observe(toggle, { attributes: true, attributeFilter: ['class'] });
  });

  window.FinsweetAttributes = window.FinsweetAttributes || [];
  window.FinsweetAttributes.push(['list', function (lists) {
    // Runs after every filter pass, including tag removal and Clear all.
    (lists || []).forEach(function (l) { if (l.addHook) l.addHook('filter', function (items) { setTimeout(update); return items; }); });
    form.addEventListener('change', update);
    update();
  }]);
})();
