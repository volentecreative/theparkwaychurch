/* Media item page [vci-media="component"]: Watch/Listen switch, breadcrumb + "View series" links into the /media filters, numbered series list with the current item marked. Drops whatever has no data. */
(function () {
  var root = document.querySelector('[vci-media="component"]');
  if (!root) return;
  function q(v) { return root.querySelector('[vci-media="' + v + '"]'); }
  function empty(el) { return !el || !el.textContent.trim() || el.classList.contains('w-dyn-bind-empty'); }
  function filter(field, value) { return '/media?' + field + '_equal=' + encodeURIComponent(JSON.stringify([value])); }

  // Watch / Listen
  var watch = q('watch'), audio = q('listen'), mode = q('mode');
  var video = watch && watch.querySelector('.w-video, iframe');
  var frame = video && (video.tagName === 'IFRAME' ? video : video.querySelector('iframe'));
  var hasVideo = !!(frame && frame.getAttribute('src'));
  var hasAudio = !!(audio && audio.getAttribute('src'));
  if (!hasAudio && audio) audio.remove();
  if (!hasVideo && video) video.remove();
  if (!(hasVideo && hasAudio)) { if (mode) mode.remove(); }
  else {
    var src = frame.getAttribute('src');
    var set = function (m) {
      var listen = m === 'listen';
      Array.prototype.forEach.call(mode.querySelectorAll('[vci-media-mode]'), function (b) {
        var on = b.getAttribute('vci-media-mode') === m;
        b.classList.toggle('is-active', on);
        b.setAttribute('aria-pressed', on);
      });
      video.classList.toggle('is-hidden', listen);
      audio.classList.toggle('is-hidden', !listen);
      if (listen) frame.removeAttribute('src'); // stops the video
      else { audio.pause(); if (!frame.getAttribute('src')) frame.setAttribute('src', src); }
    };
    set('watch');
    mode.classList.add('is-ready'); // hidden in the Designer until this runs; without it video and audio both show
    mode.addEventListener('click', function (e) {
      var b = e.target.closest('[vci-media-mode]');
      if (b) set(b.getAttribute('vci-media-mode'));
    });
  }

  // Breadcrumb + series links
  var type = q('crumb-type'), series = q('crumb-series');
  var name = empty(series) ? '' : series.textContent.trim();
  [[type, 'type'], [series, 'series']].forEach(function (c) {
    if (empty(c[0])) { var sep = c[0] && c[0].previousElementSibling; if (sep) sep.remove(); if (c[0]) c[0].remove(); }
    else c[0].setAttribute('href', filter(c[1], c[0].textContent.trim()));
  });
  var more = q('series-link');
  if (more && name) more.setAttribute('href', filter('series', name));

  // Meta line "passage · date": drop empty parts and the dot next to them (classes have no passage).
  Array.prototype.forEach.call(root.querySelectorAll('.content_card-meta > .w-dyn-bind-empty'), function (el) {
    var dot = el.nextElementSibling || el.previousElementSibling;
    if (dot && dot.textContent.trim() === '·') dot.remove();
    el.remove();
  });

  // Speaker
  var speaker = q('speaker');
  if (speaker) {
    if (empty(speaker.querySelector('.media-item_speaker-name'))) speaker.remove();
    else Array.prototype.forEach.call(speaker.querySelectorAll('img.w-dyn-bind-empty, .w-dyn-bind-empty'), function (e) { e.remove(); });
  }

  // Series list: newest first, numbered oldest = 1, current item marked and scrolled into view.
  var list = q('series-list'), aside = q('aside');
  var items = list ? list.querySelectorAll('.w-dyn-item') : [];
  if (!name || items.length < 2) { if (aside) aside.remove(); root.classList.add('is-single'); return; }
  var here = location.pathname.replace(/\/+$/, '');
  Array.prototype.forEach.call(items, function (item, i) {
    var n = item.querySelector('[vci-media="series-number"]');
    if (n) n.textContent = String(items.length - i).padStart(2, '0');
    var a = item.querySelector('a[href]');
    if (a && new URL(a.href, location.href).pathname.replace(/\/+$/, '') === here) {
      a.classList.add('is-current');
      a.setAttribute('aria-current', 'page');
      var box = list.parentElement;
      box.scrollTop += a.getBoundingClientRect().top - box.getBoundingClientRect().top - (box.clientHeight - a.offsetHeight) / 2;
    }
  });
})();
