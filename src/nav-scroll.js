/* Scroll-linked header: a class switcher. Why custom code: bringing the header back when the
   visitor scrolls up needs the scroll direction, which CSS and Webflow interactions can't read.

   All the look and motion is in the Webflow style panel:
     nav_component                       position: absolute (sits at the top of the page and
                                         scrolls away with it), transition: transform
     nav_component.is-pinned             position: fixed
     nav_component.is-pinned.is-hidden   (is-hidden) transform that moves it above the screen
   This only switches those classes:
     top of the page        no classes: the header is part of the page and scrolls away naturally
     scrolling up           is-pinned: fixed, sliding in from above
     scrolling down again   is-pinned is-hidden: slides back out
     back at the very top   no classes again (fixed at the top and absolute at the top are the
                            same spot, so the swap is invisible)
   If this file doesn't load, the header simply scrolls away with the page.

   Also closes an open nav dropdown when the header hides, so a menu never hangs off screen.
   A dropdown holding keyboard focus stays open, and focus inside the header shows it again. */
(function(){
  var nav=document.querySelector('.nav_component'); if(!nav) return;
  var PINNED='is-pinned', HIDDEN='is-hidden';
  var TOLERANCE=6; // px of travel in one direction before the header reacts (ignores jitter)
  var last=Math.max(0,scrollY), travel=0;
  var has=function(c){ return nav.classList.contains(c); };

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

  // Bring it in: pin it hidden with the transition off (so it doesn't animate from where it
  // sat in the page), then let it slide down.
  function show(){
    if(!has(PINNED)){
      nav.style.transition='none';
      nav.classList.add(PINNED,HIDDEN);
      void nav.offsetHeight;
      nav.style.transition='';
      requestAnimationFrame(function(){ nav.classList.remove(HIDDEN); });
    } else nav.classList.remove(HIDDEN);
  }
  function hide(){
    if(!has(PINNED) || has(HIDDEN) || nav.contains(document.activeElement)) return;
    nav.classList.add(HIDDEN);
    closeDropdowns();
  }
  function unpin(){ nav.classList.remove(PINNED,HIDDEN); }

  function onScroll(){
    // Clamp: iOS rubber-banding past either end reports scroll that isn't real.
    var end=document.documentElement.scrollHeight-innerHeight;
    var y=Math.min(Math.max(0,scrollY),end), d=y-last; last=y;
    if(y<=0) return unpin();
    if(!d) return;
    travel=(d>0)===(travel>0)?travel+d:d; // restarts when the direction flips
    if(travel>TOLERANCE) hide();
    // Scrolling up: only worth pinning once the in-page header is out of view.
    else if(travel<-TOLERANCE && (has(PINNED) || y>nav.offsetTop+nav.offsetHeight)) show();
  }

  addEventListener('scroll',onScroll,{passive:true});
  nav.addEventListener('focusin',function(){ if(has(PINNED)) nav.classList.remove(HIDDEN); });
})();
