/* Head: a Finsweet list opened with a filter in the URL (e.g. the nav's /media?type_equal=["Sermon"]) is
   filtered in the browser after the page has painted, so every item flashed before the unmatched ones
   were stripped. When the URL carries a filter, this holds the list ([fs-list-element="list"]) invisible
   from the first paint and shows it once Finsweet has rendered it filtered. Its callback is queued on
   window.FinsweetAttributes, which Finsweet runs when it loads. Safety: shown anyway 2.5s after the page
   has loaded. No filter in the URL: nothing is held. */
(function () {
  // Filter params only (field_operator=…); sort_*= and paging params don't change which items show.
  var FILTER = /(^|[?&])(?!sort_)[a-z0-9-]+_(equal|not-equal|contains|not-contains|start|end|greater|greater-equal|less|less-equal|empty|not-empty)=/i;
  if (!FILTER.test(location.search) || !window.MutationObserver) return;
  var held = [], done = false;
  function hold(n) {
    if (n.nodeType !== 1 || n.__fsHeld) return;
    var lists = n.matches('[fs-list-element="list"]') ? [n] : n.querySelectorAll('[fs-list-element="list"]');
    Array.prototype.forEach.call(lists, function (l) {
      if (l.__fsHeld) return;
      l.__fsHeld = true;
      l.style.opacity = '0';
      held.push(l);
    });
  }
  function release() {
    if (done) return;
    done = true;
    mo.disconnect();
    held.forEach(function (l) {
      l.style.transition = 'opacity 200ms ease';
      l.style.opacity = '';
    });
  }
  var mo = new MutationObserver(function (list) {
    list.forEach(function (m) { Array.prototype.forEach.call(m.addedNodes, hold); });
  });
  mo.observe(document.documentElement, { childList: true, subtree: true });

  window.FinsweetAttributes = window.FinsweetAttributes || [];
  // Finsweet renders once unfiltered, then filters only after every paginated item has loaded
  // (loadingPaginatedItems). So: wait for that, then show after the next render (the filtered one),
  // or shortly after loading if that render already happened.
  window.FinsweetAttributes.push(['list', function (lists) {
    (lists || []).forEach(function (l) {
      if (!l.addHook) return release();
      var ready = false;
      l.addHook('render', function (items) { if (ready) requestAnimationFrame(release); return items; });
      Promise.resolve(l.loadingPaginatedItems).then(function () {
        ready = true;
        setTimeout(release, 400);
      });
    });
    if (!lists || !lists.length) release();
  }]);
  addEventListener('load', function () { setTimeout(release, 2500); });
})();
