/*! The Parkway Church site code v0.9.47. Built from src/, do not edit. */
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
