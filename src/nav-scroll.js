/* Header scrolls away going down, pins (.is-pinned) coming back up, resets at the top. Closes open dropdowns on scroll down. */
(function(){
  var nav=document.querySelector('.nav_component'); if(!nav) return;
  var PINNED='is-pinned', THRESHOLD=6;
  // Reduced motion: the header still pins, but appears in place instead of sliding in.
  var still=window.matchMedia && matchMedia('(prefers-reduced-motion: reduce)');
  var last=Math.max(0,scrollY), travel=0, dir=null;
  var s=nav.style;

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

  // The header's natural top (from the stylesheet), and the page y that position: absolute
  // measures from (the nearest positioned ancestor, else the page).
  function natural(){
    var t=s.top; s.top='';
    var top=parseFloat(getComputedStyle(nav).top)||0;
    s.top=t;
    return top;
  }
  function origin(){
    for(var el=nav.parentElement; el && el!==document.body; el=el.parentElement)
      if(getComputedStyle(el).position!=='static') return el.getBoundingClientRect().top+scrollY+el.clientTop;
    return 0;
  }
  // Apply a positioning change with the transition off, so only the slide is ever animated.
  function now(fn){ s.transition='none'; fn(); void nav.offsetHeight; s.transition=''; }

  function pin(instant){
    if(nav.classList.contains(PINNED)) return;
    var r=nav.getBoundingClientRect(), base=natural();
    // From where it is now (above or a few px below its pinned spot), but never from further
    // away than just above the screen.
    var from=instant || (still && still.matches) ? 0 : Math.round(Math.max(r.top-base, -(r.bottom-r.top)-base-8));
    now(function(){
      nav.classList.add(PINNED); s.top='';
      s.transform=from?'translateY('+from+'px)':'';
    });
    s.transform=''; // CSS transitions it to its resting place
  }

  function release(){
    closeDropdowns();
    if(!nav.classList.contains(PINNED)) return;
    var y=nav.getBoundingClientRect().top+scrollY; // includes any slide still in progress
    now(function(){
      nav.classList.remove(PINNED);
      s.transform='';
      s.top=(y-origin())+'px';
    });
  }

  function reset(){
    dir=null; travel=0;
    nav.removeAttribute('data-scroll-direction');
    if(!nav.classList.contains(PINNED) && !s.top) return;
    now(function(){ nav.classList.remove(PINNED); s.top=''; s.transform=''; });
  }

  // Scroll the visitor didn't cause: restored position or a #hash jump. Show the header.
  var settled=false;
  function settle(){ settled=true; }
  ['wheel','touchstart','keydown','pointerdown'].forEach(function(t){
    addEventListener(t,settle,{passive:true,capture:true,once:true});
  });
  function settleSoon(){ setTimeout(settle,1000); }
  if(document.readyState==='complete') settleSoon(); else addEventListener('load',settleSoon);

  function arrive(){
    if(scrollY<=0) return;
    dir='up'; travel=0;
    nav.setAttribute('data-scroll-direction',dir);
    pin(true);
  }

  function onScroll(){
    // Clamp: iOS rubber-banding past either end reports scroll that isn't real.
    var end=document.documentElement.scrollHeight-innerHeight;
    var y=Math.min(Math.max(0,scrollY),end), d=y-last; last=y;
    if(y<=0) return reset();
    if(!settled) return arrive();
    if(!d) return;
    travel=(d>0)===(travel>0)?travel+d:d; // restarts when the direction flips
    var next=travel>THRESHOLD?'down':travel<-THRESHOLD?'up':dir;
    if(next===dir) return;
    dir=next;
    nav.setAttribute('data-scroll-direction',dir);
    if(dir==='up') pin(); else release();
  }

  addEventListener('scroll',onScroll,{passive:true});
  // Back/forward cache: the page comes back mid-scroll with no scroll event.
  addEventListener('pageshow',function(e){ if(e.persisted){ last=Math.max(0,scrollY); arrive(); } });
  nav.addEventListener('focusin',function(){ if(scrollY>0) pin(); });
  arrive(); // already scrolled by the time this runs
})();
