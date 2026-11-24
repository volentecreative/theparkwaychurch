/* "X min read" from the word count of the nearest [vci-read-time="source"] into [vci-read-time="value"]; removes [vci-read-time="wrap"] when there is nothing to count. */
(function () {
  var WPM = 225;
  function run(root) {
    Array.prototype.forEach.call(root.querySelectorAll('[vci-read-time="value"]:not([vci-read-time-done])'), function (value) {
      value.setAttribute('vci-read-time-done', '');
      var source = null;
      for (var el = value.parentElement; el && !source; el = el.parentElement) {
        source = el.querySelector('[vci-read-time="source"]');
      }
      var words = source ? (source.textContent.match(/\S+/g) || []).length : 0;
      var wrap = value.closest('[vci-read-time="wrap"]');
      if (!words) { (wrap || value).remove(); return; }
      value.textContent = Math.max(1, Math.round(words / WPM)) + ' min read';
    });
  }
  run(document);
  if (document.querySelector('[fs-list-element], .w-dyn-list')) {
    new MutationObserver(function (records) {
      records.forEach(function (r) {
        Array.prototype.forEach.call(r.addedNodes, function (n) { if (n.nodeType === 1) run(n.parentElement || n); });
      });
    }).observe(document.body, { childList: true, subtree: true });
  }
})();
