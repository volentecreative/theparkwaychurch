/* Hamburger open state. narthex adds .is-open to .nav_toggle while the menu is open; the style
   panel can't style a child from its parent's class, so mirror it onto each .nav_toggle-line.
   The X itself is native: nav_toggle-line.is-open with first-child / nth-child(even) / last-child
   states in the style panel. */
(function(){
  Array.prototype.forEach.call(document.querySelectorAll('.nav_toggle'), function(t){
    var lines=t.querySelectorAll('.nav_toggle-line');
    function sync(){
      var on=t.classList.contains('is-open');
      for(var i=0;i<lines.length;i++) if(lines[i].classList.contains('is-open')!==on) lines[i].classList.toggle('is-open',on);
    }
    new MutationObserver(sync).observe(t,{attributes:true,attributeFilter:['class']});
    sync();
  });
})();
