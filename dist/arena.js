/* Private, turn-based duels. Only server results determine the score. */
(() => {
  const categories={body:'Il corpo',catpositions:'Gatto e scatola',toys:'Giocattoli',colors:'Colori',hello:'Presentiamoci',school:'A scuola'};
  const avatars={fox:'🦊',panda:'🐼',robot:'🤖',dragon:'🐉',octopus:'🐙',lion:'🦁'};
  const text=value=>String(value??'').replace(/[&<>"']/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]));
  window.wordylandArena={mount(host,profile,openAdults){
    let data={opponents:[],duels:[],classes:[]},busy=false,playing=false;
    const valid=()=>host.isConnected&&window.wordylandAccount.info().id===profile.id;
    const request=(action,body)=>window.wordylandAccount.request(action,body===undefined?undefined:{...body,profile:profile.id});
    const status=message=>{if(valid()){const e=host.querySelector('#arenaStatus');if(e)e.textContent=message;}};
    if(!profile.id){
      host.innerHTML='<div class="arenaGuest"><span class="arenaSymbol" aria-hidden="true">⚔️</span><span class="questEyebrow">MEGLIO IN COMPAGNIA</span><h3>La prossima sfida è con la tua classe.</h3><p>Entra nel gruppo della tua classe con il codice condiviso dall’insegnante o da un adulto. Poi scegli un compagno e giocate insieme.</p><div class="arenaRules"><span>Fino a 5 domande uguali</span><span>10 punti per risposta</span><span>Ognuno al suo ritmo</span></div><button class="primary" id="arenaLogin">Scegli il tuo profilo →</button></div>';
      host.querySelector('#arenaLogin').onclick=openAdults;return;
    }
    function draw(){
      const opponents=data.opponents;
      const avatar=p=>avatars[p?.equipped?.avatar]||'🦊';
      host.innerHTML='<div class="arenaHeading"><div><span class="questEyebrow">L’ARENA DELLE PAROLE</span><h3>Compagni di classe. Esploratori insieme.</h3><p>Stesse domande, nessun cronometro. Vince chi trova più risposte!</p></div><span class="arenaSymbol" aria-hidden="true">⚔️</span></div><div class="arenaRules"><span>✦ Fino a 5 domande</span><span>✦ 10 punti per risposta</span><span>✦ Inviti validi 7 giorni</span></div><div class="arenaLayout"><section class="rivalPicker"><h4>Quale compagno vuoi sfidare?</h4><p>Qui trovi soltanto i compagni iscritti alle tue classi.</p>'+(opponents.length?'<form id="duelInvite"><div class="rivalList">'+opponents.map((p,i)=>'<label class="rivalCard"><input type="radio" name="opponent" value="'+p.id+'" '+(i===0?'checked':'')+' required><span class="rivalAvatar" aria-hidden="true">'+avatar(p)+'</span><span><b>'+text(p.nickname)+'</b><small>'+text((p.classes||[]).join(' · ')||'La tua classe')+'</small></span><span class="rivalCheck" aria-hidden="true">✓</span></label>').join('')+'</div><label for="duelTopic">Su cosa giochiamo?</label><select id="duelTopic" name="category">'+Object.entries(categories).map(([k,v])=>'<option value="'+k+'">'+v+'</option>').join('')+'</select><button class="primary" type="submit">Lancia la sfida ⚡</button></form>':'<div class="arenaEmpty"><span aria-hidden="true">🫶</span><b>La tua classe ti aspetta!</b><p>Chiedi il codice della classe all’insegnante. Nell’area adulti puoi entrare nella classe oppure crearne una e invitare i compagni.</p><button class="audio" id="arenaFriends">Entra nella tua classe →</button></div>')+'</section><section class="duelInbox"><div class="duelListHeading"><h4>Le tue sfide <span>'+data.duels.filter(d=>['pending','active'].includes(d.state)).length+'</span></h4><button class="audio" id="arenaRefresh" aria-label="Aggiorna le sfide">↻ Aggiorna</button></div><p class="hint">L’altro giocatore può rispondere anche più tardi. Premi Aggiorna per vedere gli inviti e i risultati.</p><div class="duelList">'+(data.duels.length?data.duels.map(card).join(''):'<div class="arenaEmpty"><span aria-hidden="true">🏁</span><b>La prima sfida non si scorda.</b><p>Scegli un compagno e inviagli un invito. La partita apparirà qui.</p></div>')+'</div></section></div><p id="arenaStatus" role="status" aria-live="polite"></p><section id="duelStage" class="duelStage" aria-label="La tua partita" hidden></section>';
      host.querySelector('#arenaFriends')?.addEventListener('click',openAdults);
      host.querySelector('#arenaRefresh').onclick=()=>load();
      host.querySelector('#duelInvite')?.addEventListener('submit',e=>{
        e.preventDefault();const f=new FormData(e.currentTarget);
        act('duel-create',{opponent:Number(f.get('opponent')),category:f.get('category')},'Invito inviato! Ora tocca al tuo compagno accettare.');
      });
      host.querySelectorAll('[data-duel-action]').forEach(button=>button.onclick=()=>{
        const d=data.duels.find(x=>x.id===button.dataset.duel);
        const action=button.dataset.duelAction;
        if(action==='play')return open(d.id);
        if(action==='rematch')return act('duel-create',{opponent:d.opponent,category:d.category},'Rivincita proposta!');
        act(action,{duel:d.id},action==='duel-accept'?'Sfida accettata! Scegli Gioca per iniziare.':'Invito chiuso.');
      });
    }
    function card(d){
      const incoming=d.incoming,done=d.step===d.total;
      const labels={pending:incoming?'Ti ha invitato!':'Invito inviato',active:done?'Aspettiamo il tuo compagno':'È il tuo turno',completed:'Sfida conclusa',declined:'Invito rifiutato',cancelled:'Invito annullato',expired:'Invito scaduto'};
      const button=(label,action,primary=false)=>'<button class="'+(primary?'primary':'audio')+'" data-duel="'+d.id+'" data-duel-action="'+action+'">'+label+'</button>';
      let actions='',score='';
      if(d.state==='pending')actions=incoming?button('Accetta ⚡','duel-accept',true)+button('Non ora','duel-decline'):button('Annulla invito','duel-cancel');
      if(d.state==='active'&&!done)actions=button(d.step?'Continua →':'Gioca →','play',true);
      if(d.state==='active'&&done)score='<p class="duelScore">Tu: <b>'+d.score+'</b><small>Il risultato arriva quando avete finito entrambi.</small></p>';
      if(d.state==='completed'){
        const win=d.score>d.rivalScore,tie=d.score===d.rivalScore;
        score='<div class="duelScore"><b>'+d.score+' <span>—</span> '+d.rivalScore+'</b><small>'+(tie?'Pari merito. Bravissimi tutti e due!':win?'Hai vinto questa sfida! ✨':'Questa volta ha vinto '+text(d.nickname)+'. Si riprova!')+'</small></div>';
        actions=button('Rivincita ↗','rematch');
      }
      return '<article class="duelCard '+(d.state==='completed'?'duelComplete':'')+'"><span class="duelBadge">'+labels[d.state]+'</span><h5>Tu <span>vs</span> '+text(d.nickname)+'</h5><p>'+text(categories[d.category])+' · '+d.total+' domande'+(d.state==='active'?' · '+d.step+'/'+d.total+' completate':'')+'</p>'+score+'<div class="duelActions">'+actions+'</div></article>';
    }
    async function load(message=''){
      if(busy||playing)return;busy=true;
      try{const result=await request('arena&profile='+profile.id);if(!valid())return;data=result;draw();status(message);}
      catch(e){if(valid()&&!host.querySelector('#arenaRefresh')){host.innerHTML='<div class="arenaEmpty"><h3>Le sfide si fanno attendere.</h3><p id="arenaStatus" role="status"></p><button id="arenaRetry" class="audio">Riprova</button></div>';host.querySelector('#arenaRetry').onclick=()=>load();}status(e.message);}
      finally{busy=false;}
    }
    async function act(action,payload,message){
      if(busy)return;busy=true;host.querySelectorAll('button').forEach(b=>b.disabled=true);
      try{await request(action,payload);if(!valid())return;busy=false;await load(message);}
      catch(e){status(e.message);if(valid())host.querySelectorAll('button').forEach(b=>b.disabled=false);}
      finally{busy=false;}
    }
    async function open(id){
      if(busy)return;busy=true;
      try{const result=await request('duel&profile='+profile.id+'&duel='+encodeURIComponent(id));if(!valid())return;
        if(!result.question){busy=false;await load('Questa partita è già terminata oppure non è ancora iniziata.');return;}
        playing=true;showQuestion(result);host.querySelector('#duelStage').scrollIntoView({behavior:'smooth',block:'center'});
      }catch(e){status(e.message);}finally{busy=false;}
    }
    function showQuestion(result,feedback=''){
      if(!valid())return;
      const stage=host.querySelector('#duelStage'),d=result.duel,q=result.question;
      stage.hidden=false;
      host.querySelector('.arenaLayout').hidden=true;
      stage.innerHTML='<div class="duelStageTop"><span class="duelBadge">TU vs '+text(d.nickname)+'</span><button class="audio" id="duelBack">Salva e torna alle sfide</button></div><div class="duelProgress"><span>Domanda '+q.number+' di '+d.total+'</span><b>'+d.score+' punti</b></div><div class="questTrack"><i style="width:'+(d.step/d.total*100)+'%"></i></div><span class="duelEmoji" aria-hidden="true">'+text(q.emoji)+'</span><h3>Come si dice «'+text(q.translation)+'»?</h3><p>Scegli la parola in inglese.</p><div class="duelOptions">'+q.options.map((answer,i)=>'<button data-duel-answer="'+i+'"><span>'+String.fromCharCode(65+i)+'</span>'+text(answer)+'</button>').join('')+'</div><p id="duelFeedback" role="status" aria-live="polite">'+text(feedback)+'</p>';
      stage.querySelector('#duelBack').onclick=()=>{if(busy)return;playing=false;load('La partita è salvata. Puoi riprenderla quando vuoi.');};
      stage.querySelectorAll('[data-duel-answer]').forEach(b=>b.onclick=async()=>{
        if(busy)return;busy=true;stage.querySelectorAll('button').forEach(x=>x.disabled=true);
        try{
          const next=await request('duel-answer',{duel:d.id,step:d.step,answer:Number(b.dataset.duelAnswer)});
          if(!valid())return;
          const message=next.correct?'Esatto! +10 punti ✨':'Ora lo sai: si dice '+next.correctAnswer+'. La prossima ti aspetta!';
          stage.querySelector('#duelFeedback').textContent=message;
          const continueButton=document.createElement('button');continueButton.className='primary';continueButton.textContent=next.question?'Prossima domanda →':'Guarda il risultato →';
          continueButton.onclick=async()=>{if(busy)return;if(next.question)showQuestion(next);else{playing=false;await load(next.duel.state==='completed'?'Sfida conclusa! Guarda il risultato qui sotto.':'Hai finito! Il tuo punteggio è salvato: aspettiamo il tuo compagno.');}};
          stage.append(continueButton);
        }catch(e){stage.querySelector('#duelFeedback').textContent=e.message;stage.querySelectorAll('button').forEach(x=>x.disabled=false);}
        finally{busy=false;}
      });
    }
    host.innerHTML='<div class="arenaEmpty"><h3>Prepariamo l’arena…</h3><p id="arenaStatus" role="status"></p></div>';load();
  }};
  document.addEventListener('click',e=>{
    const action=e.target.closest('[data-jump]')?.dataset.jump;if(!action)return;
    document.querySelector('[data-tab="'+action+'"]')?.click();
    document.querySelector('.questHub')?.scrollIntoView({behavior:'smooth',block:'start'});
  });
})();
