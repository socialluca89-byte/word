// Count actual WebGL initialization rather than comparing noisy wall-clock timings.
const {chromium}=require(process.env.WORDYLAND_PLAYWRIGHT_MODULE||'playwright'),assert=require('assert/strict');
const base=process.env.WORDYLAND_TEST_URL;assert(['localhost','127.0.0.1'].includes(new URL(base).hostname));
(async()=>{
 const browser=await chromium.launch({executablePath:process.env.WORDYLAND_CHROMIUM||'/usr/bin/chromium',args:['--no-sandbox','--use-angle=swiftshader','--enable-unsafe-swiftshader']}),results=[];
 try{
  for(const width of [390,1360]){
   const p=await browser.newPage({viewport:{width,height:844},reducedMotion:'reduce'}),errors=[];p.on('pageerror',e=>errors.push(e.message));
   await p.addInitScript(()=>{window.webglStarts=[];const original=HTMLCanvasElement.prototype.getContext;HTMLCanvasElement.prototype.getContext=function(type,...args){const context=original.call(this,type,...args);if(context&&['webgl','webgl2','experimental-webgl'].includes(type))window.webglStarts.push({canvas:this,at:performance.now()});return context;};});
   await p.goto(base);await p.evaluate(()=>wordylandAccount.ready);await p.waitForTimeout(150);
   const before=await p.evaluate(()=>({contexts:webglStarts.length,mapStarts:webglStarts.filter(x=>document.querySelector('#islandMap').contains(x.canvas)).length,mapTop:Math.round(document.querySelector('#islandMap').getBoundingClientRect().top),viewport:innerHeight}));
   if(!process.env.WORDYLAND_PERFORMANCE_BASELINE&&before.mapTop>before.viewport+120)assert.equal(before.mapStarts,0,'Offscreen map must not allocate a WebGL context');
   await p.locator('#islandMap').scrollIntoViewIfNeeded();await p.waitForFunction(()=>document.querySelector('#islandMap').dataset.render==='3d');
   const after=await p.evaluate(()=>({contexts:webglStarts.length,mapStarts:webglStarts.filter(x=>document.querySelector('#islandMap').contains(x.canvas)).length}));
   if(!process.env.WORDYLAND_PERFORMANCE_BASELINE)assert.equal(after.mapStarts,1,'Scrolling initializes the map once');
   await p.locator('[data-live-place=football]').click();await p.locator('#heroSceneAction').click();await p.locator('#islandMap .sceneReaction').waitFor();
   await p.locator('[data-live-place=island]').click();assert.equal(await p.locator('.islandPin').count(),8);assert.equal(await p.locator('#islandMap canvas').count(),1);
   assert.deepEqual(errors,[]);results.push({width,before,after});await p.close();
  }
  console.log('WebGL initialization measurements:',JSON.stringify(results));
 }finally{await browser.close();}
})().catch(e=>{console.error(e);process.exit(1)});
