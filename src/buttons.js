/* Arch button morph, and the nav pill shape that follows it.
 * Why custom code: the hover morph tweens an SVG path "d" attribute, which the style
 * panel cannot do. All styling (fill, stroke, colors, variants, shine, shadow) is native.
 * The Primary button's shine (background-image gradient) and depth (box-shadow) are authored on
 * .button_type in Webflow, so the Designer shows the finished button; this script mirrors those
 * computed values onto the SVG (gradient path + drop-shadow filters) and keeps nothing of its own.
 * This script only (1) adds .is-ready, (2) sets the viewBox, (3) tweens the path "d".
 * Geometry: the resting shape fills the button_type box exactly (matches the native pill);
 * the hover tip overflows ~8px to the right into button_type's margin-right.
 * Touch: the morph is skipped for touch pointers and for non-keyboard focus, so phones
 * and tablets get no hover. Hover colors are switched off at tablet and below natively.
 * Header: a Primary button at the right end of .nav_pill also drives the paths in
 * .nav_pill-shape, so the pill edge follows the arch on hover (colors stay native).
 * Tertiary: the underline is built in Webflow (.button_underline > two .button_underline-line,
 * shown only in the Tertiary variant, sitting 0.2em under the label), so the Designer and the live
 * site render the same element. The SVG is not used for Tertiary. On hover the visible line slides
 * out to the right while the other (parked off the left by .is-incoming) slides in just behind it
 * (one way; leaving does nothing), the old Squarespace underline push. The script only sets their
 * transform. Skipped for reduced motion and touch.
 */
