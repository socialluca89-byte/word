/* One class link, one personal learner profile. No public class directory. */
(() => {
  const account=window.wordylandAccount;
  const escape=value=>String(value??'').replace(/[&<>"']/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]));
  function share(code,host){
    const url=new URL(location.href);url.hash='classe='+code;url.search='';
    host.innerHTML='<div class="classShare"><b>Il link unico della classe</b><p>Condividilo con le famiglie: chi è già iscritto ritrova il proprio profilo. I nuovi alunni scelgono un soprannome e una password.</p><label>Link di iscrizione<input class="classShareUrl" readonly></label><button type="button" class="audio">Copia link</button><span role="status" aria-live="polite"></span></div>';
    const input=host.querySelector('input');input.value=url.href;
    const section=host.closest('details');if(section)section.open=true;
    host.querySelector('button').onclick=async()=>{
      try{await navigator.clipboard.writeText(input.value);host.querySelector('[role=status]').textContent='Link copiato!';}
      catch{input.focus();input.select();host.querySelector('[role=status]').textContent='Link selezionato: copialo e condividilo.';}
    };
  }
  let code='',details=null,mode='register',recovery='',sequence=0,gate=null,lastUsername=account.info().username,nicknameDraft='';
  function codeFromUrl(){return new URLSearchParams(location.hash.slice(1)).get('classe');}
  function status(message,focus=false){const e=gate?.querySelector('#classEntryStatus');if(e){e.textContent=message;if(focus){e.tabIndex=-1;e.focus({preventScroll:true});}}}
  function focusEntry(){
    const target=gate?.querySelector('form input')||gate?.querySelector('[data-class-profile]')||gate?.querySelector('h3');
    if(target?.matches('h3'))target.tabIndex=-1;
    target?.focus({preventScroll:true});
  }
  function changeMode(next){const field=gate?.querySelector('#classNickname');if(field)nicknameDraft=field.value;mode=next;draw();focusEntry();}
  window.wordylandClassroom={share,openAccess(view){if(!gate||!details||account.info().username||mode==='account'&&view==='recover')return false;changeMode(view==='recover'?'recover':mode==='account'?'account':'login');gate.scrollIntoView({block:'start'});return true;}};
  function recoveryBox(){return recovery?'<div class="recoveryNotice"><b>Conserva il tuo codice di recupero con un adulto.</b><p>Serve se dimentichi la password. Ti viene mostrato solo adesso.</p><code>'+escape(recovery.match(/.{1,4}/g).join('-'))+'</code><button type="button" class="audio" id="classRecoverySaved">L’ho conservato</button></div>':'';}
  function memberView(who,title){
    const ownProfiles=details.profiles||[],members=ownProfiles.filter(p=>p.joined);
    const joined=members.some(p=>p.id===who.id)||(who.role==='learner'&&details.joined);
    let content='';
    if(joined)content='<h3 tabindex="-1">Ci sei, '+escape(who.nickname)+'!</h3><p>Sei già in questa classe. Usa il tuo profilo e continua dai progressi salvati.</p>'+recoveryBox()+'<div class="heroActions"><a class="communityButton" href="#sfide">Scegli un compagno →</a><a class="communityButton" href="#allenati">Gioca una missione</a></div>';
    else if(members.length)content='<h3 tabindex="-1">Scegli il tuo profilo nella classe</h3><p>Questi profili del tuo account sono già iscritti. Non serve registrarsi di nuovo.</p><div class="profileList">'+members.map(p=>'<button type="button" class="primary" data-class-profile="'+p.id+'">Entra come '+escape(p.nickname)+'</button>').join('')+'</div>';
    else if(who.role==='learner')content='<h3 tabindex="-1">Questo profilo appartiene a un’altra classe</h3><p>Per entrare qui, usa il profilo di questa classe. Puoi uscire senza perdere i progressi salvati.</p>';
    else{
      content='<h3 tabindex="-1">Entra con un profilo già esistente</h3><p>Hai effettuato l’accesso al tuo account. Puoi usare un tuo profilo senza crearne una copia.</p>';
      if(!who.id&&ownProfiles.length)content+='<p>Scegli il profilo da iscrivere:</p><div class="profileList">'+ownProfiles.map(p=>'<button type="button" class="audio" data-class-profile="'+p.id+'">'+escape(p.nickname)+'</button>').join('')+'</div>';
      else if(who.id&&!details.full)content+='<form id="classExistingJoin"><p>Profilo scelto: <b>'+escape(who.nickname)+'</b></p><label class="adultCheck"><input type="checkbox" name="consent" required> Confermo la partecipazione di questo profilo: i compagni vedranno soprannome, personaggio e punti.</label><button class="primary">Iscrivi questo profilo alla classe</button></form>';
      else if(details.full)content+='<p class="classFull" role="status">La classe è al completo. Chiedi all’insegnante di verificare l’iscrizione.</p>';
      else content+='<p>Il tuo account non ha ancora un profilo. Crealo nell’area account, poi riapri questo link.</p><button type="button" class="audio" id="classChooseAccount">Apri i tuoi profili</button>';
    }
    gate.innerHTML=title+content+(details.canManage?'<p><a class="communityButton" href="#classe-crea">Gestisci la tua classe →</a></p>':'')+'<button type="button" class="audio classExit" id="classExit">Esci / Logout</button><p id="classEntryStatus" role="status" aria-live="polite" aria-atomic="true"></p>';
    gate.querySelector('#classExit').onclick=async event=>{const button=event.currentTarget;button.disabled=true;try{await account.logout();}catch(error){status(error.message,true);if(button.isConnected)button.disabled=false;}};
    gate.querySelector('#classChooseAccount')?.addEventListener('click',()=>account.openAccess('login'));
    gate.querySelectorAll('[data-class-profile]').forEach(button=>button.onclick=async()=>{button.disabled=true;try{await account.selectProfile(Number(button.dataset.classProfile));}catch(error){status(error.message,true);if(button.isConnected)button.disabled=false;}});
    gate.querySelector('#classExistingJoin')?.addEventListener('submit',async event=>{
      event.preventDefault();const form=event.currentTarget,button=event.submitter,expected=sequence;button.disabled=true;
      try{await account.request('club-join',{profile:who.id,code,consent:new FormData(form).get('consent')==='on'});if(expected!==sequence||account.info().username!==who.username)return;await load();status('Profilo iscritto. I tuoi progressi sono rimasti al loro posto.',true);}
      catch(error){if(expected===sequence)status(error.message,true);}finally{if(button.isConnected)button.disabled=false;}
    });
  }
  function draw(){
    if(!gate||!details)return;
    const who=account.info(),title='<div class="classEntryHeading"><span class="classEntryIcon" aria-hidden="true">🎒</span><div><span class="questEyebrow">IL GIOCO DELLA TUA CLASSE</span><h2 aria-level="1">'+escape(details.name)+'</h2></div></div><p><a class="communityButton" href="#">← Torna al gioco</a></p>';
    if(who.username)memberView(who,title);
    else if(mode==='account'){
      gate.innerHTML=title+'<h3>Accedi al tuo account esistente</h3><p>Usa l’email o il nome utente dell’account che contiene il tuo profilo. Ritroverai i progressi e le iscrizioni già salvati.</p><form id="classAccountForm"><label for="classAccountUser">Email o nome utente</label><input id="classAccountUser" name="username" autocomplete="username" minlength="3" maxlength="254" required><label for="classAccountPassword">Password dell’account</label><input id="classAccountPassword" name="password" type="password" autocomplete="current-password" minlength="12" maxlength="72" required><button class="primary">Accedi al tuo account</button></form><button type="button" class="audio classRecoveryLink" id="classBackToPupil">Torna all’accesso alunni</button><p id="classEntryStatus" role="status" aria-live="polite" aria-atomic="true"></p>';
      gate.querySelector('#classBackToPupil').onclick=()=>changeMode('login');
      gate.querySelector('#classAccountForm').insertAdjacentHTML('afterend','<p><a class="communityButton" href="#recupera-password">Recupera la password dell’account</a></p>');
      gate.querySelector('#classAccountForm').onsubmit=async event=>{
        event.preventDefault();const form=event.currentTarget,button=event.submitter,fields=Object.fromEntries(new FormData(form)),expected=sequence;button.disabled=true;
        try{const result=await account.request('login',fields);if(expected!==sequence){await account.connect(result);return;}details=null;lastUsername=result.username;await account.connect(result);await load();focusEntry();}
        catch(error){if(expected===sequence)status(error.message,true);}finally{if(button.isConnected)button.disabled=false;}
      };
    }else{
      const recover=mode==='recover',register=mode==='register';
      gate.innerHTML=title+'<p>Un link, una classe, tante avventure. Usa il soprannome scelto per questa classe: niente nome completo o email.</p><nav class="classEntryTabs" aria-label="Accesso alla classe"><button type="button" data-class-mode="register" aria-pressed="'+register+'">È la prima volta</button><button type="button" data-class-mode="login" aria-pressed="'+(mode==='login')+'">Ho già un profilo</button></nav>'+(details.full&&register?'<p class="classFull" role="status">La classe è al completo. Se sei già iscritto, scegli “Ho già un profilo”.</p>':'')+'<form id="classEntryForm"><h3>'+(recover?'Recupera la password':register?'Scegli il tuo nome di gioco':'Bentornato nella tua classe!')+'</h3><label for="classNickname">Il tuo soprannome</label><input id="classNickname" name="nickname" autocomplete="username" minlength="3" maxlength="20" pattern="[A-Za-z0-9][A-Za-z0-9_-]{2,19}" aria-describedby="classNicknameHint" placeholder="Per esempio: Luna7" required><p class="hint" id="classNicknameHint">Da 3 a 20 lettere o numeri, senza spazi. Puoi usare anche _ e -.</p>'+(recover?'<label for="classRecovery">Codice di recupero</label><input id="classRecovery" name="recovery" autocomplete="off" required>':'')+'<label for="classPassword">'+(recover?'Nuova password':'La tua password')+'</label><input id="classPassword" name="password" type="password" autocomplete="'+(register||recover?'new-password':'current-password')+'" minlength="12" maxlength="72" aria-describedby="classPasswordHint" required><p class="hint" id="classPasswordHint">Almeno 12 caratteri: puoi scegliere una frase e farti aiutare da un adulto.</p>'+(register?'<label class="adultCheck"><input type="checkbox" name="consent" required> Partecipo alla classe: i compagni vedranno il mio soprannome, il personaggio e i punti.</label>':'')+'<button class="primary" '+(register&&details.full?'disabled':'')+'>'+(recover?'Aggiorna password':register?'Iscrivimi e giochiamo →':'Entra e giochiamo →')+'</button></form><button type="button" class="audio classRecoveryLink" id="classRecoverToggle">'+(recover?'Torna all’accesso':'Password dimenticata?')+'</button><p>Hai già un account con email o nome utente? <button type="button" class="audio" id="classExistingAccount">Accedi con il tuo account esistente</button></p>'+recoveryBox()+'<p id="classEntryStatus" role="status" aria-live="polite" aria-atomic="true"></p>';
      gate.querySelector('#classNickname').value=nicknameDraft;
      gate.querySelectorAll('[data-class-mode]').forEach(button=>button.onclick=()=>changeMode(button.dataset.classMode));
      gate.querySelector('#classExistingAccount').onclick=()=>changeMode('account');
      gate.querySelector('#classRecoverToggle').onclick=()=>changeMode(recover?'login':'recover');
      gate.querySelector('#classEntryForm').onsubmit=async event=>{
        event.preventDefault();const form=event.currentTarget,button=event.submitter,fields=Object.fromEntries(new FormData(form));button.disabled=true;nicknameDraft=fields.nickname;
        const expected=sequence;
        try{
          const result=await account.request('class-'+(recover?'recover':mode),{code,nickname:fields.nickname,password:fields.password,recovery:fields.recovery,consent:fields.consent==='on'});
          if(expected!==sequence){if(!recover)await account.connect(result);return;}
          recovery=result.recovery||'';
          if(recover){mode='login';draw();status('Password aggiornata. Conserva il nuovo codice e accedi.',true);}
          else{details.joined=true;details.profiles=result.profiles.map(p=>({...p,joined:true}));lastUsername=result.username;await account.connect(result);draw();status('Profilo pronto: sei nella tua classe!');}
        }catch(error){if(expected===sequence)status(error.message,true);}
        finally{if(button.isConnected&&!(register&&details.full))button.disabled=false;}
      };
    }
    gate.querySelector('#classRecoverySaved')?.addEventListener('click',()=>{recovery='';draw();});
  }
  async function load(){
    const found=codeFromUrl();const expected=++sequence;details=null;recovery='';code=found||'';
    if(!found){gate?.remove();gate=null;document.body.classList.remove('classEntry');return;}
    if(!gate){gate=document.createElement('section');gate.className='classGate';gate.setAttribute('aria-label','Iscrizione alla classe');document.querySelector('main').prepend(gate);}
    document.body.classList.add('classEntry');gate.setAttribute('aria-busy','true');gate.innerHTML='<h2>Prepariamo la tua classe…</h2><p id="classEntryStatus" role="status"></p>';
    try{await account.ready;const result=await account.request('class-invite&code='+encodeURIComponent(code));if(expected!==sequence)return;details=result;mode=result.full?'login':'register';draw();}
    catch(error){if(expected===sequence){gate.innerHTML='<h2>Non riusciamo ad aprire la classe.</h2><p id="classEntryStatus" role="status" aria-live="polite"></p><button type="button" class="audio" id="classEntryRetry">Riprova</button>';status(error.message);gate.querySelector('#classEntryRetry').onclick=load;}}
    finally{if(expected===sequence)gate?.removeAttribute('aria-busy');}
  }
  window.addEventListener('hashchange',load);
  window.addEventListener('wordyland-profile',()=>{const username=account.info().username,changed=username!==lastUsername;if(lastUsername&&changed){recovery='';nicknameDraft='';mode='login';}lastUsername=username;if(changed&&code){load();return;}if(details)draw();});
  load();
})();
