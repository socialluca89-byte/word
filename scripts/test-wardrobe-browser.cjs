const {chromium}=require(process.env.WORDYLAND_PLAYWRIGHT_MODULE||'playwright'),assert=require('assert/strict');
const base=process.env.WORDYLAND_TEST_URL;assert(['localhost','127.0.0.1'].includes(new URL(base).hostname));
(async()=>{
 const browser=await chromium.launch({executablePath:process.env.WORDYLAND_CHROMIUM||'/usr/bin/chromium',args:['--no-sandbox','--use-angle=swiftshader','--enable-unsafe-swiftshader']}),errors=[];
 try{
  const p=await browser.newPage({viewport:{width:390,height:844},reducedMotion:'reduce'});p.on('pageerror',e=>errors.push(e.message));
  await p.addInitScript(()=>{window.wardrobeContexts=0;const context=HTMLCanvasElement.prototype.getContext;HTMLCanvasElement.prototype.getContext=function(kind,...args){const result=context.call(this,kind,...args);if(result&&['webgl','webgl2'].includes(kind))window.wardrobeContexts++;return result;};});
  // Install the observer before island.js can mount any renderer. A global
  // "latest scene" can belong to the hero while the chosen preview is deferred.
  await p.route('**/three.min.js*',async route=>{
   assert.equal(new URL(route.request().url()).origin,new URL(base).origin,'Instrument only the synthetic local fixture');
   const response=await route.fetch(),original=await response.text();
   const spy=`\n;(()=>{const T=window.THREE,Original=T.WebGLRenderer;window.wardrobeRenderedScenes=new WeakMap();function TrackedWebGLRenderer(...args){const renderer=new Original(...args),render=renderer.render;renderer.render=function(...args){const result=render.apply(this,args);window.wardrobeRenderedScenes.set(renderer.domElement,args[0]);return result;};return renderer;}TrackedWebGLRenderer.prototype=Original.prototype;Object.setPrototypeOf(TrackedWebGLRenderer,Original);T.WebGLRenderer=TrackedWebGLRenderer;})();\n`;
   await route.fulfill({response,body:original+spy});
  });
  async function sceneDetails(selector='#stylePreview'){
   await p.locator(selector).scrollIntoViewIfNeeded();await p.locator(selector+'[data-render="3d"] canvas').waitFor();
   await p.waitForFunction(selector=>{const canvas=document.querySelector(selector)?.querySelector('canvas');return canvas&&window.wardrobeRenderedScenes?.has(canvas);},selector);
   return p.evaluate(selector=>{const scene=wardrobeRenderedScenes.get(document.querySelector(selector+' canvas')),characters=[],rewards=[];scene.traverse(node=>{if(node.userData.reward)rewards.push(node.userData.reward);if(node.userData.character){const attached=[];node.traverse(child=>{if(child.userData.reward)attached.push(child.userData.reward);});characters.push({id:node.userData.character,rewards:attached});}});return {characters,rewards};},selector);
  }
  await p.goto(base+'/#personaggi');await p.locator('[data-style=pet]').focus();await p.keyboard.press('Enter');
  assert.equal(await p.evaluate(()=>document.activeElement.dataset.style),'pet','Changing a wardrobe section must preserve keyboard focus');
  await p.locator('[data-item=pet-bunny]').focus();await p.keyboard.press('Enter');await p.locator('[data-item=pet-bunny]').getByText('In uso ✓').waitFor();
  assert.equal(await p.evaluate(()=>document.activeElement.closest('[data-reward-card]')?.dataset.rewardCard),'pet-bunny','Choosing an item keeps focus at that item');
  await p.locator('[data-style=avatar]').focus();await p.keyboard.press('Enter');
  const before=await p.evaluate(()=>JSON.parse(localStorage.getItem('wordylandGuestWallet')));
  await p.getByRole('button',{name:'Anteprima di Panda delle stelle',exact:true}).focus();await p.keyboard.press('Enter');
  await p.locator('#shopPreviewStatus').getByText(/Solo anteprima/).waitFor();assert.equal(await p.locator('#stylePreview').getAttribute('data-preview-choice'),'panda');
  assert.deepEqual(await p.evaluate(()=>JSON.parse(localStorage.getItem('wordylandGuestWallet'))),before,'Free preview never spends coins or unlocks an item');
  assert.equal(await p.evaluate(()=>document.activeElement.id),'stylePreview','Preview focus goes to the named preview region');
  assert((await sceneDetails()).characters.some(character=>character.id==='panda'),'Panda is actually rendered in preview');
  const firstContexts=await p.evaluate(()=>wardrobeContexts);
  await p.locator('[data-preview-item=panda]').click();await p.locator('[data-preview-item=panda]').click();
  const repeatedContexts=await p.evaluate(()=>wardrobeContexts);console.log('Repeated preview WebGL contexts:',JSON.stringify({first:firstContexts,afterTwoIdenticalPreviews:repeatedContexts,extra:repeatedContexts-firstContexts}));
  assert.equal(repeatedContexts,firstContexts,'An unchanged preview must not recreate its WebGL context');
  await p.locator('#returnToReward').click();assert.equal(await p.evaluate(()=>document.activeElement.dataset.previewItem),'panda','Return from preview restores the initiating control');assert.equal(await p.evaluate(()=>document.activeElement.tagName),'BUTTON');
  await p.locator('[data-character-play=kart]').click();await p.locator('#readyChallenge').waitFor();
  assert((await sceneDetails('#missionWorld')).characters.some(character=>character.id==='fox'),'An unowned preview never becomes the character used in a game');
  await p.locator('#pauseQuest').click();await p.locator('.startChoices a[href="#personaggi"]').click();await p.locator('[data-preview-item=panda]').waitFor();
  assert.equal(await p.locator('#stylePreview').getAttribute('data-preview-choice'),null,'Preview is temporary');
  assert.equal(await p.locator('[data-item=fox]').isDisabled(),true);
  for(const width of [320,390,768,1360]){
   await p.setViewportSize({width,height:844});assert(await p.evaluate(()=>document.documentElement.scrollWidth<=innerWidth),'No wardrobe overflow '+width);
   assert(await p.locator('[data-preview-item=panda]').evaluate(node=>node.getBoundingClientRect().height>=44),'Preview touch target '+width);
  }
  // All Christmas items are persistent free choices, with real meshes in the preview.
  await p.locator('[data-style=christmas]').click();assert.equal(await p.locator('[data-reward-card]').count(),28);
  const festiveBefore=await p.evaluate(()=>JSON.parse(localStorage.getItem('wordylandGuestWallet')));
  for(const id of ['hat-santa','hat-elf','hat-reindeer','neck-scarf','effect-snow','kart-christmas','trophy-tree','hat-snowman','hat-cookie','hat-gift','effect-stars','rocket-christmas']){
   await p.locator('[data-preview-item="'+id+'"]').click();assert((await sceneDetails()).rewards.includes(id),'Actual festive geometry '+id);
   assert.deepEqual(await p.evaluate(()=>JSON.parse(localStorage.getItem('wordylandGuestWallet'))),festiveBefore,'Preview is free and temporary '+id);
  }
  assert.equal(await p.locator('[data-item=hat-santa]').isDisabled(),true);assert.equal(await p.locator('[data-item=reindeer]').isDisabled(),true);
  // Model-only regression uses explicitly synthetic local ownership. Real unlocks are
  // exercised through holiday API/browser tests; neither preview nor a click grants them.
  await p.evaluate(()=>{const g=JSON.parse(localStorage.getItem('wordylandGuestWallet'));g.inventory=[...new Set([...g.inventory,'hat-santa','neck-scarf','effect-snow'])];localStorage.setItem('wordylandGuestWallet',JSON.stringify(g));});await p.reload();await p.locator('[data-style=christmas]').click();
  for(const id of ['hat-santa','neck-scarf','effect-snow']){await p.locator('[data-item="'+id+'"]').click();await p.locator('[data-item="'+id+'"]').getByText('In uso ✓').waitFor();}
  await p.reload();await p.locator('[data-style=christmas]').click();assert.equal(await p.locator('[data-item=neck-scarf]').isDisabled(),true);
  const equipped=await p.evaluate(()=>JSON.parse(localStorage.getItem('wordylandGuestWallet')));assert.equal(equipped.coins,festiveBefore.coins);assert.equal(equipped.xp,festiveBefore.xp);assert.equal(equipped.inventory.filter(x=>x==='hat-santa').length,1);assert.equal(equipped.equipped.hat,'hat-santa');assert.equal(equipped.equipped.effect,'effect-snow');
  await p.locator('[data-item=neck-none]').click();await p.locator('[data-item=neck-none]').getByText('In uso ✓').waitFor();await p.locator('[data-preview-item=hat-santa]').click();assert(!(await sceneDetails()).rewards.includes('neck-scarf'),'Scarf can be removed');
  // Retain the festive outfit on every character, using only local synthetic ownership.
  for(const avatar of ['fox','panda','robot','dragon','octopus','lion']){await p.evaluate(avatar=>{const g=JSON.parse(localStorage.getItem('wordylandGuestWallet'));if(!g.inventory.includes(avatar))g.inventory.push(avatar);g.equipped.avatar=avatar;localStorage.setItem('wordylandGuestWallet',JSON.stringify(g));},avatar);await p.reload();await p.locator('[data-style=christmas]').click();await p.locator('[data-preview-item=hat-santa]').click();assert((await sceneDetails()).characters.some(character=>character.id===avatar&&character.rewards.includes('hat-santa')),'Hat attached to '+avatar);}
  for(const width of [320,390,768,1360]){await p.setViewportSize({width,height:844});assert(await p.evaluate(()=>document.documentElement.scrollWidth<=innerWidth),'Christmas tab overflow '+width);}
  if(process.env.WORDYLAND_CHRISTMAS_SCREENSHOT){await p.setViewportSize({width:390,height:844});await p.locator('#stylePreview').screenshot({path:process.env.WORDYLAND_CHRISTMAS_SCREENSHOT});}
  assert.deepEqual(errors,[]);console.log('Wardrobe browser passed: keyboard focus, distinct names, free unowned 3D preview, unchanged wallet/inventory, return control, actual owned character in game four viewport sizes, twelve real festive meshes, twenty-eight festive choices, scarf removal, persisted outfit and six original avatar variants and earned-only Christmas controls.');
 }finally{await browser.close();}
})().catch(error=>{console.error(error);process.exit(1)});
