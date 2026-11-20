/* Scroll-linked header. Why custom code: the pill follows the scroll 1:1 (slides away going down,
   slides back going up), which needs the scroll direction; CSS and Webflow interactions can't read it.
   All header styling is native; this only moves .nav_component.

   How it moves: never by restyling it on every scroll event. Phones (iOS above all) scroll on the
   compositor and deliver scroll events a frame late, so a fixed header nudged by translateY each
   event trails the page and judders. Instead the header has three resting states:
     top     fully shown: its native position: fixed.
     page    part-way: position: absolute at the spot in the page where it currently is, so the
             browser scrolls it with the content natively, with no script in the loop.
     hidden  fully scrolled away: fixed again, translated just off the top of the screen.
   Styles are written only when the state changes, so a scroll is one write at each end.

   Also closes an open nav dropdown once the page scrolls down a few px, so a menu never hangs
   half off screen while the header slides away. Scrolling up leaves it alone, and a dropdown
   holding keyboard focus stays open. */
(function(){
  var nav=document.querySelector('.nav_component'); if(!nav) return;
  var CLOSE_AFTER=8; // px of continuous downward scroll before an open dropdown closes
  var GAP=32; // px past the header's own height it travels before counting as hidden
  var s=nav.style;
  var last=Math.max(0,scrollY), off=0, max=0, down=0;
  var base=0; // the header's fixed top, px
  var cbTop=0; // page y of what position: absolute measures from
  var mode='top', pageTop=null;

  function size(){
    // Read the native fixed position, not whatever this script last set.
    var p=s.position, t=s.top, tr=s.transform;
    s.position=''; s.top=''; s.transform='';
    base=parseFloat(getComputedStyle(nav).top)||0;
    max=base+nav.offsetHeight+GAP;
    s.position=p; s.top=t; s.transform=tr;
    // position: absolute is measured from the nearest positioned ancestor, else the page itself.
    cbTop=0;
    for(var el=nav.parentElement; el && el!==document.body && el!==document.documentElement; el=el.parentElement){
      if(getComputedStyle(el).position!=='static'){ cbTop=el.getBoundingClientRect().top+scrollY+el.clientTop; break; }
    }
    pageTop=null; place();
  }

  function place(){
    var next=off<=0?'top':off>=max?'hidden':'page';
    if(next==='page'){
      // Where the header sits in the page. While the scroll keeps it part-way this does not
      // change, so nothing is written and the browser does all the moving.
      var top=last-off+base;
      if(mode==='page' && pageTop!==null && Math.abs(top-pageTop)<0.5) return;
      pageTop=top;
      s.transform=''; s.top=(top-cbTop)+'px'; s.position='absolute';
    }else{
      if(next===mode) return;
      pageTop=null;
      s.position=''; s.top='';
      s.transform=next==='hidden'?'translateY('+(-max)+'px)':'';
    }
    mode=next;
  }

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
    off=y<=0?0:Math.min(max,Math.max(0,off+d)); place();
    down=d>0?down+d:d<0?0:down;
    if(down>CLOSE_AFTER) closeDropdowns();
  }

  addEventListener('scroll',onScroll,{passive:true});
  addEventListener('resize',size); size();
  nav.addEventListener('focusin',function(){ off=0; place(); });
})();
