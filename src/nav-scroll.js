/* Scroll-linked header. Why custom code: the pill follows the scroll 1:1 (slides away going down,
   slides back going up), which needs the scroll direction; CSS and Webflow interactions can't read it.
   Only sets a translateY on .nav_component. All header styling is native. */
(function(){
  var nav=document.querySelector('.nav_component'); if(!nav) return;
  var last=Math.max(0,scrollY), off=0, max=0;
  function size(){ max=nav.offsetTop+nav.offsetHeight+32; }
  function set(){ nav.style.transform=off?'translateY('+(-off)+'px)':''; }
  function onScroll(){
    var end=document.documentElement.scrollHeight-innerHeight;
    var y=Math.min(Math.max(0,scrollY),end), d=y-last; last=y;
    off=y<=0?0:Math.min(max,Math.max(0,off+d)); set();
  }
  addEventListener('scroll',onScroll,{passive:true});
  addEventListener('resize',size); size();
  nav.addEventListener('focusin',function(){ off=0; set(); });
})();
