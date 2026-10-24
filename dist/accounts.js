// Adult-owned profiles. Guest play remains available without an account.
(() => {
  const area = document.createElement('details');
  area.className = 'accountArea';
  area.innerHTML = '<summary>Area adulti · account e progressi</summary><div class="settings"><div id="accountContent"></div><p id="accountStatus" role="status" aria-live="polite">Connessione al salvataggio online…</p></div>';
  document.querySelector('main').prepend(area);
  const panel = area.querySelector('#accountContent'), status = area.querySelector('#accountStatus');
  let session = null, active = null, revision = 0, pending = false, timer, busy = null, applying = false, locked = false;
  let initializing=true;
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
  function passwordSettings(){return '<details id="passwordSettings" class="accountSecurity"><summary>Cambia password</summary><form id="changePasswordForm"><label>Password attuale<input name="password" type="password" autocomplete="current-password" required></label><label>Nuova password · almeno 12 caratteri<input name="newPassword" type="password" autocomplete="new-password" minlength="12" maxlength="72" required></label><label>Ripeti la nuova password<input name="confirmPassword" type="password" autocomplete="new-password" minlength="12" maxlength="72" required></label><button class="primary">Salva la nuova password</button><p>Resterai collegato qui. Gli altri dispositivi dovranno accedere di nuovo.</p></form></details>';}
  function bindPasswordSettings(){
    const form=panel.querySelector('#changePasswordForm');if(!form)return;
    form.onsubmit=async event=>{event.preventDefault();const data=Object.fromEntries(new FormData(form));if(data.newPassword!==data.confirmPassword){say('Le due nuove password non coincidono.');return;}const button=event.submitter;button.disabled=true;try{await flush();await request('change-password',data);form.reset();say('Password aggiornata. Gli altri dispositivi dovranno accedere di nuovo.');signalProfile();}catch(error){say(error.message);}finally{if(button.isConnected)button.disabled=false;}};
  }
  function recoveryNotice(code) {
    let notice = area.querySelector('#recoveryNotice');
    if (!notice) { notice = document.createElement('div'); notice.id = 'recoveryNotice'; notice.className = 'recoveryNotice'; area.querySelector('.settings').prepend(notice); }
    notice.innerHTML = '<b>Conserva il codice di recupero in un luogo sicuro.</b><p>Ti servirà se dimentichi la password. Questo codice viene mostrato solo ora.</p><code></code><br><button class="audio">L’ho conservato: nascondi</button>';
    notice.querySelector('code').textContent = code.match(/.{1,4}/g).join('-');
    notice.querySelector('button').onclick = () => notice.remove();
  }
  function signalProfile() { window.dispatchEvent(new CustomEvent('wordyland-profile', {detail:{id:active?.id || null, nickname:active?.nickname || '', username:session?.username || null, role:session?.role || null}})); }
  const read = key => { try { return JSON.parse(localStorage.getItem(key) || 'null'); } catch { return null; } };
  const write = (key, value) => { try { localStorage.setItem(key, JSON.stringify(value)); } catch {} };
  const snapshot = () => ({stats, custom, stars, world: worldId, avatar});
  const oldSave = save, oldRemember = rememberPlayer;
  save = function () { oldSave(); schedule(); };
  rememberPlayer = function () { oldRemember(); schedule(); };
  function say(text) { status.textContent = text; }
  async function request(action, body, options = {}) {
    const accessAction=['session','login','register','logout','recover','change-password','class-login','class-register','class-recover'].includes(action);
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
      if (!response.ok) { const e = new Error(result.error || 'Operazione non riuscita.'); e.code = response.status; throw e; }
      if (result.csrf && session) session.csrf = result.csrf;
      return result;
    }catch(error){
      if(error.name==='AbortError')throw new Error(accessAction?'La connessione è lenta. Verifica l’accesso prima di riprovare.':'La connessione è lenta. Verifica la partita con Riprendi dal salvataggio prima di inviare di nuovo.');
      if(error instanceof TypeError)throw new Error(accessAction?'Connessione interrotta. L’operazione di accesso non è confermata.':'Connessione interrotta. Le risposte già confermate sono salvate: torna online e riprendi la partita.');
      throw error;
    }finally{clearTimeout(timeout);}
  }
  function schedule() {
    if (!active || applying || locked) return;
    pending = true; clearTimeout(timer);
    say('Progressi salvati sul dispositivo. Sincronizzazione in corso…');
    timer = setTimeout(() => flush().catch(() => {}), 900);
  }
  async function flush() {
    clearTimeout(timer);
    if (busy) { await busy; if (pending) return flush(); return; }
    if (!pending || !active || locked) return;
    pending = false;
    const payload = {id:active.id, revision, state:snapshot()};
    busy = request('save', payload).then(result => {
      revision = result.revision;
      say('✓ Progressi sincronizzati per ' + active.nickname + '.');
    }).catch(e => {
      pending = true;
      if (e.code === 409) { locked = true; show(); }
      say(e.message + ' La copia su questo dispositivo è conservata.');
      throw e;
    }).finally(() => { busy = null; });
    await busy;
    if (pending) return flush();
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
    if (!force) await flush();
    const profile = await request('profile&id=' + Number(id));
    if (!active && !read(activeKey)) write(guestKey, {...snapshot(), name:playerName});
    active = profile; revision = profile.revision; pending = false; locked = false;
    write(activeKey, {id:profile.id, username:session.username});
    apply(profile.state, profile.nickname); show(); say('✓ Profilo di ' + profile.nickname + ' caricato.');
  }
  function show() {
    updateAccessTools();
    area.querySelector('summary').textContent=session?.role==='learner'?'Il mio profilo di classe':'Area adulti · account e progressi';
    if (session?.role==='learner') {
      panel.innerHTML='<h3>Ciao, '+esc(session.profiles[0]?.nickname||'esploratore')+'!</h3><p>Il tuo profilo è iscritto alla classe. I progressi si salvano mentre giochi.</p><button class="audio" id="learnerLogout">Esci / Logout</button>'+passwordSettings()+''+(locked?'<p>Il profilo è stato aggiornato su un altro dispositivo. La copia locale resta disponibile.</p><button class="audio" id="learnerReload">Carica la versione online</button>':'');
      bindPasswordSettings();
      panel.querySelector('#learnerLogout').onclick=()=>logout().catch(e=>say(e.message));
      panel.querySelector('#learnerReload')?.addEventListener('click',()=>{write('wordylandConflictBackup',{profile:active.id,state:snapshot()});choose(active.id,true).catch(e=>say(e.message));});
      signalProfile();return;
    }
    if (!session?.username) {
      panel.innerHTML = '<h3>Un account per i grandi, un’avventura per ciascuno</h3><p>Accedi da un altro dispositivo per ritrovare i progressi. Crea fino a otto profili con un soprannome. Puoi anche giocare come ospite.</p><form id="accountForm"><label for="accountUser">Email o nome utente dell’adulto</label><input id="accountUser" autocomplete="username" minlength="3" maxlength="254" required><label for="accountPassword">Password · almeno 12 caratteri</label><input id="accountPassword" type="password" autocomplete="current-password" minlength="12" maxlength="72" required><label class="adultCheck"><input id="adultConfirm" type="checkbox"> Sono un adulto e gestirò i profili dei bambini</label><p class="hint">Alla registrazione riceverai un codice per recuperare l’account. Conservalo con cura.</p><button class="primary" name="action" value="login">Accedi</button><button class="audio" name="action" value="register">Crea account adulto</button></form><details id="accountRecovery"><summary>Password dimenticata? Recupera l’accesso</summary><p>Usa il codice di recupero ricevuto alla registrazione. Per gli alunni: riapri il link della classe e scegli Password dimenticata. Il recupero non invia email.</p><form id="recoverAccount"><label>Email o nome utente<input name="username" autocomplete="username" required></label><label>Codice di recupero<input name="code" autocomplete="off" required></label><label>Nuova password<input name="password" type="password" autocomplete="new-password" minlength="12" maxlength="72" required></label><button class="primary">Reimposta password</button></form></details>';
      panel.querySelector('form').onsubmit = async e => {
        e.preventDefault(); const action = e.submitter?.value || 'login';
        if (action === 'register' && !panel.querySelector('#adultConfirm').checked) { say('Per creare un account, conferma di essere un adulto.'); return; }
        const buttons = [...panel.querySelectorAll('button')]; buttons.forEach(b => b.disabled = true);
        try {
          if(!session?.csrf)session=await request('session');
          session = await request(action, {username:panel.querySelector('#accountUser').value, password:panel.querySelector('#accountPassword').value, adult:panel.querySelector('#adultConfirm').checked});
          if (session.recovery) { recoveryNotice(session.recovery); delete session.recovery; }
          if(session.role==='learner'&&session.profiles.length===1){await choose(session.profiles[0].id);say('Accesso riuscito. Sei nel tuo profilo di classe.');}
          else{show();say('Accesso riuscito. Scegli o crea un profilo.');}
        } catch (e) { say(e.message); buttons.forEach(b => b.disabled = false); }
      };
      panel.querySelector('#recoverAccount').onsubmit = async e => {
        e.preventDefault(); const form=e.currentTarget, button=e.submitter; button.disabled=true;
        try { if(!session?.csrf)session=await request('session');const result=await request('recover',Object.fromEntries(new FormData(form))); session.csrf=result.csrf; recoveryNotice(result.recovery); form.reset(); say('Password aggiornata. Accedi con la nuova password.'); }
        catch(e){say(e.message);} finally {button.disabled=false;}
      };
      signalProfile();
      return;
    }
    panel.innerHTML = '<h3>'+(session.role==='admin'?'Amministratore: ':'Account adulto: ') + esc(session.username) + '</h3><p>' + (active ? 'Stai giocando con il profilo di <b>' + esc(active.nickname) + '</b>.' : 'Scegli un profilo per usare il salvataggio online.') + '</p><div class="profileList">' + session.profiles.map(p => '<button class="audio" data-profile="' + Number(p.id) + '">' + esc(p.nickname) + (active?.id === p.id ? ' ✓' : '') + '</button>').join('') + '</div><form id="newProfile"><label for="profileNickname">Nuovo profilo · usa un soprannome</label><input id="profileNickname" maxlength="20" required autocomplete="off"><button class="primary">Crea profilo</button></form>' + (active ? '<button class="audio" id="syncNow">Salva ora</button><button class="audio" id="copyGuest">Copia qui i progressi ospite</button><div id="studyTools"></div>' : '') + (locked ? '<p>Il profilo è stato aggiornato altrove. La copia locale resta disponibile su questo dispositivo.</p><button class="audio" id="reloadProfile">Carica la versione online</button>' : '') + '<button class="audio" id="logoutAccount">Esci / Logout</button>'+passwordSettings()+'<details class="accountSecurity"><summary>Sicurezza e gestione account</summary><form id="securityAccount"><label>Password attuale<input name="password" type="password" autocomplete="current-password" required></label><button class="audio" value="new-recovery">Genera un nuovo codice di recupero</button><label>Per eliminare account e tutti i profili, scrivi ELIMINA<input name="confirm" autocomplete="off"></label><button class="audio" value="delete-account">Elimina definitivamente account e profili</button></form></details>';
    panel.querySelectorAll('[data-profile]').forEach(b => b.onclick = () => {
      if (locked) { say('Carica prima la versione online del profilo attuale.'); return; }
      choose(Number(b.dataset.profile)).catch(e => say(e.message));
    });
    panel.querySelector('#newProfile').onsubmit = async e => {
      e.preventDefault(); const button = e.submitter; button.disabled = true;
      try {
        await flush();
        if (locked) throw new Error('Risolvi prima il conflitto del profilo attuale.');
        const p = await request('create-profile', {nickname:panel.querySelector('#profileNickname').value});
        session.profiles.push(p); await choose(p.id);
      } catch (e) { say(e.message); button.disabled = false; }
    };
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
      e.preventDefault(); const action=e.submitter.value;
      if(action==='delete-account' && !window.confirm('Eliminare definitivamente account, profili, monete e schede? Questa operazione non può essere annullata.'))return;
      e.submitter.disabled=true;
      try {
        await flush(); const result=await request(action,Object.fromEntries(new FormData(e.currentTarget)));
        if(result.recovery){recoveryNotice(result.recovery);e.currentTarget.reset();e.submitter.disabled=false;}
        else {active=null;pending=false;clearTimeout(timer);localStorage.removeItem(activeKey);const guest=read(guestKey);if(guest)apply(guest,guest.name);session=await request('session');show();say('Account eliminato. Puoi continuare come ospite.');}
      } catch(error){say(error.message);e.submitter.disabled=false;}
    };
    if(active){
      const manage=document.createElement('details');manage.className='accountSecurity';
      manage.innerHTML='<summary>Gestisci il profilo scelto</summary><form id="renameProfile"><label>Nuovo soprannome<input name="nickname" maxlength="20" required></label><button class="audio">Aggiorna soprannome</button></form><form id="removeProfile"><p>Elimina solo questo profilo, con monete, progressi e schede.</p><label>Password dell’adulto<input name="password" type="password" autocomplete="current-password" required></label><label>Scrivi ELIMINA per confermare<input name="confirm" required></label><button class="audio">Elimina definitivamente questo profilo</button></form>';
      panel.append(manage);
      manage.querySelector('#renameProfile').onsubmit=async e=>{e.preventDefault();try{await flush();const r=await request('rename-profile',{profile:active.id,nickname:new FormData(e.currentTarget).get('nickname')});active.nickname=r.nickname;session.profiles=r.profiles;playerName=r.nickname;oldRemember();refreshPlayer();show();say('Soprannome aggiornato.');}catch(e){say(e.message);}};
      manage.querySelector('#removeProfile').onsubmit=async e=>{
        e.preventDefault();if(!confirm('Eliminare definitivamente il profilo '+active.nickname+' e i suoi dati?'))return;
        try{await flush();const r=await request('delete-profile',{...Object.fromEntries(new FormData(e.currentTarget)),profile:active.id});active=null;pending=false;clearTimeout(timer);localStorage.removeItem(activeKey);const guest=read(guestKey);if(guest)apply(guest,guest.name);session.profiles=r.profiles;show();say('Profilo eliminato. Gli altri profili restano disponibili.');}catch(e){say(e.message);}
      };
    }
    signalProfile();
  }
  async function logout() {
    if(locked)throw new Error('Carica la versione online prima di uscire. La copia locale è conservata.');
    await flush();await request('logout',{});active=null;pending=false;clearTimeout(timer);
    try{localStorage.removeItem(activeKey);}catch{}
    const guest=read(guestKey);if(guest)apply(guest,guest.name);
    area.querySelector('#recoveryNotice')?.remove();
    session={csrf:'',username:null,role:null,profiles:[]};show();
    try{session=await request('session');show();say('Sei uscito. Ora giochi come ospite.');}
    catch{say('Sei uscito dall’account. La connessione non è pronta: usa Accedi per riprovare.');}
  }
  async function connect(result) {
    session=result;active=null;pending=false;locked=false;clearTimeout(timer);
    if(result.role==='learner'&&result.profiles.length===1)await choose(result.profiles[0].id);
    else show();
  }
  window.wordylandAccount = {request, flush, connect, logout,openAccess,selectProfile:choose,createProfile:async nickname=>{await flush();const p=await request('create-profile',{nickname});session.profiles.push(p);await choose(p.id);return p;}, info:()=>({id:active?.id || null,nickname:active?.nickname || '',username:session?.username || null,role:session?.role||null})};
  window.addEventListener('online', () => flush().catch(() => {}));
  window.addEventListener('beforeunload', e => { if (pending || busy) { e.preventDefault(); e.returnValue = ''; } });
  document.addEventListener('visibilitychange', () => { if (document.visibilityState === 'hidden') flush().catch(() => {}); });
  updateAccessTools();
  window.addEventListener('hashchange',()=>{if(location.hash==='#recupera-password')openAccess('recover');else if(location.hash==='#account')openAccess('login');});
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
  }).catch(e => { panel.innerHTML = '<p>Puoi giocare come ospite.</p>'; say(e.message); }).finally(()=>{initializing=false;updateAccessTools();if(location.hash==='#recupera-password')openAccess('recover');else if(location.hash==='#account')openAccess('login');});
})();
