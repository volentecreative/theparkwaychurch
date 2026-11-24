/* Finsweet filter bar: [vci-filters="count"] shows how many options are checked in its dropdown (its toggle gets .is-active).
   The active-filter tags row needs nothing here: Finsweet only puts it in the page while a filter is applied. */
(function () {
  var form = document.querySelector('[fs-list-element="filters"]');
  if (!form || !form.querySelector('[vci-filters="count"]')) return;
  function update() {
    Array.prototype.forEach.call(form.querySelectorAll('.w-dropdown'), function (dd) {
      var count = dd.querySelector('[vci-filters="count"]');
      if (!count) return;
      var n = dd.querySelectorAll('input:checked').length;
      if (count.textContent !== String(n)) count.textContent = n;
      count.classList.toggle('is-empty', !n);
      dd.querySelector('.w-dropdown-toggle').classList.toggle('is-active', !!n);
    });
  }
  window.FinsweetAttributes = window.FinsweetAttributes || [];
  window.FinsweetAttributes.push(['list', function (lists) {
    // Runs after every filter pass, including tag removal and Clear all.
    (lists || []).forEach(function (l) { if (l.addHook) l.addHook('filter', function (items) { setTimeout(update); return items; }); });
    form.addEventListener('change', update);
    update();
  }]);
})();
