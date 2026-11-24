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

  // Inline search: a dropdown with more than SEARCH_MIN options shows its [vci-filters="search"] field (.is-active on
  // the wrap) and filters the options by name as you type. Enter checks the first match. Cleared when it closes.
  // Without the script the field stays hidden in the Designer and the full list scrolls as before.
  var SEARCH_MIN = 8;
  dds.forEach(function (dd) {
    var input = dd.querySelector('[vci-filters="search"]');
    var area = dd.querySelector('[vci-scroll="area"]');
    var toggle = dd.querySelector('.w-dropdown-toggle');
    if (!input || !area || !toggle) return;
    var options = Array.prototype.slice.call(area.querySelectorAll('label'));
    if (options.length <= SEARCH_MIN) return;
    var none = dd.querySelector('[vci-filters="search-empty"]');
    input.parentElement.classList.add('is-active');
    var row = function (label) { return label.closest('.w-dyn-item') || label; };
    var name = function (label) {
      var s = label.querySelector('span:not([fs-list-element])');
      return (s || label).textContent.trim().toLowerCase();
    };
    var usable = function (label) {
      return row(label).style.display !== 'none' && !row(label).classList.contains('is-list-emptyfacet') &&
        !label.classList.contains('is-list-emptyfacet');
    };
    function apply() {
      var q = input.value.trim().toLowerCase(), shown = 0;
      options.forEach(function (label) {
        var hit = !q || name(label).indexOf(q) > -1;
        row(label).style.display = hit ? '' : 'none';
        if (hit) shown++;
      });
      if (none) none.classList.toggle('is-active', !shown);
      area.scrollTop = 0;
      area.dispatchEvent(new Event('scroll')); // the custom scrollbar re-measures
    }
    input.addEventListener('input', apply);
    input.addEventListener('keydown', function (e) {
      if (e.key !== 'Enter') return;
      e.preventDefault(); // don't submit the filters form
      var first = options.filter(usable)[0];
      if (first) first.click();
    });
    var fine = matchMedia('(pointer: fine)'); // no keyboard pop-up on touch screens
    var wasOpen = false;
    new MutationObserver(function () {
      var open = isOpen(dd);
      if (open === wasOpen) return; // count and connect classes change too; only act on open and close
      wasOpen = open;
      if (open) { if (fine.matches) requestAnimationFrame(function () { input.focus({ preventScroll: true }); }); }
      else if (input.value) { input.value = ''; apply(); }
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
