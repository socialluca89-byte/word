const {chromium}=require(process.env.WORDYLAND_PLAYWRIGHT_MODULE||'playwright'),assert=require('assert/strict');
const base=process.env.WORDYLAND_TEST_URL;assert(['localhost','127.0.0.1'].includes(new URL(base).hostname));
(async()=>{
 const browser=await chromium.launch({executablePath:process.env.WORDYLAND_CHROMIUM||'/usr/bin/chromium',args:['--no-sandbox','--use-angle=swiftshader','--enable-unsafe-swiftshader']}),errors=[];
 try{
  const p=await browser.newPage({viewport:{width:390,height:844},reducedMotion:'reduce'});p.on('pageerror',e=>errors.push(e.message));await p.goto(base);await p.evaluate(()=>wordylandAccount.ready);
  // Register through the visible account controls: missing consent must stay
  // beside the form, focus its field, and never become an accidental signup.
  await p.locator('#headerLogin').click();await p.locator('#accountUser').fill('parent_browser');await p.locator('#accountPassword').fill('Parent-browser-password-123');
  await p.getByRole('button',{name:'Crea account adulto',exact:true}).click();await p.locator('#accountFormFeedback').getByText('Per creare un account, conferma di essere un adulto.',{exact:true}).waitFor();
  assert.equal(await p.evaluate(()=>document.activeElement.id),'adultConfirm');assert.equal(await p.locator('#adultConfirm').getAttribute('aria-invalid'),'true');assert.equal(await p.evaluate(()=>wordylandAccount.info().username),null);
  await p.locator('#adultConfirm').check();assert.equal(await p.locator('#adultConfirm').getAttribute('aria-invalid'),null);await p.getByRole('button',{name:'Crea account adulto',exact:true}).click();await p.locator('#headerLogout').waitFor();
  await p.waitForFunction(()=>document.activeElement.id==='recoveryNotice');await p.locator('#recoveryNotice button').click();assert.equal(await p.evaluate(()=>document.activeElement.id),'profileNickname');
  const fixture=await p.evaluate(async()=>{
   const a=wordylandAccount;const first=await a.createProfile('Luna <b>');
   for(const [word,helped] of [['head',false],['hand',true]]){
    await a.request('study-save',{profile:first.id,title:word,words:[[word,'esempio','📚']],confirmed:true});const study=(await a.request('hub&profile='+first.id)).studies[0].id;
    const quest=await a.request('quest-start',{profile:first.id,study}),payload={profile:first.id,token:quest.token,step:0};
    if(helped){await a.request('quest-hint',payload);await a.request('quest-answer',{...payload,answer:'synthetic wrong'});}
    await a.request('quest-answer',{...payload,answer:word});
   }
   const second=await a.createProfile('Sole');await a.selectProfile(first.id);return {first:first.id,second:second.id};
  });
  async function openArea(){if(await p.locator('.accountArea').getAttribute('open')===null)await p.locator('.accountArea>summary').click();await p.locator('#learningSummary>summary').waitFor();}
  async function openSummary(){await openArea();if(await p.locator('#learningSummary').getAttribute('open')===null)await p.locator('#learningSummary>summary').click();await p.locator('#learningSummaryStatus').getByText(/Riepilogo aggiornato/).waitFor();}
  // A slow profile request cannot be overtaken by a second profile click.
  await openArea();let releaseProfile,profileEntered,profileReads=0;const profileGate=new Promise(resolve=>releaseProfile=resolve),profileStarted=new Promise(resolve=>profileEntered=resolve);
  await p.route('**/api.php?action=profile*',async route=>{if(new URL(route.request().url()).searchParams.get('id')===String(fixture.second)){profileReads++;profileEntered();await profileGate;}await route.continue();});
  await p.locator('[data-profile="'+fixture.second+'"]').click();await profileStarted;assert.equal(await p.locator('.profileList').getAttribute('aria-busy'),'true');assert(await p.locator('#newProfile button').isDisabled());
  await p.locator('[data-profile="'+fixture.first+'"]').dispatchEvent('click');assert.equal(profileReads,1);releaseProfile();await p.waitForFunction(id=>wordylandAccount.info().id===id,fixture.second);await p.waitForFunction(()=>document.querySelector('.profileList').getAttribute('aria-busy')==='false');
  assert.equal(await p.locator('.profileList [aria-pressed="true"]').getAttribute('data-profile'),String(fixture.second));assert.equal(await p.evaluate(()=>document.activeElement.dataset.profile),String(fixture.second));await p.unroute('**/api.php?action=profile*');await p.evaluate(id=>wordylandAccount.selectProfile(id),fixture.first);
  await openArea();await p.locator('.studyBox:has(#studyForm)>summary').click();await p.locator('#studyTitle').fill('Bozza da conservare');await p.locator('#studyText').fill('eye = occhio');
  await openSummary();assert.equal(await p.locator('#learningSummaryName').textContent(),'Luna <b>');assert.equal(await p.locator('#learningSummaryName b').count(),0,'Nickname remains text');
  assert.equal(await p.locator('.learningMetrics>div').filter({hasText:'Senza aiuto né errori'}).locator('dd').textContent(),'1');assert.equal(await p.locator('.parentReviewWords').textContent(),'hand');
  await p.locator('#refreshLearningSummary').focus();await p.keyboard.press('Enter');await p.locator('#learningSummaryStatus').getByText(/Riepilogo aggiornato/).waitFor();
  assert.equal(await p.evaluate(()=>document.activeElement.id),'refreshLearningSummary');assert.equal(await p.locator('#studyTitle').inputValue(),'Bozza da conservare');assert.equal(await p.locator('#studyText').inputValue(),'eye = occhio','Reading progress does not erase a teacher draft');
  let release,entered,held=false;const gate=new Promise(resolve=>release=resolve),started=new Promise(resolve=>entered=resolve);
  await p.route('**/api.php?action=learning-summary*',async route=>{if(!held&&route.request().url().includes('profile='+fixture.first)){held=true;entered();await gate;}await route.continue();});
  await p.locator('#refreshLearningSummary').click();await started;await p.evaluate(async id=>await wordylandAccount.selectProfile(id),fixture.second);
  const oldReply=p.waitForResponse(response=>response.url().includes('learning-summary')&&response.url().includes('profile='+fixture.first));release();await oldReply;await p.unroute('**/api.php?action=learning-summary*');
  await openSummary();assert.equal(await p.locator('#learningSummaryName').textContent(),'Sole');assert.equal(await p.locator('.parentReviewWords').count(),0);assert.equal(await p.locator('.learningMetrics>div').first().locator('dd').textContent(),'0','Late response from another profile is ignored');
  await p.context().setOffline(true);await p.locator('#refreshLearningSummary').click();await p.locator('#learningSummaryStatus').getByText(/Riepilogo non aggiornato/).waitFor();assert.equal(await p.locator('.learningMetrics').count(),0,'Stale counts are cleared on failure');await p.context().setOffline(false);
  await p.locator('#refreshLearningSummary').click();await p.locator('#learningSummaryStatus').getByText(/Riepilogo aggiornato/).waitFor();
  for(const width of [320,390,768,1360]){await p.setViewportSize({width,height:844});assert(await p.evaluate(()=>document.documentElement.scrollWidth<=innerWidth),'Parent summary overflow '+width);assert(await p.locator('#refreshLearningSummary').evaluate(node=>node.getBoundingClientRect().height>=44));}
  // Class management gives actionable local validation and submits once while
  // pending. An unknown result requires verification before a second mutation.
  await p.locator('.studyBox:has(#clubForm)>summary').click();await p.locator('#clubForm [name=consent]').check();await p.locator('#clubForm button[value=club-create]').click();await p.locator('#clubMessage').getByText('Scrivi il nome della classe che vuoi creare.',{exact:true}).waitFor();assert.equal(await p.evaluate(()=>document.activeElement.name),'name');
  await p.locator('#clubForm [name=name]').fill('Classe sintetica UX');let releaseClass,classEntered,creates=0;const classGate=new Promise(resolve=>releaseClass=resolve),classStarted=new Promise(resolve=>classEntered=resolve);
  await p.route('**/api.php?action=club-create',async route=>{creates++;classEntered();await classGate;await route.continue();});await p.locator('#clubForm button[value=club-create]').click();await classStarted;assert(await p.locator('#clubForm button[value=club-create]').isDisabled());
  await p.locator('#clubForm').evaluate(form=>form.requestSubmit(form.querySelector('[value=club-create]')));assert.equal(creates,1);releaseClass();await p.locator('#clubMessage').getByText('Classe creata! Ecco il link da condividere.',{exact:true}).waitFor();await p.unroute('**/api.php?action=club-create');const classUrl=await p.locator('.classShareUrl').inputValue();
  assert.equal(await p.locator('.classManageRow').filter({hasText:'Classe sintetica UX'}).count(),1);
  await p.locator('#clubForm [name=name]').fill('Invio non confermato');await p.locator('#clubForm [name=consent]').check();await p.route('**/api.php?action=club-create',route=>route.abort('failed'));await p.locator('#clubForm button[value=club-create]').click();await p.locator('#clubMessage').getByText(/Esito non confermato/).waitFor();assert(await p.locator('#clubForm button[value=club-create]').isDisabled());await p.unroute('**/api.php?action=club-create');await p.getByRole('button',{name:'Verifica le mie classi',exact:true}).click();await p.waitForFunction(()=>!document.querySelector('#clubForm button[value=club-create]').disabled);assert.equal(await p.locator('.classManageRow').filter({hasText:'Classe sintetica UX'}).count(),1);
  await p.evaluate(id=>wordylandAccount.selectProfile(id),fixture.first);await openArea();await p.locator('.studyBox:has(#clubForm)>summary').click();await p.locator('#clubForm [name=code]').fill(classUrl);await p.locator('#clubForm [name=consent]').check();await p.locator('#clubForm button[value=club-join]').click();await p.locator('#clubMessage').getByText('Profilo aggiunto alla classe.',{exact:true}).waitFor();assert.equal(await p.locator('.classManageRow').filter({hasText:'Classe sintetica UX'}).count(),1);
  // A successful reply from an ended session must neither restore its data nor
  // release the lock for a newer profile operation in another adult account.
  let releaseEnded,endedEntered,releaseNew,newEntered,newTarget=null,heldEnded=false;
  const endedGate=new Promise(resolve=>releaseEnded=resolve),endedStarted=new Promise(resolve=>endedEntered=resolve),newGate=new Promise(resolve=>releaseNew=resolve),newStarted=new Promise(resolve=>newEntered=resolve);
  await p.route('**/api.php?action=profile*',async route=>{
   const id=Number(new URL(route.request().url()).searchParams.get('id'));
   if(id===fixture.second&&!heldEnded){heldEnded=true;const response=await route.fetch();assert.equal(response.status(),200);endedEntered();await endedGate;await route.fulfill({response});}
   else if(id===newTarget){const response=await route.fetch();assert.equal(response.status(),200);newEntered();await newGate;await route.fulfill({response});}
   else await route.continue();
  });
  await p.locator('[data-profile="'+fixture.second+'"]').click();await endedStarted;await p.locator('#headerLogout').click();await p.locator('#headerLogin').waitFor();
  const other=await p.evaluate(async()=>{const a=wordylandAccount;await a.connect(await a.request('register',{username:'other_parent_ux',password:'Other-parent-password-123',adult:true}));const first=await a.createProfile('Nuova Luna');await a.createProfile('Nuovo Sole');return first.id;});
  newTarget=other;await openArea();await p.locator('[data-profile="'+other+'"]').click();await newStarted;assert.equal(await p.locator('.profileList').getAttribute('aria-busy'),'true');
  const endedReply=p.waitForResponse(response=>response.url().includes('action=profile')&&new URL(response.url()).searchParams.get('id')===String(fixture.second));releaseEnded();await (await endedReply).finished();await p.evaluate(()=>new Promise(resolve=>requestAnimationFrame(()=>requestAnimationFrame(resolve))));
  assert.equal(await p.locator('.profileList').getAttribute('aria-busy'),'true');assert(await p.locator('#newProfile button').isDisabled());assert.equal(await p.evaluate(()=>wordylandAccount.info().username),'other_parent_ux');assert.equal(await p.locator('[data-profile="'+fixture.first+'"]').count(),0);
  releaseNew();await p.waitForFunction(id=>wordylandAccount.info().id===id,other);await p.waitForFunction(()=>document.querySelector('.profileList').getAttribute('aria-busy')==='false');await p.unroute('**/api.php?action=profile*');assert.equal(await p.locator('.profileList [aria-pressed="true"]').getAttribute('data-profile'),String(other));
  assert.deepEqual(errors,[]);console.log('Parent/account UX browser passed: inline consent and recovery-code focus, guarded profile switching/session changes, private mission counts, preserved drafts/focus, offline recovery, class validation/single submit/uncertain outcome/pasted link and four viewport sizes.');
 }finally{await browser.close();}
})().catch(error=>{console.error(error);process.exit(1)});
