/*! The Parkway Church site code v0.9.69. Built from src/, do not edit. */
/* ---- src/announcement.js ---- */
/* Announcement bar [vci-announcement="bar"] inside the sticky nav: --announcement-height = its height (the nav's negative sticky top), removed with 0 when empty. */
(function () {
  var bar = document.querySelector('[vci-announcement="bar"]');
  var root = document.documentElement.style;
  var item = bar && bar.querySelector('.w-dyn-item');
  if (!item || !item.textContent.trim()) {
    if (bar) bar.remove();
    root.setProperty('--announcement-height', '0px');
    return;
  }
  // Only a bar with a real link is a link: it gets .is-linked (hover style lives on that combo in
  // Webflow). With no link (empty field renders "#"), it loses its href and is plain text.
  var link = item.querySelector('a.announcement_link');
  if (link) {
    var href = (link.getAttribute('href') || '').trim();
    if (!href || href === '#') link.removeAttribute('href');
    else link.classList.add('is-linked');
  }
  function measure() { root.setProperty('--announcement-height', bar.offsetHeight + 'px'); }
  measure();
  addEventListener('resize', measure);
})();

/* ---- src/button-icons.js ---- */
/* Button icons: the button component's "Icon" field (a Material Symbols name, e.g. calendar_add_on) lands on its
   [vci-icon] spans; "Icon on right" shows the right-hand span ([vci-icon-side="right"]), so the left one goes.
   Loads only the icons this page uses, as one small font, then shows them (.is-loaded). No script: no icon. */
(function () {
  var spans = Array.prototype.slice.call(document.querySelectorAll('[vci-icon]'));
  var names = {};
  spans.forEach(function (el) {
    var name = (el.getAttribute('vci-icon') || '').trim().toLowerCase().replace(/\s+/g, '_');
    var right = el.parentElement && el.parentElement.querySelector('[vci-icon-side="right"]');
    if (!/^[a-z0-9_]+$/.test(name) || (right && right !== el)) { el.remove(); return; }
    el.textContent = name;
    names[name] = true;
  });
  var list = Object.keys(names).sort(); // Google requires icon_names in alphabetical order
  if (!list.length) return;
  var link = document.createElement('link');
  link.rel = 'stylesheet';
  link.href = 'https://fonts.googleapis.com/css2?family=Material+Symbols+Rounded:opsz,wght,FILL,GRAD@24,400,0,0' +
    '&icon_names=' + list.join(',') + '&display=block';
  document.head.appendChild(link);
  spans.forEach(function (el) { if (el.isConnected) el.classList.add('material-symbols-rounded', 'is-loaded'); });
})();

/* ---- src/buttons.js ---- */
/* Button component: draws the arch pill shape and the nav pill, tertiary underline slide. */
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

/* ---- src/nav-scroll.js ---- */
/* Sticky header: .is-hidden slides it up while scrolling down, off again scrolling up, at the top, on focus, or (desktop) when the pointer rests where it sits. Closes open dropdowns as it hides. */
(function () {
  var nav = document.querySelector('.nav_component');
  if (!nav) return;
  if (matchMedia('(prefers-reduced-motion: reduce)').matches) nav.style.transition = 'none';
  var last = 0, travel = 0, user = false;
  // Scrolls before the visitor does anything (restored position, back/forward, #hash) never hide it.
  ['wheel', 'touchstart', 'keydown', 'pointerdown'].forEach(function (t) {
    addEventListener(t, function () { user = true; }, { once: true, passive: true });
  });
  function hide(on) {
    if (on === nav.classList.contains('is-hidden')) return;
    nav.classList.toggle('is-hidden', on);
    if (on) Array.prototype.forEach.call(nav.querySelectorAll('.w-dropdown-list.w--open'), function (l) {
      var dd = l.parentElement;
      if (!dd.contains(document.activeElement) && window.jQuery) jQuery(dd).triggerHandler('w-close');
    });
  }
  addEventListener('scroll', function () {
    var y = Math.min(Math.max(scrollY, 0), document.documentElement.scrollHeight - innerHeight);
    var d = y - last;
    last = y;
    if (!user || Math.abs(d) > innerHeight) { travel = 0; return; }
    travel = d * travel > 0 ? travel + d : d;
    if (y < nav.offsetHeight) hide(false);
    else if (travel > 6) hide(true);
    else if (travel < -6) hide(false);
  }, { passive: true });
  nav.addEventListener('focusin', function () { hide(false); });

  // Desktop: a hover dropdown left open when the pointer is no longer on it. Scrolling moves the
  // header out from under a still pointer (and trackpad momentum can end without a pointer event),
  // so Webflow never sees the leave and the panel stays up. After any scroll or pointer move,
  // close open dropdowns that are neither under the pointer nor holding keyboard focus. The check
  // waits a moment, so crossing the gap between a tab and its panel never counts as leaving.
  if (matchMedia('(hover: hover) and (pointer: fine)').matches) {
    var STRAY_WAIT = 350, strayQueued = false;
    var closeStray = function () {
      strayQueued = false;
      if (!window.jQuery) return;
      Array.prototype.forEach.call(nav.querySelectorAll('.w-dropdown-list.w--open'), function (l) {
        var dd = l.parentElement;
        if (dd.matches(':hover') || dd.contains(document.activeElement)) return;
        jQuery(dd).triggerHandler('w-close');
      });
    };
    var queueStray = function () {
      if (strayQueued || !nav.querySelector('.w-dropdown-list.w--open')) return;
      strayQueued = true;
      setTimeout(closeStray, STRAY_WAIT);
    };
    addEventListener('scroll', queueStray, { passive: true });
    document.addEventListener('pointermove', function (e) {
      if (e.pointerType === 'mouse' && !nav.contains(e.target)) queueStray();
    }, { passive: true });
  }

  // Desktop: resting the pointer where the hidden header sits brings it back; it stays until the next scroll down.
  // Only a deliberate pause counts: not mid-scroll, no button held, not over something clickable, nothing modal open,
  // and passing through on the way to the browser's tabs or address bar is too quick to trigger it.
  if (!matchMedia('(hover: hover) and (pointer: fine)').matches) return;
  var DWELL = 200, QUIET = 350, MARGIN = 16, scrolled = 0, timer = 0, px = 0, py = 0;
  var CLICKABLE = 'a, button, input, select, textarea, label, summary, iframe, video, [role="button"], [tabindex]:not([tabindex="-1"])';
  addEventListener('scroll', function () { scrolled = performance.now(); cancel(); }, { passive: true });
  function cancel() { clearTimeout(timer); timer = 0; }
  function zone() { // where the header sits when shown, plus a margin, whatever its hide transform is doing now
    var t = getComputedStyle(nav).transform, shift = t && t !== 'none' ? new DOMMatrix(t).m42 : 0;
    return nav.getBoundingClientRect().bottom - shift + MARGIN;
  }
  function ready(e) {
    if (!nav.classList.contains('is-hidden') || e.buttons || py > zone()) return false;
    if (performance.now() - scrolled < QUIET || document.body.style.overflow === 'hidden') return false;
    if (String(getSelection()).length) return false; // selecting text
    var under = document.elementFromPoint(px, py);
    return !(under && !nav.contains(under) && under.closest(CLICKABLE));
  }
  addEventListener('pointermove', function (e) {
    if (e.pointerType !== 'mouse') return;
    px = e.clientX; py = e.clientY;
    if (!ready(e)) { cancel(); return; }
    if (!timer) timer = setTimeout(function () { timer = 0; if (ready({ buttons: 0 })) hide(false); }, DWELL);
  }, { passive: true });
  document.addEventListener('mouseout', function (e) { if (!e.relatedTarget) cancel(); }); // left the window
  addEventListener('pointerdown', cancel, { passive: true });
})();

