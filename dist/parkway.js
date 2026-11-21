/*! The Parkway Church site code v0.9.7. Built from src/, do not edit. */
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

/* ---- src/nav-scroll.js ---- */
/* Direction-aware header. Why custom code: CSS can't read the scroll direction.

   Scrolling down, the header belongs to the document and scrolls away with it. Scrolling up,
   it is fetched from above the screen and stays fixed at the top. Scrolling down again, it is
   released back into the document right where it is and scrolls away naturally.

   CSS (Webflow style panel) does all the positioning and motion:
     nav_component             position: absolute (its natural place, over the hero),
                               transition: transform
     nav_component.is-pinned   position: fixed
   Reduced motion: no slide; the header just appears pinned (handled here, as the style panel
   can't do prefers-reduced-motion).

   This script only:
     - sets data-scroll-direction="up" | "down" on .nav_component (passive listener, moves under
       THRESHOLD px ignored), and on each change of direction
     - up:   adds is-pinned, starting from where the header is on screen right now (just above
             the top if it has scrolled away), so CSS slides it down from there
     - down: removes is-pinned and sets an inline top = where it currently is in the page, so it
             carries on scrolling away with the content with no jump
     - at scrollY 0 clears all of that, so the header is exactly as it was on load.
   One position read and one style write per change of direction; nothing runs while scrolling
   in the same direction. If this file doesn't load, the header just scrolls away with the page.

   Also closes an open nav dropdown when scrolling down, so a menu isn't carried off screen.
   A dropdown holding keyboard focus stays open, and focus inside the header pins it. */
(function(){
  var nav=document.querySelector('.nav_component'); if(!nav) return;
  var PINNED='is-pinned', THRESHOLD=6;
  // Reduced motion: the header still pins, but appears in place instead of sliding in.
  var still=window.matchMedia && matchMedia('(prefers-reduced-motion: reduce)');
  var last=Math.max(0,scrollY), travel=0, dir=null;
  var s=nav.style;

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

  // The header's natural top (from the stylesheet), and the page y that position: absolute
  // measures from (the nearest positioned ancestor, else the page).
  function natural(){
    var t=s.top; s.top='';
    var top=parseFloat(getComputedStyle(nav).top)||0;
    s.top=t;
    return top;
  }
  function origin(){
    for(var el=nav.parentElement; el && el!==document.body; el=el.parentElement)
      if(getComputedStyle(el).position!=='static') return el.getBoundingClientRect().top+scrollY+el.clientTop;
    return 0;
  }
  // Apply a positioning change with the transition off, so only the slide is ever animated.
  function now(fn){ s.transition='none'; fn(); void nav.offsetHeight; s.transition=''; }

  function pin(){
    if(nav.classList.contains(PINNED)) return;
    var r=nav.getBoundingClientRect(), base=natural();
    // From where it is now (above or a few px below its pinned spot), but never from further
    // away than just above the screen.
    var from=still && still.matches ? 0 : Math.round(Math.max(r.top-base, -(r.bottom-r.top)-base-8));
    now(function(){
      nav.classList.add(PINNED); s.top='';
      s.transform=from?'translateY('+from+'px)':'';
    });
    s.transform=''; // CSS transitions it to its resting place
  }

  function release(){
    closeDropdowns();
    if(!nav.classList.contains(PINNED)) return;
    var y=nav.getBoundingClientRect().top+scrollY; // includes any slide still in progress
    now(function(){
      nav.classList.remove(PINNED);
      s.transform='';
      s.top=(y-origin())+'px';
    });
  }

  function reset(){
    dir=null; travel=0;
    nav.removeAttribute('data-scroll-direction');
    if(!nav.classList.contains(PINNED) && !s.top) return;
    now(function(){ nav.classList.remove(PINNED); s.top=''; s.transform=''; });
  }

  function onScroll(){
    // Clamp: iOS rubber-banding past either end reports scroll that isn't real.
    var end=document.documentElement.scrollHeight-innerHeight;
    var y=Math.min(Math.max(0,scrollY),end), d=y-last; last=y;
    if(y<=0) return reset();
    if(!d) return;
    travel=(d>0)===(travel>0)?travel+d:d; // restarts when the direction flips
    var next=travel>THRESHOLD?'down':travel<-THRESHOLD?'up':dir;
    if(next===dir) return;
    dir=next;
    nav.setAttribute('data-scroll-direction',dir);
    if(dir==='up') pin(); else release();
  }

  addEventListener('scroll',onScroll,{passive:true});
  nav.addEventListener('focusin',function(){ if(scrollY>0) pin(); });
})();

/* ---- src/nav-toggle.js ---- */
/* Hamburger open state. narthex adds .is-open to .nav_toggle while the menu is open; the style
   panel can't style a child from its parent's class, so mirror it onto each .nav_toggle-line.
   The X itself is native: nav_toggle-line.is-open with first-child / nth-child(even) / last-child
   states in the style panel. */
(function(){
  Array.prototype.forEach.call(document.querySelectorAll('.nav_toggle'), function(t){
    var lines=t.querySelectorAll('.nav_toggle-line');
    function sync(){
      var on=t.classList.contains('is-open');
      for(var i=0;i<lines.length;i++) if(lines[i].classList.contains('is-open')!==on) lines[i].classList.toggle('is-open',on);
    }
    new MutationObserver(sync).observe(t,{attributes:true,attributeFilter:['class']});
    sync();
  });
})();

