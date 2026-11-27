/*! The Parkway Church site code v0.9.80. Built from src/, do not edit. */
/* ---- src/image-sizes-fix.js ---- */
/* Head: corrects Webflow image sizes attributes before images load. */
(function(){var d=new WeakSet(),ro='ResizeObserver'in window?new ResizeObserver(function(es){es.forEach(function(e){if(e.contentRect.width&&fix(e.target))ro.unobserve(e.target)})}):null;
function need(i){var r=i.getBoundingClientRect();if(!r.width||!r.height)return 0;return Math.ceil(getComputedStyle(i).objectFit==='cover'?Math.max(r.width,r.height):r.width)}
function fix(i){if(!i.srcset||d.has(i))return true;if(i.complete&&i.currentSrc)return true;var w=need(i);if(!w){if(ro)ro.observe(i);return false}i.sizes=w+'px';d.add(i);return true}
function scan(n){if(n.tagName==='IMG')fix(n);if(n.querySelectorAll)n.querySelectorAll('img[srcset]').forEach(fix)}
new MutationObserver(function(l){l.forEach(function(m){if(m.type==='attributes'){d.delete(m.target);fix(m.target);return}m.addedNodes.forEach(function(n){if(n.nodeType===1)scan(n)})})}).observe(document.documentElement,{childList:true,subtree:true,attributes:true,attributeFilter:['srcset']});
if(document.readyState==='loading')document.addEventListener('DOMContentLoaded',function(){scan(document)});else scan(document);
var t;addEventListener('resize',function(){clearTimeout(t);t=setTimeout(function(){document.querySelectorAll('img[srcset]').forEach(function(i){var w=need(i);if(w&&d.has(i)&&w>parseInt(i.sizes,10))i.sizes=w+'px'})},200)})})();

/* ---- src/script-draw-early.js ---- */
/* Head: hides script lettering before first paint so it never flashes before the write-on. */
(function () {
  if (!window.IntersectionObserver || !Element.prototype.animate || !window.MutationObserver) return;
  if (window.matchMedia && matchMedia('(prefers-reduced-motion: reduce)').matches) return;
  var SEL = '.text-style-script, [vci-draw]:not([vci-draw="false"])', held = [];
  function hold(n) { if (n.__held) return; n.__held = true; n.style.color = 'transparent'; held.push(n); }
  function scan(n) {
    if (n.nodeType !== 1) return;
    if (n.matches(SEL)) hold(n);
    Array.prototype.forEach.call(n.querySelectorAll(SEL), hold);
  }
  var mo = new MutationObserver(function (list) {
    list.forEach(function (m) { Array.prototype.forEach.call(m.addedNodes, scan); });
  });
  mo.observe(document.documentElement, { childList: true, subtree: true });
  document.addEventListener('DOMContentLoaded', function () { mo.disconnect(); });
  addEventListener('load', function () {
    if (window.__scriptDrawReady) return;
    held.forEach(function (n) { n.style.color = ''; });
  });
})();

/* ---- src/reveal-early.js ---- */
/* Head: holds reveal targets invisible from before the first paint, so content already on screen
   at load can play its entrance (reveal.js, footer) instead of flashing in and then animating.
   Same selectors and opt-outs as reveal.js: keep the two in sync. If the footer script never runs,
   everything is shown again on DOMContentLoaded + 2.5s or on load, whichever comes first. */
(function () {
  if (!window.IntersectionObserver || !Element.prototype.animate || !window.MutationObserver) return;
  if (window.matchMedia && matchMedia('(prefers-reduced-motion: reduce)').matches) return;
  var CARDS = '.w-dyn-item,[class$="_card"],[class*="_card "],[class*="-card"],[class$="_item"],[class*="_item "]';
  var SEL = CARDS + ',h1,h2,h3,h4,h5,h6,p,blockquote,img,picture,video,figure,.button,.w-button,[vci-reveal]:not([vci-reveal="false"])';
  var SKIP = 'nav,header,[role="dialog"],.w-nav,.w-dropdown,.nav_component,.text-style-script,[data-w-id]';
  var held = window.__revealHeld = [];
  function off(el) {
    var o = el.closest('[vci-reveal]');
    return !!o && (o.getAttribute('vci-reveal') || '').toLowerCase() === 'false';
  }
  function hold(n) {
    if (n.__revealHeld || !n.closest('main,.main-wrapper') || n.closest(SKIP) || off(n)) return;
    n.__revealHeld = true;
    n.style.opacity = '0';
    held.push(n);
  }
  function scan(n) {
    if (n.nodeType !== 1) return;
    if (n.matches(SEL)) hold(n);
    Array.prototype.forEach.call(n.querySelectorAll(SEL), hold);
  }
  var mo = new MutationObserver(function (list) {
    list.forEach(function (m) { Array.prototype.forEach.call(m.addedNodes, scan); });
  });
  mo.observe(document.documentElement, { childList: true, subtree: true });
  function release() {
    if (window.__revealReady) return;
    window.__revealReady = true;
    held.forEach(function (n) { n.style.opacity = ''; });
  }
  document.addEventListener('DOMContentLoaded', function () {
    mo.disconnect();
    setTimeout(release, 2500);
  });
  addEventListener('load', release);
})();

/* ---- src/list-filter-early.js ---- */
/* Head: a Finsweet list opened with a filter in the URL (e.g. the nav's /media?type_equal=["Sermon"]).
   Finsweet only filters after it has fetched every page of the list, so on its own the page first shows
   every item, then strips the ones that don't match.
   - Equals filters (field_equal=[...]): while the page is parsed, items on the first page whose
     [fs-list-field="field"] value isn't in the list are hidden, so the right items show straight away;
     Finsweet then fills in the rest. Anything else (search text, ranges): the whole list is held
     invisible until Finsweet has rendered it filtered.
   - [vci-list="loading"] (built in Webflow, hidden by default) gets .is-active until Finsweet is done.
   Done = every page loaded and the next render, or 400ms after loading. Safety: 2.5s after page load.
   No filter in the URL: nothing happens. */
