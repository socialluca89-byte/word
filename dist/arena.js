/* Private, turn-based duels. Only server results determine the score. */
(() => {
  const categories={body:'Il corpo',catpositions:'Preposizioni · Gatto e scatola',toys:'Giocattoli',colors:'Colori',hello:'Presentiamoci',school:'A scuola',home:'Casa',animals:'Animali',transport:'Veicoli',sport:'Calcio e sport',space:'Spazio',ocean:'Oceano',dino:'Dinosauri'};
  Object.assign(categories,Object.fromEntries(Object.entries(lessonTopics).map(([id,t])=>[id,t.name])));
  const modes={kart:'🏎️ Kart',football:'⚽ Calcio',space:'🚀 Spazio'};
  const avatars={fox:'🦊',panda:'🐼',robot:'🤖',dragon:'🐉',octopus:'🐙',lion:'🦁'};
  const text=value=>String(value??'').replace(/[&<>"']/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]));
  window.wordylandArena={mount(host,profile,openAdults,resumeId=null){
    let data={opponents:[],duels:[],classes:[]},busy=false,playing=false,sceneView=null,renderedDuels='',renderedOpponents='',loading=null,questionSpeech=null;
    const valid=()=>host.isConnected&&window.wordylandAccount.info().id===profile.id;
    const request=(action,body)=>window.wordylandAccount.request(action,body===undefined?undefined:{...body,profile:profile.id});
    const stopQuestionAudio=()=>{const owned=questionSpeech;questionSpeech=null;if(owned&&'speechSynthesis'in window)speechSynthesis.cancel();};
    const status=message=>{if(valid()){const e=host.querySelector('#arenaStatus');if(e)e.textContent=message;}};
    if(!profile.id){
      host.innerHTML='<div class="arenaGuest"><span class="arenaSymbol" aria-hidden="true">⚔️</span><span class="questEyebrow">MEGLIO IN COMPAGNIA</span><h3>La prossima sfida è con la tua classe.</h3><p>Entra nel gruppo della tua classe con il codice condiviso dall’insegnante o da un adulto. Poi scegli un compagno e giocate insieme.</p><div class="arenaRules"><span>Fino a 5 domande uguali</span><span>10 punti per risposta</span><span>Ognuno al suo ritmo</span></div><button class="primary" id="arenaLogin">Scegli il tuo profilo →</button></div>';
      host.querySelector('#arenaLogin').onclick=openAdults;return;
    }
    function draw(){
      stopQuestionAudio();
      window.wordylandUI?.play();
      sceneView?.dispose();sceneView=null;
      const incoming=data.duels.filter(d=>d.state==='pending'&&d.incoming).length;
      const readyCount=data.opponents.filter(p=>p.presence==='ready').length;
      const opponents=data.opponents;
      const avatar=p=>Object.hasOwn(avatars,p?.equipped?.avatar)?p.equipped.avatar:'fox';
      host.innerHTML='<div class="arenaHeading"><div><span class="questEyebrow">LE AVVENTURE DELLA TUA CLASSE</span><h3>Kart, calcio o spazio?</h3><p>Stesse domande, nessun cronometro. Vince chi trova più risposte!</p></div><span class="arenaSymbol" aria-hidden="true">⚔️</span></div><div class="arenaRules"><span>✦ Fino a 5 domande</span><span>✦ 10 punti per risposta</span><span>✦ Inviti validi 7 giorni</span></div><div class="arenaLayout"><section class="rivalPicker"><h4>Quale compagno vuoi sfidare?</h4><p>Qui trovi soltanto i compagni iscritti alle tue classi. I pronti a giocare compaiono per primi.</p><p><a href="#iscritti">Vedi tutti gli iscritti e chi è online →</a></p>'+(opponents.length?'<form id="duelInvite"><div class="rivalList">'+opponents.map((p,i)=>'<label class="rivalCard"><input type="radio" name="opponent" value="'+p.id+'" '+(i===0?'checked':'')+' required><span class="rivalAvatar racerModel" data-racer="'+avatar(p)+'" aria-hidden="true"></span><span><b>'+text(p.nickname)+'</b><small>'+text((p.classes||[]).join(' · ')||'La tua classe')+'</small><span data-opponent-state="'+p.id+'">'+window.wordylandPresence.badge(p.presence)+'</span></span><span class="rivalCheck" aria-hidden="true">✓</span></label>').join('')+'</div><label for="duelTopic">Su cosa giochiamo?</label><select id="duelTopic" name="category">'+Object.entries(categories).map(([k,v])=>'<option value="'+k+'">'+v+'</option>').join('')+'</select><label for="duelActivity">Come giochiamo?</label><select id="duelActivity" name="activity" class="duelActivitySelect">'+Object.entries(modes).map(([id,name])=>'<option value="'+id+'">'+name+'</option>').join('')+'</select><button class="primary" type="submit">Lancia la sfida ⚡</button></form>':'<div class="arenaEmpty"><span aria-hidden="true">🫶</span><b>La tua classe ti aspetta!</b><p>Chiedi il codice della classe all’insegnante. Nell’area adulti puoi entrare nella classe oppure crearne una e invitare i compagni.</p><button class="audio" id="arenaFriends">Entra nella tua classe →</button></div>')+'</section><section class="duelInbox"><div class="duelListHeading"><h4>Le tue sfide <span data-duel-count>'+data.duels.filter(d=>['pending','active'].includes(d.state)).length+'</span></h4><button class="audio" id="arenaRefresh" aria-label="Aggiorna le sfide">↻ Aggiorna</button></div><p class="hint">L’altro giocatore può rispondere anche più tardi. Inviti e stati si aggiornano automaticamente mentre questa schermata è aperta.</p><div class="duelList">'+(data.duels.length?data.duels.map(card).join(''):'<div class="arenaEmpty"><span aria-hidden="true">🏁</span><b>La prima sfida non si scorda.</b><p>Scegli un compagno e inviagli un invito. La partita apparirà qui.</p></div>')+'</div></section></div><p id="arenaStatus" role="status" aria-live="polite"></p><section id="duelStage" class="duelStage" aria-label="La tua partita" hidden></section>';
      const summary=document.createElement('div');summary.className='arenaSummary';summary.setAttribute('role','status');summary.textContent=incoming?incoming+' inviti da aprire · guarda Le tue sfide':readyCount?readyCount+' compagni pronti a giocare':'Le sfide sono a turni: il compagno può rispondere anche dopo.';host.querySelector('.arenaHeading').after(summary);
      const classLink=document.querySelector('.startChoices a[href="#sfide"] small');if(classLink)classLink.textContent=incoming?incoming+' inviti ricevuti · apri le tue sfide':'Guarda chi è online e scegli un compagno';
      window.wordylandPresence.mountControls(host);
      host.querySelector('#arenaFriends')?.addEventListener('click',openAdults);
      host.querySelector('#arenaRefresh').onclick=()=>load();
      host.querySelector('#duelInvite')?.addEventListener('submit',e=>{
        e.preventDefault();const f=new FormData(e.currentTarget);
        act('duel-create',{opponent:Number(f.get('opponent')),category:f.get('category'),activity:f.get('activity')},'Invito inviato! Ora tocca al tuo compagno accettare.');
      });
      renderedDuels=JSON.stringify(data.duels);renderedOpponents=JSON.stringify(data.opponents.map(p=>p.id));bindDuels();
    }
    function bindDuels(){
      host.querySelectorAll('[data-duel-action]').forEach(button=>button.onclick=()=>{
        const d=data.duels.find(x=>x.id===button.dataset.duel);
        const action=button.dataset.duelAction;
        if(action==='play')return open(d.id);
        if(action==='rematch')return act('duel-create',{opponent:d.opponent,category:d.category,activity:d.activity},'Rivincita proposta!');
        act(action,{duel:d.id},action==='duel-accept'?'Sfida accettata! Scegli Gioca per iniziare.':'Invito chiuso.');
      });
    }
    function card(d){
      const incoming=d.incoming,done=d.step===d.total;
      const labels={pending:incoming?'Ti ha invitato!':'Invito inviato',active:done?'Aspettiamo il tuo compagno':'È il tuo turno',completed:'Sfida conclusa',declined:'Invito rifiutato',cancelled:'Invito annullato',expired:'Invito scaduto'};
      const button=(label,action,primary=false)=>'<button class="'+(primary?'primary':'audio')+'" data-duel="'+d.id+'" data-duel-action="'+action+'">'+label+'</button>';
      let actions='',score='';
      if(d.state==='pending')actions=incoming?button('Accetta ⚡','duel-accept',true)+button('Non ora','duel-decline'):button('Annulla invito','duel-cancel');
      if(d.state==='active'&&!done)actions=button(d.step?'Riprendi →':'Gioca →','play',true);
      if(d.state==='active'&&done)score='<p class="duelScore">Tu: <b>'+d.score+'</b><small>Il risultato arriva quando avete finito entrambi.</small></p>';
      if(d.state==='completed'){
        const win=d.score>d.rivalScore,tie=d.score===d.rivalScore;
        score='<div class="duelScore"><b>'+d.score+' <span>—</span> '+d.rivalScore+'</b><small>'+(tie?'Pari merito. Bravissimi tutti e due!':win?'Hai vinto questa sfida! ✨':'Questa volta ha vinto '+text(d.nickname)+'. Si riprova!')+'</small></div>';
        actions=button('Rivincita ↗','rematch');
      }
      return '<article class="duelCard '+(d.state==='completed'?'duelComplete':'')+'"><span class="duelBadge">'+labels[d.state]+'</span><h5>Tu <span>vs</span> '+text(d.nickname)+'</h5><p>'+text(modes[d.activity]||modes.kart)+' · '+text(categories[d.category])+' · '+d.total+' domande'+(d.state==='active'?' · '+d.step+'/'+d.total+' completate':'')+'</p>'+score+'<div class="duelActions">'+actions+'</div></article>';
    }
    async function load(message='',quiet=false){
      if(busy||playing)return;busy=true;
      let finished;loading=new Promise(resolve=>finished=resolve);
      try{const result=await request('arena&profile='+profile.id);if(!valid())return;data=result;
        const summary=host.querySelector('.arenaSummary'),incoming=data.duels.filter(d=>d.state==='pending'&&d.incoming).length,readyCount=data.opponents.filter(p=>p.presence==='ready').length;
        if(summary)summary.textContent=incoming?incoming+' inviti da aprire · guarda Le tue sfide':readyCount?readyCount+' compagni pronti a giocare':'Le sfide sono a turni: il compagno può rispondere anche dopo.';
        const classHint=document.querySelector('.startChoices a[href="#sfide"] small');if(classHint)classHint.textContent=incoming?incoming+' inviti ricevuti · apri le tue sfide':'Guarda chi è online e scegli un compagno';
        if(quiet&&host.querySelector('#arenaRefresh')){
        host.querySelectorAll('[data-opponent-state]').forEach(node=>{const person=data.opponents.find(p=>String(p.id)===node.dataset.opponentState);node.innerHTML=window.wordylandPresence.badge(person?.presence||'offline');});
        const inbox=host.querySelector('.duelInbox');if(renderedDuels!==JSON.stringify(data.duels)&&!inbox.contains(document.activeElement)){host.querySelector('.duelList').innerHTML=data.duels.map(card).join('')||'<p>Non hai ancora sfide.</p>';host.querySelector('[data-duel-count]').textContent=data.duels.filter(d=>['pending','active'].includes(d.state)).length;renderedDuels=JSON.stringify(data.duels);bindDuels();}
        if(renderedOpponents!==JSON.stringify(data.opponents.map(p=>p.id))&&!host.contains(document.activeElement)){const form=host.querySelector('#duelInvite'),values=form?Object.fromEntries(new FormData(form)):{};draw();for(const [key,value] of Object.entries(values)){const input=host.querySelector('[name="'+key+'"]');if(input?.type==='radio'){const radio=host.querySelector('[name=opponent][value="'+Number(value)+'"]');if(radio)radio.checked=true;}else if(input)input.value=value;}}
        return;
      }draw();status(message);}
      catch(e){if(quiet&&valid())host.querySelectorAll('[data-opponent-state]').forEach(node=>node.innerHTML=window.wordylandPresence.badge('unknown'));if(valid()&&!host.querySelector('#arenaRefresh')){host.innerHTML='<div class="arenaEmpty"><h3>Le sfide si fanno attendere.</h3><p id="arenaStatus" role="status"></p><button id="arenaRetry" class="audio">Riprova</button></div>';host.querySelector('#arenaRetry').onclick=()=>load();}status(e.message);}
      finally{busy=false;loading=null;finished();}
    }
    async function act(action,payload,message){
      // A status refresh must not swallow a deliberate invite/accept action.
      if(loading)await loading;
      if(busy||!valid())return;busy=true;host.querySelectorAll('button').forEach(b=>b.disabled=true);
      try{await request(action,payload);if(!valid())return;window.dispatchEvent(new Event('wordyland-progress-saved'));busy=false;await load(message);}
      catch(e){status(e.message);if(valid())host.querySelectorAll('button').forEach(b=>b.disabled=false);}
      finally{busy=false;}
    }
    async function open(id){
      if(loading)await loading;
      if(busy||!valid())return;busy=true;
      try{const result=await request('duel&profile='+profile.id+'&duel='+encodeURIComponent(id));if(!valid())return;
        if(!result.question){busy=false;await load('Questa partita è già terminata oppure non è ancora iniziata.');return;}
        playing=true;showQuestion(result);host.querySelector('#duelStage').scrollIntoView({behavior:'smooth',block:'center'});
      }catch(e){status(e.message);}finally{busy=false;}
    }
    function showQuestion(result,feedback=''){
      if(!valid())return;stopQuestionAudio();window.wordylandUI?.play('duel');
      const stage=host.querySelector('#duelStage'),d=result.duel,q=result.question;
      const previousWorld=stage.querySelector('#duelWorld');if(!previousWorld){sceneView?.dispose();sceneView=null;}
      stage.hidden=false;
      host.querySelector('.arenaLayout').hidden=true;
      stage.innerHTML='<div class="duelStageTop"><span class="duelBadge">TU vs '+text(d.nickname)+'</span><button class="audio" id="duelBack">⏸ Pausa</button></div><div class="duelWorld" id="duelWorld"><span class="sceneFallback">'+({football:'⚽',space:'🚀'}[d.activity]||'🏎️')+'</span><span class="worldProgressLabel">'+text(modes[d.activity]||modes.kart)+'</span></div><p class="duelSaveNote">Ogni risposta confermata è salvata automaticamente. Puoi chiudere e riprendere con lo stesso profilo.</p><p class="duelScoreNote">Il tuo mondo avanza con le risposte corrette. Il punteggio del compagno si scopre quando avete finito entrambi.</p><div class="duelProgress"><span>Domanda '+q.number+' di '+d.total+'</span><b>'+d.score+' punti</b></div><div class="questTrack"><i style="width:'+(d.step/d.total*100)+'%"></i></div><span class="duelEmoji" aria-hidden="true">'+text(q.emoji)+'</span><h3>Come si dice «'+text(q.translation)+'»?</h3><p>Scegli la parola in inglese.</p><div class="duelOptions">'+q.options.map((answer,i)=>'<button data-duel-answer="'+i+'"><span>'+String.fromCharCode(65+i)+'</span>'+text(answer)+'</button>').join('')+'</div><div id="duelFeedback" role="status" aria-live="polite">'+text(feedback)+'</div>';
      if(previousWorld)stage.querySelector('#duelWorld').replaceWith(previousWorld);
      else sceneView=window.wordylandIsland.mount(stage.querySelector('#duelWorld'),{kind:d.activity||'kart',progress:d.score/(d.total*10)});
      stage.querySelector('#duelBack').onclick=()=>{if(busy)return;stopQuestionAudio();window.wordylandUI?.play();playing=false;load('Le risposte confermate sono salvate. Puoi riprendere la sfida quando vuoi.');};
      const listen=document.createElement('button');listen.type='button';listen.className='audio';listen.id='duelListen';listen.textContent='🔊 Ascolta la domanda';listen.onclick=()=>{if(!('speechSynthesis'in window)){stage.querySelector('#duelFeedback').textContent='La voce non è disponibile. Puoi leggere la domanda.';return;}speechSynthesis.cancel();const voice=new SpeechSynthesisUtterance('Come si dice '+q.translation+' in inglese?');voice.lang='it-IT';voice.rate=.85;questionSpeech=voice;voice.onend=()=>{if(questionSpeech===voice)questionSpeech=null;};voice.onerror=()=>{if(questionSpeech!==voice)return;questionSpeech=null;if(valid()&&listen.isConnected)stage.querySelector('#duelFeedback').textContent='La voce non è disponibile. Puoi leggere la domanda.';};speechSynthesis.speak(voice);};stage.querySelector('.duelOptions').before(listen);
      stage.querySelectorAll('[data-duel-answer]').forEach(b=>b.onclick=async()=>{
        if(busy)return;stopQuestionAudio();busy=true;stage.querySelectorAll('button').forEach(x=>x.disabled=true);
        try{
          const next=await request('duel-answer',{duel:d.id,step:d.step,answer:Number(b.dataset.duelAnswer)});
          if(!valid())return;window.dispatchEvent(new Event('wordyland-progress-saved'));
          window.wordylandLearning.show(stage.querySelector('#duelFeedback'),next.correct,{expected:next.correctAnswer,answer:q.options[Number(b.dataset.duelAnswer)],word:next.correctAnswer,translation:q.translation,kind:'choice',retry:false,button:b,message:'Hai trovato la parola! +10 punti per te.'});
          sceneView?.update({progress:next.duel.score/(d.total*10)});
          sceneView?.react(next.correct?(!next.question?'complete':'success'):'retry');

          if(!next.question)window.dispatchEvent(new CustomEvent('wordyland-celebrate'));
          const continueButton=document.createElement('button');continueButton.className='primary';continueButton.textContent=next.question?'Prossima domanda →':'Guarda il risultato →';
          continueButton.onclick=async()=>{if(busy)return;if(next.question)showQuestion(next);else{playing=false;await load(next.duel.state==='completed'?'Sfida conclusa! Guarda il risultato qui sotto.':'Hai finito! Il tuo punteggio è salvato: aspettiamo il tuo compagno.');}};
          stage.append(continueButton);
          stage.querySelector('#duelBack').disabled=false;
        }catch(e){if(!valid())return;stage.querySelector('#duelFeedback').textContent=e.message+' Prima di rispondere di nuovo, premi Riprendi dal salvataggio per controllare a che punto sei.';stage.querySelector('#duelBack').disabled=false;const retry=document.createElement('button');retry.className='audio';retry.textContent='Riprendi dal salvataggio';retry.onclick=()=>open(d.id);stage.append(retry);}
        finally{busy=false;}
      });
    }
    const refreshPresence=()=>{if(valid()&&!host.closest('[hidden]')&&document.visibilityState==='visible'&&navigator.onLine)load('',true);};window.addEventListener('wordyland-presence',refreshPresence);const removed=new MutationObserver(()=>{if(!valid()){stopQuestionAudio();sceneView?.dispose();sceneView=null;removed.disconnect();window.removeEventListener('wordyland-presence',refreshPresence);}});removed.observe(document.querySelector('main'),{childList:true,subtree:true});
    host.innerHTML='<div class="arenaEmpty"><h3>Prepariamo l’arena…</h3><p id="arenaStatus" role="status"></p></div>';load().then(()=>{if(resumeId&&valid()&&host.querySelector('#duelStage'))open(resumeId);});
  }};
  document.addEventListener('click',e=>{
    const action=e.target.closest('[data-jump]')?.dataset.jump;if(!action)return;
    document.querySelector('[data-tab="'+action+'"]')?.click();
    document.querySelector('.questHub')?.scrollIntoView({behavior:'smooth',block:'start'});
  });
})();
