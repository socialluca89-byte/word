// Focused exercise presentation and calm home styling, with real local UI and synthetic guest data.
const assert = require('assert/strict');
const fs = require('fs');
const path = require('path');
const {chromium} = require(process.env.WORDYLAND_PLAYWRIGHT_MODULE || 'playwright');
const base = process.env.WORDYLAND_TEST_URL;
assert(base && ['localhost', '127.0.0.1'].includes(new URL(base).hostname), 'Disposable localhost only');
const origin = new URL(base).origin;
const captures = process.env.WORDYLAND_TASTE_SCREENSHOTS;
if (captures) {assert(['/workspace/', '/tmp/'].some(root => path.resolve(captures).startsWith(root))); fs.mkdirSync(captures, {recursive: true});}
const routes = ['#allenati', '#sfide', '#personaggi', '#dettato', '#allenamento', '#festivita', '#scoperte', '#preposizioni', 'offline.html'].sort();
const legacyWordKey = 'wordylandTrainingGuest';
const seed = JSON.stringify({version: 1, sessions: [], stickers: ['first'], completed: 1, items: ['word:cat'], itemCounts: {'word:cat': 1}, firstDay: '2026-10-01', lastDay: '2026-10-01'});

(async () => {
  const browser = await chromium.launch({executablePath: process.env.WORDYLAND_CHROMIUM || '/usr/bin/chromium', args: ['--no-sandbox', '--use-angle=swiftshader', '--enable-unsafe-swiftshader']});
  const errors = [], posts = [], metrics = [], checks = [];
  const checkpoint = text => {checks.push(text); console.log('Taste UI checkpoint: ' + text);};
  try {
    const context = await browser.newContext({viewport: {width: 390, height: 844}, hasTouch: true, reducedMotion: 'reduce', serviceWorkers: 'block'});
    await context.addInitScript(({legacyWordKey, seed}) => {
      if (!localStorage.getItem(legacyWordKey)) localStorage.setItem(legacyWordKey, seed);
      const fixture = window.tasteSpeech = {enabled: true, hold: true, cancels: 0, pending: [], spoken: []};
      Object.defineProperty(window, 'speechSynthesis', {configurable: true, value: {
        getVoices: () => fixture.enabled ? [{name: 'Synthetic local English', voiceURI: 'taste-en', lang: 'en-GB', localService: true}] : [],
        get speaking() {return fixture.pending.length > 0;},
        cancel() {fixture.cancels++; fixture.pending = [];}, addEventListener() {},
        speak(utterance) {fixture.pending.push(utterance); fixture.spoken.push(utterance.text); utterance.onstart?.();}
      }});
      window.SpeechSynthesisUtterance = class {constructor(text) {this.text = text;}};
    }, {legacyWordKey, seed});
    const p = await context.newPage();
    p.on('pageerror', error => errors.push(error.message));
    p.on('request', request => {if (request.method() === 'POST') posts.push(request.url());});
    await p.route('**/*', route => new URL(route.request().url()).origin === origin ? route.continue() : route.abort());
    await p.goto(base);
    await p.evaluate(() => wordylandAccount.ready);
    await p.waitForFunction(() => Boolean(window.wordylandClassProgram));
    await p.locator('.startHub .homePracticeRoutes').waitFor();
    await p.keyboard.press('Tab');
    assert.equal(await p.evaluate(() => document.activeElement.id), 'skipContent', 'The first keyboard target remains the skip link');
    assert(await p.locator('#skipContent').evaluate(n => {const r=n.getBoundingClientRect(),s=getComputedStyle(n); return r.top>=0&&r.bottom<=innerHeight&&s.outlineStyle!=='none'&&parseFloat(s.outlineWidth)>=2;}), 'The skip-link focus ring is visible');
    const economy = await p.evaluate(() => ({stats: structuredClone(stats), stars}));
    const legacyBytes = await p.evaluate(key => localStorage.getItem(key), legacyWordKey);

    async function geometry(width, name) {
      await p.setViewportSize({width, height: width === 1360 ? 900 : 844});
      assert(await p.evaluate(() => document.documentElement.scrollWidth <= innerWidth), 'No horizontal overflow at ' + width);
      if (captures && [390, 1360].includes(width)) await p.locator(name === 'home' ? '.startHub' : '#trainingHub').screenshot({path: path.join(captures, name + '-' + width + '.png')});
    }
    async function calmHome(width) {
      await geometry(width, 'home');
      const found = await p.locator('.startHub a[href]').evaluateAll(nodes => [...new Set(nodes.map(n => n.getAttribute('href')))].sort());
      assert.deepEqual(found, routes, 'All nine previous home destinations remain available');
      assert(await p.locator('.welcomeIsland[data-jump=adventures]').isVisible());
      assert.equal(await p.locator('.homePracticeHelp>summary').count(), 1);
      const buttons = await p.locator('.startChoices a,.homePracticeRoutes>a,.appTools button,.appTools a').evaluateAll(nodes => nodes.map(n => {
        const s=getComputedStyle(n),r=n.getBoundingClientRect();
        const color=value => value.match(/[\d.]+/g).slice(0,3).map(Number);
        const luminance=rgb => rgb.map(x=>{x/=255;return x<=.04045?x/12.92:((x+.055)/1.055)**2.4;}).reduce((v,x,i)=>v+x*[.2126,.7152,.0722][i],0);
        let parent=n,bg=s.backgroundColor; while (/rgba\([^)]*,\s*0\)/.test(bg) && parent.parentElement) {parent=parent.parentElement;bg=getComputedStyle(parent).backgroundColor;}
        const a=luminance(color(s.color)),b=luminance(color(bg));
        return {text:n.textContent.trim(),height:r.height,shadow:s.boxShadow,border:s.borderTopWidth,contrast:(Math.max(a,b)+.05)/(Math.min(a,b)+.05),secondary:n.closest('.homePracticeRoutes')!==null};
      }));
      for (const button of buttons) {assert(button.height>=44, 'Touch target: '+button.text);assert(button.contrast>=4.5, 'Readable home control contrast: '+button.text+' ('+button.contrast+')');}
      assert(buttons.filter(b=>b.secondary).every(b=>b.shadow==='none'&&parseFloat(b.border)<=1), 'Secondary routes use quiet surfaces without raised shadows');
      metrics.push({kind:'home',width,buttons});
      await p.locator('.startChoices a').first().hover();
      assert.equal(await p.locator('.startChoices a').first().evaluate(n=>getComputedStyle(n).transform), 'none', 'Reduced motion preserves a still home');
      await p.locator('.startChoices a').first().focus();
      assert(await p.locator('.startChoices a').first().evaluate(n=>{const s=getComputedStyle(n);return s.outlineStyle!=='none'&&parseFloat(s.outlineWidth)>=2;}), 'Home controls retain visible keyboard focus');
    }
    async function zoomStress(selector) {
      await p.setViewportSize({width:1360,height:900});
      await p.evaluate(()=>document.body.style.zoom='2');
      assert(await p.evaluate(()=>document.documentElement.scrollWidth<=innerWidth),'No horizontal overflow under CSS zoom200%');
      assert(await p.locator(selector).evaluate(n=>{const r=n.getBoundingClientRect();return r.left>=0&&r.right<=innerWidth;}),'The current surface fits under CSS zoom200%');
      metrics.push({kind:'css-zoom-stress',surface:selector,factor:2,width:1360});
      await p.evaluate(()=>document.body.style.zoom='');
    }
    for (const width of [320,390,768,1360]) await calmHome(width);
    await zoomStress('.startHub');
    await p.locator('#installApp').click();assert.equal(await p.locator('#installApp').getAttribute('aria-expanded'),'true');assert(await p.locator('#installHelp').isVisible());
    await p.locator('#installApp').click();assert.equal(await p.locator('#installApp').getAttribute('aria-expanded'),'false');
    await p.locator('.homePracticeHelp>summary').click();assert(await p.locator('.homePracticeHelp dl').isVisible());await p.locator('.homePracticeHelp>summary').click();
    assert.equal(await p.evaluate(key=>localStorage.getItem(key),legacyWordKey),legacyBytes, 'Home presentation controls never rewrite legacy practice');
    checkpoint('all nine home destinations, illustrations, 44px controls, contrast, focus and reduced-motion preserved at320/390/768/1360');

    async function training() {
      if (new URL(p.url()).hash==='#allenamento') {await p.evaluate(()=>location.hash='allenati');await p.locator('#trainingHub').waitFor({state:'hidden'});}
      await p.evaluate(()=>location.hash='allenamento');await p.locator('#openGrammarTraining').waitFor();
    }
    async function grammarMenu() {await training();await p.locator('#openGrammarTraining').click();await p.locator('#grammarMenu').waitFor();assert.equal(await p.evaluate(()=>document.body.dataset.play||''),'');}
    async function session() {const token=await p.locator('#grammarHub').getAttribute('data-token');return p.evaluate(token=>{for(const key of ['wordylandGrammarGuestV1','wordylandBest2GrammarGuestV1']){const d=JSON.parse(localStorage.getItem(key)||'null');const s=d?.sessions.find(row=>row.token===token);if(s)return s;}throw Error('Guest token not found');},token);}
    async function focused(width) {
      await geometry(width,'grammar-empty');
      assert.equal(await p.evaluate(()=>document.body.dataset.play),'training');assert(!await p.locator('.startHub').isVisible());assert(!await p.locator('.raceHero').isVisible());assert(await p.locator('#trainingHub').isVisible());
      const box=await p.locator('#grammarFeedback').evaluate(n=>{const s=getComputedStyle(n);return {height:n.getBoundingClientRect().height,padding:s.padding,border:s.borderWidth,display:s.display,role:n.getAttribute('role'),live:n.getAttribute('aria-live'),text:n.textContent};});
      assert.equal(box.text,'');assert.equal(box.height,0);assert.equal(parseFloat(box.padding),0);assert.equal(parseFloat(box.border),0);assert.notEqual(box.display,'none');assert.equal(box.role,'status');assert.equal(box.live,'polite');
      metrics.push({kind:'grammar',width,mode:'training',homeDisplay:'none',feedback:box});
    }
    async function feedback(correct, label) {
      const n=p.locator('#grammarFeedback[data-correct='+correct+']');await n.waitFor();
      assert(await n.evaluate(n=>{const s=getComputedStyle(n);return n.getBoundingClientRect().height>40&&parseFloat(s.borderTopWidth)>=1&&n.getAttribute('role')==='status'&&n.getAttribute('aria-live')==='polite'&&n.textContent.trim().length>10;}), 'A populated live region is visibly restored');
      if (captures && label) await p.locator('#trainingHub').screenshot({path:path.join(captures,label+'-390.png')});
    }
    async function pauseResume(s) {
      const before=await p.evaluate(()=>Object.fromEntries(['wordylandGrammarGuestV1','wordylandBest2GrammarGuestV1','wordylandTrainingGuest','wordylandBest2TrainingGuestV1'].map(key=>[key,localStorage.getItem(key)])));
      await p.locator('#grammarPause').click();await p.locator('#grammarMenu').waitFor();assert.equal(await p.evaluate(()=>document.body.dataset.play||''),'');assert(await p.locator('.startHub').isVisible());
      assert.deepEqual(await p.evaluate(()=>Object.fromEntries(['wordylandGrammarGuestV1','wordylandBest2GrammarGuestV1','wordylandTrainingGuest','wordylandBest2TrainingGuestV1'].map(key=>[key,localStorage.getItem(key)]))),before,'Pause/menu styling grants no progress or reward');
      await p.locator('[data-grammar-resume="'+s.token+'"]').click();await p.locator('#grammarHub').waitFor();const resumed=await session();assert.equal(resumed.token,s.token);assert.equal(resumed.step,s.step);assert.deepEqual(resumed.plan,s.plan);assert.equal(resumed.hint,s.hint);assert.equal(resumed.helped,s.helped);assert.equal(await p.evaluate(()=>document.body.dataset.play),'training');
    }
    async function solve(q,{double=false}={}) {
      if(q.mode==='grammar-model'){if(double)await p.locator('#grammarModelContinue').dblclick();else await p.locator('#grammarModelContinue').click();}
      else if(q.mode==='grammar-choice'){await p.locator('[data-grammar-choice]').evaluateAll((ns,value)=>ns.find(n=>n.dataset.grammarChoice===value).focus(),q.answer);await p.keyboard.press('Enter');}
      else if(q.mode==='grammar-write'){await p.locator('#grammarInput').fill(q.answer);await p.locator('#grammarCheck').click();}
      else if(q.mode==='grammar-build'){
        assert(!await p.locator('#grammarBuildCheck').isEnabled());
        for(const value of q.answer.split(' ')){const id=await p.locator('[data-grammar-token]:not(:disabled)').evaluateAll((ns,value)=>ns.find(n=>n.textContent.trim()===value)?.dataset.grammarToken,value);assert.notEqual(id,undefined);await p.locator('[data-grammar-token="'+id+'"]').focus();await p.keyboard.press('Enter');}
        await p.locator('#grammarBuildCheck').click();
      }else assert.fail('Unexpected mode '+q.mode);
      await feedback(true);
    }
    await grammarMenu();await p.locator('[data-grammar-pack="best2-this-these"]').click();await p.locator('#grammarHub').waitFor();let s=await session();
    for(const width of [320,390,768,1360]) await focused(width);
    await zoomStress('#trainingHub');
    await p.setViewportSize({width:390,height:844});
    // A complete model/choice/build/write round retains every existing phase and saved helper.
    const seen=new Set();let wrong=false,audio=false,undo=false,nav=false;
    while(!s.done){
      const q=s.plan[s.step],oldStep=s.step;seen.add(q.mode);assert.equal(await p.evaluate(()=>document.body.dataset.play),'training');
      if(!audio){await p.locator('#grammarListen').click();assert.equal(await p.evaluate(()=>tasteSpeech.pending.length),1);const before=s;await pauseResume(s);s=await session();assert.equal(await p.evaluate(()=>tasteSpeech.pending.length),0);assert.equal(s.step,before.step);audio=true;}
      if(!nav&&q.mode==='grammar-choice'){
        await p.locator('#grammarHint').click();await p.waitForFunction(token=>JSON.parse(localStorage.getItem('wordylandBest2GrammarGuestV1')).sessions.find(s=>s.token===token).helped,s.token);s=await session();await pauseResume(s);await p.locator('#grammarBack').click();await p.locator('#openGrammarTraining').waitFor();assert.equal(await p.evaluate(()=>document.body.dataset.play||''),'');await p.locator('#openGrammarTraining').click();await p.locator('[data-grammar-resume="'+s.token+'"]').click();assert.equal((await session()).step,s.step);nav=true;
      }
      if(q.mode==='grammar-choice'&&!wrong){const bad=q.choices.find(value=>value!==q.answer);assert(bad);await p.locator('[data-grammar-choice]').evaluateAll((ns,value)=>ns.find(n=>n.dataset.grammarChoice===value).click(),bad);await feedback(false,'grammar-error');assert.equal((await session()).step,oldStep);wrong=true;}
      if(q.mode==='grammar-build'&&!undo){await p.locator('[data-grammar-token]').first().click();assert.equal(await p.locator('[data-grammar-picked]').count(),1);await p.locator('#grammarUndo').click();assert.equal(await p.locator('[data-grammar-picked]').count(),0);assert(!await p.locator('#grammarBuildCheck').isEnabled());undo=true;}
      if(q.mode==='grammar-write'){await p.locator('#grammarInput').fill('   ');assert(!await p.locator('#grammarCheck').isEnabled());await pauseResume(await session());}
      await solve(q,{double:oldStep===0});await feedback(true,oldStep===1?'grammar-success':null);s=await session();assert.equal(s.step,oldStep+1,'Double clicks and focused styling advance exactly one confirmed step');
      await p.locator('#grammarNext').click();if(s.done)await p.locator('#grammarAgain').waitFor();else await p.locator('#grammarHub[data-step="'+s.step+'"]').waitFor();
    }
    assert.deepEqual([...seen].sort(),['grammar-build','grammar-choice','grammar-model','grammar-write']);assert(wrong&&audio&&undo&&nav);
    assert.equal(await p.evaluate(()=>document.body.dataset.play||''),'');assert(await p.locator('.startHub').isVisible());
    await p.locator('#grammarAgain').click();await p.locator('#grammarMenu').waitFor();await p.locator('#grammarBack').click();await p.locator('#openGrammarTraining').waitFor();
    checkpoint('all four grammar phases focus the exercise; pause/back/menu/done restore chrome, old token/help preserved, audio cancels, errors/success retain a live region');

    // Route away while audio is held, then use the browser back button to recover the saved session.
    await p.locator('#openGrammarTraining').click();await p.locator('[data-grammar-pack="number"]').click();await p.locator('#grammarHub').waitFor();const pending=await session();
    await p.locator('#grammarListen').click();assert.equal(await p.evaluate(()=>tasteSpeech.pending.length),1);
    await p.evaluate(()=>location.hash='allenati');await p.locator('#trainingHub').waitFor({state:'hidden'});assert.notEqual(await p.evaluate(()=>document.body.dataset.play||''),'training');assert.equal(await p.evaluate(()=>tasteSpeech.pending.length),0);
    await p.goBack();await p.locator('#openGrammarTraining').waitFor();await p.locator('#openGrammarTraining').click();await p.locator('[data-grammar-resume="'+pending.token+'"]').click();assert.equal((await session()).step,pending.step);assert.equal(await p.evaluate(()=>document.body.dataset.play),'training');await pauseResume(await session());
    await p.locator('#grammarBack').click();await p.locator('#startWordTraining').click();await p.locator('#trainingContinue').waitFor();assert.equal(await p.evaluate(()=>document.body.dataset.play),'training');assert(!await p.locator('.startHub').isVisible());await p.locator('#pauseTraining').click();await p.locator('#openGrammarTraining').waitFor();assert.equal(await p.evaluate(()=>document.body.dataset.play||''),'');
    assert.deepEqual(await p.evaluate(()=>({stats:structuredClone(stats),stars})),economy,'Presentation changes never alter classic points, wallets or progress');
    assert.equal(posts.length,0,'A guest visual/navigation audit sends no account API writes');assert.deepEqual(errors,[]);
    checkpoint('hash away/browser back/word parity retain navigation and synthetic economy without account writes');
    if(captures)fs.writeFileSync(path.join(captures,'after-metrics.json'),JSON.stringify({checks,metrics,viewports:[320,390,768,1360],syntheticOnly:true,audio:'synthetic utterances; real voice/screen-reader output not validated'},null,2));
    console.log(JSON.stringify({status:'PASS',checks,viewports:[320,390,768,1360],syntheticOnly:true,screenReader:'Live-region semantics/updates only; no physical screen reader validation'},null,2));
  }finally{await browser.close();}
})().catch(error=>{console.error(error);process.exitCode=1;});
