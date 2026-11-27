/* Finsweet filter bar: [vci-filters="count"] shows how many options are checked in its dropdown (its toggle gets .is-active).
   When the filters change, every dropdown that isn't open opens next time scrolled to the top: Finsweet's empty facets
   re-sort its options, so an old scroll position would land somewhere arbitrary. The open one keeps its place while
   you pick in it. (A closed list is display:none and can't be scrolled, so the reset waits until it opens.)
   The active-filter tags row needs nothing here: Finsweet only puts it in the page while a filter is applied.
   Empty facets are held back until every item has loaded (see settle below). */
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
    var wrap = input.closest('.list-filters_search') || input.parentElement; // the search_field sits inside it
    wrap.classList.add('is-active');
    var row = function (label) { return label.closest('.w-dyn-item') || label; };
    var name = function (label) {
      var s = label.querySelector('span:not([fs-list-element])');
      return (s || label).textContent.trim().toLowerCase();
    };
    var usable = function (label) {
      if (row(label).style.display === 'none') return false;
      if (form.classList.contains('is-loading')) return true; // facets aren't final yet, so nothing looks grayed
      return !row(label).classList.contains('is-list-emptyfacet') && !label.classList.contains('is-list-emptyfacet');
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
    input.addEventListener('search', apply); // Escape and the clear button empty a search field without an input event
    input.addEventListener('keydown', function (e) {
      if (e.key !== 'Enter') return;
      e.preventDefault(); // don't submit the filters form
      var first = options.filter(usable)[0];
      if (first) { first.click(); input.focus({ preventScroll: true }); } // keep typing
    });
    var fine = matchMedia('(pointer: fine)'); // no keyboard pop-up on touch screens
    var wasOpen = false;
    new MutationObserver(function () {
      var open = isOpen(dd);
      if (open === wasOpen) return; // count and connect classes change too; only act on open and close
      wasOpen = open;
      if (open) { if (fine.matches) requestAnimationFrame(function () { input.focus({ preventScroll: true }); }); }
      else { input.value = ''; apply(); }
    }).observe(toggle, { attributes: true, attributeFilter: ['class'] });
  });

  // Empty facets settle once. Finsweet loads every page of media in the background (one to several seconds) and
  // re-works out which options are empty from whatever has arrived, so without this they gray and jump to the
  // bottom one by one while it loads. The form carries .is-loading in the Designer, which keeps the empty-facet look
  // switched off. Each option's facet is its own async job that re-runs whenever the items change and writes its count
  // into the option's [fs-list-element="facet-count"] span when it finishes. Once the last page has landed, those jobs
  // run back to back (a few ms apart), so the class comes off when the counts have gone quiet for QUIET ms after
  // loading. If the script never runs, nothing grays, and every option stays clickable.
  var QUIET = 150;
  function settle(l) {
    var loaded = false, timer;
    var done = function () { observer.disconnect(); clearTimeout(timer); form.classList.remove('is-loading'); };
    var wait = function () { clearTimeout(timer); timer = setTimeout(done, QUIET); };
    var observer = new MutationObserver(function (records) {
      if (!loaded) return;
      for (var i = 0; i < records.length; i++) {
        var el = records[i].target.nodeType === 3 ? records[i].target.parentElement : records[i].target;
        if (el && el.closest && el.closest('[fs-list-element="facet-count"]')) return wait();
      }
    });
    observer.observe(form, { subtree: true, childList: true, characterData: true });
    if (!l.loadingPaginatedItems) return done();
    l.loadingPaginatedItems.then(function () { loaded = true; wait(); });
  }

  window.FinsweetAttributes = window.FinsweetAttributes || [];
  window.FinsweetAttributes.push(['list', function (lists) {
    // Runs after every filter pass, including tag removal and Clear all.
    (lists || []).forEach(function (l) { if (l.addHook) l.addHook('filter', function (items) { setTimeout(update); return items; }); });
    if (lists && lists[0]) settle(lists[0]); else form.classList.remove('is-loading');
    form.addEventListener('change', update);
    update();
  }]);
})();
