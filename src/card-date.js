/* [vci-date="short"]: shortens a card date. Within 12 months of today it's "Nov 18"; further out it keeps the year,
   "Nov 18, 2024". Reads whatever Webflow printed ("November 18, 2026", "Nov 18, 2026"...); no script: the full date. */
(function () {
  var MONTHS = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'];
  var now = new Date();
  var from = new Date(now.getFullYear() - 1, now.getMonth(), now.getDate());
  var to = new Date(now.getFullYear() + 1, now.getMonth(), now.getDate());
  function run(root) {
    Array.prototype.forEach.call(root.querySelectorAll('[vci-date="short"]:not([vci-date-done])'), function (el) {
      el.setAttribute('vci-date-done', '');
      var m = el.textContent.trim().match(/^([A-Za-z]{3})[A-Za-z]*\.?\s+(\d{1,2}),?\s+(\d{4})$/);
      var month = m ? MONTHS.indexOf(m[1].charAt(0).toUpperCase() + m[1].slice(1, 3).toLowerCase()) : -1;
      if (month < 0) return;
      var date = new Date(+m[3], month, +m[2]);
      el.textContent = MONTHS[month] + ' ' + +m[2] + (date >= from && date <= to ? '' : ', ' + m[3]);
    });
  }
  run(document);
  if (document.querySelector('[fs-list-element], .w-dyn-list')) { // items Finsweet loads or re-renders later
    new MutationObserver(function (records) {
      records.forEach(function (r) {
        Array.prototype.forEach.call(r.addedNodes, function (n) { if (n.nodeType === 1) run(n.parentElement || n); });
      });
    }).observe(document.body, { childList: true, subtree: true });
  }
})();
