/*! The Parkway Church site code v0.9.32. Built from src/, do not edit. */
/* ---- src/image-sizes-fix.js ---- */
/* Image sizes fix (same as The North Church). Sets each img sizes to its rendered width so the browser
   downloads the smallest srcset file that fits, cutting mobile bandwidth. Needs JS: runs before images load. */
(function(){var d=new WeakSet(),ro='ResizeObserver'in window?new ResizeObserver(function(es){es.forEach(function(e){if(e.contentRect.width&&fix(e.target))ro.unobserve(e.target)})}):null;
function need(i){var r=i.getBoundingClientRect();if(!r.width||!r.height)return 0;return Math.ceil(getComputedStyle(i).objectFit==='cover'?Math.max(r.width,r.height):r.width)}
function fix(i){if(!i.srcset||d.has(i))return true;if(i.complete&&i.currentSrc)return true;var w=need(i);if(!w){if(ro)ro.observe(i);return false}i.sizes=w+'px';d.add(i);return true}
function scan(n){if(n.tagName==='IMG')fix(n);if(n.querySelectorAll)n.querySelectorAll('img[srcset]').forEach(fix)}
new MutationObserver(function(l){l.forEach(function(m){if(m.type==='attributes'){d.delete(m.target);fix(m.target);return}m.addedNodes.forEach(function(n){if(n.nodeType===1)scan(n)})})}).observe(document.documentElement,{childList:true,subtree:true,attributes:true,attributeFilter:['srcset']});
if(document.readyState==='loading')document.addEventListener('DOMContentLoaded',function(){scan(document)});else scan(document);
var t;addEventListener('resize',function(){clearTimeout(t);t=setTimeout(function(){document.querySelectorAll('img[srcset]').forEach(function(i){var w=need(i);if(w&&d.has(i)&&w>parseInt(i.sizes,10))i.sizes=w+'px'})},200)})})();

/* ---- src/script-draw-early.js ---- */
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
