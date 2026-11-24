/* Live search in the nav's search modal, powered by Webflow's own site search (no Algolia).
   Why custom code: Webflow search only answers on its /search page; this asks that page as you
   type and shows the top results in the modal. Enter still goes to the full /search page.

   In Webflow (inside the navbar component):
     [vci-search="modal"]    the native Modal (opened by the search icon, a link set to open it)
     [vci-search="input"]    the text input, inside a form with action /search, name "query"
     [vci-search="results"]  where results go
     [vci-search="item"]     one result link, authored once as the template (class
                             search-modal_item.is-template, hidden); copies drop .is-template
       [vci-search="title"] / [vci-search="snippet"] inside it
     [vci-search="status"]   "Type to search" / result count, announced to screen readers
     [vci-search="open"]     the search icon; Cmd/Ctrl+K and "/" open the modal too
   Reads /search results marked [vci-search="result"] (falling back to Webflow's default
   .search-result-item), each with a link, and optional [vci-search="title"]/"snippet". */
(function () {
  var modal = document.querySelector('[vci-search="modal"]');
  var input = modal && modal.querySelector('[vci-search="input"]');
  var box = modal && modal.querySelector('[vci-search="results"]');
  var tpl = box && box.querySelector('[vci-search="item"]');
  if (!modal || !input || !box || !tpl) return;
  var status = modal.querySelector('[vci-search="status"]');
  var opener = document.querySelector('[vci-search="open"]');
  var MAX = 8, cache = {}, timer = 0, seq = 0;

  function say(t) { if (status) status.textContent = t; }
  function clear() {
    Array.prototype.forEach.call(box.querySelectorAll('[vci-search="item"]'), function (el) {
      if (el !== tpl) el.remove();
    });
  }
  function parse(html) {
    var doc = new DOMParser().parseFromString(html, 'text/html');
    var nodes = doc.querySelectorAll('[vci-search="result"]');
    if (!nodes.length) nodes = doc.querySelectorAll('.search-result-item');
    return Array.prototype.map.call(nodes, function (n) {
      var a = n.matches('a[href]') ? n : n.querySelector('a[href]');
      var t = n.querySelector('[vci-search="title"]') || a;
      var s = n.querySelector('[vci-search="snippet"]') || n.querySelector('p');
      return a && { href: a.getAttribute('href'), title: (t.textContent || '').trim(), snippet: s ? s.textContent.trim() : '' };
    }).filter(Boolean);
  }
  function render(q, list) {
    clear();
    list.slice(0, MAX).forEach(function (r) {
      var el = tpl.cloneNode(true);
      el.classList.remove('is-template');
      el.setAttribute('href', r.href);
      el.setAttribute('role', 'option');
      var t = el.querySelector('[vci-search="title"]'), s = el.querySelector('[vci-search="snippet"]');
      if (t) t.textContent = r.title || r.href;
      if (s) { if (r.snippet) s.textContent = r.snippet; else s.remove(); }
      box.appendChild(el);
    });
    say(list.length ? (list.length > MAX ? 'Top ' + MAX + ' of ' + list.length + ' results' : list.length + (list.length === 1 ? ' result' : ' results'))
      : 'No results for “' + q + '”');
  }
  function run() {
    var q = input.value.trim(), mine = ++seq;
    if (q.length < 2) { clear(); say('Type to search'); return; }
    if (cache[q]) { render(q, cache[q]); return; }
    say('Searching…');
    fetch('/search?query=' + encodeURIComponent(q), { credentials: 'same-origin' })
      .then(function (r) { return r.text(); })
      .then(function (html) { cache[q] = parse(html); if (mine === seq) render(q, cache[q]); })
      .catch(function () { if (mine === seq) say('Press Enter to search'); });
  }
  input.addEventListener('input', function () { clearTimeout(timer); timer = setTimeout(run, 220); });

  // Arrow keys move between the input and the results.
  modal.addEventListener('keydown', function (e) {
    if (e.key !== 'ArrowDown' && e.key !== 'ArrowUp') return;
    var items = [input].concat(Array.prototype.filter.call(box.querySelectorAll('[vci-search="item"]'), function (el) { return el !== tpl; }));
    var i = items.indexOf(document.activeElement);
    if (i < 0) return;
    e.preventDefault();
    items[Math.max(0, Math.min(items.length - 1, i + (e.key === 'ArrowDown' ? 1 : -1)))].focus();
  });

  function open() {
    if (opener) opener.click(); else if (modal.showModal) modal.showModal();
    setTimeout(function () { input.focus(); input.select(); }, 30);
  }
  if (opener) opener.addEventListener('click', function () { setTimeout(function () { input.focus(); }, 30); });
  document.addEventListener('keydown', function (e) {
    var typing = /^(input|textarea|select)$/i.test(e.target.tagName) || e.target.isContentEditable;
    if (((e.metaKey || e.ctrlKey) && e.key.toLowerCase() === 'k') || (e.key === '/' && !typing)) {
      e.preventDefault();
      open();
    }
  });
})();
