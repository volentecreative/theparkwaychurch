/*! The Parkway Church site code v0.4.0. Built from src/, do not edit. */
/* ---- src/buttons.js ---- */
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
 * Tertiary: a plain underline drawn 0.2em below the label, with no hover morph.
 */
(function () {
  var DUR = 700, K = 0.5523, STEP = 12;
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
    function draw() {
      var d = kind === 'underline' ? toRule(W, RY) : toPath(W, inset, cur);
      path.setAttribute('d', d);
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
    function go(to) {
      if (kind === 'underline' || (to === cur && !raf)) return;
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

/* ---- src/nav-scroll.js ---- */
/* Scroll-linked header: a class switcher. Why custom code: hiding the header on the way down and
   showing it on the way up needs the scroll direction, which CSS and Webflow interactions can't read.

   All the look and motion is in the Webflow style panel:
     nav_component            position: fixed, plus transition: transform
     nav_component.is-hidden  transform that moves it off the top of the screen
   This only adds and removes is-hidden. The header is always fixed, so it can never leave a gap
   at the top of the screen however fast the page is flung. If this file doesn't load, the header
   simply stays put.

   Also closes an open nav dropdown when the header hides, so a menu never hangs off screen.
   A dropdown holding keyboard focus stays open, and focus inside the header shows it again. */
(function(){
  var nav=document.querySelector('.nav_component'); if(!nav) return;
  var HIDDEN='is-hidden';
  var TOLERANCE=6; // px of travel in one direction before the header reacts (ignores jitter)
  var last=Math.max(0,scrollY), travel=0;

  // Close through Webflow's own dropdown handler, so its fade, classes and aria all reset.
  function closeDropdowns(){
    var open=nav.querySelectorAll('.w-dropdown-list.w--open');
    for(var i=0;i<open.length;i++){
      var dd=open[i].parentElement;
      if(dd.contains(document.activeElement)) continue;
      if(window.jQuery) jQuery(dd).triggerHandler('w-close');
      else dd.dispatchEvent(new Event('w-close'));
    }
  }

  function hide(on){
    if(nav.classList.contains(HIDDEN)===on) return;
    if(on && nav.contains(document.activeElement)) return;
    nav.classList.toggle(HIDDEN,on);
    if(on) closeDropdowns();
  }

  function onScroll(){
    // Clamp: iOS rubber-banding past either end reports scroll that isn't real.
    var end=document.documentElement.scrollHeight-innerHeight;
    var y=Math.min(Math.max(0,scrollY),end), d=y-last; last=y;
    if(!d) return;
    travel=(d>0)===(travel>0)?travel+d:d; // restarts when the direction flips
    if(y<=nav.offsetHeight) return hide(false); // never hidden while near the top
    if(travel>TOLERANCE) hide(true);
    else if(travel<-TOLERANCE) hide(false);
  }

  addEventListener('scroll',onScroll,{passive:true});
  nav.addEventListener('focusin',function(){ hide(false); });
})();

/* ---- src/nav-dropdown.js ---- */
/*!
 * The Parkway Church — connected nav dropdowns
 *
 * Draws the open dropdown as part of the nav pill (one shape, concave corners
 * where it meets the pill), slides it between dropdowns, crossfades the links,
 * glides one hover highlight between links and rotates the open chevron.
 *
 * Progressive enhancement: this file only ever ADDS to the stock Webflow
 * dropdown. If it fails to load, or bails out below, the dropdowns keep their
 * normal floating-card look and behaviour, because every "connected" style in
 * Webflow hangs off classes that only this script applies:
 *
 *   nav_dropdown-list.is-connected  card background / border / shadow removed
 *   nav_dropdown-list.is-leaving    list being left while Webflow's hover delay holds it open
 *   nav_dropdown-icon.is-open       chevron rotated
 *
 * Tuning lives in Webflow, as custom attributes on .nav_pill or any ancestor
 * of it (all optional). vci- prefix, same shape as narthex settings:
 *
 *   vci-dropdown-travel         px the links drift when switching        (16)
 *   vci-dropdown-crossfade      ms for old and new links to crossfade     (110)
 *   vci-dropdown-flip           true = new links enter from the other side (false)
 *   vci-dropdown-safe-triangle  false = switch tabs the instant they are touched (true)
 *   vci-dropdown-pass-through   ms a tab must be hovered before it takes over, 0 = off (0)
 *
 * Expects (drawn by buttons.js): .nav_pill > svg.nav_pill-shape > path.nav_pill-fill
 */
(function () {
  'use strict';

  var SLIDE = 0.22; // seconds for the panel to settle on a new dropdown
  var OPEN_IN = 280; // ms, links easing in on a fresh open
  var DRIFT_MS = 220; // ms, new links finishing their drift after a switch
  var EASE = 'cubic-bezier(.2,.7,.2,1)';
  var HOVER_MS = 180; // ms for the link highlight to glide to the next link
  var HOVER_TINT = 'var(--brand--brand-100)'; // same tint as nav_dropdown-link:hover
  var SAFE_REST = 120; // ms resting on a tab inside the safe triangle before it switches anyway
  var SAFE_SLOPE = 0.35; // how steeply down (dy/dx) the pointer must be moving to count as aiming at the panel
  var SAFE_PAD = 12; // px the safe triangle's base overhangs the panel on each side

  // The pill's SVG is sized and drawn by buttons.js, which may not have run yet.
  function shapeOf(pill) {
    var svg = pill.querySelector('.nav_pill-shape');
    return svg && svg.viewBox && svg.querySelector('.nav_pill-fill') ? svg : null;
  }

  function init(pill) {
    var svg = shapeOf(pill);
    var lists = Array.prototype.slice.call(pill.querySelectorAll('.nav_dropdown-list'));
    // Anything missing: leave the stock dropdowns alone.
    if (!svg || !lists.length) return;
    // Mouse-driven extras (gliding highlight, safe triangle, pass-through) need pointer events.
    var hasPointer = !!window.PointerEvent;

    // Settings: vci-dropdown-<name> on the pill, or on any ancestor (so one can sit on <html>).
    function setting(name) {
      var attr = 'vci-dropdown-' + name;
      var el = pill.closest ? pill.closest('[' + attr + ']') : pill.hasAttribute(attr) ? pill : null;
      return el ? el.getAttribute(attr) : null;
    }
    function num(name, fallback) {
      var v = parseFloat(setting(name));
      return isFinite(v) ? v : fallback;
    }
    function flag(name, fallback) {
      var v = setting(name);
      return v === null || v === '' ? fallback : v !== 'false' && v !== '0';
    }
    var TRAVEL = num('travel', 16);
    var CROSSFADE = Math.max(0, num('crossfade', 110));
    var FLIP = flag('flip', false);
    var SAFE = flag('safe-triangle', true);
    var PASS_MS = hasPointer ? Math.max(0, num('pass-through', 0)) : 0;

    var icons = lists.map(function (l) {
      return l.parentElement.querySelector('.nav_dropdown-icon');
    });
    // Each list's own top padding, before the bridge (see measure) is added to it.
    var ownPad = lists.map(function (l) {
      return parseFloat(getComputedStyle(l).paddingTop) || 0;
    });
    var reduce = window.matchMedia('(prefers-reduced-motion: reduce)');

    var path = document.createElementNS('http://www.w3.org/2000/svg', 'path');
    path.setAttribute('class', 'nav_pill-drop');
    path.setAttribute('fill', getComputedStyle(svg.querySelector('.nav_pill-fill')).fill);

    var cur = { x0: 0, x1: 0, h: 0 };
    var tgt = { x0: 0, x1: 0, h: 0 };
    var raf = 0;
    var last = 0;
    var active = null; // list the panel belongs to
    var prev = null; // list being left during a switch
    var switching = false; // true while the panel is still travelling to a new tab
    var sig = '';
    var radius = 20;
    var running = []; // link animations in flight
    var hovers = []; // one gliding highlight per list
    var hovered = null; // list whose dropdown the pointer is on
    var pending = null; // list waiting to take over (safe triangle / pass-through)
    var pendingWhy = '';
    var pendingTimer = 0;
    var booting = true; // first pass: adopt whatever is already open without animating
    var pt = null; // pointer now
    var anchor = null; // pointer a few px ago
    var apex = null; // pointer a few px before that: the safe triangle's tip

    function isOpen(l) {
      return l.classList.contains('w--open');
    }

    // Only write a class when it changes. classList writes notify the observer
    // even when nothing changed, which would loop forever.
    function setClass(el, name, on) {
      if (el && el.classList.contains(name) !== on) el.classList.toggle(name, on);
    }

    // The dropdown only connects where the list is a floating panel under the
    // pill. In the collapsed (tablet/mobile) menu it is in-flow: stay stock.
    function enabled() {
      return getComputedStyle(lists[0]).position === 'absolute';
    }

    // ---- fluid hover -------------------------------------------------------
    // One highlight per list that glides from link to link instead of each
    // link's own :hover background blinking on and off. Uses a
    // .nav_dropdown-highlight element inside the list if Webflow has one;
    // otherwise makes its own from the link's radius and the brand tint.
    function fluidHover(list) {
      var hl = list.querySelector('.nav_dropdown-highlight');
      var own = !hl;
      if (own) {
        hl = document.createElement('div');
        hl.className = 'nav_dropdown-highlight';
        hl.style.backgroundColor = HOVER_TINT;
        list.appendChild(hl);
      }
      hl.setAttribute('aria-hidden', 'true');
      hl.style.cssText += ';position:absolute;top:0;left:0;z-index:-1;pointer-events:none;opacity:0;';
      var lit = null;
      var engaged = false;

      function links() {
        return Array.prototype.slice.call(list.querySelectorAll('.nav_dropdown-link'));
      }

      function show(link) {
        if (link === lit) return;
        var fresh = !lit;
        lit = link;
        if (!link) {
          hl.style.opacity = '0';
          return;
        }
        if (own) hl.style.borderRadius = getComputedStyle(link).borderRadius;
        // A fresh entry fades in on the link itself; after that it travels.
        var travel = fresh || reduce.matches ? '' : ['transform', 'width', 'height'].map(function (p) {
          return p + ' ' + HOVER_MS + 'ms ' + EASE;
        }).join(',') + ',';
        hl.style.transition = travel + 'opacity 150ms';
        hl.style.width = link.offsetWidth + 'px';
        hl.style.height = link.offsetHeight + 'px';
        hl.style.transform = 'translate(' + link.offsetLeft + 'px,' + link.offsetTop + 'px)';
        hl.style.opacity = '1';
      }

      // Nearest link down the list, so the padding and gaps never go dark.
      function nearest(y) {
        var best = null;
        var bestDist = Infinity;
        links().forEach(function (a) {
          var r = a.getBoundingClientRect();
          var d = y < r.top ? r.top - y : y > r.bottom ? y - r.bottom : 0;
          if (d < bestDist) {
            bestDist = d;
            best = a;
          }
        });
        return best;
      }

      list.addEventListener('pointermove', function (e) {
        if (!engaged || e.pointerType !== 'mouse' || list !== active) return;
        // The bridge strip above the panel belongs to the tab, not to the first link.
        show(e.clientY < pill.getBoundingClientRect().bottom ? null : nearest(e.clientY));
      });
      list.addEventListener('pointerleave', function () {
        show(null);
      });
      list.addEventListener('focusin', function (e) {
        var a = e.target.closest && e.target.closest('.nav_dropdown-link');
        if (engaged && a) show(a);
      });
      list.addEventListener('focusout', function () {
        show(null);
      });

      return {
        clear: function () {
          show(null);
        },
        // Engaged: the highlight replaces each link's own hover background.
        // Disengaged (mobile menu): the links' native :hover is back in charge.
        engage: function (on) {
          on = on && hasPointer; // without pointer events the links keep their own :hover
          if (on === engaged) return;
          engaged = on;
          list.style.isolation = on ? 'isolate' : '';
          links().forEach(function (a) {
            a.style.backgroundColor = on ? 'transparent' : '';
          });
          if (!on) show(null);
        }
      };
    }

    // ---- link transitions --------------------------------------------------
    function animate(list, frames, timing) {
      if (reduce.matches || !list.animate) return;
      Array.prototype.forEach.call(list.children, function (el) {
        if (el.classList.contains('nav_dropdown-highlight')) return;
        running.push(el.animate(frames, timing));
      });
    }

    function setClip(l, value) {
      if (l.style.clipPath === value) return;
      l.style.webkitClipPath = value; // Safari before 13.1
      l.style.clipPath = value;
    }

    function release(l) {
      setClip(l, '');
      l.style.visibility = '';
      l.style.display = '';
    }

    function commit(next) {
      if (next === active) return;
      var dir = active && next ? (lists.indexOf(next) > lists.indexOf(active) ? 1 : -1) : 0;
      running.forEach(function (a) {
        a.cancel();
      });
      running = [];
      if (prev && prev !== next) release(prev);
      prev = dir ? active : null;
      switching = !!dir;

      if (booting) {
        // Already open when the script arrived (slow connection): take it over as it stands.
      } else if (next && !dir) {
        // Fresh open: nothing to hand over from, so the links just ease in.
        animate(next, [{ opacity: 0, transform: 'translateY(-4px)' }, { opacity: 1, transform: 'none' }], { duration: OPEN_IN, easing: EASE, fill: 'backwards' });
      } else if (dir) {
        // Switch: old and new crossfade at the same time, so the content never
        // drops out, and both drift the same way, so they travel together
        // rather than across each other. The panel slides underneath.
        var t = TRAVEL * dir * (FLIP ? -1 : 1);
        animate(prev, [{ opacity: 1, transform: 'none' }, { opacity: 0, transform: 'translateX(' + -t + 'px)' }], { duration: CROSSFADE, easing: 'linear', fill: 'forwards' });
        animate(next, [{ opacity: 0 }, { opacity: 1 }], { duration: CROSSFADE, easing: 'linear', fill: 'backwards' });
        animate(next, [{ transform: 'translateX(' + t + 'px)' }, { transform: 'none' }], { duration: Math.max(CROSSFADE, DRIFT_MS), easing: EASE, fill: 'backwards' });
      }
      active = next;
    }

    function apply() {
      var on = enabled();
      lists.forEach(function (l, i) {
        setClass(l, 'is-connected', on);
        setClass(l, 'is-leaving', on && isOpen(l) && l !== active);
        setClass(icons[i], 'is-open', on && l === active);
        l.style.pointerEvents = on && l !== active ? 'none' : '';
        hovers[i].engage(on);
        if (l !== active) hovers[i].clear();
      });
      measure();
    }

    // ---- safe triangle and pass-through ------------------------------------
    // The pointer is "aiming at the panel" when it sits inside the triangle
    // from where it was a moment ago to the two top corners of the open panel.
    // While that holds, brushing a neighbouring tab does not switch.
    function side(p, a, b) {
      return (p.x - b.x) * (a.y - b.y) - (a.x - b.x) * (p.y - b.y);
    }
    function aiming() {
      if (!active || !apex || !pt || cur.h < 1) return false;
      var p = pill.getBoundingClientRect();
      var l = { x: p.left + tgt.x0 - SAFE_PAD, y: p.bottom };
      var r = { x: p.left + tgt.x1 + SAFE_PAD, y: p.bottom };
      if (pt.y >= p.bottom) return false;
      // Must be clearly heading down. Without this, a pointer low in the pill
      // makes a nearly flat triangle and sideways moves between tabs get held.
      if (pt.y - apex.y < SAFE_SLOPE * Math.abs(pt.x - apex.x) || pt.y - apex.y < 1) return false;
      var d1 = side(pt, apex, l);
      var d2 = side(pt, l, r);
      var d3 = side(pt, r, apex);
      return !((d1 < 0 || d2 < 0 || d3 < 0) && (d1 > 0 || d2 > 0 || d3 > 0));
    }

    function takeOver(l) {
      pending = null;
      clearTimeout(pendingTimer);
      if (!isOpen(l)) return;
      commit(l);
      apply();
    }

    // A tab other than the active one wants the panel. True if it is being held back for now.
    function hold(l) {
      var wait = SAFE && aiming() ? SAFE_REST : PASS_MS;
      if (!wait) return false;
      pending = l;
      pendingWhy = SAFE && aiming() ? 'safe' : 'pass';
      clearTimeout(pendingTimer);
      // Still on that tab when the wait is up: it gets the panel after all.
      pendingTimer = setTimeout(function () {
        if (pending === l && hovered === l) takeOver(l);
        else if (pending === l) pending = null;
      }, wait);
      return true;
    }

    pill.addEventListener('pointermove', function (e) {
      if (e.pointerType !== 'mouse') return;
      var p = { x: e.clientX, y: e.clientY };
      if (!anchor) anchor = apex = p;
      var dx = p.x - anchor.x;
      var dy = p.y - anchor.y;
      if (dx * dx + dy * dy > 36) {
        apex = anchor;
        anchor = p;
      }
      pt = p;
      // Held by the triangle, still on that tab, and no longer heading for the panel: switch.
      if (pending && pendingWhy === 'safe' && hovered === pending && !aiming()) takeOver(pending);
    });

    function sync() {
      var on = enabled();
      var open = lists.map(function (l) {
        return on && isOpen(l);
      });
      var nextSig = on + ':' + open.join();
      if (nextSig === sig) return; // our own class writes land here and stop
      var was = sig ? sig.split(':')[1].split(',') : [];
      sig = nextSig;

      var want = active && open[lists.indexOf(active)] ? active : null;
      var newest = null;
      lists.forEach(function (l, i) {
        if (open[i] && was[i] !== 'true') newest = l; // latest-opened tab wins
      });
      if (newest && newest !== active && !(want && hold(newest))) want = newest;
      if (!want) want = (pending && isOpen(pending) && on ? pending : lists[open.indexOf(true)]) || null;
      if (want === pending) pending = null;
      commit(want);
      apply();
    }

    // ---- geometry ----------------------------------------------------------
    function measure() {
      if (!enabled()) {
        lists.forEach(function (l) {
          l.style.top = l.style.paddingTop = l.style.borderTopLeftRadius = l.style.borderTopRightRadius = '';
          release(l);
        });
        cur.h = tgt.h = 0;
        path.setAttribute('d', '');
        return;
      }
      var p = pill.getBoundingClientRect();
      lists.forEach(function (l, i) {
        // Bridge: the list starts flush under its tab, and its (transparent)
        // top padding covers the strip of pill between tab and panel. The
        // pointer therefore never leaves the dropdown on the way down, so
        // Webflow's hover-out timer (which re-entering does not cancel) never
        // starts. Top corners are squared so they are not dead spots either.
        var dd = l.parentElement.getBoundingClientRect();
        l.style.top = dd.height + 'px';
        l.style.paddingTop = ownPad[i] + Math.max(0, p.bottom - dd.bottom) + 'px';
        l.style.borderTopLeftRadius = l.style.borderTopRightRadius = '0';
      });
      if (active) {
        var r = active.getBoundingClientRect();
        radius = parseFloat(getComputedStyle(active).borderBottomLeftRadius) || radius;
        tgt.x0 = r.left - p.left;
        tgt.x1 = r.right - p.left;
        tgt.h = r.bottom - p.bottom; // the panel is drawn from the pill's bottom edge
        if (cur.h < 0.5) {
          cur.x0 = tgt.x0;
          cur.x1 = tgt.x1;
        }
      } else {
        tgt.h = 0;
      }
      if (!raf) {
        last = performance.now();
        raf = requestAnimationFrame(tick);
      }
    }

    // Show, hide and clip every list for this frame. Open lists are clipped to
    // the panel as it is right now, so links never show outside it mid-slide.
    function layout(moving) {
      var p = pill.getBoundingClientRect();
      var sL = p.left + cur.x0;
      var sR = p.left + cur.x1;
      var sB = p.bottom + cur.h;
      var rad = Math.min(radius, cur.h / 2).toFixed(1);
      if (!moving) switching = false;
      // Read every rect first, then write, so a frame costs one layout at most.
      var jobs = lists.map(function (l) {
        var leaving = l === prev && switching;
        if (!isOpen(l) && !leaving) return 'release';
        if (l === active && !moving) return 'settle';
        if (l !== active && !leaving) return 'hide';
        return { leaving: leaving, rect: l.getBoundingClientRect() };
      });
      lists.forEach(function (l, i) {
        var job = jobs[i];
        if (job === 'release') {
          release(l);
        } else if (job === 'settle') {
          // Settled: unclipped, so focus rings are not cut.
          setClip(l, '');
          l.style.visibility = '';
        } else if (job === 'hide') {
          // Held open by Webflow's hover delay but not part of this transition.
          l.style.visibility = 'hidden';
          if (l === prev) l.style.display = '';
        } else {
          // Keep the list being left on screen for the crossfade even if Webflow closes it mid-way.
          if (job.leaving && l.style.display !== 'block') l.style.display = 'block';
          l.style.visibility = '';
          var r = job.rect;
          var left = Math.max(0, sL - r.left).toFixed(1);
          var right = Math.max(0, r.right - sR).toFixed(1);
          var bottom = Math.max(0, r.bottom - sB).toFixed(1);
          setClip(l, 'inset(0px ' + right + 'px ' + bottom + 'px ' + left + 'px round 0px 0px ' + rad + 'px ' + rad + 'px)');
        }
      });
    }

    function draw(moving) {
      if (!svg.isConnected) svg = shapeOf(pill) || svg; // the pill SVG was replaced
      if (path.parentNode !== svg) svg.appendChild(path);
      layout(moving);
      if (cur.h < 0.5) {
        path.setAttribute('d', '');
        return;
      }
      // The pill SVG scales its viewBox to the pill, so convert px to viewBox units.
      var vb = svg.viewBox.baseVal;
      var k = vb.height / svg.getBoundingClientRect().height;
      var y0 = vb.height - 0.6;
      var r = Math.min(radius, cur.h / 2) * k;
      var x0 = cur.x0 * k;
      var x1 = cur.x1 * k;
      var y1 = y0 + cur.h * k;
      var f = function (n) {
        return n.toFixed(2);
      };
      var arc = function (sweep, x, y) {
        return ' A' + f(r) + ' ' + f(r) + ' 0 0 ' + sweep + ' ' + f(x) + ' ' + f(y);
      };
      path.setAttribute(
        'd',
        'M' + f(x0 - r) + ' ' + f(y0 - 2) + ' L' + f(x0 - r) + ' ' + f(y0) +
          arc(1, x0, y0 + r) + // concave, pill to left side
          ' L' + f(x0) + ' ' + f(y1 - r) + arc(0, x0 + r, y1) +
          ' L' + f(x1 - r) + ' ' + f(y1) + arc(0, x1, y1 - r) +
          ' L' + f(x1) + ' ' + f(y0 + r) + arc(1, x1 + r, y0) + // concave, right side to pill
          ' L' + f(x1 + r) + ' ' + f(y0 - 2) + ' Z'
      );
    }

    function tick(now) {
      var a = reduce.matches ? 1 : 1 - Math.exp(-((now - last) / 1000) / (SLIDE / 4));
      last = now;
      var moving = false;
      ['x0', 'x1', 'h'].forEach(function (key) {
        var d = tgt[key] - cur[key];
        if (Math.abs(d) > 0.3) {
          cur[key] += d * a;
          moving = true;
        } else {
          cur[key] = tgt[key];
        }
      });
      draw(moving);
      raf = moving ? requestAnimationFrame(tick) : 0;
    }

    // ---- wiring ------------------------------------------------------------
    hovers = lists.map(fluidHover);

    var mo = new MutationObserver(sync);
    lists.forEach(function (l) {
      mo.observe(l, { attributes: true, attributeFilter: ['class'] });
      var dd = l.parentElement;
      dd.addEventListener('pointerenter', function () {
        hovered = l;
        if (l === active) {
          // Reached the panel, or came back to its tab: drop any held switch.
          pending = null;
          clearTimeout(pendingTimer);
          return;
        }
        // Back on a tab whose list never closed (A, B, back to A inside the hover delay).
        if (!enabled() || !isOpen(l)) return;
        if (active && isOpen(active) && hold(l)) return;
        commit(l);
        apply();
      });
      dd.addEventListener('pointerleave', function () {
        if (hovered === l) hovered = null;
      });
    });
    var relayout = function () {
      sync();
      apply();
    };
    window.addEventListener('resize', relayout);
    if (window.ResizeObserver) new ResizeObserver(relayout).observe(pill);
    relayout();
    cur.x0 = tgt.x0;
    cur.x1 = tgt.x1;
    cur.h = tgt.h;
    booting = false;
  }

  function safeInit(pill) {
    try {
      init(pill);
    } catch (e) {
      // Never let this take the nav down; the stock dropdown still works.
      if (window.console) console.warn('[nav-dropdown] disabled:', e);
    }
  }

  function start() {
    var pill = document.querySelector('.nav_pill');
    // No pill, an engine too old to bother with, or this file included twice: stay stock.
    if (!pill || !window.MutationObserver || !window.requestAnimationFrame || !pill.classList || pill.__dropdown) return;
    pill.__dropdown = true;
    if (shapeOf(pill)) return safeInit(pill);
    // The pill has not been drawn yet: connect as soon as it is.
    var wait = new MutationObserver(function () {
      if (!shapeOf(pill)) return;
      wait.disconnect();
      safeInit(pill);
    });
    wait.observe(pill, { childList: true, subtree: true });
  }

  if (document.readyState === 'loading') document.addEventListener('DOMContentLoaded', start);
  else start();
})();

/* ---- src/script-draw.js ---- */
/* Draw-on for script lettering. Why custom code: tracing a font's letterforms needs the text as
   SVG with an animated stroke dash, which the style panel cannot do.

   Every .text-style-script (or any element with vci-draw) writes itself on the first time it
   scrolls into view: the letter outlines are stroked in left to right, then the letters fill.
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
    text.textContent = el.textContent.trim();
    var L = size * 12; // longer than any one letter's outline
    text.style.cssText = 'font:inherit;letter-spacing:inherit;fill:currentColor;fill-opacity:0;stroke:currentColor;' +
      'stroke-width:' + (size * setting(el, 'stroke', 0.018)) + 'px;stroke-linejoin:round;stroke-linecap:round;' +
      'stroke-dasharray:' + L + ';stroke-dashoffset:' + L;
    svg.appendChild(text);

    var pos = el.style.position;
    if (cs.position === 'static') el.style.position = 'relative';
    el.appendChild(svg);

    var dur = setting(el, 'duration', 2200);
    var ease = 'cubic-bezier(.45,.05,.35,1)';
    // Outlines trace in, a left-to-right wipe gives them a writing direction, then the ink fills.
    text.animate([{ strokeDashoffset: L }, { strokeDashoffset: 0 }], { duration: dur * 0.85, easing: ease, fill: 'forwards' });
    svg.animate([{ clipPath: 'inset(-50% 100% -50% -10%)' }, { clipPath: 'inset(-50% -10% -50% -10%)' }],
      { duration: dur * 0.75, easing: 'cubic-bezier(.3,0,.4,1)', fill: 'forwards' });
    text.animate([{ fillOpacity: 0 }, { fillOpacity: 1 }],
      { delay: dur * 0.5, duration: dur * 0.5, easing: 'ease-out', fill: 'forwards' })
      .finished.then(function () {
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
