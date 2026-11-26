/* Entrances: cards, headings, text, media fade and rise in once, in reading order: on page load for
   what is already on screen (held from the first paint by reveal-early.js), on scroll for the rest.
   vci-reveal="false" opts out; vci-reveal opts in; vci-reveal-delay / -duration or --reveal-delay / --reveal-duration tune timing. */
(function () {
  if (!window.IntersectionObserver || !Element.prototype.animate) return;
  if (window.matchMedia && matchMedia('(prefers-reduced-motion: reduce)').matches) return;

  // Matches come back in document order, so a card is always seen before its contents, which are
  // then skipped as nested: the card moves as one piece.
  var CARDS = '.w-dyn-item,[class$="_card"],[class*="_card "],[class*="-card"],[class$="_item"],[class*="_item "]';
  var DEFAULTS = CARDS + ',h1,h2,h3,h4,h5,h6,p,blockquote,img,picture,video,figure,.button,.w-button';
  var SKIP = 'nav,header,[role="dialog"],.w-nav,.w-dropdown,.nav_component,.text-style-script,[data-w-id]';
  var EASE = 'cubic-bezier(.2,.7,.2,1)', RISE = '0 1rem', STAGGER = 70, MAX_STAGGER = 5;
  var DURATION = 600;
  // Page load: whatever is on screen enters in reading order. Media only fades (a full-bleed
  // background image that rises would open a gap at its edge).
  var MEDIA = 'img,picture,video', LOAD_DELAY = 80, LOAD_STAGGER = 90, LOAD_MAX = 8, LOAD_MEDIA = 1000;

  function off(el) {
    var o = el.closest('[vci-reveal]');
    return !!o && (o.getAttribute('vci-reveal') || '').toLowerCase() === 'false';
  }
  function num(el, name, fallback) {
    var holder = el.closest('[vci-reveal-' + name + ']');
    var v = holder ? parseFloat(holder.getAttribute('vci-reveal-' + name)) : NaN;
    if (isNaN(v)) v = parseFloat(getComputedStyle(el).getPropertyValue('--reveal-' + name));
    return isNaN(v) || v < 0 ? fallback : v;
  }

  function init() {
    var root = document.querySelector('main') || document.querySelector('.main-wrapper') || document.body;
    var found = root.querySelectorAll(DEFAULTS + ',[vci-reveal]:not([vci-reveal="false"])');
    var targets = [], set = new Set();
    for (var i = 0; i < found.length; i++) {
      var el = found[i];
      if (el.closest(SKIP) || off(el)) continue;
      // One entrance per piece of content: not inside another element that is revealing.
      var up = el.parentElement, nested = false;
      for (; up && up !== root; up = up.parentElement) if (set.has(up)) { nested = true; break; }
      if (nested) continue;
      set.add(el); targets.push(el);
    }

    // Read every position first, then write: one layout pass.
    var vh = innerHeight, onLoad = [], waiting = [];
    targets.forEach(function (el) {
      var r = el.getBoundingClientRect();
      if (!r.width || !r.height) return; // not rendered: leave alone
      (r.top < vh && r.bottom > 0 ? onLoad : waiting).push(el);
    });

    // On screen at load: enter now, in reading order. Only when the head part held them
    // (reveal-early.js), otherwise they've already been painted and an entrance would flash.
    var early = window.__revealHeld;
    window.__revealReady = true;
    if (early) {
      onLoad.forEach(function (el, k) {
        var media = el.matches(MEDIA);
        el.animate(media ? [{ opacity: 0 }, { opacity: 1 }] : [{ opacity: 0, translate: RISE }, { opacity: 1, translate: '0 0' }], {
          duration: num(el, 'duration', media ? LOAD_MEDIA : DURATION),
          delay: num(el, 'delay', 0) + LOAD_DELAY + Math.min(k, LOAD_MAX) * LOAD_STAGGER,
          easing: EASE,
          fill: 'backwards'
        });
      });
      // Everything the head part held: hand back to the animation (or simply show it).
      early.forEach(function (el) { el.style.opacity = ''; });
    }
    if (!waiting.length) return;

    var pending = new Set(waiting);
    function reveal(el, extra) {
      if (!pending.delete(el)) return;
      io.unobserve(el);
      el.animate([{ opacity: 0, translate: RISE }, { opacity: 1, translate: '0 0' }], {
        duration: num(el, 'duration', DURATION),
        delay: num(el, 'delay', 0) + (extra || 0),
        easing: EASE,
        fill: 'backwards'
      });
      el.style.opacity = ''; // the animation holds it hidden until it starts
    }
    function revealAll() { pending.forEach(function (el) { reveal(el); }); }

    var io = new IntersectionObserver(function (entries) {
      var batch = entries.filter(function (e) { return e.isIntersecting; }).map(function (e) { return e.target; });
      // Reading order within a batch, so a row of cards or a heading + paragraph cascade.
      batch.sort(function (a, b) { return a.compareDocumentPosition(b) & Node.DOCUMENT_POSITION_FOLLOWING ? -1 : 1; });
      batch.forEach(function (el, k) { reveal(el, Math.min(k, MAX_STAGGER) * STAGGER); });
    }, { rootMargin: '0px 0px -8% 0px' });

    waiting.forEach(function (el) {
      el.style.opacity = '0';
      io.observe(el);
    });

    document.addEventListener('focusin', function (e) {
      pending.forEach(function (el) { if (el.contains(e.target)) reveal(el); });
    });
    addEventListener('beforeprint', revealAll);
  }

  if (document.readyState === 'loading') document.addEventListener('DOMContentLoaded', init); else init();
})();
