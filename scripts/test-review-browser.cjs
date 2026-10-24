const {chromium}=require(process.env.WORDYLAND_PLAYWRIGHT_MODULE||'playwright'),assert=require('assert/strict'),{spawnSync}=require('child_process');
const base=process.env.WORDYLAND_TEST_URL;assert(['localhost','127.0.0.1'].includes(new URL(base).hostname));assert(process.env.WORDYLAND_BROWSER_DATA?.startsWith('/tmp/'));
(async()=>{
 const browser=await chromium.launch({executablePath:process.env.WORDYLAND_CHROMIUM||'/usr/bin/chromium',args:['--no-sandbox','--use-angle=swiftshader','--enable-unsafe-swiftshader']}),errors=[];
 try{
  const p=await browser.newPage({viewport:{width:390,height:844},reducedMotion:'reduce'});p.on('pageerror',e=>errors.push(e.message));await p.goto(base);await p.evaluate(()=>wordylandAccount.ready);
  const fixture=await p.evaluate(async()=>{
   const a=wordylandAccount;await a.connect(await a.request('register',{username:'review_browser',password:'Review-browser-password-123',adult:true}));const profile=await a.createProfile('Luna');
   for(const [title,words] of [['Una parola',[['head','testa','🙂']]],['Tre parole',[['head','testa','🙂'],['hand','mano','👋'],['leg','gamba','🦵']]]])await a.request('study-save',{profile:profile.id,title,words,confirmed:true});
   const hub=await a.request('hub&profile='+profile.id);await a.flush();return {id:profile.id,single:hub.studies.find(s=>s.title==='Una parola').id,trio:hub.studies.find(s=>s.title==='Tre parole').id};
  });
  const seeded=spawnSync('php',['-r',`$db=new PDO('sqlite:'.getenv('WORDYLAND_BROWSER_DATA').'/wordyland.sqlite');$pid=(int)$argv[1];
  $q=$db->prepare('INSERT INTO practice(profile_id,word,good,wrong) VALUES (?,?,?,1)');foreach([['head',3],['hand',0],['leg',0]] as $row)$q->execute([$pid,$row[0],$row[1]]);
  $q=$db->prepare('INSERT INTO practice_outcomes(profile_id,word,independent,observed) VALUES (?,"head",3,3)');$q->execute([$pid]);
  $q=$db->prepare('SELECT state FROM profiles WHERE id=?');$q->execute([$pid]);$state=json_decode($q->fetchColumn(),true);$state['stats']['head']=['good'=>3,'attempts'=>3,'review'=>false];$q=$db->prepare('UPDATE profiles SET state=?,revision=revision+1 WHERE id=?');$q->execute([json_encode($state),$pid]);`,String(fixture.id)],{env:process.env,encoding:'utf8'});assert.equal(seeded.status,0,seeded.stderr);
  await p.reload();await p.evaluate(()=>wordylandAccount.ready);
  async function launch(study){
   await p.locator('[data-tab=missions]').click();await p.locator('#questSource option[value="study:'+study+'"]').waitFor({state:'attached'});await p.locator('#questSource').selectOption('study:'+study);await p.locator('#beginQuest').click();await p.locator('#readyChallenge').waitFor();
  }
  await launch(fixture.single);assert.equal(await p.locator('#questWork .questWord').textContent(),'head');await p.locator('#readyChallenge').click();await p.locator('#questAnswer').fill('hed');await p.locator('#questAnswerForm button').click();await p.locator('.feedbackRetry').waitFor();assert.equal(await p.evaluate(()=>stats.head.good),3,'An error never deletes earned successes');
  await p.locator('#questAnswer').fill('head');await p.locator('#questAnswerForm button').click();await p.locator('#completedWorld').waitFor();assert.equal(await p.evaluate(()=>stats.head.good),3,'A correction keeps earned successes unchanged');
  await launch(fixture.trio);assert.equal(await p.locator('#questWork .questWord').textContent(),'head','The next mission starts with the recently mistaken word');await p.locator('#pauseQuest').click();
  await launch(fixture.single);await p.locator('#readyChallenge').click();await p.locator('#questAnswer').fill('head');await p.locator('#questAnswerForm button').click();await p.locator('#completedWorld').waitFor();assert.equal(await p.evaluate(()=>stats.head.good),4,'A fresh independent answer earns the next success');
  const next=await p.evaluate(async({id,study})=>await wordylandAccount.request('quest-start',{profile:id,study,activity:'pets'}),{id:fixture.id,study:fixture.trio});assert.notEqual(next.question.word,'head','New missions move on after an independent success; existing paused missions keep their order');
  assert(await p.evaluate(()=>document.documentElement.scrollWidth<=innerWidth));assert.deepEqual(errors,[]);
  console.log('Review browser passed: personal study selector stays reachable, recent mistakes lead the next mission, correction preserves earned successes, independent success clears review priority and mobile layout stays usable.');
 }finally{await browser.close();}
})().catch(error=>{console.error(error);process.exit(1)});
