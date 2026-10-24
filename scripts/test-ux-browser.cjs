const {chromium}=require(process.env.WORDYLAND_PLAYWRIGHT_MODULE||'playwright'),assert=require('assert/strict');
(async()=>{
 const browser=await chromium.launch({executablePath:process.env.WORDYLAND_CHROMIUM||'/usr/bin/chromium',args:['--no-sandbox','--use-angle=swiftshader','--enable-unsafe-swiftshader']});
 const p=await browser.newPage({viewport:{width:390,height:844},reducedMotion:'reduce'}),errors=[];p.on('pageerror',e=>errors.push(e.message));
 const base=process.env.WORDYLAND_TEST_URL;assert(['localhost','127.0.0.1'].includes(new URL(base).hostname));
 await p.goto(base);await p.locator('#todayQuest').click();await p.locator('#readyChallenge').waitFor();assert.equal(await p.locator('body').getAttribute('data-play'),'mission');assert.equal(await p.locator('.startHub').isVisible(),false);assert.equal(await p.locator('.questTabs').isVisible(),false);await p.locator('#pauseQuest').click();assert(await p.locator('.startHub').isVisible());assert(await p.locator('[data-resume-quest=guest]').isVisible());
 await p.goto(base+'/#preposizioni');await p.locator('[data-lesson=mousepositions]').click();await p.locator('#readyChallenge').click();
 const layouts=[];for(const width of [360,390,768,1360]){await p.setViewportSize({width,height:900});assert(await p.evaluate(()=>document.documentElement.scrollWidth<=innerWidth),'Overflow '+width);const grid=await p.locator('.questChoices').evaluate(e=>({height:e.getBoundingClientRect().height,columns:getComputedStyle(e).gridTemplateColumns.split(' ').length}));layouts.push({width,height:Math.round(grid.height)});assert.equal(grid.columns,2);if(width<500)assert(grid.height<700,'Compact illustrated choices '+grid.height);assert(await p.locator('.questChoices small').first().evaluate(e=>parseFloat(getComputedStyle(e).fontSize)>=20));}
 await p.setViewportSize({width:390,height:844});await p.locator('.questChoices').evaluate(e=>e.scrollIntoView({block:'end'}));const toolbar=await p.locator('.exerciseToolbar').boundingBox();assert(toolbar.y>=-1&&toolbar.y<100,'Audio stays reachable');await p.screenshot({path:'/tmp/wordyland-ui-esercizio.png'});
 await p.locator('#pauseQuest').click();assert.equal(await p.locator('body').getAttribute('data-play'),'');await p.locator('.startChoices a[href="#allenati"]').click();await p.locator('[data-lesson=counting]').waitFor();
 // Real browser error messages for hosting HTML and a lost network connection.
 await p.route('**/api.php?action=ux-html',route=>route.fulfill({status:202,contentType:'text/html',body:'<html>Hosting challenge</html>'}));
 const hosting=await p.evaluate(async()=>{try{await wordylandAccount.request('ux-html')}catch(e){return e.message}});assert.match(hosting,/verifica.*salvataggio/);
 await p.route('**/api.php?action=ux-lost',route=>route.abort('failed'));const lost=await p.evaluate(async()=>{try{await wordylandAccount.request('ux-lost')}catch(e){return e.message}});assert.match(lost,/già confermate.*salvate/);
 await p.route('**/api.php?action=ux-slow',async route=>{await new Promise(r=>setTimeout(r,300));await route.fulfill({contentType:'application/json',body:'{}'}).catch(()=>{});});
 const slow=await p.evaluate(async()=>{const original=window.setTimeout;window.setTimeout=(fn,ms,...args)=>original(fn,ms===20000?5:ms,...args);try{await wordylandAccount.request('ux-slow')}catch(e){return e.message}finally{window.setTimeout=original}});assert.match(slow,/connessione è lenta.*salvataggio/);

 await p.goto(base);await p.screenshot({path:'/tmp/wordyland-ui-home.png'});
 assert.deepEqual(errors,[]);console.log('Illustrated answer grid:',JSON.stringify(layouts));await browser.close();console.log('UX browser passed: suggested mission, focused play, pause/resume, readable two-column compact choices, sticky audio, responsive screens, navigation restoration and honest hosting/network messages.');
})().catch(e=>{console.error(e);process.exit(1)});
