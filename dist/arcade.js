/* Small interface responses. Animation preference and pause apply everywhere. */
(()=>{
  const visible=window.IntersectionObserver?new IntersectionObserver(entries=>entries.forEach(({target,isIntersecting})=>{target.dataset.motionVisible=String(isIntersecting);}),{rootMargin:'40px'}):{observe(el){el.dataset.motionVisible='false';},unobserve(){}};
  function observe(){document.querySelectorAll('.questMascot,.destinationIcon,.islandHero .raceStart').forEach(el=>{if(!el.dataset.motionObserved){el.dataset.motionObserved='true';visible.observe(el);}});}
  const changed=new MutationObserver(records=>{
    for(const record of records)for(const removed of record.removedNodes)if(removed.nodeType===1){if(removed.dataset?.motionObserved)visible.unobserve(removed);removed.querySelectorAll?.('[data-motion-observed]').forEach(el=>visible.unobserve(el));}
    observe();
  });
  changed.observe(document.querySelector('main'),{childList:true,subtree:true});observe();
  document.addEventListener('visibilitychange',()=>{document.documentElement.dataset.pageHidden=String(document.hidden);});
  document.addEventListener('pointerdown',event=>{
    const button=event.target.closest('.islandHero .raceStart,.destinationCard,.petCare button');
    if(!button||button.disabled||event.button!==0||!window.wordylandMotion?.allowed())return;
    const bounds=button.getBoundingClientRect(),ripple=document.createElement('span');ripple.className='tapRipple';ripple.setAttribute('aria-hidden','true');ripple.style.left=event.clientX-bounds.left+'px';ripple.style.top=event.clientY-bounds.top+'px';button.append(ripple);
    if(!ripple.animate){ripple.remove();return;}
    ripple.animate([{transform:'translate(-50%,-50%) scale(0)',opacity:.7},{transform:'translate(-50%,-50%) scale(12)',opacity:0}],{duration:500,easing:'ease-out'}).finished.catch(()=>{}).finally(()=>ripple.remove());
  });
})();
