// Local disposable calendar/account. Prank controls are cosmetic: no write API calls.
const {chromium}=require(process.env.WORDYLAND_PLAYWRIGHT_MODULE||'playwright'),assert=require('assert/strict'),fs=require('fs');
const base=process.env.WORDYLAND_TEST_URL,clock=process.env.WORDYLAND_TEST_CLOCK_FILE;assert(['localhost','127.0.0.1'].includes(new URL(base).hostname));assert(clock?.startsWith('/tmp/wordyland-browser.'));
(async()=>{const browser=await chromium.launch({executablePath:process.env.WORDYLAND_CHROMIUM,args:['--no-sandbox','--use-angle=swiftshader','--enable-unsafe-swiftshader']});
try{
 const p=await browser.newPage({viewport:{width:390,height:844},reducedMotion:'reduce'}),errors=[],posts=[];p.on('pageerror',e=>errors.push(e.message));
 // Bind each canvas to the scene it actually rendered, before island.js starts.
 // Offscreen village scenes are deliberately deferred until the child reveals them.
 await p.route('**/three.min.js*',async route=>{
  assert.equal(new URL(route.request().url()).origin,new URL(base).origin,'Instrument only the synthetic local fixture');
  const response=await route.fetch(),original=await response.text();
  const spy=`\n;(()=>{const T=window.THREE,Original=T.WebGLRenderer;window.elfRenderedScenes=new WeakMap();function TrackedWebGLRenderer(...args){const renderer=new Original(...args),render=renderer.render;renderer.render=function(...args){const result=render.apply(this,args);window.elfRenderedScenes.set(renderer.domElement,args[0]);return result;};return renderer;}TrackedWebGLRenderer.prototype=Original.prototype;Object.setPrototypeOf(TrackedWebGLRenderer,Original);T.WebGLRenderer=TrackedWebGLRenderer;})();\n`;
  await route.fulfill({response,body:original+spy});
 });
 async function villageScene(){
  await p.locator('#holidayWorld').scrollIntoViewIfNeeded();
  await p.locator('#holidayWorld[data-render="3d"] canvas').waitFor();
  await p.waitForFunction(()=>{const canvas=document.querySelector('#holidayWorld canvas');return canvas&&window.elfRenderedScenes?.has(canvas);});
  return p.evaluate(()=>{const scene=window.elfRenderedScenes.get(document.querySelector('#holidayWorld canvas')),characters=[],pranks=[],snow=[];scene.traverse(node=>{if(node.userData.character)characters.push(node.userData.character);if(node.userData.elfPrank)pranks.push({id:node.userData.elfPrank,rotation:node.rotation.z});if(node.userData.elfSnow)snow.push(node.material.color.getHex());});return {characters,pranks,snow};});
 }
 await p.goto(base+'/#natale');await p.locator('#holidayLogin').waitFor();
 const profile=await p.evaluate(async()=>{const a=wordylandAccount;await a.ready;await a.connect(await a.request('register',{username:'elf_browser',password:'Elf-browser-fixture-123',adult:true}));return await a.createProfile('Esploratore');});await p.reload();await p.locator('.elfTeaser').waitFor();assert.equal(await p.locator('[data-elf-prank]').count(),0);
 const npcCount=async()=>(await villageScene()).characters.filter(character=>character==='elf-prankster').length;assert.equal(await npcCount(),0);
 const before=await p.evaluate(async id=>(await wordylandAccount.request('hub&profile='+id)).wallet,profile.id);p.on('request',r=>{if(r.method()!=='GET'&&!['presence-heartbeat','presence-leave'].includes(new URL(r.url()).searchParams.get('action')))posts.push(r.url());});
 const dates=[['08','packages'],['09','letter'],['10','sign'],['11','moustache'],['12','colors']];
 for(const [day,id]of dates){
  fs.writeFileSync(clock,'2026-12-'+day+' 12:00:00');await p.locator('#holidayRefresh').click();await p.locator('#elfPanel[data-elf-prank="'+id+'"]').waitFor();assert.equal(await npcCount(),1);
  if(id==='packages'){
   if(process.env.WORDYLAND_ELF_SCREENSHOT)await p.locator('#holidayWorld').screenshot({path:process.env.WORDYLAND_ELF_SCREENSHOT});if(process.env.WORDYLAND_ELF_PRANK_SCREENSHOT)await p.locator('#elfPanel').screenshot({path:process.env.WORDYLAND_ELF_PRANK_SCREENSHOT});
   await p.locator('[data-elf-tile="0"]').click();await p.locator('#elfCheck').click();await p.locator('#elfStatus').getByText(/prima C/).waitFor();await p.locator('[data-elf-remove="0"]').click();
   for(const i of [1,2,0]){await p.locator('[data-elf-tile="'+i+'"]').focus();await p.keyboard.press('Enter');}await p.locator('#elfCheck').click();
  }else if(id==='letter'){await p.locator('[data-elf-letter=B]').click();await p.locator('#elfStatus').getByText(/comincia con P/).waitFor();await p.locator('[data-elf-letter=P]').click();}
  else{
   if(id==='sign'){assert.equal(await p.locator('#elfToy .elfModel').textContent(),'KOOB');assert((await villageScene()).pranks.some(prank=>prank.id==='sign'&&prank.rotation===Math.PI));}
   if(id==='moustache')assert((await villageScene()).pranks.some(prank=>prank.id==='moustache'));
   await p.locator('#elfFix').focus();await p.keyboard.press('Enter');
  }
  await p.locator('#elfPanel[data-elf-resolved=true]').waitFor();await p.locator('#elfStatus').getByText(/Scherzo sistemato/).waitFor();assert.equal(await p.evaluate(()=>document.activeElement.id),'elfReplay');
  if(id==='sign')assert.equal(await p.locator('#elfToy .elfModel').textContent(),'BOOK');
  if(id==='moustache'){console.log('Elf village before reveal: '+JSON.stringify(await p.locator('#holidayWorld').evaluate(node=>({render:node.dataset.render,top:node.getBoundingClientRect().top,canvasCount:node.querySelectorAll('canvas').length}))));assert(!(await villageScene()).pranks.some(prank=>prank.id==='moustache'));}
  if(id==='colors'){const colors=(await villageScene()).snow;assert(colors.length===10&&colors.every(color=>color===0xffffff));}
  await p.locator('#elfReplay').click();await p.locator('#elfPanel[data-elf-resolved=false]').waitFor();await p.locator('#elfContinue').click();assert.equal(await p.evaluate(()=>document.activeElement.id),'holidayStart');
 }
 for(const width of [320,390,768,1360]){await p.setViewportSize({width,height:844});assert(await p.evaluate(()=>document.documentElement.scrollWidth<=innerWidth),'Elf overflow '+width);assert(await p.locator('#elfPanel button').evaluateAll(ns=>ns.every(n=>n.getBoundingClientRect().height>=48)));}
 await p.locator('[data-holiday=easter]').click();assert.equal(await p.locator('#elfPanel').count(),0);assert.equal(await npcCount(),0);
 await p.evaluate(()=>location.hash='#festivita');await p.locator('[data-holiday=christmas]').click();await p.locator('#elfPanel').waitFor();
 fs.writeFileSync(clock,'2027-01-07 12:00:00');await p.locator('#holidayRefresh').click();await p.locator('#elfPanel[data-elf-prank]').waitFor();assert.equal(await npcCount(),1);
 fs.writeFileSync(clock,'2027-01-08 00:00:00');await p.locator('#holidayRefresh').click();await p.locator('#holidayChallenge').getByText(/sono chiuse/).waitFor();assert.equal(await p.locator('#elfPanel').count(),0);assert.equal(await npcCount(),0);
 assert.deepEqual(posts,[],'No prank click creates a write request (existing presence leases are separate)');const after=await p.evaluate(async id=>(await wordylandAccount.request('hub&profile='+id)).wallet,profile.id);assert.deepEqual(after,before);assert.deepEqual(errors,[]);
 // WebGL failure must leave the optional word games and exercise shortcut usable.
 fs.writeFileSync(clock,'2026-12-09 12:00:00');await p.addInitScript(()=>{const original=HTMLCanvasElement.prototype.getContext;HTMLCanvasElement.prototype.getContext=function(type,...rest){return ['webgl','webgl2','experimental-webgl'].includes(type)?null:original.call(this,type,...rest);};});await p.reload();await p.locator('[data-elf-letter=P]').click();await p.locator('#elfPanel[data-elf-resolved=true]').waitFor();await p.locator('#holidayWorld').scrollIntoViewIfNeeded();await p.locator('#holidayWorld[data-render="fallback"]').waitFor();assert.equal(await p.locator('#holidayWorld').getAttribute('data-render'),'fallback');assert.deepEqual(posts,[]);
 console.log('Elf browser passed: absent Dec7, NPC Dec8, five optional reversible pranks/keyboard correction, real restored snow/moustache, no write requests or wallet/progress effects, exercise shortcut, four widths, no elf outside Christmas or after Jan7, WebGL fallback.');
}finally{await browser.close();}})().catch(e=>{console.error(e);process.exit(1)});
