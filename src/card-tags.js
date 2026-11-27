/* Tags on content cards (/articles). An article's tags are CMS items (Tags collection, multi-reference), and the card
   is a link component, which can't hold a nested Collection List, so the list item carries it hidden instead:
   [vci-card-tags="list"] holding one [fs-list-field="tag"] per tag (also what Finsweet filters on). Each tag is shown
   in the card's eyebrow as a copy of its .content_card-eyebrow-item, so it looks like any other eyebrow entry.
   Cards Finsweet adds later (infinite load) get theirs too. */
(function () {
  function fill(item) {
    if (!item || item.nodeType !== 1 || item.__cardTags) return;
    var src = item.querySelector('[vci-card-tags="list"]');
    var eyebrow = item.querySelector('.content_card-eyebrow-list');
    var template = eyebrow && eyebrow.querySelector('.content_card-eyebrow-item');
    if (!src || !template) return;
    item.__cardTags = true;
    Array.prototype.forEach.call(src.querySelectorAll('[fs-list-field="tag"]'), function (t) {
      var name = t.textContent.trim();
      if (!name) return;
      var el = template.cloneNode(false);
      el.textContent = name;
      el.setAttribute('vci-card-tags', 'item');
      eyebrow.appendChild(el);
    });
  }
  function scan(root) {
    Array.prototype.forEach.call((root || document).querySelectorAll('.w-dyn-item'), function (it) {
      if (it.querySelector('[vci-card-tags="list"]')) fill(it);
    });
  }
  scan();
  if (!document.querySelector('[vci-card-tags="list"]') || !window.MutationObserver) return;
  new MutationObserver(function (records) {
    records.forEach(function (r) {
      Array.prototype.forEach.call(r.addedNodes, function (n) {
        if (n.nodeType !== 1) return;
        if (n.matches('.w-dyn-item') && n.querySelector('[vci-card-tags="list"]')) fill(n);
        else if (n.querySelector) scan(n);
      });
    });
  }).observe(document.body, { childList: true, subtree: true });
})();
