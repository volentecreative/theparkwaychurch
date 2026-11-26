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
