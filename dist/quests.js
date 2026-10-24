/* Missions, wardrobe and a private weekly festival. Wallets are server-owned. */
(() => {
  const root=document.createElement('section');root.id='questHub';root.className='questHub';
  root.setAttribute('aria-label','Il tuo passaporto delle avventure');
  document.querySelector('.raceHero').after(root);
  let profile={id:null},hub=null,tab='adventures',mission=null,question=null,busy=false,tiles=[],picked=[],club=0, hinted=false, questionFailed=false;
  const places=window.wordylandIsland.places;
  let lessonSource=null,lessonGroup='all';
  let activity='treehouse',shopGroup='avatar',sceneView=null;
  const clearScene=()=>{sceneView?.dispose();sceneView=null;};
  let guest;try{guest=JSON.parse(localStorage.getItem('wordylandGuestWallet')||'null');}catch{}
  guest=guest&&Number.isFinite(guest.coins)?guest:{coins:0,xp:0,level:1,equipped:{avatar:'fox'},inventory:['fox'],credits:{},paid:{}};
  const catalog=[['fox','Volpe esploratrice','🦊','avatar',0],['panda','Panda delle stelle','🐼','avatar',30],['robot','Robot inventore','🤖','avatar',45],['dragon','Drago delle parole','🐉','avatar',60],['octopus','Polpo creativo','🐙','avatar',45],['lion','Leone coraggioso','🦁','avatar',60],['cap','Cappello da avventura','🧢','hat',20],['crown','Corona delle scoperte','👑','hat',40],['sparkles','Scia luminosa','✨','effect',25],['flight','Volo delle parole','🪽','effect',50],['confetti','Festa di coriandoli','🎉','effect',35]].map(([id,name,icon,slot,price])=>({id,name,icon,slot,price}));
  guest.adventures=guest.adventures&&typeof guest.adventures==='object'&&!Array.isArray(guest.adventures)?guest.adventures:{};
  catalog.push(...[{"id": "pet-fox", "name": "Volpina curiosa", "icon": "🦊", "slot": "pet", "price": 0}, {"id": "pet-bunny", "name": "Coniglietto soffice", "icon": "🐰", "slot": "pet", "price": 0}, {"id": "pet-cat", "name": "Gattino delle nuvole", "icon": "🐱", "slot": "pet", "price": 0}, {"id": "room-sky", "name": "Casa cielo", "icon": "🩵", "slot": "room", "price": 0}, {"id": "room-peach", "name": "Casa pesca", "icon": "🍑", "slot": "room", "price": 0}, {"id": "room-mint", "name": "Casa menta", "icon": "🌿", "slot": "room", "price": 0}, {"id": "plant", "name": "Pianta delle scoperte", "icon": "🪴", "slot": "plant", "price": 20}, {"id": "rug", "name": "Tappeto arcobaleno", "icon": "🌈", "slot": "rug", "price": 20}, {"id": "lamp", "name": "Lampada stellina", "icon": "💡", "slot": "lamp", "price": 25}, {"id": "kart-blue", "name": "Kart blu", "icon": "💙", "slot": "kart", "price": 0}, {"id": "kart-pink", "name": "Kart corallo", "icon": "🩷", "slot": "kart", "price": 0}, {"id": "kart-mint", "name": "Kart menta", "icon": "💚", "slot": "kart", "price": 20}, {"id": "paint-sun", "name": "Colori del sole", "icon": "🌞", "slot": "palette", "price": 0}, {"id": "paint-ocean", "name": "Colori dell’oceano", "icon": "🌊", "slot": "palette", "price": 0}, {"id": "paint-berry", "name": "Colori dei frutti", "icon": "🍓", "slot": "palette", "price": 0}]);
  const item=id=>catalog.find(x=>x.id===id);
  guest.inventory=Array.isArray(guest.inventory)?guest.inventory.filter(id=>item(id)):['fox'];
  if(!guest.inventory.includes('fox'))guest.inventory.unshift('fox');
  guest.equipped=Object.fromEntries(Object.entries(guest.equipped&&typeof guest.equipped==='object'?guest.equipped:{}).filter(([slot,id])=>item(id)?.slot===slot&&guest.inventory.includes(id)));
  guest.equipped.avatar??='fox';
  guest.xp=Number.isFinite(guest.xp)?Math.max(0,guest.xp):0;
  for(const key of ['credits','paid'])if(!guest[key]||typeof guest[key]!=='object'||Array.isArray(guest[key]))guest[key]={};
  const wallet=()=>profile.id?(hub?.wallet||{coins:0,xp:0,level:1,equipped:{avatar:'fox'},inventory:['fox']}):guest;
  const say=text=>{const e=root.querySelector('#questStatus');if(e)e.textContent=text;};
  const api=(action,data)=>window.wordylandAccount.request(action,data===undefined?undefined:{...data,profile:profile.id});
  const storeGuest=()=>{guest.level=1+Math.floor(guest.xp/100);try{localStorage.setItem('wordylandGuestWallet',JSON.stringify(guest));}catch{}};
  const resumeHost=document.createElement('section');resumeHost.id='resumeHub';resumeHost.className='resumeHub';resumeHost.hidden=true;resumeHost.setAttribute('aria-label','Missioni e sfide da continuare');document.querySelector('.startChoices').before(resumeHost);
  let pending={quests:[],duels:[]},pendingEpoch=0,resumeDuel=null;
  const guestMissionKey='wordylandGuestMission';
  guest.finished=guest.finished&&typeof guest.finished==='object'&&!Array.isArray(guest.finished)?guest.finished:{};
  for(const [id,time] of Object.entries(guest.finished))if(!/^[a-f0-9]{32}$/.test(id)||!Number.isFinite(time)||time<Date.now()-604800000)delete guest.finished[id];
  function guestPool(source){return source==='personal'?allWords().filter(w=>!w[0].includes(' ')):lists[source]||lists.body;}
  function guestDraft(){
    try{const draft=JSON.parse(localStorage.getItem(guestMissionKey)||'null');if(!draft||typeof draft.source!=='string'||draft.source!=='personal'&&!Object.hasOwn(lists,draft.source)||!Array.isArray(draft.words)||!draft.words.length||draft.words.length>8||!Number.isInteger(draft.step)||draft.step<0||draft.step>=draft.words.length||!places[draft.activity]||!/^[a-f0-9]{32}$/.test(draft.id)||!Number.isFinite(draft.expiresAt)||draft.expiresAt<Date.now()||guest.finished[draft.id])return null;const pool=guestPool(draft.source);if(!draft.words.every(word=>pool.some(row=>row[0]===word)))return null;return draft;}catch{return null;}
  }
  function persistGuestMission(){
    if(profile.id||!mission||mission.token!=='guest')return true;
    try{localStorage.setItem(guestMissionKey,JSON.stringify({id:mission.id,words:mission.questions.map(q=>q.word),step:mission.step||0,xp:mission.xp,source:mission.source,activity:mission.activity,expiresAt:mission.expiresAt}));return true;}catch{return false;}
  }
  function missionTitle(source,kind){return lessonTopics[source]?.name||(source==='catpositions'?'Preposizioni · Il gatto e la scatola':source==='focus'?'Il corpo · ripasso mirato':source?.startsWith('study:')?'La tua scheda di scuola':places[kind]?.name||'La tua missione');}
  function drawContinuations(){
    const draft=!profile.id?guestDraft():null;
    const quests=profile.id?pending.quests:(draft?[{token:'guest',source:draft.source,activity:draft.activity,step:draft.step,total:draft.words.length}]:[]);
    const duels=profile.id?pending.duels:[];
    resumeHost.hidden=Boolean(profile.id&&!hub)||!quests.length&&!duels.length;
    if(resumeHost.hidden){if(location.hash==='#continua'){resumeHost.hidden=false;resumeHost.innerHTML='<h3>Da continuare</h3><p>'+(profile.id&&!hub?'Carico le partite del tuo profilo…':profile.id?'Non hai partite da continuare. Puoi iniziare una nuova avventura.':window.wordylandAccount.info().username?'Scegli il tuo profilo nell’area account per ritrovare le partite salvate.':'Non hai missioni ospite da continuare in questo browser. Accedi al tuo profilo per ritrovare le partite online.')+'</p><a class="lessonShortcut" href="#allenati">Vai agli esercizi →</a>';}else resumeHost.innerHTML='';return;}
    resumeHost.innerHTML='<h3>Da continuare</h3><p>Riparti dalla prima domanda ancora da rispondere.'+(profile.id?' Le risposte confermate sono salvate nel tuo profilo.':' Come ospite, la missione resta in questo browser.')+'</p><div class="resumeList">'+quests.map(q=>'<article><span aria-hidden="true">📚</span><div><b>'+esc(missionTitle(q.source,q.activity))+'</b><small>'+q.step+' / '+q.total+' risposte confermate</small></div><button class="primary" data-resume-quest="'+esc(q.token)+'">Riprendi →</button></article>').join('')+duels.map(d=>'<article><span aria-hidden="true">'+(places[d.activity]?.icon||'⚔️')+'</span><div><b>Sfida con '+esc(d.nickname)+'</b><small>'+d.step+' / '+d.total+' risposte confermate · '+esc(places[d.activity]?.name||'Sfida')+'</small></div><button class="primary" data-resume-duel="'+esc(d.id)+'">Riprendi →</button></article>').join('')+'</div><p id="resumeStatus" role="status"></p>';
    resumeHost.querySelectorAll('[data-resume-quest]').forEach(button=>button.onclick=()=>resumeQuest(button.dataset.resumeQuest));
    resumeHost.querySelectorAll('[data-resume-duel]').forEach(button=>button.onclick=()=>{if(busy)return;resumeDuel=button.dataset.resumeDuel;tab='arena';history.replaceState(null,'','#sfide');window.dispatchEvent(new Event('wordyland-play-view'));render();root.scrollIntoView({block:'start'});});
  }
  async function refreshPending(){
    const owner=profile.id,current=++pendingEpoch;
    if(!owner){pending={quests:[],duels:[]};drawContinuations();return;}
    try{const result=await api('pending-games&profile='+owner);if(profile.id!==owner||current!==pendingEpoch)return;pending=result;drawContinuations();}
    catch{if(profile.id!==owner||current!==pendingEpoch)return;const status=resumeHost.querySelector('#resumeStatus');if(status)status.textContent='Torna online per verificare e riprendere le partite salvate.';}
  }
  async function resumeQuest(token){
    if(busy)return;busy=true;const owner=profile.id;
    try{
      if(owner){const result=await api('quest-resume&profile='+owner+'&token='+encodeURIComponent(token));if(profile.id!==owner)return;activity=places[result.activity]?result.activity:'pets';lessonSource=result.source;mission={token:result.token,total:result.total,step:result.step,xp:result.xp,profile:owner,activity,source:result.source};question=result.question;}
      else{const draft=guestDraft();if(!draft)throw Error('La missione non è più disponibile in questo browser.');const pool=guestPool(draft.source),rows=draft.words.map(word=>pool.find(row=>row[0]===word)),questions=rows.map((row,index)=>makeLessonQuestion(row,index,rows.length,pool));activity=draft.activity;lessonSource=draft.source;mission={token:'guest',id:draft.id,questions,total:questions.length,step:draft.step,xp:Math.max(0,Math.min(150,Number(draft.xp)||0)),profile:null,activity,source:draft.source,expiresAt:draft.expiresAt};question=questions[draft.step];}
      tab='missions';history.replaceState(null,'','#missioni');window.dispatchEvent(new Event('wordyland-play-view'));setWorld(places[activity].world);render();root.querySelector('#missionStage').scrollIntoView({block:'start'});say('Missione ripresa: le risposte già confermate sono conservate.');
    }catch(error){const status=resumeHost.querySelector('#resumeStatus');if(status)status.textContent=error.message;}
    finally{busy=false;}
  }
  window.addEventListener('wordyland-progress-saved',()=>refreshPending());
  window.addEventListener('wordyland-presence',()=>{if(document.visibilityState==='visible'&&navigator.onLine&&!busy)refreshPending();});
  window.addEventListener('wordyland-continue',()=>refreshPending().then(()=>{if(!resumeHost.hidden)resumeHost.scrollIntoView({block:'start'});}));

  function mascot(w=wallet()) {const e=w?.equipped||{},pilot=['fox','panda','robot','dragon','octopus','lion'].includes(e.avatar)?e.avatar:'fox';return '<span class="avatarHat">'+(item(e.hat)?.icon||'')+'</span><span class="questMascot racerModel '+(e.effect==='flight'?'canFly':'')+'" data-racer="'+pilot+'" role="img" aria-label="'+item(pilot).name+'"></span><span class="avatarEffect">'+(item(e.effect)?.icon||'')+'</span>';}
  async function refresh() {
    const expected=profile.id;
    if(expected){let result=await api('hub&profile='+expected+(club?'&club='+club:''));if(profile.id!==expected)return;if(!club&&result.clubs?.length){club=Number(result.clubs[0].id);result=await api('hub&profile='+expected+'&club='+club);if(profile.id!==expected)return;}hub=result;}
    else hub=null;
    if(!busy&&!mission&&!resumeDuel&&!root.querySelector('#duelStage:not([hidden])'))render();drawContinuations();adultTools();
  }
  function render() {
    clearScene();
    const w=wallet();avatar=item(w?.equipped?.avatar||'fox')?.icon||'🦊';refreshPlayer();
    root.innerHTML='<div class="passport"><div class="avatarStage">'+mascot()+'</div><div><span class="questEyebrow">IL TUO PASSAPORTO DELLE AVVENTURE</span><h2>'+esc(profile.nickname||'Il tuo personaggio')+'</h2><p>'+(profile.id?'La tua avventura ti segue su ogni dispositivo.':'Gioca come ospite. Un adulto può creare un profilo per ritrovarti ovunque.')+'</p><div class="wallet"><span>🪙 <b>'+(w?.coins||0)+'</b> monete</span><span>✦ Livello '+(w?.level||1)+'</span><span>'+(w?.xp||0)+' XP</span></div><div class="levelTrack" aria-label="Esperienza verso il prossimo livello"><i style="width:'+((w?.xp||0)%100)+'%"></i></div></div><div class="passportSticker">PLAY<br>YOUR<br>WAY ✦</div></div><nav class="questTabs" aria-label="Passaporto"><button data-tab="lessons" aria-pressed="'+(tab==='lessons')+'">📚 Esercizi e temi</button><button data-tab="adventures" aria-pressed="'+(tab==='adventures')+'">🏝️ La mia isola</button><button data-tab="arena" aria-pressed="'+(tab==='arena')+'">⚔️ Sfida un compagno</button><button data-tab="missions" aria-pressed="'+(tab==='missions')+'">🧩 Missioni</button><button data-tab="shop" aria-pressed="'+(tab==='shop')+'">✨ Il mio stile</button><button data-tab="festival" aria-pressed="'+(tab==='festival')+'">🏆 La tua classe</button></nav><div id="questContent"></div><p id="questStatus" role="status" aria-live="polite"></p>';
    root.querySelectorAll('[data-tab]').forEach(b=>b.onclick=()=>{if(busy)return;tab=b.dataset.tab;if(tab==='lessons')lessonGroup='all';render();});
    window.dispatchEvent(new CustomEvent('wordyland-world-state',{detail:{activity,equipped:w?.equipped||{},adventures:profile.id?hub?.adventures||{}:guest.adventures}}));
    if(tab==='lessons')renderLessons();
    if(tab==='adventures')renderAdventures();
    if(tab==='arena')window.wordylandArena.mount(root.querySelector('#questContent'),profile,openAdults,resumeDuel);resumeDuel=null;if(tab==='missions')renderMissions();if(tab==='shop')renderShop();if(tab==='festival')renderFestival();
  }
  function chooseActivity(id,play=false){
    if(busy||!places[id])return;
    lessonSource=null;activity=id;setWorld(places[id].world);
    if(play&&mission?.activity!==id){mission=null;question=null;}
    tab=play?'missions':'adventures';render();
    root.scrollIntoView({behavior:matchMedia('(prefers-reduced-motion: reduce)').matches?'instant':'smooth',block:'start'});
    if(play&&!mission)startQuest();
  }
  window.addEventListener('wordyland-prepositions',()=>{if(busy)return;lessonGroup='prepositions';tab='lessons';render();});
  window.addEventListener('wordyland-style',()=>{shopGroup='avatar';tab='shop';render();});
  window.addEventListener('wordyland-place',e=>chooseActivity(e.detail));
  window.addEventListener('wordyland-play-place',e=>chooseActivity(e.detail,true));
  function renderLessons(){
    const topics={catpositions:{name:'Preposizioni · Il gatto e la scatola',icon:'🐈',activity:'pets',description:'In, on, under: guarda il gatto e completa la posizione.'},penpositions:lessonTopics.penpositions,mousepositions:lessonTopics.mousepositions,focus:{name:'Il corpo · ripasso mirato',icon:'👀',activity:'pets',description:'Testa, mano, dito e spalla: ascolta e allena le lettere.'},hello:{name:'Saluti e presentazioni',icon:'👋',activity:'creative',description:'Piccole frasi per fare amicizia.'},...lessonTopics};
    const content=root.querySelector('#questContent');
    const prepositions=lessonGroup==='prepositions',shown=Object.entries(topics).filter(([id])=>!prepositions||['catpositions','penpositions','mousepositions'].includes(id));
    content.innerHTML='<div class="adventureHeading"><div><span class="questEyebrow">'+(prepositions?'INGLESE · GUARDA, ASCOLTA E COMPLETA':'DALLA SCUOLA ALL’AVVENTURA')+'</span><h3>'+(prepositions?'Preposizioni di luogo':'Scegli cosa imparare oggi.')+'</h3></div><p>'+(prepositions?'In · on · under · behind · in front of · next to · between':'Conta, ascolta, completa e scrivi.<br>Una piccola missione alla volta.')+'</p></div>'+(prepositions?'<p><a href="#allenati" class="lessonShortcut">← Tutti gli esercizi</a></p>':'<a href="#preposizioni" class="prepositionsFeature"><span aria-hidden="true">📦</span><span><b>Preposizioni di luogo</b><small>In, on, under e le altre posizioni: esercizi con gatto, penna e topolino.</small></span><span aria-hidden="true">→</span></a>')+'<div class="lessonGrid">'+shown.map(([id,t])=>'<button type="button" class="lessonCard" data-lesson="'+id+'"><span aria-hidden="true">'+t.icon+'</span><small>'+(['catpositions','penpositions','mousepositions'].includes(id)?'PREPOSIZIONI':['focus','hello'].includes(id)?'RIPASSO':'NUOVO TEMA')+'</small><h4>'+t.name+'</h4><p>'+t.description+'</p><b>Apri la missione →</b></button>').join('')+'</div><p class="hint">Le frasi su nomi, età e famiglia sono esempi inventati. Puoi ripeterle con i tuoi dati durante il ripasso con un adulto.</p>';
    content.querySelectorAll('[data-lesson]').forEach(b=>b.onclick=()=>{
      if(busy)return;
      const id=b.dataset.lesson;lessonSource=id;activity=topics[id].activity;setWorld(places[activity].world);mission=null;question=null;tab='missions';render();startQuest();
    });
  }
  function renderAdventures(){
    const p=places[activity],progress=profile.id?hub?.adventures||{}:guest.adventures;
    const count=Math.max(0,Number(progress[activity])||0),next=[1,3,5,10].find(n=>n>count);
    const content=root.querySelector('#questContent');
    content.innerHTML='<div class="adventureHeading"><div><span class="questEyebrow">OGNI CURIOSITÀ HA IL SUO POSTO</span><h3>Oggi, che avventura scegli?</h3></div><p>Tutto è esplorabile fin da subito.<br>Le scoperte crescono con te.</p></div><div class="adventureDestinations">'+Object.entries(places).map(([id,p])=>'<button class="destinationCard" data-destination="'+id+'" aria-pressed="'+(id===activity)+'" style="--place:'+p.color+'"><span class="destinationArt" aria-hidden="true"></span><span class="destinationIcon" aria-hidden="true">'+p.icon+'</span><b>'+p.name+'</b><small>'+(Number(progress[id])||0)+' mission'+(Number(progress[id])===1?'e completata':'i completate')+'</small></button>').join('')+'</div><section class="placePanel" aria-labelledby="placeTitle"><div class="placePreview" id="placePreview"><span class="sceneFallback">'+p.icon+'</span><span class="previewBadge">'+p.icon+' IL TUO PICCOLO MONDO</span><button type="button" class="scenePlayButton" id="tryScene">'+window.wordylandIsland.actions[activity].label+'</button></div><div class="placeCopy"><span class="questEyebrow">'+p.tag+'</span><h3 id="placeTitle">'+p.name+'</h3><p>'+p.description+'</p><p class="placeGoal">'+p.goal+'</p><div class="discoveryPath" aria-label="'+count+' missioni completate">'+[1,3,5,10].map((n,i)=>'<span class="'+(count>=n?'discovered':'')+'"><b>'+(count>=n?'★':'☆')+'</b><small>'+['Prima scoperta','Esplorazione','Avventura','Grande viaggio'][i]+'<em>'+n+' mission'+(n===1?'e':'i')+'</em></small></span>').join('')+'</div><p class="hint">'+(next?'Prossima scoperta: '+count+' / '+next+' mission'+(next===1?'e.':'i.'):'Hai raggiunto tutte le tappe! Puoi continuare a esplorare.')+'</p>'+(activity==='pets'?'<div class="petCare"><button class="audio" data-care="water">💧 Acqua</button><button class="audio" data-care="food">🥕 Spuntino</button><button class="audio" data-care="friend">💗 Carezza</button><p id="petCareStatus" role="status"></p></div>':'')+'<div class="placeActions"><button class="primary" id="playPlace">Gioca qui →</button>'+(['treehouse','pets','creative','kart'].includes(activity)?'<button class="audio" id="stylePlace">'+({treehouse:'Arreda la casa',pets:'Scegli il compagno',creative:'Scegli i colori',kart:'Personalizza il kart'}[activity])+'</button>':'')+'</div></div></section>';
    content.querySelectorAll('[data-destination]').forEach(b=>b.onclick=()=>chooseActivity(b.dataset.destination));
    content.querySelectorAll('[data-care]').forEach(b=>b.onclick=()=>{sceneView?.update({progress:1});sceneView?.react('success');content.querySelector('#petCareStatus').textContent={water:'Water = acqua. Una pausa per bere! 💧',food:'Food = cibo. Buono questo spuntino! 🥕',friend:'Friend = amico. Una carezza per te! 💗'}[b.dataset.care];});
    content.querySelector('#tryScene').onclick=()=>sceneView?.action();
    content.querySelector('#playPlace').onclick=()=>chooseActivity(activity,true);
    content.querySelector('#stylePlace')?.addEventListener('click',()=>{shopGroup={treehouse:'home',pets:'pet',creative:'palette',kart:'kart'}[activity];tab='shop';render();});
    sceneView=window.wordylandIsland.mount(content.querySelector('#placePreview'),{kind:activity,equipped:wallet()?.equipped,progress:0,preview:true});
  }
  function renderMissions() {
    const content=root.querySelector('#questContent'),place=places[mission?.activity||activity],subject=mission?.source||lessonSource,title=lessonTopics[subject]?.name||(subject==='catpositions'?'Preposizioni · Il gatto e la scatola':subject==='focus'?'Il corpo · ripasso mirato':place.name);
    content.innerHTML='<div class="activeAdventure"><span>'+place.icon+'</span><div><small>LA TUA MISSIONE</small><b>'+esc(title)+'</b></div><button class="audio" id="backIsland">Torna all’isola</button></div><div class="missionGrid"><div class="dailyMission"><span class="questEyebrow">UNA PICCOLA SFIDA, UNA NUOVA SCOPERTA</span><h3>La tua prossima avventura</h3><p>'+place.goal+'</p><div class="missionPath"><span>👀<small>Scopri</small></span><i>···</i><span>🧩<small>Gioca</small></span><i>···</i><span>✏️<small>Scrivi</small></span><i>···</i><span>🎁<small>Apri!</small></span></div><label for="questSource">La tua prossima missione</label><select id="questSource"><optgroup label="Mondi dell’isola">'+Object.entries(places).filter(([id])=>id!=='creative').map(([,p])=>'<option value="'+p.category+'">'+p.icon+' '+p.name+'</option>').join('')+'</optgroup><optgroup label="Nuovi esercizi e temi">'+Object.entries(lessonTopics).map(([id,t])=>'<option value="'+id+'">'+t.icon+' '+t.name+'</option>').join('')+'<option value="focus">🎯 Il corpo · ripasso mirato</option></optgroup><optgroup label="Scuola e ripasso"><option value="personal">✨ Il mio percorso personale</option><option value="body">👀 Il corpo</option><option value="catpositions">🐈 Preposizioni · Il gatto e la scatola</option><option value="toys">🧸 Giocattoli</option><option value="colors">🎨 Colori</option><option value="hello">👋 Presentiamoci</option><option value="school">✏️ A scuola</option>'+(hub?.studies||[]).map(s=>'<option value="study:'+s.id+'">📚 '+esc(s.title)+'</option>').join('')+'</optgroup></select><button class="primary" id="beginQuest">Apri la missione →</button></div><div class="treasureCard"><span class="treasureIcon">🎁</span><h3>Il tuo prossimo tesoro</h3><p>Completa la missione: fino a <b>15 monete</b> e un bonus quando superi una difficoltà.</p><div class="rewardPill">🪙 Monete · ✦ Esperienza</div><p class="hint">Premi per tre missioni al giorno con parole nuove. Il ripasso e gli aiuti restano sempre disponibili.</p></div></div><div id="missionStage" class="missionStage" hidden></div>';
    root.querySelector('#questSource').value=mission?.source||lessonSource||place.category;
    root.querySelector('#backIsland').onclick=()=>{tab='adventures';render();};
    root.querySelector('#beginQuest').onclick=startQuest;
    if(mission){if(mission.nextQuestion){question=mission.nextQuestion;delete mission.nextQuestion;}drawQuestion();}
  }
  async function startQuest() {
    if(busy)return;busy=true;
    try {
      const source=root.querySelector('#questSource').value, owner=profile.id;
      const existing=profile.id?pending.quests.find(q=>q.source===source&&q.activity===activity):guestDraft();
      if(existing&&(profile.id||existing.source===source&&existing.activity===activity)){busy=false;await resumeQuest(profile.id?existing.token:'guest');return;}
      if(profile.id) {
        const result=await api('quest-start',source.startsWith('study:')?{study:Number(source.split(':')[1]),activity}:{category:source,activity});
        if(owner!==profile.id)return;mission={token:result.token,total:result.total,profile:owner,activity,source};question=result.question;
      } else {
        let pool=source==='personal'?allWords().filter(w=>!w[0].includes(' ')):lists[source]||lists.body;
        const candidates=pool;pool=shuffle(pool).slice(0,3);
        const questions=pool.map((w,i)=>makeLessonQuestion(w,i,pool.length,candidates));
        mission={token:'guest',id:Array.from(crypto.getRandomValues(new Uint8Array(16)),b=>b.toString(16).padStart(2,'0')).join(''),questions,total:questions.length,step:0,xp:0,profile:null,activity,source,expiresAt:Date.now()+604800000};question=questions[0];
      }
      const stored=profile.id||persistGuestMission();refreshPending();
      drawQuestion();root.querySelector('#missionStage').scrollIntoView({behavior:window.wordylandMotion.allowed()?'smooth':'instant',block:'start'});say(stored?'Nessuna fretta: puoi ascoltare e chiedere aiuto.':'Il browser non può salvare la missione: tieni aperta questa pagina.');
    } catch(e){say(e.message);}finally{busy=false;}
  }
  function audio(useAnswer=false) {
    if(!('speechSynthesis'in window)){say('Audio non disponibile. Guarda la parola con Un aiuto.');return;}
    speechSynthesis.cancel();const u=new SpeechSynthesisUtterance(useAnswer===true?question.word:['count','dialogue','gap'].includes(question.kind)&&question.prompt?question.prompt:question.word);u.lang='en-GB';u.rate=.82;
    const v=speechSynthesis.getVoices().find(x=>x.lang==='en-GB');if(v)u.voice=v;
    speechSynthesis.speak(u);
  }
  function drawQuestion(challenge=false) {
    if(!challenge){hinted=false;questionFailed=false;}
    const stage=root.querySelector('#missionStage');if(!stage)return;
    const previousWorld=stage.querySelector('#missionWorld');if(!previousWorld)clearScene();
    root.querySelector('.missionGrid').hidden=true;stage.hidden=false;
    const q=question;stage.innerHTML='<div class="missionWorld" id="missionWorld"><span class="sceneFallback">'+places[mission.activity].icon+'</span><span class="worldProgressLabel">'+(q.number-1)+' / '+mission.total+' tappe</span></div><div class="missionPause"><button class="audio" id="pauseQuest">Pausa · riprendi più tardi</button><small>Le risposte confermate si salvano automaticamente.</small></div><div class="questStep">PROVA '+q.number+' DI '+mission.total+'<span>'+currentWorld().icon+' '+currentWorld().name+'</span></div><div class="questTrack"><i style="width:'+((q.number-1)/mission.total*100)+'%"></i></div><div class="questPicture">'+picture(q.word,q.emoji)+'</div><p>'+esc(q.translation)+'</p><button class="audio" id="questListen">🔊 Ascolta</button><div id="questWork"></div><div id="questFeedback" role="status" aria-live="polite"></div><div id="questActions"></div>';
    if(previousWorld)stage.querySelector('#missionWorld').replaceWith(previousWorld);
    else sceneView=window.wordylandIsland.mount(stage.querySelector('#missionWorld'),{kind:mission.activity,equipped:wallet()?.equipped,progress:(q.number-1)/mission.total});
    stage.querySelector('#pauseQuest').onclick=async()=>{if(busy)return;if(!profile.id&&!persistGuestMission()){say('Il browser non può salvare la missione: tieni aperta questa pagina.');return;}mission=null;question=null;tab='adventures';location.hash='#continua';render();await refreshPending();if(!resumeHost.hidden)resumeHost.scrollIntoView({block:'start'});};
    stage.querySelector('#questListen').onclick=()=>audio();
    const work=stage.querySelector('#questWork'),actions=stage.querySelector('#questActions');
    if(!challenge){work.innerHTML='<h3>Guarda bene la parola</h3><div class="questWord">'+esc(q.word)+'</div><p>Ascolta e osserva. Quando vuoi, giochiamo!</p>';actions.innerHTML='<button class="primary" id="readyChallenge">Sono pronto! →</button>';actions.querySelector('button').onclick=()=>drawQuestion(true);if(['count','dialogue'].includes(q.kind)){const listen=document.createElement('button');listen.className='audio';listen.textContent='🔊 Ascolta la risposta';listen.onclick=()=>audio(true);work.append(listen);}actions.querySelector('button').focus({preventScroll:true});return;}
    const titles={count:'Conta le figure e scegli la risposta',dialogue:'Come rispondi?',gap:'Completa la frase',write:'La porta segreta: ascolta e scrivi',choice:'Ascolta e trova la figura',missing:'Il ponte della lettera mancante',build:'Il laboratorio delle lettere'};
    work.innerHTML='<h3>'+titles[q.kind]+'</h3>';
    if(q.kind==='count'||q.kind==='dialogue'){
      stage.querySelector('.questPicture').hidden=q.kind==='dialogue';stage.querySelector('.questPicture').nextElementSibling.hidden=true;
      work.innerHTML+='<p class="lessonPrompt">'+esc(q.prompt)+'</p><div class="questChoices phraseChoices">'+q.options.map((o,i)=>'<button data-answer="'+i+'">'+esc(o[0])+'</button>').join('')+'</div>';
      work.querySelectorAll('[data-answer]').forEach(b=>b.onclick=()=>submitAnswer(q.options[Number(b.dataset.answer)][0],b));
    }else if(q.kind==='choice'){
      // Keep only the options visible once the listening challenge begins.
      stage.querySelector('.questPicture').hidden=true;stage.querySelector('.questPicture').nextElementSibling.hidden=true;
      const options=q.options||[];
      work.innerHTML+='<div class="questChoices">'+options.map((o,i)=>'<button data-answer="'+i+'">'+picture(o[0],o[2])+'<small>'+esc(o[1])+'</small></button>').join('')+'</div>';
      work.querySelectorAll('[data-answer]').forEach(b=>b.onclick=()=>submitAnswer(options[Number(b.dataset.answer)][0],b));
    }else if(q.kind==='build'){
      tiles=shuffle([...q.word].map((char,id)=>({char,id})));picked=[];
      work.innerHTML+='<div id="questSlots" class="questSlots"></div><div id="questTiles" class="questTiles"></div><p class="hint">Tocca una lettera per inserirla, una casella per correggere. ␣ indica uno spazio.</p><button class="primary" id="checkQuest">Controlla ✓</button>';
      drawTiles();work.querySelector('#checkQuest').onclick=()=>submitAnswer(picked.map(x=>x.char).join(''));
    }else{
      work.innerHTML+=(['missing','gap'].includes(q.kind)?'<div class="questWord">'+esc(q.mask)+'</div>':'')+'<form id="questAnswerForm"><label for="questAnswer">'+(q.kind==='missing'?'La lettera mancante':q.kind==='gap'?'La parola o il gruppo di parole mancante':'Scrivi in inglese')+'</label><input id="questAnswer" autocomplete="off" autocorrect="off" autocapitalize="none" spellcheck="false" '+(q.kind==='missing'?'maxlength="1"':'maxlength="100"')+' required><button class="primary">Controlla ✓</button></form>';
      work.querySelector('form').onsubmit=e=>{e.preventDefault();submitAnswer(work.querySelector('input').value);};
    }
    actions.innerHTML='<button class="audio" id="questHint">💡 Un aiuto · sempre gratis</button><div id="questHelp" hidden class="questWord">'+esc(q.word)+'</div>';
    work.querySelector('input,button')?.focus({preventScroll:true});
    actions.querySelector('button').onclick=()=>{const hint=actions.querySelector('#questHelp');hint.hidden=!hint.hidden;hinted=true;};
  }
  function drawTiles(){
    const work=root.querySelector('#questWork');
    work.querySelector('#questSlots').innerHTML=[...question.word].map((_,i)=>'<button data-slot="'+i+'" aria-label="Casella '+(i+1)+'">'+esc(picked[i]?.char===' '?'␣':picked[i]?.char||'')+'</button>').join('');
    work.querySelector('#questTiles').innerHTML=tiles.map(t=>'<button data-tile="'+t.id+'" '+(picked.some(x=>x.id===t.id)?'disabled':'')+'>'+esc(t.char===' '?'␣':t.char)+'</button>').join('');
    work.querySelectorAll('[data-tile]').forEach(b=>b.onclick=()=>{picked.push(tiles.find(t=>t.id===Number(b.dataset.tile)));drawTiles();});
    work.querySelectorAll('[data-slot]').forEach(b=>b.onclick=()=>{picked.splice(Number(b.dataset.slot),1);drawTiles();});
  }
  async function submitAnswer(answer,chosenButton=null){
    if(busy)return;if(!answer.trim()){say('Inserisci la risposta oppure usa Un aiuto.');return;}busy=true;
    const feedback=root.querySelector('#questFeedback'),owner=profile.id,token=mission.token;root.querySelector('#pauseQuest').disabled=true;
    try{
      let result;
      if(profile.id){result=await api('quest-answer',{token:mission.token,step:question.number-1,answer});}
      else{
        const correct=normalize(answer)===normalize(question.answer||question.word);
        if(!correct)result={correct:false,message:'Riascolta e riprova con calma. Gli aiuti sono sempre disponibili.'};
        else {
          const day=new Date().toISOString().slice(0,10),key=day+':'+normalize(question.word);
          if(!guest.credits[key]&&Object.keys(guest.credits).filter(x=>x.startsWith(day)).length<15){guest.credits[key]=true;guest.xp+=10;mission.xp+=10;}
          const done=question.number===mission.total;
          if(guest.finished[mission.id])throw Error('Questa missione è già completata. Aprine una nuova.');
          let coins=0;if(done&&mission.xp>0&&(guest.paid[day]||0)<3){coins=15;guest.coins+=coins;guest.paid[day]=(guest.paid[day]||0)+1;}
          if(done){guest.adventures[mission.activity]=(Number(guest.adventures[mission.activity])||0)+1;guest.finished[mission.id]=Date.now();}
          storeGuest();result={correct:true,done,xp:mission.xp,coins,wallet:guest,question:mission.questions[question.number]};
        }
      }
      if(owner!==profile.id||token!==mission?.token)return;
      const word=question.word;stats[word]??={good:0,attempts:0,review:false};stats[word].attempts++;if(result.correct&&!hinted&&!questionFailed){stats[word].good++;stats[word].review=false;}else{stats[word].review=true;if(!result.correct)questionFailed=true;}save();updateStats();
      const learning={expected:window.wordylandLearning.expected(question),answer,word:question.word,translation:question.translation,kind:question.kind,prompt:question.prompt,chosenTranslation:question.options?.find(option=>option[0]===answer)?.[1],button:chosenButton,input:root.querySelector('#questAnswer')};
      if(!result.correct){window.wordylandLearning.show(feedback,false,learning);sceneView?.react('retry');return;}
      if(hub&&result.wallet)hub.wallet=result.wallet;
      if(!result.done){mission.step=question.number;persistGuestMission();}else if(!profile.id){try{localStorage.removeItem(guestMissionKey);}catch{}}
      refreshPending();
      root.querySelectorAll('#questWork button,#questWork input').forEach(b=>b.disabled=true);
      window.wordylandLearning.show(feedback,true,learning);
      sceneView?.update({progress:question.number/mission.total});
      if(!result.done)sceneView?.react('success');
      const progressLabel=root.querySelector('.worldProgressLabel');if(progressLabel)progressLabel.textContent=question.number+' / '+mission.total+' tappe';
      if(result.done){
        if(hub)hub.wallet=result.wallet;
        const w=result.wallet;root.querySelector('.wallet').innerHTML='<span>🪙 <b>'+w.coins+'</b> monete</span><span>✦ Livello '+w.level+'</span><span>'+w.xp+' XP</span>';root.querySelector('.levelTrack i').style.width=(w.xp%100)+'%';
        const previousWorld=root.querySelector('#missionWorld');
        const completedActivity=mission.activity,place=places[completedActivity];
        const stage=root.querySelector('#missionStage');
        stage.innerHTML='<div class="missionWorld" id="completedWorld"><span class="sceneFallback">'+place.icon+'</span></div><div class="openTreasure">🎉</div><div id="completedFeedback" role="status"></div><span class="questEyebrow">MISSIONE COMPLETATA</span><h3>'+place.name+': ce l’hai fatta!</h3><p>Ogni tentativo ti ha portato fin qui.</p><div class="missionRewards"><b>✦ '+result.xp+' XP</b><b>🪙 '+result.coins+' monete</b></div><p>'+(result.coins?'La tua isola cresce con te! Scegli un oggetto per il personaggio, la casa o il kart.':'Hai già raccolto i premi per queste parole o le monete di oggi. Puoi continuare a giocare, senza perdere nulla.')+'</p><button class="primary" id="rewardShop">Personalizza il tuo mondo ✨</button><button class="audio" id="anotherQuest">Un’altra avventura</button>';
        if(previousWorld){previousWorld.id='completedWorld';stage.querySelector('#completedWorld').replaceWith(previousWorld);previousWorld.querySelector('.worldProgressLabel').textContent='Tutte le tappe completate!';}
        else sceneView=window.wordylandIsland.mount(stage.querySelector('#completedWorld'),{kind:completedActivity,equipped:w.equipped,progress:1});
        window.wordylandLearning.show(stage.querySelector('#completedFeedback'),true,{...learning,message:'Missione completata! Ogni parola è una nuova scoperta.'});
        sceneView?.react('complete');
        window.dispatchEvent(new CustomEvent('wordyland-celebrate'));
        mission=null;question=null;
        stage.querySelector('#rewardShop').onclick=()=>{shopGroup={treehouse:'home',pets:'pet',creative:'palette',kart:'kart'}[completedActivity]||'avatar';tab='shop';render();};stage.querySelector('#anotherQuest').onclick=()=>render();
        if(profile.id){const result=await api('hub&profile='+profile.id+(club?'&club='+club:''));if(owner===profile.id)hub=result;}
      }else{
        root.querySelector('#questActions').innerHTML='<button class="primary" id="questNext">Continua →</button>';
        root.querySelector('#questNext').onclick=()=>{question=result.question;drawQuestion();};mission.nextQuestion=result.question;
      }
    }catch(e){feedback.textContent=e.message;if(owner===profile.id&&mission?.token===token&&profile.id){const retry=document.createElement('button');retry.className='audio';retry.textContent='Riprendi dal salvataggio';retry.onclick=()=>resumeQuest(token);root.querySelector('#questActions')?.append(retry);}}finally{busy=false;const pause=root.querySelector('#pauseQuest');if(pause)pause.disabled=false;}
  }
  function renderShop(){
    clearScene();
    const groups={avatar:'Personaggio',home:'Casa',pet:'Compagno',kart:'Kart',palette:'Atelier'},w=wallet();
    const previewKind={avatar:'pets',home:'treehouse',pet:'pets',kart:'kart',palette:'creative'}[shopGroup];
    const shown=catalog.filter(it=>shopGroup==='avatar'?['avatar','hat','effect'].includes(it.slot):shopGroup==='home'?['room','plant','rug','lamp'].includes(it.slot):it.slot===shopGroup);
    root.querySelector('#questContent').innerHTML='<div class="shopHeading"><div><span class="questEyebrow">IL TUO MONDO, COME PIACE A TE</span><h3>Scegli il tuo personaggio e il tuo stile.</h3><p>La volpe è già tua. Sblocca gli altri personaggi con le monete delle missioni, poi premi Usa personaggio.</p><p class="hint">Nessun acquisto con denaro reale. Tutte le attività sono già aperte.</p></div></div><nav class="styleTabs" aria-label="Cosa vuoi personalizzare?">'+Object.entries(groups).map(([id,name])=>'<button class="audio" data-style="'+id+'" aria-pressed="'+(shopGroup===id)+'">'+name+'</button>').join('')+'</nav><div class="stylePreview" id="stylePreview"><span class="sceneFallback">'+places[previewKind].icon+'</span><span class="previewBadge">'+groups[shopGroup]+' · la tua scelta</span></div>'+(shopGroup==='avatar'?'<div class="characterPlay"><p><b>Stai usando: '+esc(item(w?.equipped?.avatar||'fox').name)+'.</b> Il personaggio ti accompagna nelle avventure. Il compagno del rifugio si sceglie a parte.</p><span>Provalo subito:</span><div><button class="audio" data-character-play="kart">🏎️ Guida il kart</button><button class="audio" data-character-play="football">⚽ Gioca a calcio</button><button class="audio" data-character-play="space">🚀 Parti per lo spazio</button></div></div>':'')+'<div class="shopGrid">'+shown.map(it=>{const owned=w?.inventory.includes(it.id),equipped=w?.equipped[it.slot]===it.id;return '<article class="shopItem '+(equipped?'equipped':'')+'"><span '+(it.slot==='avatar'?'class="racerModel" data-racer="'+it.id+'"':'')+' aria-hidden="true">'+(it.slot==='avatar'?'':it.icon)+'</span><h4>'+it.name+'</h4><small>'+(it.price===0?'Sempre disponibile':it.slot==='effect'?'Effetto scenico':'Per il tuo mondo')+'</small><button class="'+(owned?'audio':'primary')+'" data-item="'+it.id+'" '+(equipped?'disabled':'')+'>'+(equipped?'In uso ✓':owned?(it.slot==='avatar'?'Usa personaggio':'Scegli'):it.price===0?'Scegli · gratis':'🪙 '+it.price+' · Sblocca')+'</button></article>';}).join('')+'</div><p class="hint">Gli oggetti cambiano l’aspetto del tuo mondo. Gli aiuti negli esercizi restano gratis per tutti.</p>';
    const eq={...w?.equipped};if(shopGroup==='avatar')eq.pet=eq.avatar||'fox';
    sceneView=window.wordylandIsland.mount(root.querySelector('#stylePreview'),{kind:previewKind,equipped:eq,preview:true});
    root.querySelectorAll('[data-character-play]').forEach(b=>b.onclick=()=>chooseActivity(b.dataset.characterPlay,true));
    root.querySelectorAll('[data-style]').forEach(b=>b.onclick=()=>{if(busy)return;shopGroup=b.dataset.style;renderShop();});
    root.querySelectorAll('[data-item]').forEach(b=>b.onclick=async()=>{
      if(busy)return;busy=true;const owner=profile.id,it=item(b.dataset.item),owned=w.inventory.includes(it.id);b.disabled=true;
      try{
        if(profile.id){const result=await api(owned?'equip':'buy',{item:it.id});if(owner!==profile.id)return;hub.wallet=result.wallet;}
        else{if(!owned){if(guest.coins<it.price)throw new Error('Ti mancano '+(it.price-guest.coins)+' monete. Completa una missione!');guest.coins-=it.price;guest.inventory.push(it.id);}guest.equipped[it.slot]=it.id;storeGuest();}
        render();say(it.name+' è pronto per l’avventura!');
      }catch(e){say(e.message);if(b.isConnected)b.disabled=false;}finally{busy=false;}
    });
  }
  function renderFestival(){
    const content=root.querySelector('#questContent');
    if(!profile.id||!hub?.clubs?.length){content.innerHTML='<div class="festivalWelcome"><span>🏆</span><h3>Un festival per la tua classe</h3><p>L’insegnante o un adulto può creare il gruppo classe e invitare i partecipanti con un codice. Qui compaiono solo soprannomi e avatar.</p><button class="primary" id="festivalLogin">Apri l’area adulti</button></div>';content.querySelector('button').onclick=openAdults;return;}
    const board=hub?.board||[],team=hub?.team||0;
    content.innerHTML='<div class="festivalHeader"><div><span class="questEyebrow">IL FESTIVAL DELLE SCOPERTE</span><h3>Una settimana, tante conquiste</h3><p>Esperienza, miglioramenti e coraggio. Ogni lunedì una nuova avventura.</p></div><label>La tua classe<select id="festivalClub">'+(hub?.clubs||[]).map(c=>'<option value="'+c.id+'" '+(club===c.id?'selected':'')+'>'+esc(c.name)+'</option>').join('')+'</select></label></div><div class="teamQuest"><span>🚀</span><div><b>Costruiamo insieme la stazione spaziale</b><p>'+team+' / '+(hub?.teamGoal||300)+' XP di squadra</p><div class="levelTrack"><i style="width:'+Math.min(100,team/3)+'%"></i></div></div><span>'+(team>=300?'🌟':'🪐')+'</span></div><div class="missionWorld" id="teamWorld"><span class="sceneFallback">🚀</span><span class="worldProgressLabel">LA STAZIONE DELLA CLASSE</span></div><ol class="festivalBoard">'+board.map((p,i)=>'<li class="'+(p.mine?'myRank':'')+'"><span class="rankMedal">'+(['🥇','🥈','🥉'][i]||'✦')+'</span><span class="rankAvatar racerModel" data-racer="'+(['fox','panda','robot','dragon','octopus','lion'].includes(p.equipped?.avatar)?p.equipped.avatar:'fox')+'" aria-hidden="true"></span><div><b>'+esc(p.nickname)+(p.mine?' · tu':'')+'</b><small>'+(p.improvement?'🌱 '+p.improvement+' difficoltà superate':p.missions?'💪 '+p.missions+' missioni completate':'🌟 La tua prima scoperta ti aspetta')+'</small></div><strong>'+p.points+' XP</strong></li>').join('')+'</ol><p class="hint">Contano fino a 15 parole nuove al giorno. Nessun punto viene tolto per gli errori. La partecipazione ai gruppi è gestita dagli adulti.</p>';
    sceneView=window.wordylandIsland.mount(content.querySelector('#teamWorld'),{kind:'space',progress:Math.min(1,team/(hub?.teamGoal||300))});
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
    if(changed){pendingEpoch++;pending={quests:[],duels:[]};drawContinuations();mission=null;question=null;club=0;hub=null;activity='treehouse';lessonSource=null;clearScene();}
    refreshPending();try{await refresh();}catch(e){render();say(e.message);}
  });
  profile=window.wordylandAccount?.info()||profile;drawContinuations();refreshPending();render();if(profile.id)refresh().catch(e=>say(e.message));
})();
