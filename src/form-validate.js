/* Light form validation on top of the browser's own (the Send button submits through requestSubmit,
   so these messages show in the native bubble):
   - email: needs name@domain.tld (the browser alone accepts "a@b").
   - tel: typing is limited to digits and phone punctuation; needs 10-15 digits; a plain 10-digit
     number is tidied to (555) 123-4567 on blur.
   - required fields can't be only spaces.
   The field's .input_field gets .is-invalid (styled in Webflow) once it has been left or a submit
   was tried, and loses it as soon as the value is fine. */
(function () {
  var EMAIL = /^[^\s@]+@[^\s@.]+(\.[^\s@.]+)*\.[a-z]{2,}$/i;

  function check(input) {
    var v = input.value.trim(), msg = '';
    if (input.required && !v) msg = '';
    else if (input.type === 'email' && v && !EMAIL.test(v)) msg = 'Enter an email like name@example.com.';
    else if (input.type === 'tel' && v) {
      var digits = v.replace(/\D/g, '').length;
      if (digits < 10 || digits > 15) msg = 'Enter a phone number with area code, like (555) 123-4567.';
    }
    if (input.required && !v && input.value) msg = 'Please fill out this field.';
    input.setCustomValidity(msg);
    return input.checkValidity();
  }
  function mark(input, on) {
    var field = input.closest('.input_field');
    if (field) field.classList.toggle('is-invalid', on);
  }

  Array.prototype.forEach.call(document.querySelectorAll('form'), function (form) {
    var inputs = form.querySelectorAll('input[type="email"], input[type="tel"], input[type="text"], textarea');
    Array.prototype.forEach.call(inputs, function (input) {
      var touched = false;
      if (input.type === 'tel') {
        input.setAttribute('inputmode', 'tel');
        input.addEventListener('input', function () {
          var clean = input.value.replace(/[^\d+()\-. ]/g, '');
          if (clean !== input.value) input.value = clean;
        });
      }
      if (input.type === 'email') input.setAttribute('inputmode', 'email');
      input.addEventListener('input', function () {
        var ok = check(input);
        if (touched || ok) mark(input, !ok);
      });
      input.addEventListener('blur', function () {
        if (input.type === 'tel') {
          var d = input.value.replace(/\D/g, '');
          if (d.length === 10 && !/^\s*\+/.test(input.value)) input.value = '(' + d.slice(0, 3) + ') ' + d.slice(3, 6) + '-' + d.slice(6);
        }
        if (!input.value && !input.required) { touched = false; mark(input, false); check(input); return; }
        touched = true;
        mark(input, !check(input));
      });
      input.addEventListener('invalid', function () { touched = true; mark(input, true); });
      check(input);
    });
  });
})();
