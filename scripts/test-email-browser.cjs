const {chromium}=require(process.env.WORDYLAND_PLAYWRIGHT_MODULE||'playwright'),assert=require('assert/strict'),fs=require('fs');
const base=process.env.WORDYLAND_TEST_URL;assert(['localhost','127.0.0.1'].includes(new URL(base).hostname));
(async()=>{
 const browser=await chromium.launch({executablePath:process.env.WORDYLAND_CHROMIUM||'/usr/bin/chromium',args:['--no-sandbox','--use-angle=swiftshader','--enable-unsafe-swiftshader']});
 try{
  const context=await browser.newContext({viewport:{width:390,height:844},reducedMotion:'reduce'}),p=await context.newPage(),errors=[];
  p.on('pageerror',e=>errors.push(e.message));
  await p.goto(base);await p.locator('#headerLogin').click();
  await p.locator('#accountUser').fill('mail-browser@example.test');await p.locator('#accountPassword').fill('Mail-browser-old-123');await p.locator('#adultConfirm').check();await p.getByRole('button',{name:'Crea account adulto',exact:true}).click();await p.locator('#headerLogout').waitFor();
  await p.locator('#headerLogout').click();await p.locator('#headerRecovery').click();await p.locator('#emailRecoveryRequest').waitFor();
  await p.locator('#emailRecoveryRequest [name=email]').fill('mail-browser@example.test');await p.getByRole('button',{name:'Richiedi il link',exact:true}).click();await p.locator('#emailRecoveryRequest [role=status]').getByText(/Se l’indirizzo/).waitFor();
  const directory=process.env.WORDYLAND_BROWSER_DATA+'/mail-test-outbox';const files=fs.readdirSync(directory);assert.equal(files.length,1);
  const message=JSON.parse(fs.readFileSync(directory+'/'+files[0],'utf8'));assert.equal(message.to,'mail-browser@example.test');
  const token=message.url.split('=')[1];
  await p.goto(base+'/#password-reset='+token);await p.locator('#emailResetConfirm').waitFor();assert(!p.url().includes(token),'Token removed from URL');
  assert(!(await p.evaluate(()=>JSON.stringify(localStorage))).includes(token),'Token never stored in localStorage');
  for(const width of [320,390,1360]){await p.setViewportSize({width,height:844});assert(await p.evaluate(()=>document.documentElement.scrollWidth<=innerWidth),'Reset layout overflow '+width);}
  await p.locator('#emailResetConfirm [name=password]').fill('Mail-browser-new-123');await p.locator('#emailResetConfirm [name=confirmPassword]').fill('Mail-browser-mismatch-123');await p.getByRole('button',{name:'Salva la nuova password',exact:true}).click();await p.locator('#accountStatus').getByText('Le due nuove password non coincidono.',{exact:true}).waitFor();
  await p.locator('#emailResetConfirm [name=confirmPassword]').fill('Mail-browser-new-123');await p.getByRole('button',{name:'Salva la nuova password',exact:true}).click();await p.locator('#accountStatus').getByText(/Password aggiornata. Accedi con la nuova password./).waitFor();
  await p.locator('#accountUser').fill('mail-browser@example.test');await p.locator('#accountPassword').fill('Mail-browser-new-123');await p.locator('#accountForm button[value=login]').click();await p.locator('#headerLogout').waitFor();
  // An already connected account must explicitly save/logout before opening the reset form.
  await p.goto(base+'/#password-reset='+token);await p.locator('#accountStatus').getByText(/esci prima dall’account/).waitFor();assert.equal(await p.locator('#emailResetConfirm').count(),0);
  await p.locator('#headerLogout').click();await p.locator('#emailResetConfirm').waitFor();
  await p.locator('#emailResetConfirm [name=password]').fill('Mail-browser-new-123');await p.locator('#emailResetConfirm [name=confirmPassword]').fill('Mail-browser-new-123');await p.getByRole('button',{name:'Salva la nuova password',exact:true}).click();await p.locator('#accountStatus').getByText('Link non valido o scaduto. Richiedine uno nuovo.',{exact:true}).waitFor();
  assert.deepEqual(errors,[]);
  console.log('Email recovery browser passed: request, synthetic link, URL cleanup, no token persistence, mismatch, reset/login, explicit logout, used-link rejection and 320/390/1360px. No real email sent.');
 }finally{await browser.close();}
})().catch(e=>{console.error(e);process.exit(1)});
