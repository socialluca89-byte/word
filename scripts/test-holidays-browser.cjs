// Local-only seasonal journeys. Never production identities, clock or data.
const {chromium}=require(process.env.WORDYLAND_PLAYWRIGHT_MODULE||'playwright'),assert=require('assert/strict'),fs=require('fs'),{execFileSync}=require('child_process');
const base=process.env.WORDYLAND_TEST_URL;assert(['localhost','127.0.0.1'].includes(new URL(base).hostname));
const clock=process.env.WORDYLAND_TEST_CLOCK_FILE;assert(clock&&clock.startsWith('/tmp/wordyland-browser.'));
(async()=>{const browser=await chromium.launch({executablePath:process.env.WORDYLAND_CHROMIUM,args:['--no-sandbox','--use-angle=swiftshader','--enable-unsafe-swiftshader']});
try{
 const p=await browser.newPage({viewport:{width:390,height:844},reducedMotion:'reduce'}),errors=[];p.on('pageerror',e=>errors.push(e.message));
 await p.addInitScript(()=>{window.holidayScenes=[];document.addEventListener('DOMContentLoaded',()=>{const add=THREE.Scene.prototype.add;THREE.Scene.prototype.add=function(...ns){holidayScenes.push(this);return add.apply(this,ns);};});});
 await p.goto(base+'/#festivita');await p.locator('#holidayLogin').waitFor();assert.equal(await p.locator('#holidayStart').count(),0);assert(await p.locator('.holidayPortal').count());
 const fixture=await p.evaluate(async()=>{const a=wordylandAccount;await a.ready;await a.connect(await a.request('register',{username:'holiday_browser',password:'Holiday-browser-password-123',adult:true}));const profile=await a.createProfile('Piccolo esploratore');return profile;});
 await p.reload();await p.locator('#holidayStart').waitFor();assert.equal(await p.locator('.holidayRewards article').count(),27);await p.locator('.holidayAlbum>summary').focus();await p.keyboard.press('Enter');await p.locator('.holidayRewards article').first().waitFor();await p.locator('.holidayAlbum>summary').click();assert.equal(await p.locator('.holidayRewards article').first().isVisible(),false);
 assert(await p.evaluate(()=>{let found=false;holidayScenes.slice(-1).forEach(s=>s.traverse(n=>{if(n.userData.holiday==='christmas')found=true;}));return found;}),'Actual Christmas village geometry');
 await p.locator('#holidayStart').dblclick();await p.locator('#holidayPrompt').waitFor();
 const lease=execFileSync('python3',['-c',"import sqlite3,json,sys;d=sqlite3.connect(sys.argv[1]);d.row_factory=sqlite3.Row;print(json.dumps(dict(d.execute('SELECT * FROM holiday_days WHERE profile_id=?',(int(sys.argv[2]),)).fetchone())))",process.env.WORDYLAND_BROWSER_DATA+'/wordyland.sqlite',String(fixture.id)],{encoding:'utf8'});const saved=JSON.parse(lease),plan=JSON.parse(saved.plan);
 await p.locator('[data-holiday-answer]').filter({hasText:plan[0].answer}).first().click();await p.locator('#holidayAnswer').waitFor();await p.locator('#holidayHint').click();await p.locator('.holidayHint').waitFor();
 await p.locator('#holidayPause').click();await p.locator('.lessonGrid').waitFor();assert.equal(await p.locator('.lessonCard').count(),13);await p.goBack();await p.locator('#holidayAnswer').waitFor();assert.match(await p.locator('.holidayHint').textContent(),new RegExp(plan[1].answer));
 await p.reload();await p.locator('#holidayAnswer').waitFor();await p.locator('#holidayAnswer').fill('wrong');await p.locator('#holidayWrite button').click();await p.locator('#holidayMessage').getByText(/Proviamo insieme/).waitFor();assert.match(await p.locator('.holidayHint').textContent(),new RegExp(plan[1].answer));
 await p.locator('#holidayAnswer').fill(plan[1].answer);await p.locator('#holidayWrite button').click();await p.waitForFunction(()=>document.querySelector('.holidayStep strong')?.textContent.startsWith('2 /'));
 // Simulate committed reply loss; refresh must recover the final gift exactly once.
 let posts=0;await p.route('**/api.php?action=holiday-answer',async r=>{posts++;const reply=await r.fetch();assert.equal(reply.status(),200);await r.abort('failed');});
 await p.locator('#holidayAnswer').fill(plan[2].answer);await p.locator('#holidayWrite button').click();await p.getByRole('button',{name:'Verifica e riprendi',exact:true}).click();await p.locator('#holidayChallenge').getByText('La missione di oggi è completata!').waitFor();assert.equal(posts,1);await p.unroute('**/api.php?action=holiday-answer');
 const wallet=await p.evaluate(async id=>(await wordylandAccount.request('hub&profile='+id)).wallet,fixture.id);assert.equal(wallet.coins,0);assert.equal(wallet.xp,0);assert.equal(wallet.inventory.filter(x=>x==='souvenir-christmas-1').length,1);
 await p.locator('[data-holiday=easter]').click();await p.locator('#holidayChallenge').getByText(/sono chiuse/).waitFor();assert.equal(await p.locator('#holidayStart').count(),0);await p.evaluate(()=>location.hash='#natale');await p.locator('#holidayChallenge').getByText(/completata/).waitFor();assert.equal(await p.locator('[data-holiday=christmas]').getAttribute('aria-pressed'),'true');
 for(const width of [320,390,768,1360]){await p.setViewportSize({width,height:844});assert(await p.evaluate(()=>document.documentElement.scrollWidth<=innerWidth),'Holiday overflow '+width);assert(await p.locator('[data-holiday]').evaluateAll(ns=>ns.every(n=>n.getBoundingClientRect().height>=48)));}
 // Earn the whole finite collection through real confirmed fixture exercises.
 const modeSet=new Set(['meaning','write']);
 for(const day of [2,3,4,5,6]){
  fs.writeFileSync(clock,'2026-11-0'+day+' 12:00:00');await p.locator('#holidayRefresh').click();await p.locator('#holidayStart').click();await p.locator('#holidayPrompt').waitFor();
  const next=JSON.parse(execFileSync('python3',['-c',"import sqlite3,json,sys;d=sqlite3.connect(sys.argv[1]);print(d.execute('SELECT plan FROM holiday_days WHERE profile_id=? AND day=?',(int(sys.argv[2]),sys.argv[3])).fetchone()[0])",process.env.WORDYLAND_BROWSER_DATA+'/wordyland.sqlite',String(fixture.id),'2026-11-0'+day],{encoding:'utf8'}));
  for(let step=0;step<3;step++){
   const q=next[step];modeSet.add(q.mode);await p.waitForFunction(n=>document.querySelector('.holidayStep strong')?.textContent.startsWith(n+' /'),step);
   if(q.mode==='build'){
    for(const char of q.answer){const tile=p.locator('[data-holiday-tile]:not(:disabled)').filter({hasText:new RegExp('^'+(char===' '?'␣':char)+'$')}).first();await tile.focus();await p.keyboard.press('Enter');}
    await p.locator('[data-holiday-undo="0"]').click();assert.equal(await p.locator('[data-holiday-undo]').count(),q.answer.length-1);
    while(await p.locator('[data-holiday-undo]').count())await p.locator('[data-holiday-undo="0"]').click();
    for(const char of q.answer)await p.locator('[data-holiday-tile]:not(:disabled)').filter({hasText:new RegExp('^'+(char===' '?'␣':char)+'$')}).first().click();await p.locator('#holidayBuildCheck').click();
   }else if(['meaning','word','gap'].includes(q.mode))await p.locator('[data-holiday-answer]').filter({hasText:new RegExp('^'+q.answer.replace(/[.*+?^${}()|[\]\\]/g,'\\$&')+'$')}).first().click();
   else{await p.locator('#holidayAnswer').fill(q.answer);await p.locator('#holidayWrite button').click();}
  }
  await p.locator('#holidayChallenge').getByText('La missione di oggi è completata!').waitFor();
 }
 assert.deepEqual([...modeSet].sort(),['build','gap','meaning','word','write']);
 const earned=await p.evaluate(async id=>(await wordylandAccount.request('hub&profile='+id)).wallet,fixture.id);assert(['reindeer','penguin','snowpal'].every(id=>earned.inventory.includes(id)));assert.equal(earned.coins,0);assert.equal(earned.xp,0);
 // New pilots really appear in the passport, preview, kart, football and space.
 for(const avatar of ['reindeer','penguin','snowpal']){
  await p.goto(base+'/#personaggi');await p.locator('[data-item="'+avatar+'"]').click();await p.locator('[data-item="'+avatar+'"]').getByText('In uso ✓').waitFor();assert.equal(await p.locator('.passport [data-racer]').getAttribute('data-racer'),avatar);
  assert.equal(await p.locator('.passport [data-racer]').evaluate(n=>getComputedStyle(n).backgroundImage),'none');
  for(const kind of ['kart','football','space']){
   await p.locator('[data-character-play="'+kind+'"]').click();await p.locator('#readyChallenge').waitFor();assert(await p.evaluate(avatar=>{let found=false;holidayScenes.slice(-1).forEach(s=>s.traverse(n=>{if(n.userData.character===avatar)found=true;}));return found;},avatar),'Actual earned pilot '+avatar+' in '+kind);await p.locator('#pauseQuest').click();await p.locator('.startChoices a[href="#personaggi"]').click();await p.locator('[data-item="'+avatar+'"]').waitFor();
  }
 }
 if(process.env.WORDYLAND_WINTER_CHARACTERS_SCREENSHOT){
  await p.setViewportSize({width:1040,height:720});await p.evaluate(()=>{const panel=document.createElement('section');panel.id='winterCharacterPreview';panel.style.cssText='display:grid;grid-template-columns:repeat(3,1fr);gap:12px;width:960px;padding:20px;background:#edf4ee;border-radius:24px;color:#315549';document.body.append(panel);window.winterPreviewViews=[];for(const [id,name,hat] of [['reindeer','Rudy la renna','hat-santa'],['penguin','Pip il pinguino','hat-gift'],['snowpal','Fiocco il pupazzo','hat-snowman']]){const card=document.createElement('article'),title=document.createElement('h3'),scene=document.createElement('div');title.textContent=name;title.style.cssText='font-size:22px;text-align:center';scene.style.cssText='position:relative;width:290px;height:250px';scene.className='missionWorld';card.append(title,scene);panel.append(card);winterPreviewViews.push(wordylandIsland.mount(scene,{kind:'pets',preview:true,equipped:{avatar:id,pet:id,hat,neck:'neck-scarf',effect:'effect-stars'}}));}});
  await p.locator('#winterCharacterPreview canvas').last().waitFor();await p.locator('#winterCharacterPreview').screenshot({path:process.env.WORDYLAND_WINTER_CHARACTERS_SCREENSHOT});await p.evaluate(()=>{winterPreviewViews.forEach(v=>v.dispose());document.querySelector('#winterCharacterPreview').remove();});await p.setViewportSize({width:390,height:844});
 }
 await p.goto(base+'/#natale');await p.locator('#holidayRefresh').waitFor();assert.equal(await p.locator('.holidayRewards article').filter({hasText:'Già tuo'}).count(),23);
 if(process.env.WORDYLAND_HOLIDAY_SCREENSHOT){await p.setViewportSize({width:390,height:844});await p.locator('#holidayWorld').screenshot({path:process.env.WORDYLAND_HOLIDAY_SCREENSHOT});}
 fs.writeFileSync(clock,'2027-01-08 00:00:00');await p.locator('#holidayRefresh').click();await p.locator('#holidayChallenge').getByText(/sono chiuse/).waitFor();assert.equal(await p.locator('#holidayStart').count(),0);
 await p.locator('a[href="#personaggi"]').filter({hasText:'Indossa'}).click();await p.locator('[data-style=badge]').click();await p.locator('[data-item=souvenir-christmas-1]').click();await p.locator('[data-item=souvenir-christmas-1]').getByText('In uso ✓').waitFor();assert.equal(await p.locator('[data-item=snowpal]').count(),0); // badge filter remains scoped; collected characters are in Personaggio.
 await p.goto(base+'/#festivita');await p.locator('#holidayRefresh').waitFor();const beforeOffline=await p.evaluate(async id=>(await wordylandAccount.request('hub&profile='+id)).wallet,fixture.id);await p.context().setOffline(true);await p.locator('#holidayRefresh').click();await p.locator('#holidayBody').getByText(/Nessun premio viene inventato offline/).waitFor();await p.context().setOffline(false);const afterOffline=await p.evaluate(async id=>(await wordylandAccount.request('hub&profile='+id)).wallet,fixture.id);assert.deepEqual(afterOffline,beforeOffline);
 assert.deepEqual(errors,[]);console.log('Holiday browser passed: guest invitation, actual village, daily double-click, hints/wrong/paused/reloaded mission, unchanged 13 topics, lost committed reply with one gift, closed events, permanent wearable reward, five activity types and cookie keyboard undo, three earned pilots in all three games, no forged coins, four viewports and touch targets.');
}finally{await browser.close();}})().catch(e=>{console.error(e);process.exit(1)});
