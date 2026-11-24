/* Button icons: the button component's "Icon" field (a Material Symbols name, e.g. calendar_add_on) lands on its
   [vci-icon] spans; "Icon on right" shows the right-hand span ([vci-icon-side="right"]), so the left one goes.
   Loads only the icons this page uses, as one small font, then shows them (.is-loaded). No script: no icon. */
(function () {
  var spans = Array.prototype.slice.call(document.querySelectorAll('[vci-icon]'));
  var names = {};
  spans.forEach(function (el) {
    var name = (el.getAttribute('vci-icon') || '').trim().toLowerCase().replace(/\s+/g, '_');
    var right = el.parentElement && el.parentElement.querySelector('[vci-icon-side="right"]');
    if (!/^[a-z0-9_]+$/.test(name) || (right && right !== el)) { el.remove(); return; }
    el.textContent = name;
    names[name] = true;
  });
  var list = Object.keys(names).sort(); // Google requires icon_names in alphabetical order
  if (!list.length) return;
  var link = document.createElement('link');
  link.rel = 'stylesheet';
  link.href = 'https://fonts.googleapis.com/css2?family=Material+Symbols+Rounded:opsz,wght,FILL,GRAD@24,400,0,0' +
    '&icon_names=' + list.join(',') + '&display=block';
  document.head.appendChild(link);
  spans.forEach(function (el) { if (el.isConnected) el.classList.add('material-symbols-rounded', 'is-loaded'); });
})();
