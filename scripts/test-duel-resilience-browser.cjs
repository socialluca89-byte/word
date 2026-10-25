// Synthetic class only: confirmed/uncertain answers, pause, retry and audio cleanup.
const {chromium}=require(process.env.WORDYLAND_PLAYWRIGHT_MODULE||'playwright'),assert=require('assert/strict');
const base=process.env.WORDYLAND_TEST_URL;assert(['127.0.0.1','localhost'].includes(new URL(base).hostname));
(async()=>{
 const browser=await chromium.launch({executablePath:process.env.WORDYLAND_CHROMIUM||'/usr/bin/chromium',args:['--no-sandbox','--use-angle=swiftshader','--enable-unsafe-swiftshader']}),errors=[];
 try{
  const context=await browser.newContext({viewport:{width:390,height:844},reducedMotion:'reduce'}),other=await browser.newContext({reducedMotion:'reduce'}),p=await context.newPage(),r=await other.newPage();
  await p.addInitScript(()=>{
   const fake={active:false,cancellations:0,current:null,getVoices:()=>[],addEventListener(){},cancel(){if(this.active)this.cancellations++;this.active=false;},speak(u){this.active=true;this.current=u;}};
   Object.defineProperty(window,'speechSynthesis',{configurable:true,value:fake});window.duelSpeechFake=fake;window.SpeechSynthesisUtterance=class{constructor(text){this.text=text;}};
  });
  for(const page of [p,r]){page.on('pageerror',e=>errors.push(e.message));await page.goto(base);await page.evaluate(()=>wordylandAccount.ready);}
  const register=(page,name)=>page.evaluate(async name=>{const a=wordylandAccount;await a.connect(await a.request('register',{username:name,password:'Duel-synthetic-password-123',adult:true}));return await a.createProfile(name);},name);
  const a=await register(p,'duel_reliability_a'),b=await register(r,'duel_reliability_b');
  const club=await p.evaluate(async id=>wordylandAccount.request('club-create',{profile:id,name:'Classe sintetica',consent:true}),a.id);
  await r.evaluate(async({id,code})=>wordylandAccount.request('club-join',{profile:id,code,consent:true}),{id:b.id,code:club.code});
  const duel=await p.evaluate(async({id,opponent})=>(await wordylandAccount.request('duel-create',{profile:id,opponent,category:'body',activity:'football'})).duel.id,{id:a.id,opponent:b.id});
  await r.evaluate(async({id,duel})=>wordylandAccount.request('duel-accept',{profile:id,duel}),{id:b.id,duel});
  const state=()=>p.evaluate(async({id,duel})=>(await wordylandAccount.request('duel&profile='+id+'&duel='+duel)).duel,{id:a.id,duel});
  const wallet=()=>p.evaluate(async id=>(await wordylandAccount.request('hub&profile='+id)).wallet,a.id);
  const beforeWallet=await wallet();await p.goto(base+'/#continua');await p.locator('[data-resume-duel="'+duel+'"]').click();await p.locator('.duelOptions').waitFor();
  await p.locator('#duelListen').click();assert(await p.evaluate(()=>duelSpeechFake.active));
  let answers=0;p.on('request',req=>{if(req.url().includes('action=duel-answer'))answers++;});
  await p.locator('[data-duel-answer="0"]').dblclick();await p.getByRole('button',{name:'Prossima domanda →',exact:true}).waitFor();
  if(process.env.WORDYLAND_DUEL_BASELINE){console.log('BEFORE confirmed-answer pause enabled:',await p.locator('#duelBack').isEnabled());return;}
  assert.equal(answers,1,'Double click sends only one answer');assert(await p.locator('#duelBack').isEnabled(),'Pause remains available after feedback');assert(!await p.evaluate(()=>duelSpeechFake.active),'Answer stops old question audio');
  const first=await state();assert.equal(first.step,1);await p.locator('#duelBack').click();await p.locator('[data-duel="'+duel+'"][data-duel-action=play]').click();await p.locator('.duelOptions').waitFor();assert.match(await p.locator('.duelProgress').textContent(),/Domanda 2 di 5/);
  await p.locator('#duelListen').click();await p.locator('#duelBack').click();assert(!await p.evaluate(()=>duelSpeechFake.active),'Pause cancels only owned question audio');await p.locator('[data-duel="'+duel+'"][data-duel-action=play]').click();await p.locator('.duelOptions').waitFor();
  // Server commits once, but the browser never receives the response.
  let committed=false;const lostReply=async route=>{const reply=await route.fetch();assert.equal(reply.status(),200);committed=true;await route.abort('failed');};
  await p.route('**/api.php?action=duel-answer',lostReply);await p.locator('[data-duel-answer="0"]').dblclick();await p.getByRole('button',{name:'Riprendi dal salvataggio',exact:true}).waitFor();assert(committed);const afterLost=await state();assert.equal(afterLost.step,2);assert.equal(answers,2);
  assert.equal(await p.locator('[data-duel-answer]:not(:disabled)').count(),0,'Uncertain reply cannot resend an old answer');assert(await p.locator('#duelBack').isEnabled());
  await p.locator('[data-duel-answer="1"]').evaluate(button=>button.click());assert.equal(answers,2);
  await p.unroute('**/api.php?action=duel-answer',lostReply);await p.getByRole('button',{name:'Riprendi dal salvataggio',exact:true}).click();await p.locator('.duelProgress span').getByText('Domanda 3 di 5',{exact:true}).waitFor();assert.match(await p.locator('.duelProgress').textContent(),/Domanda 3 di 5/);assert.match(await p.locator('.duelProgress').textContent(),new RegExp(afterLost.score+' punti'));
  // A request not sent at all must return to the same unanswered question.
  const notSent=route=>route.abort('failed');await p.route('**/api.php?action=duel-answer',notSent);await p.locator('[data-duel-answer="0"]').click();await p.getByRole('button',{name:'Riprendi dal salvataggio',exact:true}).waitFor();assert.equal((await state()).step,2);assert.equal(await p.locator('[data-duel-answer]:not(:disabled)').count(),0);await p.unroute('**/api.php?action=duel-answer',notSent);
  await p.getByRole('button',{name:'Riprendi dal salvataggio',exact:true}).click();await p.locator('[data-duel-answer]:not(:disabled)').first().waitFor();assert.match(await p.locator('.duelProgress').textContent(),/Domanda 3 di 5/);
  // Another device advances this same owned profile: the stale answer gets409, not another score.
  const secondContext=await browser.newContext({reducedMotion:'reduce'}),second=await secondContext.newPage();second.on('pageerror',e=>errors.push(e.message));await second.goto(base);await second.evaluate(()=>wordylandAccount.ready);
  await second.evaluate(async({id,duel})=>{const account=wordylandAccount;await account.connect(await account.request('login',{username:'duel_reliability_a',password:'Duel-synthetic-password-123'}));await account.selectProfile(id);await account.request('duel-answer',{profile:id,duel,step:2,answer:0});},{id:a.id,duel});
  const advanced=await state();assert.equal(advanced.step,3);await p.locator('[data-duel-answer="0"]').click();await p.getByRole('button',{name:'Riprendi dal salvataggio',exact:true}).waitFor();assert.match(await p.locator('#duelFeedback').textContent(),/Risposta già registrata/);assert.equal((await state()).step,3);
  await p.getByRole('button',{name:'Riprendi dal salvataggio',exact:true}).click();await p.locator('.duelProgress span').getByText('Domanda 4 di 5',{exact:true}).waitFor();assert.match(await p.locator('.duelProgress').textContent(),new RegExp(advanced.score+' punti'));
  await p.locator('#duelListen').click();await p.evaluate(()=>location.hash='#personaggi');await p.locator('.shopGrid').waitFor();assert(!await p.evaluate(()=>duelSpeechFake.active),'Leaving duel cancels its audio');
  assert.deepEqual(await wallet(),beforeWallet,'Duel recovery never changes game wallet');assert.deepEqual(errors,[]);
  console.log('Duel resilience passed: pause after feedback, double click, committed reply loss versus unsent request, explicit read-before-resubmit, exact step/score, unchanged wallet and owned audio stopped on answer/pause/navigation. Synthetic voices only.');
 }finally{await browser.close();}
})().catch(e=>{console.error(e);process.exit(1)});
