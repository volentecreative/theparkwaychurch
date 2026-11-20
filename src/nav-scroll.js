/* Scroll-linked header. Why custom code: the pill follows the scroll 1:1 (slides away going down,
   slides back going up), which needs the scroll direction; CSS and Webflow interactions can't read it.
   Only sets a translateY on .nav_component. All header styling is native.
   Also closes an open nav dropdown once the page scrolls down a few px, so a menu never hangs
   half off screen while the header slides away. Scrolling up leaves it alone, and a dropdown
   holding keyboard focus stays open. */
(function(){
  var nav=document.querySelector('.nav_component'); if(!nav) return;
  var CLOSE_AFTER=8; // px of continuous downward scroll before an open dropdown closes
  var last=Math.max(0,scrollY), off=0, max=0, down=0;
  function size(){ max=nav.offsetTop+nav.offsetHeight+32; }
  function set(){ nav.style.transform=off?'translateY('+(-off)+'px)':''; }
  // Close through Webflow's own dropdown handler, so its fade, classes and aria all reset.
  function closeDropdowns(){
    var open=nav.querySelectorAll('.w-dropdown-list.w--open');
    for(var i=0;i<open.length;i++){
      var dd=open[i].parentElement;
      if(dd.contains(document.activeElement)) continue;
      if(window.jQuery) jQuery(dd).triggerHandler('w-close');
      else dd.dispatchEvent(new Event('w-close'));
    }
  }
  function onScroll(){
    var end=document.documentElement.scrollHeight-innerHeight;
    var y=Math.min(Math.max(0,scrollY),end), d=y-last; last=y;
    off=y<=0?0:Math.min(max,Math.max(0,off+d)); set();
    down=d>0?down+d:d<0?0:down;
    if(down>CLOSE_AFTER) closeDropdowns();
  }
  addEventListener('scroll',onScroll,{passive:true});
  addEventListener('resize',size); size();
  nav.addEventListener('focusin',function(){ off=0; set(); });
})();
