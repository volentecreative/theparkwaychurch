/* Button component as a form's submit button. Why custom code: the site's button component is a
   link, and a link can't submit a form; Webflow's form needs its own submit button.

   In Webflow: wrap a button component in an element with vci-form="submit" inside the form, and
   keep the form's native submit button (hidden with a class, e.g. connect_submit-native) so
   Webflow's validation, spam check, "Sending…" state and success/error messages all still apply.
   Clicking (or pressing Enter/Space on) the component submits the form through that native
   button. While sending, the component's label shows the native button's waiting text
   ("Sending…"), and goes back if Webflow shows its error message. */
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
