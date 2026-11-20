/* Draw-on for script lettering. Why custom code: tracing a font's letterforms needs the text as
   SVG with an animated stroke dash, which the style panel cannot do.

   Every .text-style-script (or any element with vci-draw) writes itself on the first time it
   scrolls into view: letter by letter, left to right, each outline is traced and then filled.
   Each letter is its own <tspan> inside one <text>, so the font still joins and shapes the word
   exactly as the real text does. Nothing is clipped, so swashes are never cut off.
   The real text stays in the page throughout (hidden only while the drawing plays) and is put
   back exactly as it was afterwards, so it is still editable, selectable and read by screen
   readers. Lettering that wraps onto more than one line, or contains other elements, is left as
   it is, as is everything when the visitor prefers reduced motion.

   Settings (vci-draw-<setting> on the element or any ancestor):
     vci-draw="false"        leave this one alone
     vci-draw-duration       ms for the whole draw (default 2200)
     vci-draw-stroke         outline width as a fraction of the font size (default 0.018)
*/
(function () {
  if (!window.IntersectionObserver || !Element.prototype.animate) return;
  if (window.matchMedia && matchMedia('(prefers-reduced-motion: reduce)').matches) return;
  var NS = 'http://www.w3.org/2000/svg';

  function setting(el, name, fallback) {
    var holder = el.closest('[vci-draw-' + name + ']');
    var v = holder && parseFloat(holder.getAttribute('vci-draw-' + name));
    return v > 0 ? v : fallback;
  }

  // Only plain, single-line text. Anything else is not ours to redraw.
  function drawable(el) {
    if (el.__draw || (el.getAttribute('vci-draw') || '').toLowerCase() === 'false') return false;
    if (el.children.length || !el.textContent.trim()) return false;
    var r = document.createRange(); r.selectNodeContents(el);
    var lines = {}, n = 0, rects = r.getClientRects();
    for (var i = 0; i < rects.length; i++) if (rects[i].width && !lines[Math.round(rects[i].top)]) { lines[Math.round(rects[i].top)] = 1; n++; }
    return n === 1;
  }

  function draw(el) {
    if (!drawable(el)) { el.style.color = ''; return; }
    el.__draw = true;
    var cs = getComputedStyle(el), size = parseFloat(cs.fontSize);
    var box = el.getBoundingClientRect();
    var range = document.createRange(); range.selectNodeContents(el);
    var line = range.getBoundingClientRect();
    // The baseline: where a zero-height inline-block sits.
    var mark = document.createElement('span');
    mark.style.cssText = 'display:inline-block;width:0;height:0;vertical-align:baseline';
    el.appendChild(mark);
    var base = mark.getBoundingClientRect().top - box.top;
    el.removeChild(mark);

    var svg = document.createElementNS(NS, 'svg');
    svg.setAttribute('aria-hidden', 'true');
    svg.style.cssText = 'position:absolute;left:0;top:0;width:' + box.width + 'px;height:' + box.height +
      'px;overflow:visible;pointer-events:none;color:' + el.__color;
    var text = document.createElementNS(NS, 'text');
    text.setAttribute('x', line.left - box.left);
    text.setAttribute('y', base);
    var L = size * 12; // longer than any one letter's outline
    text.style.cssText = 'font:inherit;letter-spacing:inherit;white-space:pre;fill:currentColor;stroke:currentColor;' +
      'stroke-width:' + (size * setting(el, 'stroke', 0.018)) + 'px;stroke-linejoin:round;stroke-linecap:round;' +
      'stroke-dasharray:' + L;
    var glyphs = Array.from ? Array.from(el.textContent.trim()) : el.textContent.trim().split('');
    var spans = glyphs.map(function (ch) {
      var s = document.createElementNS(NS, 'tspan');
      s.textContent = ch;
      s.style.cssText = 'fill-opacity:0;stroke-dashoffset:' + L;
      text.appendChild(s);
      return s;
    });
    svg.appendChild(text);

    var pos = el.style.position;
    if (cs.position === 'static') el.style.position = 'relative';
    el.appendChild(svg);

    // Letter by letter, left to right: each outline traces, then that letter's ink fills while
    // the next ones are still being drawn. The whole word takes `dur`.
    var dur = setting(el, 'duration', 2200);
    var n = spans.length;
    var each = dur * (n > 1 ? 0.5 : 1); // one letter's trace + fill
    var gap = n > 1 ? (dur - each) / (n - 1) : 0;
    var last;
    spans.forEach(function (s, i) {
      var at = i * gap;
      s.animate([{ strokeDashoffset: L }, { strokeDashoffset: 0 }],
        { delay: at, duration: each * 0.75, easing: 'cubic-bezier(.45,.05,.35,1)', fill: 'forwards' });
      last = s.animate([{ fillOpacity: 0 }, { fillOpacity: 1 }],
        { delay: at + each * 0.45, duration: each * 0.55, easing: 'ease-out', fill: 'forwards' });
    });
    last.finished.then(function () {
      el.style.color = '';
      el.style.position = pos;
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
        // Letter positions depend on the font, so wait until it has loaded.
        (document.fonts ? document.fonts.ready : Promise.resolve()).then(function () { draw(e.target); });
      });
    }, { threshold: 0.6 });
    Array.prototype.forEach.call(els, function (el) {
      if ((el.getAttribute('vci-draw') || '').toLowerCase() === 'false' || el.__draw) return;
      el.__color = getComputedStyle(el).color;
      el.style.color = 'transparent'; // hidden until it draws; layout is untouched
      io.observe(el);
    });
  }
  if (document.readyState === 'loading') document.addEventListener('DOMContentLoaded', init); else init();
})();
