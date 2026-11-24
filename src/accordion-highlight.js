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
