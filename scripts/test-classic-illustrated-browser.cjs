// Regression for the real legacy practice-box entry, with the production illustration default.
const {chromium}=require(process.env.WORDYLAND_PLAYWRIGHT_MODULE||'playwright');
const assert=require('assert/strict'),{spawnSync}=require('child_process');
const base=process.env.WORDYLAND_TEST_URL;
assert(['localhost','127.0.0.1'].includes(new URL(base).hostname),'Local synthetic fixtures only');
assert(process.env.WORDYLAND_BROWSER_DATA?.startsWith('/tmp/wordyland-browser.'));
(async()=>{
 const browser=await chromium.launch({executablePath:process.env.WORDYLAND_CHROMIUM||'/usr/bin/chromium',args:['--no-sandbox','--use-angle=swiftshader','--enable-unsafe-swiftshader']});
 try{
 const p=await browser.newPage({viewport:{width:390,height:844},reducedMotion:'reduce'}),errors=[];p.on('pageerror',e=>errors.push(e.message));
 await p.goto(base);await p.evaluate(()=>wordylandAccount.ready);assert.equal(await p.evaluate(()=>localStorage.getItem('wordylandSceneStyle')),null,'Exercise production default, not an injected classic-renderer preference');
 await p.locator('.practiceZone>summary').click();await p.waitForFunction(()=>document.querySelector('#classicWorldScene')?.dataset.artReady==='ready');assert.equal(await p.locator('#game>.classicAvatarFallback').isVisible(),false,'The old emoji avatar is only a no-scene fallback');
 const before=await p.evaluate(()=>({stars,stats:structuredClone(stats),wallet:localStorage.getItem('wordylandGuestWallet')}));
 const worlds={space:[0,0],animals:[1,0],dino:[2,0],sport:[0,1],ocean:[1,1],creative:[2,1]};
 for(const [id,cell] of Object.entries(worlds)){
  await p.locator('#worlds [data-world="'+id+'"]').click();await p.waitForFunction(()=>document.querySelector('#classicWorldScene')?.dataset.artReady==='ready');
  const host=p.locator('#classicWorldScene');assert.equal(await host.getAttribute('data-classic-world'),id);assert.equal(await host.getAttribute('data-render'),'illustrated');
  assert.match(await host.locator('.illustratedLayer').getAttribute('data-art-source'),/^race-circuits\.webp\?v=/,'Same original image as that world card');
  assert.equal(await host.locator('svg.illustratedArt').getAttribute('viewBox'),cell[0]*100+' '+cell[1]*100+' 100 100','Same exact atlas cell as card '+id);
  assert.match(await p.locator('#worlds [data-world="'+id+'"] .circuitArt').evaluate(n=>getComputedStyle(n).backgroundImage),/race-circuits\.webp/);
 }
 assert.deepEqual(await p.evaluate(()=>({stars,stats:structuredClone(stats),wallet:localStorage.getItem('wordylandGuestWallet')})),before,'Browsing worlds never changes learning or wallet');
 await p.locator('#category').selectOption('body');await p.locator('#length').selectOption('3');await p.locator('[data-mode=write]').click();await p.locator('#start').click();assert.equal(await p.evaluate(()=>document.activeElement?.id),'game','Focus moves to the question container, not a text input/keyboard');const sceneAfterStart=await p.locator('#classicWorldScene').boundingBox();assert(sceneAfterStart.y>=-5&&sceneAfterStart.y<700,'Sidebar Giochiamo must reveal the scene/question without auto-scrolling a later input; scene y='+sceneAfterStart.y);await p.locator('#answer').waitFor();
 assert.equal(await p.locator('#classicWorldScene').getAttribute('data-render'),'illustrated');const first=await p.evaluate(()=>queue[pos][0]);
 await p.locator('#answer').fill('zzzz');await p.locator('#form button').click();await p.locator('#classicWorldScene .reactionRetry').waitFor();assert.equal(await p.evaluate(()=>queue[pos][0]),first);
 await p.locator('#answer').fill(first);await p.locator('#form button').click();await p.locator('#next').waitFor();await p.locator('#classicWorldScene .sceneReaction:not(.reactionRetry)').waitFor();await p.locator('#next').click();
 assert(Number(await p.locator('#classicWorldScene').getAttribute('data-scene-progress'))>0,'Confirmed answers advance the illustrated actor');const active=await p.evaluate(()=>({word:queue[pos][0],pos,stars,stats:structuredClone(stats)}));
 await p.locator('#worlds [data-world=ocean]').click();assert.deepEqual(await p.evaluate(()=>({word:queue[pos][0],pos,stars,stats:structuredClone(stats)})),active,'Changing scenery preserves the question and legitimate progress');assert.equal(await p.locator('#classicWorldScene').getAttribute('data-classic-world'),'ocean');
 // Closing the practice box disposes graphics, then restores the same current question.
 await p.locator('.practiceZone>summary').click();await p.locator('#classicWorldFrame').waitFor({state:'detached'});await p.locator('.practiceZone>summary').click();await p.locator('#classicWorldScene').waitFor();assert.equal(await p.evaluate(()=>queue[pos][0]),active.word);
 // All existing exercise modes remain reachable with an actual scene.
 for(const mode of ['look','journey','build','match','paper','write']){await p.locator('[data-mode='+mode+']').click();await p.locator('#begin').click();await p.locator('#classicWorldScene').waitFor();assert.equal(await p.locator('#game #work').count(),1,'Mode preserved '+mode);}
 const credentials={username:'classic_illustrated_'+Date.now(),password:'Classic-illustrated-test-123',adult:true};
 await p.evaluate(async c=>{const a=wordylandAccount;await a.connect(await a.request('register',c));},credentials);const profile=await p.evaluate(()=>wordylandAccount.createProfile('Prova classica'));
 await p.evaluate(async id=>wordylandAccount.request('hub&profile='+id),profile.id);
 const fund=spawnSync('php',['-r',`$db=new PDO('sqlite:'.getenv('WORDYLAND_BROWSER_DATA').'/wordyland.sqlite');$q=$db->prepare('UPDATE wallets SET coins=120 WHERE profile_id=?');$q->execute([(int)$argv[1]]);`,String(profile.id)],{env:process.env,encoding:'utf8'});assert.equal(fund.status,0,fund.stderr);
 await p.locator('.startChoices a[href="#personaggi"]').click();await p.locator('[data-item=robot]').click();await p.locator('[data-item=robot]').getByText('In uso ✓').waitFor();await p.locator('[data-item=crown]').click();await p.locator('[data-item=crown]').getByText('In uso ✓').waitFor();
 await p.locator('[data-preview-item=panda]').click();assert.equal(await p.locator('#stylePreview .illustratedActor').getAttribute('data-character'),'panda');
 await p.locator('.practiceZone>summary').scrollIntoViewIfNeeded();if(!await p.locator('.practiceZone').getAttribute('open').then(v=>v!==null))await p.locator('.practiceZone>summary').click();
 await p.locator('[data-mode=write]').click();await p.locator('#begin').click();await p.waitForFunction(()=>document.querySelector('#classicWorldScene')?.dataset.artReady==='ready');assert.equal(await p.locator('#classicWorldScene .illustratedActor').getAttribute('data-character'),'robot','The actual owned character follows into classic practice, not the temporary preview');assert.equal(await p.locator('#classicWorldScene [data-reward=crown]').count(),1);
 const saved=await p.evaluate(async id=>(await wordylandAccount.request('hub&profile='+id)).wallet,profile.id);assert.equal(saved.coins,35);assert.equal(saved.equipped.avatar,'robot');
 for(const width of [390,380,1180]){await p.setViewportSize({width,height:900});assert(await p.evaluate(()=>document.documentElement.scrollWidth<=innerWidth),'No overflow '+width);}
 if(process.env.WORDYLAND_CLASSIC_CAPTURE)await p.locator('#game').screenshot({path:process.env.WORDYLAND_CLASSIC_CAPTURE});
 assert.deepEqual(errors,[]);console.log('Classic illustrated practice passed: real summary/card entry, all six original atlas cells, retained six modes, wrong/correct feedback, progress, question preserved on scene switch/close, owned robot+crown rather than temporary preview, no duplicate charge, mobile/desktop and no JS errors.');
 }finally{await browser.close();}
})().catch(e=>{console.error(e);process.exit(1)});
