/* Sticky header: .is-hidden slides it up while scrolling down, off again scrolling up, at the top, or on focus. Closes open dropdowns as it hides. */
(function () {
  var nav = document.querySelector('.nav_component');
  if (!nav) return;
  if (matchMedia('(prefers-reduced-motion: reduce)').matches) nav.style.transition = 'none';
  var last = 0, travel = 0;
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
    travel = d * travel > 0 ? travel + d : d;
    if (y < nav.offsetHeight) hide(false);
    else if (travel > 6) hide(true);
    else if (travel < -6) hide(false);
  }, { passive: true });
  nav.addEventListener('focusin', function () { hide(false); });
})();
