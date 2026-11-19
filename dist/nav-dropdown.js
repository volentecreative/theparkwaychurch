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
 * Tuning lives in Webflow, as custom attributes on .nav_pill (all optional):
 *
 *   data-dropdown-travel         px the links drift when switching        (16)
 *   data-dropdown-crossfade      ms for old and new links to crossfade     (110)
 *   data-dropdown-flip           true = new links enter from the other side (false)
 *   data-dropdown-safe-triangle  false = switch tabs the instant they are touched (true)
 *   data-dropdown-pass-through   ms a tab must be hovered before it takes over, 0 = off (0)
 *
 * Expects (from the narthex nav): .nav_pill > svg.nav_pill-shape > path.nav_pill-fill
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

  function init() {
    var pill = document.querySelector('.nav_pill');
    var svg = pill && pill.querySelector('.nav_pill-shape');
    var fill = svg && svg.querySelector('.nav_pill-fill');
    var lists = pill ? Array.prototype.slice.call(pill.querySelectorAll('.nav_dropdown-list')) : [];
    // Anything missing: leave the stock dropdowns alone.
    if (!svg || !fill || !lists.length || !svg.viewBox || !window.MutationObserver) return;

    function num(key, fallback) {
      var v = parseFloat(pill.dataset[key]);
      return isFinite(v) ? v : fallback;
    }
    function flag(key, fallback) {
      var v = pill.dataset[key];
      return v === undefined || v === '' ? fallback : v !== 'false' && v !== '0';
    }
    var TRAVEL = num('dropdownTravel', 16);
    var CROSSFADE = Math.max(0, num('dropdownCrossfade', 110));
    var FLIP = flag('dropdownFlip', false);
    var SAFE = flag('dropdownSafeTriangle', true);
    var PASS_MS = Math.max(0, num('dropdownPassThrough', 0));

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
    path.setAttribute('fill', getComputedStyle(fill).fill);

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

    function release(l) {
      if (l.style.clipPath) l.style.clipPath = '';
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

      if (next && !dir) {
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
      lists.forEach(function (l) {
        var leaving = l === prev && switching;
        if (!isOpen(l) && !leaving) {
          release(l);
          return;
        }
        if (l === active && !moving) {
          // Settled: unclipped, so focus rings are not cut.
          if (l.style.clipPath) l.style.clipPath = '';
          l.style.visibility = '';
          return;
        }
        if (l !== active && !leaving) {
          // Held open by Webflow's hover delay but not part of this transition.
          l.style.visibility = 'hidden';
          if (l === prev) l.style.display = '';
          return;
        }
        // Keep the list being left on screen for the crossfade even if Webflow closes it mid-way.
        if (leaving) l.style.display = 'block';
        l.style.visibility = '';
        var r = l.getBoundingClientRect();
        var left = Math.max(0, sL - r.left).toFixed(1);
        var right = Math.max(0, r.right - sR).toFixed(1);
        var bottom = Math.max(0, r.bottom - sB).toFixed(1);
        l.style.clipPath = 'inset(0px ' + right + 'px ' + bottom + 'px ' + left + 'px round 0 0 ' + rad + 'px ' + rad + 'px)';
      });
    }

    function draw(moving) {
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
  }

  function start() {
    try {
      init();
    } catch (e) {
      // Never let this take the nav down; the stock dropdown still works.
      if (window.console) console.warn('[nav-dropdown] disabled:', e);
    }
  }

  if (document.readyState === 'loading') document.addEventListener('DOMContentLoaded', start);
  else start();
})();
