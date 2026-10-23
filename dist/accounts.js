// Adult-owned profiles. Guest play remains available without an account.
(() => {
  const area = document.createElement('details');
  area.className = 'accountArea';
  area.innerHTML = '<summary>Area adulti · account e progressi</summary><div class="settings"><div id="accountContent"></div><p id="accountStatus" role="status" aria-live="polite">Connessione al salvataggio online…</p></div>';
  document.querySelector('main').prepend(area);
  const panel = area.querySelector('#accountContent'), status = area.querySelector('#accountStatus');
  let session = null, active = null, revision = 0, pending = false, timer, busy = null, applying = false, locked = false;
  const guestKey = 'wordylandGuestBackup', activeKey = 'wordylandActiveProfile';
  const read = key => { try { return JSON.parse(localStorage.getItem(key) || 'null'); } catch { return null; } };
  const write = (key, value) => { try { localStorage.setItem(key, JSON.stringify(value)); } catch {} };
  const snapshot = () => ({stats, custom, stars, world: worldId, avatar});
  const oldSave = save, oldRemember = rememberPlayer;
  save = function () { oldSave(); schedule(); };
  rememberPlayer = function () { oldRemember(); schedule(); };
  function say(text) { status.textContent = text; }
  async function request(action, body) {
    const response = await fetch('api.php?action=' + action, {
      method: body === undefined ? 'GET' : 'POST', credentials: 'same-origin', cache: 'no-store',
      headers: body === undefined ? {} : {'Content-Type':'application/json', 'X-CSRF-Token': session?.csrf || ''},
      body: body === undefined ? undefined : JSON.stringify(body)
    });
    let result;
    try { result = await response.json(); } catch { throw new Error('Salvataggio online non disponibile. Puoi continuare come ospite.'); }
    if (!response.ok) { const e = new Error(result.error || 'Operazione non riuscita.'); e.code = response.status; throw e; }
    return result;
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
    if (!session?.username) {
      panel.innerHTML = '<h3>Un account per i grandi, un’avventura per ciascuno</h3><p>Accedi da un altro dispositivo per ritrovare i progressi. Crea fino a otto profili con un soprannome. Puoi anche giocare come ospite.</p><form id="accountForm"><label for="accountUser">Nome utente dell’adulto</label><input id="accountUser" autocomplete="username" minlength="3" maxlength="40" pattern="[A-Za-z0-9_.-]{3,40}" required><label for="accountPassword">Password · almeno 12 caratteri</label><input id="accountPassword" type="password" autocomplete="current-password" minlength="12" maxlength="72" required><label class="adultCheck"><input id="adultConfirm" type="checkbox"> Sono un adulto e gestirò i profili dei bambini</label><p class="hint">Conserva le credenziali: il recupero automatico della password non è ancora disponibile.</p><button class="primary" name="action" value="login">Accedi</button><button class="audio" name="action" value="register">Crea account adulto</button></form>';
      panel.querySelector('form').onsubmit = async e => {
        e.preventDefault(); const action = e.submitter?.value || 'login';
        if (action === 'register' && !panel.querySelector('#adultConfirm').checked) { say('Per creare un account, conferma di essere un adulto.'); return; }
        const buttons = [...panel.querySelectorAll('button')]; buttons.forEach(b => b.disabled = true);
        try {
          session = await request(action, {username:panel.querySelector('#accountUser').value, password:panel.querySelector('#accountPassword').value, adult:panel.querySelector('#adultConfirm').checked});
          show(); say('Accesso riuscito. Scegli o crea un profilo.');
        } catch (e) { say(e.message); buttons.forEach(b => b.disabled = false); }
      };
      return;
    }
    panel.innerHTML = '<h3>Account adulto: ' + esc(session.username) + '</h3><p>' + (active ? 'Stai giocando con il profilo di <b>' + esc(active.nickname) + '</b>.' : 'Scegli un profilo per usare il salvataggio online.') + '</p><div class="profileList">' + session.profiles.map(p => '<button class="audio" data-profile="' + Number(p.id) + '">' + esc(p.nickname) + (active?.id === p.id ? ' ✓' : '') + '</button>').join('') + '</div><form id="newProfile"><label for="profileNickname">Nuovo profilo · usa un soprannome</label><input id="profileNickname" maxlength="20" required autocomplete="off"><button class="primary">Crea profilo</button></form>' + (active ? '<button class="audio" id="syncNow">Salva ora</button><button class="audio" id="copyGuest">Copia qui i progressi ospite</button>' : '') + (locked ? '<p>Il profilo è stato aggiornato altrove. La copia locale resta disponibile su questo dispositivo.</p><button class="audio" id="reloadProfile">Carica la versione online</button>' : '') + '<button class="audio" id="logoutAccount">Esci dall’account</button>';
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
    panel.querySelector('#logoutAccount').onclick = async () => {
      try {
        if (locked) throw new Error('Carica la versione online prima di uscire. La copia locale verrà conservata.');
        await flush(); await request('logout', {});
        const guest = read(guestKey); active = null; pending = false; clearTimeout(timer);
        try { localStorage.removeItem(activeKey); } catch {}
        if (guest) apply(guest, guest.name);
        session = await request('session'); show(); say('Sei uscito. Ora giochi come ospite.');
      } catch (e) { say(e.message); }
    };
  }
  window.addEventListener('online', () => flush().catch(() => {}));
  window.addEventListener('beforeunload', e => { if (pending || busy) { e.preventDefault(); e.returnValue = ''; } });
  document.addEventListener('visibilitychange', () => { if (document.visibilityState === 'hidden') flush().catch(() => {}); });
  request('session').then(async result => {
    session = result; show();
    const cached = read(activeKey);
    if (cached && cached.username === session.username && session.profiles.some(p => p.id === cached.id)) {
      // Explicitly reopen the same server profile; no silent guest-to-account merge.
      await choose(cached.id);
    } else {
      if (cached) { const guest = read(guestKey); if (guest) apply(guest, guest.name); try { localStorage.removeItem(activeKey); } catch {} }
      say(session.username ? 'Scegli il profilo con cui giocare.' : 'Modalità ospite: i progressi restano su questo dispositivo.');
    }
  }).catch(e => { panel.innerHTML = '<p>Puoi giocare come ospite.</p>'; say(e.message); });
})();