(function () {
  var DUR = 700, K = 0.5523, STEP = 12;
  /* Underline slide: each line takes SDUR ms, the incoming one starts SLAG ms after the outgoing. */
  var SDUR = 450, SLAG = 140, SEASE = 'cubic-bezier(0.65, 0, 0.35, 1)';
  var reduce = window.matchMedia && matchMedia('(prefers-reduced-motion: reduce)').matches;
  var ease = function (t) { t = Math.min(1, t); return 1 - Math.exp(-10.5 * t) * (1 + 10.5 * t); };

  function endPoints(E, i, arch) {
    var r = 32 - i, k = K * r;
    if (!arch) return [E, i,  E + k, i,  E + r, 32 - k,  E + r, 32,   E + r, 32,   E + r, 32,   E + r, 32 + k,  E + k, 64 - i,  E, 64 - i];
    var a = i ? [20.18, 0.84, 39.92, 12.25, 49.88, 29.80, 51.15] : [20.85, 0, 40.30, 11.23, 50.75, 29.30, 52.30], b = E - STEP;
    return [b, i,  b + a[0], a[1],  b + a[2], a[3],  b + a[4], a[5],   b + a[6], 32,   b + a[4], 64 - a[5],   b + a[2], 64 - a[3],  b + a[0], 64 - a[1],  b, 64 - i];
  }
  function toPath(W, i, p) {
    var E = W - 32, r = 32 - i, k = K * r, A = endPoints(E, i, false), B = endPoints(E, i, true), n = [];
    for (var j = 0; j < A.length; j++) n.push((A[j] + (B[j] - A[j]) * p).toFixed(2));
    return 'M32 ' + i + ' L' + n[0] + ' ' + n[1] +
      ' C' + n[2] + ' ' + n[3] + ' ' + n[4] + ' ' + n[5] + ' ' + n[6] + ' ' + n[7] +
      ' L' + n[8] + ' ' + n[9] + ' L' + n[10] + ' ' + n[11] +
      ' C' + n[12] + ' ' + n[13] + ' ' + n[14] + ' ' + n[15] + ' ' + n[16] + ' ' + n[17] +
      ' L32 ' + (64 - i) +
      ' C' + (32 - k) + ' ' + (64 - i) + ' ' + i + ' ' + (32 + k) + ' ' + i + ' 32' +
      ' C' + i + ' ' + (32 - k) + ' ' + (32 - k) + ' ' + i + ' 32 ' + i + ' Z';
  }
  /* The look is authored in Webflow, not here: .button_type carries the shine as a top-to-bottom
     background-image gradient and the depth as a box-shadow, so the Designer shows the finished
     button. Once the SVG takes over (is-ready clears both), these mirror those exact values onto it:
     a gradient path that follows the arch, and the shadow as drop-shadow filters on the SVG. */
  function splitTop(s) { // split on commas that are not inside parentheses
    var out = [], depth = 0, cur = '';
    for (var i = 0; i < s.length; i++) {
      var c = s[i];
      if (c === '(') depth++; else if (c === ')') depth--;
      if (c === ',' && !depth) { out.push(cur.trim()); cur = ''; } else cur += c;
    }
    if (cur.trim()) out.push(cur.trim());
    return out;
  }
  function gradientStops(bg) {
    var m = /linear-gradient\((.*)\)\s*$/.exec(bg || '');
    if (!m) return null;
    var parts = splitTop(m[1]), stops = [];
    // Only top-to-bottom is mirrored (the default, "180deg" or "to bottom").
    if (parts.length && !/^(rgba?|#|hsla?|transparent)/.test(parts[0])) {
      if (!/^(180deg|to bottom)$/.test(parts[0])) return null;
      parts.shift();
    }
    parts.forEach(function (p, i) {
      var c = /^(rgba?\([^)]*\)|transparent)\s*([\d.]+%)?$/.exec(p);
      if (!c) return;
      var v = c[1] === 'transparent' ? [0, 0, 0, 0] : c[1].replace(/rgba?\(|\)/g, '').split(',').map(parseFloat);
      stops.push([c[2] ? parseFloat(c[2]) / 100 : i / Math.max(1, parts.length - 1), 'rgb(' + v[0] + ',' + v[1] + ',' + v[2] + ')', v.length > 3 ? v[3] : 1]);
    });
    return stops.length > 1 ? stops : null;
  }
  function dropShadows(bs) {
    if (!bs || bs === 'none') return '';
    return splitTop(bs).filter(function (s) { return !/inset/.test(s); }).map(function (s) {
      var color = (/(rgba?\([^)]*\)|#[0-9a-f]+)/i.exec(s) || [''])[0];
      var n = s.replace(color, '').trim().split(/\s+/).map(parseFloat); // x y blur [spread]
      return 'drop-shadow(' + (n[0] || 0) + 'px ' + (n[1] || 0) + 'px ' + (n[2] || 0) + 'px ' + color + ')';
    }).join(' ');
  }
  var shineId = 0;
  function shineFor(svg, stops) {
    var ns = 'http://www.w3.org/2000/svg', id = 'button-shine-' + (++shineId);
    var defs = document.createElementNS(ns, 'defs'), g = document.createElementNS(ns, 'linearGradient');
    g.setAttribute('id', id); g.setAttribute('x1', '0'); g.setAttribute('y1', '0'); g.setAttribute('x2', '0'); g.setAttribute('y2', '1');
    stops.forEach(function (s) {
      var stop = document.createElementNS(ns, 'stop');
      stop.setAttribute('offset', s[0]); stop.setAttribute('stop-color', s[1]); stop.setAttribute('stop-opacity', s[2]);
      g.appendChild(stop);
    });
    defs.appendChild(g); svg.appendChild(defs);
    var p = document.createElementNS(ns, 'path');
    p.setAttribute('class', 'button_shine'); p.setAttribute('fill', 'url(#' + id + ')');
    svg.appendChild(p);
    return p;
  }
  /* Tertiary: animate the two Webflow-built lines. `on` is visible, `off` waits off the left edge
     (.button_underline overflow hides it). After a slide they swap roles. */
  function setupUnderline(link, under) {
    var lines = under.querySelectorAll('.button_underline-line');
    if (lines.length < 2) return;
    var on = lines[0], off = lines[1], sliding = false;
    on.style.transform = 'translateX(0)'; off.style.transform = 'translateX(-100%)';
    function slide() {
      if (reduce || sliding || !on.animate) return;
      sliding = true;
      var opts = { duration: SDUR, easing: SEASE, fill: 'forwards' };
      on.animate([{ transform: 'translateX(0)' }, { transform: 'translateX(100%)' }], opts);
      var a = off.animate([{ transform: 'translateX(-100%)' }, { transform: 'translateX(0)' }],
        { duration: SDUR, easing: SEASE, fill: 'forwards', delay: SLAG });
      a.onfinish = function () {
        var t = on; on = off; off = t;
        on.style.transform = 'translateX(0)'; off.style.transform = 'translateX(-100%)';
        on.getAnimations().concat(off.getAnimations()).forEach(function (x) { x.cancel(); });
        sliding = false;
      };
    }
    function keyboardFocus() { try { return link.matches(':focus-visible'); } catch (e) { return true; } }
    link.addEventListener('pointerenter', function (e) { if (e.pointerType !== 'touch') slide(); });
    link.addEventListener('focus', function () { if (keyboardFocus()) slide(); });
  }
  function transparent(c) { return !c || c === 'transparent' || /rgba\(\s*\d+,\s*\d+,\s*\d+,\s*0\)/.test(c); }

  function setup(link) {
    var box = link.querySelector('.button_type'), svg = link.querySelector('.button_shape');
    var path = link.querySelector('.button_path');
    if (!box || link.__arch) return;
    link.__arch = true;
    /* Tertiary: its own native underline, no SVG. */
    var under = box.querySelector('.button_underline');
    if (under && getComputedStyle(under).display !== 'none') return setupUnderline(link, under);
    if (!svg || !path) return;

    /* Which variant? Read from the native styling before switching to SVG rendering:
       transparent = Secondary (outline), else Primary. */
    var cs = getComputedStyle(box);
    var kind = transparent(cs.backgroundColor) ? 'outline' : 'fill';
    var inset = kind === 'outline' ? 1 : 0;
    /* Read the Webflow-authored shine and shadow now: is-ready clears them from the box. */
    var stops = kind === 'fill' ? gradientStops(cs.backgroundImage) : null;
    var shadow = kind === 'fill' ? dropShadows(cs.boxShadow) : '';
    box.classList.add('is-ready'); svg.classList.add('is-ready');
    /* Filled buttons: a second path with the same outline carries the gradient (a CSS gradient on the
       box could not follow the arch), and the box-shadow moves to the SVG as drop-shadow filters. */
    var shine = null;
    if (kind === 'fill') {
      svg.classList.add('is-fill');
      if (stops) shine = shineFor(svg, stops);
      if (shadow) svg.style.filter = shadow;
    }

    /* Header pill: when this button sits at the right end of .nav_pill, the pill outline is drawn
       from the same arch geometry so its edge keeps an even offset from the button on hover. */
    var pill = link.closest('.nav_pill'), pSvg = pill && pill.querySelector('.nav_pill-shape');
    var pPath = pSvg && kind === 'fill' ? pSvg.querySelectorAll('path') : null, PW = 0, PI = 0, follow = false;
    if (pPath && pPath.length) { pill.classList.add('is-ready'); pSvg.classList.add('is-ready'); } else pPath = null;

    var W = 160, cur = 0, from = 0, target = 0, t0 = 0, raf = 0;
    function draw() {
      var d = toPath(W, inset, cur);
      path.setAttribute('d', d);
      if (shine) shine.setAttribute('d', d);
      if (pPath && PW) { var pd = toPath(PW, PI, follow ? cur : 0); pPath.forEach(function (n) { n.setAttribute('d', pd); }); }
    }
    function measure() {
      var r = box.getBoundingClientRect(); if (!r.height) return;
      W = r.width / r.height * 64; svg.setAttribute('viewBox', '0 0 ' + W + ' 64');
      if (pPath) {
        var q = pill.getBoundingClientRect();
        PW = q.width / q.height * 64; PI = 32 / q.height; pSvg.setAttribute('viewBox', '0 0 ' + PW + ' 64');
        follow = Math.abs((q.right - r.right) - (r.top - q.top)) < 3;
      }
      draw();
    }
    function tick(now) {
      var p = ease((now - t0) / DUR); cur = from + (target - from) * p; draw();
      if ((now - t0) < DUR) raf = requestAnimationFrame(tick); else { cur = target; draw(); raf = 0; }
    }
    function go(to) {
      if (to === cur && !raf) return;
      target = to; if (reduce) { cur = to; draw(); return; }
      from = cur; t0 = performance.now(); if (!raf) raf = requestAnimationFrame(tick);
    }
    function keyboardFocus() { try { return link.matches(':focus-visible'); } catch (e) { return true; } }
    link.addEventListener('pointerenter', function (e) { if (e.pointerType !== 'touch') go(1); });
    link.addEventListener('pointerleave', function () { go(0); });
    link.addEventListener('focus', function () { if (keyboardFocus()) go(1); });
    link.addEventListener('blur', function () { go(0); });
    if (window.ResizeObserver) { var ro = new ResizeObserver(measure); ro.observe(box); if (pPath) ro.observe(pill); } else addEventListener('resize', measure);
    measure(); if (document.fonts) document.fonts.ready.then(measure);
  }
  function init() { document.querySelectorAll('.button').forEach(setup); }
  if (document.readyState === 'loading') document.addEventListener('DOMContentLoaded', init); else init();
})();
