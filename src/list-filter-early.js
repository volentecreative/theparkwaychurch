/* Head: a Finsweet list opened with a filter in the URL (e.g. the nav's /media?type_equal=["Sermon"]).
   Finsweet only filters after it has fetched every page of the list, so on its own the page first shows
   every item, then strips the ones that don't match.
   - Equals filters (field_equal=[...]): while the page is parsed, items on the first page whose
     [fs-list-field="field"] value isn't in the list are hidden, so the right items show straight away;
     Finsweet then fills in the rest. Anything else (search text, ranges): the whole list is held
     invisible until Finsweet has rendered it filtered.
   - [vci-list="loading"] (built in Webflow, hidden by default) gets .is-active until Finsweet is done.
   Done = every page loaded and the next render, or 400ms after loading. Safety: 2.5s after page load.
   No filter in the URL: nothing happens. */
(function () {
  if (!window.MutationObserver) return;
  var params = new URLSearchParams(location.search), equals = {}, other = false;
  params.forEach(function (value, key) {
    var m = key.match(/^(?!sort_)([a-z0-9-]+)_(equal|not-equal|contains|not-contains|start|end|greater|greater-equal|less|less-equal|empty|not-empty)$/i);
    if (!m) return;
    if (m[2].toLowerCase() !== 'equal') { other = true; return; }
    var vals;
    try { vals = JSON.parse(value); } catch (e) { vals = [value]; }
    equals[m[1]] = [].concat(vals).map(function (v) { return String(v).trim().toLowerCase(); });
  });
  var fields = Object.keys(equals);
  if (!fields.length && !other) return;

  var list = null, hidden = [], loaders = [], done = false;
  // true / false, or null while an item's field values haven't been parsed yet.
  function matches(item) {
    var known = true;
    var ok = fields.every(function (f) {
      var els = item.querySelectorAll('[fs-list-field="' + f + '"]');
      var vals = Array.prototype.map.call(els, function (el) { return el.textContent.trim().toLowerCase(); }).filter(Boolean);
      if (!vals.length) { known = false; return true; }
      return vals.some(function (v) { return equals[f].indexOf(v) > -1; });
    });
    return ok ? (known ? true : null) : false;
  }
  function check(item) {
    if (other || !item || item.nodeType !== 1 || item.parentNode !== list || item.__fsChecked) return;
    var m = matches(item);
    if (m === null) return; // try again when more of it has arrived
    item.__fsChecked = true;
    if (!m) { item.style.display = 'none'; hidden.push(item); }
  }
  // Items hidden here get their style back only once Finsweet has taken them out of the list (that is
  // Finsweet applying the filter), so they can never flash; if the filter is later cleared, Finsweet
  // puts them back clean. When the last one has gone, the list is filtered: done.
  var watch = null;
  function watchList() {
    if (watch || !list || other) return;
    watch = new MutationObserver(function (records) {
      records.forEach(function (r) {
        Array.prototype.forEach.call(r.removedNodes, function (n) {
          var i = hidden.indexOf(n);
          if (i > -1) { n.style.display = ''; hidden.splice(i, 1); }
        });
      });
      if (!hidden.length) { watch.disconnect(); release(); }
    });
    watch.observe(list, { childList: true });
  }
  function release() {
    if (done) return;
    done = true;
    mo.disconnect();
    loaders.forEach(function (l) { l.classList.remove('is-active'); });
    if (list && other) { list.style.transition = 'opacity 200ms ease'; list.style.opacity = ''; }
  }
  var mo = new MutationObserver(function (records) {
    records.forEach(function (r) {
      Array.prototype.forEach.call(r.addedNodes, function (n) {
        if (n.nodeType === 3) { // a field's text arriving after the field element
          if (list && !other && n.parentElement && list.contains(n.parentElement)) check(n.parentElement.closest('[fs-list-element="list"] > *'));
          return;
        }
        if (n.nodeType !== 1) return;
        var ld = n.matches('[vci-list="loading"]') ? [n] : n.querySelectorAll('[vci-list="loading"]');
        Array.prototype.forEach.call(ld, function (l) { l.classList.add('is-active'); loaders.push(l); });
        if (!list) {
          list = n.matches('[fs-list-element="list"]') ? n : n.querySelector('[fs-list-element="list"]');
          if (list && other) list.style.opacity = '0';
          if (list) { Array.prototype.forEach.call(list.children, check); watchList(); }
        } else if (n.parentNode === list) check(n);
        else if (list.contains(n)) check(n.closest('[fs-list-element="list"] > *'));
      });
    });
  });
  mo.observe(document.documentElement, { childList: true, subtree: true });
  document.addEventListener('DOMContentLoaded', function () {
    if (list) { Array.prototype.forEach.call(list.children, check); watchList(); } // anything still undecided
  });

  window.FinsweetAttributes = window.FinsweetAttributes || [];
  window.FinsweetAttributes.push(['list', function (lists) {
    (lists || []).forEach(function (l) {
      if (!l.addHook) return release();
      var ready = false;
      // Search-text and other filters: show once rendered after loading. Equals filters with items
      // hidden here finish in watchList() instead; with none hidden, this ends them too.
      l.addHook('render', function (items) {
        if (ready && (other || !hidden.length)) requestAnimationFrame(release);
        return items;
      });
      Promise.resolve(l.loadingPaginatedItems).then(function () {
        ready = true;
        setTimeout(function () { if (other || !hidden.length) release(); }, 400);
      });
    });
    if (!lists || !lists.length) release();
  }]);
  addEventListener('load', function () { setTimeout(release, 2500); });
})();
