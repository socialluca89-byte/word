// Count actual WebGL initialization rather than comparing noisy wall-clock timings.
const {chromium}=require(process.env.WORDYLAND_PLAYWRIGHT_MODULE||'playwright'),assert=require('assert/strict');
const base=process.env.WORDYLAND_TEST_URL;assert(['localhost','127.0.0.1'].includes(new URL(base).hostname));
(async()=>{
 const browser=await chromium.launch({executablePath:process.env.WORDYLAND_CHROMIUM||'/usr/bin/chromium',args:['--no-sandbox','--use-angle=swiftshader','--enable-unsafe-swiftshader']}),results=[];
 try{
  // Hold the optional external font response: the game must load independently.
  const fontPage=await browser.newPage({reducedMotion:'reduce'});let releaseFonts;
  const fontGate=new Promise(resolve=>releaseFonts=resolve),pendingResources=new Set();
  fontPage.on('request',r=>pendingResources.add(new URL(r.url()).pathname));
  for(const event of ['requestfinished','requestfailed'])fontPage.on(event,r=>pendingResources.delete(new URL(r.url()).pathname));
  await fontPage.addInitScript(()=>{window.fontLoadProbe={dom:0,load:0};document.addEventListener('DOMContentLoaded',()=>window.fontLoadProbe.dom=performance.now(),{once:true});window.addEventListener('load',()=>window.fontLoadProbe.load=performance.now(),{once:true});});
  await fontPage.route('https://fonts.googleapis.com/**',async route=>{await fontGate;await route.abort();});
  // Local diagnostic negative control: the original 5-second load guard must fail.
  if(process.env.WORDYLAND_PERFORMANCE_HOLD_CRITICAL==='1')await fontPage.route('**/pwa.css*',async route=>{await fontGate;await route.abort();});
  const requestedFont=fontPage.waitForRequest(request=>request.url().startsWith('https://fonts.googleapis.com/'));
  try{
   // Attach handlers to both operations immediately: closing after a navigation
   // failure must not leave a rejected font observer masking the original error.
   await Promise.all([fontPage.goto(base,{waitUntil:'load',timeout:5000}),requestedFont]);
   await fontPage.evaluate(()=>wordylandAccount.ready);
   await fontPage.waitForFunction(()=>document.querySelector('link[data-wordyland-fonts]'));
   assert(await fontPage.locator('.startChoices a[href="#allenati"]').isVisible(),'Game is usable while fonts are unavailable');
   console.log('Optional fonts: page load and main choices ready with remote font stylesheet held pending.',JSON.stringify(await fontPage.evaluate(()=>({events:window.fontLoadProbe,navigation:performance.getEntriesByType('navigation').map(n=>({dom:n.domContentLoadedEventEnd,load:n.loadEventEnd}))}))));
  }catch(error){console.error('Optional font precondition failed; pending resource paths:',JSON.stringify([...pendingResources]));console.error('Browser load diagnostic:',JSON.stringify(await fontPage.evaluate(()=>({state:document.readyState,events:window.fontLoadProbe,elapsed:performance.now(),navigation:performance.getEntriesByType('navigation').map(n=>({dom:n.domContentLoadedEventEnd,load:n.loadEventEnd}))})).catch(()=>({unavailable:true}))));throw error;}finally{releaseFonts();await fontPage.close();}
  for(const width of [390,1360]){
   const p=await browser.newPage({viewport:{width,height:844},reducedMotion:'reduce'}),errors=[];p.on('pageerror',e=>errors.push(e.message));
   await p.addInitScript(()=>{window.webglStarts=[];const original=HTMLCanvasElement.prototype.getContext;HTMLCanvasElement.prototype.getContext=function(type,...args){const context=original.call(this,type,...args);if(context&&['webgl','webgl2','experimental-webgl'].includes(type))window.webglStarts.push({canvas:this,at:performance.now()});return context;};});
   await p.goto(base);await p.evaluate(()=>wordylandAccount.ready);await p.waitForTimeout(150);
   const before=await p.evaluate(()=>({contexts:webglStarts.length,mapStarts:webglStarts.filter(x=>document.querySelector('#islandMap').contains(x.canvas)).length,mapTop:Math.round(document.querySelector('#islandMap').getBoundingClientRect().top),viewport:innerHeight}));
   await p.evaluate(()=>{const detail=wordylandAccount.info();window.dispatchEvent(new CustomEvent('wordyland-profile',{detail}));window.dispatchEvent(new CustomEvent('wordyland-profile',{detail}));});
   const repeated=await p.evaluate(()=>webglStarts.length);
   if(!process.env.WORDYLAND_PERFORMANCE_BASELINE)assert.equal(repeated,before.contexts,'Repeated unchanged guest notifications must not recreate WebGL previews');
   if(!process.env.WORDYLAND_PERFORMANCE_BASELINE&&before.mapTop>before.viewport+120)assert.equal(before.mapStarts,0,'Offscreen map must not allocate a WebGL context');
   if(!process.env.WORDYLAND_PERFORMANCE_BASELINE){
    const offscreen=await p.evaluate(()=>({previewTop:document.querySelector('#placePreview').getBoundingClientRect().top,viewport:innerHeight,previewStarts:webglStarts.filter(x=>document.querySelector('#placePreview').contains(x.canvas)).length,circuitRequested:performance.getEntriesByType('resource').some(r=>new URL(r.name).pathname==='/race-circuits.webp')}));
    if(offscreen.previewTop>offscreen.viewport+80)assert.equal(offscreen.previewStarts,0,'Offscreen preview must not allocate a WebGL context either');
    assert.equal(offscreen.circuitRequested,false,'Closed practice does not download its circuit artwork');
    const circuit=p.waitForResponse(r=>new URL(r.url()).pathname==='/race-circuits.webp');await p.locator('details.practiceZone').evaluate(n=>n.open=true);await circuit;await p.locator('details.practiceZone').evaluate(n=>n.open=false);
   }
   await p.locator('#islandMap').scrollIntoViewIfNeeded();await p.waitForFunction(()=>document.querySelector('#islandMap').dataset.render==='3d');
   const after=await p.evaluate(()=>({contexts:webglStarts.length,mapStarts:webglStarts.filter(x=>document.querySelector('#islandMap').contains(x.canvas)).length}));
   if(!process.env.WORDYLAND_PERFORMANCE_BASELINE)assert.equal(after.mapStarts,1,'Scrolling initializes the map once');
   await p.locator('[data-live-place=football]').click();await p.locator('#heroSceneAction').click();await p.locator('#islandMap .sceneReaction').waitFor();
   await p.locator('[data-live-place=island]').click();assert.equal(await p.locator('.islandPin').count(),8);assert.equal(await p.locator('#islandMap canvas').count(),1);
   if(!process.env.WORDYLAND_PERFORMANCE_BASELINE){
    // Choices made before a renderer exists stay in the same game/controller.
    const starts=await p.evaluate(()=>webglStarts.length);
    await p.evaluate(()=>{const holder=document.createElement('section');holder.id='deferredFixture';holder.style.cssText='position:absolute;top:20000px;left:0;width:340px';holder.innerHTML='<div id="deferredScene" style="width:340px;height:300px;position:relative"></div><div id="deferredGame"></div>';document.body.append(holder);window.deferredView=wordylandIsland.mount(holder.querySelector('#deferredScene'),{kind:'ocean',preview:true,playground:holder.querySelector('#deferredGame')});window.deferredToy=holder.querySelector('.worldToy');deferredToy.querySelector('[data-toy-choice="'+deferredToy.dataset.toyTarget+'"]').click();deferredView.update({paused:true});});
    assert.equal(await p.evaluate(()=>webglStarts.length),starts,'An offscreen game works before allocating its renderer');assert.equal(await p.locator('#deferredGame .worldToy').getAttribute('data-toy-step'),'1');
    await p.locator('#deferredScene').scrollIntoViewIfNeeded();await p.locator('#deferredScene[data-render="3d"] canvas').waitFor();assert(await p.evaluate(()=>deferredToy===document.querySelector('#deferredGame .worldToy')),'Same controller and DOM survive lazy scene creation');assert.equal(await p.locator('#deferredGame .worldToy').getAttribute('data-toy-step'),'1');assert.equal(await p.locator('#deferredGame button:disabled').count(),1);
    for(let i=0;i<2;i++){const target=await p.locator('#deferredGame .worldToy').getAttribute('data-toy-target');await p.locator('#deferredGame [data-toy-choice="'+target+'"]').focus();await p.keyboard.press('Enter');}
    assert(await p.locator('#deferredGame .toyLearn').evaluate(n=>n===document.activeElement),'Finishing with a real keyboard gesture focuses the primary exercise action');assert(await p.locator('#deferredGame .toyReplay').isVisible());
    await p.evaluate(()=>{deferredView.dispose();document.querySelector('#deferredFixture').remove();});
   }
   assert.deepEqual(errors,[]);results.push({width,before,afterRepeatedGuestNotifications:repeated,after});await p.close();
  }
  console.log('WebGL initialization measurements:',JSON.stringify(results));
 }finally{await browser.close();}
})().catch(e=>{console.error(e);process.exit(1)});