/* ---- src/nav-toggle.js ---- */
/* Mobile menu toggle. */
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
/* Nav dropdowns drawn as part of the pill (one shape), sliding between tabs with a gliding link highlight and a safe triangle.
   Only adds to the stock Webflow dropdown; .is-connected / .is-open / .is-instant / .is-glide carry the styles. */
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
    // Mouse-driven extras (gliding highlight, safe triangle) need pointer events.
    var hasPointer = !!window.PointerEvent;

    var TRAVEL = 16; // px the links drift when switching
    var CROSSFADE = 110; // ms old and new links crossfade

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
    var pending = null; // list waiting to take over (safe triangle)
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
    // One highlight per dropdown, shared by its tab and its links: it sits on the tab while the
    // pointer is there, glides down into the links and back up, and fades out when the pointer
    // leaves that dropdown. Each dropdown has its own, so moving to another tab fades that tab's
    // highlight in rather than dragging one across. All of its look is the .nav_dropdown-highlight
    // element and classes in Webflow; this only sizes, places and toggles it:
    //   .nav_dropdown-highlight.is-active   shown
    //   .nav_dropdown-highlight.is-instant  jump without gliding (a fresh entry fades in where it is)
    //   .nav_dropdown-link.is-glide         link's own hover background off while the highlight runs
    // The element is authored inside its list, but the list stacks above the tab and would wash
    // over the tab's label, so on desktop the script moves it into .nav_links, behind the tabs
    // and the (transparent, connected) links, where .nav_links-highlight already lives.
    // No highlight element in a list: that list keeps its links' and tab's native :hover.
    function fluidHover(list) {
      var hl = list.querySelector('.nav_dropdown-highlight');
      var bar = pill.querySelector('.nav_links');
      var dd = list.parentElement;
      var tab = dd.querySelector('.nav_dropdown-toggle');
      var none = { clear: function () {}, engage: function () {}, refresh: function () {}, owns: false };
      if (!hl || !bar || !tab || !hasPointer) return none;
      if (hl.parentNode !== bar) bar.insertBefore(hl, bar.firstChild);
      var lit = null;
      var engaged = false;
      var leaveTimer = 0;
      var range = document.createRange();

      function links() {
        return Array.prototype.slice.call(list.querySelectorAll('.nav_dropdown-link'));
      }

      // Box of the target in .nav_links' own coordinates. The tab is sized like a link's hover:
      // its label plus the links' padding, read live so the two always match.
      function box(target) {
        var b = bar.getBoundingClientRect();
        if (target !== tab) {
          var r = target.getBoundingClientRect();
          return { x: r.left - b.left, y: r.top - b.top, w: r.width, h: r.height };
        }
        var link = links()[0];
        var lc = link ? getComputedStyle(link) : null;
        var px = function (v) {
          return parseFloat(v) || 0;
        };
        var pt = lc ? px(lc.paddingTop) : 10;
        var pr = lc ? px(lc.paddingRight) : 12;
        var pb = lc ? px(lc.paddingBottom) : 10;
        var pl = lc ? px(lc.paddingLeft) : 12;
        range.selectNodeContents(tab);
        var c = range.getBoundingClientRect();
        return { x: c.left - b.left - pl, y: c.top - b.top - pt, w: c.width + pl + pr, h: c.height + pt + pb };
      }

      function place(target) {
        var r = box(target);
        hl.style.width = r.w + 'px';
        hl.style.height = r.h + 'px';
        hl.style.transform = 'translate(' + r.x + 'px,' + r.y + 'px)';
      }

      function show(target) {
        clearTimeout(leaveTimer);
        if (target === lit) return;
        var fresh = !lit;
        lit = target;
        if (!target) {
          setClass(hl, 'is-active', false);
          return;
        }
        // A fresh entry fades in where it lands; after that it travels, tab and links alike.
        setClass(hl, 'is-instant', fresh || reduce.matches);
        place(target);
        setClass(hl, 'is-active', true);
      }

      // Leaving waits a beat, so crossing a gap inside the dropdown never blinks.
      function hide() {
        clearTimeout(leaveTimer);
        leaveTimer = setTimeout(function () {
          show(null);
        }, 60);
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

      tab.addEventListener('pointerenter', function (e) {
        if (engaged && e.pointerType === 'mouse') show(tab);
      });
      list.addEventListener('pointermove', function (e) {
        if (!engaged || e.pointerType !== 'mouse' || list !== active) return;
        // The bridge strip above the panel still belongs to the tab.
        show(e.clientY < pill.getBoundingClientRect().bottom ? tab : nearest(e.clientY));
      });
      dd.addEventListener('pointerleave', function () {
        if (engaged) hide();
      });
      tab.addEventListener('focusin', function () {
        if (engaged && tab.matches(':focus-visible')) show(tab);
      });
      list.addEventListener('focusin', function (e) {
        var a = e.target.closest && e.target.closest('.nav_dropdown-link');
        if (engaged && a) show(a);
      });
      dd.addEventListener('focusout', function (e) {
        if (!dd.contains(e.relatedTarget)) hide();
      });

      return {
        owns: true,
        clear: function () {
          clearTimeout(leaveTimer);
          show(null);
        },
        // Re-measure where it stands (resize, fonts, the panel settling) without re-fading.
        refresh: function () {
          if (lit) place(lit);
        },
        // Engaged: the highlight replaces the links' own hover background.
        // Disengaged (mobile menu): the links' native :hover is back in charge.
        engage: function (on) {
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
      var tabs = Array.prototype.slice.call(bar.querySelectorAll('.nav_link'));
      if (!tabs.length) return { update: function () {} };
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
        var t = TRAVEL * dir;
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
        // A tab can light up before its list takes the panel (safe triangle); keep that.
        if (l !== active && hovered !== l) hovers[i].clear();
        else hovers[i].refresh();
      });
      tabs.update();
      measure();
    }

    // ---- safe triangle ------------------------------------
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
      if (!aiming()) return false;
      pending = l;
      clearTimeout(pendingTimer);
      // Still on that tab when the wait is up: it gets the panel after all.
      pendingTimer = setTimeout(function () {
        if (pending === l && hovered === l) takeOver(l);
        else if (pending === l) pending = null;
      }, SAFE_REST);
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
      if (pending && hovered === pending && !aiming()) takeOver(pending);
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

/* ---- src/accordion-highlight.js ---- */
/* Accordion: one .accordion_highlight glides to the hovered or focused .accordion_item (.is-active, .is-instant) and follows it while it opens. */
(function () {
  var hls = document.querySelectorAll('.accordion_highlight');
  if (!hls.length) return;
  var fine = window.matchMedia && matchMedia('(hover: hover) and (pointer: fine)');
  var reduce = window.matchMedia && matchMedia('(prefers-reduced-motion: reduce)');

  Array.prototype.forEach.call(hls, function (hl) {
    var frame = hl.parentElement;
    var rows = Array.prototype.map.call(frame.querySelectorAll('.accordion_toggle'), function (t) {
      return t.closest('.accordion_item') || t;
    });
    if (!rows.length) return;
    var lit = null, over = null, leaveTimer = 0;

    function place(t, glide) {
      var r = t.getBoundingClientRect(), f = frame.getBoundingClientRect();
      if (glide !== null) hl.classList.toggle('is-instant', !glide || !!(reduce && reduce.matches));
      hl.style.width = r.width + 'px';
      hl.style.height = r.height + 'px';
      hl.style.transform = 'translate(' + (r.left - f.left - frame.clientLeft) + 'px,' +
        (r.top - f.top - frame.clientTop) + 'px)';
    }
    function update() {
      var t = over;
      if (t === lit) { if (t) place(t, null); return; }
      var fresh = !lit;
      lit = t;
      if (!t) { hl.classList.remove('is-active'); return; }
      place(t, !fresh);
      hl.classList.add('is-active');
    }
    function enter(t) { clearTimeout(leaveTimer); over = t; update(); }
    // Leaving waits a beat, so moving straight onto the next question glides instead of re-fading.
    function leave(t) {
      if (over !== t) return;
      clearTimeout(leaveTimer);
      leaveTimer = setTimeout(function () { if (over === t) over = null; update(); }, 60);
    }

    rows.forEach(function (t) {
      t.addEventListener('pointerenter', function (e) {
        if (e.pointerType === 'mouse' || (fine && fine.matches)) enter(t);
      });
      t.addEventListener('pointerleave', function () { leave(t); });
      t.addEventListener('focusin', function () {
        if (t.matches(':focus-visible') || t.querySelector(':focus-visible')) enter(t);
      });
      t.addEventListener('focusout', function () { leave(t); });
    });
    // An answer opening or closing changes the lit row's height (and moves the rows below). While
    // it does, the highlight tracks the row frame by frame with its own glide switched off
    // (is-instant), so it moves with the accordion's own speed and curve instead of chasing it on
    // a different one. Once the row has held still for a few frames, gliding comes back.
    var raf = 0;
    function follow() {
      cancelAnimationFrame(raf);
      var start = Date.now(), lastH = -1, still = 0;
      (function tick() {
        if (!lit) return;
        hl.classList.add('is-instant');
        place(lit, null);
        var h = lit.getBoundingClientRect().height;
        still = Math.abs(h - lastH) < 0.5 ? still + 1 : 0;
        lastH = h;
        if ((still < 4 || Date.now() - start < 120) && Date.now() - start < 2000) raf = requestAnimationFrame(tick);
        else if (!(reduce && reduce.matches)) hl.classList.remove('is-instant');
      })();
    }
    frame.addEventListener('click', follow);
    addEventListener('resize', function () { if (lit) place(lit, null); });
  });
})();

/* ---- src/form-validate.js ---- */
/* Light form validation on top of the browser's own (the Send button submits through requestSubmit,
   so these messages show in the native bubble):
   - email: needs name@domain.tld (the browser alone accepts "a@b").
   - tel: typing is limited to digits and phone punctuation; needs 10-15 digits; a plain 10-digit
     number is tidied to (555) 123-4567 on blur.
   - required fields can't be only spaces.
   The field's .input_field gets .is-invalid (styled in Webflow) once it has been left or a submit
   was tried, and loses it as soon as the value is fine. */
(function () {
  var EMAIL = /^[^\s@]+@[^\s@.]+(\.[^\s@.]+)*\.[a-z]{2,}$/i;

  function check(input) {
    var v = input.value.trim(), msg = '';
    if (input.required && !v) msg = '';
    else if (input.type === 'email' && v && !EMAIL.test(v)) msg = 'Enter an email like name@example.com.';
    else if (input.type === 'tel' && v) {
      var digits = v.replace(/\D/g, '').length;
      if (digits < 10 || digits > 15) msg = 'Enter a phone number with area code, like (555) 123-4567.';
    }
    if (input.required && !v && input.value) msg = 'Please fill out this field.';
    input.setCustomValidity(msg);
    return input.checkValidity();
  }
  function mark(input, on) {
    var field = input.closest('.input_field');
    if (field) field.classList.toggle('is-invalid', on);
  }

  Array.prototype.forEach.call(document.querySelectorAll('form'), function (form) {
    var inputs = form.querySelectorAll('input[type="email"], input[type="tel"], input[type="text"], textarea');
    Array.prototype.forEach.call(inputs, function (input) {
      var touched = false;
      if (input.type === 'tel') {
        input.setAttribute('inputmode', 'tel');
        input.addEventListener('input', function () {
          var clean = input.value.replace(/[^\d+()\-. ]/g, '');
          if (clean !== input.value) input.value = clean;
        });
      }
      if (input.type === 'email') input.setAttribute('inputmode', 'email');
      input.addEventListener('input', function () {
        var ok = check(input);
        if (touched || ok) mark(input, !ok);
      });
      input.addEventListener('blur', function () {
        if (input.type === 'tel') {
          var d = input.value.replace(/\D/g, '');
          if (d.length === 10 && !/^\s*\+/.test(input.value)) input.value = '(' + d.slice(0, 3) + ') ' + d.slice(3, 6) + '-' + d.slice(6);
        }
        if (!input.value && !input.required) { touched = false; mark(input, false); check(input); return; }
        touched = true;
        mark(input, !check(input));
      });
      input.addEventListener('invalid', function () { touched = true; mark(input, true); });
      check(input);
    });
  });
})();

/* ---- src/form-submit.js ---- */
/* Button component as a form submit: [vci-form="submit"] submits through the form's hidden native submit, and shows its "Sending…" text. */
(function () {
  Array.prototype.forEach.call(document.querySelectorAll('form [vci-form="submit"]'), function (wrap) {
    var form = wrap.closest('form');
    var native = form && form.querySelector('input[type="submit"], button[type="submit"]');
    var link = wrap.querySelector('a, button') || wrap;
    if (!native || native === link) return;

    link.setAttribute('role', 'button');
    function submit(e) {
      e.preventDefault();
      if (form.requestSubmit) form.requestSubmit(native); else native.click();
    }
    link.addEventListener('click', submit);
    link.addEventListener('keydown', function (e) { if (e.key === ' ') submit(e); });

    // Mirror Webflow's "Sending…" text onto the component's label.
    var label = null, original = '';
    (function find(el) {
      for (var i = 0; i < el.children.length && !label; i++) find(el.children[i]);
      if (!label && !el.children.length && el.textContent.trim()) label = el;
    })(link);
    if (!label) return;
    original = label.textContent;
    form.addEventListener('submit', function () {
      label.textContent = native.getAttribute('data-wait') || original;
    });
    // Back to the normal label if Webflow shows its error message (on success the form hides).
    var fail = form.parentElement && form.parentElement.querySelector('.w-form-fail');
    if (fail) new MutationObserver(function () {
      if (getComputedStyle(fail).display !== 'none') label.textContent = original;
    }).observe(fail, { attributes: true, attributeFilter: ['style'] });
  });
})();

/* ---- src/read-time.js ---- */
/* "X min read" from the word count of the nearest [vci-read-time="source"] into [vci-read-time="value"]; removes [vci-read-time="wrap"] when there is nothing to count. */
(function () {
  var WPM = 225;
  function run(root) {
    Array.prototype.forEach.call(root.querySelectorAll('[vci-read-time="value"]:not([vci-read-time-done])'), function (value) {
      value.setAttribute('vci-read-time-done', '');
      var source = null;
      for (var el = value.parentElement; el && !source; el = el.parentElement) {
        source = el.querySelector('[vci-read-time="source"]');
      }
      var words = source ? (source.textContent.match(/\S+/g) || []).length : 0;
      var wrap = value.closest('[vci-read-time="wrap"]');
      if (!words) { (wrap || value).remove(); return; }
      value.textContent = Math.max(1, Math.round(words / WPM)) + ' min read';
    });
  }
  run(document);
  if (document.querySelector('[fs-list-element], .w-dyn-list')) {
    new MutationObserver(function (records) {
      records.forEach(function (r) {
        Array.prototype.forEach.call(r.addedNodes, function (n) { if (n.nodeType === 1) run(n.parentElement || n); });
      });
    }).observe(document.body, { childList: true, subtree: true });
  }
})();

/* ---- src/card-date.js ---- */
/* [vci-date="short"]: shortens a card date. Within 12 months of today it's "Nov 18"; further out it keeps the year,
   "Nov 18, 2024". Reads whatever Webflow printed ("November 18, 2026", "Nov 18, 2026"...); no script: the full date. */
(function () {
  var MONTHS = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'];
  var now = new Date();
  var from = new Date(now.getFullYear() - 1, now.getMonth(), now.getDate());
  var to = new Date(now.getFullYear() + 1, now.getMonth(), now.getDate());
  function run(root) {
    Array.prototype.forEach.call(root.querySelectorAll('[vci-date="short"]:not([vci-date-done])'), function (el) {
      el.setAttribute('vci-date-done', '');
      var m = el.textContent.trim().match(/^([A-Za-z]{3})[A-Za-z]*\.?\s+(\d{1,2}),?\s+(\d{4})$/);
      var month = m ? MONTHS.indexOf(m[1].charAt(0).toUpperCase() + m[1].slice(1, 3).toLowerCase()) : -1;
      if (month < 0) return;
      var date = new Date(+m[3], month, +m[2]);
      el.textContent = MONTHS[month] + ' ' + +m[2] + (date >= from && date <= to ? '' : ', ' + m[3]);
    });
  }
  run(document);
  if (document.querySelector('[fs-list-element], .w-dyn-list')) { // items Finsweet loads or re-renders later
    new MutationObserver(function (records) {
      records.forEach(function (r) {
        Array.prototype.forEach.call(r.addedNodes, function (n) { if (n.nodeType === 1) run(n.parentElement || n); });
      });
    }).observe(document.body, { childList: true, subtree: true });
  }
})();

/* ---- src/pager.js ---- */
/* Article previous / next: fills [vci-pager="prev"|"next"] from the hidden date-sorted [vci-pager="list"]. */
(function () {
  var nav = document.querySelector('[vci-pager="nav"]');
  var list = nav && document.querySelector('[vci-pager="list"]');
  if (!nav || !list) return;
  var norm = function (p) { return (p || '').replace(/\/+$/, '').toLowerCase(); };
  var here = norm(location.pathname);
  var links = Array.prototype.filter.call(list.querySelectorAll('a[href]'), function (a) {
    return a.getAttribute('href') && a.getAttribute('href') !== '#';
  });
  var i = -1;
  links.forEach(function (a, n) { if (norm(new URL(a.href, location.href).pathname) === here) i = n; });
  function fill(role, a) {
    var el = nav.querySelector('[vci-pager="' + role + '"]');
    if (!el) return;
    if (!a) { el.remove(); return; }
    el.setAttribute('href', a.getAttribute('href'));
    var t = el.querySelector('[vci-pager="title"]');
    if (t) t.textContent = a.textContent.trim();
  }
  fill('prev', i >= 0 ? links[i + 1] : null); // older
  fill('next', i > 0 ? links[i - 1] : null);  // newer
  list.remove();
  if (!nav.querySelector('[vci-pager="prev"], [vci-pager="next"]')) nav.remove();
})();

/* ---- src/media-item.js ---- */
/* Media item page [vci-media="component"]: Watch/Listen switch, breadcrumb + "View series" links into the /media filters, numbered series list with the current item marked. Drops whatever has no data. */
(function () {
  var root = document.querySelector('[vci-media="component"]');
  if (!root) return;
  function q(v) { return root.querySelector('[vci-media="' + v + '"]'); }
  function empty(el) { return !el || !el.textContent.trim() || el.classList.contains('w-dyn-bind-empty'); }
  function filter(field, value) { return '/media?' + field + '_equal=' + encodeURIComponent(JSON.stringify([value])); }

  // Watch / Listen
  var watch = q('watch'), audio = q('listen'), mode = q('mode');
  var video = watch && watch.querySelector('.w-video, iframe');
  var frame = video && (video.tagName === 'IFRAME' ? video : video.querySelector('iframe'));
  var hasVideo = !!(frame && frame.getAttribute('src'));
  var hasAudio = !!(audio && audio.getAttribute('src'));
  if (!hasAudio && audio) audio.remove();
  if (!hasVideo && video) video.remove();
  if (!(hasVideo && hasAudio)) { if (mode) mode.remove(); }
  else {
    var src = frame.getAttribute('src');
    var set = function (m) {
      var listen = m === 'listen';
      Array.prototype.forEach.call(mode.querySelectorAll('[vci-media-mode]'), function (b) {
        var on = b.getAttribute('vci-media-mode') === m;
        b.classList.toggle('is-active', on);
        b.setAttribute('aria-pressed', on);
      });
      video.classList.toggle('is-hidden', listen);
      audio.classList.toggle('is-hidden', !listen);
      if (listen) frame.removeAttribute('src'); // stops the video
      else { audio.pause(); if (!frame.getAttribute('src')) frame.setAttribute('src', src); }
    };
    set('watch');
    mode.classList.add('is-ready'); // hidden in the Designer until this runs; without it video and audio both show
    mode.addEventListener('click', function (e) {
      var b = e.target.closest('[vci-media-mode]');
      if (b) set(b.getAttribute('vci-media-mode'));
    });
  }

  // Breadcrumb + series links
  var type = q('crumb-type'), series = q('crumb-series');
  var name = empty(series) ? '' : series.textContent.trim();
  [[type, 'type'], [series, 'series']].forEach(function (c) {
    if (empty(c[0])) { var sep = c[0] && c[0].previousElementSibling; if (sep) sep.remove(); if (c[0]) c[0].remove(); }
    else c[0].setAttribute('href', filter(c[1], c[0].textContent.trim()));
  });
  var more = q('series-link');
  if (more && name) more.setAttribute('href', filter('series', name));

  // Meta line "passage · date": drop empty parts and the dot next to them (classes have no passage).
  Array.prototype.forEach.call(root.querySelectorAll('.content_card-meta > .w-dyn-bind-empty'), function (el) {
    var dot = el.nextElementSibling || el.previousElementSibling;
    if (dot && dot.textContent.trim() === '·') dot.remove();
    el.remove();
  });

  // Speaker
  var speaker = q('speaker');
  if (speaker) {
    if (empty(speaker.querySelector('.media-item_speaker-name'))) speaker.remove();
    else Array.prototype.forEach.call(speaker.querySelectorAll('img.w-dyn-bind-empty, .w-dyn-bind-empty'), function (e) { e.remove(); });
  }

  // Series list: newest first, numbered oldest = 1, current item marked and scrolled into view.
  var list = q('series-list'), aside = q('aside');
  var items = list ? list.querySelectorAll('.w-dyn-item') : [];
  if (!name || items.length < 2) { if (aside) aside.remove(); root.classList.add('is-single'); return; }
  var here = location.pathname.replace(/\/+$/, '');
  Array.prototype.forEach.call(items, function (item, i) {
    var n = item.querySelector('[vci-media="series-number"]');
    if (n) n.textContent = String(items.length - i).padStart(2, '0');
    var a = item.querySelector('a[href]');
    if (a && new URL(a.href, location.href).pathname.replace(/\/+$/, '') === here) {
      a.classList.add('is-current');
      a.setAttribute('aria-current', 'page');
      var box = list.parentElement;
      box.scrollTop += a.getBoundingClientRect().top - box.getBoundingClientRect().top - (box.clientHeight - a.offsetHeight) / 2;
    }
  });
})();

/* ---- src/media-filters.js ---- */
/* Finsweet filter bar: [vci-filters="count"] shows how many options are checked in its dropdown (its toggle gets .is-active).
   When the filters change, every dropdown that isn't open opens next time scrolled to the top: Finsweet's empty facets
   re-sort its options, so an old scroll position would land somewhere arbitrary. The open one keeps its place while
   you pick in it. (A closed list is display:none and can't be scrolled, so the reset waits until it opens.)
   The active-filter tags row needs nothing here: Finsweet only puts it in the page while a filter is applied.
   Empty facets are held back until every item has loaded (see settle below). */
(function () {
  var form = document.querySelector('[fs-list-element="filters"]');
  if (!form || !form.querySelector('[vci-filters="count"]')) return;
  var dds = Array.prototype.slice.call(form.querySelectorAll('.w-dropdown'));
  var stale = [];
  var last = null;

  function isOpen(dd) { return !!dd.querySelector('.w-dropdown-toggle.w--open'); }

  function update() {
    var now = Array.prototype.map.call(form.querySelectorAll('input:checked'), function (i) {
      return i.name + '=' + (i.getAttribute('fs-list-value') || i.value);
    }).join('|');
    if (last !== null && now !== last) dds.forEach(function (dd, i) { if (!isOpen(dd)) stale[i] = true; });
    last = now;
    dds.forEach(function (dd) {
      var count = dd.querySelector('[vci-filters="count"]');
      if (!count) return;
      var n = dd.querySelectorAll('input:checked').length;
      if (count.textContent !== String(n)) count.textContent = n;
      count.classList.toggle('is-empty', !n);
      dd.querySelector('.w-dropdown-toggle').classList.toggle('is-active', !!n);
    });
  }

  dds.forEach(function (dd, i) {
    var toggle = dd.querySelector('.w-dropdown-toggle');
    var area = dd.querySelector('[vci-scroll="area"]');
    if (!toggle || !area) return;
    new MutationObserver(function () {
      if (stale[i] && isOpen(dd)) { area.scrollTop = 0; stale[i] = false; }
    }).observe(toggle, { attributes: true, attributeFilter: ['class'] });
  });

  // Inline search: a dropdown with more than SEARCH_MIN options shows its [vci-filters="search"] field (.is-active on
  // the wrap) and filters the options by name as you type. Enter checks the first match. Cleared when it closes.
  // Without the script the field stays hidden in the Designer and the full list scrolls as before.
  var SEARCH_MIN = 8;
  dds.forEach(function (dd) {
    var input = dd.querySelector('[vci-filters="search"]');
    var area = dd.querySelector('[vci-scroll="area"]');
    var toggle = dd.querySelector('.w-dropdown-toggle');
    if (!input || !area || !toggle) return;
    var options = Array.prototype.slice.call(area.querySelectorAll('label'));
    if (options.length <= SEARCH_MIN) return;
    var none = dd.querySelector('[vci-filters="search-empty"]');
    input.parentElement.classList.add('is-active');
    var row = function (label) { return label.closest('.w-dyn-item') || label; };
    var name = function (label) {
      var s = label.querySelector('span:not([fs-list-element])');
      return (s || label).textContent.trim().toLowerCase();
    };
    var usable = function (label) {
      if (row(label).style.display === 'none') return false;
      if (form.classList.contains('is-loading')) return true; // facets aren't final yet, so nothing looks grayed
      return !row(label).classList.contains('is-list-emptyfacet') && !label.classList.contains('is-list-emptyfacet');
    };
    function apply() {
      var q = input.value.trim().toLowerCase(), shown = 0;
      options.forEach(function (label) {
        var hit = !q || name(label).indexOf(q) > -1;
        row(label).style.display = hit ? '' : 'none';
        if (hit) shown++;
      });
      if (none) none.classList.toggle('is-active', !shown);
      area.scrollTop = 0;
      area.dispatchEvent(new Event('scroll')); // the custom scrollbar re-measures
    }
    input.addEventListener('input', apply);
    input.addEventListener('search', apply); // Escape and the clear button empty a search field without an input event
    input.addEventListener('keydown', function (e) {
      if (e.key !== 'Enter') return;
      e.preventDefault(); // don't submit the filters form
      var first = options.filter(usable)[0];
      if (first) { first.click(); input.focus({ preventScroll: true }); } // keep typing
    });
    var fine = matchMedia('(pointer: fine)'); // no keyboard pop-up on touch screens
    var wasOpen = false;
    new MutationObserver(function () {
      var open = isOpen(dd);
      if (open === wasOpen) return; // count and connect classes change too; only act on open and close
      wasOpen = open;
      if (open) { if (fine.matches) requestAnimationFrame(function () { input.focus({ preventScroll: true }); }); }
      else { input.value = ''; apply(); }
    }).observe(toggle, { attributes: true, attributeFilter: ['class'] });
  });

  // Empty facets settle once. Finsweet loads every page of media in the background (one to several seconds) and
  // re-works out which options are empty from whatever has arrived, so without this they gray and jump to the
  // bottom one by one while it loads. The form carries .is-loading in the Designer, which keeps the empty-facet look
  // switched off. Each option's facet is its own async job that re-runs whenever the items change and writes its count
  // into the option's [fs-list-element="facet-count"] span when it finishes. Once the last page has landed, those jobs
  // run back to back (a few ms apart), so the class comes off when the counts have gone quiet for QUIET ms after
  // loading. If the script never runs, nothing grays, and every option stays clickable.
  var QUIET = 150;
  function settle(l) {
    var loaded = false, timer;
    var done = function () { observer.disconnect(); clearTimeout(timer); form.classList.remove('is-loading'); };
    var wait = function () { clearTimeout(timer); timer = setTimeout(done, QUIET); };
    var observer = new MutationObserver(function (records) {
      if (!loaded) return;
      for (var i = 0; i < records.length; i++) {
        var el = records[i].target.nodeType === 3 ? records[i].target.parentElement : records[i].target;
        if (el && el.closest && el.closest('[fs-list-element="facet-count"]')) return wait();
      }
    });
    observer.observe(form, { subtree: true, childList: true, characterData: true });
    if (!l.loadingPaginatedItems) return done();
    l.loadingPaginatedItems.then(function () { loaded = true; wait(); });
  }

  window.FinsweetAttributes = window.FinsweetAttributes || [];
  window.FinsweetAttributes.push(['list', function (lists) {
    // Runs after every filter pass, including tag removal and Clear all.
    (lists || []).forEach(function (l) { if (l.addHook) l.addHook('filter', function (items) { setTimeout(update); return items; }); });
    if (lists && lists[0]) settle(lists[0]); else form.classList.remove('is-loading');
    form.addEventListener('change', update);
    update();
  }]);
})();

/* ---- src/connected-dropdown.js ---- */
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
      other.p = 0; other.fading = true; // its open flag keeps following Webflow's w--open; sync ignores it while fading
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
    c.release = release;

    function sync() {
      var on = toggle.classList.contains('w--open');
      if (on === c.open) return; // our own class writes land here and stop
      c.open = on;
      if (c.fading) { // another dropdown is sliding our panel away
        if (!on) return; // Webflow closing us: that slide already handles it
        var host = all.filter(function (x) { return x.morph && x.morph.ctl === c; })[0];
        if (host) { host.release(c); host.morph = null; host.toggle.classList.add('is-connected'); } // switched straight back
      }
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

/* ---- src/fluid-scroll.js ---- */
/* Fluid Functionalism scrollbar for [vci-scroll="area"]: a thin thumb ([vci-scroll="thumb"] in the sibling
   [vci-scroll="track"]) that rests narrow and faint, widens on hover (.is-hover) and darkens while dragged
   (.is-dragging). Looks are in the Designer; .is-custom-scroll hides the native bar and .is-scrollable shows the
   track. Touch screens and no-script keep native scrolling. */
(function () {
  if (matchMedia('(pointer: coarse)').matches) return;
  Array.prototype.forEach.call(document.querySelectorAll('[vci-scroll="area"]'), function (area) {
    var track = area.parentElement.querySelector('[vci-scroll="track"]');
    var thumb = track && track.querySelector('[vci-scroll="thumb"]');
    if (!thumb) return;
    area.classList.add('is-custom-scroll');
    var drag = null;

    function update() {
      var max = area.scrollHeight - area.clientHeight;
      track.classList.toggle('is-scrollable', max > 1);
      if (max <= 1) return;
      var th = track.clientHeight;
      var size = Math.max(24, th * area.clientHeight / area.scrollHeight);
      thumb.style.height = size + 'px';
      thumb.style.transform = 'translateY(' + (th - size) * area.scrollTop / max + 'px)';
    }

    area.addEventListener('scroll', update, { passive: true });
    if (window.ResizeObserver) new ResizeObserver(update).observe(area); // also fires when the dropdown opens
    track.addEventListener('pointerenter', function () { thumb.classList.add('is-hover'); });
    track.addEventListener('pointerleave', function () { if (!drag) thumb.classList.remove('is-hover'); });
    track.addEventListener('pointerdown', function (e) {
      e.preventDefault();
      var r = thumb.getBoundingClientRect();
      var ratio = (area.scrollHeight - area.clientHeight) / (track.clientHeight - r.height);
      if (e.target !== thumb) area.scrollTop += (e.clientY - (r.top + r.height / 2)) * ratio; // jump the thumb to the click
      drag = { y: e.clientY, top: area.scrollTop, ratio: ratio };
      track.setPointerCapture(e.pointerId);
      thumb.classList.add('is-dragging');
    });
    track.addEventListener('pointermove', function (e) {
      if (drag) area.scrollTop = drag.top + (e.clientY - drag.y) * drag.ratio;
    });
    function end(e) {
      if (!drag) return;
      drag = null;
      thumb.classList.remove('is-dragging');
      if (!track.matches(':hover')) thumb.classList.remove('is-hover');
    }
    track.addEventListener('pointerup', end);
    track.addEventListener('pointercancel', end);
    update();
  });
})();

/* ---- src/hover-highlight.js ---- */
/* Gliding hover highlight for option lists: [vci-highlight="glide"] moves to the hovered option inside [vci-highlight="list"]; also rotates the dropdown chevron (.is-open). */
(function () {
  var fine = window.matchMedia && matchMedia('(hover: hover) and (pointer: fine)');
  var reduce = window.matchMedia && matchMedia('(prefers-reduced-motion: reduce)');

  Array.prototype.forEach.call(document.querySelectorAll('[vci-highlight="list"]'), function (list) {
    var hl = list.querySelector('[vci-highlight="glide"]');
    if (!hl) return;
    var lit = null, timer = 0;
    function opts() { return list.querySelectorAll('label, a'); }
    function place(el, glide) {
      var r = el.getBoundingClientRect(), f = list.getBoundingClientRect();
      hl.classList.toggle('is-instant', !glide || !!(reduce && reduce.matches));
      hl.style.width = r.width + 'px';
      hl.style.height = r.height + 'px';
      hl.style.transform = 'translate(' + (r.left - f.left) + 'px,' + (r.top - f.top + list.scrollTop) + 'px)';
    }
    function show(el) {
      clearTimeout(timer);
      if (el === lit) return;
      place(el, !!lit);
      lit = el;
      hl.classList.add('is-active');
      Array.prototype.forEach.call(opts(), function (o) { o.classList.add('is-glide'); });
    }
    function hide() {
      timer = setTimeout(function () {
        lit = null;
        hl.classList.remove('is-active');
        Array.prototype.forEach.call(opts(), function (o) { o.classList.remove('is-glide'); });
      }, 60);
    }
    list.addEventListener('pointerover', function (e) {
      if (!(e.pointerType === 'mouse' || (fine && fine.matches))) return;
      var o = e.target.closest('label, a');
      if (o && list.contains(o)) show(o);
    });
    list.addEventListener('pointerleave', hide);

    // Chevron follows the dropdown's open state.
    var dd = list.closest('.w-dropdown');
    var toggle = dd && dd.querySelector('.w-dropdown-toggle');
    var icon = dd && (dd.querySelector('[vci-highlight="icon"]') || dd.querySelector('.w-icon-dropdown-toggle'));
    if (toggle && icon) new MutationObserver(function () {
      icon.classList.toggle('is-open', toggle.classList.contains('w--open'));
    }).observe(toggle, { attributes: true, attributeFilter: ['class'] });
  });
})();

/* ---- src/seasons.js ---- */
/* Season wordmark. Seasons live in the CMS (Name, Start Month, End Month); a hidden list on the page
   carries one [vci-season="item"] per season with vci-season-name / -start / -end. From 7 days
   before a season starts, [vci-season="name"] shows it and [vci-season="qualifier"] reads
   "Begins December 1"; otherwise the current season shows and the qualifier is removed.
   Event lists are not affected. Runs before script-draw so the write-on draws the right word. */
(function () {
  var names = document.querySelectorAll('[vci-season="name"]');
  if (!names.length) return;
  var ABBR = ['jan', 'feb', 'mar', 'apr', 'may', 'jun', 'jul', 'aug', 'sep', 'oct', 'nov', 'dec'];
  function month(v) { v = (v || '').trim().toLowerCase(); var n = parseInt(v, 10); return n >= 1 && n <= 12 ? n - 1 : ABBR.indexOf(v.slice(0, 3)); }
  var seasons = Array.prototype.map.call(document.querySelectorAll('[vci-season="item"]'), function (it) {
    return { name: (it.getAttribute('vci-season-name') || '').trim(), s: month(it.getAttribute('vci-season-start')), e: month(it.getAttribute('vci-season-end')) };
  }).filter(function (x) { return x.name && x.s >= 0 && x.e >= 0; });
  function at(d) {
    var m = d.getMonth();
    for (var i = 0; i < seasons.length; i++) { var x = seasons[i]; if (x.s <= x.e ? m >= x.s && m <= x.e : m >= x.s || m <= x.e) return x; }
  }
  var now = new Date(), current = at(now), soon = at(new Date(now.getFullYear(), now.getMonth(), now.getDate() + 7));
  var show = soon || current, upcoming = soon && soon !== current;
  if (!show) return;
  Array.prototype.forEach.call(names, function (el) { if (el.textContent.trim() !== show.name) el.textContent = show.name; });
  var label = upcoming && 'Begins ' + new Intl.DateTimeFormat(undefined, { month: 'long' }).format(new Date(2000, show.s, 1)) + ' 1';
  Array.prototype.forEach.call(document.querySelectorAll('[vci-season="qualifier"]'), function (el) {
    if (label) el.textContent = label; else el.remove();
  });
})();

/* ---- src/events-calendar.js ---- */
/* Church calendar. One Events Collection List is the source for everything:
   - every item with vci-event-start (+ vci-event-end): hidden once ended; its [vci-event="month"] /
     [vci-event="day"] date tile is filled; its [vci-event="details"] is removed when the body is empty.
   - [vci-event="link"][vci-event-slug] (the event_card Small variant) links to /events#slug, the
     event's card in the full list (each item's id is its slug).
   - landing on /events#slug outlines that card for a moment (.is-highlighted).
   - [vci-calendar="upcoming"] list: shows only the next vci-calendar-limit events.
   - [vci-calendar="featured"]: hidden when none of its events are left.
   - .ics links become webcal:// so calendar apps subscribe.
   - Google Calendar subscribe links hand Apple devices the feed instead.
   - [vci-calendar="component"]: the /events upcoming list and its empty message. */
(function () {
  var MONTHS = ['january', 'february', 'march', 'april', 'may', 'june', 'july', 'august', 'september', 'october', 'november', 'december'];
  function key(y, m, d) { return y * 10000 + (m + 1) * 100 + d; }
  function dkey(d) { return key(d.getFullYear(), d.getMonth(), d.getDate()); }
  function fromKey(k) { return new Date(Math.floor(k / 10000), Math.floor(k / 100) % 100 - 1, k % 100); }
  function parse(v) {
    v = (v || '').trim();
    var m = v.match(/^(\d{4})-(\d{2})-(\d{2})/);
    if (m) return key(+m[1], m[2] - 1, +m[3]);
    m = v.match(/([A-Za-z]+)\.?\s+(\d{1,2}),?\s+(\d{4})/);
    if (m) for (var i = 0; i < 12; i++) if (MONTHS[i].indexOf(m[1].toLowerCase().slice(0, 3)) === 0) return key(+m[3], i, +m[2]);
    var t = new Date(v);
    return isNaN(t) ? 0 : dkey(t);
  }
  function $(root, sel) { return root.querySelector(sel); }
  function all(root, sel) { return Array.prototype.slice.call(root.querySelectorAll(sel)); }
  function q(root, name) { return $(root, '[vci-calendar="' + name + '"]'); }
  function fmt(opts) { return new Intl.DateTimeFormat(undefined, opts); }
  var shortMonth = fmt({ month: 'short' });

  var now = new Date(), today = dkey(now);

  // Every event, wherever it is listed.
  var events = all(document, '[vci-event-start]').map(function (el) {
    var start = parse(el.getAttribute('vci-event-start'));
    var end = Math.max(start, parse(el.getAttribute('vci-event-end')) || start);
    var ev = { el: el, start: start, end: end, ended: !start || end < today };
    if (ev.ended) { el.style.display = 'none'; return ev; }
    var d = fromKey(start), m = $(el, '[vci-event="month"]'), day = $(el, '[vci-event="day"]');
    if (m) m.textContent = shortMonth.format(d);
    if (day) day.textContent = d.getDate();
    var details = $(el, '[vci-event="details"]');
    if (details && !details.textContent.trim()) details.remove();
    var link = $(el, '[vci-event="link"][vci-event-slug]');
    if (link) {
      var slug = link.getAttribute('vci-event-slug').trim();
      if (slug) link.setAttribute('href', (link.getAttribute('href') || '/events').split('#')[0] + '#' + encodeURIComponent(slug));
    }
    return ev;
  });

  all(document, '[vci-calendar="upcoming"]').forEach(function (list) {
    var n = parseInt(list.getAttribute('vci-calendar-limit'), 10) || 4;
    all(list, '[vci-event-start]').forEach(function (el) {
      if (el.style.display !== 'none' && n-- <= 0) el.style.display = 'none';
    });
  });
  all(document, '[vci-calendar="featured"]').forEach(function (block) {
    if (!all(block, '[vci-event-start]').some(function (el) { return el.style.display !== 'none'; })) block.style.display = 'none';
  });
  all(document, 'a[href*=".ics"]').forEach(function (a) { // the feed itself, not a link that carries it (Google's cid=)
    var href = a.getAttribute('href');
    if (/^https?:\/\/[^?#]*\.ics(?:[?#]|$)/i.test(href)) a.setAttribute('href', href.replace(/^https?:/i, 'webcal:'));
  });

  // "Add to your calendar" points at Google Calendar's subscribe page (works anywhere, no script needed). Apple
  // devices get the feed itself instead, so Apple Calendar subscribes: iPhone, iPad, and Safari on a Mac.
  var ua = navigator.userAgent;
  var ios = /iPhone|iPad|iPod/.test(ua) || (/Macintosh/.test(ua) && navigator.maxTouchPoints > 1);
  var macSafari = /Macintosh/.test(ua) && /Safari/.test(ua) && !/Chrome|Chromium|Edg|Firefox|OPR/.test(ua);
  if (ios || macSafari) all(document, 'a[href*="calendar.google.com/calendar/render"][href*="cid="]').forEach(function (a) {
    var feed = new URL(a.href).searchParams.get('cid');
    if (!/^webcal:/i.test(feed || '')) return;
    a.setAttribute('href', feed);
    a.removeAttribute('target');
  });

  // /events#slug (from a Small card): outline that event's card once it has scrolled into view.
  function landOn() {
    var id = decodeURIComponent(location.hash.slice(1));
    var target = id && document.getElementById(id);
    if (!target || !target.hasAttribute('vci-event-start') || target.style.display === 'none') return;
    target.classList.remove('is-highlighted');
    void target.offsetWidth; // restart if it was already lit
    target.classList.add('is-highlighted');
    clearTimeout(landOn.t);
    landOn.t = setTimeout(function () { target.classList.remove('is-highlighted'); }, 2400);
  }
  landOn();
  window.addEventListener('hashchange', landOn);

  // [vci-calendar="component"]: the full upcoming list; [vci-calendar="empty"] shows when nothing is left.
  var comp = q(document, 'component');
  if (!comp) return;
  var empty = q(comp, 'empty');
  if (empty) empty.hidden = events.some(function (ev) { return !ev.ended && comp.contains(ev.el); });
})();

/* ---- src/script-draw-paths.js ---- */
/* Generated by scripts/trim-paths/ from the site font. Do not edit by hand.
   Each word: the pen line (centerline, in writing order) in em units from the text origin and
   baseline; width = how thick the pen must be to cover the letters. */
window.__scriptDrawPaths = {"Winter":{"width":0.0802,"paths":[{"d":"M.065-.190C.054-.195 .018-.208 .000-.223C-.018-.237-.030-.255-.040-.278C-.050-.300-.059-.328-.062-.357C-.066-.387-.065-.423-.060-.453C-.055-.482-.044-.508-.033-.532C-.021-.557-.007-.579 .010-.600C.027-.621 .047-.642 .072-.660C.098-.678 .135-.697 .163-.708C.190-.718 .207-.721 .237-.725C.268-.729 .281-.737 .343-.730C.404-.723 .558-.695 .605-.685C.652-.675 .613-.672 .623-.672C.632-.672 .654-.685 .662-.685C.671-.685 .666-.677 .675-.675C.684-.673 .703-.672 .718-.672C.733-.673 .750-.674 .765-.677C.780-.681 .799-.688 .810-.695C.821-.702 .827-.710 .830-.718C.833-.725 .833-.733 .830-.740C.827-.747 .819-.754 .810-.757C.801-.761 .794-.764 .777-.760C.761-.756 .728-.744 .710-.735C.692-.726 .679-.716 .670-.708C.661-.699 .665-.690 .657-.685C.650-.680 .643-.691 .627-.675C.612-.659 .596-.641 .565-.590C.534-.539 .491-.467 .443-.367C.394-.268 .301-.064 .273 .005C.244 .074 .265 .042 .270 .048C.275 .053 .278 .058 .302 .037C.327 .017 .343 .009 .417-.077C.492-.164 .666-.386 .748-.480C.829-.574 .876-.612 .907-.640C.939-.668 .932-.650 .938-.647C.943-.645 .950-.645 .938-.623C.925-.600 .885-.556 .860-.515C.835-.474 .826-.460 .785-.378C.744-.295 .643-.088 .613-.022C.583 .043 .604 .010 .605 .018C.606 .025 .611 .021 .618 .020C.624 .019 .625 .028 .645 .010C.665-.008 .673-.011 .735-.085C.797-.159 .945-.346 1.018-.432C1.090-.519 1.129-.561 1.173-.603C1.216-.644 1.246-.663 1.278-.680C1.309-.697 1.348-.701 1.363-.705","len":4.4425,"parent":null,"at":0},{"d":"M.265 .048C.254 .059 .220 .100 .200 .117C.180 .135 .156 .145 .147 .150","len":0.125,"parent":0,"at":0.492},{"d":"M.940-.647C.947-.653 .964-.670 .983-.680C1.001-.690 1.041-.701 1.052-.705","len":0.115,"parent":0,"at":0.662},{"d":"M.605 .020C.591 .035 .544 .089 .520 .110C.496 .131 .472 .139 .463 .145","len":0.155,"parent":0,"at":0.811},{"d":"M1.093-.305C1.088-.303 1.094-.328 1.065-.292C1.036-.257 .946-.129 .920-.090C.894-.051 .911-.071 .910-.060C.909-.049 .911-.031 .915-.022C.919-.014 .927-.010 .932-.007C.938-.005 .934-.005 .950-.007C.966-.010 .980 .022 1.028-.025C1.075-.072 1.182-.245 1.232-.292C1.282-.340 1.309-.311 1.327-.310C1.346-.309 1.342-.297 1.345-.287C1.348-.278 1.363-.288 1.345-.255C1.327-.222 1.257-.121 1.238-.087C1.218-.054 1.228-.067 1.228-.055C1.228-.043 1.229-.024 1.238-.018C1.246-.011 1.257-.007 1.278-.015C1.298-.023 1.322-.025 1.360-.068C1.398-.110 1.482-.230 1.508-.268C1.533-.305 1.508-.285 1.515-.292C1.522-.300 1.543-.307 1.550-.315C1.557-.323 1.535-.307 1.555-.338C1.575-.368 1.645-.466 1.670-.497C1.695-.529 1.699-.520 1.705-.525","len":1.64,"parent":null,"at":0},{"d":"M1.548-.312C1.550-.311 1.553-.304 1.562-.302C1.572-.301 1.593-.301 1.603-.302C1.613-.304 1.619-.311 1.623-.312","len":0.0775,"parent":4,"at":0.864},{"d":"M1.515-.295C1.513-.296 1.515-.302 1.505-.302C1.495-.302 1.463-.296 1.455-.295","len":0.0625,"parent":4,"at":0.864},{"d":"M1.120-.390C1.123-.393 1.133-.405 1.135-.407","len":0.02,"parent":null,"at":0},{"d":"M1.355-.058C1.356-.052 1.357-.031 1.360-.022C1.363-.014 1.365-.010 1.373-.007C1.380-.005 1.396-.005 1.407-.007C1.419-.010 1.418-.004 1.442-.022C1.467-.041 1.527-.101 1.552-.120C1.578-.139 1.578-.114 1.597-.135C1.617-.156 1.643-.217 1.670-.245C1.697-.273 1.735-.294 1.758-.305C1.780-.316 1.790-.314 1.802-.312C1.815-.311 1.830-.303 1.835-.295C1.840-.287 1.839-.274 1.835-.263C1.831-.251 1.831-.244 1.812-.228C1.794-.211 1.747-.178 1.722-.165C1.698-.152 1.677-.152 1.663-.150C1.648-.147 1.642-.148 1.635-.150C1.628-.152 1.625-.160 1.623-.163","len":0.81,"parent":null,"at":0},{"d":"M1.518-.295C1.522-.298 1.542-.310 1.548-.312","len":0.0325,"parent":null,"at":0},{"d":"M1.595-.130C1.595-.117 1.592-.072 1.597-.052C1.603-.033 1.611-.020 1.625-.013C1.639-.005 1.665-.006 1.680-.007C1.695-.009 1.703-.013 1.718-.020C1.732-.028 1.751-.038 1.770-.052C1.789-.067 1.790-.062 1.830-.107C1.870-.152 1.968-.291 2.007-.323C2.047-.354 2.056-.304 2.067-.295C2.079-.286 2.095-.306 2.075-.268C2.055-.229 1.966-.107 1.945-.065C1.924-.023 1.945-.027 1.948-.018C1.950-.008 1.954-.009 1.960-.007C1.966-.006 1.975-.005 1.985-.007C1.995-.010 2.006-.014 2.020-.025C2.034-.036 2.048-.048 2.070-.075C2.092-.102 2.139-.167 2.152-.185","len":1.105,"parent":null,"at":0}]},"Spring":{"width":0.0739,"paths":[{"d":"M.600-.792C.609-.773 .632-.709 .652-.677C.673-.646 .699-.622 .723-.603C.746-.583 .768-.572 .792-.560C.817-.548 .831-.538 .868-.532C.904-.527 .979-.527 1.012-.527C1.046-.528 1.045-.530 1.070-.537C1.095-.545 1.137-.558 1.160-.570C1.183-.582 1.197-.595 1.210-.610C1.223-.625 1.233-.646 1.238-.660C1.242-.674 1.239-.685 1.238-.695C1.236-.705 1.237-.709 1.230-.718C1.223-.726 1.208-.739 1.198-.745C1.187-.751 1.179-.752 1.165-.752C1.151-.752 1.138-.755 1.115-.745C1.092-.735 1.060-.723 1.025-.693C.990-.662 .924-.588 .902-.562C.881-.537 .903-.542 .897-.537C.892-.532 .876-.538 .870-.532C.864-.527 .920-.592 .860-.505C.800-.418 .581-.109 .507-.013C.434 .084 .449 .051 .420 .075C.391 .099 .364 .117 .335 .130C.306 .143 .274 .151 .247 .155C.221 .159 .199 .156 .177 .152C.156 .149 .134 .140 .117 .133C.101 .125 .091 .117 .077 .105C.064 .092 .050 .082 .037 .058C.025 .033 .008-.008 .003-.043C-.003-.077-.000-.121 .003-.150C.005-.179 .012-.195 .020-.217C.028-.240 .035-.258 .050-.282C.065-.307 .085-.336 .110-.362C.135-.389 .170-.419 .203-.440C.235-.461 .268-.477 .302-.490C.337-.502 .367-.512 .407-.515C.448-.518 .504-.515 .545-.505C.586-.495 .635-.461 .652-.453","len":3.11,"parent":null,"at":0},{"d":"M.497 .210C.502 .208 .493 .238 .525 .198C.557 .157 .656 .009 .690-.035C.724-.079 .713-.041 .730-.065C.747-.089 .765-.140 .790-.177C.815-.215 .848-.265 .880-.287C.912-.310 .961-.311 .983-.310C1.004-.309 1.005-.293 1.010-.282C1.015-.272 1.014-.257 1.012-.245C1.011-.233 1.017-.237 1.002-.212C.988-.188 .952-.126 .927-.095C.903-.064 .876-.042 .855-.028C.834-.013 .817-.008 .802-.005C.788-.002 .782 .000 .770-.010C.758-.020 .739-.056 .733-.065","len":1.0625,"parent":null,"at":0},{"d":"M1.180-.325C1.189-.320 1.225-.304 1.235-.295C1.245-.286 1.242-.278 1.242-.270C1.243-.263 1.259-.283 1.238-.250C1.216-.217 1.136-.109 1.115-.072C1.094-.036 1.108-.041 1.110-.030C1.112-.019 1.118-.010 1.127-.007C1.137-.005 1.152-.004 1.167-.013C1.183-.021 1.206-.048 1.220-.058C1.234-.067 1.221-.029 1.252-.068C1.284-.106 1.379-.250 1.410-.290C1.441-.330 1.435-.302 1.440-.305","len":0.7225,"parent":null,"at":0},{"d":"M1.175-.325C1.155-.299 1.073-.194 1.052-.168","len":0.16,"parent":2,"at":0.0},{"d":"M1.255-.065C1.256-.058 1.256-.035 1.260-.025C1.264-.015 1.258-.007 1.278-.007C1.297-.007 1.325 .022 1.375-.025C1.425-.072 1.530-.245 1.580-.292C1.630-.340 1.656-.311 1.675-.310C1.694-.309 1.690-.297 1.692-.287C1.695-.277 1.710-.287 1.690-.250C1.670-.212 1.594-.099 1.575-.062C1.556-.026 1.573-.037 1.575-.030C1.577-.022 1.577-.020 1.585-.018C1.593-.015 1.606-.004 1.625-.015C1.644-.026 1.682-.070 1.700-.083C1.718-.095 1.718-.077 1.732-.092C1.747-.107 1.761-.143 1.785-.172C1.809-.202 1.851-.246 1.875-.268C1.899-.289 1.912-.296 1.930-.302C1.948-.309 1.970-.313 1.985-.307C2.000-.302 2.013-.280 2.018-.270C2.022-.260 2.030-.279 2.013-.250C1.995-.221 1.939-.134 1.910-.095C1.881-.056 1.853-.036 1.840-.018C1.827 .001 1.837 .007 1.830 .018C1.823 .028 1.811 .040 1.800 .045C1.789 .050 1.787 .037 1.762 .048C1.738 .058 1.680 .089 1.653 .105C1.625 .121 1.611 .132 1.595 .145C1.579 .158 1.565 .170 1.558 .185C1.550 .200 1.547 .222 1.548 .235C1.548 .247 1.556 .255 1.562 .260C1.569 .265 1.576 .268 1.587 .268C1.599 .267 1.613 .266 1.630 .255C1.647 .244 1.671 .222 1.690 .203C1.709 .183 1.726 .158 1.742 .138C1.759 .117 1.779 .095 1.788 .080C1.796 .065 1.794 .053 1.795 .048","len":2.205,"parent":null,"at":0},{"d":"M1.468-.390C1.470-.394 1.482-.409 1.485-.412","len":0.025,"parent":null,"at":0},{"d":"M1.735-.090C1.735-.082 1.733-.055 1.735-.043C1.738-.030 1.743-.018 1.750-.013C1.757-.007 1.760-.007 1.775-.007C1.790-.008 1.829-.016 1.840-.018","len":0.17,"parent":null,"at":0}]},"Summer":{"width":0.0759,"paths":[{"d":"M.600-.792C.609-.773 .632-.709 .652-.677C.673-.646 .699-.622 .723-.603C.746-.583 .768-.572 .792-.560C.817-.548 .831-.538 .868-.532C.904-.527 .979-.527 1.012-.527C1.046-.528 1.045-.530 1.070-.537C1.095-.545 1.137-.558 1.160-.570C1.183-.582 1.197-.595 1.210-.610C1.223-.625 1.233-.646 1.238-.660C1.242-.674 1.239-.685 1.238-.695C1.236-.705 1.237-.709 1.230-.718C1.223-.726 1.208-.739 1.198-.745C1.187-.751 1.179-.752 1.165-.752C1.151-.752 1.138-.755 1.115-.745C1.092-.735 1.060-.723 1.025-.693C.990-.662 .924-.588 .902-.562C.881-.537 .903-.542 .897-.537C.892-.532 .876-.538 .870-.532C.864-.527 .920-.592 .860-.505C.800-.418 .581-.109 .507-.013C.434 .084 .449 .051 .420 .075C.391 .099 .364 .117 .335 .130C.306 .143 .274 .151 .247 .155C.221 .159 .199 .156 .177 .152C.156 .149 .134 .140 .117 .133C.101 .125 .091 .117 .077 .105C.064 .092 .050 .082 .037 .058C.025 .033 .008-.008 .003-.043C-.003-.077-.000-.121 .003-.150C.005-.179 .012-.195 .020-.217C.028-.240 .035-.258 .050-.282C.065-.307 .085-.336 .110-.362C.135-.389 .170-.419 .203-.440C.235-.461 .268-.477 .302-.490C.337-.502 .367-.512 .407-.515C.448-.518 .504-.515 .545-.505C.586-.495 .635-.461 .652-.453","len":3.11,"parent":null,"at":0},{"d":"M.853-.055C.838-.047 .781-.015 .762-.007C.744 .000 .746-.005 .740-.007C.734-.010 .728-.012 .725-.020C.722-.028 .715-.037 .720-.055C.725-.073 .727-.086 .755-.128C.783-.169 .868-.273 .890-.302","len":0.4175,"parent":null,"at":0},{"d":"M.855-.055C.856-.049 .858-.028 .863-.020C.867-.012 .863-.007 .880-.007C.897-.008 .934-.005 .963-.025C.991-.045 1.018-.085 1.052-.130C1.087-.175 1.138-.265 1.173-.295C1.207-.325 1.240-.313 1.258-.310C1.275-.307 1.275-.287 1.278-.275C1.280-.263 1.296-.282 1.270-.240C1.244-.198 1.149-.063 1.120-.025C1.091 .013 1.099-.013 1.095-.010","len":0.8025,"parent":null,"at":0},{"d":"M.855-.058C.883-.098 .997-.258 1.025-.297","len":0.25,"parent":null,"at":0},{"d":"M1.280-.263C1.285-.264 1.297-.262 1.312-.270C1.328-.278 1.356-.303 1.370-.310C1.384-.317 1.390-.314 1.397-.310C1.405-.306 1.410-.295 1.413-.287C1.415-.280 1.417-.278 1.415-.268C1.413-.257 1.417-.256 1.397-.223C1.378-.189 1.314-.100 1.298-.068C1.281-.035 1.297-.034 1.300-.025C1.303-.016 1.310-.015 1.315-.013C1.320-.010 1.319-.009 1.333-.013C1.346-.016 1.354 .012 1.397-.035C1.441-.082 1.551-.249 1.595-.295C1.639-.341 1.646-.307 1.660-.310C1.674-.312 1.674-.312 1.680-.310C1.686-.307 1.692-.304 1.695-.295C1.698-.286 1.703-.270 1.700-.258C1.697-.245 1.704-.256 1.677-.217C1.651-.179 1.569-.062 1.542-.028C1.516 .007 1.522-.013 1.518-.010","len":1.15,"parent":null,"at":0},{"d":"M1.702-.263C1.708-.264 1.723-.265 1.735-.273C1.748-.280 1.765-.298 1.778-.305C1.790-.312 1.801-.314 1.810-.312C1.819-.311 1.826-.303 1.830-.297C1.834-.292 1.836-.289 1.835-.278C1.834-.266 1.842-.264 1.823-.230C1.803-.196 1.738-.106 1.720-.072C1.702-.039 1.715-.040 1.718-.030C1.720-.020 1.725-.014 1.735-.013C1.745-.011 1.755-.003 1.778-.020C1.800-.037 1.848-.098 1.870-.115C1.892-.133 1.896-.117 1.907-.125C1.919-.133 1.933-.156 1.940-.160C1.947-.164 1.938-.150 1.950-.150C1.962-.150 1.989-.148 2.015-.158C2.041-.167 2.086-.193 2.107-.207C2.129-.222 2.135-.231 2.143-.245C2.150-.259 2.154-.279 2.152-.290C2.151-.301 2.143-.307 2.132-.310C2.122-.313 2.103-.312 2.090-.310C2.077-.308 2.070-.306 2.055-.297C2.040-.289 2.020-.276 2.002-.260C1.985-.244 1.961-.216 1.950-.200C1.939-.184 1.944-.174 1.938-.163C1.931-.151 1.914-.149 1.910-.130C1.906-.111 1.913-.065 1.915-.048C1.917-.030 1.919-.034 1.925-.028C1.931-.021 1.938-.010 1.952-.007C1.967-.005 1.992-.004 2.015-.013C2.038-.021 2.068-.039 2.092-.058C2.117-.076 2.123-.080 2.163-.125C2.202-.170 2.291-.296 2.328-.325C2.364-.354 2.369-.307 2.380-.297C2.391-.288 2.411-.306 2.393-.270C2.374-.234 2.290-.116 2.268-.080C2.245-.044 2.258-.063 2.257-.052C2.257-.042 2.258-.022 2.265-.015C2.272-.007 2.291-.006 2.303-.007C2.314-.009 2.304 .006 2.333-.022C2.361-.051 2.449-.154 2.473-.180","len":2.2425,"parent":null,"at":0}]},"Fall":{"width":0.0715,"paths":[{"d":"M-.372 .070C-.362 .080-.338 .116-.312 .133C-.287 .149-.252 .162-.223 .168C-.193 .173-.167 .173-.135 .168C-.103 .162-.066 .150-.033 .133C.001 .115 .035 .090 .065 .065C.095 .040 .112 .025 .147-.020C.183-.065 .257-.168 .280-.203C.303-.237 .278-.220 .285-.228C.292-.235 .315-.241 .323-.250C.330-.259 .317-.255 .333-.280C.348-.305 .367-.334 .417-.398C.468-.461 .594-.614 .637-.660C.681-.706 .670-.667 .677-.672C.685-.678 .668-.678 .685-.693C.702-.707 .743-.741 .780-.760C.817-.779 .870-.798 .905-.805C.940-.812 .967-.808 .990-.805C1.013-.802 1.030-.794 1.042-.785C1.055-.776 1.061-.764 1.062-.750C1.064-.736 1.062-.716 1.050-.700C1.038-.684 1.016-.664 .993-.652C.969-.641 .945-.635 .910-.632C.875-.630 .821-.634 .785-.637C.749-.641 .713-.650 .695-.655C.677-.660 .684-.669 .675-.670C.666-.671 .659-.659 .640-.662C.621-.666 .605-.681 .562-.693C.520-.704 .438-.724 .388-.730C.337-.736 .302-.735 .260-.728C.218-.720 .168-.699 .135-.682C.103-.666 .085-.648 .065-.627C.045-.607 .027-.581 .013-.557C-.002-.534-.013-.507-.020-.485C-.027-.463-.029-.446-.030-.427C-.031-.409-.032-.394-.028-.372C-.023-.351-.015-.319-.003-.297C.010-.276 .029-.257 .045-.245C.061-.233 .085-.228 .092-.225","len":3.07,"parent":null,"at":0},{"d":"M.287-.230C.285-.232 .276-.241 .270-.242C.264-.244 .263-.245 .250-.240C.237-.235 .204-.217 .195-.212","len":0.095,"parent":0,"at":0.242},{"d":"M.325-.250C.327-.248 .318-.245 .335-.240C.352-.235 .397-.225 .425-.223C.453-.220 .485-.221 .505-.225C.525-.229 .536-.242 .542-.245","len":0.22,"parent":null,"at":0},{"d":"M.665-.048C.650-.041 .598-.014 .578-.007C.557-.001 .553-.005 .545-.010C.537-.015 .530-.026 .527-.037C.525-.049 .525-.063 .527-.077C.530-.092 .534-.103 .545-.122C.556-.142 .578-.174 .595-.195C.612-.216 .632-.235 .647-.250C.663-.265 .675-.275 .690-.285C.705-.295 .723-.304 .738-.307C.753-.311 .768-.311 .780-.305C.792-.299 .806-.283 .807-.270C.809-.257 .813-.262 .790-.225C.767-.188 .686-.083 .667-.048C.649-.012 .674-.022 .677-.015C.681-.008 .679-.006 .690-.005C.701-.004 .718 .001 .745-.010C.772-.021 .784 .010 .855-.072C.926-.155 1.113-.432 1.170-.507C1.227-.583 1.193-.522 1.198-.525","len":1.42,"parent":null,"at":0},{"d":"M.850-.062C.851-.055 .850-.027 .855-.018C.860-.008 .871-.005 .882-.005C.894-.005 .905-.006 .922-.015C.940-.024 .969-.051 .985-.060C1.001-.069 1.003-.055 1.020-.070C1.037-.085 1.033-.076 1.087-.150C1.142-.224 1.297-.450 1.345-.512C1.393-.575 1.368-.523 1.373-.525","len":0.68,"parent":null,"at":0},{"d":"M1.022-.068C1.022-.062 1.018-.047 1.020-.037C1.022-.028 1.021-.014 1.032-.010C1.044-.006 1.066-.004 1.087-.013C1.109-.021 1.129-.033 1.160-.062C1.191-.092 1.254-.167 1.272-.188","len":0.3125,"parent":null,"at":0}]}};

/* ---- src/script-draw.js ---- */
/* Script lettering (.text-style-script) writes itself on when it scrolls into view, from the stroke paths in script-draw-paths.js. */
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
    var ease = function (t) { return 1 - Math.pow(1 - t, 3); }; // quick start, long soft finish (cubic out)
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
    window.__scriptDrawReady = true; // the head part (script-draw-early.js) leaves the rest to us
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
      if (host.__draw) return;
      if (host.__held) host.style.color = ''; // held by the head part: read the real color first
      var data = pathsFor(host);
      if (!data) return; // nothing to write on: it just shows
      host.__draw = data;
      host.__color = getComputedStyle(host).color;
      host.style.color = 'transparent'; // hidden until it writes on; layout untouched
      io.observe(host);
    });
  }
  if (document.readyState === 'loading') document.addEventListener('DOMContentLoaded', init); else init();
})();

