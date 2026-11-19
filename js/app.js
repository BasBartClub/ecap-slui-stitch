(function(){
  var b=document.getElementById('menu-toggle'),m=document.getElementById('mobile-menu');
  if(b&&m){
    function set(o){m.classList.toggle('hidden',!o);b.setAttribute('aria-expanded',o?'true':'false');b.setAttribute('aria-label',o?'Menu sluiten':'Menu openen');document.documentElement.classList.toggle('menu-open',o);}
    b.addEventListener('click',function(){set(b.getAttribute('aria-expanded')!=='true');});
    document.addEventListener('keydown',function(e){if(e.key==='Escape'&&b.getAttribute('aria-expanded')==='true'){set(false);b.focus();}});
    matchMedia('(min-width:1024px)').addEventListener('change',function(e){if(e.matches)set(false);});
  }
})();