(function () {
  if (!window.MutationObserver) return;
  var params = new URLSearchParams(location.search), equals = {}, other = false;
  params.forEach(function (value, key) {
    var m = key.match(/^(?!sort_)([a-z0-9-]+)_(equal|not-equal|contains|not-contains|start|end|greater|greater-equal|less|less-equal|empty|not-empty)$/i);
    if (!m) return;
    if (m[2].toLowerCase() !== 'equal') { other = true; return; }
    var vals;
    try { vals = JSON.parse(value); } catch (e) { vals = [value]; }
    equals[m[1]] = [].concat(vals).map(function (v) { return String(v).trim().toLowerCase(); });
  });
  var fields = Object.keys(equals);
  if (!fields.length && !other) return;

  var list = null, hidden = [], loaders = [], done = false;
  // true / false, or null while an item's field values haven't been parsed yet.
  function matches(item) {
    var known = true;
    var ok = fields.every(function (f) {
      var els = item.querySelectorAll('[fs-list-field="' + f + '"]');
      var vals = Array.prototype.map.call(els, function (el) { return el.textContent.trim().toLowerCase(); }).filter(Boolean);
      if (!vals.length) { known = false; return true; }
      return vals.some(function (v) { return equals[f].indexOf(v) > -1; });
    });
    return ok ? (known ? true : null) : false;
  }
  function check(item) {
    if (other || !item || item.nodeType !== 1 || item.parentNode !== list || item.__fsChecked) return;
    var m = matches(item);
    if (m === null) return; // try again when more of it has arrived
    item.__fsChecked = true;
    if (!m) { item.style.display = 'none'; hidden.push(item); }
  }
  // Items hidden here get their style back only once Finsweet has taken them out of the list (that is
  // Finsweet applying the filter), so they can never flash; if the filter is later cleared, Finsweet
  // puts them back clean. When the last one has gone, the list is filtered: done.
  var watch = null;
  function watchList() {
    if (watch || !list || other) return;
    watch = new MutationObserver(function (records) {
      records.forEach(function (r) {
        Array.prototype.forEach.call(r.removedNodes, function (n) {
          var i = hidden.indexOf(n);
          if (i > -1) { n.style.display = ''; hidden.splice(i, 1); }
        });
      });
      if (!hidden.length) { watch.disconnect(); release(); }
    });
    watch.observe(list, { childList: true });
  }
  function release() {
    if (done) return;
    done = true;
    mo.disconnect();
    loaders.forEach(function (l) { l.classList.remove('is-active'); });
    if (list && other) { list.style.transition = 'opacity 200ms ease'; list.style.opacity = ''; }
  }
  var mo = new MutationObserver(function (records) {
    records.forEach(function (r) {
      Array.prototype.forEach.call(r.addedNodes, function (n) {
        if (n.nodeType === 3) { // a field's text arriving after the field element
          if (list && !other && n.parentElement && list.contains(n.parentElement)) check(n.parentElement.closest('[fs-list-element="list"] > *'));
          return;
        }
        if (n.nodeType !== 1) return;
        var ld = n.matches('[vci-list="loading"]') ? [n] : n.querySelectorAll('[vci-list="loading"]');
        Array.prototype.forEach.call(ld, function (l) { l.classList.add('is-active'); loaders.push(l); });
        if (!list) {
          list = n.matches('[fs-list-element="list"]') ? n : n.querySelector('[fs-list-element="list"]');
          if (list && other) list.style.opacity = '0';
          if (list) { Array.prototype.forEach.call(list.children, check); watchList(); }
        } else if (n.parentNode === list) check(n);
        else if (list.contains(n)) check(n.closest('[fs-list-element="list"] > *'));
      });
    });
  });
  mo.observe(document.documentElement, { childList: true, subtree: true });
  document.addEventListener('DOMContentLoaded', function () {
    if (list) { Array.prototype.forEach.call(list.children, check); watchList(); } // anything still undecided
  });

  window.FinsweetAttributes = window.FinsweetAttributes || [];
  window.FinsweetAttributes.push(['list', function (lists) {
    (lists || []).forEach(function (l) {
      if (!l.addHook) return release();
      var ready = false;
      // Search-text and other filters: show once rendered after loading. Equals filters with items
      // hidden here finish in watchList() instead; with none hidden, this ends them too.
      l.addHook('render', function (items) {
        if (ready && (other || !hidden.length)) requestAnimationFrame(release);
        return items;
      });
      Promise.resolve(l.loadingPaginatedItems).then(function () {
        ready = true;
        setTimeout(function () { if (other || !hidden.length) release(); }, 400);
      });
    });
    if (!lists || !lists.length) release();
  }]);
  addEventListener('load', function () { setTimeout(release, 2500); });
})();

/* ---- src/media-view.js ---- */
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
        if (!pe || pe.indexOf('::view-transition') !== 0) return;
        // The rest of the page (the root snapshot) switches at once: the site's page-transition fade on root
        // (head code) would otherwise fade the whole page out and back in, flashing the background.
        if (pe.indexOf('(root)') > -1) a.cancel();
        else a.effect.updateTiming({ duration: DURATION, easing: EASE });
      });
      var gone = { opacity: 0 };
      root.animate([gone, gone], { duration: DURATION, pseudoElement: '::view-transition-old(root)' });
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
