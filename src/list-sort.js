/* Sort dropdown for a Finsweet list: [vci-sort="dropdown"] is a Webflow dropdown styled like the filter dropdowns
   (so it opens below the toggle, unlike a native select), holding radio options [vci-sort="option"] and a toggle
   label [vci-sort="label"]. Finsweet still sorts from the hidden select[fs-list-element="sort-trigger"] in the same
   form: option n picks the select's option n. A sort in the URL (sort_date=asc) is shown on load.
   Choosing with the mouse closes the dropdown; arrow keys move through the options and leave it open. */
(function () {
  Array.prototype.forEach.call(document.querySelectorAll('[vci-sort="dropdown"]'), function (dd) {
    var scope = dd.closest('[fs-list-element="filters"]') || document;
    var select = scope.querySelector('select[fs-list-element="sort-trigger"]');
    var radios = Array.prototype.slice.call(dd.querySelectorAll('input[vci-sort="option"]'));
    var label = dd.querySelector('[vci-sort="label"]');
    if (!select || !radios.length) return;
    var pointer = false;

    function text(radio) {
      var l = radio.closest('label');
      return l ? l.textContent.trim() : '';
    }
    function show() { // the select's current value → checked radio + toggle label
      var i = select.selectedIndex < 0 ? 0 : select.selectedIndex;
      var r = radios[i] || radios[0];
      r.checked = true;
      if (label) label.textContent = text(r);
    }
    function close() {
      if (window.jQuery) window.jQuery(dd).triggerHandler('w-close.w-dropdown');
      else { var t = dd.querySelector('.w-dropdown-toggle'); if (t && t.classList.contains('w--open')) t.click(); }
    }

    dd.addEventListener('pointerdown', function () { pointer = true; });
    dd.addEventListener('keydown', function () { pointer = false; });
    radios.forEach(function (r, i) {
      r.addEventListener('change', function () {
        if (!r.checked || !select.options[i]) return;
        select.value = select.options[i].value;
        select.dispatchEvent(new Event('input', { bubbles: true }));
        select.dispatchEvent(new Event('change', { bubbles: true }));
        if (label) label.textContent = text(r);
        if (pointer) close();
      });
    });
    select.addEventListener('change', show);
    // A sort in the URL (sort_date=asc): Finsweet applies it but leaves the select alone, so match the select
    // option "date-asc" to it here (without a change event: the list is already sorted that way).
    new URLSearchParams(location.search).forEach(function (dir, key) {
      var m = key.match(/^sort_(.+)$/);
      if (!m) return;
      var v = m[1] + '-' + dir.toLowerCase();
      if (select.querySelector('option[value="' + v + '"]')) select.value = v;
    });
    show();
  });
})();