/* ---- src/nav-dropdown.js ---- */
/*!
 * The Parkway Church — connected nav dropdowns
 *
 * Draws the open dropdown as part of the nav pill (one shape, concave corners
 * where it meets the pill), slides it between dropdowns, crossfades the links,
 * glides one hover highlight between links, glides another between the top-level
 * tabs, and rotates the open chevron.
 *
 * Progressive enhancement: this file only ever ADDS to the stock Webflow
 * dropdown. If it fails to load, or bails out below, the dropdowns keep their
 * normal floating-card look and behaviour, because every "connected" style in
 * Webflow hangs off classes that only this script applies:
 *
 *   nav_dropdown-list.is-connected  card background / border / shadow removed, isolation: isolate,
 *                                   ::before hover bridge hidden (the list sits flush under its tab)
 *   nav_dropdown-list.is-leaving    list being left while Webflow's hover delay holds it open
 *   nav_dropdown-icon.is-open       chevron rotated (desktop: the active tab; mobile: open dropdowns)
 *   nav_dropdown-list.is-open       collapsed (tablet/mobile) menu only: mirrors Webflow's w--open
 *                                   so the expanded state is styled in the panel, not custom CSS
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
 * Highlight elements (Webflow elements, styled in the panel; the script only sizes and places them):
 *   .nav_dropdown-highlight  inside each list: the gliding link highlight (.is-active, .is-instant;
 *                            links get .is-glide while it runs)
 *   .nav_links-highlight     inside .nav_links (Webflow element, required for the tab highlight;
 *                            combos .is-active shown, .is-instant no glide). Sized from the links' padding.
 *
 * Expects (drawn by buttons.js): .nav_pill > svg.nav_pill-shape > path.nav_pill-fill
 */
