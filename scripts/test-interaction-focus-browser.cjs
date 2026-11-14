// Keyboard transitions and honest sound state; synthetic localhost guest only.
const {chromium}=require(process.env.WORDYLAND_PLAYWRIGHT_MODULE||'playwright');
const assert=require('assert/strict'),fs=require('fs');
const base=process.env.WORDYLAND_TEST_URL;
assert(['localhost','127.0.0.1'].includes(new URL(base).hostname),'Never inspect real accounts');
const captures=process.env.WORDYLAND_INTERACTION_SCREENSHOTS;
if(captures)fs.mkdirSync(captures,{recursive:true});
const content=JSON.parse(fs.readFileSync('dist/training.json','utf8'));
(async()=>{
 const browser=await chromium.launch({executablePath:process.env.WORDYLAND_CHROMIUM,args:['--no-sandbox','--use-angle=swiftshader','--enable-unsafe-swiftshader']});
 const checks=[],errors=[],writes=[];
 const record=(name,passed,details={})=>checks.push({name,passed:Boolean(passed),...details});
 const watch=page=>{page.on('pageerror',error=>errors.push(error.message));page.on('request',request=>{if(request.method()!=='GET'&&new URL(request.url()).pathname.endsWith('/api.php'))writes.push(new URL(request.url()).searchParams.get('action'));});};
 try{
  const p=await browser.newPage({viewport:{width:390,height:844},reducedMotion:'reduce'});watch(p);
  await p.goto(base+'/#allenamento');await p.locator('[data-training-block=ae]').waitFor();
  const economy=await p.evaluate(()=>({stats:structuredClone(stats),stars}));
  for(const width of [320,390,1360]){
   await p.setViewportSize({width,height:844});
   const letters=p.locator('.trainingPaths a[href="#trainingLetters"]');await letters.focus();await p.keyboard.press('Enter');
   const first=await p.evaluate(()=>({id:document.activeElement.dataset.trainingBlock,hash:location.hash,box:(()=>{const r=document.querySelector('[data-training-block=ae]').getBoundingClientRect();return {top:r.top,bottom:r.bottom,height:r.height};})()}));
   record('letters-focus-'+width,first.id==='ae'&&first.hash==='#allenamento'&&first.box.top>=0&&first.box.bottom<=844,first);
   await p.keyboard.press('Tab');record('letters-next-tab-'+width,await p.evaluate(()=>document.activeElement.dataset.trainingBlock==='bc'));
   record('all-paths-retained-'+width,await p.locator('[data-training-block]').count()===13&&await p.locator('[data-training-pack]').count()===10&&await p.locator('.alphabetGrid button').count()===26);
   record('training-no-page-overflow-'+width,await p.evaluate(()=>document.documentElement.scrollWidth<=innerWidth));
  }
  await p.setViewportSize({width:390,height:844});await p.locator('#openPhonics').click();await p.locator('[data-phonics-group=s]').click();
  const group=content.phonics.groups.find(group=>group.id==='s'),answers=['continue','name',group.words[1],group.letter,group.words[2]||group.words[0],'sound'];
  for(let step=0;step<6;step++){
   if(step===0){await p.locator('#phonicsModelContinue').focus();await p.keyboard.press('Enter');}
   else{await p.locator('[data-phonics-choice="'+answers[step]+'"]').focus();await p.keyboard.press('Enter');}
   await p.locator('#phonicsNext').focus();await p.keyboard.press('Enter');
  }
  await p.locator('#phonicsAgain').waitFor();
  const completion=await p.evaluate(()=>{const title=document.querySelector('#trainingHub h2'),r=title.getBoundingClientRect(),stored=JSON.parse(localStorage.getItem('wordylandPhonicsGuestV1'));return {focused:document.activeElement===title,titleVisible:r.top>=0&&r.bottom<=innerHeight,step:stored.sessions.s.step,done:stored.sessions.s.done};});
  record('phonics-completion-focus',completion.focused&&completion.titleVisible,completion);
  record('phonics-completion-saved',completion.step===6&&completion.done);
  assert.deepEqual(await p.evaluate(()=>({stats:structuredClone(stats),stars})),economy,'Guided focus changes never alter classic game points/progress');
  if(captures){await p.locator('#trainingHub').scrollIntoViewIfNeeded();await p.screenshot({path:captures+'/interaction-phonics-complete-390.png'});}
  await p.goto(base+'/');await p.evaluate(()=>wordylandAccount.ready);await p.locator('.practiceZone>summary').click();
  await p.locator('#editPlayer').focus();await p.keyboard.press('Enter');await p.locator('#nickname').waitFor();
  record('guest-editor-opening-focus',await p.evaluate(()=>document.activeElement.id==='nickname'));
  await p.locator('#nickname').fill('Bozza locale');await p.locator('#cancelPlayer').focus();await p.keyboard.press('Enter');
  record('guest-editor-cancel-focus',await p.evaluate(()=>document.activeElement.id==='editPlayer'&&document.querySelector('#playerEditor').hidden));
  record('guest-cancel-no-rename',await p.locator('#playerDisplay').textContent()!=='Bozza locale');
  await p.locator('#editPlayer').click();await p.locator('#nickname').fill('Esploratore focus');
  if(captures)await p.screenshot({path:captures+'/interaction-nickname-390.png'});
  await p.locator('#nickname').press('Enter');
  record('guest-editor-save-focus',await p.evaluate(()=>document.activeElement.id==='editPlayer'&&document.querySelector('#playerEditor').hidden));
  record('guest-editor-local-name',await p.locator('#playerDisplay').textContent()==='Esploratore focus'&&await p.evaluate(()=>wordylandAccount.info().id===null));
  const editorButton=await p.locator('#editPlayer').boundingBox();record('guest-editor-touch-target',editorButton&&editorButton.height>=48,{height:editorButton?.height});
  for(const mode of ['absent','constructor-error','resume-error','resume-retry','success']){
   const page=await browser.newPage({viewport:{width:390,height:844},reducedMotion:'reduce'});watch(page);
   await page.addInitScript(mode=>{
    window.interactionAudio={mode,calls:0,resumes:0};
    class FakeAudioContext{constructor(){interactionAudio.calls++;if(mode==='constructor-error')throw Error('Synthetic unavailable audio context');this.state='suspended';}resume(){interactionAudio.resumes++;if(mode==='resume-error'||mode==='resume-retry'&&interactionAudio.resumes===1)return Promise.reject(Error('Synthetic audio resume failure'));this.state='running';return Promise.resolve();}}
    Object.defineProperty(window,'AudioContext',{configurable:true,value:mode==='absent'?undefined:FakeAudioContext});Object.defineProperty(window,'webkitAudioContext',{configurable:true,value:undefined});
   },mode);
   await page.goto(base+'/');await page.locator('#islandSound').focus();await page.keyboard.press('Enter');
   await page.evaluate(()=>new Promise(resolve=>queueMicrotask(()=>queueMicrotask(resolve))));
   // Starting the real deferred map must not overwrite a separate sound result.
   await page.locator('#islandMap').scrollIntoViewIfNeeded();await page.locator('#islandMap[data-kind=island]').waitFor();
   const state=await page.locator('#islandSound').evaluate(button=>({pressed:button.getAttribute('aria-pressed'),label:button.getAttribute('aria-label'),icon:button.textContent,status:document.querySelector('#islandSoundStatus')?.textContent,live:document.querySelector('#islandSoundStatus')?.getAttribute('role'),polite:document.querySelector('#islandSoundStatus')?.getAttribute('aria-live')}));
   if(mode==='success'){
    record('sound-success-state',state.pressed==='true'&&state.label==='Disattiva i suoni'&&state.icon==='🔊',state);
    await page.locator('#islandSound').focus();await page.keyboard.press('Enter');
    record('sound-off-state',await page.locator('#islandSound').evaluate(button=>button.getAttribute('aria-pressed')==='false'&&button.getAttribute('aria-label')==='Attiva i suoni'&&button.textContent==='🔇'));
   }else{
    record('sound-failure-'+mode,state.pressed==='false'&&state.label==='Attiva i suoni'&&state.icon==='🔇'&&state.live==='status'&&state.polite==='polite'&&/non.*disponibili/i.test(state.status),state);
    if(mode==='resume-retry'){
     await page.locator('#islandSound').click();await page.evaluate(()=>new Promise(resolve=>queueMicrotask(()=>queueMicrotask(resolve))));
     record('sound-retry-clears-old-error',await page.locator('#islandSound').evaluate(button=>button.getAttribute('aria-pressed')==='true'&&button.getAttribute('aria-label')==='Disattiva i suoni'&&document.querySelector('#islandSoundStatus').textContent===''));
    }
   }
   const toolbarSizes=[];
   for(const width of [320,390,1360]){await page.setViewportSize({width,height:844});toolbarSizes.push(await page.locator('.mapToolbar button').evaluateAll(buttons=>({width:innerWidth,overflow:document.documentElement.scrollWidth>innerWidth,targets:buttons.map(button=>{const r=button.getBoundingClientRect();return {id:button.id,width:r.width,height:r.height};})})));}
   record('sound-touch-target-'+mode,toolbarSizes.every(size=>!size.overflow&&size.targets.length===5&&size.targets.every(button=>button.width>=48&&button.height>=48)),{sizes:toolbarSizes});
   await page.close();
  }
  const delayed=await browser.newPage({viewport:{width:390,height:844},reducedMotion:'reduce'});watch(delayed);
  await delayed.addInitScript(()=>{
   let count=0;class FakeAudioContext{constructor(){this.state='suspended';}resume(){count++;if(count===1)return new Promise((resolve,reject)=>window.rejectFirstSound=reject);this.state='running';return Promise.resolve();}}
   Object.defineProperty(window,'AudioContext',{configurable:true,value:FakeAudioContext});Object.defineProperty(window,'webkitAudioContext',{configurable:true,value:undefined});
  });
  await delayed.goto(base+'/');await delayed.locator('#islandSound').click();await delayed.locator('#islandSound').click();await delayed.locator('#islandSound').click();
  await delayed.evaluate(()=>{rejectFirstSound(Error('Late synthetic resume failure'));return new Promise(resolve=>queueMicrotask(()=>queueMicrotask(resolve)));});
  record('late-sound-failure-is-ignored',await delayed.locator('#islandSound').evaluate(button=>button.getAttribute('aria-pressed')==='true'&&button.getAttribute('aria-label')==='Disattiva i suoni'));
  await delayed.close();record('no-private-write',writes.length===0,{writes});record('no-page-error',errors.length===0,{errors});
  const result={status:checks.every(row=>row.passed)?'passed':'failed',checks,voiceQuality:'not tested: all audio context behavior is synthetic, no microphone or remote audio service'};
  if(process.env.WORDYLAND_INTERACTION_REPORT)fs.writeFileSync(process.env.WORDYLAND_INTERACTION_REPORT,JSON.stringify(result,null,2)+'\n');
  console.log(JSON.stringify(result));assert(checks.every(row=>row.passed),'Interaction focus/state checks failed: '+checks.filter(row=>!row.passed).map(row=>row.name).join(', '));
 }finally{await browser.close();}
})().catch(error=>{console.error(error);process.exit(1)});
