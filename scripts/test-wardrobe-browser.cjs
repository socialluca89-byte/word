const {chromium}=require(process.env.WORDYLAND_PLAYWRIGHT_MODULE||'playwright'),assert=require('assert/strict');
const base=process.env.WORDYLAND_TEST_URL;assert(['localhost','127.0.0.1'].includes(new URL(base).hostname));
(async()=>{
 const browser=await chromium.launch({executablePath:process.env.WORDYLAND_CHROMIUM||'/usr/bin/chromium',args:['--no-sandbox','--use-angle=swiftshader','--enable-unsafe-swiftshader']}),errors=[];
 try{
  const p=await browser.newPage({viewport:{width:390,height:844},reducedMotion:'reduce'});p.on('pageerror',e=>errors.push(e.message));
  await p.addInitScript(()=>{window.wardrobeScenes=[];window.wardrobeContexts=0;const context=HTMLCanvasElement.prototype.getContext;HTMLCanvasElement.prototype.getContext=function(kind,...args){const result=context.call(this,kind,...args);if(result&&['webgl','webgl2'].includes(kind))window.wardrobeContexts++;return result;};document.addEventListener('DOMContentLoaded',()=>{const add=THREE.Scene.prototype.add;THREE.Scene.prototype.add=function(...nodes){window.wardrobeScenes.push(this);return add.apply(this,nodes);};});});
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
  assert(await p.evaluate(()=>{let found=false;wardrobeScenes.slice(-1).forEach(scene=>scene.traverse(node=>{if(node.userData.character==='panda')found=true;}));return found;}),'Panda is actually rendered in preview');
  const firstContexts=await p.evaluate(()=>wardrobeContexts);
  await p.locator('[data-preview-item=panda]').click();await p.locator('[data-preview-item=panda]').click();
  const repeatedContexts=await p.evaluate(()=>wardrobeContexts);console.log('Repeated preview WebGL contexts:',JSON.stringify({first:firstContexts,afterTwoIdenticalPreviews:repeatedContexts,extra:repeatedContexts-firstContexts}));
  assert.equal(repeatedContexts,firstContexts,'An unchanged preview must not recreate its WebGL context');
  await p.locator('#returnToReward').click();assert.equal(await p.evaluate(()=>document.activeElement.dataset.previewItem),'panda','Return from preview restores the initiating control');assert.equal(await p.evaluate(()=>document.activeElement.tagName),'BUTTON');
  await p.locator('[data-character-play=kart]').click();await p.locator('#readyChallenge').waitFor();
  assert(await p.evaluate(()=>{let found=false;wardrobeScenes.slice(-1).forEach(scene=>scene.traverse(node=>{if(node.userData.character==='fox')found=true;}));return found;}),'An unowned preview never becomes the character used in a game');
  await p.locator('#pauseQuest').click();await p.locator('.startChoices a[href="#personaggi"]').click();await p.locator('[data-preview-item=panda]').waitFor();
  assert.equal(await p.locator('#stylePreview').getAttribute('data-preview-choice'),null,'Preview is temporary');
  assert.equal(await p.locator('[data-item=fox]').isDisabled(),true);
  for(const width of [320,390,768,1360]){
   await p.setViewportSize({width,height:844});assert(await p.evaluate(()=>document.documentElement.scrollWidth<=innerWidth),'No wardrobe overflow '+width);
   assert(await p.locator('[data-preview-item=panda]').evaluate(node=>node.getBoundingClientRect().height>=44),'Preview touch target '+width);
  }
  assert.deepEqual(errors,[]);console.log('Wardrobe browser passed: keyboard focus, distinct names, free unowned 3D preview, unchanged wallet/inventory, return control, actual owned character in game and four viewport sizes.');
 }finally{await browser.close();}
})().catch(error=>{console.error(error);process.exit(1)});
