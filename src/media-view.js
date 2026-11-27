/* Head: grid / list switch for a card list (/media, /articles: any page with [vci-view] buttons above a Finsweet
   list). The buttons [vci-view="grid"] and [vci-view="list"] are built in Webflow (list-view_*); the choice is kept
   in the pw_media_view cookie for a year and shared by every list page.
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
      var next = b.getAttribute('vci-view') === 'list' ? 'list' : 'grid';
      if (next === view) return;
      document.cookie = KEY + '=' + next + '; max-age=31536000; path=/; SameSite=Lax';
      swap(next, b);
    });
  });

  // Switching animates: every card on screen moves and resizes from its grid spot to its row (or back), its
  // thumbnail morphing on its own so the photo never stretches, while the text crossfades. Uses the browser's
  // view transitions; without them (or under reduced motion) the switch is instant. The toggle stays where it was
  // on screen, so the page doesn't jump when the list gets shorter or taller.
  var EASE = 'cubic-bezier(.2,.7,.2,1)', DURATION = 420, MAX = 40;
  function swap(next, anchor) {
    var top = anchor.getBoundingClientRect().top;
    function change() {
      view = next;
      apply();
      var moved = anchor.getBoundingClientRect().top - top;
      if (moved) scrollBy(0, moved);
    }
    var reduce = matchMedia('(prefers-reduced-motion: reduce)').matches;
    if (!document.startViewTransition || reduce) return change();

    var vh = innerHeight, named = [];
    Array.prototype.some.call(list.querySelectorAll('.content_card'), function (card) {
      var r = card.getBoundingClientRect();
      if (r.bottom < -200 || !r.height) return false;
      if (r.top > vh + 200) return true; // below the fold: the rest are too
      var i = named.length / 2;
      card.style.viewTransitionName = 'vci-card-' + i;
      named.push(card);
      var thumb = card.querySelector('.content_card-thumbnail');
      if (thumb) thumb.style.viewTransitionName = 'vci-thumb-' + i;
      named.push(thumb);
      return named.length >= MAX * 2;
    });

    var t = document.startViewTransition(change);
    t.ready.then(function () {
      var root = document.documentElement;
      root.getAnimations({ subtree: true }).forEach(function (a) {
        var pe = a.effect && a.effect.pseudoElement;
        if (pe && pe.indexOf('::view-transition') === 0) a.effect.updateTiming({ duration: DURATION, easing: EASE });
      });
      // Cards: keep the old and new snapshots at their natural size, pinned top-left, so text slides instead of
      // squashing; thumbnails fill their box (the photo is cropped the same way in both views).
      for (var i = 0; i < named.length / 2; i++) {
        ['old', 'new'].forEach(function (k) {
          var pin = { height: '100%', width: 'auto', objectFit: 'none', objectPosition: 'left top' };
          root.animate([pin, pin], { duration: DURATION, pseudoElement: '::view-transition-' + k + '(vci-card-' + i + ')' });
          var fill = { height: '100%', width: '100%', objectFit: 'cover' };
          if (named[i * 2 + 1]) root.animate([fill, fill], { duration: DURATION, pseudoElement: '::view-transition-' + k + '(vci-thumb-' + i + ')' });
        });
      }
    }).catch(function () {});
    t.finished.then(function () {
      named.forEach(function (el) { if (el) el.style.viewTransitionName = ''; });
    });
  }
})();