/* ---- src/parallax.js ---- */
/* Parallax: [vci-parallax="true"] (bound to a component's Parallax prop) (Webflow writes "True"/"False", so the match ignores case) holds a photo that drifts down
   slower than the page as its section scrolls away. The room for the drift is built in Webflow: the
   image is taller than its frame and starts shifted up (home-hero_image: height 115%, top -15%), so
   RATE must stay at or under that 15%. vci-parallax-rate overrides it (0–1). Off under reduced motion. */
(function () {
  if (window.matchMedia && matchMedia('(prefers-reduced-motion: reduce)').matches) return;
  var RATE = 0.15;
  var items = Array.prototype.map.call(document.querySelectorAll('[vci-parallax="true" i]'), function (el) {
    var media = el.querySelector('img, picture, video');
    var rate = parseFloat(el.getAttribute('vci-parallax-rate'));
    return media && { el: el, media: media, rate: isNaN(rate) ? RATE : Math.min(Math.max(rate, 0), 1) };
  }).filter(Boolean);
  if (!items.length) return;

  var queued = false;
  function update() {
    queued = false;
    var vh = innerHeight;
    items.forEach(function (it) {
      var r = it.el.getBoundingClientRect();
      if (r.bottom < 0 || r.top > vh) return; // off screen: leave it where it is
      var y = Math.min(Math.max(-r.top, 0), r.height) * it.rate;
      it.media.style.transform = 'translate3d(0,' + y.toFixed(1) + 'px,0)';
    });
  }
  function queue() { if (!queued) { queued = true; requestAnimationFrame(update); } }
  items.forEach(function (it) { it.media.style.willChange = 'transform'; });
  addEventListener('scroll', queue, { passive: true });
  addEventListener('resize', queue);
  update();
})();

