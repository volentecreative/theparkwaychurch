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
