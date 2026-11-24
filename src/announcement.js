/* Announcement bar [vci-announcement="bar"]: sets --announcement-height for the content offset; hidden (.is-retracted) once the header pins, back at the top. */
(function () {
  var bar = document.querySelector('[vci-announcement="bar"]');
  var root = document.documentElement;
  var item = bar && bar.querySelector('.w-dyn-item');
  if (!bar || !item || !item.textContent.trim()) {
    if (bar) bar.remove();
    root.style.setProperty('--announcement-height', '0px');
    return;
  }
  var nav = bar.closest('.nav_component');
  var away = false;
  function set(v) { if (v !== away) { away = v; bar.classList.toggle('is-retracted', v); } }
  function measure() { if (!away) root.style.setProperty('--announcement-height', bar.offsetHeight + 'px'); }
  measure();
  addEventListener('resize', measure);
  // Out as soon as the header pins; back only at the top of the page.
  if (nav) new MutationObserver(function () {
    if (nav.classList.contains('is-pinned')) set(true);
  }).observe(nav, { attributes: true, attributeFilter: ['class'] });
  addEventListener('scroll', function () { if (window.scrollY <= 0) set(false); }, { passive: true });
  if (nav && nav.classList.contains('is-pinned')) set(true);
})();
