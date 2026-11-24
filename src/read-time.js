/* "X min read", worked out from the words in the text itself. Why custom code: Webflow has no
   word count, and a CMS field for it would be something editors could get wrong or forget.

   In Webflow, inside one card or one article:
     [vci-read-time="source"]  the text to count (the article Body; hidden on cards)
     [vci-read-time="value"]   gets "X min read"
     [vci-read-time="wrap"]    optional; holds the value and its separator, removed when there is
                               nothing to count (a media card, which has no Body)
   Each value is matched to the nearest source around it, so many cards on one page each count
   their own article. Cards added later (infinite scroll, filtering) are handled as they arrive.
   225 words a minute, rounded, never less than 1. */
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
