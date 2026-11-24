/* Write-on, early part (head). Why custom code: the write-on script loads deferred in the footer, so
   the browser paints the page once before it runs. Script lettering would show for that moment as
   the text written in the Designer (e.g. a placeholder season name) in the fallback serif, before
   the font loads and the write-on starts.

   This holds that lettering transparent from the moment each element is parsed, before the first
   paint. The footer script (script-draw.js) then takes over: it swaps in the right word, writes it
   on, and shows straight away anything it can't write on. Same conditions as the footer script
   (no reduced motion, browser support), so nothing is held that wouldn't be written on.
   If the footer script never runs (blocked or failed to load), the text is shown on page load. */
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
