const {chromium}=require(process.env.WORDYLAND_PLAYWRIGHT_MODULE||'playwright');
const assert=require('assert/strict'),{spawnSync}=require('child_process');
const base=process.env.WORDYLAND_TEST_URL||'http://127.0.0.1:8093';assert(['127.0.0.1','localhost'].includes(new URL(base).hostname));assert(process.env.WORDYLAND_BROWSER_DATA?.startsWith('/tmp/'));
(async()=>{
 const browser=await chromium.launch({executablePath:process.env.WORDYLAND_CHROMIUM||'/usr/bin/chromium',args:['--no-sandbox','--use-angle=swiftshader','--enable-unsafe-swiftshader']});
 const errors=[],contexts=[];
 async function page(width){const context=await browser.newContext({viewport:{width,height:900},reducedMotion:'reduce'});contexts.push(context);const p=await context.newPage();p.on('pageerror',e=>errors.push(e.message));await p.addInitScript(()=>{const interval=window.setInterval;window.setInterval=(fn,delay,...rest)=>interval(fn,delay===25000?500:delay,...rest);});await p.goto(base);await p.evaluate(()=>window.wordylandAccount.ready);return p;}
 const a=await page(1360),b=await page(390),c=await page(390),password='Presence-browser-password-123';
 async function register(p,name){return p.evaluate(async({name,password})=>{const a=window.wordylandAccount;await a.connect(await a.request('register',{username:name,password,adult:true}));return await a.createProfile(name);},{name,password});}
 const teacher=await register(a,'Docente'),outsider=await register(c,'Esterno');
 const club=await a.evaluate(async id=>await window.wordylandAccount.request('club-create',{profile:id,name:'La nostra classe',consent:true}),teacher.id);
 await b.goto(base+'/#classe='+club.code);await b.locator('#classNickname').fill('Stellina');await b.locator('#classPassword').fill(password);await b.locator('#classEntryForm [name=consent]').check();await b.getByRole('button',{name:'Iscrivimi e giochiamo →',exact:true}).click();await b.waitForFunction(()=>window.wordylandAccount.info().role==='learner');
 await b.goto(base+'/#iscritti');await b.locator('.rosterPerson').filter({hasText:'Docente'}).waitFor();assert.equal(await b.locator('.rosterPerson').filter({hasText:'Esterno'}).count(),0);
 await b.locator('[data-ready-toggle]').check();await b.locator('[data-own-presence]').getByText('Pronto a giocare',{exact:true}).waitFor();
 await a.goto(base+'/#sfide');await a.locator('.rivalCard').filter({hasText:'Stellina'}).locator('.presence-ready').waitFor();assert.equal(await a.locator('.rivalCard').filter({hasText:'Esterno'}).count(),0);
 await a.locator('#duelTopic').selectOption('colors');await a.locator('#duelActivity').selectOption('football');
 // A quiet status refresh must keep the chosen topic and game.
 await b.locator('[data-ready-toggle]').uncheck();await a.locator('.rivalCard .presence-online').waitFor();assert.equal(await a.locator('#duelTopic').inputValue(),'colors');assert.equal(await a.locator('#duelActivity').inputValue(),'football');await b.locator('[data-ready-toggle]').check();await a.locator('.rivalCard .presence-ready').waitFor();
 await b.goto(base+'/#sfide');await b.locator('#duelTopic').selectOption('colors');
 await a.locator('#duelInvite button').click();await b.getByRole('button',{name:'Accetta ⚡',exact:true}).waitFor();await b.getByRole('button',{name:'Accetta ⚡',exact:true}).click();await a.getByRole('button',{name:'Gioca →',exact:true}).waitFor();
 await b.getByRole('button',{name:'Gioca →',exact:true}).click();await b.locator('#duelStage .duelOptions').waitFor();
 await a.goto(base+'/#iscritti');await a.locator('.rosterPerson').filter({hasText:'Stellina'}).locator('.presence-busy').waitFor();
 await b.locator('#duelBack').click();await a.locator('.rosterPerson').filter({hasText:'Stellina'}).locator('.presence-ready').waitFor();
 // Simulate the browser's visibility transition and confirm heartbeat polling stops.
 let beats=0;b.on('request',r=>{if(r.url().includes('presence-heartbeat'))beats++;});
 await b.evaluate(()=>{Object.defineProperty(document,'visibilityState',{configurable:true,get:()=> 'hidden'});document.dispatchEvent(new Event('visibilitychange'));});
 await a.locator('.rosterPerson').filter({hasText:'Stellina'}).locator('.presence-offline').waitFor();const stopped=beats;await a.waitForTimeout(1100);assert.equal(beats,stopped);
 await b.evaluate(()=>{Object.defineProperty(document,'visibilityState',{configurable:true,get:()=> 'visible'});document.dispatchEvent(new Event('visibilitychange'));});await a.locator('.rosterPerson').filter({hasText:'Stellina'}).locator('.presence-online').waitFor();
 // Promote only the disposable teacher fixture; real roles remain server-provisioned.
 const promote=spawnSync('php',['-r',`$db=new PDO('sqlite:'.getenv('WORDYLAND_BROWSER_DATA').'/wordyland.sqlite');$q=$db->prepare('UPDATE accounts SET role="admin" WHERE id=(SELECT account_id FROM profiles WHERE id=?)');$q->execute([(int)$argv[1]]);`,String(teacher.id)],{encoding:'utf8',env:process.env});assert.equal(promote.status,0,promote.stderr);
 await a.evaluate(async()=>await window.wordylandAccount.connect(await window.wordylandAccount.request('session')));await a.goto(base+'/#iscritti');await a.locator('.rosterPerson').filter({hasText:'Esterno'}).waitFor();await a.locator('#rosterFilter').selectOption('today');await a.locator('.rosterPerson').filter({hasText:'Stellina'}).waitFor();await a.waitForFunction(()=>document.querySelectorAll('.rosterPerson').length===1);assert.equal(await a.locator('.rosterPerson').count(),1);
 await a.locator('#rosterFilter').selectOption('all');await a.locator('.rosterPerson').filter({hasText:'Docente'}).waitFor();
 await b.evaluate(async()=>await window.wordylandAccount.logout());await a.locator('.rosterPerson').filter({hasText:'Stellina'}).locator('.presence-offline').waitFor();
 await a.setViewportSize({width:360,height:844});assert(await a.evaluate(()=>document.documentElement.scrollWidth<=innerWidth));assert(await b.evaluate(()=>document.documentElement.scrollWidth<=innerWidth));if(process.env.WORDYLAND_BROWSER_SCREENSHOT)await a.screenshot({path:process.env.WORDYLAND_BROWSER_SCREENSHOT,fullPage:true});
 assert.deepEqual(errors,[]);await browser.close();console.log('Presence browser passed: class-only roster, live ready/online/busy, preserved invitation choices, automatic invite/accept updates, paused hidden-tab polling, logout cleanup, admin global/today roster and mobile.');
})().catch(e=>{console.error(e);process.exit(1)});
