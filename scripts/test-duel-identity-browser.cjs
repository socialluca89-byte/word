// Real class duels must use each owned character, including pause/reload and styles.
const {chromium}=require(process.env.WORDYLAND_PLAYWRIGHT_MODULE||'playwright');
const assert=require('assert/strict'),{spawnSync}=require('child_process'),fs=require('fs');
const base=process.env.WORDYLAND_TEST_URL;assert(['localhost','127.0.0.1'].includes(new URL(base).hostname));assert(process.env.WORDYLAND_BROWSER_DATA?.startsWith('/tmp/wordyland-browser.'));
(async()=>{
 const browser=await chromium.launch({executablePath:process.env.WORDYLAND_CHROMIUM||'/usr/bin/chromium',args:['--no-sandbox','--use-angle=swiftshader','--enable-unsafe-swiftshader']});
 try{
 const errors=[],contexts=[];
 async function player(name,avatar,hat){
  const c=await browser.newContext({viewport:{width:390,height:844},reducedMotion:'reduce'});contexts.push(c);const p=await c.newPage();p.on('pageerror',e=>errors.push(e.message));await p.goto(base+'/#personaggi');await p.evaluate(()=>wordylandAccount.ready);
  const profile=await p.evaluate(async name=>{const a=wordylandAccount;await a.connect(await a.request('register',{username:name,password:'Duel-identity-synthetic-123',adult:true}));return a.createProfile(name);},name);
  await p.evaluate(async id=>wordylandAccount.request('hub&profile='+id),profile.id);
  const fund=spawnSync('php',['-r',`$db=new PDO('sqlite:'.getenv('WORDYLAND_BROWSER_DATA').'/wordyland.sqlite');$q=$db->prepare('UPDATE wallets SET coins=150 WHERE profile_id=?');$q->execute([(int)$argv[1]]);`,String(profile.id)],{encoding:'utf8',env:process.env});assert.equal(fund.status,0,fund.stderr);
  await p.reload();await p.locator('[data-item='+avatar+']').click();await p.locator('[data-item='+avatar+']').getByText('In uso ✓').waitFor();await p.locator('[data-item='+hat+']').click();await p.locator('[data-item='+hat+']').getByText('In uso ✓').waitFor();assert.equal(await p.locator('.passport .racerModel').getAttribute('data-racer'),avatar);
  return {p,id:profile.id,avatar,hat};
 }
 const a=await player('duel_identity_luna','robot','crown'),b=await player('duel_identity_sole','dragon','cap');
 const club=await a.p.evaluate(async id=>wordylandAccount.request('club-create',{profile:id,name:'Classe identità sintetica',consent:true}),a.id);await b.p.evaluate(async({id,code})=>wordylandAccount.request('club-join',{profile:id,code,consent:true}),{id:b.id,code:club.code});
 const wallets=async()=>Promise.all([a,b].map(({p,id})=>p.evaluate(async id=>(await wordylandAccount.request('hub&profile='+id)).wallet,id)));const before=await wallets(),duels=[];
 async function assertVisibleScene(p,label){
  const geometry=await p.evaluate(()=>{const box=n=>{const r=n.getBoundingClientRect();return {left:r.left,right:r.right,top:r.top,bottom:r.bottom};};const world=document.querySelector('#duelWorld');return {stage:box(document.querySelector('#duelStage')),toolbar:box(document.querySelector('#duelStage .duelStageTop')),world:box(world),parts:[...world.querySelectorAll('.illustratedActor,[data-reward]')].map(box),height:innerHeight,firstAnswer:box(document.querySelector('#duelStage .duelOptions button'))};});
  assert(geometry.stage.top>=-2&&geometry.stage.top<=20,'Opening scrolls directly to stage start with reduced motion: '+label+' '+JSON.stringify(geometry.stage));
  assert(geometry.world.top>=geometry.toolbar.bottom-1,'Sticky controls never cover the scene at entry '+label);assert(geometry.world.bottom<=geometry.height+1,'The full scene is visible on the phone '+label);assert(geometry.firstAnswer.top>=0&&geometry.firstAnswer.top+44<=geometry.height,'The first answer is immediately touchable without scrolling '+label+' '+JSON.stringify(geometry.firstAnswer));
  assert(geometry.parts.length>1,'Actual character and accessory measured '+label);for(const part of geometry.parts)assert(part.left>=geometry.world.left-1&&part.right<=geometry.world.right+1&&part.top>=geometry.world.top-1&&part.bottom<=geometry.world.bottom+1,'Character/accessory is never clipped by the scene '+label+' '+JSON.stringify({part,world:geometry.world}));
 }
 for(const [activity,category] of [['football','body'],['space','colors'],['kart','school']]){
  const duel=await a.p.evaluate(async({profile,opponent,activity,category})=>(await wordylandAccount.request('duel-create',{profile,opponent,activity,category})).duel.id,{profile:a.id,opponent:b.id,activity,category});await b.p.evaluate(async({profile,duel})=>wordylandAccount.request('duel-accept',{profile,duel}),{profile:b.id,duel});
  duels.push(duel);
  if(activity==='football'){
   const inaccessible=await a.p.evaluate(async({profile,duel})=>{try{await wordylandAccount.request('duel&profile='+profile+'&duel='+duel);}catch(error){return error.code;}},{profile:b.id,duel});assert.equal(inaccessible,404,'Other account profile cannot expose appearance or question');
   const csrf=await a.p.evaluate(async({profile,duel})=>{const r=await fetch('api.php?action=duel-answer',{method:'POST',headers:{'Content-Type':'application/json','X-CSRF-Token':'wrong'},body:JSON.stringify({profile,duel,step:0,answer:0})});return {status:r.status,body:await r.json()};},{profile:a.id,duel});assert.equal(csrf.status,403);assert(!('equipped'in csrf.body),'CSRF failure never includes owned appearance');
  }
  for(const who of [a,b]){
   const p=who.p;await p.goto(base+'/#sfide');await p.locator('[data-duel="'+duel+'"][data-duel-action=play]').click();await p.locator('#duelWorld[data-render=illustrated]').waitFor();
   await assertVisibleScene(p,activity+' '+who.avatar+' initial');
   if(who===a&&activity==='football'){
    const state=()=>p.evaluate(async({id,duel})=>({duel:(await wordylandAccount.request('duel&profile='+id+'&duel='+duel)).duel,wallet:(await wordylandAccount.request('hub&profile='+id)).wallet}),{id:a.id,duel});const beforeHelp=await state(),questionBefore=await p.locator('#duelStage h3').textContent();
    await p.locator('#duelHelp>summary').click();assert.equal(await p.locator('#duelHelp').getAttribute('open'),'');assert.match(await p.locator('#duelHelp .duelSaveNote').textContent(),/Ogni risposta confermata è salvata automaticamente\. Puoi chiudere e riprendere con lo stesso profilo\./);assert.match(await p.locator('#duelHelp .duelScoreNote').textContent(),/Il tuo mondo avanza con le risposte corrette\. Il punteggio del compagno si scopre quando avete finito entrambi\./);assert((await p.locator('#duelHelp>summary').boundingBox()).height>=44,'Help remains touch accessible');await p.locator('#duelHelp>summary').click();assert.equal(await p.locator('#duelHelp').getAttribute('open'),null);assert.equal(await p.locator('#duelStage h3').textContent(),questionBefore);assert.deepEqual(await state(),beforeHelp,'Reading and closing help never resets question, score or wallet');
   }
   const actual=await p.locator('#duelWorld .illustratedActor').getAttribute('data-character');console.log('Actual duel identity:',activity,who.avatar,actual);assert.equal(actual,who.avatar,'The actual '+activity+' duel must use the owned character instead of default fox');assert.equal(await p.locator('#duelWorld [data-reward='+who.hat+']').count(),1,'Owned accessory follows into actual duel');
   assert.equal(await p.locator('#duelWorld .racerModel').getAttribute('data-racer'),who.avatar);
   await p.locator('[data-duel-answer="0"]').click();await p.getByRole('button',{name:'Prossima domanda →',exact:true}).waitFor();assert.equal(await p.locator('#duelWorld .illustratedActor').getAttribute('data-character'),who.avatar,'Feedback keeps the same character');
   await p.locator('#duelBack').click();await p.locator('[data-duel="'+duel+'"][data-duel-action=play]').click();await p.locator('.duelProgress').getByText(/Domanda 2 di/).waitFor();assert.equal(await p.locator('#duelWorld .illustratedActor').getAttribute('data-character'),who.avatar,'Pause/resume keeps owned identity');await assertVisibleScene(p,activity+' '+who.avatar+' resumed');
   await p.reload();await p.locator('[data-duel="'+duel+'"][data-duel-action=play]').click();await p.locator('.duelProgress').getByText(/Domanda 2 di/).waitFor();assert.equal(await p.locator('#duelWorld .illustratedActor').getAttribute('data-character'),who.avatar,'Reload/resume keeps owned identity');await assertVisibleScene(p,activity+' '+who.avatar+' reloaded');
   if(process.env.WORDYLAND_DUEL_IDENTITY_CAPTURE&&who===a&&activity==='football')await p.screenshot({path:process.env.WORDYLAND_DUEL_IDENTITY_CAPTURE,fullPage:false});
   await p.locator('#duelBack').click();
  }
 }
 // A separate owned device changes appearance while this question remains open.
 const second=await browser.newPage({viewport:{width:390,height:844},reducedMotion:'reduce'});second.on('pageerror',e=>errors.push(e.message));await second.goto(base);await second.evaluate(()=>wordylandAccount.ready);await second.evaluate(async id=>{const x=wordylandAccount;await x.connect(await x.request('login',{username:'duel_identity_luna',password:'Duel-identity-synthetic-123'}));await x.selectProfile(id);await x.request('equip',{profile:id,item:'fox'});},a.id);
 await a.p.locator('[data-duel="'+duels[0]+'"][data-duel-action=play]').click();await a.p.locator('#duelWorld .illustratedActor[data-character=fox]').waitFor();
 // Change back after the question opens: feedback must update the retained scene too.
 await second.evaluate(async id=>wordylandAccount.request('equip',{profile:id,item:'robot'}),a.id);await a.p.locator('[data-duel-answer="0"]').click();await a.p.getByRole('button',{name:'Prossima domanda →',exact:true}).waitFor();await a.p.locator('#duelWorld .illustratedActor[data-character=robot]').waitFor();assert.equal(await a.p.locator('#duelWorld [data-reward=crown]').count(),1);await a.p.locator('#duelBack').click();
 assert.deepEqual(await wallets(),before,'Duel identity and progression never buy or alter the wallet');
 // Simulate a legacy earned milestone not yet materialized by the wardrobe.
 // Reading duel appearance must neither grant badges nor create/update wallet state.
 const sql=code=>{const result=spawnSync('php',['-r',code,String(a.id)],{encoding:'utf8',env:process.env});assert.equal(result.status,0,result.stderr);return result.stdout;};
 sql(`$db=new PDO('sqlite:'.getenv('WORDYLAND_BROWSER_DATA').'/wordyland.sqlite');$pid=(int)$argv[1];$db->prepare('INSERT INTO quests(token,profile_id,questions,completed,created_at,activity,source) VALUES (?,?,?,1,?, ?,?)')->execute(['duel_readonly_fixture',$pid,'[]',time(),'football','body']);$db->prepare('INSERT INTO rewards(token,profile_id,xp,coins,recovered,created_at,activity) VALUES (?,?,0,0,0,?,?)')->execute(['duel_readonly_fixture',$pid,time(),'football']);$db->prepare('DELETE FROM inventory WHERE profile_id=? AND item=?')->execute([$pid,'badge-first']);`);
 const storage=()=>JSON.parse(sql(`$db=new PDO('sqlite:'.getenv('WORDYLAND_BROWSER_DATA').'/wordyland.sqlite');$result=[];foreach(['wallets'=>'profile_id','inventory'=>'profile_id,item','rewards'=>'token'] as $table=>$order)$result[$table]=$db->query('SELECT * FROM '.$table.' ORDER BY '.$order)->fetchAll(PDO::FETCH_ASSOC);echo json_encode($result);`));const storedBefore=storage();
 const snapshot=await a.p.evaluate(async({profile,duel})=>wordylandAccount.request('duel&profile='+profile+'&duel='+duel),{profile:a.id,duel:duels[0]});assert.equal(snapshot.equipped.avatar,'robot');assert.equal(snapshot.equipped.hat,'crown');assert.deepEqual(storage(),storedBefore,'Read-only duel appearance never awards a milestone or changes wallet/inventory/rewards');
 assert.deepEqual(errors,[]);console.log('Duel identity passed: real class invitation/acceptance, two owned avatars/accessories, all three activities, feedback, pause and reload exact next question, cross-device appearance refresh, ownership/CSRF rejection, read-only appearance without milestone/storage effects, visible stage/first answer, unclipped avatar/accessory geometry, full optional help without resetting progress, unchanged wallet and no JS errors.');
 }finally{await browser.close();}
})().catch(e=>{console.error(e);process.exit(1)});
