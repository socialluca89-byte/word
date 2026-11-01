const {chromium}=require(process.env.WORDYLAND_PLAYWRIGHT_MODULE||'playwright'),assert=require('assert/strict'),fs=require('fs'),path=require('path');
const base=process.env.WORDYLAND_TEST_URL;assert(['localhost','127.0.0.1'].includes(new URL(base).hostname));
(async()=>{
 const browser=await chromium.launch({executablePath:process.env.WORDYLAND_CHROMIUM||'/usr/bin/chromium',args:['--no-sandbox','--use-angle=swiftshader','--enable-unsafe-swiftshader']}),results=[];
 try{
  for(const width of [320,390,768,1360]){
   const p=await browser.newPage({viewport:{width,height:844},reducedMotion:'reduce'}),errors=[];p.on('pageerror',e=>errors.push(e.message));
   await p.goto(base);await p.evaluate(()=>wordylandAccount.ready);await p.evaluate(()=>document.fonts.ready);
   if(!process.env.WORDYLAND_UI_BASELINE){
    const initialHash=new URL(p.url()).hash;
    await p.locator('.skipLink').focus();await p.keyboard.press('Enter');
    assert.equal(await p.evaluate(()=>document.activeElement.id),'mainContent','Keyboard skip reaches the main landmark');
    assert.equal(new URL(p.url()).hash,initialHash,'Skipping chrome must not change the application route');
    assert.equal(await p.locator('h1').count(),1,'One primary page heading');
    assert.equal(await p.locator('h1').getAttribute('id'),'startTitle','The first decision is the primary page heading');
    await p.locator('.adultNavigation>summary').click();
    assert.deepEqual(await p.locator('.serviceNavLabel').allTextContents(),['Impara e gioca','La classe','Gestione e assistenza']);
    const menuHeights=await p.locator('.serviceNav a').evaluateAll(nodes=>nodes.map(node=>node.getBoundingClientRect().height));
    assert(menuHeights.every(height=>height>=44),'All grouped service links remain touch accessible at '+width);
    await p.locator('.adultNavigation>summary').click();
    assert(await p.locator('.mapToolbar button').evaluateAll(nodes=>nodes.every(node=>node.getBoundingClientRect().height>=44&&node.getBoundingClientRect().width>=44)),'Map toolbar supports touch at '+width);
    assert(await p.locator('.heroPlayModes button').evaluateAll(nodes=>nodes.every(node=>node.getBoundingClientRect().height>=44)),'Scene modes support touch at '+width);
    assert(await p.locator('.accountArea>summary').evaluate(node=>parseFloat(getComputedStyle(node).fontSize)>=16&&node.getBoundingClientRect().height>=48),'Account entry remains readable and touch accessible at '+width);
    assert.equal(await p.locator('.appNotices').count(),1,'One global connection/update region');
    assert.equal(await p.locator('main .appNotices,.startHub #connectionNotice,.startHub #appUpdate').count(),0,'Global notices remain outside route-specific content');
    await p.locator('.practiceZone>summary').click();
    assert(await p.locator('.practiceZone aside label').evaluateAll(nodes=>nodes.every(node=>parseFloat(getComputedStyle(node).fontSize)>=15)),'Classic practice labels are readable at '+width);
    assert(await p.locator('.practiceZone .mode span').evaluateAll(nodes=>nodes.every(node=>parseFloat(getComputedStyle(node).fontSize)>=14)),'Classic mode instructions are readable at '+width);
    assert(await p.locator('.practiceZone aside select').evaluateAll(nodes=>nodes.every(node=>parseFloat(getComputedStyle(node).fontSize)>=16&&node.getBoundingClientRect().height>=48)),'Classic controls avoid tiny text and touch targets at '+width);
    await p.locator('.practiceZone>summary').click();
    await p.keyboard.press('Tab');
    for(const entry of await p.locator('.startChoices a').all()){
     await entry.focus();
     assert(await entry.evaluate(node=>{const style=getComputedStyle(node),luminance=color=>{const rgb=color.match(/[\d.]+/g).slice(0,3).map(Number).map(x=>{const n=x/255;return n<=.04045?n/12.92:Math.pow((n+.055)/1.055,2.4);});return rgb[0]*.2126+rgb[1]*.7152+rgb[2]*.0722;},a=luminance(style.outlineColor),b=luminance(style.backgroundColor);return style.outlineStyle!=='none'&&parseFloat(style.outlineWidth)>=3&&(Math.max(a,b)+.05)/(Math.min(a,b)+.05)>=3;}),'Keyboard focus contrasts with each coloured start card at '+width);
    }
    await p.locator('#islandMap').scrollIntoViewIfNeeded();await p.locator('.islandPin').first().waitFor({state:'visible'});
    assert.equal(await p.locator('.islandPin').count(),8,'Keep every 3D map destination');
    const mapBounds=async()=>{
     await p.evaluate(()=>new Promise(resolve=>requestAnimationFrame(()=>requestAnimationFrame(resolve))));
     assert(await p.locator('#islandMap').evaluate(map=>{const host=map.getBoundingClientRect();return [...map.querySelectorAll('.islandPin')].every(pin=>{const box=pin.getBoundingClientRect();return box.width>=44&&box.height>=44&&box.left>=host.left&&box.right<=host.right&&box.top>=host.top&&box.bottom<=host.bottom;});}),'Map pin touch targets stay fully inside the map at '+width);
    };
    for(const pin of await p.locator('.islandPin').all()){await pin.focus();await mapBounds();assert(await pin.locator('b').isVisible(),'Focused map destination has a visible name');assert(await pin.locator('b').evaluate(node=>parseFloat(getComputedStyle(node).fontSize)>=12),'Focused map destination name is readable');}
    for(const control of ['#islandLeft','#islandRight','#islandZoom']){await p.locator(control).click();await mapBounds();}
    await p.evaluate(()=>window.scrollTo(0,0));
   }
   const measures=await p.locator('.startChoices a').evaluateAll(nodes=>nodes.map(node=>({title:node.querySelector('b').textContent,top:Math.round(node.getBoundingClientRect().top),bottom:Math.round(node.getBoundingClientRect().bottom),height:Math.round(node.getBoundingClientRect().height)})));
   results.push({width,choices:measures});assert(await p.evaluate(()=>document.documentElement.scrollWidth<=innerWidth),'No overflow '+width);
   if(!process.env.WORDYLAND_UI_BASELINE){assert(await p.locator('.startChoices b').evaluateAll(nodes=>nodes.every(node=>node.scrollWidth<=node.clientWidth)),'Choice titles fit their cards at '+width);for(const choice of measures){assert(choice.height>=44);assert(choice.bottom<=844,'All three main destinations visible on first screen at '+width);}}
   if(process.env.WORDYLAND_UI_CAPTURE_DIR){fs.mkdirSync(process.env.WORDYLAND_UI_CAPTURE_DIR,{recursive:true});await p.screenshot({path:path.join(process.env.WORDYLAND_UI_CAPTURE_DIR,(process.env.WORDYLAND_UI_BASELINE?'before':'after')+'-'+width+'.png')});}
   if(!process.env.WORDYLAND_UI_BASELINE){
    await p.locator('.startChoices a[href="#allenati"]').click();await p.locator('[data-lesson=catpositions]').waitFor();
    await p.locator('.startChoices a[href="#personaggi"]').click();await p.locator('.shopGrid').waitFor();
    await p.locator('.startChoices a[href="#sfide"]').click();await p.locator('#arenaLogin').waitFor();await p.locator('#arenaLogin').click();await p.locator('#accountUser').waitFor();
    const destinations=['#personaggi','#iscritti','#classe-crea','#sfide','#segnalazioni','#admin','#allenamento'];
    assert.deepEqual(await p.locator('.serviceNav a').evaluateAll(nodes=>nodes.map(node=>node.hash).sort()),[...destinations].sort(),'Preserve every service destination');
    for(const destination of destinations){
     if(await p.locator('.adultNavigation').getAttribute('open')===null)await p.locator('.adultNavigation>summary').click();
     await p.locator('.serviceNav a[href="'+destination+'"]').click();
     if(destination==='#allenamento')await p.locator('[data-training-block=ae]').waitFor();
     else if(destination==='#personaggi')await p.locator('.shopGrid').waitFor();
     else if(destination==='#sfide')await p.locator('#arenaLogin').waitFor();
     else await p.locator('#communityHub #communityLogin').waitFor();
     assert.equal(new URL(p.url()).hash,destination);
     if(['#iscritti','#classe-crea','#segnalazioni','#admin'].includes(destination)){
      assert(await p.locator('#communityHub').isVisible(),'The requested service panel is visible at '+width);
      assert(!await p.locator('.startHub').isVisible(),'The home choices do not bury a dedicated service panel');
      assert(!await p.locator('.raceHero').isVisible(),'The island presentation does not bury a dedicated service panel');
      await p.locator('#communityHub a[href="#"]').click();
      await p.locator('.startChoices').waitFor({state:'visible'});await p.locator('.raceHero').waitFor({state:'visible'});
      assert.equal(new URL(p.url()).hash,'','Return to game restores the home route');
      assert(!await p.locator('#communityHub').isVisible(),'Returning home closes the dedicated service panel');
     }
    }
    await p.locator('.skipLink').focus();await p.keyboard.press('Enter');
    assert.equal(new URL(p.url()).hash,'#allenamento','Keyboard skip preserves an open training route');
    await p.locator('[data-training-block=ae]').waitFor({state:'visible'});
    assert(await p.locator('#installApp').isVisible(),'Installation entry remains reachable');
    await p.locator('.appTools a[href="offline.html"]').click();await p.locator('.offlineOptions button').first().waitFor();
    await p.goto(base);await p.evaluate(()=>wordylandAccount.ready);await p.locator('.practiceZone>summary').click();
    const classic=['journey','write','build','match','paper','look'];
    assert.deepEqual(await p.locator('.practiceZone [data-mode]').evaluateAll(nodes=>nodes.map(node=>node.dataset.mode).sort()),[...classic].sort(),'Preserve all six classic modes');
    for(const mode of classic){await p.locator('.practiceZone [data-mode="'+mode+'"]').click();assert.equal(await p.locator('.practiceZone [data-mode="'+mode+'"]').getAttribute('aria-pressed'),'true');await p.locator('#begin').waitFor({state:'visible'});}


   }
   assert.deepEqual(errors,[]);await p.close();
  }
  console.log('Home navigation measurements:',JSON.stringify(results));
 }finally{await browser.close();}
})().catch(e=>{console.error(e);process.exit(1)});
