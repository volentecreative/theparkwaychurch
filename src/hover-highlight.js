/* Gliding hover highlight for option lists: [vci-highlight="glide"] moves to the hovered option inside [vci-highlight="list"]; also rotates the dropdown chevron (.is-open). */
(function () {
  var fine = window.matchMedia && matchMedia('(hover: hover) and (pointer: fine)');
  var reduce = window.matchMedia && matchMedia('(prefers-reduced-motion: reduce)');

  Array.prototype.forEach.call(document.querySelectorAll('[vci-highlight="list"]'), function (list) {
    var hl = list.querySelector('[vci-highlight="glide"]');
    if (!hl) return;
    var lit = null, timer = 0;
    function opts() { return list.querySelectorAll('label, a'); }
    function place(el, glide) {
      var r = el.getBoundingClientRect(), f = list.getBoundingClientRect();
      hl.classList.toggle('is-instant', !glide || !!(reduce && reduce.matches));
      hl.style.width = r.width + 'px';
      hl.style.height = r.height + 'px';
      hl.style.transform = 'translate(' + (r.left - f.left) + 'px,' + (r.top - f.top + list.scrollTop) + 'px)';
    }
    function show(el) {
      clearTimeout(timer);
      if (el === lit) return;
      place(el, !!lit);
      lit = el;
      hl.classList.add('is-active');
      Array.prototype.forEach.call(opts(), function (o) { o.classList.add('is-glide'); });
    }
    function hide() {
      timer = setTimeout(function () {
        lit = null;
        hl.classList.remove('is-active');
        Array.prototype.forEach.call(opts(), function (o) { o.classList.remove('is-glide'); });
      }, 60);
    }
    list.addEventListener('pointerover', function (e) {
      if (!(e.pointerType === 'mouse' || (fine && fine.matches))) return;
      var o = e.target.closest('label, a');
      if (o && list.contains(o)) show(o);
    });
    list.addEventListener('pointerleave', hide);

    // Chevron follows the dropdown's open state.
    var dd = list.closest('.w-dropdown');
    var toggle = dd && dd.querySelector('.w-dropdown-toggle');
    var icon = dd && (dd.querySelector('[vci-highlight="icon"]') || dd.querySelector('.w-icon-dropdown-toggle'));
    if (toggle && icon) new MutationObserver(function () {
      icon.classList.toggle('is-open', toggle.classList.contains('w--open'));
    }).observe(toggle, { attributes: true, attributeFilter: ['class'] });
  });
})();
