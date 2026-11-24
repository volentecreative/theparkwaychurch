/* [vci-dropdown="connected"]: an open Webflow dropdown draws its toggle and list as one shape, like the nav pill.
   The list keeps its own offset below the toggle (the same gap as between toggles) and the concave corner runs around
   the neighbouring pill at that gap, so spacing stays even.
   Opening grows the panel diagonally out of the toggle in one motion: top-left anchored, right and bottom edges driven
   by the same eased progress, the contents laid out at full size, clipped to the panel and fading in with it. Closing
   runs it back. Opening another dropdown while one is open doesn't close one and open the other: the open panel slides
   and resizes onto the new toggle in the same motion while the two contents crossfade inside it.
   The outline is never empty while a toggle is connected (at rest it is exactly the toggle's pill), so the swap
   between the toggle's own border and the drawn line happens in one frame and can't blink. It is redrawn whenever the
   toggle or list changes size, e.g. a filter count appearing or options hiding. All looks are in the Designer: the
   [vci-dropdown="shape"] SVG (fill + line paths) and the .is-connected combos on wrapper, toggle and list. This only
   writes the outline, the clip and the fade. No script: stock floating dropdown. */
(function () {
  var dds = document.querySelectorAll('[vci-dropdown="connected"]');
  if (!dds.length || !window.MutationObserver) return;
  var reduce = matchMedia('(prefers-reduced-motion: reduce)');
  var DURATION = 0.2; // seconds for a full open, close or switch
  var f2 = function (n) { return n.toFixed(2); };
  var arc = function (r, sweep, x, y) { return ' A' + f2(r) + ' ' + f2(r) + ' 0 0 ' + sweep + ' ' + f2(x) + ' ' + f2(y); };
  var clamp = function (n) { return Math.min(1, Math.max(0, n)); };
  var lerp = function (a, b, t) { return a + (b - a) * t; };
  var ease = function (t) { return 1 - Math.pow(1 - t, 3); }; // ease-out
  var all = [];

  Array.prototype.forEach.call(dds, function (dd) {
    var toggle = dd.querySelector('.w-dropdown-toggle');
    var list = dd.querySelector('.w-dropdown-list');
    var svg = dd.querySelector('[vci-dropdown="shape"]');
    if (!toggle || !list || !svg) return;
    var paths = svg.querySelectorAll('path');
    var radius = parseFloat(getComputedStyle(list).borderBottomLeftRadius) || 20;
    var stroke = parseFloat(getComputedStyle(paths[paths.length - 1]).strokeWidth) || 0; // the line path is last
    var c = { dd: dd, toggle: toggle, list: list, open: false, connected: false, p: 0, from: 0, to: 0, start: 0, raf: 0,
      morph: null, shape: null };
    all.push(c);

    function connect(on) {
      c.connected = on;
      [dd, toggle, list].forEach(function (el) { el.classList.toggle('is-connected', on); });
    }
    function setPaths(d, ox) {
      Array.prototype.forEach.call(paths, function (path) {
        path.setAttribute('d', d);
        if (ox) path.setAttribute('transform', 'translate(' + f2(ox) + ' 0)'); else path.removeAttribute('transform');
      });
    }
    function full() { // the panel's resting width for this toggle
      var tw = toggle.offsetWidth, th = toggle.offsetHeight;
      return Math.max(list.offsetWidth, tw + Math.max(0, list.offsetTop - th) + th / 2 + radius);
    }
    // Clip a list (laid out at full size at its own `top`) to a panel spanning x0..x1 and down to y1, all in this
    // dropdown's coordinates.
    function clip(el, x0, x1, y1, done) {
      if (done) { el.style.removeProperty('clip-path'); return; }
      var lw = el.offsetWidth, lh = el.offsetHeight, top = el.offsetTop;
      el.style.clipPath = 'inset(0 ' + f2(Math.max(0, lw - x1)) + 'px ' + f2(clamp((top + lh - y1) / lh) * lh) + 'px ' +
        f2(Math.max(0, x0)) + 'px)';
    }

    // Draw a pill of width tw at x offset ox (from this toggle's left) with its panel W wide and H tall below it.
    function shape(ox, tw, W, H) {
      var th = toggle.offsetHeight, tr = th / 2, top = list.offsetTop;
      var gap = Math.max(0, top - th) * Math.min(1, H / radius); // eases in so the neck doesn't pop
      var py = th + gap, y1 = py + H; // panel top and bottom
      W = Math.max(W, tw);
      // The shape is the outer edge of the border box. The path runs half a stroke inside it, so the line covers the
      // same pixels as the toggle's own CSS border: o insets every edge, convex radii shrink by o, the concave one grows.
      var o = stroke / 2;
      var r = function (n) { return Math.max(0, n - o); };
      var d = 'M' + f2(tr) + ' ' + f2(o) + ' L' + f2(tw - tr) + ' ' + f2(o) + arc(r(tr), 1, tw - o, tr);
      var Rl = Math.min(Math.max(radius, tr), y1 - tr, tw / 2); // bottom-left; exactly tr when folded, so it rests as the pill
      if (W - tw < 0.5) { // one column, the toggle's width
        W = tw;
        d += ' L' + f2(tw - o) + ' ' + f2(y1 - Rl) + arc(r(Rl), 1, tw - Rl, y1 - o);
      } else {
        var k = Math.min(py - tr, (W - tw) / 2); // concave corner around the neighbouring pill
        var Rt = Math.max(o, Math.min(radius, W - tw - k, H / 2));
        var Rr = Math.max(o, Math.min(radius, H - Rt));
        d += ' L' + f2(tw - o) + ' ' + f2(py - k) + arc(k + o, 0, tw + k, py + o) +
          ' L' + f2(W - Rt) + ' ' + f2(py + o) + arc(r(Rt), 1, W - o, py + Rt) +
          ' L' + f2(W - o) + ' ' + f2(y1 - Rr) + arc(r(Rr), 1, W - Rr, y1 - o);
      }
      d += ' L' + f2(Rl) + ' ' + f2(y1 - o) + arc(r(Rl), 1, o, y1 - Rl) + ' L' + f2(o) + ' ' + f2(tr) + arc(r(tr), 1, tr, o) + ' Z';
      setPaths(d, ox);
      svg.style.overflow = ox ? 'visible' : '';
      svg.setAttribute('width', f2(Math.max(1, ox + W)));
      svg.setAttribute('height', f2(y1));
      c.shape = { left: toggle.getBoundingClientRect().left + ox, tw: tw, W: W, H: H };
      return { x0: ox, x1: ox + W, y1: y1 };
    }

    function draw() {
      if (!c.connected || c.fading) return; // a panel fading out under another's slide is drawn by that one
      var tw = toggle.offsetWidth, lh = list.offsetHeight;
      if (c.morph) { // sliding over from another dropdown's panel
        var m = c.morph, s = c.p, shift = m.ctl.toggle.getBoundingClientRect().left - toggle.getBoundingClientRect().left;
        var box = shape(lerp(m.left - toggle.getBoundingClientRect().left, 0, s), lerp(m.tw, tw, s),
          lerp(m.W, full(), s), lerp(m.H, lh, s));
        clip(list, box.x0, box.x1, box.y1, s >= 1);
        list.style.opacity = s >= 1 ? '' : f2(s);
        clip(m.ctl.list, box.x0 - shift, box.x1 - shift, box.y1, false);
        m.ctl.list.style.opacity = f2(m.opacity * (1 - s));
        return;
      }
      var p = c.p, b = shape(0, tw, lerp(tw, full(), p), lh * p);
      clip(list, 0, b.x1, b.y1, p >= 1);
      list.style.opacity = p >= 1 ? '' : f2(p);
    }
    c.draw = draw;

    function release(other) { // the panel we slid off: hand it back to its own styles
      other.list.style.removeProperty('display');
      other.list.style.removeProperty('clip-path');
      other.list.style.removeProperty('opacity');
      other.dd.style.removeProperty('z-index');
      other.fading = false;
      other.connect(false);
    }

    function tick(now) {
      var span = DURATION * 1000 * Math.abs(c.to - c.from);
      var t = reduce.matches || !span ? 1 : clamp((now - c.start) / span);
      c.p = c.from + (c.to - c.from) * ease(t);
      draw();
      if (t < 1) { c.raf = requestAnimationFrame(tick); return; }
      c.raf = 0;
      if (c.morph) { // landed on this toggle
        release(c.morph.ctl);
        c.morph = null;
        toggle.classList.add('is-connected');
        draw();
      }
      if (!c.open) { // folded back into the toggle: hand everything back to its own styles, all in this one step
        list.style.removeProperty('display');
        list.style.removeProperty('clip-path');
        list.style.removeProperty('opacity');
        connect(false);
        setPaths('');
        svg.style.overflow = '';
      }
    }
    function run(from, to) {
      c.from = from; c.to = to; c.start = performance.now();
      draw(); // this same frame: the outline is in place before the toggle's own border goes
      if (!c.raf) c.raf = requestAnimationFrame(tick);
    }
    c.connect = connect;

    // Another dropdown's panel is showing: take it over and slide it here instead of opening from the toggle.
    function takeOver(other) {
      var g = other.shape, opacity = parseFloat(other.list.style.opacity || '1');
      if (other.raf) { cancelAnimationFrame(other.raf); other.raf = 0; }
      if (other.morph) { release(other.morph.ctl); other.morph = null; }
      other.open = false; other.p = 0; other.fading = true;
      other.toggle.classList.remove('is-connected'); // its own border is back; the list stays connected while it fades
      other.list.style.display = 'block';
      other.dd.style.zIndex = '31'; // its fading contents stay above this fill
      other.setPaths('');
      c.morph = { ctl: other, left: g.left, tw: g.tw, W: g.W, H: g.H, opacity: opacity };
      dd.classList.add('is-connected'); list.classList.add('is-connected'); c.connected = true; // toggle joins on landing
      c.p = 0;
      run(0, 1);
    }
    c.setPaths = setPaths;

    function sync() {
      var on = toggle.classList.contains('w--open');
      if (on === c.open) return; // our own class writes land here and stop
      c.open = on;
      if (on) {
        list.style.display = '';
        var other = all.filter(function (x) { return x !== c && x.connected && x.shape && !x.fading; })[0];
        if (other && !c.connected) { takeOver(other); return; }
        if (!c.connected) connect(true);
      } else {
        if (c.morph) { release(c.morph.ctl); c.morph = null; toggle.classList.add('is-connected'); }
        list.style.display = 'block'; // Webflow hides it at once; keep it while it folds
      }
      run(c.p, on ? 1 : 0);
    }

    new MutationObserver(sync).observe(toggle, { attributes: true, attributeFilter: ['class'] });
    if (window.ResizeObserver) { // a filter count appearing on the toggle, options hiding as other filters change
      var ro = new ResizeObserver(function () { draw(); });
      ro.observe(toggle);
      ro.observe(list);
    }
    addEventListener('resize', function () { draw(); });
  });
})();
