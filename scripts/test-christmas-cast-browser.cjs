// Original festive actors, owned only via real synthetic exercise replies.
const {chromium}=require(process.env.WORDYLAND_PLAYWRIGHT_MODULE||'playwright'),assert=require('assert/strict'),fs=require('fs'),{execFileSync}=require('child_process');
const base=process.env.WORDYLAND_TEST_URL,clock=process.env.WORDYLAND_TEST_CLOCK_FILE;assert(['localhost','127.0.0.1'].includes(new URL(base).hostname));assert(clock?.startsWith('/tmp/wordyland-browser.'));
const cast=['elf-boy','elf-girl','polar-bear','gingerbread','silver-reindeer','mrs-claus','santa','nutcracker','yeti'];
const family={'elf-boy':'elves','elf-girl':'elves','polar-bear':'polar-bear',gingerbread:'gingerbread','silver-reindeer':'reindeer','mrs-claus':'claus-family',santa:'claus-family',nutcracker:'wooden-toy',yeti:'friendly-yeti'};
const plan=token=>JSON.parse(execFileSync('python3',['-c',"import sqlite3,sys;d=sqlite3.connect(sys.argv[1]);print(d.execute('SELECT plan FROM holiday_days WHERE token=?',(sys.argv[2],)).fetchone()[0])",process.env.WORDYLAND_BROWSER_DATA+'/wordyland.sqlite',token],{encoding:'utf8'}));
(async()=>{const browser=await chromium.launch({executablePath:process.env.WORDYLAND_CHROMIUM,args:['--no-sandbox','--use-angle=swiftshader','--enable-unsafe-swiftshader']});
try{
 const p=await browser.newPage({viewport:{width:390,height:844},reducedMotion:'reduce'}),errors=[];p.on('pageerror',e=>errors.push(e.message));
 // Install before island.js and inspect the scene that this exact canvas rendered.
 // An offscreen preview or mission may legitimately defer its renderer.
 await p.route('**/three.min.js*',async route=>{
  assert.equal(new URL(route.request().url()).origin,new URL(base).origin,'Instrument only the synthetic local fixture');
  const response=await route.fetch(),original=await response.text();
  const spy=`\n;(()=>{const T=window.THREE,Original=T.WebGLRenderer;window.castRenderedScenes=new WeakMap();function TrackedWebGLRenderer(...args){const renderer=new Original(...args),render=renderer.render;renderer.render=function(...args){const result=render.apply(this,args);window.castRenderedScenes.set(renderer.domElement,args[0]);return result;};return renderer;}TrackedWebGLRenderer.prototype=Original.prototype;Object.setPrototypeOf(TrackedWebGLRenderer,Original);T.WebGLRenderer=TrackedWebGLRenderer;})();\n`;
  await route.fulfill({response,body:original+spy});
 });
 async function renderedScene(selector){
  await p.locator(selector).scrollIntoViewIfNeeded();
  await p.locator(selector+'[data-render="3d"] canvas').waitFor();
  await p.waitForFunction(selector=>{const canvas=document.querySelector(selector+' canvas');return canvas&&window.castRenderedScenes?.has(canvas);},selector);
  return p.evaluate(selector=>{const scene=window.castRenderedScenes.get(document.querySelector(selector+' canvas')),characters=[],rewards=[],details=[];scene.traverse(node=>{if(node.userData.character)characters.push({id:node.userData.character,family:node.userData.castFamily});if(node.userData.reward)rewards.push(node.userData.reward);if(node.userData.detail)details.push(node.userData.detail);});return {characters,rewards,details};},selector);
 }
 await p.goto(base+'/#personaggi');await p.locator('[data-style=christmasCharacters]').click();assert.equal(await p.locator('[data-reward-card]').count(),12);assert.equal(await p.locator('[data-item=elf-boy]').isDisabled(),true);assert.equal(await p.locator('[data-item=elf-girl]').isDisabled(),true);
 const profile=await p.evaluate(async()=>{const a=wordylandAccount;await a.ready;await a.connect(await a.request('register',{username:'cast_browser',password:'Christmas-cast-fixture-123',adult:true}));return await a.createProfile('Esploratore');});await p.reload();await p.locator('[data-style=christmasCharacters]').click();
 const before=await p.evaluate(async id=>(await wordylandAccount.request('hub&profile='+id)).wallet,profile.id);
 for(const id of cast){await p.locator('[data-preview-item="'+id+'"]').click();if(id==='elf-boy')console.log('Christmas cast preview before reveal: '+JSON.stringify(await p.locator('#stylePreview').evaluate(node=>({render:node.dataset.render,top:node.getBoundingClientRect().top,canvasCount:node.querySelectorAll('canvas').length}))));const scene=await renderedScene('#stylePreview');assert(scene.characters.some(character=>character.id===id&&character.family===family[id]),'Distinct original model family '+id);}
 assert.deepEqual(await p.evaluate(async id=>(await wordylandAccount.request('hub&profile='+id)).wallet,profile.id),before,'Every unowned preview is temporary and free');
 // Ten dated missions -> thirty confirmed exercises, not fixture inventory injection.
 for(let day=1;day<=10;day++){
  fs.writeFileSync(clock,'2026-11-'+String(day).padStart(2,'0')+' 12:00:00');const session=await p.evaluate(async id=>(await wordylandAccount.request('holiday-start',{profile:id,event:'christmas'})).session,profile.id),questions=plan(session.token);
  await p.evaluate(async({session,questions,id})=>{while(!session.done){const payload={profile:id,token:session.token,step:session.step,answer:questions[session.step].answer,attempt:Array.from(crypto.getRandomValues(new Uint8Array(16)),b=>b.toString(16).padStart(2,'0')).join('')};const result=await wordylandAccount.request('holiday-answer',payload);if(!result.correct)throw Error('Fixture answer rejected');Object.assign(session,result.session);}}, {session,questions,id:profile.id});
 }
 const earned=await p.evaluate(async id=>(await wordylandAccount.request('hub&profile='+id)).wallet,profile.id);assert(cast.every(id=>earned.inventory.includes(id)));assert.equal(earned.coins,0);assert.equal(earned.xp,0);assert(cast.every(id=>earned.inventory.filter(x=>x===id).length===1));
 await p.reload();await p.locator('[data-style=christmasCharacters]').click();
 for(const id of cast){
  await p.locator('[data-item="'+id+'"]').click();await p.locator('[data-item="'+id+'"]').getByText('In uso ✓').waitFor();assert.equal(await p.locator('.passport [data-racer]').getAttribute('data-racer'),id);assert.match(await p.locator('.passport [data-racer]').evaluate(n=>getComputedStyle(n).backgroundImage),/character-portraits\.png/);
  for(const kind of ['kart','football','space']){await p.locator('[data-character-play="'+kind+'"]').click();await p.locator('#readyChallenge').waitFor();const scene=await renderedScene('#missionWorld');assert(scene.characters.some(character=>character.id===id),'Actual owned cast in '+kind+': '+id);await p.locator('#pauseQuest').click();await p.locator('.startChoices a[href="#personaggi"]').click();await p.locator('[data-style=christmasCharacters]').click();}
 }
 // Existing hats still fit new actors and native hats are hidden when a chosen hat is worn.
 await p.evaluate(async id=>wordylandAccount.request('equip',{profile:id,item:'hat-santa'}),profile.id);await p.reload();await p.locator('[data-style=christmasCharacters]').click();await p.locator('[data-preview-item=elf-girl]').click();const hatScene=await renderedScene('#stylePreview');assert(hatScene.rewards.includes('hat-santa')&&!hatScene.details.includes('native-festive-hat'));
 for(const width of [320,390,768,1360]){await p.setViewportSize({width,height:844});assert(await p.evaluate(()=>document.documentElement.scrollWidth<=innerWidth),'Christmas cast overflow '+width);}
 if(process.env.WORDYLAND_CAST_SCREENSHOT){
  await p.setViewportSize({width:1100,height:760});await p.evaluate(()=>{const panel=document.createElement('section');panel.id='christmasCastPreview';panel.style.cssText='display:grid;grid-template-columns:repeat(3,1fr);gap:14px;width:960px;padding:24px;background:#edf4ee;border-radius:24px;color:#315549';document.body.append(panel);window.castPreviewViews=[];for(const [id,name]of [['elf-boy','Elio l’elfo'],['elf-girl','Stella l’elfa'],['polar-bear','Nubi l’orso polare'],['gingerbread','Biscottino'],['santa','Babbo Natale'],['mrs-claus','Nonna Natale'],['silver-reindeer','Fiaba la renna'],['nutcracker','Nico lo schiaccianoci'],['yeti','Milo lo yeti']]){const card=document.createElement('article'),title=document.createElement('h3'),scene=document.createElement('div');title.textContent=name;title.style.cssText='font-size:21px;text-align:center';scene.style.cssText='position:relative;width:300px;height:250px';scene.className='missionWorld';card.append(title,scene);panel.append(card);castPreviewViews.push(wordylandIsland.mount(scene,{kind:'pets',preview:true,equipped:{avatar:id,pet:id}}));}});await p.locator('#christmasCastPreview').scrollIntoViewIfNeeded();await p.locator('#christmasCastPreview canvas').last().waitFor();await p.locator('#christmasCastPreview').screenshot({path:process.env.WORDYLAND_CAST_SCREENSHOT});await p.evaluate(()=>{castPreviewViews.forEach(v=>v.dispose());document.querySelector('#christmasCastPreview').remove();});
 }
 // The visitor Birillo remains separate; playable elves work before his December arrival.
 fs.writeFileSync(clock,'2027-01-08 12:00:00');await p.goto(base+'/#personaggi');await p.locator('[data-style=christmasCharacters]').click();await p.locator('[data-item=santa]').click();await p.locator('[data-item=santa]').getByText('In uso ✓').waitFor();assert.equal(await p.locator('.passport [data-racer]').getAttribute('data-racer'),'santa');assert.deepEqual(errors,[]);
 console.log('Christmas cast passed: twelve reachable seasonal pilots, nine original character models with verified rendering families and temporary unowned previews, thirty real fixture exercises, direct earned use in 27 game scenes, saved identities/portrait mapping, native/chosen hat compatibility, four widths and permanent use after closure.');
}finally{await browser.close();}})().catch(e=>{console.error(e);process.exit(1)});
