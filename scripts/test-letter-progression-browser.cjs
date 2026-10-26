const {chromium}=require(process.env.WORDYLAND_PLAYWRIGHT_MODULE||'playwright'),assert=require('assert/strict');
const base=process.env.WORDYLAND_TEST_URL;assert(['127.0.0.1','localhost'].includes(new URL(base).hostname));
(async()=>{
 const b=await chromium.launch({executablePath:process.env.WORDYLAND_CHROMIUM||'/usr/bin/chromium',args:['--no-sandbox','--use-angle=swiftshader','--enable-unsafe-swiftshader']}),errors=[];
 try{
  const p=await b.newPage({viewport:{width:390,height:844},reducedMotion:'reduce'});p.on('pageerror',e=>errors.push(e.message));
  await p.addInitScript(()=>{
   const voices=[{name:'Test English',voiceURI:'choice-test-en',lang:'en-GB',localService:true},{name:'Test Italian',voiceURI:'choice-test-it',lang:'it-IT',localService:true}];
   Object.defineProperty(window,'speechSynthesis',{configurable:true,value:{getVoices:()=>voices,addEventListener(){},cancel(){},speak(u){queueMicrotask(()=>u.onend?.());}}});window.SpeechSynthesisUtterance=class{constructor(text){this.text=text;}};
   if(!localStorage.getItem('wordylandTrainingGuest')){
    localStorage.setItem('wordylandTrainingGuest',JSON.stringify({version:1,sessions:[],stickers:[],completed:0,items:['letter:A','letter:E','letter:B','letter:C'],itemCounts:{},letterPractice:{'A:reading':{independent:3,independentDays:2,lastDay:'2026-01-01',recent:[]},'A:listening':{independent:6,independentDays:3,lastDay:'2026-01-01',threeIndependent:2,threeDays:2,threeLastDay:'2026-01-01',recent:[]}}}));
    localStorage.setItem('wordylandLetterVoiceCheck',JSON.stringify({'choice-test-en':['A','E']}));
   }
  });
  const count=async n=>{await p.waitForFunction(n=>document.querySelectorAll('[data-training-choice]').length===n,n);assert.equal(await p.locator('[data-training-choice]').count(),n);assert.match(await p.locator('#trainingChoiceCount').textContent(),new RegExp('tra '+n+' lettere'));};
  async function recognize(id){await p.locator('#trainingListen').click();await p.locator('[data-training-choice='+id+']').click();await p.locator('#nextTrainingStep').click();}
  async function finishE(){await p.locator('#trainingContinue').click();await p.locator('#nextTrainingStep').click();await recognize('E');await p.locator('#trainingAgain').click();}
  await p.goto(base+'/#allenamento');await p.locator('[data-training-block=ae]').click();await p.locator('#trainingContinue').click();await p.locator('#nextTrainingStep').click();await count(4);for(const width of [320,390,768,1360]){await p.setViewportSize({width,height:844});assert(await p.evaluate(()=>document.documentElement.scrollWidth<=innerWidth),'Four-choice layout fits '+width);for(const button of await p.locator('[data-training-choice]').all())assert(await button.evaluate(e=>e.getBoundingClientRect().height>=48));}await p.setViewportSize({width:390,height:844});if(process.env.WORDYLAND_BROWSER_SCREENSHOT)await p.locator('#trainingHub').screenshot({path:process.env.WORDYLAND_BROWSER_SCREENSHOT});
  const wallet=await p.evaluate(()=>localStorage.getItem('wordylandGuestWallet'));
  // Listening success does not imply the same reading history, or vice versa.
  await p.locator('#readTrainingModel').click();await count(3);assert.match(await p.locator('#trainingMode').textContent(),/lettura/);
  await p.locator('#trainingHint').focus();await p.keyboard.press('Enter');await count(2);assert(await p.evaluate(()=>Boolean(document.activeElement.dataset.trainingChoice)),'Focus survives removal of extra alternatives');
  await p.locator('#pauseTraining').click();await p.reload();await p.locator('[data-training-resume]').click();await count(2);assert.match(await p.locator('#trainingHintModel').textContent(),/A/);
  await recognize('A');const guided=await p.evaluate(()=>JSON.parse(localStorage.getItem('wordylandTrainingGuest')).letterPractice);assert.equal(guided['A:reading'].independent,3);assert.equal(guided['A:listening'].independent,6,'Help never becomes a new independent result');await finishE();
  // A second path still proposes four in listening, then two errors trigger support.
  await p.locator('[data-training-block=ae]').click();await p.locator('#trainingContinue').click();await p.locator('#nextTrainingStep').click();await count(4);
  await p.locator('#trainingListen').click();await p.locator('[data-training-choice=E]').click();await count(4);await p.locator('[data-training-choice=E]').click();await count(2);assert.match(await p.locator('#trainingFeedback').textContent(),/Torniamo a due/);
  await p.locator('#pauseTraining').click();await p.reload();await p.locator('[data-training-resume]').click();await count(2);await recognize('A');await finishE();
  await p.locator('[data-training-block=ae]').click();await p.locator('#trainingContinue').click();await p.locator('#nextTrainingStep').click();await count(2);assert.equal(await p.evaluate(()=>JSON.parse(localStorage.getItem('wordylandTrainingGuest')).letterPractice['A:listening'].independent),6,'Retain long-term progress when recent practice needs support');
  for(const width of [320,390,768,1360]){await p.setViewportSize({width,height:844});assert(await p.evaluate(()=>document.documentElement.scrollWidth<=innerWidth));for(const button of await p.locator('[data-training-choice]').all())assert(await button.evaluate(e=>e.getBoundingClientRect().height>=48));}
  // Old/local histories cannot leap by accumulating many successes on one date.
  await p.evaluate(()=>{const key='wordylandTrainingGuest',g=JSON.parse(localStorage.getItem(key));g.sessions=[];g.letterPractice['A:listening']={independent:100,independentDays:1,threeIndependent:100,threeDays:1,lastDay:new Date().toISOString().slice(0,10),recent:[]};localStorage.setItem(key,JSON.stringify(g));});await p.reload();await p.locator('[data-training-block=ae]').click();await p.locator('#trainingContinue').click();await p.locator('#nextTrainingStep').click();await count(2);
  // A long pause removes recent difficulty, without erasing retained practice.
  await p.evaluate(()=>{const key='wordylandTrainingGuest',g=JSON.parse(localStorage.getItem(key));g.sessions=[];g.letterPractice['A:listening']={independent:6,independentDays:3,threeIndependent:2,threeDays:2,lastDay:'2000-01-01',threeLastDay:'2000-01-01',recent:[{day:'2000-01-01',errors:2,independent:0}]};localStorage.setItem(key,JSON.stringify(g));});await p.reload();await p.locator('[data-training-block=ae]').click();await p.locator('#trainingContinue').click();await p.locator('#nextTrainingStep').click();await count(4);
  // Corrupted or forged new fields must not inject markup; retain a usable two-choice plan.
  await p.evaluate(()=>{const key='wordylandTrainingGuest',g=JSON.parse(localStorage.getItem(key)),s=g.sessions.find(s=>!s.done);s.plan[s.step].choiceSets.listening=['A','E','<img src=x onerror=alert(1)>'];localStorage.setItem(key,JSON.stringify(g));});await p.reload();await p.locator('[data-training-resume]').click();await count(2);assert.equal(await p.locator('#trainingExercise img').count(),0);
  assert.equal(await p.evaluate(()=>localStorage.getItem('wordylandGuestWallet')),wallet,'Choices/help never change game currency or equipment');assert.deepEqual(errors,[]);
  console.log('Letter progression browser passed: separate reading/listening options, 4→3 mode switch, keyboard reduction, saved help on reload, two-error guided return, retained history, four viewports and unchanged game wallet. Synthetic audio only.');
 }finally{await b.close();}
})().catch(e=>{console.error(e);process.exit(1)});
