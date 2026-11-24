/* Announcement bar at the very top of every page, above the nav pill (CMS: Announcements, newest
   one shows). Why custom code: the content offset has to know how tall the bar is, and the bar has
   to stay away once the header starts pinning.

   In Webflow (navbar component): the Collection List [vci-announcement="bar"], class
   announcement-bar, sits in the nav above the pill. It isn't animated: scrolling down, it scrolls
   off with the header like part of the page. Scrolling back up, the header pins at the top on its
   own (nav-scroll.js) and the bar stays out of it (.announcement-bar.is-retracted = display none)
   until the page is back at the very top, where it is in its place again.
   Also sets --announcement-height on <html> (0 with no announcement), which the nav-offset
   variable adds, so page content starts below bar + pill. */
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
