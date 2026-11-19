/*!
 * The Parkway Church — connected nav dropdowns
 *
 * Draws the open dropdown as part of the nav pill (one shape, concave corners
 * where it meets the pill) and slides it between dropdowns.
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
 * Expects (from the narthex nav): .nav_pill > svg.nav_pill-shape > path.nav_pill-fill
 */
(function () {
  'use strict';

  var SLIDE = 0.22; // seconds for the shape to settle on a new dropdown
  var OPEN_IN = 280; // ms, links easing in on a fresh open
  var SWAP_OUT = 50; // ms, old links fading out when switching dropdowns
  var SWAP_IN = 90; // ms, new links fading in once the old ones are gone
  var EASE = 'cubic-bezier(.2,.7,.2,1)';
  var HOVER_MS = 180; // ms for the link highlight to glide to the next link
  var HOVER_TINT = 'var(--brand--brand-100)'; // same tint as nav_dropdown-link:hover

  function init() {
    var pill = document.querySelector('.nav_pill');
    var svg = pill && pill.querySelector('.nav_pill-shape');
    var fill = svg && svg.querySelector('.nav_pill-fill');
    var lists = pill ? Array.prototype.slice.call(pill.querySelectorAll('.nav_dropdown-list')) : [];
    // Anything missing: leave the stock dropdowns alone.
    if (!svg || !fill || !lists.length || !svg.viewBox || !window.MutationObserver) return;

    var icons = lists.map(function (l) {
      return l.parentElement.querySelector('.nav_dropdown-icon');
    });
    var reduce = window.matchMedia('(prefers-reduced-motion: reduce)');

    var path = document.createElementNS('http://www.w3.org/2000/svg', 'path');
    path.setAttribute('class', 'nav_pill-drop');
    path.setAttribute('fill', getComputedStyle(fill).fill);

    var cur = { x0: 0, x1: 0, h: 0 };
    var tgt = { x0: 0, x1: 0, h: 0 };
    var raf = 0;
    var last = 0;
    var active = null;
    var sig = '';
    var radius = 20;
    var running = []; // link animations in flight
    var hint = null; // dropdown the pointer just entered
    var hovers = []; // one gliding highlight per list

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

    // Fluid hover: one highlight per list that glides from link to link
    // instead of each link's own :hover background blinking on and off.
    // Uses a .nav_dropdown-highlight element inside the list if Webflow has
    // one; otherwise makes its own from the link's radius and the brand tint.
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
        if (engaged && e.pointerType === 'mouse' && list === active) show(nearest(e.clientY));
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
        el: hl,
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

    function animateLinks(list, dir, entering) {
      if (reduce.matches || !list.animate) return;
      // Switching dropdowns fades through zero: the old links are gone before
      // the new ones start, while the panel slides and resizes underneath.
      // A fresh open (dir 0) has nothing to wait for, so it eases in.
      var frames = entering
        ? [{ opacity: 0, transform: dir ? 'none' : 'translateY(-4px)' }, { opacity: 1, transform: 'none' }]
        : [{ opacity: 1 }, { opacity: 0 }];
      var timing = entering
        ? dir
          ? { duration: SWAP_IN, delay: SWAP_OUT, easing: 'ease-out', fill: 'backwards' }
          : { duration: OPEN_IN, easing: EASE, fill: 'backwards' }
        : { duration: SWAP_OUT, easing: 'ease-in', fill: 'forwards' };
      Array.prototype.forEach.call(list.children, function (el) {
        if (el.classList.contains('nav_dropdown-highlight')) return;
        running.push(el.animate(frames, timing));
      });
    }

    function sync() {
      var on = enabled();
      var open = lists.map(function (l) {
        return on && isOpen(l);
      });
      var nextSig = on + ':' + open.join();
      if (nextSig === sig) return; // our own class writes land here and stop
      var prev = sig ? sig.split(':')[1].split(',') : [];
      sig = nextSig;

      var next = active && open[lists.indexOf(active)] ? active : null;
      lists.forEach(function (l, i) {
        if (open[i] && prev[i] !== 'true') next = l; // newest-opened wins
      });
      if (!next) next = lists[open.indexOf(true)] || null;
      // Pointer went back to a list that never closed (A, B, back to A inside the hover delay).
      if (hint && open[lists.indexOf(hint)]) next = hint;
      hint = null;

      if (next !== active) {
        var dir = active && next ? (lists.indexOf(next) > lists.indexOf(active) ? 1 : -1) : 0;
        running.forEach(function (a) {
          a.cancel();
        });
        running = [];
        if (active && isOpen(active)) animateLinks(active, dir, false);
        if (next) animateLinks(next, dir, true);
        active = next;
      }

      lists.forEach(function (l, i) {
        var leaving = open[i] && l !== active;
        setClass(l, 'is-connected', on);
        setClass(l, 'is-leaving', leaving);
        setClass(icons[i], 'is-open', l === active);
        l.style.pointerEvents = leaving ? 'none' : '';
        hovers[i].engage(on);
        if (l !== active) hovers[i].clear();
      });
      measure();
    }

    function measure() {
      if (!enabled()) {
        lists.forEach(function (l) {
          l.style.top = '';
          l.style.clipPath = '';
        });
        cur.h = tgt.h = 0;
        path.setAttribute('d', '');
        return;
      }
      var p = pill.getBoundingClientRect();
      lists.forEach(function (l) {
        // Butt the list against the pill's bottom edge.
        l.style.top = p.bottom - l.parentElement.getBoundingClientRect().top + 'px';
      });
      if (active) {
        var r = active.getBoundingClientRect();
        radius = parseFloat(getComputedStyle(active).borderBottomLeftRadius) || radius;
        tgt.x0 = r.left - p.left;
        tgt.x1 = r.right - p.left;
        tgt.h = r.height;
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

    // Clip open lists to the shape as it is right now, so links never show
    // outside it mid-slide. Cleared once settled so focus rings are not cut.
    function clip(moving) {
      var p = pill.getBoundingClientRect();
      var sL = p.left + cur.x0;
      var sR = p.left + cur.x1;
      var sB = p.bottom + cur.h;
      var rad = Math.min(radius, cur.h / 2).toFixed(1);
      lists.forEach(function (l) {
        if (!isOpen(l) || (!moving && l === active)) {
          if (l.style.clipPath) l.style.clipPath = '';
          return;
        }
        var r = l.getBoundingClientRect();
        var left = Math.max(0, sL - r.left).toFixed(1);
        var right = Math.max(0, r.right - sR).toFixed(1);
        var bottom = Math.max(0, r.bottom - sB).toFixed(1);
        l.style.clipPath = 'inset(0px ' + right + 'px ' + bottom + 'px ' + left + 'px round 0 0 ' + rad + 'px ' + rad + 'px)';
      });
    }

    function draw(moving) {
      if (path.parentNode !== svg) svg.appendChild(path);
      clip(moving);
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

    hovers = lists.map(fluidHover);

    var mo = new MutationObserver(sync);
    lists.forEach(function (l) {
      mo.observe(l, { attributes: true, attributeFilter: ['class'] });
      l.parentElement.addEventListener('pointerenter', function () {
        if (l === active || !isOpen(l)) return;
        hint = l;
        sig = '';
        sync();
      });
    });
    var relayout = function () {
      sync();
      measure();
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
