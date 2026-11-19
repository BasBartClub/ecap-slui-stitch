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
(function(){
  var reduce=matchMedia('(prefers-reduced-motion: reduce)').matches;
  // Glow op hover: volg de cursor
  document.addEventListener('pointermove',function(e){var g=e.target.closest&&e.target.closest('.glow');if(!g)return;var r=g.getBoundingClientRect();g.style.setProperty('--mx',(e.clientX-r.left)+'px');g.style.setProperty('--my',(e.clientY-r.top)+'px');},{passive:true});
  if(!('IntersectionObserver' in window))return;
  // Energiestroom alleen animeren als zichtbaar
  var fl=document.querySelectorAll('.flow');
  if(fl.length&&!reduce){var fo=new IntersectionObserver(function(es){es.forEach(function(x){x.target.classList.toggle('on',x.isIntersecting);});});fl.forEach(function(f){fo.observe(f);});}
  if(reduce)return;
  // Tellers (alleen echte cijfers uit de HTML)
  var cs=document.querySelectorAll('[data-count]');
  if(cs.length){var co=new IntersectionObserver(function(es){es.forEach(function(x){if(!x.isIntersecting)return;co.unobserve(x.target);var el=x.target,to=+el.getAttribute('data-count'),t0=performance.now(),d=1400;(function step(t){var k=Math.min(1,(t-t0)/d),e=1-Math.pow(1-k,3);el.textContent=Math.round(to*e);if(k<1)requestAnimationFrame(step);})(t0);});},{threshold:.6});cs.forEach(function(c){if(c.getBoundingClientRect().top>innerHeight*0.95){c.textContent='0';}co.observe(c);});}
  // Parallax op echte foto's
  var px=[].slice.call(document.querySelectorAll('.px-wrap'));
  if(px.length){var vis=new Set(),tick=false;var po=new IntersectionObserver(function(es){es.forEach(function(x){x.isIntersecting?vis.add(x.target):vis.delete(x.target);});});px.forEach(function(p){po.observe(p);});
    function upd(){tick=false;vis.forEach(function(w){var r=w.getBoundingClientRect(),c=(r.top+r.height/2-innerHeight/2)/innerHeight;var im=w.querySelector('.px-img');if(im)im.style.setProperty('--py',(-c*40).toFixed(1)+'px');});}
    addEventListener('scroll',function(){if(!tick){tick=true;requestAnimationFrame(upd);}},{passive:true});upd();}
})();
