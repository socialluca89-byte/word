// Count actual WebGL initialization rather than comparing noisy wall-clock timings.
const {chromium}=require(process.env.WORDYLAND_PLAYWRIGHT_MODULE||'playwright'),assert=require('assert/strict');
const base=process.env.WORDYLAND_TEST_URL;assert(['localhost','127.0.0.1'].includes(new URL(base).hostname));
(async()=>{
 const browser=await chromium.launch({executablePath:process.env.WORDYLAND_CHROMIUM||'/usr/bin/chromium',args:['--no-sandbox','--use-angle=swiftshader','--enable-unsafe-swiftshader']}),results=[];
 try{
  // Hold the optional external font response: the game must load independently.
  const fontPage=await browser.newPage({reducedMotion:'reduce'});let releaseFonts;
  const fontGate=new Promise(resolve=>releaseFonts=resolve);
  await fontPage.route('https://fonts.googleapis.com/**',async route=>{await fontGate;await route.abort();});
  const requestedFont=fontPage.waitForRequest(request=>request.url().startsWith('https://fonts.googleapis.com/'));
  try{
   await fontPage.goto(base,{waitUntil:'load',timeout:5000});
   await fontPage.evaluate(()=>wordylandAccount.ready);
   await fontPage.waitForFunction(()=>document.querySelector('link[data-wordyland-fonts]'));await requestedFont;
   assert(await fontPage.locator('.startChoices a[href="#allenati"]').isVisible(),'Game is usable while fonts are unavailable');
   console.log('Optional fonts: page load and main choices ready with remote font stylesheet held pending.');
  }finally{releaseFonts();await fontPage.close();}
  for(const width of [390,1360]){
   const p=await browser.newPage({viewport:{width,height:844},reducedMotion:'reduce'}),errors=[];p.on('pageerror',e=>errors.push(e.message));
   await p.addInitScript(()=>{window.webglStarts=[];const original=HTMLCanvasElement.prototype.getContext;HTMLCanvasElement.prototype.getContext=function(type,...args){const context=original.call(this,type,...args);if(context&&['webgl','webgl2','experimental-webgl'].includes(type))window.webglStarts.push({canvas:this,at:performance.now()});return context;};});
   await p.goto(base);await p.evaluate(()=>wordylandAccount.ready);await p.waitForTimeout(150);
   const before=await p.evaluate(()=>({contexts:webglStarts.length,mapStarts:webglStarts.filter(x=>document.querySelector('#islandMap').contains(x.canvas)).length,mapTop:Math.round(document.querySelector('#islandMap').getBoundingClientRect().top),viewport:innerHeight}));
   await p.evaluate(()=>{const detail=wordylandAccount.info();window.dispatchEvent(new CustomEvent('wordyland-profile',{detail}));window.dispatchEvent(new CustomEvent('wordyland-profile',{detail}));});
   const repeated=await p.evaluate(()=>webglStarts.length);
   if(!process.env.WORDYLAND_PERFORMANCE_BASELINE)assert.equal(repeated,before.contexts,'Repeated unchanged guest notifications must not recreate WebGL previews');
   if(!process.env.WORDYLAND_PERFORMANCE_BASELINE&&before.mapTop>before.viewport+120)assert.equal(before.mapStarts,0,'Offscreen map must not allocate a WebGL context');
   await p.locator('#islandMap').scrollIntoViewIfNeeded();await p.waitForFunction(()=>document.querySelector('#islandMap').dataset.render==='3d');
   const after=await p.evaluate(()=>({contexts:webglStarts.length,mapStarts:webglStarts.filter(x=>document.querySelector('#islandMap').contains(x.canvas)).length}));
   if(!process.env.WORDYLAND_PERFORMANCE_BASELINE)assert.equal(after.mapStarts,1,'Scrolling initializes the map once');
   await p.locator('[data-live-place=football]').click();await p.locator('#heroSceneAction').click();await p.locator('#islandMap .sceneReaction').waitFor();
   await p.locator('[data-live-place=island]').click();assert.equal(await p.locator('.islandPin').count(),8);assert.equal(await p.locator('#islandMap canvas').count(),1);
   assert.deepEqual(errors,[]);results.push({width,before,afterRepeatedGuestNotifications:repeated,after});await p.close();
  }
  console.log('WebGL initialization measurements:',JSON.stringify(results));
 }finally{await browser.close();}
})().catch(e=>{console.error(e);process.exit(1)});
