const {chromium}=require(process.env.WORDYLAND_PLAYWRIGHT_MODULE||'playwright'),assert=require('assert/strict'),fs=require('fs'),path=require('path');
const base=process.env.WORDYLAND_TEST_URL;assert(['localhost','127.0.0.1'].includes(new URL(base).hostname));
(async()=>{
 const browser=await chromium.launch({executablePath:process.env.WORDYLAND_CHROMIUM||'/usr/bin/chromium',args:['--no-sandbox','--use-angle=swiftshader','--enable-unsafe-swiftshader']}),results=[];
 try{
  for(const width of [320,390,768,1360]){
   const p=await browser.newPage({viewport:{width,height:844},reducedMotion:'reduce'}),errors=[];p.on('pageerror',e=>errors.push(e.message));
   await p.goto(base);await p.evaluate(()=>wordylandAccount.ready);await p.evaluate(()=>document.fonts.ready);
   const measures=await p.locator('.startChoices a').evaluateAll(nodes=>nodes.map(node=>({title:node.querySelector('b').textContent,top:Math.round(node.getBoundingClientRect().top),bottom:Math.round(node.getBoundingClientRect().bottom),height:Math.round(node.getBoundingClientRect().height)})));
   results.push({width,choices:measures});assert(await p.evaluate(()=>document.documentElement.scrollWidth<=innerWidth),'No overflow '+width);
   if(!process.env.WORDYLAND_UI_BASELINE){assert(await p.locator('.startChoices b').evaluateAll(nodes=>nodes.every(node=>node.scrollWidth<=node.clientWidth)),'Choice titles fit their cards at '+width);for(const choice of measures){assert(choice.height>=44);assert(choice.bottom<=844,'All three main destinations visible on first screen at '+width);}}
   if(process.env.WORDYLAND_UI_CAPTURE_DIR){fs.mkdirSync(process.env.WORDYLAND_UI_CAPTURE_DIR,{recursive:true});await p.screenshot({path:path.join(process.env.WORDYLAND_UI_CAPTURE_DIR,(process.env.WORDYLAND_UI_BASELINE?'before':'after')+'-'+width+'.png')});}
   if(!process.env.WORDYLAND_UI_BASELINE){
    await p.locator('.startChoices a[href="#allenati"]').click();await p.locator('[data-lesson=catpositions]').waitFor();
    await p.locator('.startChoices a[href="#personaggi"]').click();await p.locator('.shopGrid').waitFor();
    await p.locator('.startChoices a[href="#sfide"]').click();await p.locator('#arenaLogin').waitFor();await p.locator('#arenaLogin').click();await p.locator('#accountUser').waitFor();
   }
   assert.deepEqual(errors,[]);await p.close();
  }
  console.log('Home navigation measurements:',JSON.stringify(results));
 }finally{await browser.close();}
})().catch(e=>{console.error(e);process.exit(1)});
