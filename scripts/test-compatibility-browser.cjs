const {chromium}=require(process.env.WORDYLAND_PLAYWRIGHT_MODULE||'playwright'),assert=require('assert/strict'),fs=require('fs');
const base=process.env.WORDYLAND_TEST_URL;assert(['localhost','127.0.0.1'].includes(new URL(base).hostname));
(async()=>{
 const browser=await chromium.launch({executablePath:process.env.WORDYLAND_CHROMIUM||'/usr/bin/chromium',args:['--no-sandbox','--use-angle=swiftshader','--enable-unsafe-swiftshader']});
 try{
  const baseline=process.env.WORDYLAND_COMPAT_BASELINE;
  for(const mode of (baseline?['no-webgl']:['normal','no-webgl','no-observers','no-three','blocked-script','html-script','old-apis'])){
   const p=await browser.newPage({viewport:{width:390,height:844},reducedMotion:'reduce'}),errors=[];p.on('pageerror',e=>errors.push(e.message));
   await p.route('https://fonts.googleapis.com/**',r=>r.abort());
   if(baseline)await p.route('**/island.js?*',r=>r.fulfill({contentType:'application/javascript',body:fs.readFileSync(baseline,'utf8')}));
   if(mode==='no-webgl')await p.addInitScript(()=>{const original=HTMLCanvasElement.prototype.getContext;HTMLCanvasElement.prototype.getContext=function(type,...args){return /webgl/.test(type)?null:original.call(this,type,...args);};});
   if(mode==='no-observers')await p.addInitScript(()=>{delete window.IntersectionObserver;delete window.ResizeObserver;});
   if(mode==='no-three')await p.route('**/three.min.js?*',r=>r.abort());
   if(mode==='blocked-script')await p.route('**/data.js?*',r=>r.abort());
   if(mode==='html-script')await p.route('**/data.js?*',r=>r.fulfill({status:202,contentType:'text/html',body:'<html><body>Verification needed</body></html>'}));
   if(mode==='old-apis')await p.addInitScript(()=>{delete window.fetch;});
   await p.goto(base);
   if(baseline){await p.locator('#islandMap').scrollIntoViewIfNeeded();await p.waitForFunction(()=>document.querySelector('#islandMap').dataset.render==='fallback');console.log('BEFORE no WebGL map choices:',await p.locator('.islandFallbackChoices button').count());await p.close();continue;}
   const notice=p.locator('#loadSupport');
   if(['blocked-script','html-script','old-apis'].includes(mode)){
    await notice.waitFor({state:'visible'});
    assert.match(await notice.textContent(),/Non cancellare i dati/);
    assert.match(await p.locator('#loadSupportTitle').textContent(),mode==='old-apis'?/aggiornamento/:/non si sono caricate/);
    assert(await notice.evaluate(el=>el.scrollWidth<=el.clientWidth),'Readable at 390px');
    assert.equal(await p.locator('.startChoices a').count(),3,'Recovery notice does not remove existing destinations');
   }else{
    await p.evaluate(()=>wordylandAccount.ready);assert(await notice.isHidden(),'No unnecessary warnings for working or optional 3D paths');
    if(mode!=='normal'){
     await p.locator('#islandMap').scrollIntoViewIfNeeded();await p.waitForFunction(()=>document.querySelector('#islandMap').dataset.render==='fallback');
     const expected=['treehouse','pets','creative','kart','football','space','ocean','dino'];
     if(mode==='no-webgl'&&process.env.WORDYLAND_BROWSER_SCREENSHOT)await p.locator('#islandMap').screenshot({path:process.env.WORDYLAND_BROWSER_SCREENSHOT});
     assert.deepEqual(await p.locator('.islandFallbackChoices button').evaluateAll(nodes=>nodes.map(n=>n.dataset.place)),expected);
     for(const id of expected){
      const button=p.locator('.islandFallbackChoices [data-place='+id+']');assert(await button.isVisible());assert(await button.evaluate(el=>el.getBoundingClientRect().height>=44));await button.click();
      assert(await p.locator('#heroSceneLearn').isVisible());assert.equal(await p.locator('.islandFallbackChoices').count(),0,'Disposed map has no stale overlay');
      await p.locator('[data-live-place=island]').click();assert.equal(await p.locator('.islandFallbackChoices button').count(),8,'Rebuild does not duplicate lightweight choices');
     }
     await p.locator('.islandFallbackChoices [data-place=kart]').click();await p.locator('#heroSceneLearn').click();await p.locator('#pauseQuest').waitFor({state:'visible'});await p.locator('#pauseQuest').click();await p.locator('[data-tab=lessons]').click();
     assert.equal(await p.locator('[data-lesson]').count(),13,'All existing lesson cards retained');
    }
    assert.deepEqual(errors,[],mode+' has no uncaught errors');
   }
   console.log('Compatibility scenario PASS:',mode);await p.close();
  }
 }finally{await browser.close();}
})().catch(e=>{console.error(e);process.exit(1)});
