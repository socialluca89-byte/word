// Optional end-to-end school lesson check; use an isolated local PHP server.
const {chromium}=require(process.env.WORDYLAND_PLAYWRIGHT_MODULE||'playwright');const assert=require('assert/strict');
(async()=>{const browser=await chromium.launch({executablePath:process.env.WORDYLAND_CHROMIUM||undefined,args:['--no-sandbox','--use-angle=swiftshader','--enable-unsafe-swiftshader']});const p=await browser.newPage({viewport:{width:1360,height:1000},reducedMotion:'reduce'}),errors=[];p.on('pageerror',e=>errors.push(e.message));const base=process.env.WORDYLAND_TEST_URL||'http://127.0.0.1:8093';await p.goto(base+'/#preposizioni');await p.getByRole('heading',{name:'Preposizioni di luogo',exact:true}).waitFor();assert.equal(await p.locator('[data-lesson]').count(),3);
for(const topic of ['catpositions','penpositions','mousepositions'])assert((await p.locator('[data-lesson='+topic+'] h4').textContent()).includes('Preposizioni'));
await p.reload();await p.getByRole('heading',{name:'Preposizioni di luogo',exact:true}).waitFor();assert.equal(await p.locator('[data-lesson]').count(),3);
await p.goto(base);await p.locator('.startHub a[href="#preposizioni"]').click();await p.getByRole('heading',{name:'Preposizioni di luogo',exact:true}).waitFor();await p.getByRole('link',{name:'← Tutti gli esercizi',exact:true}).click();await p.locator('[data-lesson=counting]').waitFor();assert.equal(await p.locator('[data-lesson]').count(),13);assert.deepEqual(await p.locator('[data-lesson]').evaluateAll(nodes=>nodes.slice(0,3).map(n=>n.dataset.lesson)),['catpositions','penpositions','mousepositions']);
for(const topic of ['catpositions','counting','penpositions','conversation','aboutme','family','food','clothes','weather','routines','mousepositions']){
 await p.locator('[data-tab=lessons]').click();await p.locator('[data-lesson='+topic+']').click();await p.locator('#readyChallenge').waitFor();if(['catpositions','penpositions','mousepositions'].includes(topic))assert((await p.locator('.activeAdventure b').textContent()).includes('Preposizioni'));
 for(let n=0;n<3;n++){
  const word=(await p.locator('#questWork .questWord').textContent()).trim();const translation=(await p.locator('#missionStage .questPicture+p').textContent()).trim();
  if(['catpositions','penpositions','mousepositions'].includes(topic))assert.equal(await p.locator('.questPicture svg').count(),1,'Position scene '+topic);
  const scene=await p.locator('#missionWorld canvas').elementHandle();await p.locator('#readyChallenge').click();assert(await scene.evaluate(e=>e.isConnected));
  if(await p.locator('[data-answer]').count()){
   const buttons=p.locator('[data-answer]');let clicked=false;
   for(let i=0;i<await buttons.count();i++){const b=buttons.nth(i);const small=b.locator('small');if(await small.count()?(await small.textContent()).trim()===translation:(await b.textContent()).trim()===word){await b.click();clicked=true;break;}}
   assert(clicked,'Choice not found '+topic+' '+word);
   if(topic==='counting')assert.equal(await p.locator('.questPicture+p').isVisible(),false);
  }else if(await p.locator('#questAnswer').count()){
   let answer=word;const mask=p.locator('#questWork .questWord');if(await mask.count()){const value=await mask.textContent();const start=value.indexOf('_');let end=start;while(value[end]==='_')end++;answer=word.slice(start,end);}
   assert(await p.locator('#questAnswer').evaluate(e=>parseFloat(getComputedStyle(e).fontSize)>=32),'Readable input');await p.locator('#questAnswer').fill(answer);await p.getByRole('button',{name:'Controlla ✓',exact:true}).click();
  }else{
   for(const char of word){const buttons=p.locator('[data-tile]:not(:disabled)');let found=false;for(let i=0;i<await buttons.count();i++)if((await buttons.nth(i).textContent())===(char===' '?'␣':char)){await buttons.nth(i).click();found=true;break;}assert(found,'Missing tile '+char);}
   await p.getByRole('button',{name:'Controlla ✓',exact:true}).click();
  }
  if(n<2){await p.locator('#questNext').click();await p.locator('#readyChallenge').waitFor();}else await p.locator('#completedWorld').waitFor();
 }
 console.log('Lesson completed:',topic);
}
await p.locator('[data-tab=lessons]').click();for(const width of[390,360]){await p.setViewportSize({width,height:844});assert(await p.evaluate(()=>document.documentElement.scrollWidth<=innerWidth),'Overflow '+width);}await p.goto(base+'/#preposizioni');await p.getByRole('heading',{name:'Preposizioni di luogo',exact:true}).waitFor();for(const width of[390,360]){await p.setViewportSize({width,height:844});assert(await p.evaluate(()=>document.documentElement.scrollWidth<=innerWidth),'Preposition overflow '+width);}if(process.env.WORDYLAND_BROWSER_SCREENSHOT)await p.screenshot({path:process.env.WORDYLAND_BROWSER_SCREENSHOT,fullPage:true});assert.deepEqual(errors,[]);await browser.close();console.log('New lesson browser passed: direct preposition link/home shortcut, three clearly named spatial cards, thirteen accessible topic cards, eleven full missions, counting/dialogue/gaps, shared scenes, no errors and mobile layout.');})().catch(e=>{console.error(e);process.exit(1)});
