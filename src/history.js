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
