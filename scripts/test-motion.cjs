// Optional browser regression check. Requires Playwright and an isolated local server.
const {chromium}=require(process.env.WORDYLAND_PLAYWRIGHT_MODULE||'playwright');
const assert=require('assert/strict');const crypto=require('crypto');
const hash=b=>crypto.createHash('sha256').update(b).digest('hex');
(async()=>{
 const browser=await chromium.launch({executablePath:process.env.WORDYLAND_CHROMIUM||undefined,args:['--no-sandbox','--use-angle=swiftshader','--enable-unsafe-swiftshader']});
 const base=process.env.WORDYLAND_TEST_URL||'http://127.0.0.1:8093';assert(['localhost','127.0.0.1'].includes(new URL(base).hostname),'Isolated local tests only');
 const p=await browser.newPage({viewport:{width:1280,height:900}}),errors=[];p.on('pageerror',e=>errors.push(e.message));
 // Retain the GPU framebuffer only in this test, so pixel checks cannot include DOM overlays or scroll rasterisation.
 await p.addInitScript(()=>{const original=HTMLCanvasElement.prototype.getContext;HTMLCanvasElement.prototype.getContext=function(type,options,...args){return original.call(this,type,['webgl','webgl2','experimental-webgl'].includes(type)?{...options,preserveDrawingBuffer:true}:options,...args);};});
 await p.goto(base);await p.locator('#islandMap').scrollIntoViewIfNeeded();await p.waitForFunction(()=>document.querySelector('#islandMap').dataset.render==='3d');
 const guestBefore=await p.evaluate(()=>localStorage.getItem('wordylandGuestWallet'));
 for(const kind of ['kart','football','space']){
  await p.locator('[data-live-place='+kind+']').click();assert.equal(await p.locator('#islandMap').getAttribute('data-kind'),kind);
  await p.locator('#heroSceneAction').click();await p.locator('#islandMap .sceneReaction').waitFor();
 }
 assert.equal(await p.evaluate(()=>localStorage.getItem('wordylandGuestWallet')),guestBefore,'Free scene actions must not grant rewards');
 await p.locator('[data-live-place=island]').click();assert.equal(await p.locator('.islandPin').count(),8);
 // Compare actual WebGL pixels independently of hover labels, fractional scrolling and late font swaps.
 await p.evaluate(()=>document.fonts.ready);await p.mouse.move(0,0);
 const snap=async()=>Buffer.from(await p.locator('#islandMap canvas').evaluate(canvas=>canvas.toDataURL().split(',')[1]),'base64');
 const renderedFrame=()=>p.evaluate(()=>new Promise(resolve=>requestAnimationFrame(()=>requestAnimationFrame(resolve))));
 const a=await snap();await p.waitForTimeout(400);const b=await snap();assert.notEqual(hash(a),hash(b),'World should move without hovering');
 await p.locator('#islandMotion').click();await renderedFrame();const paused=await snap();await p.waitForTimeout(300);assert.equal(hash(paused),hash(await snap()),'Pause should freeze world');
 // Pausing the world still allows labels to respond to the pointer.
 await p.locator('.islandPin').first().hover();assert.equal(await p.locator('.islandPin').first().evaluate(node=>getComputedStyle(node).animationName),'none');assert.equal(hash(paused),hash(await snap()),'Hover labels must not restart the paused world');await p.mouse.move(0,0);
 await p.locator('#islandMotion').click();await p.locator('[data-destination=football]').click();await p.locator('#playPlace').click();await p.locator('#readyChallenge').waitFor();assert(await p.locator('.missionGrid').evaluate(e=>e.hidden),'Active mission must be in front');
 const canvas=await p.locator('#missionWorld canvas').elementHandle();const translation=(await p.locator('.questPicture + p').textContent()).trim();
 await p.locator('#readyChallenge').click();assert(await canvas.evaluate(e=>e.isConnected),'Ready must preserve the scene');
 const choices=p.locator('[data-answer]');for(let i=0;i<await choices.count();i++)if((await choices.nth(i).locator('small').textContent()).trim()===translation){await choices.nth(i).click();break;}
 await p.locator('#missionWorld .sceneReaction').getByText('GOOOL! ⚽',{exact:true}).waitFor({state:'attached'});await p.locator('#questFeedback .feedbackSuccess').waitFor();assert.equal(await p.locator('#missionWorld').isVisible(),false,'The learning task keeps decorative scenery hidden');assert(await canvas.evaluate(e=>e.isConnected));
 await p.locator('#questNext').click();assert(await canvas.evaluate(e=>e.isConnected),'Next question must preserve the scene');assert(await p.locator('.sceneReaction').count()<=1);
 await p.locator('#pauseQuest').click();await p.locator('[data-tab=adventures]').waitFor();assert(!(await canvas.evaluate(e=>e.isConnected)),'Leaving must dispose the previous scene');
 await p.emulateMedia({reducedMotion:'reduce'});await p.locator('#islandMap').scrollIntoViewIfNeeded();await p.waitForTimeout(200);const still=await snap();await p.waitForTimeout(350);assert.equal(hash(still),hash(await snap()),'Reduced motion must freeze ambient animation');
 await p.locator('[data-destination=pets]').click();await p.locator('[data-care=water]').click();await p.locator('#petCareStatus').waitFor();assert.equal(await p.locator('.sceneReaction').count(),1,'Static feedback remains available');
 await p.setViewportSize({width:360,height:800});assert(await p.evaluate(()=>document.documentElement.scrollWidth<=innerWidth));assert.deepEqual(errors,[]);
 await browser.close();console.log('Motion checks passed: visible ambient motion, global pause, reduced motion, goal reaction, focused mission, one WebGL canvas through ready/next, cleanup on leave, accessible feedback and mobile.');
})().catch(e=>{console.error(e);process.exit(1)});
