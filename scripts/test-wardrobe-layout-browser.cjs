// Child wardrobe layout: real local UI, public artwork and synthetic ownership only.
const {chromium}=require(process.env.WORDYLAND_PLAYWRIGHT_MODULE||'playwright');
const assert=require('assert/strict'),fs=require('fs'),path=require('path'),{spawnSync}=require('child_process');
const base=process.env.WORDYLAND_TEST_URL,data=process.env.WORDYLAND_BROWSER_DATA;
assert(['localhost','127.0.0.1'].includes(new URL(base).hostname),'Never inspect real users');
assert(data?.startsWith('/tmp/wordyland-browser.'),'Disposable data only');
const php=fs.readFileSync('dist/platform.php','utf8'),catalogResult=spawnSync('php',['-r',php.slice(php.indexOf('function shopCatalog()'),php.indexOf('function wallet('))+'echo json_encode(shopCatalog());'],{encoding:'utf8'});
assert.equal(catalogResult.status,0,catalogResult.stderr);
const catalog=JSON.parse(catalogResult.stdout),expectedIds=catalog.map(item=>item.id).sort();
const captures=process.env.WORDYLAND_WARDROBE_LAYOUT_SCREENSHOTS;if(captures)fs.mkdirSync(captures,{recursive:true});
(async()=>{
 const browser=await chromium.launch({executablePath:process.env.WORDYLAND_CHROMIUM||'/usr/bin/chromium',args:['--no-sandbox','--use-angle=swiftshader','--enable-unsafe-swiftshader']});
 try{
  const p=await browser.newPage({viewport:{width:390,height:844},reducedMotion:'reduce'}),errors=[],writes=[],measurements=[];
  p.on('pageerror',error=>errors.push(error.message));p.on('request',r=>{if(r.method()==='POST')writes.push(new URL(r.url()).searchParams.get('action'));});
  await p.goto(base+'/#personaggi');await p.locator('#chooseWardrobeItem').waitFor();await p.evaluate(()=>wordylandAccount.ready);
  const before=await p.evaluate(()=>({wallet:localStorage.getItem('wordylandGuestWallet'),stats:JSON.stringify(stats),stars}));
  for(const width of [320,390,1360]){
   await p.setViewportSize({width,height:844});await p.locator('[data-style=avatar]').click();
   await p.locator('#stylePreview[data-art-ready=ready]').waitFor();
   assert.equal(await p.locator('[data-reward-card]').count(),44,'All original avatar/accessory choices remain');
   const geometry=await p.evaluate(()=>{const h=document.querySelector('.shopHeading').getBoundingClientRect(),card=document.querySelector('[data-reward-card]').getBoundingClientRect(),tabs=document.querySelector('.styleTabs').getBoundingClientRect();return {width:innerWidth,firstCardFromHeading:card.top-h.top,tabsHeight:tabs.height,overflow:document.documentElement.scrollWidth>innerWidth};});
   measurements.push(geometry);assert(!geometry.overflow,'No wardrobe page overflow '+width);
   assert(geometry.firstCardFromHeading<=(width<851?850:400),'Choices follow the short heading instead of several instruction screens '+JSON.stringify(geometry));
   if(width<851)assert(geometry.tabsHeight<=90,'All categories occupy one native scrolling row '+width);
   assert(await p.locator('#chooseWardrobeItem').evaluate(n=>n.getBoundingClientRect().height>=48));
   await p.locator('#chooseWardrobeItem').focus();await p.keyboard.press('Enter');
   assert.equal(await p.evaluate(()=>document.activeElement.id),'reward-title-fox','The direct choice action focuses the real first card');
   assert(await p.locator('[data-reward-card=fox]').evaluate(n=>{const r=n.getBoundingClientRect();return r.top>=0&&r.bottom<=innerHeight;}),'A whole choice is visible after one action '+width);
   if(captures)await p.screenshot({path:path.join(captures,'wardrobe-choices-'+width+'.png')});
  }
  // All twelve category controls remain native buttons and can be reached with Tab.
  await p.setViewportSize({width:320,height:844});await p.locator('[data-style=christmasCharacters]').focus();
  const groupIds=await p.locator('[data-style]').evaluateAll(ns=>ns.map(n=>n.dataset.style));assert.equal(groupIds.length,12);
  const seen=new Set();
  for(let index=0;index<groupIds.length;index++){
   assert.equal(await p.evaluate(()=>document.activeElement.dataset.style),groupIds[index]);
   const scrollBefore=await p.evaluate(()=>scrollY);await p.keyboard.press('Enter');
   assert.equal(await p.locator('[data-style="'+groupIds[index]+'"]').getAttribute('aria-pressed'),'true');
   assert.equal(await p.evaluate(()=>document.activeElement.dataset.style),groupIds[index],'Filtering retains its keyboard position');
   assert(Math.abs((await p.evaluate(()=>scrollY))-scrollBefore)<=2,'Category changes do not unexpectedly scroll the page');
   assert(await p.locator('[data-style="'+groupIds[index]+'"]').evaluate(n=>{const r=n.getBoundingClientRect(),bar=n.closest('nav').getBoundingClientRect();return r.left>=bar.left&&r.right<=bar.right;}),'The focused category stays visible inside its scrolling row');
   for(const id of await p.locator('[data-reward-card]').evaluateAll(ns=>ns.map(n=>n.dataset.rewardCard)))seen.add(id);
   if(index<groupIds.length-1)await p.keyboard.press('Tab');
  }
  assert.deepEqual([...seen].sort(),expectedIds,'No item is removed or made unreachable by the compact layout');
  // Information is optional but remains fully reachable with native disclosure semantics.
  await p.locator('.wardrobeHelp>summary').focus();await p.keyboard.press('Enter');
  assert.equal(await p.locator('.wardrobeHelp').getAttribute('open'),'');
  assert.match(await p.locator('.wardrobeHelp').textContent(),/Nessun acquisto con denaro reale/);
  assert.match(await p.locator('.wardrobeHelp').textContent(),/compagno del rifugio/);
  assert(await p.locator('.wardrobeHelp a[href="#festivita"]').isVisible());assert(await p.locator('.wardrobeHelp a[href="#scoperte"]').isVisible());
  await p.locator('.wardrobeHelp>summary').focus();await p.keyboard.press('Enter');
  for(const width of [320,390,1360]){
   await p.setViewportSize({width,height:844});await p.locator('[data-style=christmasCharacters]').click();
   assert.equal(await p.locator('[data-reward-card]').count(),12);assert(await p.locator('[data-item=santa]').isDisabled());
   await p.locator('[data-preview-item=santa]').scrollIntoViewIfNeeded();const previewBefore=await p.locator('#stylePreview').evaluate(n=>{const r=n.getBoundingClientRect();return {top:r.top,bottom:r.bottom,height:innerHeight};}),wasVisible=previewBefore.top>=16&&previewBefore.bottom<=previewBefore.height-16,scrollBefore=await p.evaluate(()=>scrollY);
   if(width>850)assert(previewBefore.top>=0&&previewBefore.bottom<=previewBefore.height,'Desktop keeps the full portrait in view beside cards further down the list '+JSON.stringify(previewBefore));
   await p.locator('[data-preview-item=santa]').click();await p.locator('#stylePreview[data-art-ready=ready]').waitFor();
   assert.equal(await p.locator('#stylePreview').getAttribute('data-preview-choice'),'santa');assert.equal(await p.evaluate(()=>document.activeElement.id),'stylePreview');
   assert.equal(await p.locator('#stylePreview .illustratedActor').getAttribute('data-character'),'santa');
   const art=async selector=>p.locator(selector).evaluate(n=>({image:getComputedStyle(n).backgroundImage,position:getComputedStyle(n).backgroundPosition}));
   assert.deepEqual(await art('#stylePreview .illustratedActor>.racerModel'),await art('[data-reward-card=santa]>.racerModel'),'Preview and card use the same actual portrait');
   if(width>850){const scrollAfter=await p.evaluate(()=>scrollY),after=await p.locator('#stylePreview').evaluate(n=>{const r=n.getBoundingClientRect(),pane=n.closest('.wardrobePreviewPane').getBoundingClientRect();return {top:r.top,bottom:r.bottom,paneTop:pane.top,paneHeight:pane.height};});assert(Math.abs(scrollAfter-scrollBefore)<=(wasVisible?2:80),'Desktop needs at most a small focus-margin adjustment, never a multi-screen jump '+JSON.stringify({scrollBefore,scrollAfter,wasVisible,previewBefore,after}));}
   assert(await p.locator('#stylePreview').evaluate(n=>{const r=n.getBoundingClientRect();return r.top>=15&&r.bottom<=innerHeight-15;}),'The focused portrait has space for its visible focus ring');
   assert(await p.locator('#returnToReward').isVisible());
   assert.equal(await p.locator('[data-character-play]').count(),3);
   assert(await p.locator('[data-character-play]').evaluateAll(ns=>ns.every(n=>n.getBoundingClientRect().height>=48&&n.getBoundingClientRect().width>=44)));
   if(captures)await p.screenshot({path:path.join(captures,'wardrobe-preview-'+width+'.png')});
   await p.locator('#returnToReward').focus();await p.keyboard.press('Enter');
   assert.equal(await p.evaluate(()=>document.activeElement.dataset.previewItem),'santa','Return restores the initiating button, not a different item');
   const returned=await p.locator('[data-reward-card=santa]').evaluate(n=>{const r=n.getBoundingClientRect();return {top:r.top,bottom:r.bottom,height:r.height,viewport:innerHeight,scrollY};});if(captures)await p.screenshot({path:path.join(captures,'wardrobe-return-'+width+'.png')});
   assert(returned.top>=0&&returned.bottom<=returned.viewport,'Return shows the whole initiating card '+JSON.stringify(returned));
  }
  // Short desktop windows use normal document scrolling instead of a trapped sticky pane.
  await p.setViewportSize({width:1360,height:600});await p.locator('[data-style=christmasCharacters]').click();
  assert.equal(await p.locator('.wardrobePreviewPane').evaluate(n=>getComputedStyle(n).position),'static');
  await p.locator('[data-preview-item=santa]').click();await p.locator('#stylePreview[data-art-ready=ready]').waitFor();
  for(const selector of ['#shopPreviewControls [data-scene-style=illustrated]','#shopPreviewControls [data-scene-style="3d"]','#returnToReward','[data-character-play=kart]','[data-character-play=football]','[data-character-play=space]']){
   await p.locator(selector).focus();assert(await p.locator(selector).evaluate(n=>{const r=n.getBoundingClientRect();return r.top>=0&&r.bottom<=innerHeight;}),'Every preview/game control remains reachable in a 600px-high window '+selector);
  }
  await p.locator('#returnToReward').focus();await p.keyboard.press('Enter');assert.equal(await p.evaluate(()=>document.activeElement.dataset.previewItem),'santa');
  if(captures)await p.screenshot({path:path.join(captures,'wardrobe-short-1360x600.png')});
  assert.deepEqual(await p.evaluate(()=>({wallet:localStorage.getItem('wordylandGuestWallet'),stats:JSON.stringify(stats),stars})),before,'Changing categories or preview never alters a choice, reward or economy');
  assert.deepEqual(writes,[],'No API mutation from wardrobe layout/navigation/preview');
  // Synthetic ownership exercises the real equip endpoint, not a preview masquerading as a choice.
  const profile=await p.evaluate(async()=>{const a=wordylandAccount;await a.connect(await a.request('register',{username:'wardrobe_layout_fixture',password:'Wardrobe-local-layout-123',adult:true}));return a.createProfile('Prova guardaroba');});
  await p.evaluate(async id=>wordylandAccount.request('hub&profile='+id),profile.id);
  const seed=spawnSync('php',['-r',`$db=new PDO('sqlite:'.getenv('WORDYLAND_BROWSER_DATA').'/wordyland.sqlite');$q=$db->prepare('INSERT OR IGNORE INTO inventory(profile_id,item) VALUES (?,?)');foreach(['robot','crown'] as $item)$q->execute([(int)$argv[1],$item]);`,String(profile.id)],{env:process.env,encoding:'utf8'});assert.equal(seed.status,0,seed.stderr);
  await p.reload();await p.locator('[data-style=avatar]').click();
  const walletBefore=await p.evaluate(async()=>{const a=wordylandAccount;return (await a.request('hub&profile='+a.info().id)).wallet;});
  for(const id of ['robot','crown']){await p.locator('[data-item="'+id+'"]').click();await p.locator('[data-item="'+id+'"]').getByText('In uso ✓').waitFor();}
  for(const width of [320,390,1360]){
   await p.setViewportSize({width,height:844});await p.locator('#stylePreview').scrollIntoViewIfNeeded();await p.locator('#stylePreview[data-art-ready=ready]').waitFor();
   assert.equal(await p.locator('#stylePreview .illustratedActor').getAttribute('data-character'),'robot');
   assert(await p.locator('#stylePreview').evaluate(host=>{const picture=host.getBoundingClientRect();return ['.illustratedActor>.racerModel','[data-reward=crown]'].every(selector=>{const r=host.querySelector(selector).getBoundingClientRect();return r.left>=picture.left&&r.top>=picture.top&&r.right<=picture.right&&r.bottom<=picture.bottom;});}),'Compact preview keeps both character and chosen accessory fully visible '+width);
  }
  const walletAfter=await p.evaluate(async()=>{const a=wordylandAccount;return (await a.request('hub&profile='+a.info().id)).wallet;});
  assert.equal(walletAfter.coins,walletBefore.coins);assert.equal(walletAfter.xp,walletBefore.xp);assert.equal(walletAfter.equipped.avatar,'robot');assert.equal(walletAfter.equipped.hat,'crown');
  await p.locator('[data-style=christmasCharacters]').click();await p.locator('[data-preview-item=santa]').click();
  await p.locator('[data-character-play=football]').click();await p.locator('#readyChallenge').waitFor();
  assert.equal(await p.locator('#missionWorld .illustratedActor').getAttribute('data-character'),'robot','Play uses the equipped character, not the unowned preview');
  assert.equal(await p.locator('#missionWorld [data-reward=crown]').count(),1);
  assert.deepEqual(errors,[]);console.log('Wardrobe layout passed: compact choices, twelve native keyboard categories/all catalog items, optional complete rules, same illustrated portraits, free previews and return focus, visible saved accessories, actual owned pilot in play and mobile/desktop layouts. Measurements: '+JSON.stringify(measurements));
 }finally{await browser.close();}
})().catch(error=>{console.error(error);process.exit(1)});
