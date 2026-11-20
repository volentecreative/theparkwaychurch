/* Write-on for script lettering, like an After Effects trim path. Why custom code: revealing
   text along a pen line needs an SVG mask with an animated stroke, which the style panel can't do.

   A font has outlines, not pen strokes, so each word's pen line is generated ahead of time from
   the font (scripts/trim-paths/, output in src/script-draw-paths.js): its centerline, ordered
   the way you'd write it, left to right. Here that line, thick enough to cover the letters, is
   used as a mask over the real lettering and drawn on stroke by stroke, so the word is revealed
   as if written with a pen. The final frame is exactly the real text, which then takes over.

   Applies to .text-style-script (or any element with vci-draw) whose text has a generated pen
   line; anything else simply shows. Plays once, the first time it scrolls into view. Skipped for
   reduced motion, and for lettering that wraps or contains other elements.

   Settings (vci-draw-<setting> on the element or any ancestor):
     vci-draw="false"       leave this one alone
     vci-draw-duration      ms for the whole word (default 1800)
*/
(function () {
  var PATHS = window.__scriptDrawPaths || {};
  if (!window.IntersectionObserver || !Element.prototype.animate) return;
  if (window.matchMedia && matchMedia('(prefers-reduced-motion: reduce)').matches) return;
  var NS = 'http://www.w3.org/2000/svg', uid = 0;

  function setting(el, name, fallback) {
    var holder = el.closest('[vci-draw-' + name + ']');
    var v = holder && parseFloat(holder.getAttribute('vci-draw-' + name));
    return v > 0 ? v : fallback;
  }
  function pathsFor(el) {
    if ((el.getAttribute('vci-draw') || '').toLowerCase() === 'false' || el.children.length) return null;
    var cs = getComputedStyle(el);
    if (cs.letterSpacing !== 'normal' && parseFloat(cs.letterSpacing)) return null; // generated at normal spacing
    return PATHS[el.textContent.trim()] || null;
  }
  function oneLine(el) {
    var r = document.createRange(); r.selectNodeContents(el);
    var tops = {}, n = 0, rects = r.getClientRects();
    for (var i = 0; i < rects.length; i++) if (rects[i].width && !tops[Math.round(rects[i].top)]) { tops[Math.round(rects[i].top)] = 1; n++; }
    return n === 1;
  }
  function el(name, attrs) {
    var n = document.createElementNS(NS, name);
    for (var k in attrs) n.setAttribute(k, attrs[k]);
    return n;
  }

  function draw(host, data) {
    if (!oneLine(host)) { host.style.color = ''; return; }
    var cs = getComputedStyle(host), size = parseFloat(cs.fontSize);
    var box = host.getBoundingClientRect();
    var range = document.createRange(); range.selectNodeContents(host);
    var line = range.getBoundingClientRect();
    var mark = document.createElement('span');
    mark.style.cssText = 'display:inline-block;width:0;height:0;vertical-align:baseline';
    host.appendChild(mark);
    var x = line.left - box.left, y = mark.getBoundingClientRect().top - box.top;
    host.removeChild(mark);

    // <svg> over the text: the same word, masked by the pen line.
    var id = 'script-draw-' + (++uid);
    var svg = el('svg', { 'aria-hidden': 'true' });
    svg.style.cssText = 'position:absolute;left:0;top:0;width:' + box.width + 'px;height:' + box.height +
      'px;overflow:visible;pointer-events:none;color:' + host.__color;
    var mask = el('mask', { id: id, maskUnits: 'userSpaceOnUse', x: -box.width, y: -box.height, width: box.width * 3, height: box.height * 3 });
    var pen = el('g', {
      transform: 'translate(' + x + ' ' + y + ') scale(' + size + ')',
      fill: 'none', stroke: '#fff', 'stroke-width': data.width * 1.6, 'stroke-linecap': 'round', 'stroke-linejoin': 'round'
    });
    var strokes = data.paths.map(function (p) {
      // One dash the length of the path, then a longer gap: starting just past the dash means
      // nothing at all is drawn yet (a zero-length dash would still show its round cap).
      var path = el('path', { d: p.d, pathLength: 1, 'stroke-dasharray': '1 2', 'stroke-dashoffset': 1.02 });
      pen.appendChild(path);
      return path;
    });
    mask.appendChild(pen);
    var defs = el('defs', {}); defs.appendChild(mask); svg.appendChild(defs);
    var text = el('text', { x: x, y: y, mask: 'url(#' + id + ')' });
    text.style.cssText = 'font:inherit;fill:currentColor;white-space:pre';
    text.textContent = host.textContent.trim();
    svg.appendChild(text);

    var pos = host.style.position;
    if (cs.position === 'static') host.style.position = 'relative';
    host.appendChild(svg);

    // Timing: the pen moves at a steady speed, so each stroke takes time in proportion to its
    // length, with a short lift between strokes. Twigs (little hooks hanging off a stroke) start
    // when the pen passes them.
    var dur = setting(host, 'duration', 1800), LIFT = 60;
    var tops = data.paths.filter(function (p) { return p.parent == null; });
    var total = tops.reduce(function (s, p) { return s + p.len; }, 0) || 1;
    var speed = (dur - LIFT * (tops.length - 1)) / total; // ms per em of pen line
    var start = [], length = [], end = 0, t = 0;
    data.paths.forEach(function (p, i) {
      var d = Math.max(80, p.len * speed);
      if (p.parent == null) { start[i] = t; t += d + LIFT; }
      else start[i] = start[p.parent] + p.at * length[p.parent];
      length[i] = d;
      end = Math.max(end, start[i] + d);
    });
    var anims = strokes.map(function (path, i) {
      return path.animate([{ strokeDashoffset: 1.02 }, { strokeDashoffset: 0 }],
        { delay: start[i], duration: length[i], easing: data.paths[i].parent == null ? 'cubic-bezier(.4,0,.6,1)' : 'ease-out', fill: 'forwards' });
    });
    Promise.all(anims.map(function (a) { return a.finished; })).then(function () {
      host.style.color = '';
      host.style.position = pos;
      if (svg.parentNode) svg.parentNode.removeChild(svg);
    });
  }

  function init() {
    var els = document.querySelectorAll('.text-style-script, [vci-draw]:not([vci-draw="false"])');
    if (!els.length) return;
    var io = new IntersectionObserver(function (entries) {
      entries.forEach(function (e) {
        if (!e.isIntersecting) return;
        io.unobserve(e.target);
        (document.fonts ? document.fonts.ready : Promise.resolve()).then(function () { draw(e.target, e.target.__draw); });
      });
    }, { threshold: 0.6 });
    Array.prototype.forEach.call(els, function (host) {
      var data = pathsFor(host);
      if (!data || host.__draw) return;
      host.__draw = data;
      host.__color = getComputedStyle(host).color;
      host.style.color = 'transparent'; // hidden until it writes on; layout untouched
      io.observe(host);
    });
  }
  if (document.readyState === 'loading') document.addEventListener('DOMContentLoaded', init); else init();
})();
