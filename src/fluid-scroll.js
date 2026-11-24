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
