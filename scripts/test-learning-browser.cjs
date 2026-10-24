const {chromium}=require(process.env.WORDYLAND_PLAYWRIGHT_MODULE||'playwright');
const assert=require('assert/strict');
(async()=>{
 const browser=await chromium.launch({executablePath:process.env.WORDYLAND_CHROMIUM||'/usr/bin/chromium',args:['--no-sandbox','--use-angle=swiftshader','--enable-unsafe-swiftshader']});
 const p=await browser.newPage({viewport:{width:390,height:844},reducedMotion:'reduce'}),errors=[];
 p.on('pageerror',e=>errors.push(e.message));
 await p.addInitScript(()=>{window.spoken=[];window.SpeechSynthesisUtterance=function(text){this.text=text;};Object.defineProperty(window,'speechSynthesis',{value:{getVoices(){return [];},cancel(){},speak(u){window.spoken.push({text:u.text,lang:u.lang});}}});});
 const base=process.env.WORDYLAND_TEST_URL;
 await p.goto(base+'/#preposizioni');await p.locator('[data-lesson=catpositions]').click();await p.locator('#readyChallenge').waitFor();
 const translation=(await p.locator('.questPicture+p').textContent()).trim();
 await p.locator('#readyChallenge').click();
 const options=p.locator('[data-answer]');let right,wrong;
 for(let i=0;i<await options.count();i++){const b=options.nth(i);if((await b.locator('small').textContent()).trim()===translation)right=b;else wrong=b;}
 assert(right&&wrong);await wrong.click();await p.locator('.feedbackRetry').waitFor();
 assert.equal(await p.locator('.feedbackMark').textContent(),'✕');assert.match(await p.locator('.learningExplanation').textContent(),/Hai scelto/);
 assert.equal(await p.evaluate(()=>spoken.length),0,'No autoplay');
 await p.locator('[data-explain-audio]').click();await p.locator('[data-word-audio]').click();assert.deepEqual(await p.evaluate(()=>spoken.map(x=>x.lang)),['it-IT','en-GB']);
 for(const width of [360,390,1360]){await p.setViewportSize({width,height:900});assert(await p.evaluate(()=>document.documentElement.scrollWidth<=innerWidth),'No overflow '+width);assert(await p.locator('.feedbackMark').evaluate(e=>parseFloat(getComputedStyle(e).fontSize)>=64));assert(await p.locator('.learningExplanation').evaluate(e=>parseFloat(getComputedStyle(e).fontSize)>=20));assert(await right.evaluate(e=>e.getBoundingClientRect().height>=54));}
 await right.click();await p.locator('.feedbackSuccess').waitFor();assert.equal(await p.locator('.feedbackMark').textContent(),'✓');assert.equal(await p.locator('.feedbackStars span').count(),3);assert.equal(await p.locator('.feedbackStars span').first().evaluate(e=>getComputedStyle(e).animationName),'none');
 await p.locator('#questNext').click();await p.locator('#readyChallenge').waitFor();assert.equal(await p.locator('.learningFeedback').count(),0);
 // Test the shared input feedback with escaped untrusted strings and missing letters.
 await p.evaluate(()=>{const box=document.createElement('div');box.id='feedbackFixture';document.querySelector('#questWork').append(box);window.wordylandLearning.show(box,false,{expected:'e',answer:'a',word:'head',kind:'missing'});});
 assert.match(await p.locator('#feedbackFixture').textContent(),/lettera «e».*head/);
 await p.evaluate(()=>wordylandLearning.show(document.querySelector('#feedbackFixture'),false,{expected:'<img src=x onerror="window.injected=true">',answer:'bad',kind:'choice'}));assert.equal(await p.locator('#feedbackFixture img').count(),0);assert.equal(await p.evaluate(()=>window.injected),undefined);
 const classic=await p.evaluate(()=>{mode='write';queue=[['head','testa','🙂']];pos=0;render();document.querySelector('#answer').value='hed';check();const error=document.querySelector('#feedback').textContent;const font=parseFloat(getComputedStyle(document.querySelector('#answer')).fontSize);document.querySelector('#answer').value='head';check();return {error,font,success:!!document.querySelector('#feedback .feedbackSuccess')};});
 assert.match(classic.error,/Dopo «he» serve «a»/);assert(classic.font>=32);assert(classic.success);
 await p.goto(base+'/offline.html');await p.locator('.offlineOptions button').first().waitFor();
 // Offline is fully self-contained; validate retry and celebration in its real DOM.
 const prompt=(await p.locator('.offlinePrompt').textContent()).trim();
 const offlineAnswer=await p.evaluate(async prompt=>{const banks=await(await fetch('curriculum.json')).json();return banks[document.querySelector('#offlineTopic').value].find(x=>prompt===x[1])?.[0];},prompt);
 assert(offlineAnswer,'Offline answer available');
 const offlineButtons=p.locator('.offlineOptions button');let offlineRight;
 for(let i=0;i<await offlineButtons.count();i++){const b=offlineButtons.nth(i);if((await b.textContent()).trim()===offlineAnswer)offlineRight=b;else{await b.click();await p.locator('.feedbackRetry').waitFor();break;}}
 if(!offlineRight){for(let i=0;i<await offlineButtons.count();i++)if((await offlineButtons.nth(i).textContent()).trim()===offlineAnswer)offlineRight=offlineButtons.nth(i);}
 await offlineRight.click();await p.locator('.feedbackSuccess').waitFor();assert.equal(await p.locator('#offlineNext').isVisible(),true);
 assert.deepEqual(errors,[]);await browser.close();console.log('Learning browser passed: mission wrong/right/retry/next, mobile sizes, no overflow, reduced motion, audio languages without autoplay, HTML escaping and offline feedback.');
})().catch(e=>{console.error(e);process.exit(1)});
