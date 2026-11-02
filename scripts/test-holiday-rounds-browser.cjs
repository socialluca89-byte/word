// Repeated seasonal challenges use disposable localhost accounts and saved answers only.
const {chromium}=require(process.env.WORDYLAND_PLAYWRIGHT_MODULE||'playwright');
const assert=require('assert/strict'),fs=require('fs'),{execFileSync}=require('child_process');
const base=process.env.WORDYLAND_TEST_URL,clock=process.env.WORDYLAND_TEST_CLOCK_FILE;
assert(['localhost','127.0.0.1'].includes(new URL(base).hostname),'Never use production data');
assert(clock?.startsWith('/tmp/wordyland-browser.'),'Disposable server clock only');
const database=process.env.WORDYLAND_BROWSER_DATA+'/wordyland.sqlite';
const captures=process.env.WORDYLAND_ROUNDS_SCREENSHOTS;
if(captures)fs.mkdirSync(captures,{recursive:true});
const readFixture=(sql,args=[])=>JSON.parse(execFileSync('python3',['-c',
 'import sqlite3,json,sys;d=sqlite3.connect("file:"+sys.argv[1]+"?mode=ro",uri=True);d.row_factory=sqlite3.Row;print(json.dumps([dict(r) for r in d.execute(sys.argv[2],json.loads(sys.argv[3]))]))',
 database,sql,JSON.stringify(args)],{encoding:'utf8'}));
