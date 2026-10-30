// Adult-owned profiles. Guest play remains available without an account.
(() => {
  const area = document.createElement('details');
  area.className = 'accountArea';
  area.innerHTML = '<summary>Area adulti · account e progressi</summary><div class="settings"><div id="accountContent"></div><p id="accountStatus" role="status" aria-live="polite">Connessione al salvataggio online…</p></div>';
  document.querySelector('main').prepend(area);
  const panel = area.querySelector('#accountContent'), status = area.querySelector('#accountStatus');
  let session = null, active = null, revision = 0, pending = false, timer, busy = null, applying = false, locked = false;
  let initializing=true, resetToken=null, profileChanging=false, profileChoice=0, profileOperation=0, profileLockSession=null, pendingWrites=0, authOperation=null, logoutFlight=null, accessExpired=false, uncertainProfile=null;
  function captureResetLink(){
    const match=location.hash.match(/^#password-reset=([a-f0-9]{64})$/);
    if(match){resetToken=match[1];history.replaceState(null,'','#recupera-password');return true;}
    return false;
  }
  captureResetLink();
  async function openEmailReset(){
    await window.wordylandAccount.ready;
    if(!resetToken)return;
    window.wordylandUI?.play();area.open=true;area.dataset.exposed='true';
    if(session?.username){
      say('Per usare il link di recupero, esci prima dall’account con Esci / Logout. I progressi saranno salvati.');
      return;
    }
    panel.innerHTML='<h3>Scegli una nuova password</h3><p>Il link vale 15 minuti e si può usare una sola volta.</p><form id="emailResetConfirm"><label>Nuova password<input name="password" type="password" autocomplete="new-password" minlength="12" maxlength="72" required></label><label>Ripeti la nuova password<input name="confirmPassword" type="password" autocomplete="new-password" minlength="12" maxlength="72" required></label><button class="primary">Salva la nuova password</button></form>';
    panel.querySelector('form').onsubmit=async event=>{
      event.preventDefault();const form=event.currentTarget,button=event.submitter,data=Object.fromEntries(new FormData(form)),ownerSession=session,token=resetToken;
      if(data.password!==data.confirmPassword){formSay(form,'Le due nuove password non coincidono.',form.elements.confirmPassword);return;}
      button.disabled=true;
      try{await request('email-recovery-confirm',{...data,token});if(session!==ownerSession||!form.isConnected)return;if(resetToken===token)resetToken=null;form.reset();show();say('Password aggiornata. Accedi con la nuova password. Gli altri dispositivi sono stati scollegati.');}
      catch(error){if(session===ownerSession&&form.isConnected)formSay(form,error.message);}finally{if(button.isConnected)button.disabled=false;}
    };
    area.scrollIntoView({block:'start'});panel.querySelector('input').focus({preventScroll:true});
  }
  const tools=document.createElement('nav');tools.className='accountToolbar';tools.setAttribute('aria-label','Accesso, uscita e password');document.querySelector('header').after(tools);
  const guestKey = 'wordylandGuestBackup', activeKey = 'wordylandActiveProfile';
  function updateAccessTools(){
    const authenticated=Boolean(session?.username);tools.dataset.mode=authenticated?'connected':'guest';
    tools.innerHTML='<span class="accountSessionLabel">'+esc(authenticated?(session.role==='learner'?'Profilo di classe: '+(active?.nickname||session.profiles[0]?.nickname||'Alunno'):'Accesso: '+session.username):session?'Modalità ospite':initializing?'Verifica accesso…':'Accesso da verificare')+'</span>'+(authenticated?'<button type="button" class="audio" id="headerPassword">Cambia password</button><button type="button" class="primary" id="headerLogout">Esci / Logout</button>':'<button type="button" class="primary" id="headerLogin">Accedi</button><button type="button" class="audio" id="headerRecovery">Password dimenticata?</button>')+'<span id="accessStatus" role="status"></span>';
    tools.querySelector('#headerLogin')?.addEventListener('click',()=>openAccess('login'));
    tools.querySelector('#headerRecovery')?.addEventListener('click',()=>openAccess('recover'));
    tools.querySelector('#headerPassword')?.addEventListener('click',()=>openAccess('password'));
    tools.querySelector('#headerLogout')?.addEventListener('click',async event=>{const button=event.currentTarget;button.disabled=true;try{await logout();tools.querySelector('#accessStatus').textContent='Sei uscito dall’account.';}catch(error){if(button.isConnected)button.disabled=false;tools.querySelector('#accessStatus').textContent='Uscita non confermata. '+error.message;}});
    if(initializing&&!session)tools.querySelectorAll('button').forEach(button=>button.disabled=true);
  }
  async function openAccess(view='login'){
    try{
      await window.wordylandAccount.ready;
      if(!session?.csrf){session=await request('session');show();}
      if(!session.username&&window.wordylandClassroom?.openAccess(view))return;
      window.wordylandUI?.play();
      if(document.body.classList.contains('classEntry'))location.hash=view==='recover'?'#recupera-password':'#account';
      area.open=true;area.dataset.exposed='true';
      const section=panel.querySelector(view==='recover'&&!session.username?'#accountRecovery':view==='password'||view==='recover'&&session.username?'#passwordSettings':'#accountForm');
      if(section?.matches('details'))section.open=true;
      if(view==='recover'&&session.username){say('Per cambiare la password usa la password attuale nel modulo qui sotto.');panel.querySelector('#passwordSettings').open=true;}
      requestAnimationFrame(()=>{area.scrollIntoView({block:'start'});(section?.querySelector('input')||panel.querySelector('input'))?.focus({preventScroll:true});});
    }catch(error){tools.querySelector('#accessStatus').textContent=error.message;}
  }
  function passwordSettings(){return '<details id="passwordSettings" class="accountSecurity"><summary>Cambia password</summary><form id="changePasswordForm"><label>Password attuale<input name="password" type="password" autocomplete="current-password" required></label><label>Nuova password · almeno 12 caratteri<input name="newPassword" type="password" autocomplete="new-password" minlength="12" maxlength="72" required></label><label>Ripeti la nuova password<input name="confirmPassword" type="password" autocomplete="new-password" minlength="12" maxlength="72" required></label><button class="primary">Salva la nuova password</button><p>Resterai collegato qui. Gli altri dispositivi dovranno accedere di nuovo.</p><p id="passwordChangeStatus" role="status" aria-live="polite"></p></form></details>';}
  function bindPasswordSettings(){
    const form=panel.querySelector('#changePasswordForm');if(!form)return;
    // Sync messages use accountStatus; the security result remains in its own form.
    const feedback=form.querySelector('#passwordChangeStatus');
    const passwordSay=text=>{feedback.textContent=text;say(text);};
    form.onsubmit=async event=>{
      event.preventDefault();const data=Object.fromEntries(new FormData(form)),ownerSession=session;
      if(data.newPassword!==data.confirmPassword){passwordSay('Le due nuove password non coincidono.');const confirmation=form.elements.confirmPassword;confirmation.setAttribute('aria-invalid','true');confirmation.setAttribute('aria-describedby','passwordChangeStatus');confirmation.focus();return;}
      const button=event.submitter;button.disabled=true;passwordSay('Verifica della modifica in corso…');
      try{await flush();if(session!==ownerSession||!form.isConnected)return;await request('change-password',data);if(session!==ownerSession||!form.isConnected)return;form.reset();passwordSay('Password aggiornata. Gli altri dispositivi dovranno accedere di nuovo.');signalProfile();}
      catch(error){if(session===ownerSession&&form.isConnected)passwordSay(error.message);}finally{if(button.isConnected)button.disabled=false;}
    };
  }
  function learnerRecoverySettings(){return '<details class="accountSecurity"><summary>Conserva il tuo accesso</summary><p>Hai perso il codice di recupero ma ricordi la password? Con l\'aiuto di un adulto puoi generarne uno nuovo e conservarlo in un luogo sicuro. Il precedente non sarà più valido.</p><form id="learnerRecoveryForm"><label>Password attuale<input name="password" type="password" autocomplete="current-password" required></label><button class="audio">Genera un nuovo codice di recupero</button></form></details>';}
  function bindLearnerRecovery(){
    const form=panel.querySelector('#learnerRecoveryForm');if(!form)return;
    form.onsubmit=async event=>{
      event.preventDefault();if(profileChanging)return;
      const ownerSession=session,operation=setProfileBusy(true),data=Object.fromEntries(new FormData(form));
      form.setAttribute('aria-busy','true');formSay(form,'Generazione del codice in corso.',null,false);
      try{
        await flush();if(session!==ownerSession||operation!==profileOperation)return;
        const result=await request('new-recovery',data);if(session!==ownerSession||operation!==profileOperation)return;
        form.reset();formSay(form,'Nuovo codice generato. Conservalo: il precedente non è più valido.',null,false);recoveryNotice(result.recovery);
      }catch(error){if(session===ownerSession&&operation===profileOperation)formSay(form,error.message);}
      finally{setProfileBusy(false,operation);if(form.isConnected)form.setAttribute('aria-busy','false');}
    };
  }
  function recoveryNotice(code,owner=session?.username) {
    window.dispatchEvent(new Event('wordyland-recovery-replaced'));
    let notice = area.querySelector('#recoveryNotice');
    if (!notice) { notice = document.createElement('div'); notice.id = 'recoveryNotice'; notice.className = 'recoveryNotice'; area.querySelector('.settings').prepend(notice); }
    notice.dataset.owner=String(owner||'').trim().toLowerCase();notice.setAttribute('role','region');notice.setAttribute('aria-label','Conserva il codice di recupero');notice.tabIndex=-1;
    notice.innerHTML = '<b>Conserva il codice di recupero in un luogo sicuro.</b><p>Ti servirà se dimentichi la password. Questo codice viene mostrato solo ora.</p><code></code><br><button class="audio">L’ho conservato: nascondi</button>';
    notice.querySelector('code').textContent = code.match(/.{1,4}/g).join('-');
    notice.querySelector('button').onclick = () => {notice.remove();(panel.querySelector('#learnerRecoveryForm button')||panel.querySelector('[data-profile][aria-pressed="true"]')||panel.querySelector('[data-profile]')||panel.querySelector('#profileNickname')||panel.querySelector('#accountUser'))?.focus({preventScroll:true});};
    requestAnimationFrame(()=>{if(notice.isConnected){notice.focus({preventScroll:true});notice.scrollIntoView({block:'nearest',behavior:'auto'});}});
  }
  function signalProfile() { window.dispatchEvent(new CustomEvent('wordyland-profile', {detail:{id:active?.id || null, nickname:active?.nickname || '', username:session?.username || null, role:session?.role || null}})); }
  const read = key => { try { return JSON.parse(localStorage.getItem(key) || 'null'); } catch { return null; } };
  const write = (key, value) => { try { localStorage.setItem(key, JSON.stringify(value)); } catch {} };
  const snapshot = () => ({stats, custom, stars, world: worldId, avatar});
  const oldSave = save, oldRemember = rememberPlayer;
  save = function () { oldSave(); schedule(); };
  rememberPlayer = function () { oldRemember(); schedule(); };
  function say(text) { status.textContent = text; }
  // Form results stay next to the action even when autosave updates accountStatus.
  function formSay(form,text,field=null,focus=true){
    let feedback=form.querySelector('[data-form-feedback]');
    if(!feedback){feedback=document.createElement('p');feedback.id=form.id+'Feedback';feedback.className='formFeedback';feedback.dataset.formFeedback='';feedback.setAttribute('role','status');feedback.setAttribute('aria-live','polite');feedback.setAttribute('aria-atomic','true');feedback.tabIndex=-1;form.append(feedback);}
    feedback.textContent=text;say(text);
    if(field){field.setAttribute('aria-invalid','true');const described=field.getAttribute('aria-describedby')||'';if(!described.split(/\s+/).includes(feedback.id))field.setAttribute('aria-describedby',(described+' '+feedback.id).trim());}
    if(focus){(field||feedback).focus({preventScroll:true});feedback.scrollIntoView({block:'nearest',behavior:'auto'});}
  }
  panel.addEventListener('input',event=>event.target.removeAttribute('aria-invalid'));
  panel.addEventListener('change',event=>event.target.removeAttribute('aria-invalid'));
  function reflectProfileBusy(){
    panel.querySelector('.profileList')?.setAttribute('aria-busy',String(profileChanging));
    panel.querySelectorAll('[data-profile],#newProfile button,#renameProfile button,#removeProfile button,#securityAccount button,#learnerRecoveryForm button').forEach(button=>button.disabled=profileChanging);
    if(uncertainProfile?.ownerSession===session)panel.querySelectorAll('#newProfile button:not([data-profile-verify])').forEach(button=>button.disabled=true);
  }
  function showProfileVerification(form){
    formSay(form,'Creazione non confermata. Verifica l’elenco dei tuoi profili prima di inviare di nuovo.');
    let button=form.querySelector('[data-profile-verify]');
    if(!button){button=document.createElement('button');button.type='button';button.className='audio';button.dataset.profileVerify='';button.textContent='Verifica i miei profili';form.append(button);}
    button.onclick=async()=>{
      if(profileChanging)return;
      const ownerSession=session,uncertain=uncertainProfile,operation=setProfileBusy(true);form.setAttribute('aria-busy','true');formSay(form,'Verifica dei profili in corso.',null,false);
      try{
        const fresh=await request('session');if(session!==ownerSession||uncertainProfile!==uncertain)return;
        if(fresh.username!==ownerSession.username)throw new Error('L’accesso non coincide con l’account da verificare. L’elenco non è stato sostituito: riconferma l’accesso e verifica prima di creare altri profili.');
        session.profiles=fresh.profiles;uncertainProfile=null;show();formSay(panel.querySelector('#newProfile'),'Elenco dei profili aggiornato. Controlla se il profilo è già presente prima di crearne un altro.');
      }catch(error){if(session===ownerSession&&form.isConnected)formSay(form,'Profili non ancora verificati. '+error.message);}
      finally{setProfileBusy(false,operation);if(form.isConnected)form.setAttribute('aria-busy','false');}
    };
    reflectProfileBusy();
  }
  function setProfileBusy(value,operation=null){
    if(operation!==null&&operation!==profileOperation)return;
    if(value||operation===null)profileOperation++;
    profileLockSession=value?session:null;
    profileChanging=value;reflectProfileBusy();
    return profileOperation;
  }
  async function request(action, body, options = {}) {
    const requestSession=session;
    const authMutation=body!==undefined&&['login','register','logout','recover','class-login','class-register','class-recover','change-password','new-recovery','email-recovery-confirm','delete-account'].includes(action);
    if(authMutation&&(authOperation||(logoutFlight&&action!=='logout'))){const error=new Error('Una modifica dell’accesso è già in corso. Attendi la conferma prima di continuare.');error.code=409;throw error;}
    const authOwner=authMutation?{}:null;if(authOwner)authOperation=authOwner;
    if(body!==undefined)pendingWrites++;
    const accessAction=['session','login','register','logout','recover','auth-capabilities','email-recovery-request','email-recovery-confirm','change-password','new-recovery','delete-account','delete-profile','rename-profile','class-login','class-register','class-recover'].includes(action);
    const controller=new AbortController(),timeout=setTimeout(()=>controller.abort(),20000);
    try{
      const response = await fetch('api.php?action=' + action, {
        method: body === undefined ? 'GET' : 'POST', credentials: 'same-origin', cache: 'no-store', keepalive: options.keepalive === true,signal:controller.signal,
        headers: body === undefined ? {} : {'Content-Type':'application/json', 'X-CSRF-Token': session?.csrf || ''},
        body: body === undefined ? undefined : JSON.stringify(body)
      });
      if(!response.headers.get('content-type')?.includes('application/json'))throw new Error(accessAction?'Il sito richiede una verifica. Riapri WordyLand nel browser e poi verifica l’accesso.':'Il collegamento al sito richiede una verifica. Riapri WordyLand nel browser; poi riprendi la partita dal salvataggio.');
      let result;
      try { result = await response.json(); } catch { throw new Error(accessAction?'L’operazione di accesso non è stata confermata. Verifica la connessione prima di riprovare.':'Il sito non ha confermato la risposta. Torna online e riprendi dal salvataggio.'); }
      if (!response.ok) {
        const e = new Error(result.error || 'Operazione non riuscita.');e.code=response.status;
        if(session===requestSession&&session?.username&&active&&[401,403].includes(response.status)&&['Accedi con il tuo profilo.','Ricarica la pagina e riprova.'].includes(result.error)){accessExpired=true;queueMicrotask(showReauthentication);}
        throw e;
      }
      if (result.csrf && session && session===requestSession) session.csrf = result.csrf;
      return result;
    }catch(error){
      if(error.name==='AbortError')throw new Error(accessAction?'La connessione è lenta. Verifica l’accesso prima di riprovare.':'La connessione è lenta. Verifica la partita con Riprendi dal salvataggio prima di inviare di nuovo.');
      if(error instanceof TypeError)throw new Error(accessAction?'Connessione interrotta. L’operazione di accesso non è confermata.':'Connessione interrotta. Le risposte già confermate sono salvate: torna online e riprendi la partita.');
      throw error;
    }finally{clearTimeout(timeout);if(body!==undefined)pendingWrites--;if(authOwner&&authOperation===authOwner)authOperation=null;}
  }
  function schedule() {
    if (!active || applying || locked) return;
    pending = true; clearTimeout(timer);
    if(accessExpired){say('Progressi conservati su questo dispositivo. Conferma il tuo accesso per sincronizzarli.');return;}
    say('Progressi salvati sul dispositivo. Sincronizzazione in corso…');
    timer = setTimeout(() => flush().catch(() => {}), 900);
  }
  async function flush() {
    clearTimeout(timer);
    if(accessExpired)throw new Error('La sessione è scaduta. Conferma il tuo accesso nel modulo dedicato: i progressi su questo dispositivo sono conservati.');
    if (busy) { await busy; if (pending) return flush(); return; }
    if (!pending || !active || locked) return;
    pending = false;
    const payload = {id:active.id, revision, state:snapshot()};
    busy = request('save', payload).then(result => {
      revision = result.revision;
      say('✓ Progressi sincronizzati per ' + active.nickname + '.');
    }).catch(e => {
      pending = true;
      if(e.code===401||e.code===403){accessExpired=true;showReauthentication();}
      if (e.code === 409) { locked = true; show(); }
      say(e.message + ' La copia su questo dispositivo è conservata.');
      throw e;
    }).finally(() => { busy = null; });
    await busy;
    if (pending) return flush();
  }
  function showReauthentication(){
    if(!active||!session?.username||area.querySelector('#sessionReconnect'))return;
    const box=document.createElement('section');box.id='sessionReconnect';box.className='accountSecurity';box.setAttribute('aria-label','Conferma il tuo accesso');
    box.innerHTML='<h3>Conferma il tuo accesso</h3><p>L’accesso online deve essere riconfermato. La partita e i progressi su questo dispositivo sono conservati. Per salvarli online, inserisci la password dello stesso '+(session.role==='learner'?'profilo <b>'+esc(active.nickname)+'</b>':'account <b>'+esc(session.username)+'</b>')+'.</p><form id="reconfirmAccess"><label>Password attuale<input name="password" type="password" autocomplete="current-password" required></label><button class="primary">Conferma accesso e salva i progressi</button></form><p>Lascia aperta questa pagina fino alla conferma del salvataggio. Nessun progresso viene copiato in un altro account.</p>';
    area.querySelector('.settings').prepend(box);area.open=true;area.dataset.exposed='true';
    const form=box.querySelector('form');
    form.onsubmit=async event=>{
      event.preventDefault();if(profileChanging)return;
      const ownerSession=session,target=active,operation=setProfileBusy(true),button=event.submitter,password=new FormData(form).get('password');
      button.disabled=true;form.setAttribute('aria-busy','true');formSay(form,'Verifica dell’accesso in corso.',null,false);
      let confirmedSession=null;
      const resume=async fresh=>{
        if(session!==ownerSession||active!==target)return;
        if(fresh.username!==ownerSession.username||!fresh.profiles.some(profile=>profile.id===target.id))throw new Error('Questo accesso non contiene il profilo da salvare. La copia su questo dispositivo resta conservata.');
        session=fresh;confirmedSession=fresh;accessExpired=false;box.remove();updateAccessTools();
        await flush();say('Accesso confermato. Progressi sincronizzati per '+target.nickname+'.');status.tabIndex=-1;status.focus({preventScroll:true});
      };
      try{
        const current=await request('session');if(session!==ownerSession||active!==target)return;
        if(current.username&&current.username!==ownerSession.username){const error=new Error('In questo browser è aperto un altro account. La copia resta conservata: conferma prima l’accesso all’account indicato, senza chiudere questa pagina.');error.code=409;throw error;}
        await resume(await request('login',{username:ownerSession.username,password}));
      }
      catch(error){
        if(confirmedSession){if(session===confirmedSession)say(error.message+' La copia su questo dispositivo è conservata.');return;}
        if(session!==ownerSession||active!==target||!form.isConnected)return;
        if(!error.code){
          try{const fresh=await request('session');if(fresh.username===ownerSession.username&&fresh.profiles.some(profile=>profile.id===target.id)){await resume(fresh);return;}}catch{}
        }
        if(form.isConnected)formSay(form,error.message);
      }finally{setProfileBusy(false,operation);if(form.isConnected){button.disabled=false;form.setAttribute('aria-busy','false');}}
    };
    box.scrollIntoView({block:'nearest',behavior:'auto'});form.querySelector('input').focus({preventScroll:true});
  }
  function apply(state, name) {
    applying = true;
    stats = state.stats && typeof state.stats === 'object' && !Array.isArray(state.stats) ? state.stats : {};
    custom = Array.isArray(state.custom) ? state.custom : [];
    stars = Number(state.stars) || 0;
    avatar = state.avatar || '🦊'; playerName = name || '';
    setWorld(worlds[state.world] ? state.world : 'space');
    oldSave(); oldRemember(); refreshPlayer(); updateStats();
    document.querySelector('#customWords').value = custom.map(x => x[0] + ' = ' + x[1]).join('\n');
    if ('speechSynthesis' in window) speechSynthesis.cancel();
    queue = []; home(); applying = false;
  }
  async function choose(id, force = false) {
    const ownerSession=session,choice=++profileChoice;
    if (!force) await flush();
    if(session!==ownerSession||!session?.username||choice!==profileChoice)return;
    const profile = await request('profile&id=' + Number(id));
    if(session!==ownerSession||!session?.username||choice!==profileChoice)return;
    if (!active && !read(activeKey)) write(guestKey, {...snapshot(), name:playerName});
    active = profile; revision = profile.revision; pending = false; locked = false;
    write(activeKey, {id:profile.id, username:session.username});
    apply(profile.state, profile.nickname); show(); say('✓ Profilo di ' + profile.nickname + ' caricato.');
  }
  function show() {
    const notice=area.querySelector('#recoveryNotice');if(notice&&session?.username&&notice.dataset.owner!==session.username.trim().toLowerCase())notice.remove();
    if(profileChanging&&profileLockSession!==session)setProfileBusy(false);
    updateAccessTools();
    area.querySelector('summary').textContent=session?.role==='learner'?'Il mio profilo di classe':'Area adulti · account e progressi';
    if (session?.role==='learner') {
      panel.innerHTML='<h3>Ciao, '+esc(session.profiles[0]?.nickname||'esploratore')+'!</h3><p>Il tuo profilo è iscritto alla classe. I progressi si salvano mentre giochi.</p><button class="audio" id="learnerLogout">Esci / Logout</button>'+passwordSettings()+''+(locked?'<p>Il profilo è stato aggiornato su un altro dispositivo. La copia locale resta disponibile.</p><button class="audio" id="learnerReload">Carica la versione online</button>':'');
      panel.insertAdjacentHTML('beforeend',learnerRecoverySettings());bindPasswordSettings();bindLearnerRecovery();reflectProfileBusy();
      panel.querySelector('#learnerLogout').onclick=()=>logout().catch(e=>say(e.message));
      panel.querySelector('#learnerReload')?.addEventListener('click',()=>{write('wordylandConflictBackup',{profile:active.id,state:snapshot()});choose(active.id,true).catch(e=>say(e.message));});
      signalProfile();return;
    }
    if (!session?.username) {
      panel.innerHTML = '<h3>Un account per i grandi, un’avventura per ciascuno</h3><p>Accedi da un altro dispositivo per ritrovare i progressi. Crea fino a otto profili con un soprannome. Puoi anche giocare come ospite.</p><form id="accountForm"><label for="accountUser">Email o nome utente dell’adulto</label><input id="accountUser" autocomplete="username" minlength="3" maxlength="254" required><label for="accountPassword">Password · almeno 12 caratteri</label><input id="accountPassword" type="password" autocomplete="current-password" minlength="12" maxlength="72" required><label class="adultCheck"><input id="adultConfirm" type="checkbox"> Sono un adulto e gestirò i profili dei bambini</label><p class="hint">Alla registrazione riceverai un codice per recuperare l’account. Conservalo con cura.</p><button class="primary" name="action" value="login">Accedi</button><button class="audio" name="action" value="register">Crea account adulto</button></form><details id="accountRecovery"><summary>Password dimenticata? Recupera l’accesso</summary><p>Usa il codice di recupero ricevuto alla registrazione. Per gli alunni: riapri il link della classe e scegli Password dimenticata. Se non hai il codice, controlla qui sotto la disponibilità del recupero email.</p><form id="recoverAccount"><label>Email o nome utente<input name="username" autocomplete="username" required></label><label>Codice di recupero<input name="code" autocomplete="off" required></label><label>Nuova password<input name="password" type="password" autocomplete="new-password" minlength="12" maxlength="72" required></label><button class="primary">Reimposta password</button></form></details>';
      const accountHint=document.createElement('p');accountHint.id='adultAccountHelp';accountHint.className='hint';accountHint.textContent='Hai già un account? Inserisci le tue credenziali e scegli Accedi. La conferma adulto serve solo per creare un nuovo account. Per un profilo alunno, usa il link della tua classe.';panel.querySelector('#accountForm').prepend(accountHint);panel.querySelector('#accountUser').setAttribute('aria-describedby',accountHint.id);
      panel.querySelector('form').onsubmit = async e => {
        e.preventDefault(); const action = e.submitter?.value || 'login';
        const form=e.currentTarget,ownerSession=session;
        if (action === 'register' && !panel.querySelector('#adultConfirm').checked) { formSay(form,'Per creare un account, conferma di essere un adulto.',panel.querySelector('#adultConfirm')); return; }
        const buttons = [...panel.querySelectorAll('button')]; buttons.forEach(b => b.disabled = true);
        form.setAttribute('aria-busy','true');formSay(form,action==='register'?'Creazione dell’account in corso.':'Accesso in corso.',null,false);
        try {
          if(!session?.csrf){const fresh=await request('session');if(session!==ownerSession)return;session=fresh;}
          const accessSession=session;
          const result=await request(action, {username:form.querySelector('#accountUser').value, password:form.querySelector('#accountPassword').value, adult:form.querySelector('#adultConfirm').checked});
          if(session!==accessSession)return;session=result;
          if (session.recovery) { recoveryNotice(session.recovery); delete session.recovery; }
          if(session.role==='learner'&&session.profiles.length===1){await choose(session.profiles[0].id);say('Accesso riuscito. Sei nel tuo profilo di classe.');}
          else{show();say('Accesso riuscito. Scegli o crea un profilo.');(panel.querySelector('[data-profile]')||panel.querySelector('#profileNickname'))?.focus({preventScroll:true});}
        } catch (e) {
          if(!form.isConnected)return;
          if(!e.code){
            formSay(form,'Esito dell’accesso non confermato. Verifica della sessione in corso.',null,false);
            try{
              const fresh=await request('session');
              if(!form.isConnected)return;
              if(fresh.username){
                session=fresh;
                if(fresh.role==='learner'&&fresh.profiles.length===1)await choose(fresh.profiles[0].id);else show();
                say('Accesso confermato. Scegli il tuo profilo; se il codice di recupero non è arrivato, puoi generarne uno nuovo dalla gestione account.');return;
              }
              session=fresh;updateAccessTools();
            }catch{}
          }
          if(form.isConnected){formSay(form,e.message);buttons.forEach(b => b.disabled = false);}
        }
        finally{if(form.isConnected)form.setAttribute('aria-busy','false');}
      };
      const recoverySection=panel.querySelector('#accountRecovery');
      const emailInfo=document.createElement('div');emailInfo.id='emailRecovery';emailInfo.innerHTML='<p>Verifica recupero email…</p>';recoverySection.append(emailInfo);
      request('auth-capabilities').then(capabilities=>{
        if(!emailInfo.isConnected)return;
        if(!capabilities.emailRecoveryEnabled){emailInfo.innerHTML='<p>Recupero email non ancora attivo. Se non hai il codice, chiedi assistenza a chi gestisce WordyLand. Non creare un secondo account: i progressi restano nel profilo esistente.</p>';return;}
        emailInfo.innerHTML='<h4>Non hai il codice? Ricevi un link via email</h4><p>Per gli account adulti con email. Gli alunni usano il recupero della classe.</p><form id="emailRecoveryRequest"><label>Email dell’adulto<input name="email" type="email" autocomplete="email" maxlength="254" required></label><button class="audio">Richiedi il link</button><p role="status"></p></form>';
        emailInfo.querySelector('form').onsubmit=async event=>{event.preventDefault();const form=event.currentTarget,button=event.submitter;button.disabled=true;try{const result=await request('email-recovery-request',Object.fromEntries(new FormData(form)));form.querySelector('[role="status"]').textContent=result.message;}catch(error){form.querySelector('[role="status"]').textContent=error.message;}finally{if(button.isConnected)button.disabled=false;}};
      }).catch(()=>{if(emailInfo.isConnected)emailInfo.textContent='Disponibilità del recupero email non verificata. Riprova quando sei online.';});
      panel.querySelector('#recoverAccount').onsubmit = async e => {
        e.preventDefault(); const form=e.currentTarget, button=e.submitter,data=Object.fromEntries(new FormData(form)); button.disabled=true;
        try { if(!session?.csrf)session=await request('session');const ownerSession=session,result=await request('recover',data);if(session!==ownerSession||!form.isConnected)return;session.csrf=result.csrf; recoveryNotice(result.recovery,data.username); form.reset(); say('Password aggiornata. Accedi con la nuova password.'); }
        catch(e){if(form.isConnected)formSay(form,e.message);} finally {if(button.isConnected)button.disabled=false;}
      };
      signalProfile();
      return;
    }
    panel.innerHTML = '<h3>'+(session.role==='admin'?'Amministratore: ':'Account adulto: ') + esc(session.username) + '</h3><p>' + (active ? 'Stai giocando con il profilo di <b>' + esc(active.nickname) + '</b>.' : 'Scegli un profilo per usare il salvataggio online.') + '</p><div class="profileList" role="group" aria-label="Scegli il profilo" aria-busy="false">' + session.profiles.map(p => '<button class="audio" aria-pressed="'+(active?.id===p.id)+'" data-profile="' + Number(p.id) + '">' + esc(p.nickname) + (active?.id === p.id ? ' ✓' : '') + '</button>').join('') + '</div><form id="newProfile"><label for="profileNickname">Nuovo profilo · usa un soprannome</label><input id="profileNickname" maxlength="20" required autocomplete="off" aria-describedby="profileCount"><p class="hint" id="profileCount">Profili creati: ' + session.profiles.length + ' di 8. Scegli un soprannome, senza nome completo.</p><button class="primary">Crea profilo</button></form>' + (active ? '<button class="audio" id="syncNow">Salva ora</button><button class="audio" id="copyGuest">Copia qui i progressi ospite</button><div id="studyTools"></div>' : '') + (locked ? '<p>Il profilo è stato aggiornato altrove. La copia locale resta disponibile su questo dispositivo.</p><button class="audio" id="reloadProfile">Carica la versione online</button>' : '') + '<button class="audio" id="logoutAccount">Esci / Logout</button>'+passwordSettings()+'<details class="accountSecurity"><summary>Sicurezza e gestione account</summary><form id="securityAccount"><label>Password attuale<input name="password" type="password" autocomplete="current-password" required></label><button class="audio" value="new-recovery">Genera un nuovo codice di recupero</button><label>Per eliminare account e tutti i profili, scrivi ELIMINA<input name="confirm" autocomplete="off"></label><button class="audio" value="delete-account">Elimina definitivamente account e profili</button></form></details>';
    panel.querySelectorAll('[data-profile]').forEach(b => b.onclick = async () => {
      if(profileChanging)return;
      if (locked) { say('Carica prima la versione online del profilo attuale.'); return; }
      const wanted=Number(b.dataset.profile),ownerSession=session,operation=setProfileBusy(true);say('Caricamento del profilo in corso.');
      try{await choose(wanted);if(session!==ownerSession||operation!==profileOperation)return;setProfileBusy(false,operation);panel.querySelector('[data-profile="'+wanted+'"]')?.focus({preventScroll:true});}
      catch(e){if(session===ownerSession&&operation===profileOperation){say(e.message);b.focus({preventScroll:true});}}
      finally{setProfileBusy(false,operation);}
    });
    panel.querySelector('#newProfile').onsubmit = async e => {
      e.preventDefault(); if(profileChanging)return;const form=e.currentTarget;
      if(uncertainProfile?.ownerSession===session){showProfileVerification(form);return;}
      const ownerSession=session,operation=setProfileBusy(true),nickname=panel.querySelector('#profileNickname').value;let sent=false,created=null;form.setAttribute('aria-busy','true');formSay(form,'Creazione del profilo in corso.',null,false);
      try {
        await flush();
        if(session!==ownerSession||operation!==profileOperation)return;
        if (locked) throw new Error('Risolvi prima il conflitto del profilo attuale.');
        sent=true;const p = await request('create-profile', {nickname});created=p;
        if(session!==ownerSession||operation!==profileOperation)return;
        session.profiles.push(p); await choose(p.id);
        if(session!==ownerSession||operation!==profileOperation)return;
        setProfileBusy(false,operation);panel.querySelector('[data-profile="'+p.id+'"]')?.focus({preventScroll:true});
      } catch (e) {
        if(session===ownerSession&&operation===profileOperation){
          if(created){show();formSay(panel.querySelector('#newProfile'),'Profilo creato, ma caricamento non confermato. Sceglilo dall’elenco dei tuoi profili.');}
          else if(sent&&(!e.code||e.code>=500)){uncertainProfile={ownerSession,nickname};showProfileVerification(form);}
          else formSay(form,e.message);
        }
      }
      finally{setProfileBusy(false,operation);if(form.isConnected)form.setAttribute('aria-busy','false');}
    };
    if(uncertainProfile?.ownerSession===session)showProfileVerification(panel.querySelector('#newProfile'));
    if (active) {
      panel.querySelector('#syncNow').onclick = () => { if (!locked) { schedule(); flush().catch(() => {}); } };
      panel.querySelector('#copyGuest').onclick = () => {
        const guest = read(guestKey);
        if (!guest || locked) { say('Nessun progresso ospite da copiare.'); return; }
        // Merge progress only; keep the selected profile's world and avatar.
        for (const [word, s] of Object.entries(guest.stats || {})) {
          const old = stats[word] || {};
          stats[word] = {good:Math.max(s.good || 0, old.good || 0), attempts:Math.max(s.attempts || 0, old.attempts || 0), review:!!(s.review || old.review)};
        }
        stars = Math.max(stars, guest.stars || 0); save(); updateStats(); flush().catch(() => {});
      };
    }
    if (locked) panel.querySelector('#reloadProfile').onclick = () => {
      write('wordylandConflictBackup', {profile:active.id, state:snapshot()});
      choose(active.id, true).catch(e => say(e.message));
    };
    bindPasswordSettings();
    panel.querySelector('#logoutAccount').onclick = () => logout().catch(e=>say(e.message));
    panel.querySelector('#securityAccount').onsubmit = async e => {
      e.preventDefault();if(profileChanging)return;const form=e.currentTarget,action=e.submitter?.value;
      if(!['new-recovery','delete-account'].includes(action))return;
      const data=Object.fromEntries(new FormData(form));
      if(action==='delete-account'&&data.confirm!=='ELIMINA'){formSay(form,'Scrivi ELIMINA per confermare l’eliminazione dell’account.',form.elements.confirm);return;}
      if(action==='delete-account' && !window.confirm('Eliminare definitivamente account, profili, monete e schede? Questa operazione non può essere annullata.'))return;
      const ownerSession=session,operation=setProfileBusy(true);form.setAttribute('aria-busy','true');formSay(form,action==='new-recovery'?'Generazione del codice in corso.':'Eliminazione dell’account in corso.',null,false);
      try {
        await flush();if(session!==ownerSession||operation!==profileOperation)return;
        const result=await request(action,data);if(session!==ownerSession||operation!==profileOperation)return;
        if(result.recovery){form.reset();formSay(form,'Nuovo codice generato. Il precedente non è più valido.',null,false);recoveryNotice(result.recovery);}
        else {
          active=null;pending=false;clearTimeout(timer);try{localStorage.removeItem(activeKey);}catch{}
          area.querySelector('#recoveryNotice')?.remove();const guest=read(guestKey);if(guest)apply(guest,guest.name);
          session={csrf:'',username:null,role:null,profiles:[]};show();formSay(panel.querySelector('#accountForm'),'Account eliminato. Puoi continuare come ospite.');
          const deletedSession=session;
          try{const fresh=await request('session');if(session===deletedSession){session=fresh;updateAccessTools();}}catch{}
        }
      } catch(error){if(session===ownerSession&&operation===profileOperation)formSay(form,error.message);}
      finally{setProfileBusy(false,operation);if(form.isConnected)form.setAttribute('aria-busy','false');}
    };
    if(active){
      const manage=document.createElement('details');manage.className='accountSecurity';
      manage.innerHTML='<summary>Gestisci il profilo scelto</summary><form id="renameProfile"><label>Nuovo soprannome<input name="nickname" maxlength="20" required></label><button class="audio">Aggiorna soprannome</button></form><form id="removeProfile"><p>Elimina solo questo profilo, con monete, progressi e schede.</p><label>Password dell’adulto<input name="password" type="password" autocomplete="current-password" required></label><label>Scrivi ELIMINA per confermare<input name="confirm" required></label><button class="audio">Elimina definitivamente questo profilo</button></form>';
      panel.append(manage);
      manage.querySelector('#renameProfile').onsubmit=async e=>{
        e.preventDefault();if(profileChanging)return;
        const form=e.currentTarget,ownerSession=session,target=active,operation=setProfileBusy(true),nickname=new FormData(form).get('nickname');
        form.setAttribute('aria-busy','true');formSay(form,'Aggiornamento del soprannome in corso.',null,false);
        try{
          await flush();if(session!==ownerSession||active!==target||operation!==profileOperation)return;
          if(locked)throw new Error('Carica prima la versione online del profilo attuale.');
          const r=await request('rename-profile',{profile:target.id,nickname});if(session!==ownerSession||active!==target||operation!==profileOperation)return;
          active.nickname=r.nickname;session.profiles=r.profiles;playerName=r.nickname;oldRemember();refreshPlayer();show();
          const updated=panel.querySelector('#renameProfile');updated.closest('details').open=true;formSay(updated,'Soprannome aggiornato: '+r.nickname+'.');
        }catch(error){if(session===ownerSession&&active===target&&operation===profileOperation)formSay(form,error.message);}
        finally{setProfileBusy(false,operation);if(form.isConnected)form.setAttribute('aria-busy','false');}
      };
      manage.querySelector('#removeProfile').onsubmit=async e=>{
        e.preventDefault();if(profileChanging)return;
        const form=e.currentTarget,ownerSession=session,target=active,data=Object.fromEntries(new FormData(form));
        if(data.confirm!=='ELIMINA'){formSay(form,'Scrivi ELIMINA per confermare l’eliminazione di questo profilo.',form.elements.confirm);return;}
        if(!confirm('Eliminare definitivamente il profilo '+target.nickname+' e i suoi dati?'))return;
        const operation=setProfileBusy(true);form.setAttribute('aria-busy','true');formSay(form,'Eliminazione del profilo in corso.',null,false);
        try{
          await flush();if(session!==ownerSession||active!==target||operation!==profileOperation)return;
          const r=await request('delete-profile',{...data,profile:target.id});if(session!==ownerSession||active!==target||operation!==profileOperation)return;
          active=null;pending=false;clearTimeout(timer);try{localStorage.removeItem(activeKey);}catch{}
          const guest=read(guestKey);if(guest)apply(guest,guest.name);session.profiles=r.profiles;show();formSay(panel.querySelector('#newProfile'),'Profilo '+target.nickname+' eliminato. Gli altri profili restano disponibili.');
        }catch(error){if(session===ownerSession&&active===target&&operation===profileOperation)formSay(form,error.message);}
        finally{setProfileBusy(false,operation);if(form.isConnected)form.setAttribute('aria-busy','false');}
      };
    }
    reflectProfileBusy();signalProfile();
  }
  function logout() {
    if(logoutFlight)return logoutFlight;
    logoutFlight=(async()=>{
      if(locked)throw new Error('Carica la versione online prima di uscire. La copia locale è conservata.');
      await flush();const result=await request('logout',{});setProfileBusy(false);active=null;pending=false;uncertainProfile=null;clearTimeout(timer);
      try{localStorage.removeItem(activeKey);}catch{}
      const guest=read(guestKey);if(guest)apply(guest,guest.name);
      area.querySelector('#recoveryNotice')?.remove();
      // New servers return the freshly rotated anonymous CSRF immediately.
      // Older servers need one read before any guest forms become interactive.
      let fresh={csrf:'',username:null,role:null,profiles:[]},ready=false;
      try{fresh=result.csrf?{...fresh,csrf:result.csrf}:await request('session');ready=true;}catch{}
      session=fresh;show();say(ready?'Sei uscito. Ora giochi come ospite.':'Sei uscito dall’account. La connessione non è pronta: usa Accedi per riprovare.');
    })().finally(()=>{logoutFlight=null;if(resetToken)queueMicrotask(openEmailReset);});
    return logoutFlight;
  }
  async function connect(result) {
    setProfileBusy(false);
    const notice=area.querySelector('#recoveryNotice');if(notice&&notice.dataset.owner!==String(result.username||'').trim().toLowerCase())notice.remove();
    session=result;active=null;pending=false;locked=false;accessExpired=false;area.querySelector('#sessionReconnect')?.remove();clearTimeout(timer);
    if(result.role==='learner'&&result.profiles.length===1)await choose(result.profiles[0].id);
    else show();
  }
  window.wordylandAccount = {
    request,flush,connect,logout,openAccess,selectProfile:choose,
    createProfile:async nickname=>{
      const ownerSession=session;await flush();
      if(session!==ownerSession||!session?.username)throw new Error('L’accesso è cambiato. Verifica l’account prima di creare un profilo.');
      const p=await request('create-profile',{nickname});if(session!==ownerSession)return null;
      session.profiles.push(p);await choose(p.id);return p;
    },
    info:()=>({id:active?.id||null,nickname:active?.nickname||'',username:session?.username||null,role:session?.role||null,saving:!!busy,pending:!!pending,locked:!!locked,authExpired:!!accessExpired,working:pendingWrites>0||profileChanging||!!logoutFlight||uncertainProfile?.ownerSession===session,recoveryPending:!!document.querySelector('#recoveryNotice,#classRecoveryNotice[data-recovery-pending="true"]')})
  };
  window.addEventListener('online', () => flush().catch(() => {}));
  window.addEventListener('beforeunload', e => { if (pending || busy) { e.preventDefault(); e.returnValue = ''; } });
  document.addEventListener('visibilitychange', () => { if (document.visibilityState === 'hidden') flush().catch(() => {}); });
  updateAccessTools();
  window.addEventListener('hashchange',()=>{if(captureResetLink()){openEmailReset();return;}if(location.hash==='#recupera-password')openAccess('recover');else if(location.hash==='#account')openAccess('login');});
  window.wordylandAccount.ready = request('session').then(async result => {
    session = result; show();
    if(session.role==='learner'&&session.profiles.length===1){await choose(session.profiles[0].id);return;}
    const cached = read(activeKey);
    if (cached && cached.username === session.username && session.profiles.some(p => p.id === cached.id)) {
      // Explicitly reopen the same server profile; no silent guest-to-account merge.
      await choose(cached.id);
    } else {
      if (cached) { const guest = read(guestKey); if (guest) apply(guest, guest.name); try { localStorage.removeItem(activeKey); } catch {} }
      say(session.username ? 'Scegli il profilo con cui giocare.' : 'Modalità ospite: i progressi restano su questo dispositivo.');
    }
  }).catch(e => { panel.innerHTML = '<p>Puoi giocare come ospite.</p>'; say(e.message); }).finally(()=>{initializing=false;updateAccessTools();if(resetToken){queueMicrotask(openEmailReset);return;}if(location.hash==='#recupera-password')openAccess('recover');else if(location.hash==='#account')openAccess('login');});
})();
