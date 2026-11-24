/* Announcement bar [vci-announcement="bar"] inside the sticky nav: --announcement-height = its height (the nav's negative sticky top), removed with 0 when empty. */
(function () {
  var bar = document.querySelector('[vci-announcement="bar"]');
  var root = document.documentElement.style;
  var item = bar && bar.querySelector('.w-dyn-item');
  if (!item || !item.textContent.trim()) {
    if (bar) bar.remove();
    root.setProperty('--announcement-height', '0px');
    return;
  }
  function measure() { root.setProperty('--announcement-height', bar.offsetHeight + 'px'); }
  measure();
  addEventListener('resize', measure);
})();
