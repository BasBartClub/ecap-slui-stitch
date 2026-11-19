(function(){
  var b=document.getElementById('menu-toggle'),m=document.getElementById('mobile-menu');
  if(b&&m){
    function set(o){m.classList.toggle('hidden',!o);b.setAttribute('aria-expanded',o?'true':'false');b.setAttribute('aria-label',o?'Menu sluiten':'Menu openen');document.documentElement.classList.toggle('menu-open',o);}
    b.addEventListener('click',function(){set(b.getAttribute('aria-expanded')!=='true');});
    document.addEventListener('keydown',function(e){if(e.key==='Escape'&&b.getAttribute('aria-expanded')==='true'){set(false);b.focus();}});
    matchMedia('(min-width:1024px)').addEventListener('change',function(e){if(e.matches)set(false);});
  }
})();
(function(){
  if(!('IntersectionObserver' in window)||matchMedia('(prefers-reduced-motion: reduce)').matches)return;
  var els=[].slice.call(document.querySelectorAll('main section, body > section, main > article > *:not(:first-child), footer'));
  var vh=innerHeight;
  els=els.filter(function(e){return e.getBoundingClientRect().top>vh*0.9;});
  els.forEach(function(e){e.classList.add('rv');
    [].slice.call(e.querySelectorAll(':scope .grid > *')).slice(0,12).forEach(function(c,i){c.classList.add('rv');c.style.transitionDelay=(i%6)*60+'ms';});});
  var io=new IntersectionObserver(function(es){es.forEach(function(x){if(x.isIntersecting){x.target.classList.add('in');io.unobserve(x.target);}});},{rootMargin:'0px 0px -8% 0px'});
  document.querySelectorAll('.rv').forEach(function(e){io.observe(e);});
})();
