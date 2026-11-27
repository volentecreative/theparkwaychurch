/* Parallax: [vci-parallax="true"] (bound to a component's Parallax prop) holds a photo that drifts down
   slower than the page as its section scrolls away. The room for the drift is built in Webflow: the
   image is taller than its frame and starts shifted up (home-hero_image: height 115%, top -15%), so
   RATE must stay at or under that 15%. vci-parallax-rate overrides it (0–1). Off under reduced motion. */
(function () {
  if (window.matchMedia && matchMedia('(prefers-reduced-motion: reduce)').matches) return;
  var RATE = 0.15;
  var items = Array.prototype.map.call(document.querySelectorAll('[vci-parallax="true"]'), function (el) {
    var media = el.querySelector('img, picture, video');
    var rate = parseFloat(el.getAttribute('vci-parallax-rate'));
    return media && { el: el, media: media, rate: isNaN(rate) ? RATE : Math.min(Math.max(rate, 0), 1) };
  }).filter(Boolean);
  if (!items.length) return;

  var queued = false;
  function update() {
    queued = false;
    var vh = innerHeight;
    items.forEach(function (it) {
      var r = it.el.getBoundingClientRect();
      if (r.bottom < 0 || r.top > vh) return; // off screen: leave it where it is
      var y = Math.min(Math.max(-r.top, 0), r.height) * it.rate;
      it.media.style.transform = 'translate3d(0,' + y.toFixed(1) + 'px,0)';
    });
  }
  function queue() { if (!queued) { queued = true; requestAnimationFrame(update); } }
  items.forEach(function (it) { it.media.style.willChange = 'transform'; });
  addEventListener('scroll', queue, { passive: true });
  addEventListener('resize', queue);
  update();
})();
