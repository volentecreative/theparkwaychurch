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
  // Only a bar with a real link is a link: it gets .is-linked (hover style lives on that combo in
  // Webflow). With no link (empty field renders "#"), it loses its href and is plain text.
  var link = item.querySelector('a.announcement_link');
  if (link) {
    var href = (link.getAttribute('href') || '').trim();
    if (!href || href === '#') link.removeAttribute('href');
    else link.classList.add('is-linked');
  }
  function measure() { root.setProperty('--announcement-height', bar.offsetHeight + 'px'); }
  measure();
  addEventListener('resize', measure);
})();
