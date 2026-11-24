/* Mobile menu toggle. */
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
