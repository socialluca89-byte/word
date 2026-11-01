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
  let code='',details=null,mode='register',recovery='',sequence=0,gate=null,lastUsername=account.info().username,nicknameDraft='',entryOperation=null,recoveryFocused='',authGeneration=0,observedUsername=account.info().username;
  function codeFromUrl(){return new URLSearchParams(location.hash.slice(1)).get('classe');}
  function status(message,focus=false){const e=gate?.querySelector('#classEntryStatus');if(e){e.textContent=message;if(focus){e.tabIndex=-1;e.focus({preventScroll:true});}}}
  function focusEntry(){
    const target=gate?.querySelector('form input')||gate?.querySelector('[data-class-profile]')||gate?.querySelector('h3');
    if(target?.matches('h3'))target.tabIndex=-1;
    target?.focus({preventScroll:true});
  }
  function changeMode(next){if(entryOperation)return;const field=gate?.querySelector('#classNickname');if(field)nicknameDraft=field.value;mode=next;draw();focusEntry();}
  function beginEntry(form,message){
    if(entryOperation)return null;
    const operation={form,sequence,authGeneration,code,controls:[...gate.querySelectorAll('button,input')].map(element=>({element,disabled:element.disabled}))};
    entryOperation=operation;form.setAttribute('aria-busy','true');operation.controls.forEach(({element})=>element.disabled=true);status(message);return operation;
  }
  function finishEntry(operation){
    operation.controls.forEach(({element,disabled})=>{if(element.isConnected)element.disabled=disabled;});
    if(operation.form.isConnected)operation.form.setAttribute('aria-busy','false');
    if(entryOperation===operation)entryOperation=null;
  }
  function currentOperation(operation){return operation.authGeneration===authGeneration;}
  async function connectAccess(result){
    const startingGeneration=authGeneration,expectedGeneration=authGeneration+(observedUsername!==result.username?1:0);lastUsername=result.username;
    try{await account.connect(result);}
    catch(error){
      if(account.info().username!==result.username||(authGeneration!==expectedGeneration&&authGeneration!==startingGeneration))return false;
      if(observedUsername!==result.username){authGeneration++;observedUsername=result.username;}
      await load();status('Accesso riuscito. Non abbiamo ancora caricato i progressi: scegli il tuo profilo per riprovare.',true);focusEntry();focusRecovery();return false;
    }
    return authGeneration===expectedGeneration&&account.info().username===result.username;
  }
  async function reconcileAccess(operation,message,nickname=null){
    if(!currentOperation(operation))return false;
    const fresh=await account.request('session');
    if(!currentOperation(operation)||!fresh.username)return false;
    details=null;if(!await connectAccess(fresh))return false;
    if(codeFromUrl()){
      await load();
      const who=account.info(),registeredHere=!nickname||(who.role==='learner'&&who.nickname.toLowerCase()===nickname.toLowerCase()&&details?.profiles?.some(profile=>profile.id===who.id&&profile.joined));
      status(registeredHere?message:'Accesso verificato. Controlla il profilo e la classe prima di iscriverti di nuovo.',true);focusRecovery();
    }
    return true;
  }
  function focusRecovery(){
    if(!recovery||recovery===recoveryFocused)return;
    const expected=recovery;
    requestAnimationFrame(()=>{const notice=gate?.querySelector('#classRecoveryNotice');if(recovery!==expected||recoveryFocused===expected||!notice)return;recoveryFocused=expected;notice.focus({preventScroll:true});notice.scrollIntoView({block:'nearest',behavior:'auto'});});
  }
  window.wordylandClassroom={share,openAccess(view){if(!gate||!details||account.info().username||mode==='account'&&view==='recover')return false;changeMode(view==='recover'?'recover':mode==='account'?'account':'login');gate.scrollIntoView({block:'start'});return true;}};
  function recoveryBox(){return recovery?'<div class="recoveryNotice" id="classRecoveryNotice" data-recovery-pending="true" tabindex="-1" role="region" aria-labelledby="classRecoveryTitle"><b id="classRecoveryTitle">Conserva il tuo codice di recupero con un adulto.</b><p>Serve se dimentichi la password. Ti viene mostrato solo adesso.</p><code>'+escape(recovery.match(/.{1,4}/g).join('-'))+'</code><button type="button" class="audio" id="classRecoverySaved">L’ho conservato</button></div>':'';}
  function memberView(who,title){
    const ownProfiles=details.profiles||[],members=ownProfiles.filter(p=>p.joined);
    const joined=members.some(p=>p.id===who.id);
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
    if(!joined&&recovery)content+=recoveryBox();
    gate.innerHTML=title+content+(details.canManage?'<p><a class="communityButton" href="#classe-crea">Gestisci la tua classe →</a></p>':'')+'<button type="button" class="audio classExit" id="classExit">Esci / Logout</button><p id="classEntryStatus" role="status" aria-live="polite" aria-atomic="true"></p>';
    gate.querySelector('#classExit').onclick=async event=>{const button=event.currentTarget;button.disabled=true;try{await account.logout();}catch(error){status(error.message,true);if(button.isConnected)button.disabled=false;}};
    gate.querySelector('#classChooseAccount')?.addEventListener('click',()=>account.openAccess('login'));
    gate.querySelectorAll('[data-class-profile]').forEach(button=>button.onclick=async()=>{button.disabled=true;try{await account.selectProfile(Number(button.dataset.classProfile));}catch(error){status(error.message,true);if(button.isConnected)button.disabled=false;}});
    gate.querySelector('#classExistingJoin')?.addEventListener('submit',async event=>{
      event.preventDefault();const form=event.currentTarget,consent=new FormData(form).get('consent')==='on',operation=beginEntry(form,'Verifichiamo l’iscrizione alla classe.');if(!operation)return;
      try{await account.request('club-join',{profile:who.id,code:operation.code,consent});if(!currentOperation(operation)||operation.sequence!==sequence||account.info().username!==who.username)return;await load();status('Profilo iscritto. I tuoi progressi sono rimasti al loro posto.',true);}
      catch(error){
        if(!currentOperation(operation)||operation.sequence!==sequence)return;
        if(!error.code){await load();const joined=details?.profiles?.some(profile=>profile.id===who.id&&profile.joined);status(joined?'Iscrizione verificata: il tuo profilo è nella classe.':error.message+' Prima di inviare di nuovo, riapri questo link e verifica il profilo.',true);}
        else status(error.message,true);
      }finally{finishEntry(operation);}
    });
  }
  function draw(){
    if(!gate||!details)return;
    const who=account.info(),title='<div class="classEntryHeading"><span class="classEntryIcon" aria-hidden="true">🎒</span><div><span class="questEyebrow">IL GIOCO DELLA TUA CLASSE</span><h2 aria-level="1">'+escape(details.name)+'</h2></div></div><p><a class="communityButton" href="#">← Torna al gioco</a></p>';
    if(who.username)memberView(who,title);
    else if(mode==='account'){
      gate.innerHTML=title+'<h3>Accedi al tuo account esistente</h3><p>Usa l’email o il nome utente dell’account che contiene il tuo profilo. Ritroverai i progressi e le iscrizioni già salvati.</p><form id="classAccountForm"><label for="classAccountUser">Email o nome utente</label><input id="classAccountUser" name="username" autocomplete="section-adult username" minlength="3" maxlength="254" required><label for="classAccountPassword">Password dell’account</label><input id="classAccountPassword" name="password" type="password" autocomplete="section-adult current-password" minlength="12" maxlength="72" required><button class="primary">Accedi al tuo account</button></form><button type="button" class="audio classRecoveryLink" id="classBackToPupil">Torna all’accesso alunni</button><p id="classEntryStatus" role="status" aria-live="polite" aria-atomic="true"></p>';
      gate.querySelector('#classBackToPupil').onclick=()=>changeMode('login');
      gate.querySelector('#classAccountForm').insertAdjacentHTML('afterend','<p><a class="communityButton" href="#recupera-password">Recupera la password dell’account</a></p>');
      gate.querySelector('#classAccountForm').onsubmit=async event=>{
        event.preventDefault();const form=event.currentTarget,fields=Object.fromEntries(new FormData(form)),operation=beginEntry(form,'Accesso all’account in corso.');if(!operation)return;
        try{
          const result=await account.request('login',fields);if(!currentOperation(operation))return;
          if(operation.sequence!==sequence){await reconcileAccess(operation,'Accesso verificato. Scegli il tuo profilo.');return;}
          details=null;if(!await connectAccess(result))return;
          await load();focusEntry();
        }catch(error){
          if(!currentOperation(operation)||operation.sequence!==sequence)return;
          if(!error.code){try{if(await reconcileAccess(operation,'Accesso verificato. Scegli il tuo profilo.'))return;}catch{}}
          if(currentOperation(operation))status(error.message,true);
        }finally{finishEntry(operation);}
      };
    }else{
      const recover=mode==='recover',register=mode==='register',submittedMode=recover?'recover':mode;
      const passwordHint=register?'Almeno 12 caratteri: puoi scegliere una frase e farti aiutare da un adulto.':recover?'Scegli una nuova password di almeno 12 caratteri. Il codice usato verrà sostituito.':'Usa la password che hai già scelto per questo profilo. Non crearne una nuova.';
      const nicknameHint=register?'Da 3 a 20 lettere o numeri, senza spazi. Puoi usare anche _ e -.':'Usa lo stesso soprannome scelto per questa classe. Un account con email si apre dal pulsante qui sotto.';
      gate.innerHTML=title+'<p>Un link, una classe, tante avventure. Usa il soprannome scelto per questa classe: niente nome completo o email.</p><nav class="classEntryTabs" aria-label="Accesso alla classe"><button type="button" data-class-mode="register" aria-pressed="'+register+'">È la prima volta</button><button type="button" data-class-mode="login" aria-pressed="'+(mode==='login')+'">Ho già un profilo</button></nav>'+(details.full&&register?'<p class="classFull" role="status">La classe è al completo. Se sei già iscritto, scegli “Ho già un profilo”.</p>':'')+'<form id="classEntryForm"><h3>'+(recover?'Recupera la password':register?'Scegli il tuo nome di gioco':'Bentornato nella tua classe!')+'</h3><label for="classNickname">Il tuo soprannome</label><input id="classNickname" name="nickname" autocomplete="section-classroom username" autocapitalize="none" spellcheck="false" minlength="3" maxlength="20" pattern="[A-Za-z0-9][A-Za-z0-9_-]{2,19}" aria-describedby="classNicknameHint" placeholder="Per esempio: Luna7" required><p class="hint" id="classNicknameHint">'+nicknameHint+'</p>'+(recover?'<label for="classRecovery">Codice di recupero</label><input id="classRecovery" name="recovery" autocomplete="off" autocapitalize="none" spellcheck="false" aria-describedby="classRecoveryHint" required><p class="hint" id="classRecoveryHint">Il codice ricevuto alla registrazione. Se non lo trovi, chiedi a un adulto: creare un altro profilo separerebbe i tuoi progressi.</p>':'')+'<label for="classPassword">'+(recover?'Nuova password':'La tua password')+'</label><input id="classPassword" name="password" type="password" autocomplete="section-classroom '+(register||recover?'new-password':'current-password')+'" minlength="12" maxlength="72" aria-describedby="classPasswordHint" required><p class="hint" id="classPasswordHint">'+passwordHint+'</p>'+(register?'<label class="adultCheck"><input type="checkbox" name="consent" required> Partecipo alla classe: i compagni vedranno il mio soprannome, il personaggio e i punti.</label>':'')+'<button class="primary" '+(register&&details.full?'disabled':'')+'>'+(recover?'Aggiorna password':register?'Iscrivimi e giochiamo →':'Entra e giochiamo →')+'</button></form><button type="button" class="audio classRecoveryLink" id="classRecoverToggle">'+(recover?'Torna all’accesso':'Password dimenticata?')+'</button><p>Hai già un account con email o nome utente? <button type="button" class="audio" id="classExistingAccount">Accedi con il tuo account esistente</button></p>'+recoveryBox()+'<p id="classEntryStatus" role="status" aria-live="polite" aria-atomic="true"></p>';
      gate.querySelector('#classNickname').value=nicknameDraft;
      gate.querySelectorAll('[data-class-mode]').forEach(button=>button.onclick=()=>changeMode(button.dataset.classMode));
      gate.querySelector('#classExistingAccount').onclick=()=>changeMode('account');
      gate.querySelector('#classRecoverToggle').onclick=()=>changeMode(recover?'login':'recover');
      gate.querySelector('#classEntryForm').onsubmit=async event=>{
        event.preventDefault();const form=event.currentTarget,fields=Object.fromEntries(new FormData(form)),operation=beginEntry(form,recover?'Verifichiamo il codice e la nuova password.':register?'Prepariamo il tuo profilo nella classe.':'Accesso alla classe in corso.');if(!operation)return;nicknameDraft=fields.nickname;
        try{
          const result=await account.request('class-'+submittedMode,{code:operation.code,nickname:fields.nickname,password:fields.password,recovery:fields.recovery,consent:fields.consent==='on'});
          if(!currentOperation(operation))return;
          if(operation.sequence!==sequence){if(!recover)await reconcileAccess(operation,'Accesso verificato. Puoi continuare con il tuo profilo.');return;}
          if(result.recovery)recovery=result.recovery;
          if(recover){mode='login';draw();status('Password aggiornata. Conserva il nuovo codice e accedi.',true);}
          else{
            details.joined=true;details.profiles=result.profiles.map(p=>({...p,joined:true}));if(recovery)recoveryFocused='';if(!await connectAccess(result))return;
            draw();status('Profilo pronto: sei nella tua classe!');
          }
          focusRecovery();
        }catch(error){
          if(!currentOperation(operation)||operation.sequence!==sequence)return;
          if(!error.code&&!recover){try{if(await reconcileAccess(operation,register?'Iscrizione verificata: sei nella classe. Il codice di recupero non è arrivato: con la tua password puoi generarne uno dal profilo, in “Conserva il tuo accesso”.':'Accesso verificato. Puoi continuare con il tuo profilo.',register?fields.nickname:null))return;}catch{}}
          if(currentOperation(operation)){
            if(!error.code&&register){mode='login';draw();status('Iscrizione non confermata. Verifica prima l’accesso con lo stesso soprannome e la password appena scelti: il profilo potrebbe essere già stato creato.',true);}
            else status(error.message+(!error.code&&recover?' La password potrebbe essere già aggiornata. Torna all’accesso e verifica con la nuova password prima di riprovare.':''),true);
          }
        }finally{finishEntry(operation);}
      };
    }
    gate.querySelector('#classRecoverySaved')?.addEventListener('click',()=>{recovery='';draw();focusEntry();status('Codice conservato. Ora puoi continuare a giocare.');});
    focusRecovery();
  }
  async function load(){
    const found=codeFromUrl(),sameClass=found===code;const expected=++sequence;details=null;entryOperation=null;if(!sameClass){nicknameDraft='';mode='register';recovery='';}code=found||'';
    if(!found){gate?.remove();gate=null;document.body.classList.remove('classEntry');return;}
    if(!gate){gate=document.createElement('section');gate.className='classGate';gate.setAttribute('aria-label','Iscrizione alla classe');document.querySelector('main').prepend(gate);}
    document.body.classList.add('classEntry');gate.setAttribute('aria-busy','true');gate.innerHTML='<h1>Prepariamo la tua classe.</h1><p id="classEntryStatus" role="status"></p>';
    try{await account.ready;const result=await account.request('class-invite&code='+encodeURIComponent(code));if(expected!==sequence)return;details=result;if(result.full&&mode==='register')mode='login';draw();}
    catch(error){if(expected===sequence){gate.innerHTML='<h1>Non riusciamo ad aprire la classe.</h1><p id="classEntryStatus" role="status" aria-live="polite"></p><button type="button" class="audio" id="classEntryRetry">Riprova</button><p><a class="communityButton" href="#">← Torna al gioco</a></p>';status(error.message);gate.querySelector('#classEntryRetry').onclick=load;}}
    finally{if(expected===sequence)gate?.removeAttribute('aria-busy');}
  }
  window.addEventListener('hashchange',load);
  window.addEventListener('wordyland-recovery-replaced',()=>{recovery='';recoveryFocused='';if(details)draw();});
  window.addEventListener('wordyland-profile',()=>{const username=account.info().username;if(username!==observedUsername){authGeneration++;observedUsername=username;}const changed=username!==lastUsername;if(lastUsername&&changed){recovery='';recoveryFocused='';nicknameDraft='';mode='login';}lastUsername=username;if(changed&&code){load();return;}if(details&&!(entryOperation?.form.isConnected&&currentOperation(entryOperation)))draw();});
  load();
})();
