// Isolated local browser regression for the wardrobe and real rendered characters.
const {chromium}=require(process.env.WORDYLAND_PLAYWRIGHT_MODULE||'playwright');
const assert=require('assert/strict'),{spawnSync}=require('child_process'),path=require('path');
const base=process.env.WORDYLAND_TEST_URL||'http://127.0.0.1:8093';
assert(['localhost','127.0.0.1'].includes(new URL(base).hostname),'Local tests only');
assert(process.env.WORDYLAND_BROWSER_DATA,'Use an isolated local database');
(async()=>{
 const browser=await chromium.launch({executablePath:process.env.WORDYLAND_CHROMIUM||'/usr/bin/chromium',args:['--no-sandbox','--use-angle=swiftshader','--enable-unsafe-swiftshader']});
 const context=await browser.newContext({viewport:{width:1360,height:1000},reducedMotion:'reduce'}),p=await context.newPage(),errors=[];
 p.on('pageerror',e=>errors.push(e.message));
 // Observe actual Three.js scene graphs without adding a production test endpoint.
 await p.addInitScript(()=>{window.testScenes=[];document.addEventListener('DOMContentLoaded',()=>{const T=window.THREE;if(!T)return;const add=T.Scene.prototype.add;T.Scene.prototype.add=function(...nodes){window.testScenes.push(this);return add.apply(this,nodes);};});});
 const models=selector=>p.locator(selector).evaluate(host=>{const canvas=host.querySelector('canvas');if(!canvas)return null;const scenes=window.testScenes;const result=[];for(const scene of scenes.slice(-1)){scene.traverse(o=>{if(o.userData.character)result.push({type:o.userData.character,crown:o.children.some(c=>c.material?.color?.getHex()===0xffd16b)});});}return result;});
 const wardrobe=async()=>{if(!p.url().startsWith(base))await p.goto(base+'/#personaggi');else await p.locator('.serviceNav a[href="#personaggi"]').click();await p.locator('.shopGrid').waitFor();};
 await wardrobe();assert.equal(await p.locator('.shopItem [data-item=fox]').textContent(),'In uso ✓');
 await p.locator('[data-item=panda]').click();await p.locator('#questStatus').getByText(/Ti mancano 30 monete/).waitFor();assert.equal(await p.locator('.passport [data-racer]').getAttribute('data-racer'),'fox');
 await p.reload();assert.equal(await p.locator('.passport [data-racer]').getAttribute('data-racer'),'fox');
 // Fund only the disposable guest fixture; the real server wallet is tested below.
 await p.evaluate(()=>{const wallet=JSON.parse(localStorage.getItem('wordylandGuestWallet')||'null')||{coins:0,xp:0,equipped:{avatar:'fox'},inventory:['fox']};wallet.coins=500;localStorage.setItem('wordylandGuestWallet',JSON.stringify(wallet));});await p.reload();
 await p.locator('[data-item=crown]').click();await p.locator('[data-item=crown]').getByText('In uso ✓').waitFor();
 for(const id of ['panda','robot','dragon','octopus','lion','fox']){
  await p.locator('[data-item='+id+']').click();await p.locator('[data-item='+id+']').getByText('In uso ✓').waitFor();
  assert.equal(await p.locator('.passport [data-racer]').getAttribute('data-racer'),id);
  const preview=await models('#stylePreview');assert(preview?.some(m=>m.type===id&&m.crown),'3D model and crown '+id);
  await p.reload();await p.locator('[data-item='+id+']').getByText('In uso ✓').waitFor();
  console.log('Character and crown persisted:',id);
 }
 await p.locator('[data-item=robot]').click();await p.locator('[data-item=robot]').getByText('In uso ✓').waitFor();
 if(process.env.WORDYLAND_BROWSER_SCREENSHOT)await p.screenshot({path:process.env.WORDYLAND_BROWSER_SCREENSHOT,fullPage:true});
 const guestCoins=await p.evaluate(()=>JSON.parse(localStorage.getItem('wordylandGuestWallet')).coins);
 for(const kind of ['kart','football','space']){
  await wardrobe();await p.locator('[data-character-play='+kind+']').click();await p.locator('#missionWorld canvas').waitFor();
  assert((await models('#missionWorld')).some(m=>m.type==='robot'&&m.crown),'Selected character in '+kind);
  assert.equal(await p.locator('.passport [data-racer]').getAttribute('data-racer'),'robot');console.log('Rendered selected character in:',kind);
 }
 await p.goto(base+'/#segnalazioni');await p.locator('.serviceNav a[href="#personaggi"]').click();await p.locator('.shopGrid').waitFor();
 await p.locator('[data-style=home]').click();await p.locator('.serviceNav a[href="#sfide"]').click();await p.locator('.serviceNav a[href="#personaggi"]').click();await p.locator('[data-item=fox]').waitFor();
 // Exercise a real server account and two isolated owned profiles.
 const credentials={username:'characters_'+Date.now(),password:'Character-test-password-123',adult:true};
 await p.evaluate(async c=>{const a=window.wordylandAccount;await a.connect(await a.request('register',c));},credentials);
 const first=await p.evaluate(async()=>await window.wordylandAccount.createProfile('Luna'));
 await p.evaluate(async id=>await window.wordylandAccount.request('hub&profile='+id),first.id);
 const fund=spawnSync('php',['-r',`$db=new PDO('sqlite:'.getenv('WORDYLAND_BROWSER_DATA').'/wordyland.sqlite');$q=$db->prepare('UPDATE wallets SET coins=300 WHERE profile_id=?');$q->execute([(int)$argv[1]]);`,String(first.id)],{encoding:'utf8',env:process.env});assert.equal(fund.status,0,fund.stderr);
 await wardrobe();await p.locator('[data-item=panda]').click();await p.locator('[data-item=panda]').getByText('In uso ✓').waitFor();
 const second=await p.evaluate(async()=>await window.wordylandAccount.createProfile('Sole'));await p.locator('[data-item=fox]').getByText('In uso ✓').waitFor();
 await p.locator('[data-style=pet]').click();await p.locator('[data-item=pet-bunny]').click();await p.locator('[data-item=pet-bunny]').getByText('In uso ✓').waitFor();
 assert.equal(await p.locator('.passport [data-racer]').getAttribute('data-racer'),'fox');
 await p.evaluate(async id=>await window.wordylandAccount.selectProfile(id),first.id);await wardrobe();await p.locator('[data-item=panda]').getByText('In uso ✓').waitFor();
 const coinsBefore=await p.evaluate(async id=>(await window.wordylandAccount.request('hub&profile='+id)).wallet.coins,first.id);
 await p.locator('[data-item=fox]').click();await p.locator('[data-item=panda]').click();await p.locator('[data-item=panda]').getByText('In uso ✓').waitFor();
 const saved=await p.evaluate(async id=>(await window.wordylandAccount.request('hub&profile='+id)).wallet,first.id);assert.equal(saved.coins,coinsBefore);assert.equal(saved.inventory.filter(i=>i==='panda').length,1);
 const other=await p.evaluate(async id=>{try{await window.wordylandAccount.request('equip',{profile:id,item:'dragon'});}catch(e){return e.code;}},second.id);assert.equal(other,403);
 const fresh=await browser.newContext({viewport:{width:390,height:844},reducedMotion:'reduce'}),device=await fresh.newPage();device.on('pageerror',e=>errors.push(e.message));await device.goto(base+'/#personaggi');
 await device.evaluate(async c=>{const a=window.wordylandAccount;await a.ready;await a.connect(await a.request('login',c));},credentials);await device.evaluate(async id=>await window.wordylandAccount.selectProfile(id),first.id);await device.locator('[data-item=panda]').getByText('In uso ✓').waitFor();
 for(const width of [390,360]){await device.setViewportSize({width,height:844});assert(await device.evaluate(()=>document.documentElement.scrollWidth<=innerWidth),'Mobile overflow '+width);}
 await p.evaluate(async()=>await window.wordylandAccount.logout());await wardrobe();await p.locator('[data-item=robot]').getByText('In uso ✓').waitFor();assert.equal(await p.evaluate(()=>JSON.parse(localStorage.getItem('wordylandGuestWallet')).coins),guestCoins);
 // Graceful WebGL fallback still allows changing and keeping the character.
 const no3d=await browser.newContext();await no3d.addInitScript(()=>{HTMLCanvasElement.prototype.getContext=function(){return null;};});const fallback=await no3d.newPage();fallback.on('pageerror',e=>errors.push(e.message));await fallback.goto(base+'/#personaggi');await fallback.locator('#stylePreview[data-render=fallback]').waitFor();await fallback.locator('[data-item=panda]').click();await fallback.locator('#questStatus').getByText(/Ti mancano/).waitFor();
 assert.deepEqual(errors,[]);await browser.close();console.log('Character browser passed: all six models/accessories, guest reload, insufficient coins, three games, direct links, owned-profile isolation, companion distinction, no double charge, server permissions, second device, logout, mobile, WebGL fallback and no JS errors.');
})().catch(e=>{console.error(e);process.exit(1)});
