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
  var line = track.querySelector('[vci-history="line"]');
  var path = line && line.querySelector('path:not([vci-history])');
  // Progress stroke: a second path (brand green) on the same line, drawn up to the middle of the screen.
  var prog = line && line.querySelector('[vci-history="line-progress"]');
  var progLen = 0, progXs = [], SAMPLES = 400;

  // The timeline line: the Webflow-built svg[vci-history="line"] behind the panels gets a path through
  // every year dot. Where the next dot sits higher or lower (panels whose text is set lower), the line
  // turns 90° at the boundary between the panels and 90° again into the dot, with rounded corners.
  // Once drawn, the track's straight stand-in line (its background, what the Designer shows) is
  // switched off with .is-drawn.
  function drawLine() {
    if (!path) return;
    if (!wide.matches) { track.classList.remove('is-drawn'); return; }
    var t = track.getBoundingClientRect(), R = 24, cy = null, d = '';
    each(track.querySelectorAll('.history_dot'), function (dot) {
      var r = dot.getBoundingClientRect();
      if (!r.width) return;
      var panel = dot.closest('.history_item').getBoundingClientRect();
      var x = r.left + r.width / 2 - t.left, y = r.top + r.height / 2 - t.top, edge = panel.left - t.left;
      if (cy === null) { d = 'M0 ' + y.toFixed(1); }
      else if (Math.abs(y - cy) > 1) {
        var s = y > cy ? 1 : -1, k = Math.min(R, Math.abs(y - cy) / 2);
        d += ' L' + (edge - k).toFixed(1) + ' ' + cy.toFixed(1) +
          ' Q' + edge.toFixed(1) + ' ' + cy.toFixed(1) + ' ' + edge.toFixed(1) + ' ' + (cy + s * k).toFixed(1) +
          ' L' + edge.toFixed(1) + ' ' + (y - s * k).toFixed(1) +
          ' Q' + edge.toFixed(1) + ' ' + y.toFixed(1) + ' ' + (edge + k).toFixed(1) + ' ' + y.toFixed(1);
      }
      d += ' L' + x.toFixed(1) + ' ' + y.toFixed(1);
      cy = y;
    });
    if (cy === null) return;
    d += ' L' + t.width.toFixed(1) + ' ' + cy.toFixed(1);
    path.setAttribute('d', d);
    track.classList.add('is-drawn');
    if (prog) {
      prog.setAttribute('d', d);
      progLen = prog.getTotalLength();
      progXs = [];
      for (var i = 0; i <= SAMPLES; i++) progXs.push(prog.getPointAtLength(progLen * i / SAMPLES).x);
      prog.style.strokeDasharray = progLen + ' ' + progLen;
      progress(0);
    }
  }
  // Length along the line where it reaches x (the line only moves right, so x rises with length).
  function progress(x) {
    if (!prog || !progLen) return;
    var lo = 0, hi = SAMPLES;
    while (lo < hi) { var mid = (lo + hi) >> 1; if (progXs[mid] < x) lo = mid + 1; else hi = mid; }
    prog.style.strokeDashoffset = (progLen - progLen * lo / SAMPLES).toFixed(1);
  }

  function measure() {
    if (!wide.matches) {
      section.style.height = track.style.transform = '';
      if (bar) bar.style.transform = '';
      dist = 0;
      drawLine();
      return;
    }
    dist = Math.max(0, track.scrollWidth - frame.clientWidth);
    section.style.height = frame.offsetHeight + dist + 'px';
    drawLine();
    update();
  }
  function update() {
    queued = false;
    if (!dist) return;
    var p = Math.min(Math.max(-section.getBoundingClientRect().top / dist, 0), 1);
    track.style.transform = 'translate3d(' + (-p * dist).toFixed(1) + 'px,0,0)';
    if (bar) bar.style.transform = 'scaleX(' + p.toFixed(4) + ')';
    if (hint) hint.classList.toggle('is-done', p > 0.97);
    progress(p * dist + frame.clientWidth / 2);
  }
  function queue() { if (!queued) { queued = true; requestAnimationFrame(update); } }

  addEventListener('scroll', queue, { passive: true });
  addEventListener('resize', measure);
  if (wide.addEventListener) wide.addEventListener('change', measure);
  if (window.ResizeObserver) new ResizeObserver(measure).observe(track); // images loading change its width
  measure();
})();
