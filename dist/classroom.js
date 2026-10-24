/* One class link, one personal learner profile. No class directory or email. */
(() => {
  const account=window.wordylandAccount;
  const escape=value=>String(value??'').replace(/[&<>"']/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]));
  function share(code,host){
    const url=new URL(location.href);url.hash='classe='+code;url.search='';
    host.innerHTML='<div class="classShare"><b>Il link unico della classe</b><p>Condividilo con le famiglie: gli alunni sceglieranno soprannome e password e saranno iscritti direttamente a questa classe.</p><label>Link di iscrizione<input class="classShareUrl" readonly></label><button type="button" class="audio">Copia link</button><span role="status"></span></div>';
    const input=host.querySelector('input');input.value=url.href;
    const section=host.closest('details');if(section)section.open=true;
    host.querySelector('button').onclick=async()=>{
      try{await navigator.clipboard.writeText(input.value);host.querySelector('[role=status]').textContent='Link copiato!';}
      catch{input.focus();input.select();host.querySelector('[role=status]').textContent='Link selezionato: copialo e condividilo.';}
    };
  }
  window.wordylandClassroom={share,openAccess(view){if(!gate||!details||account.info().username)return false;mode=view==='recover'?'recover':'login';draw();gate.scrollIntoView({block:'start'});gate.querySelector('input')?.focus({preventScroll:true});return true;}};
  let code='',details=null,mode='register',recovery='',sequence=0,gate=null,lastUsername=account.info().username;
  function codeFromUrl(){return new URLSearchParams(location.hash.slice(1)).get('classe');}
  function status(message){const e=gate?.querySelector('#classEntryStatus');if(e)e.textContent=message;}
  function recoveryBox(){
    return recovery?'<div class="recoveryNotice"><b>Conserva il tuo codice di recupero con un adulto.</b><p>Serve se dimentichi la password. Ti viene mostrato solo adesso.</p><code>'+escape(recovery.match(/.{1,4}/g).join('-'))+'</code><button type="button" class="audio" id="classRecoverySaved">L’ho conservato</button></div>':'';
  }
  function draw(){
    if(!gate||!details)return;
    const who=account.info();
    const title='<div class="classEntryHeading"><span class="classEntryIcon" aria-hidden="true">🎒</span><div><span class="questEyebrow">IL GIOCO DELLA TUA CLASSE</span><h2>'+escape(details.name)+'</h2></div></div>';
    if(who.username){
      const joined=who.role==='learner'&&details.joined;
      gate.innerHTML=title+(joined?'<h3>Ci sei, '+escape(who.nickname)+'!</h3><p>La tua classe è pronta. Esplora i mondi, gioca e scegli un compagno da sfidare.</p>'+recoveryBox()+'<div class="heroActions"><button class="primary" data-jump="arena">Scegli un compagno →</button><button class="audio" data-jump="missions">Gioca una missione</button></div>':'<p>Stai usando '+(who.role==='learner'?'un profilo di un’altra classe.':'l’account adulto.')+' Per iscrivere o far accedere un alunno a questa classe, esci oppure apri questo stesso link in una finestra privata.</p>')+'<button class="audio classExit" id="classExit">Esci / Logout</button><p id="classEntryStatus" role="status" aria-live="polite"></p>';
      gate.querySelector('#classExit').onclick=()=>account.logout().catch(e=>status(e.message));
    }else{
      const recover=mode==='recover',register=mode==='register';
      gate.innerHTML=title+'<p>Un link, una classe, tante avventure. Usa un soprannome: niente nome completo o email.</p><nav class="classEntryTabs" aria-label="Accesso alla classe"><button type="button" data-class-mode="register" aria-pressed="'+register+'">È la prima volta</button><button type="button" data-class-mode="login" aria-pressed="'+(mode==='login')+'">Ho già un profilo</button></nav>'+(details.full&&register?'<p class="classFull" role="status">La classe è al completo. Se sei già iscritto, scegli “Ho già un profilo”.</p>':'')+'<form id="classEntryForm"><h3>'+(recover?'Recupera la password':register?'Scegli il tuo nome di gioco':'Bentornato nella tua classe!')+'</h3><label for="classNickname">Il tuo soprannome</label><input id="classNickname" name="nickname" autocomplete="username" minlength="3" maxlength="20" pattern="[A-Za-z0-9][A-Za-z0-9_-]{2,19}" placeholder="Per esempio: Luna7" required><p class="hint">Da 3 a 20 lettere o numeri, senza spazi. Puoi usare _ e -.</p>'+(recover?'<label for="classRecovery">Codice di recupero</label><input id="classRecovery" name="recovery" autocomplete="off" required>':'')+'<label for="classPassword">'+(recover?'Nuova password':'La tua password')+'</label><input id="classPassword" name="password" type="password" autocomplete="'+(register||recover?'new-password':'current-password')+'" minlength="12" maxlength="72" required><p class="hint">Almeno 12 caratteri: puoi scegliere una frase e farti aiutare da un adulto.</p>'+(register?'<label class="adultCheck"><input type="checkbox" name="consent" required> Partecipo alla classe: i compagni vedranno il mio soprannome, il personaggio e i punti.</label>':'')+'<button class="primary" '+(register&&details.full?'disabled':'')+'>'+(recover?'Aggiorna password':register?'Iscrivimi e giochiamo →':'Entra e giochiamo →')+'</button></form><button type="button" class="audio classRecoveryLink" id="classRecoverToggle">'+(recover?'Torna all’accesso':'Password dimenticata?')+'</button>'+recoveryBox()+'<p id="classEntryStatus" role="status" aria-live="polite"></p>';
      gate.querySelectorAll('[data-class-mode]').forEach(b=>b.onclick=()=>{mode=b.dataset.classMode;draw();});
      gate.querySelector('#classRecoverToggle').onclick=()=>{mode=recover?'login':'recover';draw();};
      gate.querySelector('#classEntryForm').onsubmit=async e=>{
        e.preventDefault();const form=e.currentTarget,button=e.submitter,fields=Object.fromEntries(new FormData(form));button.disabled=true;
        const expected=sequence;
        try{
          const result=await account.request('class-'+(recover?'recover':mode),{code,nickname:fields.nickname,password:fields.password,recovery:fields.recovery,consent:fields.consent==='on'});
          if(expected!==sequence){if(!recover)await account.connect(result);return;}
          recovery=result.recovery||'';
          if(recover){mode='login';draw();gate.querySelector('#classNickname').value=fields.nickname;status('Password aggiornata. Conserva il nuovo codice e accedi.');}
          else{details.joined=true;await account.connect(result);draw();status('Profilo pronto: sei nella tua classe!');}
        }catch(error){if(expected===sequence)status(error.message);}
        finally{if(button.isConnected&&!(register&&details.full))button.disabled=false;}
      };
    }
    gate.querySelector('#classRecoverySaved')?.addEventListener('click',()=>{recovery='';draw();});
  }
  async function load(){
    const found=codeFromUrl();const expected=++sequence;details=null;recovery='';code=found||'';
    if(!found){gate?.remove();gate=null;document.body.classList.remove('classEntry');return;}
    if(!gate){gate=document.createElement('section');gate.className='classGate';gate.setAttribute('aria-label','Iscrizione alla classe');document.querySelector('main').prepend(gate);}
    document.body.classList.add('classEntry');
    gate.innerHTML='<h2>Prepariamo la tua classe…</h2><p id="classEntryStatus" role="status"></p>';
    try{await account.ready;const result=await account.request('class-invite&code='+encodeURIComponent(code));if(expected!==sequence)return;details=result;mode=result.full?'login':'register';draw();}
    catch(e){if(expected===sequence){gate.innerHTML='<h2>Non riusciamo ad aprire la classe.</h2><p id="classEntryStatus" role="status"></p><button class="audio" id="classEntryRetry">Riprova</button>';status(e.message);gate.querySelector('#classEntryRetry').onclick=load;}}
  }
  window.addEventListener('hashchange',load);
  window.addEventListener('wordyland-profile',()=>{const username=account.info().username;if(lastUsername&&username!==lastUsername){recovery='';mode='login';}lastUsername=username;if(details)draw();});
  load();
})();
