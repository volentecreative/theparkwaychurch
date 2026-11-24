/* [vci-dropdown="connected"]: an open Webflow dropdown draws its toggle and list as one shape, like the nav pill.
   The list keeps its own offset below the toggle (the same gap as between toggles), and the concave corner runs around
   the neighbouring pill at that gap, so spacing stays even. Opening grows the panel out of the toggle; closing shrinks it
   back. Wrapper, toggle and list get .is-connected (style panel); the shape takes the list's background, border, radius
   and shadow. */
(function () {
  var dds = document.querySelectorAll('[vci-dropdown="connected"]');
  if (!dds.length || !window.MutationObserver) return;
  var NS = 'http://www.w3.org/2000/svg';
  var reduce = matchMedia('(prefers-reduced-motion: reduce)');
  var SLIDE = 0.22; // seconds to settle, same feel as the nav
  var f2 = function (n) { return n.toFixed(2); };
  var arc = function (r, sweep, x, y) { return ' A' + f2(r) + ' ' + f2(r) + ' 0 0 ' + sweep + ' ' + f2(x) + ' ' + f2(y); };

  Array.prototype.forEach.call(dds, function (dd) {
    var toggle = dd.querySelector('.w-dropdown-toggle');
    var list = dd.querySelector('.w-dropdown-list');
    if (!toggle || !list) return;
    var cs = getComputedStyle(list);
    var radius = parseFloat(cs.borderBottomLeftRadius) || 20;
    var shadow = cs.boxShadow.match(/(rgba?\([^)]*\)|#\w+)\s+(-?[\d.]+)px\s+(-?[\d.]+)px\s+([\d.]+)px/);

    var svg = document.createElementNS(NS, 'svg');
    var path = document.createElementNS(NS, 'path');
    svg.setAttribute('aria-hidden', 'true');
    svg.style.cssText = 'position:absolute;left:0;top:0;overflow:visible;pointer-events:none;z-index:-1';
    if (shadow) svg.style.filter = 'drop-shadow(' + shadow[2] + 'px ' + shadow[3] + 'px ' + shadow[4] / 2 + 'px ' + shadow[1] + ')';
    path.setAttribute('fill', cs.backgroundColor);
    path.setAttribute('stroke', cs.borderTopColor);
    path.setAttribute('stroke-width', parseFloat(cs.borderTopWidth) || 0);
    svg.appendChild(path);
    dd.insertBefore(svg, dd.firstChild);

    var open = false, h = 0, target = 0, full = 0, raf = 0, last = 0;

    function connect(on) {
      [dd, toggle, list].forEach(function (el) { el.classList.toggle('is-connected', on); });
    }

    function draw() {
      if (h < 0.5) { path.setAttribute('d', ''); return; }
      var tw = toggle.offsetWidth, th = toggle.offsetHeight, tr = th / 2;
      var gap = Math.max(0, list.offsetTop - th) * Math.min(1, h / radius); // eases in so the neck doesn't pop
      var py = th + gap; // panel top
      var cx = tw + gap + tr; // centre of the neighbour pill's corner; the concave corner keeps `gap` from it
      var R = Math.min(radius, h / 2);
      var pw = Math.max(list.offsetWidth, cx + R);
      var y1 = py + h;
      path.setAttribute('d',
        'M' + f2(tr) + ' 0 L' + f2(tw - tr) + ' 0' + arc(tr, 1, tw, tr) +
        arc(tr + gap, 0, cx, py) +
        ' L' + f2(pw - R) + ' ' + f2(py) + arc(R, 1, pw, py + R) +
        ' L' + f2(pw) + ' ' + f2(y1 - R) + arc(R, 1, pw - R, y1) +
        ' L' + f2(R) + ' ' + f2(y1) + arc(R, 1, 0, y1 - R) +
        ' L0 ' + f2(tr) + arc(tr, 1, tr, 0) + ' Z');
      svg.setAttribute('width', pw);
      svg.setAttribute('height', y1);
      list.style.clipPath = h < full - 0.5 ? 'inset(0 0 ' + f2(full - h) + 'px 0)' : '';
    }

    function tick(now) {
      var a = reduce.matches ? 1 : 1 - Math.exp(-((now - last) / 1000) / (SLIDE / 4));
      last = now;
      h += (target - h) * a;
      if (Math.abs(target - h) < 0.3) h = target;
      draw();
      if (h !== target) { raf = requestAnimationFrame(tick); return; }
      raf = 0;
      if (!open) { // fully closed: hand the toggle back to its own styles
        list.style.display = list.style.clipPath = '';
        connect(false);
      }
    }

    function run() {
      last = performance.now();
      if (!raf) raf = requestAnimationFrame(tick);
    }

    function sync() {
      var on = toggle.classList.contains('w--open');
      if (on === open) return; // our own class writes land here and stop
      open = on;
      if (on) {
        list.style.display = '';
        connect(true);
        full = target = list.offsetHeight;
      } else {
        list.style.display = 'block'; // Webflow hides it at once; keep it while it shrinks
        target = 0;
      }
      run();
    }

    new MutationObserver(sync).observe(toggle, { attributes: true, attributeFilter: ['class'] });
    addEventListener('resize', function () { if (open) { full = target = h = list.offsetHeight; draw(); } });
  });
})();
