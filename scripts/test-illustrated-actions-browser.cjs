// Local renderer action contract. No server, account, remote requests or real data.
const {chromium}=require(process.env.WORDYLAND_PLAYWRIGHT_MODULE||'playwright');
const assert=require('assert/strict'),fs=require('fs');
(async()=>{
 const browser=await chromium.launch({executablePath:process.env.WORDYLAND_CHROMIUM||'/usr/bin/chromium',args:['--no-sandbox']});
 try{
  const context=await browser.newContext({viewport:{width:390,height:844},hasTouch:true,reducedMotion:'no-preference'}),p=await context.newPage(),errors=[],writes=[];
  p.on('pageerror',e=>errors.push(e.message));p.on('request',r=>{if(r.method()!=='GET')writes.push(r.method());});
  // about:blank plus locally read scripts. Relative artwork may fail honestly;
  // these tests verify actual action SVGs, animation, controls and cleanup.
  await p.setContent('<div id="scene" style="position:relative;width:340px;height:340px;border-radius:20px"><span class="sceneFallback">Scena</span></div><div id="panel"></div><button id="act">Prova l’azione</button>');
  await p.addStyleTag({content:fs.readFileSync('dist/island.css','utf8')});
  await p.addScriptTag({content:fs.readFileSync('dist/island.js','utf8')});
  await p.evaluate(()=>document.querySelector('#act').onclick=()=>window.testScene.action());
  const mount=async(kind,paused=false)=>p.evaluate(({kind,paused})=>{window.testScene?.dispose();window.testScene=wordylandIsland.mount(document.querySelector('#scene'),{kind,preview:true,paused,equipped:{avatar:'fox'},playground:document.querySelector('#panel')});},{kind,paused});
  for(const kind of ['football','kart','space','treehouse','creative','pets','dino','ocean']){
   await mount(kind);await p.locator('#act').tap();const action=p.locator('#scene .illustratedWorldAction');assert.equal(await action.getAttribute('data-action-kind'),kind);assert.equal(await action.getAttribute('data-motion'),'true');assert(await action.locator('svg').count()>0,'Action creates a real object: '+kind);assert((await action.locator('[role=status]').textContent()).length>8);assert.equal(await p.locator('#panel .worldToy').getAttribute('data-toy-step'),'0','Demonstration is not exercise progress');
   assert(await action.locator('svg,svg *').evaluateAll(ns=>ns.some(n=>getComputedStyle(n).animationName!=='none')),'Gesture starts actual object animation '+kind);
   if(process.env.WORDYLAND_ACTION_CAPTURES){fs.mkdirSync(process.env.WORDYLAND_ACTION_CAPTURES,{recursive:true});await p.locator('#scene').screenshot({path:process.env.WORDYLAND_ACTION_CAPTURES+'/'+kind+'.png',animations:'allow'});}
   await p.waitForFunction(()=>document.querySelector('.illustratedWorldAction')?.dataset.actionState==='settled');
   assert.equal(await action.locator('svg').count()>0,true,'Final state remains visible '+kind);
   await p.evaluate(()=>{for(let i=0;i<8;i++)testScene.action();});assert.equal(await action.count(),1,'Rapid actions never accumulate nodes '+kind);
   if(kind==='creative'){const before=await action.locator('.actionPaintStroke').first().getAttribute('stroke');await p.locator('#act').click();assert.notEqual(await action.locator('.actionPaintStroke').first().getAttribute('stroke'),before,'Mix colors changes actual paint strokes');}
   if(kind==='ocean'){
    const clearFrames=await p.locator('#scene').evaluate(host=>new Promise(resolve=>{const samples=[],until=performance.now()+700;function sample(){const a=host.querySelector('.illustratedActor').getBoundingClientRect(),r=host.querySelector('.illustratedLayer').getBoundingClientRect();samples.push(a.left>=r.left&&a.right<=r.right&&a.top>=r.top&&a.bottom<=r.bottom&&[...host.querySelectorAll('.previewBadge,.sceneReaction,.illustratedActionLabel')].every(n=>{const b=n.getBoundingClientRect();return a.right<=b.left||a.left>=b.right||a.bottom<=b.top||a.top>=b.bottom;}));if(performance.now()<until)requestAnimationFrame(sample);else resolve(samples);}sample();}));assert(clearFrames.every(Boolean),'The ocean demonstration leaves the whole character clear of feedback and caption, including animated frames');
    assert.equal(await action.getAttribute('data-chest-open'),'false','No open treasure before finding objects');
    for(let i=0;i<3;i++){const index=await p.locator('.worldToy').getAttribute('data-toy-target');await p.locator('[data-toy-choice="'+index+'"]').click();}
    assert.equal(await action.getAttribute('data-chest-open'),'true','All three finds really open the chest');await p.locator('.toyReplay').click();assert.equal(await p.locator('.worldToy').getAttribute('data-toy-step'),'0');assert.equal(await p.locator('[data-chest-open=true]').count(),0,'Replay clears the opened chest and completion caption');
   }
   await p.emulateMedia({reducedMotion:'reduce'});await p.locator('#act').click();assert.equal(await action.getAttribute('data-motion'),'false');assert(await action.locator('svg').evaluateAll(ns=>ns.every(n=>getComputedStyle(n).animationName==='none')),'Reduced motion shows final objects without motion');
   await p.emulateMedia({reducedMotion:'no-preference'});await p.evaluate(()=>document.documentElement.dataset.animations='paused');await p.locator('#act').click();assert.equal(await action.getAttribute('data-motion'),'false');await p.evaluate(()=>delete document.documentElement.dataset.animations);
   await mount(kind,true);await p.locator('#act').click();assert.equal(await action.getAttribute('data-motion'),'false','Per-scene pause also respected');
   await p.evaluate(()=>testScene.dispose());assert.equal(await p.locator('.illustratedWorldAction,.worldToy,.sceneViewModes').count(),0,'Leaving removes action, game, controls '+kind);
  }
  await p.waitForTimeout(1050);assert.equal(await p.locator('.illustratedWorldAction').count(),0,'Delayed action cannot revive a disposed scene');assert.deepEqual(errors,[]);assert.deepEqual(writes,[]);
  if(process.env.WORDYLAND_TEST_URL){
   const base=process.env.WORDYLAND_TEST_URL;assert(['localhost','127.0.0.1'].includes(new URL(base).hostname),'Actual app check remains local');
   const ui=await context.newPage();ui.on('pageerror',e=>errors.push(e.message));ui.on('request',r=>{if(r.method()!=='GET')writes.push(r.method());});
   await ui.goto(base,{waitUntil:'domcontentloaded'});await ui.evaluate(()=>wordylandAccount.ready);assert.equal(await ui.evaluate(()=>wordylandAccount.info().username),null);
   await ui.locator('[data-tab=adventures]').click();
   for(const kind of ['football','space','ocean']){
    await ui.locator('[data-destination="'+kind+'"]').click();await ui.waitForFunction(()=>document.querySelector('#placePreview')?.dataset.artReady==='ready');
    const button=ui.locator('#placePlayground .scenePlayButton');await button.tap();
    await ui.waitForFunction(()=>document.querySelector('#placePreview .illustratedWorldAction')?.dataset.actionState==='settled');
    assert.equal(await ui.locator('#placePreview .illustratedWorldAction').getAttribute('data-action-kind'),kind);await ui.locator(kind==='football'?'.actionBall':kind==='space'?'.actionRocket':'.actionChest').waitFor();assert.equal(await ui.locator('#placePlayground .worldToy').getAttribute('data-toy-step'),'0');
    if(kind==='ocean')for(const width of [320,390,1180]){await ui.setViewportSize({width,height:844});await button.tap();assert(await ui.locator('#placePreview').evaluate(host=>{const a=host.querySelector('.illustratedActor').getBoundingClientRect(),r=host.querySelector('.illustratedLayer').getBoundingClientRect();return a.left>=r.left&&a.right<=r.right&&a.top>=r.top&&a.bottom<=r.bottom&&[...host.querySelectorAll('.previewBadge,.sceneReaction,.illustratedActionLabel')].every(n=>{const b=n.getBoundingClientRect();return a.right<=b.left||a.left>=b.right||a.bottom<=b.top||a.top>=b.bottom;});}),'Actual ocean demo keeps the face clear at '+width);if(process.env.WORDYLAND_ACTION_CAPTURES)await ui.locator('#placePreview').screenshot({path:process.env.WORDYLAND_ACTION_CAPTURES+'/actual-ocean-'+width+'.png'});}
    if(kind==='space')assert(await ui.locator('#placePreview').evaluate(host=>{const r=host.querySelector('.actionRocket').getBoundingClientRect();return [...host.querySelectorAll('.illustratedTarget,.previewBadge,.sceneReaction')].every(n=>{const b=n.getBoundingClientRect();return r.right<=b.left||r.left>=b.right||r.bottom<=b.top||r.top>=b.bottom;});}),'Launched rocket remains clear of targets, badge and toast');
    if(process.env.WORDYLAND_ACTION_CAPTURES&&kind!=='ocean')await ui.locator('.placeToy').screenshot({path:process.env.WORDYLAND_ACTION_CAPTURES+'/actual-'+kind+'-390.png'});
   }
   assert.deepEqual(errors,[]);assert.deepEqual(writes,[]);await ui.close();console.log('Actual local app UI passed: real football/space/ocean scenePlayButton triggers ball-in-goal, launched rocket and chest; ocean face clear at three widths, mobile screenshots, guest/no API writes.');
  }
  console.log('Illustrated actions passed: all eight visible objects and gesture animations, final states, touch, rapid clicks, color changes, completed treasure gate, minigame preservation, reduced motion/global and scene pause, cleanup and no API writes.');
 }finally{await browser.close();}
})().catch(e=>{console.error(e);process.exit(1)});
