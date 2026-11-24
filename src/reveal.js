/* Scroll entrance animations. Why custom code: Webflow interactions have to be added element by
   element; this gives every core element one consistent entrance by default.

   What animates by default (inside <main>): cards, headings, paragraphs, blockquotes, images,
   video, figures and buttons. Each fades in and rises 1rem into place, once, the first time it
   scrolls into view. Elements that come into view together follow each other in reading order.
   A card moves as one piece, with everything inside it: every Collection List item
   (.w-dyn-item), any Client-First list item (home-about_item, events_item...) and any element
   with a card class (sermons_card, partners_logo-card...). For a hand-built card with another
   class name, add vci-reveal to it.
   The motion (curve, distance, no replay) is the same everywhere; only timing can be tuned.

   Tune it (on the element or any ancestor, so one attribute on a section covers all of it):
     vci-reveal="false"     no entrance
     vci-reveal             opt in any other element (a card, a list item...)
     vci-reveal-delay       ms before it starts (default 0)
     vci-reveal-duration    ms (default 600)
   Or from a combo class in the style panel, with custom properties (inherited the same way):
     --reveal-delay: 200    --reveal-duration: 900
   An attribute wins over a custom property.

   Safe by construction:
     - nothing is hidden unless this script runs; reduced motion skips it entirely;
     - what is already on screen at load is left alone (no flash on the hero);
     - only opacity and the translate property animate: no layout shift, compositor-only;
     - focus, find-in-page and printing reveal anything still waiting;
     - skips the nav, menus, dialogs, elements with a Webflow interaction, script lettering
       (it has its own write-on), and anything inside another revealing element. */
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
    var vh = innerHeight;
    var waiting = targets.filter(function (el) {
      var r = el.getBoundingClientRect();
      return r.width && r.height && r.top >= vh; // already on screen (or not rendered): leave alone
    });
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
