/* Direction-aware header. Why custom code: CSS can't read the scroll direction.

   Scrolling down, the header belongs to the document and scrolls away with it. Scrolling up,
   it is fetched from above the screen and stays fixed at the top. Scrolling down again, it is
   released back into the document right where it is and scrolls away naturally.

   CSS (Webflow style panel) does all the positioning and motion:
     nav_component             position: absolute (its natural place, over the hero),
                               transition: transform
     nav_component.is-pinned   position: fixed
   Reduced motion: no slide; the header just appears pinned (handled here, as the style panel
   can't do prefers-reduced-motion).

   This script only:
     - sets data-scroll-direction="up" | "down" on .nav_component (passive listener, moves under
       THRESHOLD px ignored), and on each change of direction
     - up:   adds is-pinned, starting from where the header is on screen right now (just above
             the top if it has scrolled away), so CSS slides it down from there
     - down: removes is-pinned and sets an inline top = where it currently is in the page, so it
             carries on scrolling away with the content with no jump
     - at scrollY 0 clears all of that, so the header is exactly as it was on load.
   One position read and one style write per change of direction; nothing runs while scrolling
   in the same direction. If this file doesn't load, the header just scrolls away with the page.

   Also closes an open nav dropdown when scrolling down, so a menu isn't carried off screen.
   A dropdown holding keyboard focus stays open, and focus inside the header pins it. */
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

  function pin(){
    if(nav.classList.contains(PINNED)) return;
    var r=nav.getBoundingClientRect(), base=natural();
    // From where it is now (above or a few px below its pinned spot), but never from further
    // away than just above the screen.
    var from=still && still.matches ? 0 : Math.round(Math.max(r.top-base, -(r.bottom-r.top)-base-8));
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

  function onScroll(){
    // Clamp: iOS rubber-banding past either end reports scroll that isn't real.
    var end=document.documentElement.scrollHeight-innerHeight;
    var y=Math.min(Math.max(0,scrollY),end), d=y-last; last=y;
    if(y<=0) return reset();
    if(!d) return;
    travel=(d>0)===(travel>0)?travel+d:d; // restarts when the direction flips
    var next=travel>THRESHOLD?'down':travel<-THRESHOLD?'up':dir;
    if(next===dir) return;
    dir=next;
    nav.setAttribute('data-scroll-direction',dir);
    if(dir==='up') pin(); else release();
  }

  addEventListener('scroll',onScroll,{passive:true});
  nav.addEventListener('focusin',function(){ if(scrollY>0) pin(); });
})();
