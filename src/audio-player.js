/* Audio player [vci-audio="player"], built in Webflow (audio-player_*): a play/pause button
   [vci-audio="toggle"] with two icons (audio-player_icon, and .is-pause), a waveform row
   [vci-audio="wave"] holding one bar [vci-audio="bar"], a time readout [vci-audio="time"] and the
   <audio vci-audio="audio"> itself (no native controls).
   - The one Webflow bar is copied to fill the row. Heights come from vci-audio-peaks on the player
     (comma-separated 0–1 values, e.g. real peaks stored in the CMS) when present; otherwise a steady
     shape generated from the audio URL, so each recording keeps its own look.
   - Playing: icons and the player get .is-playing; bars up to the playhead get .is-played.
   - Click or drag the waveform to seek; it is a slider for keyboards (arrows ±5s, Home/End).
   - Time shows the length until playback starts, then the time remaining. */
(function () {
  var each = function (list, fn) { Array.prototype.forEach.call(list, fn); };
  function fmt(s) {
    if (!isFinite(s) || s < 0) s = 0;
    s = Math.round(s);
    var h = Math.floor(s / 3600), m = Math.floor((s % 3600) / 60), sec = s % 60;
    var mm = h ? (m < 10 ? '0' + m : m) : m;
    return (h ? h + ':' : '') + mm + ':' + (sec < 10 ? '0' + sec : sec);
  }
  function seeded(str) { // small deterministic PRNG from a string
    var h = 2166136261;
    for (var i = 0; i < str.length; i++) { h ^= str.charCodeAt(i); h = Math.imul(h, 16777619); }
    return function () { h ^= h << 13; h ^= h >>> 17; h ^= h << 5; return ((h >>> 0) % 1000) / 1000; };
  }

  each(document.querySelectorAll('[vci-audio="player"]'), function (player) {
    var audio = player.querySelector('audio');
    var toggle = player.querySelector('[vci-audio="toggle"]');
    var wave = player.querySelector('[vci-audio="wave"]');
    var proto = wave && wave.querySelector('[vci-audio="bar"]');
    var time = player.querySelector('[vci-audio="time"]');
    if (!audio || !audio.getAttribute('src') || !toggle || !wave || !proto) return;
    var icons = toggle.querySelectorAll('svg');
    var bars = [], peaks = null, started = false, dragging = false;

    var given = (player.getAttribute('vci-audio-peaks') || '').split(',').map(parseFloat).filter(function (v) { return !isNaN(v); });
    if (given.length) peaks = given;

    // Generated once at a fixed resolution, then sampled to however many bars fit, so the shape
    // stays the same when the row's width changes.
    if (!peaks) {
      var rnd = seeded(audio.getAttribute('src')), v = 0.4;
      peaks = [];
      for (var k = 0; k < 160; k++) {
        v += (rnd() - 0.5) * 0.5; // a wandering level with speech-like jitter
        v = Math.min(Math.max(v, 0.15), 0.95);
        peaks.push(rnd() < 0.12 ? 0 : Math.min(1, v * (0.55 + rnd() * 0.6)));
      }
    }
    function shape(n) {
      return function (i) { return peaks[Math.min(peaks.length - 1, Math.floor(i / n * peaks.length))]; };
    }
    function build() {
      var gap = 3, w = proto.offsetWidth || 3, n = Math.max(12, Math.floor((wave.clientWidth + gap) / (w + gap)));
      if (n === bars.length) return;
      each(bars.slice(1), function (b) { b.remove(); });
      bars = [proto];
      for (var i = 1; i < n; i++) { var b = proto.cloneNode(true); wave.appendChild(b); bars.push(b); }
      var h = shape(n);
      bars.forEach(function (b, i) { b.style.height = Math.round(h(i) * 100) + '%'; });
      paint();
    }
    function paint() {
      var d = audio.duration, p = d ? audio.currentTime / d : 0, upto = Math.round(p * bars.length);
      bars.forEach(function (b, i) { b.classList.toggle('is-played', i < upto); });
      if (time) time.textContent = fmt(started && d ? d - audio.currentTime : d);
      wave.setAttribute('aria-valuenow', Math.round(audio.currentTime));
      wave.setAttribute('aria-valuetext', fmt(audio.currentTime) + ' of ' + fmt(d));
    }
    function state() {
      var on = !audio.paused;
      player.classList.toggle('is-playing', on);
      each(icons, function (s) { s.classList.toggle('is-playing', on); });
      toggle.setAttribute('aria-label', on ? 'Pause' : 'Play');
    }
    function seekTo(clientX) {
      var r = wave.getBoundingClientRect(), d = audio.duration;
      if (!d) return;
      audio.currentTime = Math.min(Math.max((clientX - r.left) / r.width, 0), 1) * d;
      started = true;
      paint();
    }

    toggle.addEventListener('click', function () {
      started = true;
      if (audio.paused) audio.play(); else audio.pause();
    });
    ['play', 'pause', 'ended'].forEach(function (t) { audio.addEventListener(t, state); });
    audio.addEventListener('timeupdate', paint);
    audio.addEventListener('loadedmetadata', function () {
      wave.setAttribute('aria-valuemin', 0);
      wave.setAttribute('aria-valuemax', Math.round(audio.duration));
      paint();
    });
    wave.addEventListener('pointerdown', function (e) {
      dragging = true;
      wave.setPointerCapture(e.pointerId);
      seekTo(e.clientX);
    });
    wave.addEventListener('pointermove', function (e) { if (dragging) seekTo(e.clientX); });
    ['pointerup', 'pointercancel'].forEach(function (t) { wave.addEventListener(t, function () { dragging = false; }); });
    wave.addEventListener('keydown', function (e) {
      var d = audio.duration, step = { ArrowRight: 5, ArrowUp: 5, ArrowLeft: -5, ArrowDown: -5 }[e.key];
      if (!d) return;
      if (step) audio.currentTime = Math.min(Math.max(audio.currentTime + step, 0), d);
      else if (e.key === 'Home') audio.currentTime = 0;
      else if (e.key === 'End') audio.currentTime = d;
      else return;
      e.preventDefault();
      started = true;
      paint();
    });

    // Speed [vci-audio="speed"]: each press steps through the rates; the button shows the current one.
    var speed = player.querySelector('[vci-audio="speed"]'), RATES = [1, 1.25, 1.5, 2, 0.75];
    if (speed) speed.addEventListener('click', function () {
      var r = RATES[(RATES.indexOf(audio.playbackRate) + 1) % RATES.length] || 1;
      audio.playbackRate = r;
      speed.textContent = r + '×';
      speed.setAttribute('aria-label', 'Playback speed ' + r + '×');
    });
    // Download [vci-audio="download"]: links to the file. ("download" is a reserved attribute in Webflow.)
    // Browsers only honour download= for same-origin files; from another host it opens in a new tab.
    var dl = player.querySelector('[vci-audio="download"]');
    if (dl) {
      dl.setAttribute('href', audio.getAttribute('src'));
      dl.setAttribute('download', '');
      dl.setAttribute('target', '_blank');
      dl.setAttribute('rel', 'noopener');
    }

    build();
    if (window.ResizeObserver) new ResizeObserver(build).observe(wave);
    state();
  });
})();
