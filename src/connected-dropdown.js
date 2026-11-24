/* [vci-dropdown="connected"]: an open Webflow dropdown draws its toggle and list as one shape, like the nav pill.
   The list keeps its own offset below the toggle (the same gap as between toggles) and the concave corner runs around
   the neighbouring pill at that gap, so spacing stays even. Opening drops the panel straight down out of the toggle at
   the toggle's width, then widens it; closing folds it back the same way until it is just the toggle again.
   The outline is never empty while the toggle is connected (at rest it is exactly the toggle's pill), so the swap
   between the toggle's own border and the drawn line happens in one frame and can't blink. It is redrawn whenever the
   toggle or list changes size, e.g. a filter count appearing or options hiding. All looks are in the Designer: the [vci-dropdown="shape"] SVG
   (fill + line paths) and the .is-connected combos on wrapper, toggle and list. This only writes the outline and the
   clip. No script: stock floating dropdown. */
(function () {
  var dds = document.querySelectorAll('[vci-dropdown="connected"]');
  if (!dds.length || !window.MutationObserver) return;
  var reduce = matchMedia('(prefers-reduced-motion: reduce)');
  var DURATION = 0.34; // seconds for a full open or close
  var LEAD = 0.65; // share of the motion spent dropping down; widening overlaps the rest
  var f2 = function (n) { return n.toFixed(2); };
  var arc = function (r, sweep, x, y) { return ' A' + f2(r) + ' ' + f2(r) + ' 0 0 ' + sweep + ' ' + f2(x) + ' ' + f2(y); };
  var clamp = function (n) { return Math.min(1, Math.max(0, n)); };
  var ease = function (t) { return t < 0.5 ? 4 * t * t * t : 1 - Math.pow(2 - 2 * t, 3) / 2; };

  Array.prototype.forEach.call(dds, function (dd) {
    var toggle = dd.querySelector('.w-dropdown-toggle');
    var list = dd.querySelector('.w-dropdown-list');
    var svg = dd.querySelector('[vci-dropdown="shape"]');
    if (!toggle || !list || !svg) return;
    var paths = svg.querySelectorAll('path');
    var radius = parseFloat(getComputedStyle(list).borderBottomLeftRadius) || 20;
    var open = false, connected = false, p = 0, from = 0, to = 0, start = 0, raf = 0;

    function connect(on) {
      connected = on;
      [dd, toggle, list].forEach(function (el) { el.classList.toggle('is-connected', on); });
    }

    function setPaths(d) {
      Array.prototype.forEach.call(paths, function (path) { path.setAttribute('d', d); });
    }

    // p runs 0 (just the toggle) to 1 (fully open). Height leads, width follows.
    function draw() {
      if (!connected) return;
      var tw = toggle.offsetWidth, th = toggle.offsetHeight, tr = th / 2;
      var lw = list.offsetWidth, lh = list.offsetHeight, top = list.offsetTop;
      var hp = clamp(p / LEAD), wp = clamp((p - (1 - LEAD)) / LEAD);
      var H = lh * hp;
      var gap = Math.max(0, top - th) * Math.min(1, H / radius); // eases in so the neck doesn't pop
      var py = th + gap, y1 = py + H; // panel top and bottom
      var full = Math.max(lw, tw + gap + tr + radius);
      var W = tw + (full - tw) * wp;
      var d = 'M' + f2(tr) + ' 0 L' + f2(tw - tr) + ' 0' + arc(tr, 1, tw, tr);
      var Rl = Math.min(Math.max(radius, tr), y1 - tr, tw / 2); // bottom-left; exactly tr when folded, so it rests as the pill
      if (W - tw < 0.5) { // one column, the toggle's width
        W = tw;
        d += ' L' + f2(tw) + ' ' + f2(y1 - Rl) + arc(Rl, 1, tw - Rl, y1);
      } else {
        var k = Math.min(py - tr, (W - tw) / 2); // concave corner around the neighbouring pill
        var Rt = Math.min(radius, W - tw - k, H / 2);
        var Rr = Math.min(radius, H - Rt);
        d += ' L' + f2(tw) + ' ' + f2(py - k) + arc(k, 0, tw + k, py) +
          ' L' + f2(W - Rt) + ' ' + f2(py) + arc(Rt, 1, W, py + Rt) +
          ' L' + f2(W) + ' ' + f2(y1 - Rr) + arc(Rr, 1, W - Rr, y1);
      }
      d += ' L' + f2(Rl) + ' ' + f2(y1) + arc(Rl, 1, 0, y1 - Rl) + ' L0 ' + f2(tr) + arc(tr, 1, tr, 0) + ' Z';
      setPaths(d);
      svg.setAttribute('width', f2(W));
      svg.setAttribute('height', f2(y1));
      // The list's own box sits at `top`; show only the part inside the panel.
      list.style.clipPath = p >= 1 ? '' :
        'inset(0 ' + f2(Math.max(0, lw - W)) + 'px ' + f2(clamp((top + lh - y1) / lh) * lh) + 'px 0)';
    }

    function tick(now) {
      var span = DURATION * 1000 * Math.abs(to - from);
      var t = reduce.matches || !span ? 1 : clamp((now - start) / span);
      p = from + (to - from) * ease(t);
      draw();
      if (t < 1) { raf = requestAnimationFrame(tick); return; }
      raf = 0;
      if (!open) { // folded back into the toggle: hand everything back to its own styles, all in this one step
        list.style.removeProperty('display');
        list.style.removeProperty('clip-path');
        connect(false);
        setPaths('');
      }
    }

    function sync() {
      var on = toggle.classList.contains('w--open');
      if (on === open) return; // our own class writes land here and stop
      open = on;
      if (on) {
        list.style.display = '';
        if (!connected) connect(true);
      } else {
        list.style.display = 'block'; // Webflow hides it at once; keep it while it folds
      }
      from = p; to = on ? 1 : 0; start = performance.now();
      draw(); // this same frame: the outline is in place before the toggle's own border goes
      if (!raf) raf = requestAnimationFrame(tick);
    }

    new MutationObserver(sync).observe(toggle, { attributes: true, attributeFilter: ['class'] });
    if (window.ResizeObserver) { // a filter count appearing on the toggle, options hiding as other filters change
      var ro = new ResizeObserver(draw);
      ro.observe(toggle);
      ro.observe(list);
    }
    addEventListener('resize', draw);
  });
})();
