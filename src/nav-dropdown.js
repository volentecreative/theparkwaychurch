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
 *   .nav_dropdown-highlight  authored inside each list; one per dropdown, shared by its tab and its links
 *                            and glided between them (.is-active, .is-instant; links get .is-glide while
 *                            it runs). Moved into .nav_links on desktop so it sits behind the tab label.
 *   .nav_links-highlight     inside .nav_links: the highlight for plain top-level .nav_link tabs (no
 *                            dropdown); .is-active shown, .is-instant no glide. Sized from the links' padding.
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
        // A tab can light up before its list takes the panel (safe triangle); keep that.
        if (l !== active && hovered !== l) hovers[i].clear();
        else hovers[i].refresh();
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
