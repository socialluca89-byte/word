// Local wardrobe/scene contract: the production illustration default and synthetic ownership only.
const {chromium}=require(process.env.WORDYLAND_PLAYWRIGHT_MODULE||'playwright');
const assert=require('assert/strict'),fs=require('fs'),{spawnSync}=require('child_process');
const base=process.env.WORDYLAND_TEST_URL;
assert(['localhost','127.0.0.1'].includes(new URL(base).hostname),'Local fixtures only');
assert(process.env.WORDYLAND_BROWSER_DATA?.startsWith('/tmp/wordyland-browser.'));
const php=fs.readFileSync('dist/platform.php','utf8'),catalogResult=spawnSync('php',['-r',php.slice(php.indexOf('function shopCatalog()'),php.indexOf('function wallet('))+'echo json_encode(shopCatalog());'],{encoding:'utf8'});
assert.equal(catalogResult.status,0,catalogResult.stderr);const catalog=JSON.parse(catalogResult.stdout),byId=new Map(catalog.map(x=>[x.id,x]));
(async()=>{
 const browser=await chromium.launch({executablePath:process.env.WORDYLAND_CHROMIUM||'/usr/bin/chromium',args:['--no-sandbox','--use-angle=swiftshader','--enable-unsafe-swiftshader']});
 try{
  const p=await browser.newPage({viewport:{width:390,height:844},reducedMotion:'reduce'}),errors=[],writes=[];
  p.on('pageerror',e=>errors.push(e.message));p.on('request',r=>{if(r.method()==='POST')writes.push(r.url());});
  await p.goto(base+'/#personaggi');await p.evaluate(()=>wordylandAccount.ready);assert.equal(await p.evaluate(()=>localStorage.getItem('wordylandSceneStyle')),null,'Actual default, without test-forced classic mode');
  const before=await p.evaluate(()=>({wallet:localStorage.getItem('wordylandGuestWallet'),stats:JSON.stringify(stats),stars})),seen=new Set();
  const groups=await p.locator('[data-style]').evaluateAll(ns=>ns.map(n=>n.dataset.style));
  for(const group of groups){
   await p.locator('[data-style="'+group+'"]').click();
   for(const id of await p.locator('[data-preview-item]').evaluateAll(ns=>ns.map(n=>n.dataset.previewItem))){
    if(seen.has(id))continue;seen.add(id);const item=byId.get(id);assert(item,'Public card has authoritative catalog entry '+id);
    await p.locator('[data-preview-item="'+id+'"]').click();await p.waitForFunction(()=>document.querySelector('#stylePreview')?.dataset.artReady==='ready');
    const preview=p.locator('#stylePreview');assert.equal(await preview.getAttribute('data-render'),'illustrated');
    if(item.slot==='avatar')assert.equal(await preview.locator('.illustratedActor').getAttribute('data-character'),id,'Avatar preview '+id);
    else if(item.slot==='pet')assert.equal(await preview.locator('.illustratedActor').getAttribute('data-character'),id,'Companion preview '+id);
    else if(id==='neck-none')assert.equal(await preview.locator('[data-reward=neck-scarf],[data-reward=neck-ocean]').count(),0,'Removing scarf has a visible absence');
    else {const shown=preview.locator('[data-reward="'+id+'"]');assert.equal(await shown.count(),1,'The advertised choice actually appears in the default preview '+id);assert.equal(await shown.getAttribute('title'),item.name,'Reward uses its readable catalog name '+id);assert.equal(await shown.getAttribute('aria-label'),item.name,'Reward has an accessible catalog name '+id);}
   }
  }
  assert.equal(seen.size,catalog.length,'Every existing item remains reachable and represented');assert.deepEqual(await p.evaluate(()=>({wallet:localStorage.getItem('wordylandGuestWallet'),stats:JSON.stringify(stats),stars})),before,'Previews never purchase, award or alter progress');assert.deepEqual(writes,[],'No API mutation from any preview');
  // Synthetic owned profile: purchases use the real API; only test funds/badge are seeded privately.
  const credentials={username:'appearance_'+Date.now(),password:'Appearance-fixture-only-123',adult:true};
  const profile=await p.evaluate(async c=>{const a=wordylandAccount;await a.connect(await a.request('register',c));return a.createProfile('Prova aspetto');},credentials);
  await p.evaluate(async id=>wordylandAccount.request('hub&profile='+id),profile.id);
  const seed=spawnSync('php',['-r',`$db=new PDO('sqlite:'.getenv('WORDYLAND_BROWSER_DATA').'/wordyland.sqlite');$q=$db->prepare('UPDATE wallets SET coins=500 WHERE profile_id=?');$q->execute([(int)$argv[1]]);$db->prepare('INSERT INTO inventory(profile_id,item) VALUES (?,?)')->execute([(int)$argv[1],'badge-first']);`,String(profile.id)],{env:process.env,encoding:'utf8'});assert.equal(seed.status,0,seed.stderr);
  await p.reload();await p.evaluate(()=>wordylandAccount.ready);
  const choose=async(group,id)=>{await p.locator('[data-style="'+group+'"]').click();await p.locator('[data-item="'+id+'"]').click();await p.locator('[data-item="'+id+'"]').getByText('In uso ✓').waitFor();};
  for(const [group,id]of[['avatar','robot'],['avatar','crown'],['badge','badge-first'],['ball','ball-sun'],['rocket','rocket-mint'],['palette','paint-forest'],['kart','kart-purple']])await choose(group,id);
  await p.reload();await p.evaluate(()=>wordylandAccount.ready);await p.waitForFunction(()=>document.querySelector('#stylePreview')?.dataset.artReady==='ready');
  assert.equal(await p.locator('#stylePreview .illustratedActor').getAttribute('data-character'),'robot');assert.equal(await p.locator('#stylePreview [data-reward=badge-first]').count(),1,'Earned equipped badge stays visible after reload');assert.equal(await p.locator('#stylePreview [data-reward=crown]').count(),1);
  const canonical=await p.evaluate(async id=>(await wordylandAccount.request('hub&profile='+id)).wallet,profile.id);assert.equal(canonical.coins,335);assert.equal(canonical.equipped.badge,'badge-first');
  const expected={football:{group:'ball',preview:'ball-ocean',selector:'.actionBallBody',color:'#ffc15c'},space:{group:'rocket',preview:'rocket-galaxy',selector:'.actionRocketBody',color:'#8cd8be'},kart:{group:'kart',preview:'kart-gold',selector:'.actionKartBody',color:'#a48be0'},creative:{group:'palette',preview:'paint-candy',selector:'.actionPaintStroke',colors:['#4fa978','#b2d86c','#dfa463']}};
  for(const [kind,e]of Object.entries(expected)){
   await p.locator('.startChoices a[href="#personaggi"]').click();await p.locator('[data-style="'+e.group+'"]').click();await p.locator('[data-preview-item="'+e.preview+'"]').click();
   await p.locator('[data-tab=adventures]').click();await p.locator('[data-destination="'+kind+'"]').click();await p.locator('#placePlayground .scenePlayButton').click();const action=p.locator('#placePreview .illustratedWorldAction');
   assert.equal(await p.locator('#placePreview .illustratedActor').getAttribute('data-character'),'robot','Temporary wardrobe preview never overrides actual avatar '+kind);assert.equal(await p.locator('#placePreview [data-reward=badge-first]').count(),1);
   if(e.colors){assert.deepEqual((await action.locator(e.selector).evaluateAll(ns=>ns.map(n=>n.getAttribute('stroke')))).sort(),[...e.colors].sort(),'Mix uses the equipped paint palette');await p.locator('#placePlayground .scenePlayButton').click();assert.deepEqual((await action.locator(e.selector).evaluateAll(ns=>ns.map(n=>n.getAttribute('stroke')))).sort(),[...e.colors].sort(),'Remixing keeps the chosen palette');}
   else assert.equal(await action.locator(e.selector).getAttribute('fill'),e.color,'The actual game object respects equipped skin '+kind);
   assert.equal(await p.locator('#placePlayground .worldToy').getAttribute('data-toy-step'),'0','A cosmetic demonstration is not exercise progress');
  }
  await p.locator('#placePlayground [data-scene-style="3d"]').click();await p.locator('#placePreview[data-render="3d"] canvas').waitFor();await p.locator('#placePlayground [data-scene-style=illustrated]').click();await p.waitForFunction(()=>document.querySelector('#placePreview')?.dataset.artReady==='ready');assert.equal(await p.locator('#placePreview [data-reward=paint-forest]').count(),1,'Changing renderer restores the saved cosmetic choice');
  const after=await p.evaluate(async id=>(await wordylandAccount.request('hub&profile='+id)).wallet,profile.id);assert.deepEqual(after,canonical,'Previews, scene actions and renderer choice never charge or change equipment');
  const second=await p.evaluate(()=>wordylandAccount.createProfile('Altra prova'));await p.locator('.startChoices a[href="#personaggi"]').click();await p.waitForFunction(()=>document.querySelector('#stylePreview')?.dataset.artReady==='ready'&&document.querySelector('#stylePreview .illustratedActor')?.dataset.character==='fox');assert.equal(await p.locator('#stylePreview .illustratedActor').getAttribute('data-character'),'fox');assert.equal(await p.locator('#stylePreview [data-reward=badge-first]').count(),0,'Private badge does not leak to another profile');await p.evaluate(async id=>wordylandAccount.selectProfile(id),profile.id);await p.locator('#stylePreview [data-reward=badge-first]').waitFor();await p.waitForFunction(()=>document.querySelector('#stylePreview')?.dataset.artReady==='ready');assert.equal(await p.locator('#stylePreview [data-reward=badge-first]').count(),1,'Returning restores selected profile equipment');
  assert.notEqual(second.id,profile.id);
  const overlaps=(a,b)=>a.x<b.x+b.width&&a.x+a.width>b.x&&a.y<b.y+b.height&&a.y+a.height>b.y;
  async function wardrobeLayout(width,hat){
   assert.equal(await p.locator('#stylePreview .previewBadge,#stylePreview .sceneViewModes').count(),0,'Labels and view controls are outside the image');assert.equal(await p.locator('#shopPreviewControls .sceneViewModes').count(),1,'Exactly one retained view switch');
   const picture=await p.locator('#stylePreview').boundingBox(),caption=await p.locator('#shopPreviewLabel').boundingBox(),controls=await p.locator('#shopPreviewControls .sceneViewModes').boundingBox();
   for(const selector of ['.illustratedActor>.racerModel','[data-reward="'+hat+'"]','.illustratedBadge']){const box=await p.locator('#stylePreview '+selector).boundingBox();assert(box,'Visible character/accessory '+selector);assert(box.x>=picture.x-1&&box.y>=picture.y-1&&box.x+box.width<=picture.x+picture.width+1&&box.y+box.height<=picture.y+picture.height+1,'The whole portrait/accessory fits inside the picture '+selector+' '+width);assert(!overlaps(box,caption)&&!overlaps(box,controls),'Caption and controls never cover '+selector+' '+width);}
  }
  for(const width of [320,390,1180]){
   await p.setViewportSize({width,height:900});await p.locator('.startChoices a[href="#personaggi"]').click();await p.waitForFunction(()=>document.querySelector('#stylePreview')?.dataset.artReady==='ready');assert(await p.evaluate(()=>document.documentElement.scrollWidth<=innerWidth),'No appearance overflow '+width);await wardrobeLayout(width,'crown');
   await p.locator('[data-preview-item=hat-wizard]').click();assert.equal(await p.locator('#shopPreviewLabel').textContent(),'Solo anteprima · Cappello delle magie');assert.equal(await p.locator('#stylePreview').getAttribute('aria-label'),'Anteprima di Cappello delle magie');await wardrobeLayout(width,'hat-wizard');
   if(process.env.WORDYLAND_APPEARANCE_CAPTURE)await p.locator('.shopPreviewFrame').screenshot({path:process.env.WORDYLAND_APPEARANCE_CAPTURE.replace(/\.png$/,'-'+width+'.png')});
  }
  await p.locator('#shopPreviewControls [data-scene-style="3d"]').click();await p.locator('#stylePreview[data-render="3d"] canvas').waitFor();assert.equal(await p.locator('#shopPreviewControls .sceneViewModes').count(),1);await p.locator('#shopPreviewControls [data-scene-style=illustrated]').click();await p.waitForFunction(()=>document.querySelector('#stylePreview')?.dataset.artReady==='ready');await wardrobeLayout(1180,'hat-wizard');
  for(const group of ['home','avatar','badge','avatar']){await p.locator('[data-style="'+group+'"]').click();assert.equal(await p.locator('#shopPreviewControls .sceneViewModes').count(),1,'Replacing the preview disposes its previous dock');}
  await p.locator('.startChoices a[href="#allenati"]').click();await p.locator('.lessonGrid').waitFor();assert.equal(await p.locator('.shopPreviewFrame,#shopPreviewControls').count(),0,'Leaving removes the preview and external controls');await p.locator('.startChoices a[href="#personaggi"]').click();await p.waitForFunction(()=>document.querySelector('#stylePreview')?.dataset.artReady==='ready');await wardrobeLayout(1180,'crown');
  assert.deepEqual(await p.evaluate(async id=>(await wordylandAccount.request('hub&profile='+id)).wallet,profile.id),canonical,'Preview, layout and renderer changes never purchase an item or change saved equipment');
  if(process.env.WORDYLAND_APPEARANCE_CAPTURE)await p.locator('.shopPreviewFrame').screenshot({path:process.env.WORDYLAND_APPEARANCE_CAPTURE});assert.deepEqual(errors,[]);
  console.log('Appearance consistency passed: all97 reachable original items represented in illustrated previews, no guest mutation, owned avatar/crown/badge reload and profile isolation, four equipped action skins/palettes instead of temporary previews, unchanged wallet/equipment, retained3D, detached caption/controls with whole hat/crown/badge visible, dock cleanup and mobile/desktop.');
 }finally{await browser.close();}
})().catch(e=>{console.error(e);process.exit(1)});
