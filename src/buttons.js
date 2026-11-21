/* Arch button morph, and the nav pill shape that follows it.
 * Why custom code: the hover morph tweens an SVG path "d" attribute, which the style
 * panel cannot do. All styling (fill, stroke, colors, variants) is native.
 * This script only (1) adds .is-ready, (2) sets the viewBox, (3) tweens the path "d".
 * Geometry: the resting shape fills the button_type box exactly (matches the native pill);
 * the hover tip overflows ~8px to the right into button_type's margin-right.
 * Touch: the morph is skipped for touch pointers and for non-keyboard focus, so phones
 * and tablets get no hover. Hover colors are switched off at tablet and below natively.
 * Header: a Primary button at the right end of .nav_pill also drives the paths in
 * .nav_pill-shape, so the pill edge follows the arch on hover (colors stay native).
 * Tertiary: an underline drawn 0.2em below the label. On hover it slides out to the right
 * while a second copy slides in from the left just behind it (one way; leaving does nothing), the old
 * Squarespace underline push. Both lines are the same .button_path, so stroke stays native;
 * the script only moves their stroke-dashoffset. Skipped for reduced motion and touch.
 */
(function () {
  var DUR = 700, K = 0.5523, STEP = 12;
  /* Underline slide: each line takes SDUR ms, the incoming one starts SLAG ms after the outgoing.
     PAD keeps a hidden dash (and a round cap) fully off the ends of the rule. */
  var SDUR = 450, SLAG = 140, PAD = 16;
  var easeInOut = function (t) { t = Math.max(0, Math.min(1, t)); return t < 0.5 ? 4 * t * t * t : 1 - Math.pow(-2 * t + 2, 3) / 2; };
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
  /* Light from above: a whisper of white at the top fading out by the middle, a touch of shade at
     the bottom edge. Alpha only, so it works over every fill color and its hover transition. */
  var shineId = 0;
  function shineFor(svg) {
    var ns = 'http://www.w3.org/2000/svg', id = 'button-shine-' + (++shineId);
    var defs = document.createElementNS(ns, 'defs'), g = document.createElementNS(ns, 'linearGradient');
    g.setAttribute('id', id); g.setAttribute('x1', '0'); g.setAttribute('y1', '0'); g.setAttribute('x2', '0'); g.setAttribute('y2', '1');
    [['0', '#fff', '0.16'], ['0.5', '#fff', '0'], ['0.75', '#000', '0'], ['1', '#000', '0.12']].forEach(function (s) {
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
  function toRule(W, y) { return 'M0 ' + y.toFixed(2) + ' L' + W.toFixed(2) + ' ' + y.toFixed(2); }
  function transparent(c) { return !c || c === 'transparent' || /rgba\(\s*\d+,\s*\d+,\s*\d+,\s*0\)/.test(c); }

  function setup(link) {
    var box = link.querySelector('.button_type'), svg = link.querySelector('.button_shape');
    var path = link.querySelector('.button_path'), label = link.querySelector('.button_label');
    if (!box || !svg || !path || link.__arch) return;
    link.__arch = true;

    /* Which variant? Read from the native styling before switching to SVG rendering:
       transparent + rounded = Secondary (outline), transparent + square = Tertiary (underline), else Primary. */
    var cs = getComputedStyle(box);
    var kind = transparent(cs.backgroundColor) ? (parseFloat(cs.borderRadius) === 0 ? 'underline' : 'outline') : 'fill';
    var inset = kind === 'outline' ? 1 : 0;
    box.classList.add('is-ready'); svg.classList.add('is-ready');
    /* Filled buttons: a second path with the same outline carries a soft light-to-shade gradient
       (a CSS gradient could not follow the arch). The drop shadow is native, on .button_shape.is-fill. */
    var shine = null;
    if (kind === 'fill') {
      svg.classList.add('is-fill');
      shine = shineFor(svg);
    }

    /* Header pill: when this button sits at the right end of .nav_pill, the pill outline is drawn
       from the same arch geometry so its edge keeps an even offset from the button on hover. */
    var pill = link.closest('.nav_pill'), pSvg = pill && pill.querySelector('.nav_pill-shape');
    var pPath = pSvg && kind === 'fill' ? pSvg.querySelectorAll('path') : null, PW = 0, PI = 0, follow = false;
    if (pPath && pPath.length) { pill.classList.add('is-ready'); pSvg.classList.add('is-ready'); } else pPath = null;

    var W = 160, RY = 63, cur = 0, from = 0, target = 0, t0 = 0, raf = 0;
    /* Underline slide state: `on` is the visible line, `off` waits hidden to the left. */
    var on = path, off = null, sliding = false, s0 = 0, sNow = 0;
    if (kind === 'underline') { off = path.cloneNode(false); path.parentNode.insertBefore(off, path.nextSibling); }
    function dash(el, offset) {
      el.style.strokeDasharray = W.toFixed(2) + ' ' + (W + PAD).toFixed(2);
      el.style.strokeDashoffset = offset.toFixed(2);
    }
    function draw() {
      var d = kind === 'underline' ? toRule(W, RY) : toPath(W, inset, cur);
      path.setAttribute('d', d);
      if (off) {
        off.setAttribute('d', d);
        var e = sliding ? sNow - s0 : 0, span = W + PAD;
        dash(on, sliding ? -span * easeInOut(e / SDUR) : 0);
        dash(off, sliding ? span * (1 - easeInOut((e - SLAG) / SDUR)) : span);
      }
      if (shine) shine.setAttribute('d', d);
      if (pPath && PW) { var pd = toPath(PW, PI, follow ? cur : 0); pPath.forEach(function (n) { n.setAttribute('d', pd); }); }
    }
    function measure() {
      var r = box.getBoundingClientRect(); if (!r.height) return;
      W = r.width / r.height * 64; svg.setAttribute('viewBox', '0 0 ' + W + ' 64');
      if (kind === 'underline' && label) {
        /* Underline sits 0.2em under the label instead of at the bottom of the box. */
        var lb = label.getBoundingClientRect();
        RY = Math.min(63, (lb.bottom - r.top + 0.2 * parseFloat(getComputedStyle(label).fontSize)) / r.height * 64);
      }
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
    function slideTick(now) {
      sNow = now; draw();
      if (now - s0 < SLAG + SDUR) { requestAnimationFrame(slideTick); return; }
      var t = on; on = off; off = t; sliding = false; draw();
    }
    function go(to) {
      if (kind === 'underline') {
        /* One slide on hover-in only; leaving does nothing. A re-enter mid-slide is ignored. */
        if (to !== 1 || reduce || sliding) return;
        sliding = true; s0 = sNow = performance.now(); requestAnimationFrame(slideTick);
        return;
      }
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
