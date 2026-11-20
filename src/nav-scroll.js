/* Scroll-linked header: a class switcher. Why custom code: hiding the header on the way down and
   showing it on the way up needs the scroll direction, which CSS and Webflow interactions can't read.

   All the look and motion is in the Webflow style panel:
     nav_component            position: fixed, plus transition: transform
     nav_component.is-hidden  transform that moves it off the top of the screen
   This only adds and removes is-hidden. The header is always fixed, so it can never leave a gap
   at the top of the screen however fast the page is flung. If this file doesn't load, the header
   simply stays put.

   Also closes an open nav dropdown when the header hides, so a menu never hangs off screen.
   A dropdown holding keyboard focus stays open, and focus inside the header shows it again. */
(function(){
  var nav=document.querySelector('.nav_component'); if(!nav) return;
  var HIDDEN='is-hidden';
  var TOLERANCE=6; // px of travel in one direction before the header reacts (ignores jitter)
  var last=Math.max(0,scrollY), travel=0;

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

  function hide(on){
    if(nav.classList.contains(HIDDEN)===on) return;
    if(on && nav.contains(document.activeElement)) return;
    nav.classList.toggle(HIDDEN,on);
    if(on) closeDropdowns();
  }

  function onScroll(){
    // Clamp: iOS rubber-banding past either end reports scroll that isn't real.
    var end=document.documentElement.scrollHeight-innerHeight;
    var y=Math.min(Math.max(0,scrollY),end), d=y-last; last=y;
    if(!d) return;
    travel=(d>0)===(travel>0)?travel+d:d; // restarts when the direction flips
    if(y<=nav.offsetHeight) return hide(false); // never hidden while near the top
    if(travel>TOLERANCE) hide(true);
    else if(travel<-TOLERANCE) hide(false);
  }

  addEventListener('scroll',onScroll,{passive:true});
  nav.addEventListener('focusin',function(){ hide(false); });
})();
