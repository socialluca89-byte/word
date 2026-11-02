// Real home-to-village gestures on disposable localhost accounts; never production data.
const {chromium}=require(process.env.WORDYLAND_PLAYWRIGHT_MODULE||'playwright');
const assert=require('assert/strict'),fs=require('fs'),{execFileSync}=require('child_process');
const base=process.env.WORDYLAND_TEST_URL,clock=process.env.WORDYLAND_TEST_CLOCK_FILE;
assert(['127.0.0.1','localhost'].includes(new URL(base).hostname));
assert(clock?.startsWith('/tmp/wordyland-browser.'));
const database=process.env.WORDYLAND_BROWSER_DATA+'/wordyland.sqlite';
const captures=process.env.WORDYLAND_HOLIDAY_LAYOUT_SCREENSHOTS;
if(captures)fs.mkdirSync(captures,{recursive:true});
const plan=token=>JSON.parse(execFileSync('python3',['-c',"import sqlite3,sys;d=sqlite3.connect('file:'+sys.argv[1]+'?mode=ro',uri=True);print(d.execute('SELECT plan FROM holiday_days WHERE token=?',(sys.argv[2],)).fetchone()[0])",database,token],{encoding:'utf8'}));
const exact=text=>new RegExp('^'+text.replace(/[.*+?^${}()|[\]\\]/g,'\\$&')+'$');
(async()=>{
 const browser=await chromium.launch({executablePath:process.env.WORDYLAND_CHROMIUM,args:['--no-sandbox','--use-angle=swiftshader','--enable-unsafe-swiftshader']});
 try{
  const p=await browser.newPage({viewport:{width:390,height:844},reducedMotion:'reduce'}),errors=[],writes=[],measurements=[];
  p.on('pageerror',e=>errors.push(e.message));
  p.on('request',r=>{if(r.method()==='POST'){const action=new URL(r.url()).searchParams.get('action');if(!['presence-heartbeat','presence-leave'].includes(action))writes.push(action);}});
  fs.writeFileSync(clock,'2026-11-02 12:00:00');
  let entry=0;
  async function enter(stage,width,selector,wait=true){
   await p.setViewportSize({width,height:844});
   // A new query creates a real document; a same-hash goto would not refresh fixture state.
   await p.goto(base+'/?holiday_layout='+stage+'-'+width+'-'+(++entry));
   await p.evaluate(async()=>wordylandAccount.ready);
   await p.locator('.holidayPortal[href="#festivita"]').click();
   if(wait){await p.locator(selector).waitFor();await p.locator('#holidayWorld[data-art-ready="ready"]').waitFor();}
  }
  async function visibleFocus(selector){
   const focused=await p.locator(selector).evaluate(node=>{
    const r=node.getBoundingClientRect(),center=document.elementFromPoint(r.left+r.width/2,r.top+r.height/2);
    return {active:document.activeElement===node,top:r.top,bottom:r.bottom,clear:center===node||node.contains(center)};
   });
   assert(focused.active,'The actual action receives keyboard focus '+selector);
   assert(focused.top>=10&&focused.bottom<=844,'Focused action is inside the viewport with anchor clearance '+JSON.stringify(focused));
   assert(focused.clear,'No toolbar or overlay covers the focused action '+selector);
  }
  async function checkLayout(stage,width,selector,maxOffset){
   const before=writes.length;
   await enter(stage,width,selector);
   const geometry=await p.evaluate(selector=>{
    const rect=sel=>{const r=document.querySelector(sel).getBoundingClientRect();return {x:r.x,y:r.y,width:r.width,height:r.height,bottom:r.bottom,right:r.right};};
    const panel=rect('.holidayPanel'),jump=rect('#holidayJump'),action=rect(selector),scene=rect('.holidayStage'),pane=rect('.holidayActionPane');
    return {width:innerWidth,entryScrollY:scrollY,panel,jump,action,scene,pane,actionOffset:action.y-panel.y,overflow:document.documentElement.scrollWidth>innerWidth};
   },selector);
   assert.equal(writes.length,before,'Opening and viewing a village cannot start or answer a challenge');
   assert.equal(geometry.overflow,false,'No page overflow '+stage+' '+width);
   assert(geometry.jump.y>=0&&geometry.jump.bottom<=844&&geometry.jump.height>=48,'Direct action is visible on the first real portal screen '+JSON.stringify(geometry));
   assert(geometry.actionOffset<=maxOffset,'Substantial content-order improvement, not only a harness scroll '+stage+' '+width+': '+geometry.actionOffset);
   if(width>=1000)assert(geometry.pane.x>=geometry.scene.right,'Desktop scene and live action sit side by side');
   if(captures)await p.screenshot({path:captures+'/holiday-'+stage+'-'+width+'.png'});
   await p.locator('#holidayJump').focus();await p.keyboard.press('Enter');
   await visibleFocus(selector);
   assert.equal(writes.length,before,'The direct action is a focus/scroll command, never an automatic POST');
   assert.equal(new URL(p.url()).hash,'#festivita','A local jump preserves the village route');
   measurements.push({stage,...geometry});
  }
  for(const width of[320,390,1360])await checkLayout('guest',width,'#holidayLogin',width>=1000?250:760);
  const profile=await p.evaluate(async()=>{const a=wordylandAccount;await a.connect(await a.request('register',{username:'holiday_layout_browser',password:'Holiday-layout-fixture-123',adult:true}));return a.createProfile('Esploratrice');});
  // While the owned state is delayed, the direct action stays inert and honest.
  let releaseState,reachedState;
  const held=new Promise(resolve=>releaseState=resolve),reached=new Promise(resolve=>reachedState=resolve);
  await p.route('**/api.php?action=holiday-state&profile=*',async route=>{const response=await route.fetch();reachedState();await held;await route.fulfill({response});});
  await enter('hydrating',390,'#holidayStart',false);await reached;
  assert(await p.locator('#holidayJump').isDisabled());
  assert.match(await p.locator('#holidayJump').textContent(),/Prepariamo/);
  releaseState();await p.locator('#holidayStart').waitFor();await p.unroute('**/api.php?action=holiday-state&profile=*');
  for(const width of[320,390,1360])await checkLayout('new',width,'#holidayStart',width>=1000?300:1000);
  const state=async()=>p.evaluate(async id=>(await wordylandAccount.request('holiday-state&profile='+id)).events.find(e=>e.id==='christmas'),profile.id);
  const baseline=await p.evaluate(async id=>(await wordylandAccount.request('hub&profile='+id)).wallet,profile.id);
  // A committed POST with a lost reply must give the header the real GET-retry target.
  let releaseStart,reachedStart,startPosts=0;
  const startHeld=new Promise(resolve=>releaseStart=resolve),startReached=new Promise(resolve=>reachedStart=resolve);
  await p.route('**/api.php?action=holiday-start',async route=>{startPosts++;const response=await route.fetch();assert.equal(response.status(),200);reachedStart();await startHeld;await route.abort('failed');});
  await p.locator('#holidayStart').click();await startReached;
  assert.equal(await p.locator('#holidayJump').isDisabled(),true,'The header is inert while the owned POST is pending');
  assert.equal(await p.locator('#holidayJump').getAttribute('aria-busy'),'true');
  assert.match(await p.locator('#holidayJump').textContent(),/Prepariamo/);
  releaseStart();await p.locator('#holidayVerify').waitFor();
  assert.equal(await p.locator('#holidayJump').getAttribute('aria-busy'),'false');
  assert.equal(await p.locator('#holidayJump').getAttribute('aria-controls'),'holidayVerify');
  assert.equal(await p.locator('#holidayJump').textContent(),'Vai al recupero');
  assert.equal(await p.getByRole('button',{name:'Verifica e riprendi',exact:true}).count(),1,'The navigation shortcut and actual recovery action have distinct accessible names');
  await p.locator('#holidayJump').focus();await p.keyboard.press('Enter');await visibleFocus('#holidayVerify');
  assert.equal(startPosts,1,'Jumping to recovery does not repeat a committed start POST');
  await p.keyboard.press('Enter');await p.locator('#holidayPrompt').waitFor();
  assert.equal(startPosts,1,'The explicit recovery command reconciles through GET only');
  await p.unroute('**/api.php?action=holiday-start');
  const daily=(await state()).session,questions=plan(daily.token);
  async function answerOne(){
   const current=(await state()).session,q=questions[current.step];
   if(q.mode==='build'){
    for(const letter of q.answer){const tile=p.locator('[data-holiday-tile]:not(:disabled)').filter({hasText:exact(letter===' '?'␣':letter)}).first();await tile.focus();await p.keyboard.press('Enter');}
    await p.locator('#holidayBuildCheck').click();
   }else if(q.options?.length&&['meaning','word','gap'].includes(q.mode)){
    const choice=p.locator('[data-holiday-answer]').filter({hasText:exact(q.answer)}).first();await choice.focus();await p.keyboard.press('Enter');
   }else{await p.locator('#holidayAnswer').fill(q.answer);await p.locator('#holidayAnswer').press('Enter');}
   if(current.step===2)await p.locator('#holidayAnother').waitFor();
   else await p.waitForFunction(step=>document.querySelector('.holidayStep strong')?.textContent.startsWith(step+' /'),current.step+1);
  }
  await answerOne();
  for(const width of[320,390,1360])await checkLayout('pending',width,'#holidayPrompt',width>=1000?500:1100);
  await p.locator('#holidayHint').click();await p.locator('.holidayHint').waitFor();
  await p.locator('#holidayPause').click();await p.locator('.lessonGrid').waitFor();await p.goBack();await p.locator('#holidayPrompt').waitFor();
  assert.equal((await state()).session.token,daily.token);assert.equal((await state()).session.step,1);
  await answerOne();await answerOne();
  for(const width of[320,390,1360])await checkLayout('completed',width,'#holidayAnother',width>=1000?600:1200);
  const preserved=await p.evaluate(async id=>(await wordylandAccount.request('hub&profile='+id)).wallet,profile.id);
  assert.equal(preserved.coins,baseline.coins);assert.equal(preserved.xp,baseline.xp);
  // Information was moved after play, not removed; all four seasons remain reachable.
  const beforeTour=writes.length;
  assert.equal(await p.locator('[data-holiday]').count(),4);
  await p.locator('.holidayRules>summary').focus();await p.keyboard.press('Enter');assert.match(await p.locator('.holidayRules p').textContent(),/Gli aiuti contano/);
  await p.locator('.holidayAlbum>summary').focus();await p.keyboard.press('Enter');assert.equal(await p.locator('.holidayRewards article').count(),27);assert(await p.locator('.holidayRewards article').first().isVisible());
  assert.match(await p.locator('#elfArrivalCard').textContent(),/Birillo/);assert.match(await p.locator('#elfArrivalCard').textContent(),/8 dicembre/);
  await p.locator('[data-holiday=easter]').focus();await p.keyboard.press('Enter');
  assert.equal(await p.evaluate(()=>document.activeElement.dataset.holiday),'easter','Replacing the festival controls preserves the chosen keyboard focus');
  assert.equal(await p.locator('#holidayStart,#holidayAnother').count(),0);
  assert.match(await p.locator('#holidayJump').textContent(),/calendario/);
  await p.locator('#holidayJump').focus();await p.keyboard.press('Enter');await visibleFocus('.holidayCalendar>summary');
  assert.equal(await p.locator('.holidayCalendar').getAttribute('open'),'');
  await p.locator('[data-calendar-visit=christmas]').focus();await p.keyboard.press('Enter');await visibleFocus('#holidayEventTitle');
  assert.match(await p.locator('#holidayEventTitle').textContent(),/Natale/);assert(await p.locator('#holidayAnother').isVisible());
  assert.equal(writes.length,beforeTour,'Calendars, rules, albums and local jumps never write rewards or answers');
  await p.locator('[data-tab=missions]').click();await p.locator('.holidayPortal[href="#festivita"]').click();await p.locator('#holidayAnother').waitFor();assert.equal(new URL(p.url()).hash,'#festivita');
  const after=await p.evaluate(async id=>(await wordylandAccount.request('hub&profile='+id)).wallet,profile.id);assert.deepEqual(after,preserved,'Touring the reordered information preserves every earned item');
  // A failed read still gives the header an explicit route to the real retry control.
  await p.context().setOffline(true);await p.locator('#holidayRefresh').click();await p.locator('#holidayBody').getByText(/Nessun premio viene inventato offline/).waitFor();
  assert.equal(await p.locator('#holidayJump').isDisabled(),false);await p.locator('#holidayJump').focus();await p.keyboard.press('Enter');await visibleFocus('#holidayBody button');await p.context().setOffline(false);
  assert.deepEqual(errors,[]);
  if(captures)fs.writeFileSync(captures+'/holiday-layout-measurements.json',JSON.stringify({measurements,errors},null,2));
  console.log('Holiday layout passed: real portal entry at320/390/1360, visible48px+ direct action with zero automatic POST, compact scene/action hierarchy and desktop columns, delayed profile state, keyboard focus/anchor clearance, pause/back, all festivals/calendar/rules/albums/Birillo, unchanged rewards and explicit offline retry.');
 }finally{await browser.close();}
})().catch(e=>{console.error(e);process.exit(1)});
