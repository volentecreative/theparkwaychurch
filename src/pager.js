/* Previous / next links at the end of an article. Why custom code: Webflow has no "previous / next
   item" binding, so the template carries a hidden list of every article (newest first) and this
   finds the current one in it.

   In Webflow (Articles template):
     [vci-pager="nav"]    the wrapper (class article_pager)
     [vci-pager="prev"]   link to the older article; [vci-pager="next"] link to the newer one,
                          each with a [vci-pager="title"] inside
     [vci-pager="list"]   hidden Collection List of all articles sorted by date, newest first,
                          each item holding one link (bound to Page link) with the title inside
   A side with nothing to link to is removed; with neither, the whole nav goes. */
(function () {
  var nav = document.querySelector('[vci-pager="nav"]');
  var list = nav && document.querySelector('[vci-pager="list"]');
  if (!nav || !list) return;
  var norm = function (p) { return (p || '').replace(/\/+$/, '').toLowerCase(); };
  var here = norm(location.pathname);
  var links = Array.prototype.filter.call(list.querySelectorAll('a[href]'), function (a) {
    return a.getAttribute('href') && a.getAttribute('href') !== '#';
  });
  var i = -1;
  links.forEach(function (a, n) { if (norm(new URL(a.href, location.href).pathname) === here) i = n; });
  function fill(role, a) {
    var el = nav.querySelector('[vci-pager="' + role + '"]');
    if (!el) return;
    if (!a) { el.remove(); return; }
    el.setAttribute('href', a.getAttribute('href'));
    var t = el.querySelector('[vci-pager="title"]');
    if (t) t.textContent = a.textContent.trim();
  }
  fill('prev', i >= 0 ? links[i + 1] : null); // older
  fill('next', i > 0 ? links[i - 1] : null);  // newer
  list.remove();
  if (!nav.querySelector('[vci-pager="prev"], [vci-pager="next"]')) nav.remove();
})();
