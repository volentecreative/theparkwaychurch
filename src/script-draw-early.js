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