/* ---- src/history.js ---- */
/* History timeline (/history). Built in Webflow from the History collection:
   section_history[vci-history="section"] > history_sticky > history_track[vci-history="track"] holding an
   intro panel (history_item.is-intro) and the Collection List (history_list-wrapper and history_list are
   display: contents, so each history_item[vci-history-layout bound to "Panel layout"] is a panel in the
   track), plus history_hint[vci-history="hint"] with history_progress-bar[vci-history="progress"].
   - Panel layout: each item and its history_* parts get the combo is-<layout> (is-image-left,
     is-full-image), so every layout is styled in the style panel. "Image right" is the default look.
   - Photos left empty in the CMS: their history_image-wrapper gets is-empty (display none in Webflow).
   - 768px and wider: the section is made tall enough that scrolling down moves the track sideways
     through the sticky full-screen frame; the progress bar fills and the "Scroll to continue" hint
     gets is-done at the end. Narrower: the panels stack (styled in Webflow), nothing is set here.
   - Smooth scroll: when the page loads Lenis (History page footer code), it is started here.
     Off under reduced motion; touch keeps native scrolling. */
(function () {
  var section = document.querySelector('[vci-history="section"]');
  if (!section) return;
  var each = function (list, fn) { Array.prototype.forEach.call(list, fn); };
  var reduce = matchMedia('(prefers-reduced-motion: reduce)').matches;

  if (window.Lenis && !reduce && !window.__lenis) window.__lenis = new window.Lenis({ autoRaf: true, lerp: 0.09 });

  each(section.querySelectorAll('[vci-history-layout]'), function (item) {
    var v = (item.getAttribute('vci-history-layout') || '').trim().toLowerCase().replace(/[^a-z0-9]+/g, '-');
    if (!v || v === 'image-right') return;
    var cls = 'is-' + v;
    item.classList.add(cls);
    each(item.querySelectorAll('[class*="history_"]'), function (el) { el.classList.add(cls); });
  });
  each(section.querySelectorAll('.history_image-wrapper'), function (w) {
    var img = w.querySelector('img');
    if (!img || img.classList.contains('w-dyn-bind-empty') || !img.getAttribute('src')) w.classList.add('is-empty');
  });

  var track = section.querySelector('[vci-history="track"]');
  var bar = section.querySelector('[vci-history="progress"]');
  var hint = section.querySelector('[vci-history="hint"]');
  var frame = track && track.closest('.history_sticky');
  if (!track || !frame) return;
  var wide = matchMedia('(min-width: 768px)'), dist = 0, queued = false;

  function measure() {
    if (!wide.matches) {
      section.style.height = track.style.transform = '';
      if (bar) bar.style.transform = '';
      dist = 0;
      return;
    }
    dist = Math.max(0, track.scrollWidth - frame.clientWidth);
    section.style.height = frame.offsetHeight + dist + 'px';
    update();
  }
  function update() {
    queued = false;
    if (!dist) return;
    var p = Math.min(Math.max(-section.getBoundingClientRect().top / dist, 0), 1);
    track.style.transform = 'translate3d(' + (-p * dist).toFixed(1) + 'px,0,0)';
    if (bar) bar.style.transform = 'scaleX(' + p.toFixed(4) + ')';
    if (hint) hint.classList.toggle('is-done', p > 0.97);
  }
  function queue() { if (!queued) { queued = true; requestAnimationFrame(update); } }

  addEventListener('scroll', queue, { passive: true });
  addEventListener('resize', measure);
  if (wide.addEventListener) wide.addEventListener('change', measure);
  if (window.ResizeObserver) new ResizeObserver(measure).observe(track); // images loading change its width
  measure();
})();

