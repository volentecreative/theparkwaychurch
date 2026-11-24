/* Finsweet filter bar: [vci-filters="count"] shows how many options are checked in its dropdown (toggle gets .is-active);
   [vci-filters="active"] (Finsweet tags + Clear all) is .is-empty while no filter is applied. Runs once Finsweet List is ready. */
(function () {
  var row = document.querySelector('[vci-filters="active"]');
  var form = row && row.closest('[fs-list-element="filters"]');
  if (!form) return;
  function update() {
    Array.prototype.forEach.call(form.querySelectorAll('.w-dropdown'), function (dd) {
      var count = dd.querySelector('[vci-filters="count"]');
      if (!count) return;
      var n = dd.querySelectorAll('input:checked').length;
      count.textContent = n;
      count.classList.toggle('is-empty', !n);
      dd.querySelector('.w-dropdown-toggle').classList.toggle('is-active', !!n);
    });
    var active = form.querySelector('[vci-filters="active"]'); // Finsweet re-renders this row, so look it up each time
    if (active) active.classList.toggle('is-empty', !active.querySelector('[fs-list-element="tag-remove"]'));
  }
  window.FinsweetAttributes = window.FinsweetAttributes || [];
  window.FinsweetAttributes.push(['list', function () {
    form.addEventListener('change', update);
    form.addEventListener('input', update);
    new MutationObserver(update).observe(form, { childList: true, subtree: true });
    update();
  }]);
})();
