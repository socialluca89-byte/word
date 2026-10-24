const {chromium}=require(process.env.WORDYLAND_PLAYWRIGHT_MODULE||'playwright'),assert=require('assert/strict');
const base=process.env.WORDYLAND_TEST_URL;assert(['localhost','127.0.0.1'].includes(new URL(base).hostname));
(async()=>{
 const browser=await chromium.launch({executablePath:process.env.WORDYLAND_CHROMIUM||'/usr/bin/chromium',args:['--no-sandbox','--use-angle=swiftshader','--enable-unsafe-swiftshader']}),errors=[];
 try{
  const context=await browser.newContext({viewport:{width:390,height:844},reducedMotion:'reduce'}),p=await context.newPage();p.on('pageerror',e=>errors.push(e.message));
  async function prepare(page){await page.locator('#readyChallenge').waitFor();const word=(await page.locator('#questWork .questWord').textContent()).trim(),translation=(await page.locator('.questPicture+p').textContent()).trim();await page.locator('#readyChallenge').click();return {word,translation};}
  async function correct(page,q){
   if(await page.locator('[data-answer]').count()){
    let found=false;for(const button of await page.locator('[data-answer]').all()){const small=button.locator('small');if(await small.count()?(await small.textContent()).trim()===q.translation:(await button.textContent()).trim()===q.word){await button.click();found=true;break;}}assert(found);
   }else if(await page.locator('#questAnswer').count()){
    const mask=await page.locator('#questWork .questWord').count()?await page.locator('#questWork .questWord').textContent():'';const start=mask.indexOf('_');let end=start;while(mask[end]==='_')end++;
    await page.locator('#questAnswer').fill(start<0?q.word:q.word.slice(start,end));await page.getByRole('button',{name:'Controlla ✓',exact:true}).click();
   }else{
    for(const char of q.word){let found=false;for(const button of await page.locator('[data-tile]:not(:disabled)').all())if(await button.textContent()===(char===' '?'␣':char)){await button.click();found=true;break;}assert(found);}
    await page.getByRole('button',{name:'Controlla ✓',exact:true}).click();
   }
   await page.locator('#questNext,#completedWorld').first().waitFor();
  }
  await p.goto(base+'/#preposizioni');await p.locator('[data-lesson=catpositions]').click();let q=await prepare(p);
  await context.setOffline(true);await p.locator('#questHint').click();assert.equal(await p.evaluate(()=>JSON.parse(localStorage.getItem('wordylandGuestMission')).assisted),true);
  await context.setOffline(false);await p.reload();await p.locator('[data-resume-quest=guest]').click();const resumed=await prepare(p);assert.equal(resumed.word,q.word);await correct(p,resumed);
  assert.equal(await p.evaluate(word=>stats[word].good,q.word),0,'Offline guest help survives reload');assert.equal(await p.evaluate(()=>JSON.parse(localStorage.getItem('wordylandGuestMission')).assisted),false,'Help does not leak to next question');
  await p.locator('#pauseQuest').click();const credentials={username:'autonomy_browser',password:'Autonomy-browser-password-123',adult:true};
  const profile=await p.evaluate(async credentials=>{const a=wordylandAccount;await a.connect(await a.request('register',credentials));return await a.createProfile('Luna');},credentials);
  await p.goto(base+'/#preposizioni');await p.locator('[data-lesson=catpositions]').click();q=await prepare(p);
  await p.route('**/api.php?action=quest-hint',route=>route.abort('failed'));await p.locator('#questHint').click();await p.locator('#questStatus').getByText(/salvataggio non è confermato/).waitFor();
  const answered=p.waitForResponse(response=>response.url().includes('action=quest-answer'));await correct(p,q);const result=await(await answered).json();assert.equal(result.independent,false);assert.equal(result.assisted,true);assert.equal(await p.evaluate(word=>stats[word].good,q.word),0,'Failed separate help write is carried with the answer');await p.unroute('**/api.php?action=quest-hint');
  await p.locator('#questNext').click();q=await prepare(p);
  let committed=false;await p.route('**/api.php?action=quest-hint',async route=>{const response=await route.fetch();assert.equal(response.status(),200);committed=true;await route.abort('failed');});
  await p.locator('#questHint').click();await p.locator('#questStatus').getByText(/salvataggio non è confermato/).waitFor();assert(committed);await p.unroute('**/api.php?action=quest-hint');
  const pending=await p.evaluate(async id=>(await wordylandAccount.request('pending-games&profile='+id)).quests[0],profile.id);await p.close();
  const second=await browser.newContext({viewport:{width:1360,height:900},reducedMotion:'reduce'}),other=await second.newPage();other.on('pageerror',e=>errors.push(e.message));await other.goto(base);
  await other.evaluate(async({credentials,id})=>{const a=wordylandAccount;await a.ready;await a.connect(await a.request('login',credentials));await a.selectProfile(id);},{credentials,id:profile.id});
  await other.locator('[data-resume-quest="'+pending.token+'"]').click();const next=await prepare(other);assert.equal(next.word,q.word);
  const before=await other.evaluate(word=>stats[word]?.good||0,next.word),answerReply=other.waitForResponse(response=>response.url().includes('action=quest-answer'));
  await correct(other,next);const confirmed=await(await answerReply).json();assert.equal(confirmed.independent,false);assert.equal(confirmed.assisted,true);assert.equal(await other.evaluate(word=>stats[word].good,next.word),before,'Server-recorded help survives lost acknowledgement and second device');
  assert.deepEqual(errors,[]);console.log('Autonomy browser passed: offline guest help/reload, clean next question, failed help request carried with answer, lost help acknowledgement, second device, canonical counts and unchanged positive feedback.');
 }finally{await browser.close();}
})().catch(error=>{console.error(error);process.exit(1)});
