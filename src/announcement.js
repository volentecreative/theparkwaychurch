/* Announcement bar at the very top of every page, above the nav pill (CMS: Announcements, newest
   one shows). Why custom code: CSS can't tell that the page has been scrolled, and the content
   offset has to know how tall the bar is.

   In Webflow (navbar component): the Collection List [vci-announcement="bar"], class
   announcement-bar; .announcement-bar.is-retracted collapses it (style panel).
   This script only:
     - sets --announcement-height on <html> to the bar's height (0 when there is no announcement),
       which the nav-offset variable adds, so page content starts below bar + pill;
     - adds .is-retracted as soon as the page is scrolled and removes it back at the very top,
       so the bar folds away and the pill slides up to the top edge. */
(function () {
  var bar = document.querySelector('[vci-announcement="bar"]');
  var root = document.documentElement;
  var item = bar && bar.querySelector('.w-dyn-item');
  if (!bar || !item || !item.textContent.trim()) {
    if (bar) bar.remove();
    root.style.setProperty('--announcement-height', '0px');
    return;
  }
  function measure() {
    if (!bar.classList.contains('is-retracted')) root.style.setProperty('--announcement-height', bar.offsetHeight + 'px');
  }
  var retracted = false;
  function onScroll() {
    var r = window.scrollY > 8;
    if (r === retracted) return;
    retracted = r;
    bar.classList.toggle('is-retracted', r);
  }
  measure();
  onScroll();
  addEventListener('resize', measure);
  addEventListener('scroll', onScroll, { passive: true });
})();
