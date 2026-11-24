/* [vci-dropdown="connected"]: an open Webflow dropdown draws its toggle and list as one shape, like the nav pill:
   the list grows out of the toggle's bottom edge with a concave fillet where they meet. Toggle and list get .is-connected
   (transparent in the style panel); the shape takes the list's own background, border, radius and shadow. */
(function () {
  var dds = document.querySelectorAll('[vci-dropdown="connected"]');
  if (!dds.length || !window.MutationObserver) return;
  var NS = 'http://www.w3.org/2000/svg';
  var reduce = matchMedia('(prefers-reduced-motion: reduce)');
  var SLIDE = 0.22; // seconds for the panel to settle, same feel as the nav

  Array.prototype.forEach.call(dds, function (dd) {
    var toggle = dd.querySelector('.w-dropdown-toggle');
    var list = dd.querySelector('.w-dropdown-list');
    if (!toggle || !list) return;
    var cs = getComputedStyle(list);
    var look = { r: parseFloat(cs.borderBottomLeftRadius) || 20, sw: parseFloat(cs.borderTopWidth) || 0 };
    var shadow = cs.boxShadow.match(/(rgba?\([^)]*\)|#\w+)\s+(-?[\d.]+)px\s+(-?[\d.]+)px\s+([\d.]+)px/);

    var svg = document.createElementNS(NS, 'svg');
    var path = document.createElementNS(NS, 'path');
    svg.setAttribute('aria-hidden', 'true');
    svg.style.cssText = 'position:absolute;left:0;top:0;overflow:visible;pointer-events:none;z-index:-1';
    if (shadow) svg.style.filter = 'drop-shadow(' + shadow[2] + 'px ' + shadow[3] + 'px ' + shadow[4] / 2 + 'px ' + shadow[1] + ')';
    path.setAttribute('fill', cs.backgroundColor);
    path.setAttribute('stroke', cs.borderTopColor);
    path.setAttribute('stroke-width', look.sw);
    svg.appendChild(path);
    dd.insertBefore(svg, dd.firstChild);

    var open = false, h = 0, full = 0, raf = 0, last = 0;
    var f2 = function (n) { return n.toFixed(2); };

    function draw() {
      var tw = toggle.offsetWidth, th = toggle.offsetHeight, pw = Math.max(list.offsetWidth, tw);
      var tr = th / 2;
      var R = Math.min(look.r, h / 2);
      var f = Math.max(0, Math.min(tr, look.r, pw - tw - R)); // the inverted corner
      var y1 = th + h;
      var arc = function (r, sweep, x, y) { return ' A' + f2(r) + ' ' + f2(r) + ' 0 0 ' + sweep + ' ' + f2(x) + ' ' + f2(y); };
      var d = 'M' + f2(tr) + ' 0 L' + f2(tw - tr) + ' 0' + arc(tr, 1, tw, tr);
      if (h < 0.5) {
        d += arc(tr, 1, tw - tr, th) + ' L' + f2(tr) + ' ' + f2(th) + arc(tr, 1, 0, tr) + ' Z'; // just the pill
      } else {
        d += ' L' + f2(tw) + ' ' + f2(th - f) + arc(f, 0, tw + f, th) +
          ' L' + f2(pw - R) + ' ' + f2(th) + arc(R, 1, pw, th + R) +
          ' L' + f2(pw) + ' ' + f2(y1 - R) + arc(R, 1, pw - R, y1) +
          ' L' + f2(R) + ' ' + f2(y1) + arc(R, 1, 0, y1 - R) +
          ' L0 ' + f2(tr) + arc(tr, 1, tr, 0) + ' Z';
      }
      svg.setAttribute('width', pw);
      svg.setAttribute('height', y1);
      path.setAttribute('d', d);
      list.style.clipPath = h < full - 0.5 ? 'inset(0 0 ' + f2(full - h) + 'px 0)' : '';
    }

    function tick(now) {
      var a = reduce.matches ? 1 : 1 - Math.exp(-((now - last) / 1000) / (SLIDE / 4));
      last = now;
      h += (full - h) * a;
      if (Math.abs(full - h) < 0.3) h = full;
      draw();
      raf = h !== full ? requestAnimationFrame(tick) : 0;
    }

    function sync() {
      var on = toggle.classList.contains('w--open');
      if (on === open) return; // our own class writes land here and stop
      open = on;
      toggle.classList.toggle('is-connected', on);
      list.classList.toggle('is-connected', on);
      if (!on) {
        cancelAnimationFrame(raf); raf = 0; h = full = 0;
        path.setAttribute('d', '');
        list.style.clipPath = '';
        return;
      }
      full = list.offsetHeight;
      h = reduce.matches ? full : 0;
      draw();
      last = performance.now();
      if (!raf) raf = requestAnimationFrame(tick);
    }

    new MutationObserver(sync).observe(toggle, { attributes: true, attributeFilter: ['class'] });
    addEventListener('resize', function () { if (open) { full = h = list.offsetHeight; draw(); } });
  });
})();
