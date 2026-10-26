// Run only against an isolated local PHP server serving a disposable copy of dist.
const {chromium}=require(process.env.WORDYLAND_PLAYWRIGHT_MODULE||'playwright');
const assert=require('assert/strict'),fs=require('fs'),path=require('path');
const base=process.env.WORDYLAND_TEST_URL||'http://127.0.0.1:8093',root=process.env.WORDYLAND_BROWSER_ROOT;
assert(['127.0.0.1','localhost'].includes(new URL(base).hostname));assert(root?.startsWith('/tmp/'),'Disposable /tmp public root required');
(async()=>{
 const profile=fs.mkdtempSync('/tmp/wordyland-pwa-profile-');
 const context=await chromium.launchPersistentContext(profile,{executablePath:process.env.WORDYLAND_CHROMIUM||'/usr/bin/chromium',args:['--no-sandbox','--use-angle=swiftshader','--enable-unsafe-swiftshader'],viewport:{width:390,height:844},reducedMotion:'reduce'}),p=await context.newPage(),errors=[];
 await p.addInitScript(()=>window.addEventListener('beforeinstallprompt',e=>{if(e.isTrusted){e.preventDefault();e.stopImmediatePropagation();}},true));p.on('pageerror',e=>errors.push(e.message));
 await p.goto(base);await p.locator('#offlineReady').waitFor();await p.evaluate(()=>navigator.serviceWorker.ready);await p.waitForFunction(()=>!!navigator.serviceWorker.controller);
 const cdp=await context.newCDPSession(p);const manifest=await cdp.send('Page.getAppManifest');assert.equal(manifest.errors.length,0,JSON.stringify(manifest.errors));const data=JSON.parse(manifest.data);assert.equal(data.display,'standalone');assert.equal(data.icons.length,3);
 const installability=await cdp.send('Page.getInstallabilityErrors');console.log('Browser installability:',JSON.stringify(installability.installabilityErrors));assert.deepEqual(installability.installabilityErrors,[]);
 await p.locator('.startChoices a[href="#allenati"]').click();await p.locator('[data-lesson=mousepositions]').waitFor();await p.locator('[data-lesson=counting]').click();await p.locator('#readyChallenge').waitFor();
 await p.locator('#pauseQuest').click();
 // Reusing the same start link must return to the lessons without a hash change.
 await p.locator('.startChoices a[href="#allenati"]').click();await p.locator('[data-lesson=counting]').waitFor();await p.locator('.startChoices a[href="#personaggi"]').click();await p.locator('[data-item=fox]').waitFor();
 await p.locator('.startChoices a[href="#sfide"]').click();await p.getByRole('heading',{name:/compagno|classe|arena|sfide/i}).first().waitFor();
 await p.locator('#installApp').click();await p.locator('#installHelp').waitFor();await p.locator('#installHelp').getByText(/Su iPhone o iPad/).waitFor();
 // Exercise the deferred install prompt without pretending to install the browser app.
 await p.evaluate(()=>{const e=new Event('beforeinstallprompt');e.prompt=async()=>{window.installPromptUsed=true;};e.userChoice=Promise.resolve({outcome:'dismissed'});window.dispatchEvent(e);});await p.locator('#installApp').getByText('Installa WordyLand').waitFor();await p.locator('#installApp').click();assert(await p.evaluate(()=>window.installPromptUsed));
 // Authentication must not add session bodies or usernames to any SW cache.
 await p.evaluate(async()=>{const a=window.wordylandAccount;await a.ready;await a.connect(await a.request('register',{username:'pwa_private_test',password:'Pwa-browser-test-123',adult:true}));});
 const urls=await p.evaluate(async()=>{const result=[];for(const name of await caches.keys())for(const request of await(await caches.open(name)).keys())result.push(request.url);return result;});assert.equal(urls.length,9);assert(urls.every(url=>!url.includes('api.php')&&!url.includes('pwa_private_test')));
 // Cold navigation offline must open the anonymous revision page, not the logged-in app.
 await context.setOffline(true);await p.locator('#connectionNotice').waitFor();const beforeOffline=p.url();await p.locator('.startChoices a[href="#sfide"]').click({force:true});assert.equal(p.url(),beforeOffline);await p.goto(base+'/index.html#admin');await p.locator('#offlineTopic').waitFor();assert.equal(await p.locator('.accountArea').count(),0);assert(!(await p.locator('body').textContent()).includes('pwa_private_test'));
 const curriculum=JSON.parse(fs.readFileSync(path.join(root,'curriculum.json'),'utf8'));
 for(const topic of ['focus','counting','mousepositions','animals','colors']){
  await p.locator('#offlineTopic').selectOption(topic);await p.locator('.offlineOptions button').first().waitFor();
  const translation=(await p.locator('.offlinePrompt').textContent()).trim(),word=curriculum[topic].find(w=>w[1]===translation)[0];
  const wrong=p.locator('.offlineOptions button').filter({hasNotText:word}).first();if(await wrong.count()){await wrong.click();await p.locator('#offlineFeedback').getByText(/Un altro tentativo/).waitFor();}
  await p.getByRole('button',{name:word,exact:true}).click();await p.locator('#offlineFeedback').getByText(/Esatto/).waitFor();await p.locator('#offlineNext').click();assert.notEqual(await p.locator('.offlinePrompt').textContent(),translation);
 }
 for(const width of [390,360]){await p.setViewportSize({width,height:844});assert(await p.evaluate(()=>document.documentElement.scrollWidth<=innerWidth));}
 await context.setOffline(false);await p.goto(base);await p.locator('#offlineReady').waitFor();await p.waitForFunction(()=>!!navigator.serviceWorker.controller);
 // Replace only the disposable worker to exercise a real update and cache cleanup.
 await p.evaluate(async()=>{await caches.open('another-app-cache');});
 const filename=path.join(root,'sw.js'),original=fs.readFileSync(filename,'utf8');fs.writeFileSync(filename,original.replace(/wordyland-offline-[a-f0-9]+/,'wordyland-offline-browser-update'));
 await p.evaluate(async()=>{const reg=await navigator.serviceWorker.getRegistration();await reg.update();});await p.locator('#appUpdate').waitFor();assert(await p.evaluate(async()=>!!(await navigator.serviceWorker.getRegistration()).waiting));
 // Hold the progress flush: the current document is already DOMContentLoaded,
 // so waitForLoadState alone cannot prove that an update actually reloaded it.
 await p.evaluate(()=>{window.beforePwaUpdate=true;const flush=wordylandAccount.flush;wordylandAccount.flush=async()=>{await new Promise(resolve=>window.releasePwaUpdateFlush=resolve);return flush();};});
 const nextDocument=p.waitForEvent('domcontentloaded');
 await p.locator('#updateApp').click();
 await p.waitForLoadState('domcontentloaded');
 assert(await p.evaluate(()=>window.beforePwaUpdate===true),'An already-ready load state still refers to the old document while progress is saving');
 assert(await p.evaluate(async()=>!!(await navigator.serviceWorker.getRegistration()).waiting),'The waiting worker must not activate before progress flush completes');
 await p.evaluate(()=>window.releasePwaUpdateFlush());
 await nextDocument;
 assert.equal(await p.evaluate(()=>window.beforePwaUpdate),undefined,'Wait for the new document, not the old document load state');
 await p.evaluate(()=>wordylandAccount.ready);
 await p.waitForFunction(async()=>{const reg=await navigator.serviceWorker.getRegistration();return reg?.active?.state==='activated'&&!(await caches.keys()).some(name=>name.startsWith('wordyland-offline-')&&name!=='wordyland-offline-browser-update');});
 assert(await p.evaluate(async()=>(await caches.keys()).includes('another-app-cache')));fs.writeFileSync(filename,original);
 await p.locator('.startHub').scrollIntoViewIfNeeded();if(process.env.WORDYLAND_BROWSER_SCREENSHOT)await p.screenshot({path:process.env.WORDYLAND_BROWSER_SCREENSHOT,fullPage:false});
 assert.deepEqual(errors,[]);await context.close();fs.rmSync(profile,{recursive:true,force:true});console.log('PWA browser passed: installable manifest/icons, three shortcuts, repeat navigation, install guidance/prompt, authenticated cache isolation, cold offline launch, five revision topics, retry/next, mobile, real waiting update and unrelated-cache preservation.');
})().catch(e=>{console.error(e);process.exit(1)});
