/* Direct classroom, feedback and administrator pages. Permissions are server-owned. */
(()=>{
 const root=document.createElement('section');root.id='communityHub';root.className='communityHub';root.hidden=true;root.setAttribute('aria-live','polite');document.querySelector('.raceHero').after(root);
 const text=value=>String(value??'').replace(/[&<>"']/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]));
 const info=()=>window.wordylandAccount.info(),request=(action,body)=>window.wordylandAccount.request(action,body);
 const statuses={open:'Aperta',planned:'In valutazione',fixed:'Risolta',closed:'Chiusa'};
 let epoch=0,offset=0,adminView='accounts',adminSearch='',accountOwner=null,activationCode=null,newRecovery=null,recoveryAnnounced=false;
 const heading=(eyebrow,title,description)=>'<div class="communityHeading"><span class="questEyebrow">'+eyebrow+'</span><h2 tabindex="-1" aria-level="1">'+title+'</h2><p>'+description+'</p><a class="communityButton" href="#">← Torna al gioco</a></div>';
 const status=message=>{const el=root.querySelector('#communityStatus');if(el)el.textContent=message;};
 const openAccount=()=>{const el=document.querySelector('.accountArea');el.open=true;el.scrollIntoView({behavior:'smooth',block:'start'});el.querySelector('#accountUser')?.focus({preventScroll:true});};
 function navigation(){document.querySelectorAll('.serviceNav a').forEach(a=>{if(a.hash===location.hash)a.setAttribute('aria-current','page');else a.removeAttribute('aria-current');});}
 async function route(scroll=false){
  const current=++epoch;navigation();const hash=location.hash;
  if(accountOwner!==info().username){accountOwner=info().username;offset=0;adminSearch='';}
  if(['#continua','#sfide','#personaggi','#allenati','#preposizioni','#classe-crea','#segnalazioni','#admin','#iscritti'].includes(hash)||hash.startsWith('#admin-attiva='))window.wordylandUI?.play();
  document.body.classList.toggle('communityPage',['#classe-crea','#segnalazioni','#admin','#iscritti'].includes(hash)||hash.startsWith('#admin-attiva='));
  if(!info().username)newRecovery=null;
  const match=hash.match(/^#admin-attiva=([a-f0-9]{64})$/);if(match){activationCode=match[1];history.replaceState(null,'','#admin');}
  if(hash==='#allenamento'){window.wordylandUI?.play();root.hidden=true;document.querySelector('.questHub').hidden=true;window.dispatchEvent(new Event('wordyland-training-open'));return;}
  if(hash==='#continua'){root.hidden=true;document.querySelector('.questHub').hidden=false;window.dispatchEvent(new CustomEvent('wordyland-continue'));return;}
  if(hash==='#sfide'||hash==='#personaggi'||hash==='#allenati'||hash==='#preposizioni'){
   root.hidden=true;document.querySelector('.questHub').hidden=false;if(hash==='#preposizioni')window.dispatchEvent(new CustomEvent('wordyland-prepositions'));else if(hash==='#personaggi')window.dispatchEvent(new CustomEvent('wordyland-style'));else document.querySelector(hash==='#allenati'?'[data-tab=lessons]':'[data-tab=arena]')?.click();if(scroll)document.querySelector(hash==='#preposizioni'?'#questContent':'.questHub').scrollIntoView({behavior:window.wordylandMotion.allowed()?'smooth':'instant',block:'start'});return;
  }
  if(!['#classe-crea','#segnalazioni','#admin','#iscritti'].includes(location.hash)){root.hidden=true;document.querySelector('.questHub').hidden=false;return;}
  root.hidden=false;document.querySelector('.questHub').hidden=true;
  root.innerHTML='<p>Caricamento…</p><p id="communityStatus" role="status"></p>';
  try{
   if(location.hash==='#classe-crea')await classroom(current);
   if(location.hash==='#segnalazioni')await reports(current,false);
   if(location.hash==='#iscritti'){if(!info().username)signIn('Chi c’è nella classe?','Accedi per vedere gli iscritti e i compagni online.');else{root.innerHTML=heading('ISCRITTI E GIOCATORI','Iscritti e compagni online.','L’elenco distingue profili registrati, attività online e disponibilità alle sfide.')+'<div id="classRoster"></div>';window.wordylandPresence.mountRoster(root.querySelector('#classRoster'));}}
   if(location.hash==='#admin'){if(activationCode)activation();else await admin(current);}
  }catch(e){if(current===epoch){root.innerHTML=heading('RIPROVIAMO','Questa sezione si fa attendere.','')+'<p id="communityStatus" role="status"></p><button class="audio" id="communityRetry">Riprova</button>';status(e.message);root.querySelector('#communityRetry').onclick=()=>route();}}
  if(scroll&&current===epoch&&root.isConnected){root.scrollIntoView({behavior:window.wordylandMotion.allowed()?'smooth':'instant',block:'start'});root.querySelector('h2')?.focus({preventScroll:true});}
 }
 function signIn(title,description){root.innerHTML=heading('ACCESSO AL TUO ACCOUNT',title,description)+'<button class="primary" id="communityLogin">Accedi o crea un account adulto</button><p id="communityStatus" role="status"></p>';root.querySelector('button').onclick=openAccount;}
 async function classroom(current){
  if(!info().username){signIn('Crea la tua classe.','Accedi con un account adulto. Poi crea il gruppo e condividi il suo link con gli alunni.');return;}
  if(info().role==='learner'){root.innerHTML=heading('LA TUA CLASSE','La classe è già collegata al tuo profilo.','Puoi scegliere un compagno tra gli iscritti alla stessa classe.')+'<a class="communityButton" href="#sfide">Vai alle sfide →</a>';return;}
  const data=await request('managed-classes');if(current!==epoch)return;
  root.innerHTML=heading('INSEGNANTI E GENITORI','Crea e gestisci la tua classe.','Gli alunni si iscrivono dal link della classe usando un soprannome. Le sfide restano tra compagni.')+'<div id="classProfileChoice"></div><form id="directClassForm"><label>Nome della classe<input name="name" maxlength="40" required placeholder="La nostra classe"></label><label class="adultCheck"><input type="checkbox" name="consent" required> Confermo la partecipazione del profilo con soprannome e avatar</label><button class="primary">Crea classe e ottieni il link</button></form><p id="communityStatus" role="status"></p><div class="managedClasses">'+(data.items.length?data.items.map(c=>'<article><h3>'+text(c.name)+'</h3><p>'+c.members+' partecipanti</p><button class="audio" data-share-class="'+c.id+'">Mostra link di iscrizione</button><div data-class-link="'+c.id+'"></div></article>').join(''):'<p>Non hai ancora creato una classe.</p>')+'</div><a class="communityButton" href="#sfide">Sfida un compagno →</a>';
  const form=root.querySelector('#directClassForm');form.hidden=!info().id;
  if(!info().id){const session=await request('session');if(current!==epoch)return;const slot=root.querySelector('#classProfileChoice');
   slot.innerHTML='<h3>Scegli il profilo che gestirà la classe</h3>'+(session.profiles.length?'<div class="profileList">'+session.profiles.map(p=>'<button class="audio" data-owner-profile="'+p.id+'">'+text(p.nickname)+'</button>').join('')+'</div>':'')+'<form id="classOwnerProfile"><label>Oppure crea un profilo con un soprannome<input name="nickname" maxlength="20" required placeholder="Insegnante"></label><button class="audio">Crea il profilo</button></form>';
   slot.querySelectorAll('[data-owner-profile]').forEach(b=>b.onclick=async()=>{const version=epoch,owner=info().username,controls=Array.from(slot.querySelectorAll('input,button'));controls.forEach(control=>control.disabled=true);try{await window.wordylandAccount.selectProfile(Number(b.dataset.ownerProfile));}catch(error){if(version===epoch&&owner===info().username&&slot.isConnected)formNotice(error.message,'error');}finally{if(slot.isConnected)controls.forEach(control=>control.disabled=false);}});
   let creatingProfile=false;slot.querySelector('form').onsubmit=async e=>{e.preventDefault();const form=e.currentTarget;if(creatingProfile||form.dataset.uncertain)return;creatingProfile=true;const version=epoch,owner=info().username,name=new FormData(form).get('nickname'),controls=Array.from(slot.querySelectorAll('input,button'));controls.forEach(control=>control.disabled=true);form.setAttribute('aria-busy','true');let uncertain=false;
    try{await window.wordylandAccount.createProfile(name);}catch(error){if(version!==epoch||owner!==info().username||!form.isConnected)return;if(!knownRejection(error)){uncertain=true;uncertainWrite(form,'La creazione del profilo non è stata confermata.','Verifica i miei profili');}else formNotice(error.message,'error');}finally{creatingProfile=false;if(slot.isConnected&&!uncertain){controls.forEach(control=>control.disabled=false);form.removeAttribute('aria-busy');}}
   };
  }else root.querySelector('#classProfileChoice').textContent='Profilo che gestirà la classe: '+info().nickname;
  let creating=false;
  form.onsubmit=async e=>{e.preventDefault();if(creating||form.dataset.uncertain)return;creating=true;const fields=new FormData(form),owner=info().username,version=epoch;const controls=Array.from(form.querySelectorAll('input,button'));controls.forEach(control=>control.disabled=true);form.setAttribute('aria-busy','true');let confirmed=false,uncertain=false;
   try{const created=await request('club-create',{profile:info().id,name:fields.get('name'),consent:fields.get('consent')==='on'});confirmed=true;if(version!==epoch||info().username!==owner)return;const refreshed=epoch+1;await route();if(refreshed!==epoch||info().username!==owner||location.hash!=='#classe-crea')return;const box=root.querySelector('[data-class-link="'+created.id+'"]');if(box){window.wordylandClassroom.share(created.code,box);formNotice('Classe creata. Ecco il link da condividere con gli alunni.');}else formNotice('Classe creata. L’elenco non si è aggiornato: riapri questa pagina per ritrovare il link.');}
   catch(error){if(version!==epoch||owner!==info().username||!form.isConnected)return;if(!knownRejection(error)){uncertain=true;uncertainWrite(form,confirmed?'La classe è stata creata, ma l’elenco non si è aggiornato.':'La creazione non è stata confermata.', 'Verifica le mie classi');}else formNotice(error.message,'error');}
   finally{creating=false;if(form.isConnected&&!uncertain){controls.forEach(control=>control.disabled=false);form.removeAttribute('aria-busy');}}
  };
  bindShares();
 }
 function bindShares(){root.querySelectorAll('[data-share-class]').forEach(b=>b.onclick=async()=>{const owner=info().username,current=epoch;b.disabled=true;try{const result=await request('class-link',{club:Number(b.dataset.shareClass)});if(current===epoch&&owner===info().username&&b.isConnected)window.wordylandClassroom.share(result.code,root.querySelector('[data-class-link="'+b.dataset.shareClass+'"]'));}catch(error){if(current===epoch&&owner===info().username&&b.isConnected)status(error.message);}finally{if(b.isConnected)b.disabled=false;}});}
 function pager(data,refresh){const box=root.querySelector('#communityPager');if(!box)return;box.innerHTML='<button class="audio" id="communityPrevious" '+(data.offset===0?'disabled':'')+'>← Precedenti</button><span>'+Math.min(data.offset+data.items.length,data.total)+' / '+data.total+'</span><button class="audio" id="communityNext" '+(data.offset+data.pageSize>=data.total?'disabled':'')+'>Successivi →</button>';box.querySelector('#communityPrevious').onclick=()=>{offset=Math.max(0,offset-data.pageSize);refresh();};box.querySelector('#communityNext').onclick=()=>{offset+=data.pageSize;refresh();};}
 async function reports(current,all){
  if(!info().username){signIn('Segnala un problema o proponi un’idea.','Accedi con il tuo account adulto o con il profilo della classe per inviare una segnalazione.');return;}
  const data=await request('feedback-list&scope='+(all?'all':'mine')+'&offset='+offset);if(current!==epoch)return;
  root.innerHTML=(all?heading('AMMINISTRAZIONE','Bug e suggerimenti della community.','Le segnalazioni sono visibili agli autori e all’amministratore.')+adminTabs():heading('COSTRUIAMO WORDYLAND INSIEME','Idee e segnalazioni.','Raccontaci cosa miglioreresti o cosa non funziona. Qui puoi seguire lo stato dei tuoi invii.'))+(!all?'<form id="feedbackForm"><label>Che cosa vuoi inviare?<select name="kind"><option value="bug">Un problema / bug</option><option value="idea">Un’idea per migliorare</option></select></label><label>Titolo<input name="title" minlength="3" maxlength="100" required></label><label>Dove succede?<select name="screen"><option value="island">Isola e gioco</option><option value="lessons">Esercizi</option><option value="arena">Sfide</option><option value="classroom">Classe e iscrizione</option><option value="feedback">Segnalazioni</option></select></label><label>Descrizione<textarea name="body" minlength="5" maxlength="2000" rows="4" required placeholder="Spiega cosa succede o la tua idea"></textarea></label><p class="hint">Non servono password o nomi completi degli alunni.</p><button class="primary">Invia segnalazione</button></form>':'')+'<p id="communityStatus" role="status"></p><div class="feedbackList">'+(data.items.length?data.items.map(f=>'<article><small>'+(f.kind==='bug'?'🐞 Problema':'💡 Suggerimento')+' · #'+f.id+' · '+text(statuses[f.status])+'</small><h3>'+text(f.title)+'</h3><p class="feedbackBody">'+text(f.body)+'</p>'+(all?'<p class="hint">Da '+text(f.nickname||f.username||'Account rimosso')+' · '+text(f.screen)+'</p><label>Stato<select data-feedback-state="'+f.id+'">'+Object.entries(statuses).map(([value,name])=>'<option value="'+value+'" '+(f.status===value?'selected':'')+'>'+name+'</option>').join('')+'</select></label>':'')+'</article>').join(''):'<p>Non ci sono ancora segnalazioni.</p>')+'</div><div id="communityPager" class="communityPager"></div>';
  let sending=false;
  root.querySelector('#feedbackForm')?.addEventListener('submit',async e=>{e.preventDefault();if(sending||e.currentTarget.dataset.uncertain)return;sending=true;const form=e.currentTarget,fields=Object.fromEntries(new FormData(form)),owner=info().username,version=epoch,controls=Array.from(form.querySelectorAll('input,select,textarea,button'));controls.forEach(control=>control.disabled=true);form.setAttribute('aria-busy','true');let uncertain=false;
   try{await request('feedback-create',{...fields,profile:info().id||undefined});if(version!==epoch||owner!==info().username)return;offset=0;const refreshed=epoch+1;await route();if(refreshed===epoch&&owner===info().username&&location.hash==='#segnalazioni')formNotice(root.querySelector('.feedbackList')?'Segnalazione inviata. Grazie per il tuo aiuto!':'Segnalazione inviata. L’elenco non si è aggiornato: riapri questa pagina per controllarlo.');}
   catch(error){if(version!==epoch||owner!==info().username||!form.isConnected)return;if(!knownRejection(error)){uncertain=true;uncertainWrite(form,'L’invio non è stato confermato.','Verifica le mie segnalazioni');}else formNotice(error.message,'error');}
   finally{sending=false;if(form.isConnected&&!uncertain){controls.forEach(control=>control.disabled=false);form.removeAttribute('aria-busy');}}
  });
  root.querySelectorAll('[data-feedback-state]').forEach(select=>{let confirmed=select.value;select.onchange=async()=>{const owner=info().username,version=epoch,chosen=select.value;select.disabled=true;try{await request('feedback-status',{id:Number(select.dataset.feedbackState),status:chosen});if(version===epoch&&owner===info().username&&select.isConnected){confirmed=chosen;formNotice('Stato aggiornato.');}}catch(error){if(version===epoch&&owner===info().username&&select.isConnected){select.value=confirmed;formNotice(knownRejection(error)?error.message:error.message+' Lo stato mostrato è l’ultimo confermato: riapri l’elenco per controllare.','error');}}finally{if(select.isConnected)select.disabled=false;}};});
  if(all)bindAdminTabs();pager(data,()=>all?refreshAdmin():route());
 }
 function adminTabs(){return '<nav class="adminTabs" aria-label="Dati amministratore">'+Object.entries({accounts:'Account',profiles:'Profili',classes:'Classi',duels:'Sfide',feedback:'Bug e idee'}).map(([id,label])=>'<button class="audio" data-admin-view="'+id+'" aria-pressed="'+(adminView===id)+'">'+label+'</button>').join('')+'</nav>';}
 function refreshAdmin(){const current=++epoch,owner=info().username;return admin(current).catch(error=>{if(current===epoch&&owner===info().username)formNotice(error.message,'error');});}
 function bindAdminTabs(){root.querySelectorAll('[data-admin-view]').forEach(b=>b.onclick=()=>{adminView=b.dataset.adminView;adminSearch='';offset=0;refreshAdmin();});}
 function adminSearchForm(data,label){
  const placeholders={accounts:'Email o nome utente',profiles:'Soprannome o account',classes:'Nome della classe o proprietario',duels:'Giocatore, compagno, tema o stato'};
  return '<form id="adminSearchForm" class="adminSearchForm" role="search"><label>Cerca in '+label.toLowerCase()+'<input type="search" name="query" maxlength="80" value="'+text(adminSearch)+'" placeholder="'+placeholders[adminView]+'" autocomplete="off"></label><button class="audio">Cerca</button>'+(adminSearch?'<button type="button" class="audio" id="adminSearchClear">Mostra tutti</button>':'')+'</form><p id="adminResultCount" role="status">'+data.total+' '+(adminSearch?(data.total===1?'risultato':'risultati')+' per «'+text(adminSearch)+'»':label.toLowerCase())+'.</p>';
 }
 function bindAdminSearch(){
  const form=root.querySelector('#adminSearchForm');if(!form)return;
  let pending=false;
  const run=async query=>{if(pending)return;pending=true;const previousQuery=adminSearch,previousOffset=offset;adminSearch=query.trim();offset=0;const owner=info().username,current=++epoch;form.setAttribute('aria-busy','true');form.querySelectorAll('input,button').forEach(el=>el.disabled=true);
   try{await admin(current);if(current===epoch&&owner===info().username){root.querySelector('#adminResultCount')?.scrollIntoView({block:'nearest'});root.querySelector('#adminSearchForm input')?.focus({preventScroll:true});}}
   catch(error){if(current===epoch&&owner===info().username&&form.isConnected){adminSearch=previousQuery;offset=previousOffset;formNotice(error.message+' L’elenco mostrato resta quello dell’ultima ricerca riuscita.','error');}}
   finally{pending=false;if(form.isConnected){form.removeAttribute('aria-busy');form.querySelectorAll('input,button').forEach(el=>el.disabled=false);}}
  };
  form.onsubmit=e=>{e.preventDefault();run(new FormData(form).get('query')||'');};root.querySelector('#adminSearchClear')?.addEventListener('click',()=>run(''));
 }
 function uncertainWrite(form,message,verifyLabel){
  form.dataset.uncertain='true';form.setAttribute('aria-busy','false');form.querySelectorAll('input,select,textarea,button').forEach(control=>control.disabled=true);
  status(message+' Verifica l’elenco prima di inviare di nuovo.');const notice=root.querySelector('#communityStatus');if(notice){notice.classList.add('formFeedback');notice.dataset.state='error';notice.tabIndex=-1;notice.focus({preventScroll:true});const verify=document.createElement('button');verify.type='button';verify.className='audio';verify.textContent=verifyLabel;verify.onclick=()=>route(true);notice.after(verify);}
 }
 const knownRejection=error=>Number.isInteger(error.code)&&error.code>=400&&error.code<500;
 function formNotice(message,state='success'){status(message);const notice=root.querySelector('#communityStatus');if(notice){notice.classList.add('formFeedback');notice.dataset.state=state;notice.tabIndex=-1;notice.focus({preventScroll:true});notice.scrollIntoView({block:'nearest'});}}

 function enrollmentForm(data,classes){
  if(!data.items.length)return '';
  if(!classes.length)return '<p>Per iscrivere un profilo, <a href="#classe-crea">crea prima una classe</a>.</p>';
  return '<form class="adminEnrollmentForm" id="adminEnrollmentForm"><h3>Iscrivi un profilo esistente</h3><p>Il profilo mantiene account, password e progressi. Scegli il soprannome e controlla l’account associato.</p><p class="hint">Il selettore mostra i profili di questa pagina. Usa la ricerca qui sopra per trovare un alunno anche nelle altre pagine.</p><label>Profilo<select name="member" required><option value="">Scegli un profilo</option>'+data.items.map(p=>'<option value="'+p.id+'">'+text(p.nickname)+' · '+text(p.username)+'</option>').join('')+'</select></label><label>Classe<select name="club" required><option value="">Scegli una classe</option>'+classes.map(c=>'<option value="'+c.id+'">'+text(c.name)+' · '+text(c.owner)+'</option>').join('')+'</select></label><label class="adultCheck"><input type="checkbox" name="consent" required> Confermo la partecipazione del profilo con soprannome, avatar e punti.</label><button class="primary">Iscrivi il profilo</button><p id="adminEnrollmentStatus" class="formFeedback" role="status" tabindex="-1"></p></form>';
 }
 function bindEnrollment(){
  const form=root.querySelector('#adminEnrollmentForm');if(!form)return;
  let pending=false;
  form.onsubmit=async e=>{
   e.preventDefault();if(pending)return;
   const fields=new FormData(form),owner=info().username,version=epoch,button=form.querySelector('button'),feedback=form.querySelector('#adminEnrollmentStatus');
   const controls=Array.from(form.querySelectorAll('input,select,button'));
   pending=true;controls.forEach(control=>control.disabled=true);form.setAttribute('aria-busy','true');feedback.textContent='Iscrizione in corso…';feedback.removeAttribute('data-state');
   try{
    const result=await request('admin-class-add',{member:Number(fields.get('member')),club:Number(fields.get('club')),consent:fields.get('consent')==='on'});
    if(version!==epoch||owner!==info().username||!form.isConnected)return;
    const refreshed=++epoch;
    try{await admin(refreshed);}catch(refreshError){
     if(refreshed===epoch&&owner===info().username&&form.isConnected){feedback.textContent='Iscrizione confermata. L’elenco non si è aggiornato: riapri Profili per controllarlo.';feedback.dataset.state='success';feedback.focus({preventScroll:true});}
     return;
    }
    if(refreshed!==epoch||owner!==info().username)return;
    status(result.nickname+(result.added?' è ora iscritto a ':' è già iscritto a ')+result.className+'.');
    const notice=root.querySelector('#communityStatus');if(notice){notice.classList.add('formFeedback');notice.dataset.state='success';notice.tabIndex=-1;notice.focus({preventScroll:true});notice.scrollIntoView({block:'nearest'});}
   }catch(error){if(version===epoch&&owner===info().username&&form.isConnected){feedback.textContent=error.message;feedback.dataset.state='error';feedback.focus({preventScroll:true});}}
   finally{pending=false;if(form.isConnected){controls.forEach(control=>control.disabled=false);form.removeAttribute('aria-busy');}}
  };
 }
 async function admin(current){
  if(!info().username){signIn('Accedi all’amministrazione.','Usa il tuo account amministratore.');return;}
  if(info().role!=='admin'){root.innerHTML=heading('AMMINISTRAZIONE','Questo account non ha i permessi amministratore.','La gestione completa è disponibile soltanto agli account abilitati dal proprietario del sito.')+'<p id="communityStatus" role="status"></p>';return;}
  if(adminView==='feedback'){await reports(current,true);return;}
  const data=await request('admin-overview&view='+adminView+'&offset='+offset+'&q='+encodeURIComponent(adminSearch));if(current!==epoch)return;
  const classes=[];
  if(adminView==='profiles'){
   let classOffset=0;
   do{const page=await request('admin-overview&view=classes&offset='+classOffset);if(current!==epoch)return;classes.push(...page.items);classOffset+=page.items.length;if(!page.items.length||classOffset>=page.total)break;}while(true);
  }
  const labels={accounts:'Account',profiles:'Profili',classes:'Classi',duels:'Sfide',feedback:'Segnalazioni'};
  const columns={accounts:{id:'ID',username:'Email / utente',role:'Ruolo',profiles:'Profili'},profiles:{id:'ID',nickname:'Soprannome',username:'Account',role:'Ruolo',xp:'XP',coins:'Monete',classes:'Classi'},classes:{id:'ID',name:'Classe',owner:'Proprietario',members:'Partecipanti'},duels:{id:'ID',challenger:'Giocatore',opponent:'Compagno',category:'Tema',state:'Stato'}}[adminView];
  root.innerHTML=heading('SUPER AMMINISTRATORE','Tutta WordyLand, in un solo posto.','Account, profili, classi, sfide e segnalazioni. I privilegi sono verificati dal server.')+'<a class="communityButton" href="#iscritti">Vedi iscritti e chi è online →</a>'+(newRecovery?'<div class="recoveryNotice"><b>Conserva il nuovo codice di recupero in un luogo sicuro.</b><code>'+text(newRecovery)+'</code><button class="audio" id="hideAdminRecovery">L’ho conservato</button></div>':'')+'<div class="adminStats">'+Object.entries(data.summary).map(([id,count])=>'<span><b>'+count+'</b>'+labels[id]+'</span>').join('')+'</div>'+adminTabs()+adminSearchForm(data,labels[adminView])+'<p id="communityStatus" role="status"></p>'+(adminView==='profiles'?enrollmentForm(data,classes):'')+'<div class="communityTable" tabindex="0" role="region" aria-label="Tabella '+labels[adminView]+'"><table><thead><tr>'+Object.values(columns).map(name=>'<th>'+name+'</th>').join('')+(adminView==='classes'?'<th>Iscrizioni</th>':'')+'</tr></thead><tbody>'+(data.items.length?data.items.map(row=>'<tr>'+Object.keys(columns).map(id=>'<td>'+text(row[id])+'</td>').join('')+(adminView==='classes'?'<td><button class="audio" data-share-class="'+row.id+'">Mostra link</button><div data-class-link="'+row.id+'"></div></td>':'')+'</tr>').join(''):'<tr><td colspan="'+(Object.keys(columns).length+(adminView==='classes'?1:0))+'">Nessun risultato. Prova un altro nome o scegli “Mostra tutti”.</td></tr>')+'</tbody></table></div><div id="communityPager" class="communityPager"></div>';
  if(newRecovery&&!recoveryAnnounced){recoveryAnnounced=true;const notice=root.querySelector('.recoveryNotice');if(notice){notice.setAttribute('role','region');notice.setAttribute('aria-label','Codice di recupero amministratore');notice.tabIndex=-1;notice.focus({preventScroll:true});notice.scrollIntoView({block:'center'});}}
  root.querySelector('#hideAdminRecovery')?.addEventListener('click',async()=>{newRecovery=null;recoveryAnnounced=false;await route();root.querySelector('h2')?.focus({preventScroll:true});});bindAdminTabs();bindAdminSearch();bindShares();bindEnrollment();pager(data,refreshAdmin);
 }
 function activation(){
  root.innerHTML=heading('PRIMO ACCESSO PRIVATO','Attiva il tuo accesso amministratore.','Scegli la password del tuo account. Il link di attivazione è utilizzabile una sola volta.')+'<form id="activateAdmin"><label>Email<input name="username" type="email" value="luca@perrone.it" readonly></label><label>Nuova password<input name="password" type="password" minlength="12" maxlength="72" autocomplete="new-password" required></label><button class="primary">Attiva e accedi</button></form><p id="communityStatus" role="status"></p>';
  root.querySelector('form').onsubmit=async e=>{e.preventDefault();const fields=Object.fromEntries(new FormData(e.currentTarget));e.submitter.disabled=true;try{const recovered=await request('recover',{...fields,code:activationCode});activationCode=null;newRecovery=recovered.recovery;await window.wordylandAccount.connect(await request('login',fields));await route();}catch(error){status(error.message);if(e.submitter.isConnected)e.submitter.disabled=false;}};
 }
 document.addEventListener('click',e=>{const link=e.target.closest('.serviceNav a,.startChoices a,.prepositionsFeature,.lessonShortcut');if(link&&link.hash===location.hash&&!e.defaultPrevented){e.preventDefault();offset=0;route(true);}});
 window.addEventListener('wordyland-play-view',()=>{document.body.classList.remove('communityPage');root.hidden=true;document.querySelector('.questHub').hidden=false;navigation();});
 window.addEventListener('hashchange',()=>{offset=0;route(true);});
 window.addEventListener('wordyland-profile',()=>route());
 window.wordylandAccount.ready.then(()=>route(true));
})();
