/* Article previous / next: fills [vci-pager="prev"|"next"] from the hidden date-sorted [vci-pager="list"]. */
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