(function () {
  'use strict';

  var SLIDE = 0.22; // seconds for the panel to settle on a new dropdown
  var OPEN_IN = 280; // ms, links easing in on a fresh open
  var DRIFT_MS = 220; // ms, new links finishing their drift after a switch
  var EASE = 'cubic-bezier(.2,.7,.2,1)';
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
    // Each list's own top padding from the style panel, before the bridge (see measure) is added
    // to it. Read fresh every time, so a padding set on the is-connected combo takes effect (the
    // floating no-JS card keeps the base class padding).
    function ownPad(l) {
      var inline = l.style.paddingTop;
      l.style.paddingTop = '';
      var pad = parseFloat(getComputedStyle(l).paddingTop) || 0;
      l.style.paddingTop = inline;
      return pad;
    }
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
    var tabs = { update: function () {} }; // gliding highlight behind the top-level tabs
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
    // One highlight per list that glides from link to link instead of each link's own
    // :hover background blinking on and off. All of its look is the .nav_dropdown-highlight
    // element and classes in Webflow; this only sizes and places it and toggles:
    //   .nav_dropdown-highlight.is-active   shown
    //   .nav_dropdown-highlight.is-instant  jump without gliding (a fresh entry fades in where it is)
    //   .nav_dropdown-link.is-glide         link's own hover background off while the highlight runs
    // (the list's isolation, which keeps the highlight's z-index:-1 inside it, is on .is-connected).
    // No highlight element in a list: that list keeps its links' native :hover.
    function fluidHover(list) {
      var hl = list.querySelector('.nav_dropdown-highlight');
      if (!hl) return { clear: function () {}, engage: function () {} };
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
          setClass(hl, 'is-active', false);
          return;
        }
        // A fresh entry fades in on the link itself; after that it travels.
        setClass(hl, 'is-instant', fresh || reduce.matches);
        hl.style.width = link.offsetWidth + 'px';
        hl.style.height = link.offsetHeight + 'px';
        hl.style.transform = 'translate(' + link.offsetLeft + 'px,' + link.offsetTop + 'px)';
        setClass(hl, 'is-active', true);
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
          links().forEach(function (a) {
            setClass(a, 'is-glide', on);
          });
          if (!on) show(null);
        }
      };
    }

    // ---- tab highlight -----------------------------------------------------
    // A gliding highlight behind the top-level tabs. All of its look (tint, radius, position,
    // stacking, fade and glide timing) is the .nav_links-highlight element and classes in
    // Webflow; this only sizes and places it, which the style panel can't do, and toggles:
    //   .is-active   shown
    //   .is-instant  jump without gliding (a fresh appearance fades in where it is)
    // It is sized like a link's hover: the tab's label plus the dropdown links' padding, read
    // live so the two always match. The tab's own hitbox is untouched. It belongs to the tab,
    // not its panel: it fades once the pointer goes down into the links, and glides between tabs.
    // No .nav_links-highlight in Webflow: nothing happens and the tabs keep their own hover.
    function tabHover() {
      var bar = pill.querySelector('.nav_links');
      var hl = bar && bar.querySelector('.nav_links-highlight');
      if (!hl || !hasPointer) return { update: function () {} };
      var lit = null;
      var over = null; // tab the pointer or focus is on
      var leaveTimer = 0;
      var tabs = Array.prototype.slice.call(bar.querySelectorAll('.nav_dropdown-toggle, .nav_link'));
      var range = document.createRange();

      function place(tab, glide) {
        var link = lists[0].querySelector('.nav_dropdown-link');
        var lc = link ? getComputedStyle(link) : null;
        var px = function (v) {
          return parseFloat(v) || 0;
        };
        // The label's box: the tab's content without its own (wider) padding.
        range.selectNodeContents(tab);
        var c = range.getBoundingClientRect();
        var b = bar.getBoundingClientRect();
        var pt = lc ? px(lc.paddingTop) : 10;
        var pr = lc ? px(lc.paddingRight) : 12;
        var pb = lc ? px(lc.paddingBottom) : 10;
        var pl = lc ? px(lc.paddingLeft) : 12;
        // glide: true slides from the last tab, false jumps, null (re-measure) leaves it as it is.
        if (glide !== null) setClass(hl, 'is-instant', !glide || reduce.matches);
        hl.style.width = c.width + pl + pr + 'px';
        hl.style.height = c.height + pt + pb + 'px';
        hl.style.transform = 'translate(' + (c.left - b.left - pl) + 'px,' + (c.top - b.top - pt) + 'px)';
      }
      function update() {
        var tab = enabled() ? over : null;
        if (tab === lit) {
          if (tab) place(tab, null); // re-measure in place (resize, fonts, a dropdown opening)
          return;
        }
        var fresh = !lit;
        lit = tab;
        if (!tab) {
          setClass(hl, 'is-active', false);
          return;
        }
        place(tab, !fresh);
        setClass(hl, 'is-active', true);
      }
      function enter(tab) {
        clearTimeout(leaveTimer);
        over = tab;
        update();
      }
      // Leaving waits a beat, so moving straight onto the next tab glides instead of re-fading.
      function leave(tab) {
        if (over !== tab) return;
        clearTimeout(leaveTimer);
        leaveTimer = setTimeout(function () {
          if (over === tab) over = null;
          update();
        }, 60);
      }
      tabs.forEach(function (tab) {
        tab.addEventListener('pointerenter', function (e) {
          if (e.pointerType === 'mouse') enter(tab);
        });
        tab.addEventListener('pointerleave', function () {
          leave(tab);
        });
        tab.addEventListener('focusin', function () {
          if (tab.matches(':focus-visible')) enter(tab);
        });
        tab.addEventListener('focusout', function () {
          leave(tab);
        });
      });
      return { update: update };
    }

    // ---- link transitions --------------------------------------------------
    function animate(list, frames, timing) {
      if (reduce.matches || !list.animate) return;
      Array.prototype.forEach.call(list.children, function (el) {
        if (el.classList.contains('nav_dropdown-highlight')) return; // its own fade is in Webflow
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
        // Webflow marks an open dropdown with w--open, which the style panel can't target. In the
        // collapsed menu mirror it as is-open (list and chevron) so the open state is styled
        // natively; on the connected desktop panel the chevron follows the active tab.
        setClass(l, 'is-open', !on && isOpen(l));
        setClass(icons[i], 'is-open', on ? l === active : isOpen(l));
        l.style.pointerEvents = on && l !== active ? 'none' : '';
        hovers[i].engage(on);
        if (l !== active) hovers[i].clear();
      });
      tabs.update();
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
      // Raw open states, so taps in the collapsed menu still reach apply() for the is-open mirror.
      var nextSig = on + ':' + lists.map(isOpen).join();
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
        l.style.paddingTop = ownPad(l) + Math.max(0, p.bottom - dd.bottom) + 'px';
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
      // Corners keep their full width and only flatten once the panel is shorter than two radii.
      var rx = radius.toFixed(1);
      var ry = Math.min(radius, cur.h / 2).toFixed(1);
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
          setClip(l, 'inset(0px ' + right + 'px ' + bottom + 'px ' + left + 'px round 0px 0px ' + rx + 'px ' + rx + 'px / 0px 0px ' + ry + 'px ' + ry + 'px)');
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
      // While the panel is taller than two radii the corners are round. Shorter than that, they keep
      // their full width (rx) and only lose height (ry), so the concave shoulders where the panel
      // meets the pill stay soft and flatten into the pill instead of shrinking to a square notch.
      var rx = radius * k;
      var ry = Math.min(radius, cur.h / 2) * k;
      var x0 = cur.x0 * k;
      var x1 = cur.x1 * k;
      var y1 = y0 + cur.h * k;
      var f = function (n) {
        return n.toFixed(2);
      };
      var arc = function (sweep, x, y) {
        return ' A' + f(rx) + ' ' + f(ry) + ' 0 0 ' + sweep + ' ' + f(x) + ' ' + f(y);
      };
      path.setAttribute(
        'd',
        'M' + f(x0 - rx) + ' ' + f(y0 - 2) + ' L' + f(x0 - rx) + ' ' + f(y0) +
          arc(1, x0, y0 + ry) + // concave, pill to left side
          ' L' + f(x0) + ' ' + f(y1 - ry) + arc(0, x0 + rx, y1) +
          ' L' + f(x1 - rx) + ' ' + f(y1) + arc(0, x1, y1 - ry) +
          ' L' + f(x1) + ' ' + f(y0 + ry) + arc(1, x1 + rx, y0) + // concave, right side to pill
          ' L' + f(x1 + rx) + ' ' + f(y0 - 2) + ' Z'
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
    tabs = tabHover();

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

/* ---- src/script-draw-paths.js ---- */
/* Generated by scripts/trim-paths/ from the site font. Do not edit by hand.
   Each word: the pen line (centerline, in writing order) in em units from the text origin and
   baseline; width = how thick the pen must be to cover the letters. */
window.__scriptDrawPaths = {"Winter":{"width":0.0802,"paths":[{"d":"M.065-.190C.054-.195 .018-.208 .000-.223C-.018-.237-.030-.255-.040-.278C-.050-.300-.059-.328-.062-.357C-.066-.387-.065-.423-.060-.453C-.055-.482-.044-.508-.033-.532C-.021-.557-.007-.579 .010-.600C.027-.621 .047-.642 .072-.660C.098-.678 .135-.697 .163-.708C.190-.718 .207-.721 .237-.725C.268-.729 .281-.737 .343-.730C.404-.723 .558-.695 .605-.685C.652-.675 .613-.672 .623-.672C.632-.672 .654-.685 .662-.685C.671-.685 .666-.677 .675-.675C.684-.673 .703-.672 .718-.672C.733-.673 .750-.674 .765-.677C.780-.681 .799-.688 .810-.695C.821-.702 .827-.710 .830-.718C.833-.725 .833-.733 .830-.740C.827-.747 .819-.754 .810-.757C.801-.761 .794-.764 .777-.760C.761-.756 .728-.744 .710-.735C.692-.726 .679-.716 .670-.708C.661-.699 .665-.690 .657-.685C.650-.680 .643-.691 .627-.675C.612-.659 .596-.641 .565-.590C.534-.539 .491-.467 .443-.367C.394-.268 .301-.064 .273 .005C.244 .074 .265 .042 .270 .048C.275 .053 .278 .058 .302 .037C.327 .017 .343 .009 .417-.077C.492-.164 .666-.386 .748-.480C.829-.574 .876-.612 .907-.640C.939-.668 .932-.650 .938-.647C.943-.645 .950-.645 .938-.623C.925-.600 .885-.556 .860-.515C.835-.474 .826-.460 .785-.378C.744-.295 .643-.088 .613-.022C.583 .043 .604 .010 .605 .018C.606 .025 .611 .021 .618 .020C.624 .019 .625 .028 .645 .010C.665-.008 .673-.011 .735-.085C.797-.159 .945-.346 1.018-.432C1.090-.519 1.129-.561 1.173-.603C1.216-.644 1.246-.663 1.278-.680C1.309-.697 1.348-.701 1.363-.705","len":4.4425,"parent":null,"at":0},{"d":"M.265 .048C.254 .059 .220 .100 .200 .117C.180 .135 .156 .145 .147 .150","len":0.125,"parent":0,"at":0.492},{"d":"M.940-.647C.947-.653 .964-.670 .983-.680C1.001-.690 1.041-.701 1.052-.705","len":0.115,"parent":0,"at":0.662},{"d":"M.605 .020C.591 .035 .544 .089 .520 .110C.496 .131 .472 .139 .463 .145","len":0.155,"parent":0,"at":0.811},{"d":"M1.093-.305C1.088-.303 1.094-.328 1.065-.292C1.036-.257 .946-.129 .920-.090C.894-.051 .911-.071 .910-.060C.909-.049 .911-.031 .915-.022C.919-.014 .927-.010 .932-.007C.938-.005 .934-.005 .950-.007C.966-.010 .980 .022 1.028-.025C1.075-.072 1.182-.245 1.232-.292C1.282-.340 1.309-.311 1.327-.310C1.346-.309 1.342-.297 1.345-.287C1.348-.278 1.363-.288 1.345-.255C1.327-.222 1.257-.121 1.238-.087C1.218-.054 1.228-.067 1.228-.055C1.228-.043 1.229-.024 1.238-.018C1.246-.011 1.257-.007 1.278-.015C1.298-.023 1.322-.025 1.360-.068C1.398-.110 1.482-.230 1.508-.268C1.533-.305 1.508-.285 1.515-.292C1.522-.300 1.543-.307 1.550-.315C1.557-.323 1.535-.307 1.555-.338C1.575-.368 1.645-.466 1.670-.497C1.695-.529 1.699-.520 1.705-.525","len":1.64,"parent":null,"at":0},{"d":"M1.548-.312C1.550-.311 1.553-.304 1.562-.302C1.572-.301 1.593-.301 1.603-.302C1.613-.304 1.619-.311 1.623-.312","len":0.0775,"parent":4,"at":0.864},{"d":"M1.515-.295C1.513-.296 1.515-.302 1.505-.302C1.495-.302 1.463-.296 1.455-.295","len":0.0625,"parent":4,"at":0.864},{"d":"M1.120-.390C1.123-.393 1.133-.405 1.135-.407","len":0.02,"parent":null,"at":0},{"d":"M1.355-.058C1.356-.052 1.357-.031 1.360-.022C1.363-.014 1.365-.010 1.373-.007C1.380-.005 1.396-.005 1.407-.007C1.419-.010 1.418-.004 1.442-.022C1.467-.041 1.527-.101 1.552-.120C1.578-.139 1.578-.114 1.597-.135C1.617-.156 1.643-.217 1.670-.245C1.697-.273 1.735-.294 1.758-.305C1.780-.316 1.790-.314 1.802-.312C1.815-.311 1.830-.303 1.835-.295C1.840-.287 1.839-.274 1.835-.263C1.831-.251 1.831-.244 1.812-.228C1.794-.211 1.747-.178 1.722-.165C1.698-.152 1.677-.152 1.663-.150C1.648-.147 1.642-.148 1.635-.150C1.628-.152 1.625-.160 1.623-.163","len":0.81,"parent":null,"at":0},{"d":"M1.518-.295C1.522-.298 1.542-.310 1.548-.312","len":0.0325,"parent":null,"at":0},{"d":"M1.595-.130C1.595-.117 1.592-.072 1.597-.052C1.603-.033 1.611-.020 1.625-.013C1.639-.005 1.665-.006 1.680-.007C1.695-.009 1.703-.013 1.718-.020C1.732-.028 1.751-.038 1.770-.052C1.789-.067 1.790-.062 1.830-.107C1.870-.152 1.968-.291 2.007-.323C2.047-.354 2.056-.304 2.067-.295C2.079-.286 2.095-.306 2.075-.268C2.055-.229 1.966-.107 1.945-.065C1.924-.023 1.945-.027 1.948-.018C1.950-.008 1.954-.009 1.960-.007C1.966-.006 1.975-.005 1.985-.007C1.995-.010 2.006-.014 2.020-.025C2.034-.036 2.048-.048 2.070-.075C2.092-.102 2.139-.167 2.152-.185","len":1.105,"parent":null,"at":0}]},"Spring":{"width":0.0739,"paths":[{"d":"M.600-.792C.609-.773 .632-.709 .652-.677C.673-.646 .699-.622 .723-.603C.746-.583 .768-.572 .792-.560C.817-.548 .831-.538 .868-.532C.904-.527 .979-.527 1.012-.527C1.046-.528 1.045-.530 1.070-.537C1.095-.545 1.137-.558 1.160-.570C1.183-.582 1.197-.595 1.210-.610C1.223-.625 1.233-.646 1.238-.660C1.242-.674 1.239-.685 1.238-.695C1.236-.705 1.237-.709 1.230-.718C1.223-.726 1.208-.739 1.198-.745C1.187-.751 1.179-.752 1.165-.752C1.151-.752 1.138-.755 1.115-.745C1.092-.735 1.060-.723 1.025-.693C.990-.662 .924-.588 .902-.562C.881-.537 .903-.542 .897-.537C.892-.532 .876-.538 .870-.532C.864-.527 .920-.592 .860-.505C.800-.418 .581-.109 .507-.013C.434 .084 .449 .051 .420 .075C.391 .099 .364 .117 .335 .130C.306 .143 .274 .151 .247 .155C.221 .159 .199 .156 .177 .152C.156 .149 .134 .140 .117 .133C.101 .125 .091 .117 .077 .105C.064 .092 .050 .082 .037 .058C.025 .033 .008-.008 .003-.043C-.003-.077-.000-.121 .003-.150C.005-.179 .012-.195 .020-.217C.028-.240 .035-.258 .050-.282C.065-.307 .085-.336 .110-.362C.135-.389 .170-.419 .203-.440C.235-.461 .268-.477 .302-.490C.337-.502 .367-.512 .407-.515C.448-.518 .504-.515 .545-.505C.586-.495 .635-.461 .652-.453","len":3.11,"parent":null,"at":0},{"d":"M.497 .210C.502 .208 .493 .238 .525 .198C.557 .157 .656 .009 .690-.035C.724-.079 .713-.041 .730-.065C.747-.089 .765-.140 .790-.177C.815-.215 .848-.265 .880-.287C.912-.310 .961-.311 .983-.310C1.004-.309 1.005-.293 1.010-.282C1.015-.272 1.014-.257 1.012-.245C1.011-.233 1.017-.237 1.002-.212C.988-.188 .952-.126 .927-.095C.903-.064 .876-.042 .855-.028C.834-.013 .817-.008 .802-.005C.788-.002 .782 .000 .770-.010C.758-.020 .739-.056 .733-.065","len":1.0625,"parent":null,"at":0},{"d":"M1.180-.325C1.189-.320 1.225-.304 1.235-.295C1.245-.286 1.242-.278 1.242-.270C1.243-.263 1.259-.283 1.238-.250C1.216-.217 1.136-.109 1.115-.072C1.094-.036 1.108-.041 1.110-.030C1.112-.019 1.118-.010 1.127-.007C1.137-.005 1.152-.004 1.167-.013C1.183-.021 1.206-.048 1.220-.058C1.234-.067 1.221-.029 1.252-.068C1.284-.106 1.379-.250 1.410-.290C1.441-.330 1.435-.302 1.440-.305","len":0.7225,"parent":null,"at":0},{"d":"M1.175-.325C1.155-.299 1.073-.194 1.052-.168","len":0.16,"parent":2,"at":0.0},{"d":"M1.255-.065C1.256-.058 1.256-.035 1.260-.025C1.264-.015 1.258-.007 1.278-.007C1.297-.007 1.325 .022 1.375-.025C1.425-.072 1.530-.245 1.580-.292C1.630-.340 1.656-.311 1.675-.310C1.694-.309 1.690-.297 1.692-.287C1.695-.277 1.710-.287 1.690-.250C1.670-.212 1.594-.099 1.575-.062C1.556-.026 1.573-.037 1.575-.030C1.577-.022 1.577-.020 1.585-.018C1.593-.015 1.606-.004 1.625-.015C1.644-.026 1.682-.070 1.700-.083C1.718-.095 1.718-.077 1.732-.092C1.747-.107 1.761-.143 1.785-.172C1.809-.202 1.851-.246 1.875-.268C1.899-.289 1.912-.296 1.930-.302C1.948-.309 1.970-.313 1.985-.307C2.000-.302 2.013-.280 2.018-.270C2.022-.260 2.030-.279 2.013-.250C1.995-.221 1.939-.134 1.910-.095C1.881-.056 1.853-.036 1.840-.018C1.827 .001 1.837 .007 1.830 .018C1.823 .028 1.811 .040 1.800 .045C1.789 .050 1.787 .037 1.762 .048C1.738 .058 1.680 .089 1.653 .105C1.625 .121 1.611 .132 1.595 .145C1.579 .158 1.565 .170 1.558 .185C1.550 .200 1.547 .222 1.548 .235C1.548 .247 1.556 .255 1.562 .260C1.569 .265 1.576 .268 1.587 .268C1.599 .267 1.613 .266 1.630 .255C1.647 .244 1.671 .222 1.690 .203C1.709 .183 1.726 .158 1.742 .138C1.759 .117 1.779 .095 1.788 .080C1.796 .065 1.794 .053 1.795 .048","len":2.205,"parent":null,"at":0},{"d":"M1.468-.390C1.470-.394 1.482-.409 1.485-.412","len":0.025,"parent":null,"at":0},{"d":"M1.735-.090C1.735-.082 1.733-.055 1.735-.043C1.738-.030 1.743-.018 1.750-.013C1.757-.007 1.760-.007 1.775-.007C1.790-.008 1.829-.016 1.840-.018","len":0.17,"parent":null,"at":0}]},"Summer":{"width":0.0759,"paths":[{"d":"M.600-.792C.609-.773 .632-.709 .652-.677C.673-.646 .699-.622 .723-.603C.746-.583 .768-.572 .792-.560C.817-.548 .831-.538 .868-.532C.904-.527 .979-.527 1.012-.527C1.046-.528 1.045-.530 1.070-.537C1.095-.545 1.137-.558 1.160-.570C1.183-.582 1.197-.595 1.210-.610C1.223-.625 1.233-.646 1.238-.660C1.242-.674 1.239-.685 1.238-.695C1.236-.705 1.237-.709 1.230-.718C1.223-.726 1.208-.739 1.198-.745C1.187-.751 1.179-.752 1.165-.752C1.151-.752 1.138-.755 1.115-.745C1.092-.735 1.060-.723 1.025-.693C.990-.662 .924-.588 .902-.562C.881-.537 .903-.542 .897-.537C.892-.532 .876-.538 .870-.532C.864-.527 .920-.592 .860-.505C.800-.418 .581-.109 .507-.013C.434 .084 .449 .051 .420 .075C.391 .099 .364 .117 .335 .130C.306 .143 .274 .151 .247 .155C.221 .159 .199 .156 .177 .152C.156 .149 .134 .140 .117 .133C.101 .125 .091 .117 .077 .105C.064 .092 .050 .082 .037 .058C.025 .033 .008-.008 .003-.043C-.003-.077-.000-.121 .003-.150C.005-.179 .012-.195 .020-.217C.028-.240 .035-.258 .050-.282C.065-.307 .085-.336 .110-.362C.135-.389 .170-.419 .203-.440C.235-.461 .268-.477 .302-.490C.337-.502 .367-.512 .407-.515C.448-.518 .504-.515 .545-.505C.586-.495 .635-.461 .652-.453","len":3.11,"parent":null,"at":0},{"d":"M.853-.055C.838-.047 .781-.015 .762-.007C.744 .000 .746-.005 .740-.007C.734-.010 .728-.012 .725-.020C.722-.028 .715-.037 .720-.055C.725-.073 .727-.086 .755-.128C.783-.169 .868-.273 .890-.302","len":0.4175,"parent":null,"at":0},{"d":"M.855-.055C.856-.049 .858-.028 .863-.020C.867-.012 .863-.007 .880-.007C.897-.008 .934-.005 .963-.025C.991-.045 1.018-.085 1.052-.130C1.087-.175 1.138-.265 1.173-.295C1.207-.325 1.240-.313 1.258-.310C1.275-.307 1.275-.287 1.278-.275C1.280-.263 1.296-.282 1.270-.240C1.244-.198 1.149-.063 1.120-.025C1.091 .013 1.099-.013 1.095-.010","len":0.8025,"parent":null,"at":0},{"d":"M.855-.058C.883-.098 .997-.258 1.025-.297","len":0.25,"parent":null,"at":0},{"d":"M1.280-.263C1.285-.264 1.297-.262 1.312-.270C1.328-.278 1.356-.303 1.370-.310C1.384-.317 1.390-.314 1.397-.310C1.405-.306 1.410-.295 1.413-.287C1.415-.280 1.417-.278 1.415-.268C1.413-.257 1.417-.256 1.397-.223C1.378-.189 1.314-.100 1.298-.068C1.281-.035 1.297-.034 1.300-.025C1.303-.016 1.310-.015 1.315-.013C1.320-.010 1.319-.009 1.333-.013C1.346-.016 1.354 .012 1.397-.035C1.441-.082 1.551-.249 1.595-.295C1.639-.341 1.646-.307 1.660-.310C1.674-.312 1.674-.312 1.680-.310C1.686-.307 1.692-.304 1.695-.295C1.698-.286 1.703-.270 1.700-.258C1.697-.245 1.704-.256 1.677-.217C1.651-.179 1.569-.062 1.542-.028C1.516 .007 1.522-.013 1.518-.010","len":1.15,"parent":null,"at":0},{"d":"M1.702-.263C1.708-.264 1.723-.265 1.735-.273C1.748-.280 1.765-.298 1.778-.305C1.790-.312 1.801-.314 1.810-.312C1.819-.311 1.826-.303 1.830-.297C1.834-.292 1.836-.289 1.835-.278C1.834-.266 1.842-.264 1.823-.230C1.803-.196 1.738-.106 1.720-.072C1.702-.039 1.715-.040 1.718-.030C1.720-.020 1.725-.014 1.735-.013C1.745-.011 1.755-.003 1.778-.020C1.800-.037 1.848-.098 1.870-.115C1.892-.133 1.896-.117 1.907-.125C1.919-.133 1.933-.156 1.940-.160C1.947-.164 1.938-.150 1.950-.150C1.962-.150 1.989-.148 2.015-.158C2.041-.167 2.086-.193 2.107-.207C2.129-.222 2.135-.231 2.143-.245C2.150-.259 2.154-.279 2.152-.290C2.151-.301 2.143-.307 2.132-.310C2.122-.313 2.103-.312 2.090-.310C2.077-.308 2.070-.306 2.055-.297C2.040-.289 2.020-.276 2.002-.260C1.985-.244 1.961-.216 1.950-.200C1.939-.184 1.944-.174 1.938-.163C1.931-.151 1.914-.149 1.910-.130C1.906-.111 1.913-.065 1.915-.048C1.917-.030 1.919-.034 1.925-.028C1.931-.021 1.938-.010 1.952-.007C1.967-.005 1.992-.004 2.015-.013C2.038-.021 2.068-.039 2.092-.058C2.117-.076 2.123-.080 2.163-.125C2.202-.170 2.291-.296 2.328-.325C2.364-.354 2.369-.307 2.380-.297C2.391-.288 2.411-.306 2.393-.270C2.374-.234 2.290-.116 2.268-.080C2.245-.044 2.258-.063 2.257-.052C2.257-.042 2.258-.022 2.265-.015C2.272-.007 2.291-.006 2.303-.007C2.314-.009 2.304 .006 2.333-.022C2.361-.051 2.449-.154 2.473-.180","len":2.2425,"parent":null,"at":0}]},"Fall":{"width":0.0715,"paths":[{"d":"M-.372 .070C-.362 .080-.338 .116-.312 .133C-.287 .149-.252 .162-.223 .168C-.193 .173-.167 .173-.135 .168C-.103 .162-.066 .150-.033 .133C.001 .115 .035 .090 .065 .065C.095 .040 .112 .025 .147-.020C.183-.065 .257-.168 .280-.203C.303-.237 .278-.220 .285-.228C.292-.235 .315-.241 .323-.250C.330-.259 .317-.255 .333-.280C.348-.305 .367-.334 .417-.398C.468-.461 .594-.614 .637-.660C.681-.706 .670-.667 .677-.672C.685-.678 .668-.678 .685-.693C.702-.707 .743-.741 .780-.760C.817-.779 .870-.798 .905-.805C.940-.812 .967-.808 .990-.805C1.013-.802 1.030-.794 1.042-.785C1.055-.776 1.061-.764 1.062-.750C1.064-.736 1.062-.716 1.050-.700C1.038-.684 1.016-.664 .993-.652C.969-.641 .945-.635 .910-.632C.875-.630 .821-.634 .785-.637C.749-.641 .713-.650 .695-.655C.677-.660 .684-.669 .675-.670C.666-.671 .659-.659 .640-.662C.621-.666 .605-.681 .562-.693C.520-.704 .438-.724 .388-.730C.337-.736 .302-.735 .260-.728C.218-.720 .168-.699 .135-.682C.103-.666 .085-.648 .065-.627C.045-.607 .027-.581 .013-.557C-.002-.534-.013-.507-.020-.485C-.027-.463-.029-.446-.030-.427C-.031-.409-.032-.394-.028-.372C-.023-.351-.015-.319-.003-.297C.010-.276 .029-.257 .045-.245C.061-.233 .085-.228 .092-.225","len":3.07,"parent":null,"at":0},{"d":"M.287-.230C.285-.232 .276-.241 .270-.242C.264-.244 .263-.245 .250-.240C.237-.235 .204-.217 .195-.212","len":0.095,"parent":0,"at":0.242},{"d":"M.325-.250C.327-.248 .318-.245 .335-.240C.352-.235 .397-.225 .425-.223C.453-.220 .485-.221 .505-.225C.525-.229 .536-.242 .542-.245","len":0.22,"parent":null,"at":0},{"d":"M.665-.048C.650-.041 .598-.014 .578-.007C.557-.001 .553-.005 .545-.010C.537-.015 .530-.026 .527-.037C.525-.049 .525-.063 .527-.077C.530-.092 .534-.103 .545-.122C.556-.142 .578-.174 .595-.195C.612-.216 .632-.235 .647-.250C.663-.265 .675-.275 .690-.285C.705-.295 .723-.304 .738-.307C.753-.311 .768-.311 .780-.305C.792-.299 .806-.283 .807-.270C.809-.257 .813-.262 .790-.225C.767-.188 .686-.083 .667-.048C.649-.012 .674-.022 .677-.015C.681-.008 .679-.006 .690-.005C.701-.004 .718 .001 .745-.010C.772-.021 .784 .010 .855-.072C.926-.155 1.113-.432 1.170-.507C1.227-.583 1.193-.522 1.198-.525","len":1.42,"parent":null,"at":0},{"d":"M.850-.062C.851-.055 .850-.027 .855-.018C.860-.008 .871-.005 .882-.005C.894-.005 .905-.006 .922-.015C.940-.024 .969-.051 .985-.060C1.001-.069 1.003-.055 1.020-.070C1.037-.085 1.033-.076 1.087-.150C1.142-.224 1.297-.450 1.345-.512C1.393-.575 1.368-.523 1.373-.525","len":0.68,"parent":null,"at":0},{"d":"M1.022-.068C1.022-.062 1.018-.047 1.020-.037C1.022-.028 1.021-.014 1.032-.010C1.044-.006 1.066-.004 1.087-.013C1.109-.021 1.129-.033 1.160-.062C1.191-.092 1.254-.167 1.272-.188","len":0.3125,"parent":null,"at":0}]}};

/* ---- src/script-draw.js ---- */
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
      var path = el('path', { d: p.d });
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

    // One continuous pen. All strokes sit end to end on a single line (twigs, the little hooks
    // hanging off a stroke, start where the pen passes them), and one ease runs over the whole
    // word, so it reads as a single movement rather than separate strokes.
    // Lengths are measured (getTotalLength), not normalised with pathLength, which Safari can
    // ignore for dashes.
    var len = strokes.map(function (s) { return s.getTotalLength() || 0.001; });
    var from = [], span = 0, total = 0;
    data.paths.forEach(function (p, i) {
      if (p.parent == null) { from[i] = total; total += len[i]; }
      else from[i] = from[p.parent] + p.at * len[p.parent];
      span = Math.max(span, from[i] + len[i]);
    });
    var dur = setting(host, 'duration', 1800), STEPS = 48;
    var ease = function (t) { return 0.5 - 0.5 * Math.cos(Math.PI * t); }; // gentle in and out
    var anims = strokes.map(function (path, i) {
      var L = len[i];
      // One dash the length of the stroke, then a longer gap; offset just past the dash so
      // nothing shows before the pen arrives (a zero-length dash would still draw its round cap).
      path.setAttribute('stroke-dasharray', L + ' ' + (L + 1));
      path.setAttribute('stroke-dashoffset', L + 0.01);
      var frames = [];
      for (var k = 0; k <= STEPS; k++) {
        var drawn = Math.min(1, Math.max(0, (ease(k / STEPS) * span - from[i]) / L));
        frames.push({ offset: k / STEPS, strokeDashoffset: drawn ? L * (1 - drawn) : L + 0.01 });
      }
      return path.animate(frames, { duration: dur, easing: 'linear', fill: 'forwards' });
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

/* ---- src/reveal.js ---- */
/* Scroll entrance animations. Why custom code: Webflow interactions have to be added element by
   element; this gives every core element one consistent entrance by default.

   What animates by default (inside <main>): headings, paragraphs, blockquotes, images, video,
   figures and buttons. Each fades in and rises 1rem into place, once, the first time it scrolls
   into view. Elements that come into view together follow each other in reading order.
   The motion (curve, distance, no replay) is the same everywhere; only timing can be tuned.

   Tune it (on the element or any ancestor, so one attribute on a section covers all of it):
     vci-reveal="false"     no entrance
     vci-reveal             opt in any other element (a card, a list item...)
     vci-reveal-delay       ms before it starts (default 0)
     vci-reveal-duration    ms (default 600)
   Or from a combo class in the style panel, with custom properties (inherited the same way):
     --reveal-delay: 200    --reveal-duration: 900
   An attribute wins over a custom property.

   Safe by construction:
     - nothing is hidden unless this script runs; reduced motion skips it entirely;
     - what is already on screen at load is left alone (no flash on the hero);
     - only opacity and the translate property animate: no layout shift, compositor-only;
     - focus, find-in-page and printing reveal anything still waiting;
     - skips the nav, menus, dialogs, elements with a Webflow interaction, script lettering
       (it has its own write-on), and anything inside another revealing element. */
(function () {
  if (!window.IntersectionObserver || !Element.prototype.animate) return;
  if (window.matchMedia && matchMedia('(prefers-reduced-motion: reduce)').matches) return;

  var DEFAULTS = 'h1,h2,h3,h4,h5,h6,p,blockquote,img,picture,video,figure,.button,.w-button';
  var SKIP = 'nav,header,[role="dialog"],.w-nav,.w-dropdown,.nav_component,.text-style-script,[data-w-id]';
  var EASE = 'cubic-bezier(.2,.7,.2,1)', RISE = '0 1rem', STAGGER = 70, MAX_STAGGER = 5;
  var DURATION = 600;

  function off(el) {
    var o = el.closest('[vci-reveal]');
    return !!o && (o.getAttribute('vci-reveal') || '').toLowerCase() === 'false';
  }
  function num(el, name, fallback) {
    var holder = el.closest('[vci-reveal-' + name + ']');
    var v = holder ? parseFloat(holder.getAttribute('vci-reveal-' + name)) : NaN;
    if (isNaN(v)) v = parseFloat(getComputedStyle(el).getPropertyValue('--reveal-' + name));
    return isNaN(v) || v < 0 ? fallback : v;
  }

  function init() {
    var root = document.querySelector('main') || document.querySelector('.main-wrapper') || document.body;
    var found = root.querySelectorAll(DEFAULTS + ',[vci-reveal]:not([vci-reveal="false"])');
    var targets = [], set = new Set();
    for (var i = 0; i < found.length; i++) {
      var el = found[i];
      if (el.closest(SKIP) || off(el)) continue;
      // One entrance per piece of content: not inside another element that is revealing.
      var up = el.parentElement, nested = false;
      for (; up && up !== root; up = up.parentElement) if (set.has(up)) { nested = true; break; }
      if (nested) continue;
      set.add(el); targets.push(el);
    }

    // Read every position first, then write: one layout pass.
    var vh = innerHeight;
    var waiting = targets.filter(function (el) {
      var r = el.getBoundingClientRect();
      return r.width && r.height && r.top >= vh; // already on screen (or not rendered): leave alone
    });
    if (!waiting.length) return;

    var pending = new Set(waiting);
    function reveal(el, extra) {
      if (!pending.delete(el)) return;
      io.unobserve(el);
      el.animate([{ opacity: 0, translate: RISE }, { opacity: 1, translate: '0 0' }], {
        duration: num(el, 'duration', DURATION),
        delay: num(el, 'delay', 0) + (extra || 0),
        easing: EASE,
        fill: 'backwards'
      });
      el.style.opacity = ''; // the animation holds it hidden until it starts
    }
    function revealAll() { pending.forEach(function (el) { reveal(el); }); }

    var io = new IntersectionObserver(function (entries) {
      var batch = entries.filter(function (e) { return e.isIntersecting; }).map(function (e) { return e.target; });
      // Reading order within a batch, so a row of cards or a heading + paragraph cascade.
      batch.sort(function (a, b) { return a.compareDocumentPosition(b) & Node.DOCUMENT_POSITION_FOLLOWING ? -1 : 1; });
      batch.forEach(function (el, k) { reveal(el, Math.min(k, MAX_STAGGER) * STAGGER); });
    }, { rootMargin: '0px 0px -8% 0px' });

    waiting.forEach(function (el) {
      el.style.opacity = '0';
      io.observe(el);
    });

    document.addEventListener('focusin', function (e) {
      pending.forEach(function (el) { if (el.contains(e.target)) reveal(el); });
    });
    addEventListener('beforeprint', revealAll);
  }

  if (document.readyState === 'loading') document.addEventListener('DOMContentLoaded', init); else init();
})();
