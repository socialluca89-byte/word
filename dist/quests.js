/* Missions, wardrobe and a private weekly festival. Wallets are server-owned. */
(() => {
  const root=document.createElement('section');root.id='questHub';root.className='questHub';
  root.setAttribute('aria-label','Il tuo passaporto delle avventure');
  document.querySelector('.worldSection').after(root);
  let profile={id:null},hub=null,tab='missions',mission=null,question=null,busy=false,tiles=[],picked=[],club=0, hinted=false, questionFailed=false;
  let guest;try{guest=JSON.parse(localStorage.getItem('wordylandGuestWallet')||'null');}catch{}
  guest=guest&&Number.isFinite(guest.coins)?guest:{coins:0,xp:0,level:1,equipped:{avatar:'fox'},inventory:['fox'],credits:{},paid:{}};
  const catalog=[['fox','Volpe esploratrice','🦊','avatar',0],['panda','Panda delle stelle','🐼','avatar',30],['robot','Robot inventore','🤖','avatar',45],['dragon','Drago delle parole','🐉','avatar',60],['octopus','Polpo creativo','🐙','avatar',45],['lion','Leone coraggioso','🦁','avatar',60],['cap','Cappello da avventura','🧢','hat',20],['crown','Corona delle scoperte','👑','hat',40],['sparkles','Scia luminosa','✨','effect',25],['flight','Volo delle parole','🪽','effect',50],['confetti','Festa di coriandoli','🎉','effect',35]].map(([id,name,icon,slot,price])=>({id,name,icon,slot,price}));
  const item=id=>catalog.find(x=>x.id===id);
  const wallet=()=>profile.id?(hub?.wallet||{coins:0,xp:0,level:1,equipped:{avatar:'fox'},inventory:['fox']}):guest;
  const say=text=>{const e=root.querySelector('#questStatus');if(e)e.textContent=text;};
  const api=(action,data)=>window.wordylandAccount.request(action,data===undefined?undefined:{...data,profile:profile.id});
  const storeGuest=()=>{guest.level=1+Math.floor(guest.xp/100);try{localStorage.setItem('wordylandGuestWallet',JSON.stringify(guest));}catch{}};
  function mascot(w=wallet()) {const e=w?.equipped||{};return '<span class="avatarHat">'+(item(e.hat)?.icon||'')+'</span><span class="questMascot '+(e.effect==='flight'?'canFly':'')+'">'+(item(e.avatar)?.icon||'🦊')+'</span><span class="avatarEffect">'+(item(e.effect)?.icon||'')+'</span>';}
  async function refresh() {
    const expected=profile.id;
    if(expected){let result=await api('hub&profile='+expected+(club?'&club='+club:''));if(profile.id!==expected)return;if(!club&&result.clubs?.length){club=Number(result.clubs[0].id);result=await api('hub&profile='+expected+'&club='+club);if(profile.id!==expected)return;}hub=result;}
    else hub=null;
    render();adultTools();
  }
  function render() {
    const w=wallet();if(w?.equipped?.avatar){avatar=item(w.equipped.avatar)?.icon||'🦊';refreshPlayer();}
    root.innerHTML='<div class="passport"><div class="avatarStage">'+mascot()+'</div><div><span class="questEyebrow">IL TUO PASSAPORTO</span><h2>'+esc(profile.nickname||'Esploratore delle parole')+'</h2><p>'+(profile.id?'La tua avventura ti segue su ogni dispositivo.':'Gioca come ospite. Un adulto può creare un profilo per ritrovarti ovunque.')+'</p><div class="wallet"><span>🪙 <b>'+(w?.coins||0)+'</b> monete</span><span>✦ Livello '+(w?.level||1)+'</span><span>'+(w?.xp||0)+' XP</span></div><div class="levelTrack" aria-label="Esperienza verso il prossimo livello"><i style="width:'+((w?.xp||0)%100)+'%"></i></div></div><div class="passportSticker">LEARN<br>PLAY<br>GROW ✦</div></div><nav class="questTabs" aria-label="Passaporto"><button data-tab="arena" aria-pressed="'+(tab==='arena')+'">⚔️ Sfida un compagno</button><button data-tab="missions" aria-pressed="'+(tab==='missions')+'">🗺️ Missioni</button><button data-tab="shop" aria-pressed="'+(tab==='shop')+'">🎒 Personaggi e skill</button><button data-tab="festival" aria-pressed="'+(tab==='festival')+'">🏆 Festival</button></nav><div id="questContent"></div><p id="questStatus" role="status" aria-live="polite"></p>';
    root.querySelectorAll('[data-tab]').forEach(b=>b.onclick=()=>{if(busy)return;tab=b.dataset.tab;render();});
    if(tab==='arena')window.wordylandArena.mount(root.querySelector('#questContent'),profile,openAdults);if(tab==='missions')renderMissions();if(tab==='shop')renderShop();if(tab==='festival')renderFestival();
  }
  function renderMissions() {
    const content=root.querySelector('#questContent');
    content.innerHTML='<div class="missionGrid"><div class="dailyMission"><span class="questEyebrow">PICCOLE PROVE, GRANDI SCOPERTE</span><h3>Il baule delle parole</h3><p>Tre prove per aiutare il tuo personaggio. Osserva, ascolta e conquista il tuo premio.</p><div class="missionPath"><span>👀<small>Scopri</small></span><i>···</i><span>🧩<small>Gioca</small></span><i>···</i><span>✏️<small>Scrivi</small></span><i>···</i><span>🎁<small>Apri!</small></span></div><label for="questSource">La tua prossima missione</label><select id="questSource"><option value="personal">✨ Il mio percorso personale</option><option value="body">👀 Il corpo</option><option value="catpositions">🐈 Il gatto e la scatola</option><option value="toys">🧸 Giocattoli</option><option value="colors">🎨 Colori</option><option value="hello">👋 Presentiamoci</option><option value="school">✏️ A scuola</option>'+(hub?.studies||[]).map(s=>'<option value="study:'+s.id+'">📚 '+esc(s.title)+'</option>').join('')+'</select><button class="primary" id="beginQuest">Apri la missione →</button></div><div class="treasureCard"><span class="treasureIcon">🎁</span><h3>Il tuo prossimo tesoro</h3><p>Completa la missione: fino a <b>15 monete</b> e un bonus quando superi una difficoltà.</p><div class="rewardPill">🪙 Monete · ✦ Esperienza</div><p class="hint">Premi per tre missioni al giorno con parole nuove. Il ripasso e gli aiuti restano sempre disponibili.</p></div></div><div id="missionStage" class="missionStage" hidden></div>';
    root.querySelector('#beginQuest').onclick=startQuest;
    if(mission)drawQuestion();
  }
  async function startQuest() {
    if(busy)return;busy=true;
    try {
      const source=root.querySelector('#questSource').value, owner=profile.id;
      if(profile.id) {
        const result=await api('quest-start',source.startsWith('study:')?{study:Number(source.split(':')[1])}:{category:source});
        if(owner!==profile.id)return;mission={token:result.token,total:result.total,profile:owner};question=result.question;
      } else {
        let pool=source==='personal'?allWords().filter(w=>!w[0].includes(' ')):lists[source]||lists.body;
        pool=shuffle(pool).slice(0,3);
        const questions=pool.map((w,i)=>{const q={word:w[0],translation:w[1],emoji:w[2],kind:i===pool.length-1?'write':i===0?'choice':'build',number:i+1};if(q.kind==='choice')q.options=shuffle([w,...shuffle(allWords().filter(x=>x[0]!==w[0]&&!x[0].includes(' '))).slice(0,3)]);return q;});
        mission={token:'guest',questions,total:questions.length,xp:0,profile:null};question=questions[0];
      }
      drawQuestion();say('Nessuna fretta: puoi ascoltare e chiedere aiuto.');
    } catch(e){say(e.message);}finally{busy=false;}
  }
  function audio() {
    if(!('speechSynthesis'in window)){say('Audio non disponibile. Guarda la parola con Un aiuto.');return;}
    speechSynthesis.cancel();const u=new SpeechSynthesisUtterance(question.word);u.lang='en-GB';u.rate=.82;
    const v=speechSynthesis.getVoices().find(x=>x.lang==='en-GB');if(v)u.voice=v;
    speechSynthesis.speak(u);
  }
  function drawQuestion(challenge=false) {
    if(!challenge){hinted=false;questionFailed=false;}
    const stage=root.querySelector('#missionStage');if(!stage)return;stage.hidden=false;
    const q=question;stage.innerHTML='<div class="questStep">PROVA '+q.number+' DI '+mission.total+'<span>'+currentWorld().icon+' '+currentWorld().name+'</span></div><div class="questTrack"><i style="width:'+((q.number-1)/mission.total*100)+'%"></i></div><div class="questPicture">'+picture(q.word,q.emoji)+'</div><p>'+esc(q.translation)+'</p><button class="audio" id="questListen">🔊 Ascolta</button><div id="questWork"></div><p id="questFeedback" role="status" aria-live="polite"></p><div id="questActions"></div>';
    stage.querySelector('#questListen').onclick=audio;
    const work=stage.querySelector('#questWork'),actions=stage.querySelector('#questActions');
    if(!challenge){work.innerHTML='<h3>Guarda bene la parola</h3><div class="questWord">'+esc(q.word)+'</div><p>Ascolta e osserva. Quando vuoi, giochiamo!</p>';actions.innerHTML='<button class="primary" id="readyChallenge">Sono pronto! →</button>';actions.querySelector('button').onclick=()=>drawQuestion(true);return;}
    const titles={write:'La porta segreta: ascolta e scrivi',choice:'Ascolta e trova la figura',missing:'Il ponte della lettera mancante',build:'Il laboratorio delle lettere'};
    work.innerHTML='<h3>'+titles[q.kind]+'</h3>';
    if(q.kind==='choice'){
      // Keep only the options visible once the listening challenge begins.
      stage.querySelector('.questPicture').hidden=true;stage.querySelector('.questPicture').nextElementSibling.hidden=true;
      const options=q.options||[];
      work.innerHTML+='<div class="questChoices">'+options.map((o,i)=>'<button data-answer="'+i+'">'+picture(o[0],o[2])+'<small>'+esc(o[1])+'</small></button>').join('')+'</div>';
      work.querySelectorAll('[data-answer]').forEach(b=>b.onclick=()=>submitAnswer(options[Number(b.dataset.answer)][0]));
    }else if(q.kind==='build'){
      tiles=shuffle([...q.word].map((char,id)=>({char,id})));picked=[];
      work.innerHTML+='<div id="questSlots" class="questSlots"></div><div id="questTiles" class="questTiles"></div><p class="hint">Tocca una lettera per inserirla, una casella per correggere. ␣ indica uno spazio.</p><button class="primary" id="checkQuest">Controlla ✓</button>';
      drawTiles();work.querySelector('#checkQuest').onclick=()=>submitAnswer(picked.map(x=>x.char).join(''));
    }else{
      work.innerHTML+=(q.kind==='missing'?'<div class="questWord">'+esc(q.mask)+'</div>':'')+'<form id="questAnswerForm"><label for="questAnswer">'+(q.kind==='missing'?'La lettera mancante':'Scrivi in inglese')+'</label><input id="questAnswer" autocomplete="off" autocorrect="off" autocapitalize="none" spellcheck="false" '+(q.kind==='missing'?'maxlength="1"':'maxlength="100"')+' required><button class="primary">Controlla ✓</button></form>';
      work.querySelector('form').onsubmit=e=>{e.preventDefault();submitAnswer(work.querySelector('input').value);};
    }
    actions.innerHTML='<button class="audio" id="questHint">💡 Un aiuto · sempre gratis</button><div id="questHelp" hidden class="questWord">'+esc(q.word)+'</div>';
    actions.querySelector('button').onclick=()=>{const hint=actions.querySelector('#questHelp');hint.hidden=!hint.hidden;hinted=true;};
  }
  function drawTiles(){
    const work=root.querySelector('#questWork');
    work.querySelector('#questSlots').innerHTML=[...question.word].map((_,i)=>'<button data-slot="'+i+'" aria-label="Casella '+(i+1)+'">'+esc(picked[i]?.char===' '?'␣':picked[i]?.char||'')+'</button>').join('');
    work.querySelector('#questTiles').innerHTML=tiles.map(t=>'<button data-tile="'+t.id+'" '+(picked.some(x=>x.id===t.id)?'disabled':'')+'>'+esc(t.char===' '?'␣':t.char)+'</button>').join('');
    work.querySelectorAll('[data-tile]').forEach(b=>b.onclick=()=>{picked.push(tiles.find(t=>t.id===Number(b.dataset.tile)));drawTiles();});
    work.querySelectorAll('[data-slot]').forEach(b=>b.onclick=()=>{picked.splice(Number(b.dataset.slot),1);drawTiles();});
  }
  async function submitAnswer(answer){
    if(busy)return;if(!answer.trim()){say('Inserisci la risposta oppure usa Un aiuto.');return;}busy=true;
    const feedback=root.querySelector('#questFeedback'),owner=profile.id,token=mission.token;
    try{
      let result;
      if(profile.id){result=await api('quest-answer',{token:mission.token,step:question.number-1,answer});}
      else{
        const correct=normalize(answer)===normalize(question.word);
        if(!correct)result={correct:false,message:'Riascolta e riprova con calma. Gli aiuti sono sempre disponibili.'};
        else {
          const day=new Date().toISOString().slice(0,10),key=day+':'+normalize(question.word);
          if(!guest.credits[key]&&Object.keys(guest.credits).filter(x=>x.startsWith(day)).length<15){guest.credits[key]=true;guest.xp+=10;mission.xp+=10;}
          const done=question.number===mission.total;
          let coins=0;if(done&&mission.xp>0&&(guest.paid[day]||0)<3){coins=15;guest.coins+=coins;guest.paid[day]=(guest.paid[day]||0)+1;}
          storeGuest();result={correct:true,done,xp:mission.xp,coins,wallet:guest,question:mission.questions[question.number]};
        }
      }
      if(owner!==profile.id||token!==mission?.token)return;
      const word=question.word;stats[word]??={good:0,attempts:0,review:false};stats[word].attempts++;if(result.correct&&!hinted&&!questionFailed){stats[word].good++;stats[word].review=false;}else{stats[word].review=true;if(!result.correct)questionFailed=true;}save();updateStats();
      if(!result.correct){feedback.textContent=result.message;return;}
      root.querySelectorAll('#questWork button,#questWork input').forEach(b=>b.disabled=true);
      feedback.textContent='✨ Esatto! Hai superato la prova.';
      if(result.done){
        if(hub)hub.wallet=result.wallet;
        const w=result.wallet;root.querySelector('.wallet').innerHTML='<span>🪙 <b>'+w.coins+'</b> monete</span><span>✦ Livello '+w.level+'</span><span>'+w.xp+' XP</span>';root.querySelector('.levelTrack i').style.width=(w.xp%100)+'%';
        const stage=root.querySelector('#missionStage');
        stage.innerHTML='<div class="openTreasure">🎉</div><span class="questEyebrow">MISSIONE COMPLETATA</span><h3>Il baule si è aperto!</h3><p>Ogni tentativo ti ha portato fin qui.</p><div class="missionRewards"><b>✦ '+result.xp+' XP</b><b>🪙 '+result.coins+' monete</b></div><p>'+(result.coins?'Il negozio ti aspetta: scegli qualcosa per il tuo personaggio!':'Hai già raccolto i premi per queste parole o le monete di oggi. Puoi continuare a giocare, senza perdere nulla.')+'</p><button class="primary" id="rewardShop">Vai al negozio 🎒</button><button class="audio" id="anotherQuest">Un’altra avventura</button>';
        mission=null;question=null;
        stage.querySelector('#rewardShop').onclick=()=>{tab='shop';render();};stage.querySelector('#anotherQuest').onclick=()=>render();
        if(profile.id)hub=await api('hub&profile='+profile.id+(club?'&club='+club:''));
      }else{
        root.querySelector('#questActions').innerHTML='<button class="primary" id="questNext">Continua →</button>';
        root.querySelector('#questNext').onclick=()=>{question=result.question;drawQuestion();};
      }
    }catch(e){feedback.textContent=e.message;}finally{busy=false;}
  }
  function renderShop(){
    const w=wallet();root.querySelector('#questContent').innerHTML='<div class="shopHeading"><div><span class="questEyebrow">IL BAZAR DELLE MERAVIGLIE</span><h3>Un personaggio tutto tuo</h3><p>Usa le monete delle missioni. Nessun acquisto con denaro reale.</p></div><div class="wardrobePreview">'+mascot()+'</div></div><div class="shopGrid">'+catalog.map(it=>{const owned=w?.inventory.includes(it.id),equipped=w?.equipped[it.slot]===it.id;return '<article class="shopItem '+(equipped?'equipped':'')+'"><span>'+it.icon+'</span><h4>'+it.name+'</h4><small>'+(it.slot==='effect'?'Skill scenica':it.slot==='hat'?'Accessorio':'Personaggio')+'</small><button class="'+(owned?'audio':'primary')+'" data-item="'+it.id+'" '+(equipped?'disabled':'')+'>'+(equipped?'Indossato ✓':owned?'Indossa':'🪙 '+it.price+' · Sblocca')+'</button></article>';}).join('')+'</div><p class="hint">Le skill cambiano l’aspetto e le animazioni. Gli aiuti negli esercizi sono gratis per tutti.</p>';
    root.querySelectorAll('[data-item]').forEach(b=>b.onclick=async()=>{
      if(busy)return;busy=true;const it=item(b.dataset.item),owned=w.inventory.includes(it.id);b.disabled=true;
      try{
        if(profile.id){const result=await api(owned?'equip':'buy',{item:it.id});hub.wallet=result.wallet;}
        else{if(!owned){if(guest.coins<it.price)throw new Error('Ti mancano '+(it.price-guest.coins)+' monete. Completa una missione!');guest.coins-=it.price;guest.inventory.push(it.id);}guest.equipped[it.slot]=it.id;storeGuest();}
        render();say(it.name+' è pronto per l’avventura!');
      }catch(e){say(e.message);b.disabled=false;}finally{busy=false;}
    });
  }
  function renderFestival(){
    const content=root.querySelector('#questContent');
    if(!profile.id||!hub?.clubs?.length){content.innerHTML='<div class="festivalWelcome"><span>🏆</span><h3>Un festival per la tua classe</h3><p>L’insegnante o un adulto può creare il gruppo classe e invitare i partecipanti con un codice. Qui compaiono solo soprannomi e avatar.</p><button class="primary" id="festivalLogin">Apri l’area adulti</button></div>';content.querySelector('button').onclick=openAdults;return;}
    const board=hub?.board||[],team=hub?.team||0;
    content.innerHTML='<div class="festivalHeader"><div><span class="questEyebrow">IL FESTIVAL DELLE SCOPERTE</span><h3>Una settimana, tante conquiste</h3><p>Esperienza, miglioramenti e coraggio. Ogni lunedì una nuova avventura.</p></div><label>La tua classe<select id="festivalClub">'+(hub?.clubs||[]).map(c=>'<option value="'+c.id+'" '+(club===c.id?'selected':'')+'>'+esc(c.name)+'</option>').join('')+'</select></label></div><div class="teamQuest"><span>🚀</span><div><b>Costruiamo insieme la stazione spaziale</b><p>'+team+' / '+(hub?.teamGoal||300)+' XP di squadra</p><div class="levelTrack"><i style="width:'+Math.min(100,team/3)+'%"></i></div></div><span>'+(team>=300?'🌟':'🪐')+'</span></div><ol class="festivalBoard">'+board.map((p,i)=>'<li class="'+(p.mine?'myRank':'')+'"><span class="rankMedal">'+(['🥇','🥈','🥉'][i]||'✦')+'</span><span class="rankAvatar">'+(item(p.equipped?.avatar)?.icon||'🦊')+'</span><div><b>'+esc(p.nickname)+(p.mine?' · tu':'')+'</b><small>'+(p.improvement?'🌱 '+p.improvement+' difficoltà superate':p.missions?'💪 '+p.missions+' missioni completate':'🌟 La tua prima scoperta ti aspetta')+'</small></div><strong>'+p.points+' XP</strong></li>').join('')+'</ol><p class="hint">Contano fino a 15 parole nuove al giorno. Nessun punto viene tolto per gli errori. La partecipazione ai gruppi è gestita dagli adulti.</p>';
    content.querySelector('#festivalClub').onchange=async e=>{club=Number(e.target.value);try{await refresh();}catch(e){say(e.message);}};
  }
  function openAdults(){const area=document.querySelector('.accountArea');area.open=true;area.scrollIntoView({behavior:'smooth',block:'start'});}
  function parseStudy(text){
    const known=new Map(allWords().map(w=>[normalize(w[0]),w]));const found=new Map();
    text.split(/\n|;/).forEach(line=>{const parts=line.split(/\s*=\s*|\t|\s*:\s*/);if(parts.length===2&&/^[a-z][a-z ’'?,.!-]{0,79}$/i.test(parts[0].trim())&&parts[1].trim())found.set(normalize(parts[0]),[parts[0].trim(),parts[1].trim(),'📚']);else{const word=known.get(normalize(line));if(word)found.set(normalize(line),word);}});
    return [...found.values()].slice(0,80);
  }
  function adultTools(){
    const host=document.querySelector('#studyTools');if(!host||!profile.id)return;
    host.innerHTML='<details class="studyBox"><summary>📚 Materiali di scuola e missioni personali</summary><p>Allega foto o PDF della scheda e inserisci le parole in formato <b>inglese = italiano</b>. Dal testo prepariamo una proposta da controllare. Le foto vengono conservate come riferimento: la lettura automatica delle immagini non è ancora attiva.</p><form id="studyForm"><label>Titolo della scheda<input id="studyTitle" maxlength="60" required placeholder="Il corpo · settimana 1"></label><label>Foto o PDF · facoltativo, massimo 4 MB<input id="studyFile" type="file" accept="image/jpeg,image/png,image/webp,application/pdf"></label><label>Parole e frasi<textarea id="studyText" rows="5" placeholder="eye = occhio&#10;ear = orecchio&#10;the cat is on the box = il gatto è sopra la scatola"></textarea></label><button class="audio" type="button" id="previewStudy">Prepara le missioni</button><div id="studyPreview"></div><button class="primary" id="confirmStudy" hidden>Conferma e salva il programma</button></form><div class="savedStudies">'+(hub?.studies||[]).map(s=>'<div><b>'+esc(s.title)+'</b><small>'+JSON.parse(s.words).length+' parole confermate</small>'+(s.original_name?'<a target="_blank" rel="noopener" href="api.php?action=study-file&profile='+profile.id+'&study='+s.id+'">Scarica allegato</a>':'')+'<button class="audio" data-remove-study="'+s.id+'">Rimuovi scheda</button></div>').join('')+'</div></details><details class="studyBox"><summary>🏫 La classe e il link di iscrizione</summary><p>Il profilo scelto condividerà soprannome, personaggio e punti con gli altri partecipanti. Puoi uscire quando vuoi.</p><form id="clubForm"><label>Nome della classe<input name="name" maxlength="40" placeholder="Gli esploratori della 2ª"></label><label>Oppure codice della classe<input name="code" autocomplete="off"></label><label class="adultCheck"><input name="consent" type="checkbox" required> Confermo la partecipazione di questo profilo con soprannome e avatar</label><button class="primary" value="club-create">Crea classe</button><button class="audio" value="club-join">Entra con il codice</button></form><p id="clubMessage" role="status"></p>'+(hub?.clubs||[]).map(c=>'<div class="classManageRow"><b>'+esc(c.name)+'</b> '+(c.managed?'<button class="audio" data-class-share="'+c.id+'">Mostra link della classe</button>':'')+' <button class="audio" data-leave-club="'+c.id+'">Esci dalla classe</button><div data-class-link="'+c.id+'"></div></div>').join('')+'</details>';
    let proposal=[];
    host.querySelector('#previewStudy').onclick=()=>{proposal=parseStudy(host.querySelector('#studyText').value);const preview=host.querySelector('#studyPreview');preview.innerHTML=proposal.length?'<h4>Controlla il programma proposto</h4>'+proposal.map((w,i)=>'<label class="adultCheck"><input type="checkbox" data-word="'+i+'" checked> '+esc(w[0])+' → '+esc(w[1])+'</label>').join(''):'<p>Inserisci una parola per riga: inglese = italiano. Puoi anche inserire una parola già presente nel gioco.</p>';host.querySelector('#confirmStudy').hidden=!proposal.length;};
    host.querySelector('#studyText').oninput=()=>{proposal=[];host.querySelector('#confirmStudy').hidden=true;host.querySelector('#studyPreview').replaceChildren();};
    host.querySelector('#studyForm').onsubmit=async e=>{
      e.preventDefault();const button=e.submitter;button.disabled=true;
      try{const words=[...host.querySelectorAll('[data-word]:checked')].map(b=>proposal[Number(b.dataset.word)]);if(!words.length)throw new Error('Seleziona almeno una parola da confermare.');const payload={title:host.querySelector('#studyTitle').value,words,confirmed:true};const file=host.querySelector('#studyFile').files[0];if(file){if(file.size>4000000)throw new Error('La scheda supera 4 MB.');payload.attachment=await new Promise((resolve,reject)=>{const r=new FileReader();r.onerror=()=>reject(new Error('Non riesco a leggere il file.'));r.onload=()=>resolve({name:file.name,data:String(r.result).split(',')[1]});r.readAsDataURL(file);});}await api('study-save',payload);await refresh();say('📚 Programma confermato! Lo trovi tra le missioni personali.');}catch(e){say(e.message);button.disabled=false;}
    };
    host.querySelectorAll('[data-remove-study]').forEach(b=>b.onclick=async()=>{if(!confirm('Rimuovere questa scheda e il suo allegato? I progressi già ottenuti rimangono.'))return;try{await api('study-remove',{study:Number(b.dataset.removeStudy)});await refresh();}catch(e){say(e.message);}});
    host.querySelector('#clubForm').onsubmit=async e=>{e.preventDefault();const fields=Object.fromEntries(new FormData(e.currentTarget));try{const r=await api(e.submitter.value,{name:fields.name,code:fields.code,consent:fields.consent==='on'});club=r.id;await refresh();document.querySelector('.accountArea').open=true;const message=document.querySelector('#clubMessage');if(r.code){message.textContent='Classe creata! Ecco il link da condividere.';window.wordylandClassroom.share(r.code,document.querySelector('[data-class-link="'+r.id+'"]'));}else message.textContent='Profilo aggiunto alla classe.';}catch(e){host.querySelector('#clubMessage').textContent=e.message;}};
    host.querySelectorAll('[data-class-share]').forEach(b=>b.onclick=async()=>{b.disabled=true;try{const r=await api('class-link',{club:Number(b.dataset.classShare)});if(b.isConnected)window.wordylandClassroom.share(r.code,host.querySelector('[data-class-link="'+b.dataset.classShare+'"]'));}catch(e){say(e.message);}finally{b.disabled=false;}});
    host.querySelectorAll('[data-leave-club]').forEach(b=>b.onclick=async()=>{try{await api('club-leave',{club:Number(b.dataset.leaveClub)});club=0;await refresh();}catch(e){say(e.message);}});
  }
  window.addEventListener('wordyland-profile',async e=>{
    const changed=profile.id!==e.detail.id;profile=e.detail;
    if(changed){mission=null;question=null;club=0;hub=null;}
    try{await refresh();}catch(e){render();say(e.message);}
  });
  profile=window.wordylandAccount?.info()||profile;render();if(profile.id)refresh().catch(e=>say(e.message));
})();
