// Local-only integration: reviewed class content -> explicit device copy -> real cold offline play.
const assert=require('assert/strict'),fs=require('fs'),path=require('path'),{randomBytes,createHash}=require('crypto');
const {chromium}=require(process.env.WORDYLAND_PLAYWRIGHT_MODULE||'playwright');
const base=process.env.WORDYLAND_TEST_URL;assert(base&&['127.0.0.1','localhost'].includes(new URL(base).hostname),'Disposable localhost only');
const origin=new URL(base).origin,packKey='wordylandClassOfflinePacksV1',suffix=randomBytes(4).toString('hex');
const captures=process.env.WORDYLAND_CLASS_PROGRAM_OFFLINE_SCREENSHOTS;
if(captures){assert(['/workspace/','/tmp/'].some(root=>path.resolve(captures).startsWith(root)));fs.mkdirSync(captures,{recursive:true});}
(async()=>{
 const browser=await chromium.launch({executablePath:process.env.WORDYLAND_CHROMIUM||'/usr/bin/chromium',args:['--no-sandbox','--use-angle=swiftshader','--enable-unsafe-swiftshader']});
 const errors=[],external=[],offlinePrivate=[],onlinePresenceHandoff=[],checks=[],contexts=[];let releaseHeld;
 const request=(page,action,data)=>page.evaluate(({action,data})=>wordylandAccount.request(action,data),{action,data});
 const readStore=page=>page.evaluate(key=>JSON.parse(localStorage.getItem(key)||'null'),packKey);
 async function openProgram(page){await page.evaluate(()=>wordylandClassProgram.open());await page.locator('#classProgramHub:not([hidden]) #programDownloadOffline').waitFor();}
 async function exported(page){await page.locator('#programDownloadOffline').click();await page.locator('#programOfflineStatus a').waitFor();const href=await page.locator('#programOfflineStatus a').getAttribute('href'),url=new URL(href,base);assert.equal(url.pathname,'/offline.html');assert.match(url.searchParams.get('programma'),/^[a-f0-9]{32}$/);assert.equal([...url.searchParams.keys()].join(','),'programma');return {url:url.href,id:url.searchParams.get('programma')};}
 function verifyPack(pack,expected,{lettersOnly=false}={}){
  assert.deepEqual(Object.keys(pack).sort(),['version','fingerprint','words','training'].sort());assert.equal(pack.version,1);assert.match(pack.fingerprint,/^[a-f0-9]{64}$/);
  assert.deepEqual(Object.keys(pack.training).sort(),['letters','blocks','words','foundationWords','wordPacks'].sort());
  assert.deepEqual(pack.words,expected.words.map(row=>row.slice(0,3)),'Offline rows preserve only reviewed canonical translations');
  for(const word of pack.training.words){assert.deepEqual(Object.keys(word).sort(),['id','meaning','emoji','topic','wordOnly','phrase','phraseMeaning','gap'].sort());assert.equal(word.wordOnly,true);assert.equal(word.phrase,word.id);assert.equal(word.gap,'___');}
  for(const wordPack of pack.training.wordPacks){assert.deepEqual(Object.keys(wordPack).sort(),['id','title','icon','wordOnly','words'].sort());assert.equal(wordPack.wordOnly,true);assert(wordPack.words.every(id=>pack.words.some(row=>row[0]===id)));}
  for(const letter of pack.training.letters)assert.deepEqual(Object.keys(letter).sort(),['id','lower','it','en'].sort());
  for(const block of pack.training.blocks)assert.deepEqual(Object.keys(block).sort(),['id','title','letters'].sort());
  const data={words:pack.words,training:pack.training};assert.equal(pack.fingerprint,createHash('sha256').update(JSON.stringify(data)).digest('hex'));
  if(lettersOnly){assert.equal(pack.words.length,0);assert.equal(pack.training.words.length,0);assert.equal(pack.training.wordPacks.length,0);assert.equal(pack.training.letters.length,26);assert.equal(pack.training.blocks.length,13);}
 }
 async function geometry(page,label){for(const width of [320,390,1360]){await page.setViewportSize({width,height:900});assert(await page.evaluate(()=>document.documentElement.scrollWidth<=innerWidth),label+' has no horizontal overflow at '+width);const buttons=page.locator('.offlineModes button');assert(await buttons.evaluateAll(nodes=>nodes.every(node=>node.getBoundingClientRect().height>=44)),label+' touch targets at '+width);if(captures)await page.screenshot({path:path.join(captures,label+'-'+width+'.png')});}await page.setViewportSize({width:390,height:844});}
 async function completeWords(page,stateKey,packId,total){
  let steps=0;while(!await page.locator('#offlineFoundationAgain').count()){
   assert(++steps<=total,'No extra phrase in reviewed word-only copy');
   const s=await page.evaluate(({stateKey,packId})=>JSON.parse(localStorage.getItem(stateKey)).sessions[packId],{stateKey,packId});
   const id=s.words[s.step===8?0:Math.floor(s.step/4)],mode=s.step===8?'phrase':['model','recognize','build','recall'][s.step%4];
   assert.match(await page.locator('#offlineFoundationStatus').textContent(),new RegExp(s.step+' / '+total+' '));
   if(mode==='model')await page.locator('#offlineWordModel').click();
   else if(mode==='build'){
    for(const char of id){const tile=page.locator('[data-offline-tile]:not(:disabled)').filter({hasText:new RegExp('^'+(char===' '?'␣':char)+'$')}).first();await tile.focus();await page.keyboard.press('Enter');}await page.locator('#offlineWordBuild').click();
   }else if(mode==='recall'){await page.locator('#offlineWordAnswer').fill(id);await page.locator('#offlineWordWrite button').click();}
   else await page.locator('[data-offline-word="'+id+'"]').click();
   await page.locator('#offlineWordNext').click();
  }
  const state=await page.evaluate(stateKey=>JSON.parse(localStorage.getItem(stateKey)),stateKey);assert.equal(state.sessions[packId].step,total);assert.equal(state.completed,1);return state;
 }
 try{
  const context=await browser.newContext({viewport:{width:390,height:844},reducedMotion:'reduce',hasTouch:true});contexts.push(context);
  await context.addInitScript(()=>{if('speechSynthesis'in window)speechSynthesis.getVoices=()=>[];});
  const page=await context.newPage();page.on('pageerror',error=>errors.push(error.message));let offlinePhase=false;
  page.on('request',req=>{const url=new URL(req.url());if(offlinePhase&&(req.method()!=='GET'||url.pathname.endsWith('.php')||['/curriculum.json','/training.json'].includes(url.pathname))){const entry={path:url.pathname,action:url.searchParams.get('action'),method:req.method(),referrer:(()=>{try{return new URL(req.headers().referer).pathname;}catch{return null;}})()};if(entry.action==='presence-leave'&&entry.method==='POST'&&['/','/index.html'].includes(entry.referrer))onlinePresenceHandoff.push(entry);else offlinePrivate.push(entry);}});
  await page.route('**/*',route=>{if(new URL(route.request().url()).origin===origin)return route.continue();external.push(route.request().url());return route.abort();});
  await page.goto(base);await page.evaluate(()=>wordylandAccount.ready);await page.locator('#offlineReady').waitFor();await page.waitForFunction(()=>Boolean(navigator.serviceWorker.controller));
  const username='cp_offline_'+suffix,teacher='Synthetic private teacher '+suffix,className='Synthetic private class '+suffix;
  const profile=await page.evaluate(async({username,suffix})=>{const a=wordylandAccount;await a.connect(await a.request('register',{username,password:'Offline-program-synthetic-123',adult:true}));return a.createProfile('Offline child '+suffix);},{username,suffix});
  const club=await request(page,'club-create',{profile:profile.id,name:className,consent:true});
  let saved=await request(page,'class-program-save',{club:club.id,schoolYear:'2026/2027',title:'Reviewed worksheet '+suffix,teacherLabel:teacher,method:'Only teacher material',examGoal:'',units:[{id:'whats-this',status:'active'}],expectedRevision:0});
  await request(page,'class-program-publish',{program:saved.program.id,expectedRevision:saved.program.editVersion,confirmed:true});
  const manifest=await page.evaluate(()=>wordylandClassProgram.refresh());assert.equal(manifest.mode,'class');await openProgram(page);assert.equal(await page.locator('.appTools a[data-class-offline]').getAttribute('href'),'#programma-classe','The ordinary offline entry directs an assigned profile to its class download');
  await page.locator('#classProgramHub .programActions a[href="#"]').click();await page.locator('.raceHero').waitFor({state:'visible'});assert.equal(await page.evaluate(()=>location.hash),'','Class programme world link returns to the existing home route');await openProgram(page);
  await page.locator('#classProgramHub .programHeading a[href="#allenati"]').click();await page.locator('#questContent a[href="#"]').waitFor();await page.locator('#questContent a[href="#"]').click();await page.locator('.raceHero').waitFor({state:'visible'});assert.equal(await page.evaluate(()=>location.hash),'','Assigned lesson world link returns to the existing home route');await openProgram(page);checks.push('Both class programme and assigned-lesson world links return to the visible existing home');
  const first=await exported(page),store=await readStore(page);assert.equal(Object.keys(store.packs).length,1);verifyPack(store.packs[first.id],manifest);
  const encoded=JSON.stringify(store);for(const privateValue of [username,teacher,className,profile.nickname])assert(!encoded.includes(privateValue),'No identity or teacher metadata in exported lessons');
  assert(!/"(?:profile|club|teacher|session|token|csrf|account|active|expected|api)"\s*:/.test(encoded));
  const second=await exported(page);assert.equal(second.id,first.id);assert.deepEqual(await readStore(page),store,'Repeated export is content-idempotent');
  const urls=await page.evaluate(async()=>{const urls=[];for(const name of await caches.keys())for(const req of await(await caches.open(name)).keys())urls.push(req.url);return urls;});assert(urls.every(url=>!url.includes('.php')&&!url.includes('programma=')),'Private packages and APIs are not added to CacheStorage');
  checks.push('UI export contains only strict reviewed content; canonical meanings, SHA-256 fingerprint, opaque link and duplicate-export idempotence');

  // Real cold offline navigation uses the installed service worker, not a mocked document.
  offlinePhase=true;await context.setOffline(true);await page.goto(first.url);await page.locator('#offlineTopic').waitFor();assert.equal(await page.locator('.accountArea').count(),0);assert.equal(await page.locator('#offlineTopic option').count(),1);
  const allowed=new Set(manifest.words.map(row=>row[0]));assert((await page.locator('.offlineOptions button').allTextContents()).every(word=>allowed.has(word.trim())),'No global distractor leaks into the copied worksheet');
  await geometry(page,'class-offline-revision');await page.locator('#offlineFoundationOpen').click();await page.locator('[data-offline-pack]').first().waitFor();assert.equal(await page.locator('[data-offline-letter-block]').count(),0);
  const packId=await page.locator('[data-offline-pack]').first().getAttribute('data-offline-pack'),stateKey='wordylandClassOfflineTrainingV1:'+first.id;
  await page.locator('[data-offline-pack]').first().click();await page.locator('#offlineWordModel').waitFor();await geometry(page,'class-offline-spelling');
  // A rejected local write must leave the confirmed step unchanged, including in the scoped namespace.
  await page.evaluate(stateKey=>{window.restoreClassOfflineSet=Storage.prototype.setItem;Storage.prototype.setItem=function(key,value){if(key===stateKey)throw new DOMException('Synthetic quota','QuotaExceededError');return window.restoreClassOfflineSet.call(this,key,value);};},stateKey);
  await page.locator('#offlineWordModel').click();assert.match(await page.locator('#offlineFoundationStatus').textContent(),/non ha confermato/);assert.equal(await page.locator('#offlineWordNext').isVisible(),false);assert.equal(await page.evaluate(({stateKey,packId})=>JSON.parse(localStorage.getItem(stateKey)).sessions[packId].step,{stateKey,packId}),0);await page.evaluate(()=>Storage.prototype.setItem=window.restoreClassOfflineSet);await page.reload();await page.locator('#offlineFoundationOpen').click();await page.locator('[data-offline-pack="'+packId+'"]').click();await page.locator('#offlineWordModel').waitFor();
  await completeWords(page,stateKey,packId,8);assert.equal(await page.evaluate(()=>localStorage.getItem('wordylandOfflineTrainingV1')),null,'Scoped practice does not alter the legacy public namespace');
  await page.reload();await page.locator('#offlineFoundationOpen').click();assert.equal(await page.evaluate(stateKey=>JSON.parse(localStorage.getItem(stateKey)).completed,stateKey),1,'Reload does not duplicate completion');
  checks.push('Actual offline worksheet: approved alternatives only, eight word-only steps, keyboard composition, scoped quota failure, isolated progress and idempotent reload');

  for(const query of ['programma=','programma=not-a-pack','programma='+randomBytes(16).toString('hex'),'programma='+first.id+'&programma='+first.id]){
   await page.goto(new URL('offline.html?'+query,base).href);await page.locator('#offlineWork').getByText(/non è disponibile su questo dispositivo/).waitFor();assert.equal(await page.locator('#offlineFoundationOpen').isDisabled(),true);assert.equal(await page.locator('.offlineOptions button').count(),0);assert.equal(await page.locator('[data-offline-pack]').count(),0);
  }
  await page.goto(first.url);await page.evaluate(({packKey,id})=>{const s=JSON.parse(localStorage.getItem(packKey));s.packs[id].fingerprint='invalid';localStorage.setItem(packKey,JSON.stringify(s));},{packKey,id:first.id});await page.reload();await page.locator('#offlineWork').getByText(/non è disponibile su questo dispositivo/).waitFor();assert.equal(await page.locator('#offlineFoundationOpen').isDisabled(),true);await page.evaluate(({packKey,store})=>localStorage.setItem(packKey,JSON.stringify(store)),{packKey,store});
  assert.deepEqual(offlinePrivate,[],'Scoped offline navigation never requests APIs or the global curriculum/training catalogue');
  checks.push('Empty, invalid, missing, duplicate and corrupt package references fail closed without global fallback or catalogue/API requests');

  // The public offline path remains distinct and still includes its existing ninth phrase step.
  await page.goto(new URL('offline.html',base).href);await page.locator('#offlineFoundationOpen').click();await page.locator('[data-offline-pack="first"]').click();await page.locator('#offlineWordModel').waitFor();await completeWords(page,'wordylandOfflineTrainingV1','first',9);
  assert.equal(await page.evaluate(stateKey=>JSON.parse(localStorage.getItem(stateKey)).completed,stateKey),1,'Legacy practice preserves the separate class result');
  checks.push('The public offline first pack retains nine steps and does not overwrite class-bound local progress');

  offlinePhase=false;await context.setOffline(false);await page.goto(base);await page.evaluate(()=>wordylandAccount.ready);
  const managed=await request(page,'class-program-manage&club='+club.id);saved=await request(page,'class-program-save',{club:club.id,schoolYear:'2026/2027',title:'Letters reviewed '+suffix,teacherLabel:teacher,method:'Only teacher material',examGoal:'',units:[{id:'alphabet-it-en',status:'active'}],expectedRevision:managed.program.editVersion});await request(page,'class-program-publish',{program:saved.program.id,expectedRevision:saved.program.editVersion,confirmed:true});
  const lettersManifest=await page.evaluate(()=>wordylandClassProgram.refresh());await openProgram(page);const letters=await exported(page),letterStore=await readStore(page);assert.notEqual(letters.id,first.id);verifyPack(letterStore.packs[letters.id],lettersManifest,{lettersOnly:true});assert.equal(Object.keys(letterStore.packs).length,2);
  offlinePhase=true;const privateBoundary=offlinePrivate.length;await context.setOffline(true);await page.goto(letters.url);await page.locator('#offlineWork').getByText(/scaricate le lettere/).waitFor();await page.locator('#offlineFoundationOpen').click();assert.equal(await page.locator('[data-offline-letter-block]').count(),13);assert.equal(await page.locator('[data-offline-pack]').count(),0);
  const letterIds=letterStore.packs[letters.id].training.blocks[0].letters,blockId=letterStore.packs[letters.id].training.blocks[0].id;await page.locator('[data-offline-letter-block="'+blockId+'"]').click();await geometry(page,'class-offline-letters');
  for(const id of letterIds){await page.locator('#offlineLetterContinue').click();await page.locator('#offlineLetterNext').click();assert.match(await page.locator('#offlineLetterMode').textContent(),/lettura/);await page.locator('[data-offline-letter="'+id+'"]').click();await page.locator('#offlineLetterNext').click();}
  await page.locator('#offlineLettersAgain').waitFor();assert.equal(await page.evaluate(id=>JSON.parse(localStorage.getItem('wordylandClassOfflineTrainingV1:'+id)).letterCompleted,letters.id),1);assert.equal(offlinePrivate.length,privateBoundary);
  checks.push('An explicitly assigned alphabet-only copy preserves all 26 existing letters/13 pairs, supports guided reading offline, and never falls back to word topics');

  // Hold only the next GET and change the profile before export confirmation.
  offlinePhase=false;await context.setOffline(false);await page.goto(base);await page.evaluate(()=>wordylandAccount.ready);await page.evaluate(()=>wordylandClassProgram.refresh());await openProgram(page);
  const beforeLate=await readStore(page);let reached;const seen=new Promise(resolve=>reached=resolve),held=new Promise(resolve=>releaseHeld=resolve);let intercept=true;
  await page.route('**/api.php?action=class-program-state*',async route=>{if(!intercept)return route.continue();intercept=false;const response=await route.fetch();reached();await held;await route.fulfill({response});});
  await page.locator('#programDownloadOffline').click();await seen;
  await page.evaluate(suffix=>wordylandAccount.createProfile('Other offline child '+suffix),suffix);releaseHeld();await page.waitForFunction(()=>wordylandClassProgram.state()?.mode==='legacy');assert.deepEqual(await readStore(page),beforeLate);assert.equal(await page.locator('#programOfflineStatus a').count(),0,'A delayed export cannot claim success for a new profile');await page.unroute('**/api.php?action=class-program-state*');
  checks.push('A delayed programme response after a profile change neither writes a cross-profile copy nor displays a stale success link');

  await page.evaluate(id=>wordylandAccount.selectProfile(id),profile.id);await page.evaluate(()=>wordylandClassProgram.refresh());await openProgram(page);
  const savedStore=await page.evaluate(key=>localStorage.getItem(key),packKey);await page.evaluate(packKey=>{localStorage.removeItem(packKey);window.restoreExportSet=Storage.prototype.setItem;Storage.prototype.setItem=function(key,value){if(key===packKey)throw new DOMException('Synthetic export quota','QuotaExceededError');return window.restoreExportSet.call(this,key,value);};},packKey);
  await page.locator('#programDownloadOffline').click();await page.waitForFunction(()=>document.querySelector('#programDownloadOffline')?.disabled===false);assert.equal(await page.locator('#programOfflineStatus a').count(),0);assert.doesNotMatch(await page.locator('#programOfflineStatus').textContent(),/^Pronto\./);assert.equal(await page.evaluate(key=>localStorage.getItem(key),packKey),null);await page.evaluate(({packKey,savedStore})=>{Storage.prototype.setItem=window.restoreExportSet;localStorage.setItem(packKey,savedStore);},{packKey,savedStore});
  checks.push('An export storage failure leaves no package and never displays a success link');
  await page.locator('#headerLogout').click();await page.locator('#headerLogin').waitFor();await page.waitForFunction(()=>wordylandClassProgram.state()?.mode==='legacy'&&document.querySelector('.appTools a[data-class-offline]')?.getAttribute('href')==='offline.html');assert.equal(await page.locator('.appTools a[data-class-offline]').getAttribute('href'),'offline.html','Logout restores the unchanged public offline entry');checks.push('The ordinary offline CTA uses the assigned class hub while logged in and restores the public path after logout');
  assert.deepEqual(errors,[]);const publicFont='https://fonts.googleapis.com/css2?family=DM+Sans:wght@400;500;600;700&family=Outfit:wght@400;500;600;700&display=optional';assert(external.every(url=>url===publicFont),'Only the existing fixed public font stylesheet may be requested off-origin; every request is aborted');console.log(JSON.stringify({status:'passed',syntheticOnly:true,checks,onlinePresenceHandoff:onlinePresenceHandoff.length,blockedPublicFontRequests:external.length,limits:['The departing online document may send its pre-existing presence-leave signal; offline documents may not call APIs','Browser voices disabled: no assertion about real pronunciation','Offline progress remains on this device and is not teacher-register evidence']}));
 }finally{releaseHeld?.();await browser.close();}
})().catch(error=>{console.error(error);process.exit(1);});