/* ---- src/reveal.js ---- */
/* Entrances: cards, headings, text, media fade and rise in once, in reading order: on page load for
   what is already on screen (held from the first paint by reveal-early.js), on scroll for the rest.
   vci-reveal="false" opts out; vci-reveal opts in; vci-reveal-delay / -duration or --reveal-delay / --reveal-duration tune timing. */
(function () {
  if (!window.IntersectionObserver || !Element.prototype.animate) return;
  if (window.matchMedia && matchMedia('(prefers-reduced-motion: reduce)').matches) return;

  // Matches come back in document order, so a card is always seen before its contents, which are
  // then skipped as nested: the card moves as one piece.
  var CARDS = '.w-dyn-item,[class$="_card"],[class*="_card "],[class*="-card"],[class$="_item"],[class*="_item "]';
  var DEFAULTS = CARDS + ',h1,h2,h3,h4,h5,h6,p,blockquote,img,picture,video,figure,.button,.w-button';
  var SKIP = 'nav,header,[role="dialog"],.w-nav,.w-dropdown,.nav_component,.text-style-script,[data-w-id]';
  var EASE = 'cubic-bezier(.2,.7,.2,1)', RISE = '0 1rem', STAGGER = 70, MAX_STAGGER = 5;
  var DURATION = 600;
  // Page load: whatever is on screen enters in reading order. Media only fades (a full-bleed
  // background image that rises would open a gap at its edge).
  var MEDIA = 'img,picture,video', LOAD_DELAY = 80, LOAD_STAGGER = 90, LOAD_MAX = 8, LOAD_MEDIA = 1000;

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
    var vh = innerHeight, onLoad = [], waiting = [];
    targets.forEach(function (el) {
      var r = el.getBoundingClientRect();
      if (!r.width || !r.height) return; // not rendered: leave alone
      (r.top < vh && r.bottom > 0 ? onLoad : waiting).push(el);
    });

    // On screen at load: enter now, in reading order. Only when the head part held them
    // (reveal-early.js), otherwise they've already been painted and an entrance would flash.
    var early = window.__revealHeld;
    window.__revealReady = true;
    if (early) {
      onLoad.forEach(function (el, k) {
        var media = el.matches(MEDIA);
        el.animate(media ? [{ opacity: 0 }, { opacity: 1 }] : [{ opacity: 0, translate: RISE }, { opacity: 1, translate: '0 0' }], {
          duration: num(el, 'duration', media ? LOAD_MEDIA : DURATION),
          delay: num(el, 'delay', 0) + LOAD_DELAY + Math.min(k, LOAD_MAX) * LOAD_STAGGER,
          easing: EASE,
          fill: 'backwards'
        });
      });
      // Everything the head part held: hand back to the animation (or simply show it).
      early.forEach(function (el) { el.style.opacity = ''; });
    }
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
