const {chromium}=require(process.env.WORDYLAND_PLAYWRIGHT_MODULE||'playwright'),assert=require('assert/strict');
const base=process.env.WORDYLAND_TEST_URL;assert(['localhost','127.0.0.1'].includes(new URL(base).hostname));
(async()=>{
const browser=await chromium.launch({executablePath:process.env.WORDYLAND_CHROMIUM||'/usr/bin/chromium',args:['--no-sandbox','--use-angle=swiftshader','--enable-unsafe-swiftshader']});
try{
const p=await browser.newPage({viewport:{width:390,height:844},reducedMotion:'reduce'}),errors=[];p.on('pageerror',e=>errors.push(e.message));
// Observe the scene actually rendered by this preview canvas, before island.js mounts it.
// The production renderer may defer an offscreen preview until it enters the viewport.
await p.route('**/three.min.js*',async route=>{
 assert.equal(new URL(route.request().url()).origin,new URL(base).origin,'Instrument only the synthetic local fixture');
 const response=await route.fetch(),original=await response.text();
 const spy=`\n;(()=>{const T=window.THREE,Original=T.WebGLRenderer;window.rewardRenderedScenes=new WeakMap();function TrackedWebGLRenderer(...args){const renderer=new Original(...args),render=renderer.render;renderer.render=function(...args){const result=render.apply(this,args);window.rewardRenderedScenes.set(renderer.domElement,args[0]);return result;};return renderer;}TrackedWebGLRenderer.prototype=Original.prototype;Object.setPrototypeOf(TrackedWebGLRenderer,Original);T.WebGLRenderer=TrackedWebGLRenderer;})();\n`;
 await route.fulfill({response,body:original+spy});
});
async function sceneDetails(){
 await p.locator('#stylePreview').scrollIntoViewIfNeeded();
 await p.locator('#stylePreview[data-render="3d"] canvas').waitFor();
 await p.waitForFunction(()=>{const canvas=document.querySelector('#stylePreview canvas');return canvas&&window.rewardRenderedScenes?.has(canvas);});
 return p.evaluate(()=>{const values=[],colors=[],canvas=document.querySelector('#stylePreview canvas'),scene=window.rewardRenderedScenes.get(canvas);scene.traverse(o=>{if(o.userData.reward)values.push(o.userData.reward);if(o.userData.character)values.push(o.userData.character);if(o.material?.color)colors.push(o.material.color.getHex());});return {values,colors};});
}
 async function answer(p,expectNext=true){
  await p.locator('#readyChallenge').waitFor();const word=(await p.locator('#questWork .questWord').textContent()).trim(),translation=(await p.locator('#missionStage .questPicture+p').textContent()).trim();await p.locator('#readyChallenge').click();
  if(await p.locator('[data-answer]').count()){let found=false;for(const button of await p.locator('[data-answer]').all()){const small=button.locator('small');if(await small.count()?(await small.textContent()).trim()===translation:(await button.textContent()).trim()===word){await button.click();found=true;break;}}assert(found);}
  else if(await p.locator('#questAnswer').count()){const mask=await p.locator('#questWork .questWord').count()?await p.locator('#questWork .questWord').textContent():'';const start=mask.indexOf('_');let end=start;while(mask[end]==='_')end++;await p.locator('#questAnswer').fill(start<0?word:word.slice(start,end));await p.getByRole('button',{name:'Controlla ✓',exact:true}).click();}
  else{for(const char of word){let found=false;for(const button of await p.locator('[data-tile]:not(:disabled)').all())if(await button.textContent()===(char===' '?'␣':char)){await button.click();found=true;break;}assert(found);}await p.getByRole('button',{name:'Controlla ✓',exact:true}).click();}
  if(expectNext)await p.locator('#questNext,#completedWorld').first().waitFor();return word;
 }

await p.goto(base+'/#personaggi');await p.locator('[data-item=fox]').waitFor();
await p.locator('[data-style=badge]').click();assert(await p.locator('[data-item=badge-first]').isDisabled());
await p.evaluate(()=>{const w=JSON.parse(localStorage.getItem('wordylandGuestWallet'))||{coins:0,xp:0,equipped:{avatar:'fox'},inventory:['fox']};w.coins=1500;localStorage.setItem('wordylandGuestWallet',JSON.stringify(w));});await p.reload();
// Exercise-earned gifts and the free scarf removal are not ordinary purchases.
// Preserve coverage of all nineteen original priced extras without trying to buy locked gifts.
const extras=await p.evaluate(()=>wordylandRewardExtras.filter(x=>x.price>0&&!x.unlock&&!x.event)),groups={hat:'avatar',effect:'avatar',room:'home'};assert.equal(extras.length,19);let expectedCoins=1500;
for(const item of extras){await p.locator('[data-style='+(groups[item.slot]||item.slot)+']').click();await p.locator('[data-item='+item.id+']').click();await p.locator('[data-item='+item.id+']').getByText('In uso ✓').waitFor();expectedCoins-=item.price;const w=await p.evaluate(()=>JSON.parse(localStorage.getItem('wordylandGuestWallet')));assert.equal(w.coins,expectedCoins);assert.equal(w.equipped[item.slot],item.id);if(item.id==='hat-wizard')console.log('Reward preview before reveal: '+JSON.stringify(await p.locator('#stylePreview').evaluate(node=>({render:node.dataset.render,previewTop:node.getBoundingClientRect().top,canvasCount:node.querySelectorAll('canvas').length}))));const scene=await sceneDetails();if(item.slot==='hat')assert(scene.colors.includes(item.id==='hat-wizard'?0x8172c8:0xf293b8),'Hat geometry '+item.id);else assert(scene.values.includes(item.id),'Visible reward model '+item.id);assert(await p.evaluate(()=>document.documentElement.scrollWidth<=innerWidth));if(['trophy-star','pet-penguin'].includes(item.id))await p.locator('#stylePreview').screenshot({path:'/tmp/wordyland-'+item.id+'.png'});}
await p.reload();for(const item of extras.filter((x,i,all)=>!all.slice(i+1).some(y=>y.slot===x.slot))){const w=await p.evaluate(()=>JSON.parse(localStorage.getItem('wordylandGuestWallet')));assert.equal(w.equipped[item.slot],item.id);}
await p.goto(base+'/#preposizioni');await p.locator('[data-lesson=catpositions]').click();for(let n=0;n<3;n++){await answer(p);if(n<2)await p.locator('#questNext').click();}
await p.locator('.earnedBadges').getByText('Prima avventura',{exact:false}).waitFor();await p.locator('#openBadges').click();await p.locator('[data-item=badge-first]').click();await p.locator('.passportBadge').getByText('Prima avventura',{exact:false}).waitFor();assert((await sceneDetails()).values.includes('badge-first'));await p.reload();await p.locator('.passportBadge').getByText('Prima avventura',{exact:false}).waitFor();
// Real account milestone: the server grants the badge after confirmed answers.
await p.evaluate(async()=>{const a=window.wordylandAccount;await a.connect(await a.request('register',{username:'reward_browser',password:'Rewards-browser-test-123',adult:true}));await a.createProfile('Luna');});
await p.goto(base+'/#preposizioni');await p.locator('[data-lesson=catpositions]').click();for(let n=0;n<3;n++){await answer(p);if(n<2)await p.locator('#questNext').click();}
await p.locator('#openBadges').click();await p.locator('[data-item=badge-first]').click();await p.locator('.passportBadge').getByText('Prima avventura',{exact:false}).waitFor();const wallet=await p.evaluate(async()=>{const a=wordylandAccount;return (await a.request('hub&profile='+a.info().id)).wallet;});assert.equal(wallet.inventory.filter(x=>x==='badge-first').length,1);assert.equal(wallet.equipped.badge,'badge-first');assert.equal(wallet.coins,15);
assert.deepEqual(errors,[]);console.log('Rewards browser passed: all 19 new priced cosmetics render in their preview canvas after reveal, guest costs/persistence, no mobile overflow, earned badge celebration/equipment and real server mission unlock.');
}finally{await browser.close();}
})().catch(e=>{console.error(e);process.exit(1)});
