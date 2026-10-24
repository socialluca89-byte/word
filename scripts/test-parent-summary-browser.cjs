const {chromium}=require(process.env.WORDYLAND_PLAYWRIGHT_MODULE||'playwright'),assert=require('assert/strict');
const base=process.env.WORDYLAND_TEST_URL;assert(['localhost','127.0.0.1'].includes(new URL(base).hostname));
(async()=>{
 const browser=await chromium.launch({executablePath:process.env.WORDYLAND_CHROMIUM||'/usr/bin/chromium',args:['--no-sandbox','--use-angle=swiftshader','--enable-unsafe-swiftshader']}),errors=[];
 try{
  const p=await browser.newPage({viewport:{width:390,height:844},reducedMotion:'reduce'});p.on('pageerror',e=>errors.push(e.message));await p.goto(base);await p.evaluate(()=>wordylandAccount.ready);
  const fixture=await p.evaluate(async()=>{
   const a=wordylandAccount;await a.connect(await a.request('register',{username:'parent_browser',password:'Parent-browser-password-123',adult:true}));const first=await a.createProfile('Luna <b>');
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
  assert.deepEqual(errors,[]);console.log('Parent summary browser passed: real mission counts, private selected profile, escaped nickname, preserved teacher drafts/focus, ignored late response after switch, offline recovery and four viewport sizes.');
 }finally{await browser.close();}
})().catch(error=>{console.error(error);process.exit(1)});
