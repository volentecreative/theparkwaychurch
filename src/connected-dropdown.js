/* [vci-dropdown="connected"]: an open Webflow dropdown draws its toggle and list as one shape, like the nav pill.
   The list keeps its own offset below the toggle (the same gap as between toggles) and the concave corner runs around
   the neighbouring pill at that gap, so spacing stays even. Opening grows the panel out of the toggle; closing shrinks
   it back. All looks are in the Designer: the [vci-dropdown="shape"] SVG (fill + line paths) and the .is-connected
   combos on wrapper, toggle and list. This only writes the outline and the clip. No script: stock floating dropdown. */
(function () {
  var dds = document.querySelectorAll('[vci-dropdown="connected"]');
  if (!dds.length || !window.MutationObserver) return;
  var reduce = matchMedia('(prefers-reduced-motion: reduce)');
  var SLIDE = 0.22; // seconds to settle, same feel as the nav
  var f2 = function (n) { return n.toFixed(2); };
  var arc = function (r, sweep, x, y) { return ' A' + f2(r) + ' ' + f2(r) + ' 0 0 ' + sweep + ' ' + f2(x) + ' ' + f2(y); };

  Array.prototype.forEach.call(dds, function (dd) {
    var toggle = dd.querySelector('.w-dropdown-toggle');
    var list = dd.querySelector('.w-dropdown-list');
    var svg = dd.querySelector('[vci-dropdown="shape"]');
    if (!toggle || !list || !svg) return;
    var paths = svg.querySelectorAll('path');
    var radius = parseFloat(getComputedStyle(list).borderBottomLeftRadius) || 20;
    var open = false, h = 0, target = 0, full = 0, raf = 0, last = 0;

    function connect(on) {
      [dd, toggle, list].forEach(function (el) { el.classList.toggle('is-connected', on); });
    }

    function draw() {
      var d = '';
      if (h >= 0.5) {
        var tw = toggle.offsetWidth, th = toggle.offsetHeight, tr = th / 2;
        var gap = Math.max(0, list.offsetTop - th) * Math.min(1, h / radius); // eases in so the neck doesn't pop
        var py = th + gap; // panel top
        var cx = tw + gap + tr; // centre of the neighbour pill's corner: the concave corner keeps `gap` from it
        var R = Math.min(radius, h / 2);
        var pw = Math.max(list.offsetWidth, cx + R);
        var y1 = py + h;
        d = 'M' + f2(tr) + ' 0 L' + f2(tw - tr) + ' 0' + arc(tr, 1, tw, tr) + arc(tr + gap, 0, cx, py) +
          ' L' + f2(pw - R) + ' ' + f2(py) + arc(R, 1, pw, py + R) +
          ' L' + f2(pw) + ' ' + f2(y1 - R) + arc(R, 1, pw - R, y1) +
          ' L' + f2(R) + ' ' + f2(y1) + arc(R, 1, 0, y1 - R) +
          ' L0 ' + f2(tr) + arc(tr, 1, tr, 0) + ' Z';
        svg.setAttribute('width', pw);
        svg.setAttribute('height', y1);
      }
      Array.prototype.forEach.call(paths, function (p) { p.setAttribute('d', d); });
      // Clipped on every frame it is shorter than full, right down to 0; only a finished close (below) unclips it.
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
      if (!open) { // fully closed: hand everything back to its own styles, all in this one step
        list.style.removeProperty('display');
        list.style.removeProperty('clip-path');
        connect(false);
      }
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
        list.style.clipPath = 'inset(0 0 0px 0)'; // clipped from this very frame, never shown bare without w--open
        target = 0;
      }
      last = performance.now();
      if (!raf) raf = requestAnimationFrame(tick);
    }

    new MutationObserver(sync).observe(toggle, { attributes: true, attributeFilter: ['class'] });
    addEventListener('resize', function () { if (open) { full = target = h = list.offsetHeight; draw(); } });
  });
})();
