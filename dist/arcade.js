/* Small pointer-driven depth effect; no animation loop or effect on touch devices. */
(()=>{
  const hero=document.querySelector('.raceHero');
  if(!hero||!matchMedia('(hover: hover) and (pointer: fine)').matches)return;
  const motion=matchMedia('(prefers-reduced-motion: reduce)');
  const reset=()=>{hero.style.removeProperty('--scene-x');hero.style.removeProperty('--scene-y');};
  hero.addEventListener('pointermove',event=>{
    if(motion.matches)return;
    const box=hero.getBoundingClientRect();
    hero.style.setProperty('--scene-x',((event.clientX-box.left)/box.width-.5)*-12+'px');
    hero.style.setProperty('--scene-y',((event.clientY-box.top)/box.height-.5)*-8+'px');
  });
  hero.addEventListener('pointerleave',reset);
  motion.addEventListener('change',reset);
})();
