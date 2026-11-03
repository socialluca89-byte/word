// Actual owned holiday controls across midnight; only disposable localhost data.
const {chromium}=require(process.env.WORDYLAND_PLAYWRIGHT_MODULE||'playwright');
const assert=require('assert/strict'),fs=require('fs'),{execFileSync}=require('child_process');
const base=process.env.WORDYLAND_TEST_URL,clock=process.env.WORDYLAND_TEST_CLOCK_FILE;
assert(['localhost','127.0.0.1'].includes(new URL(base).hostname),'Synthetic localhost only');
assert(clock?.startsWith('/tmp/wordyland-browser.'),'Disposable server clock only');
const database=process.env.WORDYLAND_BROWSER_DATA+'/wordyland.sqlite';
const read=(sql,args=[])=>JSON.parse(execFileSync('python3',['-c',
 'import sqlite3,json,sys;d=sqlite3.connect("file:"+sys.argv[1]+"?mode=ro",uri=True);d.row_factory=sqlite3.Row;print(json.dumps([dict(r) for r in d.execute(sys.argv[2],json.loads(sys.argv[3]))]))',
 database,sql,JSON.stringify(args)],{encoding:'utf8'}));
const exact=text=>new RegExp('^'+text.replace(/[.*+?^${}()|[\]\\]/g,'\\$&')+'$');
(async()=>{
 const browser=await chromium.launch({executablePath:process.env.WORDYLAND_CHROMIUM,args:['--no-sandbox','--use-angle=swiftshader','--enable-unsafe-swiftshader']});
 try{
  const page=await browser.newPage({viewport:{width:390,height:844},reducedMotion:'reduce'}),errors=[],posts=[];
  page.on('pageerror',error=>errors.push(error.message));
  page.on('request',request=>{const action=new URL(request.url()).searchParams.get('action');if(request.method()==='POST'&&action?.startsWith('holiday-'))posts.push(action);});
  fs.writeFileSync(clock,'2026-11-03 23:59:00');
  await page.goto(base+'/#festivita');await page.locator('#holidayLogin').waitFor();
  const profile=await page.evaluate(async()=>{const a=wordylandAccount;await a.ready;await a.connect(await a.request('register',{username:'holiday_continuity_browser',password:'Holiday-continuity-synthetic-123',adult:true}));return a.createProfile('Esploratrice della notte');});
  await page.reload();await page.locator('#holidayStart').waitFor();
  const get=action=>page.evaluate(async action=>wordylandAccount.request(action),action);
  const event=async()=>(await get('holiday-state&profile='+profile.id)).events.find(row=>row.id==='christmas');
  const wallet=async()=>(await get('hub&profile='+profile.id)).wallet;
  const stored=token=>read('SELECT day,plan,step,completed_on FROM holiday_days WHERE token=? UNION ALL SELECT day,plan,step,completed_on FROM holiday_rounds WHERE token=?',[token,token])[0];
  const baseline=await wallet(),pending=await get('pending-games&profile='+profile.id),header=await page.locator('.passport .wallet').textContent();
  await page.locator('#holidayStart').click();await page.locator('#holidayPrompt').waitFor();
  const first=(await event()).session,original=stored(first.token),questions=JSON.parse(original.plan);
  async function answerOne(session,question){
   await page.waitForFunction(step=>document.querySelector('.holidayStep strong')?.textContent.startsWith(step+' /'),session.step);
   if(question.mode==='build'){
    for(const character of question.answer){const tile=page.locator('[data-holiday-tile]:not(:disabled)').filter({hasText:exact(character===' '?'␣':character)}).first();await tile.focus();await page.keyboard.press('Enter');}
    await page.locator('#holidayBuildCheck').click();
   }else if(['meaning','word','gap'].includes(question.mode)){
    const choice=page.locator('[data-holiday-answer]').filter({hasText:exact(question.answer)}).first();await choice.focus();await page.keyboard.press('Enter');
   }else{await page.locator('#holidayAnswer').fill(question.answer);await page.locator('#holidayAnswer').press('Enter');}
  }
  await answerOne(first,questions[0]);await page.waitForFunction(()=>document.querySelector('.holidayStep strong')?.textContent.startsWith('1 /'));
  const frozen=stored(first.token),afterFirst=await wallet();assert.equal(frozen.step,1);assert.equal(frozen.completed_on,null);assert.equal(frozen.plan,original.plan);
  assert.equal(afterFirst.coins,baseline.coins);assert.equal(afterFirst.xp,baseline.xp);
  assert.deepEqual(posts,['holiday-start','holiday-answer']);
  fs.writeFileSync(clock,'2026-11-04 00:01:00');
  await page.reload();await page.locator('#holidayPrompt').waitFor();
  const resumed=(await event()).session;
  assert.equal(resumed.token,first.token);assert.equal(resumed.step,1);assert.equal(resumed.day,'2026-11-03');assert.deepEqual(stored(first.token),frozen);
  assert.match(await page.locator('#holidayJump').textContent(),/Riprendi/);
  assert.match(await page.locator('.holidayStep strong').textContent(),/^1 \/ 3/);
  assert.match(await page.locator('.holidayCalendarToday').textContent(),/4 novembre 2026/);
  assert.equal(await page.locator('.passport .wallet').textContent(),header);
  assert.deepEqual(await wallet(),afterFirst);assert.deepEqual(await get('pending-games&profile='+profile.id),pending);
  assert.equal(read('SELECT COUNT(*) AS n FROM holiday_days WHERE profile_id=?',[profile.id])[0].n,1);
  assert.deepEqual(posts,['holiday-start','holiday-answer'],'Reload reconciles only through GET, without duplicate starts or replies');
  await page.locator('#holidayPause').click();await page.locator('.lessonGrid').waitFor();await page.goBack();await page.locator('#holidayPrompt').waitFor();
  assert.equal((await event()).session.token,first.token);assert.equal((await event()).session.step,1);assert.equal(posts.length,2);
  for(let step=1;step<3;step++){
   await answerOne((await event()).session,questions[step]);
   if(step===1)await page.waitForFunction(()=>document.querySelector('.holidayStep strong')?.textContent.startsWith('2 /'));
   else await page.locator('#holidayAnother').waitFor();
  }
  const completed=await event();assert.equal(completed.session,null,'Today has no newly started session yet');assert.equal(completed.dailyComplete,true);
  assert.equal(stored(first.token).day,'2026-11-03');assert.equal(stored(first.token).completed_on,'2026-11-04');
  const dateBadge=days=>completed.rewards.find(reward=>reward.days===days);
  assert.equal(dateBadge(1).owned,true);assert.equal(dateBadge(3).progress,1);assert.equal(dateBadge(3).owned,false);
  const earned=await wallet();assert.equal(earned.xp,baseline.xp);assert.equal(earned.coins,baseline.coins);assert.equal(earned.inventory.filter(id=>id==='souvenir-christmas-1').length,1);
  if(process.env.WORDYLAND_HOLIDAY_CONTINUITY_SCREENSHOT)await page.locator('.holidayPanel').screenshot({path:process.env.WORDYLAND_HOLIDAY_CONTINUITY_SCREENSHOT});
  const beforeReopen=posts.length;await page.reload();await page.locator('#holidayStart').waitFor();assert.equal(posts.length,beforeReopen);assert.deepEqual(await wallet(),earned);
  assert.match(await page.locator('#holidayJump').textContent(),/Vai alla sfida/);assert.equal(await page.locator('.passport .wallet').textContent(),header);
  // The UI remains open across the real season cutoff; a stale answer must fail.
  fs.writeFileSync(clock,'2027-01-07 23:59:00');await page.locator('#holidayRefresh').click();await page.locator('#holidayStart').waitFor();await page.locator('#holidayStart').click();await page.locator('#holidayPrompt').waitFor();
  const last=(await event()).session,lastPlan=JSON.parse(stored(last.token).plan);
  await answerOne(last,lastPlan[0]);await page.waitForFunction(()=>document.querySelector('.holidayStep strong')?.textContent.startsWith('1 /'));
  const beforeCutoff=await wallet(),cutoffRow=stored(last.token);
  fs.writeFileSync(clock,'2027-01-08 00:00:00');
  const denied=page.waitForResponse(response=>new URL(response.url()).searchParams.get('action')==='holiday-answer');
  await answerOne((await event()).session||{step:1},lastPlan[1]);assert.equal((await denied).status(),410);
  await page.locator('#holidayVerify').waitFor();assert.match(await page.locator('#holidayMessage').textContent(),/festività è terminata/);
  assert.deepEqual(stored(last.token),cutoffRow);assert.deepEqual(await wallet(),beforeCutoff);
  const beforeVerify=posts.length;await page.locator('#holidayVerify').click();await page.locator('#holidayChallenge').getByText(/sono chiuse/).waitFor();
  assert.equal(posts.length,beforeVerify);assert.equal(await page.locator('#holidayStart,#holidayAnother').count(),0);assert.match(await page.locator('#holidayJump').textContent(),/calendario/);
  assert.deepEqual(await get('pending-games&profile='+profile.id),pending);assert.deepEqual(errors,[]);
  console.log('Holiday continuity browser passed: one actual UI reply before midnight, same owned token/plan/step after reload and pause/back, no automatic duplicate POST, keyboard/touch completion on the following Rome date, one real date badge and unchanged wallet/header/classic pending, permanent single gift, stale Jan8 UI reply rejected410 and GET-only reconciliation.');
 }finally{await browser.close();}
})().catch(error=>{console.error(error);process.exit(1)});