const storedPlan=token=>{
 for(const table of ['holiday_days','holiday_rounds']){
  const row=readFixture('SELECT plan FROM '+table+' WHERE token=?',[token])[0];
  if(row)return JSON.parse(row.plan);
 }
 throw Error('Missing synthetic round '+token);
};
const exact=text=>new RegExp('^'+text.replace(/[.*+?^${}()|[\]\\]/g,'\\$&')+'$');
(async()=>{
 const browser=await chromium.launch({executablePath:process.env.WORDYLAND_CHROMIUM,args:['--no-sandbox','--use-angle=swiftshader','--enable-unsafe-swiftshader']});
 try{
  const errors=[],watch=p=>p.on('pageerror',e=>errors.push(e.message));
  const p=await browser.newPage({viewport:{width:390,height:844},reducedMotion:'reduce'});watch(p);
  fs.writeFileSync(clock,'2026-11-02 12:00:00');
  await p.goto(base+'/#festivita');await p.locator('#holidayLogin').waitFor();
  assert.equal(await p.locator('#holidayAnother').count(),0,'Guest cannot claim seasonal challenges');
  const credentials={username:'holiday_rounds_browser',password:'Seasonal-rounds-fixture-123',adult:true};
  const profile=await p.evaluate(async credentials=>{const a=wordylandAccount;await a.ready;await a.connect(await a.request('register',credentials));return a.createProfile('Primo esploratore');},credentials);
  const second=await p.evaluate(async()=>wordylandAccount.createProfile('Altro esploratore'));
  await p.evaluate(async id=>wordylandAccount.selectProfile(id),profile.id);
  await p.reload();await p.locator('#holidayStart').waitFor();
  const state=async(page=p)=>page.evaluate(async()=>{const a=wordylandAccount;return a.request('holiday-state&profile='+a.info().id);});
  const christmas=async(page=p)=>(await state(page)).events.find(e=>e.id==='christmas');
  const wallet=async(page=p)=>page.evaluate(async()=>{const a=wordylandAccount;return (await a.request('hub&profile='+a.info().id)).wallet;});
  const baseline=await wallet();
  const original=await christmas();assert.equal(original.repeatable,true);assert.equal(original.dailyComplete,false);
  assert.equal(original.session,null);
  let firstStarts=0;const startCount=r=>{if(r.method()==='POST'&&new URL(r.url()).searchParams.get('action')==='holiday-start')firstStarts++;};p.on('request',startCount);
  await p.locator('#holidayStart').dblclick();await p.locator('#holidayPrompt').waitFor();
  assert.equal(firstStarts,1,'Double initial action allocates one daily mission');p.off('request',startCount);
  const daily=(await christmas()).session;assert.equal(daily.round,1);
  assert.equal(readFixture('SELECT COUNT(*) AS n FROM holiday_rounds WHERE profile_id=?',[profile.id])[0].n,0);
  // Wrong answers and help are supported before a real saved correct reply.
  let q=storedPlan(daily.token)[0];
  await p.locator('[data-holiday-answer]').filter({hasNotText:exact(q.answer)}).first().click();
  await p.locator('#holidayMessage').getByText(/Proviamo insieme/).waitFor();
  assert.equal((await christmas()).session.step,0);
  assert.deepEqual(await wallet(),baseline,'Wrong answer never grants an item or charge');
  await p.locator('#holidayHint').click();await p.locator('.holidayHint').waitFor();
  assert.match(await p.locator('.holidayHint').textContent(),new RegExp(q.answer));
  async function answerOne(page=p,keyboard=false){
   const current=(await christmas(page)).session;
   assert(current&&!current.done);
   const question=storedPlan(current.token)[current.step];
   await page.waitForFunction(step=>document.querySelector('.holidayStep strong')?.textContent.startsWith(step+' /'),current.step);
   if(question.mode==='build'){
    for(const char of question.answer){const tile=page.locator('[data-holiday-tile]:not(:disabled)').filter({hasText:exact(char===' '?'␣':char)}).first();if(keyboard){await tile.focus();await page.keyboard.press('Enter');}else await tile.click();}
    await page.locator('#holidayBuildCheck').click();
   }else if(['meaning','word','gap'].includes(question.mode)){
    const choice=page.locator('[data-holiday-answer]').filter({hasText:exact(question.answer)}).first();
    if(keyboard){await choice.focus();await page.keyboard.press('Enter');}else await choice.click();
   }else{
    await page.locator('#holidayAnswer').fill(question.answer);
    if(keyboard)await page.locator('#holidayAnswer').press('Enter');else await page.locator('#holidayWrite button').click();
   }
   if(current.step===2)await page.locator('#holidayAnother').waitFor();
   else await page.waitForFunction(step=>document.querySelector('.holidayStep strong')?.textContent.startsWith(step+' /'),current.step+1);
  }
  for(let i=0;i<3;i++)await answerOne(p,true);
  await p.locator('#holidayChallenge').getByText('La missione di oggi è completata!').waitFor();
  const oneDay=await christmas();assert.equal(oneDay.dailyComplete,true);
  assert((await wallet()).inventory.includes('elf-boy'));
  assert(!(await wallet()).inventory.includes('reindeer'),'Next character still requires saved exercises');
  assert((await wallet()).inventory.includes('souvenir-christmas-1'));
  assert(!(await wallet()).inventory.includes('souvenir-christmas-2'));
  const afterDaily=await wallet();
  assert.equal(await p.locator('.holidayExerciseGoal').count(),1);
  assert(await p.locator('.holidayExerciseGoal').getAttribute('data-holiday-next-reward'));
  for(const width of [320,390,1360]){
   await p.setViewportSize({width,height:844});
   assert(await p.evaluate(()=>document.documentElement.scrollWidth<=innerWidth),'Round controls fit '+width);
   const box=await p.locator('#holidayAnother').boundingBox();assert(box&&box.height>=48,'Large next-round target '+width);
   if(captures){await p.locator('#holidayChallenge').scrollIntoViewIfNeeded();await p.screenshot({path:captures+'/holiday-rounds-'+width+'.png'});}
  }
  await p.setViewportSize({width:390,height:844});
  // The bonus start commits once even when its reply is lost; recovery is GET only.
  let starts=0;await p.route('**/api.php?action=holiday-start',async route=>{
   const body=route.request().postDataJSON();assert.equal(body.another,true);assert.equal(body.after,daily.token);
   starts++;const reply=await route.fetch();assert.equal(reply.status(),200);await route.abort('failed');
  });
  await p.locator('#holidayAnother').dblclick();
  await p.getByRole('button',{name:'Verifica e riprendi',exact:true}).click();
  await p.locator('#holidayPrompt').waitFor();
  assert.equal(starts,1,'Lost bonus reply and double action send one POST');
  await p.unroute('**/api.php?action=holiday-start');
  const bonus=(await christmas()).session;assert.equal(bonus.round,2);assert.notEqual(bonus.token,daily.token);
  assert.equal(readFixture('SELECT COUNT(*) AS n FROM holiday_rounds WHERE profile_id=?',[profile.id])[0].n,1);
  assert.deepEqual(await wallet(),afterDaily,'Opening the challenge alone does not earn anything');
  await answerOne();const confirmed=(await christmas()).session;
  await p.locator('#holidayHint').click();await p.locator('.holidayHint').waitFor();
  const hintText=await p.locator('.holidayHint').textContent();
  await p.locator('#holidayPause').click();await p.locator('.lessonGrid').waitFor();
  await p.goBack();await p.locator('#holidayPrompt').waitFor();
  assert.equal((await christmas()).session.token,bonus.token);assert.equal((await christmas()).session.step,confirmed.step);
  assert.equal(await p.locator('.holidayHint').textContent(),hintText);
  await p.reload();await p.locator('#holidayPrompt').waitFor();assert.equal((await christmas()).session.token,bonus.token);
  // A second device resumes this exact bonus token and retained help.
  const device=await browser.newPage({viewport:{width:1360,height:950},reducedMotion:'reduce'});watch(device);
  await device.goto(base);await device.evaluate(()=>wordylandAccount.ready);
  await device.evaluate(async({credentials,id})=>{const a=wordylandAccount;await a.connect(await a.request('login',credentials));await a.selectProfile(id);},{credentials,id:profile.id});
  await device.goto(base+'/#festivita');await device.locator('#holidayPrompt').waitFor();
  assert.equal((await christmas(device)).session.token,bonus.token);assert.equal((await christmas(device)).session.step,confirmed.step);
  assert.equal(await device.locator('.holidayHint').textContent(),hintText);
  await answerOne(device,true);await answerOne(device,true);
  await device.locator('#holidayChallenge').getByText('Sfida completata!').waitFor();
  const atSix=await wallet(device);assert(atSix.inventory.includes('reindeer'),'Six saved exercises in the same date unlock the reindeer');
  assert.equal(atSix.inventory.filter(x=>x==='reindeer').length,1);
  assert(!atSix.inventory.includes('souvenir-christmas-2'),'Two rounds do not invent a third played date');
  assert.equal(atSix.coins,baseline.coins);assert.equal(atSix.xp,baseline.xp);
  await p.locator('#holidayRefresh').click();await p.locator('#holidayAnother').waitFor();
  await p.locator('#holidayAnother').focus();await p.keyboard.press('Enter');await p.locator('#holidayPrompt').waitFor();
  assert.equal((await christmas()).session.round,3);
  for(let i=0;i<3;i++)await answerOne();
  const atNine=await wallet();assert(atNine.inventory.includes('polar-bear'),'Nine exercises unlock the next pilot without another day');
  assert(!atNine.inventory.includes('souvenir-christmas-2'));
  assert.equal(readFixture('SELECT COUNT(*) AS n FROM holiday_days WHERE profile_id=? AND step=3',[profile.id])[0].n,1);
  assert.equal(readFixture('SELECT COUNT(*) AS n FROM holiday_rounds WHERE profile_id=? AND step=3',[profile.id])[0].n,2);
  // A delayed bonus callback cannot paint the previous profile after switching.
  let release,arrived,finished;const waitReply=new Promise(resolve=>arrived=resolve),held=new Promise(resolve=>release=resolve),replyFinished=new Promise(resolve=>finished=resolve);
  await p.route('**/api.php?action=holiday-start',async route=>{const reply=await route.fetch();assert.equal(reply.status(),200);arrived();await held;await route.fulfill({response:reply});finished();});
  const afterToken=(await christmas()).session.token;
  await p.locator('#holidayAnother').click();await waitReply;
  await p.evaluate(async id=>wordylandAccount.selectProfile(id),second.id);
  release();await replyFinished;await p.unroute('**/api.php?action=holiday-start');
  await p.goto(base+'/#festivita');await p.locator('#holidayStart').waitFor();
  assert.equal((await christmas()).session,null,'Late callback never switches another profile into the old bonus');
  assert.equal(readFixture('SELECT COUNT(*) AS n FROM holiday_rounds WHERE profile_id=?',[second.id])[0].n,0);
  const untouched=await wallet();assert(!untouched.inventory.includes('reindeer'));assert.equal(untouched.coins,0);assert.equal(untouched.xp,0);
  await p.evaluate(async id=>wordylandAccount.selectProfile(id),profile.id);
  await p.goto(base+'/#festivita');await p.locator('#holidayPrompt').waitFor();
  const resumed=(await christmas()).session;assert.equal(resumed.round,4);assert.notEqual(resumed.token,afterToken);assert.equal(resumed.step,0);
  assert.deepEqual(await wallet(),atNine,'Unplayed extra round gives no item or currency');
  await p.context().setOffline(true);await p.locator('#holidayRefresh').click();
  await p.locator('#holidayBody').getByText(/Nessun premio viene inventato offline/).waitFor();
  await p.context().setOffline(false);await p.locator('#holidayBody').getByRole('button',{name:'Riprova',exact:true}).click();await p.locator('#holidayPrompt').waitFor();
  assert.equal((await christmas()).session.token,resumed.token);
  // Closing the event stops extra allocation while earned pilots remain usable.
  fs.writeFileSync(clock,'2027-01-08 12:00:00');await p.locator('#holidayRefresh').click();
  await p.locator('#holidayChallenge').getByText(/sono chiuse/).waitFor();assert.equal(await p.locator('#holidayAnother').count(),0);
  await p.goto(base+'/#personaggi');await p.locator('[data-item=reindeer]').click();await p.locator('[data-item=reindeer]').getByText('In uso ✓').waitFor();
  assert.equal(await p.locator('.passport [data-racer]').getAttribute('data-racer'),'reindeer');
  await p.reload();await p.locator('[data-item=reindeer]').getByText('In uso ✓').waitFor();
  // Evergreen daily journey retains its original cadence and rewards.
  await p.goto(base+'/#scoperte');await p.locator('#holidayStart').click();await p.locator('#holidayPrompt').waitFor();
  const journeyToken=await p.evaluate(async()=>{const a=wordylandAccount;return (await a.request('journey-state&profile='+a.info().id)).events[0].session.token;}),journeyPlan=storedPlan(journeyToken);
  await p.evaluate(async plan=>{const a=wordylandAccount;let s=(await a.request('journey-state&profile='+a.info().id)).events[0].session;while(!s.done){const r=await a.request('journey-answer',{profile:a.info().id,token:s.token,step:s.step,answer:plan[s.step].answer,attempt:Array.from(crypto.getRandomValues(new Uint8Array(16)),b=>b.toString(16).padStart(2,'0')).join('')});if(!r.correct)throw Error('Synthetic journey answer rejected');s=r.session;}},journeyPlan);
  await p.locator('#holidayRefresh').click();await p.locator('#holidayChallenge').getByText('La missione di oggi è completata!').waitFor();
  assert.equal(await p.locator('#holidayAnother').count(),0,'Journey remains a distinct one-per-date path');
  assert.deepEqual(errors,[]);
  console.log('Holiday repeated rounds passed: same-day character unlocks, wrong/help/keyboard, one POST after lost start reply, pause/reload/device continuation, distinct-day badges, no currency or duplicate grants, stale profile isolation, offline honesty, three viewport widths, permanent equipped character after closing and unchanged daily journey.');
 }finally{await browser.close();}
})().catch(error=>{console.error(error);process.exit(1);});
