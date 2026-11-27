/* Head: grid / list switch for a card list (/media). The buttons [vci-view="grid"] and [vci-view="list"]
   are built in Webflow (media-view_*); the choice is kept in the pw_media_view cookie for a year.
   List view = the combo is-list on the Finsweet list ([fs-list-element="list"]) and on each card's
   .content_card and .content_card-thumbnail, all styled in the style panel. Runs in the head so a
   remembered list view is applied while the page is parsed (no grid flash), and keeps applying it to
   cards Finsweet adds later (infinite load, filtering). */
(function () {
  if (!window.MutationObserver) return;
  var KEY = 'pw_media_view';
  var view = (document.cookie.match(new RegExp('(?:^|; )' + KEY + '=(grid|list)')) || [])[1] || 'grid';
  var list = null;

  function mark(root) {
    if (!list || root.nodeType !== 1) return;
    var on = view === 'list';
    var parts = root.matches('.content_card, .content_card-thumbnail') ? [root] : [];
    parts = parts.concat(Array.prototype.slice.call(root.querySelectorAll('.content_card, .content_card-thumbnail')));
    parts.forEach(function (el) { el.classList.toggle('is-list', on); });
  }
  function apply() {
    if (!list) return;
    list.classList.toggle('is-list', view === 'list');
    mark(list);
    Array.prototype.forEach.call(document.querySelectorAll('[vci-view]'), function (b) {
      var on = b.getAttribute('vci-view') === view;
      b.classList.toggle('is-active', on);
      b.setAttribute('aria-pressed', on);
    });
  }

  // While parsing: find the list (the toggle sits above it, so a page without one is skipped) and mark
  // cards as they arrive.
  var mo = new MutationObserver(function (records) {
    records.forEach(function (r) {
      Array.prototype.forEach.call(r.addedNodes, function (n) {
        if (n.nodeType !== 1) return;
        if (!list) {
          var l = n.matches('[fs-list-element="list"]') ? n : n.querySelector('[fs-list-element="list"]');
          if (l && document.querySelector('[vci-view]')) { list = l; apply(); }
        } else if (list.contains(n)) mark(n);
      });
    });
  });
  mo.observe(document.documentElement, { childList: true, subtree: true });

  document.addEventListener('DOMContentLoaded', function () {
    mo.disconnect();
    if (!list) {
      list = document.querySelector('[fs-list-element="list"]');
      if (!list || !document.querySelector('[vci-view]')) return;
    }
    apply();
    // Cards added later (infinite load, filters re-rendering).
    new MutationObserver(function (records) {
      if (view !== 'list') return;
      records.forEach(function (r) { Array.prototype.forEach.call(r.addedNodes, mark); });
    }).observe(list, { childList: true, subtree: true });
    document.addEventListener('click', function (e) {
      var b = e.target.closest && e.target.closest('[vci-view]');
      if (!b) return;
      e.preventDefault();
      view = b.getAttribute('vci-view') === 'list' ? 'list' : 'grid';
      document.cookie = KEY + '=' + view + '; max-age=31536000; path=/; SameSite=Lax';
      apply();
    });
  });
})();
