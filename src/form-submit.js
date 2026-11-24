/* Button component as a form submit: [vci-form="submit"] submits through the form's hidden native submit, and shows its "Sending…" text. */
(function () {
  Array.prototype.forEach.call(document.querySelectorAll('form [vci-form="submit"]'), function (wrap) {
    var form = wrap.closest('form');
    var native = form && form.querySelector('input[type="submit"], button[type="submit"]');
    var link = wrap.querySelector('a, button') || wrap;
    if (!native || native === link) return;

    link.setAttribute('role', 'button');
    function submit(e) {
      e.preventDefault();
      if (form.requestSubmit) form.requestSubmit(native); else native.click();
    }
    link.addEventListener('click', submit);
    link.addEventListener('keydown', function (e) { if (e.key === ' ') submit(e); });

    // Mirror Webflow's "Sending…" text onto the component's label.
    var label = null, original = '';
    (function find(el) {
      for (var i = 0; i < el.children.length && !label; i++) find(el.children[i]);
      if (!label && !el.children.length && el.textContent.trim()) label = el;
    })(link);
    if (!label) return;
    original = label.textContent;
    form.addEventListener('submit', function () {
      label.textContent = native.getAttribute('data-wait') || original;
    });
    // Back to the normal label if Webflow shows its error message (on success the form hides).
    var fail = form.parentElement && form.parentElement.querySelector('.w-form-fail');
    if (fail) new MutationObserver(function () {
      if (getComputedStyle(fail).display !== 'none') label.textContent = original;
    }).observe(fail, { attributes: true, attributeFilter: ['style'] });
  });
})();
