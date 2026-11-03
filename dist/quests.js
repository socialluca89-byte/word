/* Missions, wardrobe and a private weekly festival. Wallets are server-owned. */
(() => {
  const root=document.createElement('section');root.id='questHub';root.className='questHub';
  root.setAttribute('aria-label','Il tuo passaporto delle avventure');
  document.querySelector('.raceHero').after(root);
  let profile={id:null},hub=null,tab='adventures',mission=null,question=null,busy=false,tiles=[],picked=[],club=0, questionFailed=false,purchasePending=false,deferredNavigation=false;
  // One focused play surface; returning to a section always restores navigation.
  window.wordylandUI={deferNavigation(){if(!purchasePending)return false;deferredNavigation=true;const status=document.querySelector('#appStatus');if(status)status.textContent='Confermo la scelta in corso, poi apro la sezione richiesta.';return true;},play(kind=''){
    if(kind&&kind!=='training'&&['#allenamento','#dettato'].includes(location.hash))window.wordylandTraining?.leaveForGame();
    document.body.dataset.play=kind;
    if(kind){document.querySelectorAll('.adultNavigation,.accountArea').forEach(node=>node.open=false);}
  },reveal:revealSection};
  function revealSection(selector='.questSectionTools'){
    const target=root.querySelector(selector)||root.querySelector('#questContent');if(!target?.isConnected)return;
    target.tabIndex=-1;target.focus({preventScroll:true});target.scrollIntoView({behavior:window.wordylandMotion?.allowed()?'smooth':'instant',block:'start'});
  }
  const places=window.wordylandIsland.places;
  let lessonSource=null,lessonGroup='all';
  let activity='treehouse',shopGroup='avatar',sceneView=null;
  let questSpeech=null,questSpeechEpoch=0;
  function stopQuestAudio(){const own=questSpeech;questSpeech=null;questSpeechEpoch++;root.querySelector('#questListen')?.removeAttribute('data-quest-speaking');if(own&&'speechSynthesis'in window)speechSynthesis.cancel();}
  const clearScene=()=>{stopQuestAudio();window.wordylandLearning?.stopSpeech?.(root);sceneView?.dispose();sceneView=null;};
  window.addEventListener('wordyland-stop-audio',stopQuestAudio);window.addEventListener('pagehide',stopQuestAudio);window.addEventListener('hashchange',stopQuestAudio);document.addEventListener('visibilitychange',()=>{if(document.hidden)stopQuestAudio();});
  let guest,guestWalletStamp=null,guestWriteConflict=false;try{guestWalletStamp=localStorage.getItem('wordylandGuestWallet');guest=JSON.parse(guestWalletStamp||'null');}catch{}
  guest=guest&&Number.isFinite(guest.coins)?guest:{coins:0,xp:0,level:1,equipped:{avatar:'fox'},inventory:['fox'],credits:{},paid:{}};
  const catalog=[['fox','Volpe esploratrice','🦊','avatar',0],['panda','Panda delle stelle','🐼','avatar',30],['robot','Robot inventore','🤖','avatar',45],['dragon','Drago delle parole','🐉','avatar',60],['octopus','Polpo creativo','🐙','avatar',45],['lion','Leone coraggioso','🦁','avatar',60],['cap','Cappello da avventura','🧢','hat',20],['crown','Corona delle scoperte','👑','hat',40],['sparkles','Scia luminosa','✨','effect',25],['flight','Volo delle parole','🪽','effect',50],['confetti','Festa di coriandoli','🎉','effect',35]].map(([id,name,icon,slot,price])=>({id,name,icon,slot,price}));
  guest.adventures=guest.adventures&&typeof guest.adventures==='object'&&!Array.isArray(guest.adventures)?guest.adventures:{};
  catalog.push(...[{"id": "pet-fox", "name": "Volpina curiosa", "icon": "🦊", "slot": "pet", "price": 0}, {"id": "pet-bunny", "name": "Coniglietto soffice", "icon": "🐰", "slot": "pet", "price": 0}, {"id": "pet-cat", "name": "Gattino delle nuvole", "icon": "🐱", "slot": "pet", "price": 0}, {"id": "room-sky", "name": "Casa cielo", "icon": "🩵", "slot": "room", "price": 0}, {"id": "room-peach", "name": "Casa pesca", "icon": "🍑", "slot": "room", "price": 0}, {"id": "room-mint", "name": "Casa menta", "icon": "🌿", "slot": "room", "price": 0}, {"id": "plant", "name": "Pianta delle scoperte", "icon": "🪴", "slot": "plant", "price": 20}, {"id": "rug", "name": "Tappeto arcobaleno", "icon": "🌈", "slot": "rug", "price": 20}, {"id": "lamp", "name": "Lampada stellina", "icon": "💡", "slot": "lamp", "price": 25}, {"id": "kart-blue", "name": "Kart blu", "icon": "💙", "slot": "kart", "price": 0}, {"id": "kart-pink", "name": "Kart corallo", "icon": "🩷", "slot": "kart", "price": 0}, {"id": "kart-mint", "name": "Kart menta", "icon": "💚", "slot": "kart", "price": 20}, {"id": "paint-sun", "name": "Colori del sole", "icon": "🌞", "slot": "palette", "price": 0}, {"id": "paint-ocean", "name": "Colori dell’oceano", "icon": "🌊", "slot": "palette", "price": 0}, {"id": "paint-berry", "name": "Colori dei frutti", "icon": "🍓", "slot": "palette", "price": 0}]);
  catalog.push(...window.wordylandRewardExtras);
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
  function grantGuestBadges(state=guest){const counts={missions:Object.values(state.adventures).reduce((n,v)=>n+(Number(v)||0),0),activities:Object.values(state.adventures).filter(v=>Number(v)>0).length};for(const reward of catalog)if(reward.unlock&&Object.entries(reward.unlock).every(([metric,needed])=>counts[metric]>=needed)&&!state.inventory.includes(reward.id))state.inventory.push(reward.id);}
  grantGuestBadges();
  const storeGuest=(state=guest)=>{grantGuestBadges(state);state.level=1+Math.floor(state.xp/100);guestWriteConflict=false;try{if(localStorage.getItem('wordylandGuestWallet')!==guestWalletStamp){guestWriteConflict=true;return false;}const serialized=JSON.stringify(state);localStorage.setItem('wordylandGuestWallet',serialized);guestWalletStamp=serialized;return true;}catch{return false;}};
  const resumeHost=document.createElement('section');resumeHost.id='resumeHub';resumeHost.className='resumeHub';resumeHost.hidden=true;resumeHost.setAttribute('aria-label','Missioni e sfide da continuare');document.querySelector('.startChoices').before(resumeHost);
  let pending={quests:[],duels:[]},pendingEpoch=0,resumeDuel=null;
  const guestMissionKey='wordylandGuestMission';
  guest.finished=guest.finished&&typeof guest.finished==='object'&&!Array.isArray(guest.finished)?guest.finished:{};
  for(const [id,time] of Object.entries(guest.finished))if(!/^[a-f0-9]{32}$/.test(id)||!Number.isFinite(time)||time<Date.now()-604800000)delete guest.finished[id];
  function guestPool(source){return source==='personal'?allWords().filter(w=>!w[0].includes(' ')):lists[source]||lists.body;}
  function guestDraft(){
    try{const draft=Object.hasOwn(guest,'missionDraft')?guest.missionDraft:JSON.parse(localStorage.getItem(guestMissionKey)||'null');if(!draft||typeof draft.source!=='string'||draft.source!=='personal'&&!Object.hasOwn(lists,draft.source)||!Array.isArray(draft.words)||!draft.words.length||draft.words.length>8||!Number.isInteger(draft.step)||draft.step<0||draft.step>=draft.words.length||!places[draft.activity]||!/^[a-f0-9]{32}$/.test(draft.id)||!Number.isFinite(draft.expiresAt)||draft.expiresAt<Date.now()||guest.finished[draft.id])return null;const pool=guestPool(draft.source);if(!draft.words.every(word=>pool.some(row=>row[0]===word)))return null;return draft;}catch{return null;}
  }
  function guestMissionSnapshot(step=mission.step||0,xp=mission.xp,flags=mission.questions[step]){return {id:mission.id,words:mission.questions.map(q=>q.word),step,xp,source:mission.source,activity:mission.activity,expiresAt:mission.expiresAt,hadErrors:Boolean(flags?.hadErrors),assisted:Boolean(flags?.assisted)};}
  function commitGuestMission(next,draft){
    // The wallet and its current mission share one atomic localStorage write.
    // The old mission key is only a compatibility mirror; a stale mirror cannot
    // revive a completed mission or replace a newer confirmed answer.
    next.missionDraft=draft;
    if(!storeGuest(next))return false;
    guest=next;
    try{if(draft===null)localStorage.removeItem(guestMissionKey);else localStorage.setItem(guestMissionKey,JSON.stringify(draft));}catch{}
    return true;
  }
  function guestSaveFailure(){return Object.assign(Error(guestWriteConflict?'I progressi sono cambiati in un’altra scheda. Ricarica questa pagina e riprendi dall’ultima risposta salvata: non sovrascriviamo le scoperte o gli oggetti già confermati.':'Il browser non ha salvato la risposta. Libera spazio e riprova: la domanda e i premi non avanzano.'),{guestStorageFailure:true,guestConflict:guestWriteConflict});}
  function persistGuestMission(){
    if(profile.id||!mission||mission.token!=='guest')return true;
    return commitGuestMission(JSON.parse(JSON.stringify(guest)),guestMissionSnapshot());
  }
  function missionTitle(source,kind){return lessonTopics[source]?.name||(source==='catpositions'?'Preposizioni · Il gatto e la scatola':source==='focus'?'Il corpo · ripasso mirato':source?.startsWith('study:')?'La tua scheda di scuola':places[kind]?.name||'La tua missione');}
  const recommended=[['catpositions','Preposizioni con il gatto','🐈','pets'],['focus','Le parole del corpo','👀','pets'],['counting','Contiamo insieme','🔢','creative'],['mousepositions','Dov’è il topolino?','🐭','pets'],['conversation','Facciamo amicizia','👋','creative']];
  const suggestion=recommended[Math.floor(Date.now()/86400000)%recommended.length];
  const today=document.createElement('section');today.className='todayQuest';today.setAttribute('aria-label','Missione consigliata');
  today.innerHTML='<span class="todayIcon" aria-hidden="true">'+suggestion[2]+'</span><div><small>RIPASSO CONSIGLIATO</small><h3>'+suggestion[1]+'</h3><p>3 piccole prove · al tuo ritmo</p><button type="button" class="primary" id="todayQuest">Giochiamo! →</button></div>';
  document.querySelector('.startChoices').after(today);today.before(resumeHost);
  today.querySelector('button').onclick=()=>{if(busy)return;launchLesson(suggestion[0],suggestion[3]);};
  function launchLesson(id,place){
    lessonSource=id;activity=place;setWorld(places[activity].world);mission=null;question=null;tab='missions';
    history.replaceState(null,'','#missioni');window.dispatchEvent(new Event('wordyland-play-view'));render();startQuest();
  }
  const journeyPortal=document.createElement('a');journeyPortal.href='#scoperte';journeyPortal.className='holidayPortal journeyPortal';journeyPortal.innerHTML='<span aria-hidden="true">🧭</span><span><b>Passaporto</b><small>Il tuo percorso · tutto l’anno</small></span><span aria-hidden="true">→</span>';today.after(journeyPortal);
  const holidayPortal=document.createElement('a');holidayPortal.href='#festivita';holidayPortal.className='holidayPortal';holidayPortal.innerHTML='<span aria-hidden="true">🎄</span><span><b>Villaggio feste</b><small>Missioni giornaliere e ricordi da conservare</small></span><span aria-hidden="true">→</span>';journeyPortal.after(holidayPortal);
  const homeRoutes=document.createElement('nav');homeRoutes.className='homePracticeRoutes';homeRoutes.setAttribute('aria-label','Allenamento e avventure del giorno');homeRoutes.innerHTML='<a href="#dettato" class="lessonShortcut homeClassroomEntry" aria-describedby="homeDictationHelp"><span aria-hidden="true">📓</span><span><b>Dettato classe</b><small>Le parole della tua scheda</small></span></a><a href="#allenamento" class="lessonShortcut homeTrainingEntry" aria-describedby="homeTrainingHelp"><span aria-hidden="true">🌱</span><span><b>Allenamento</b><small>Lettere e parole</small></span></a>';document.querySelector('.startChoices').after(homeRoutes);homeRoutes.append(holidayPortal,journeyPortal);holidayPortal.setAttribute('aria-describedby','homeFestivalHelp');journeyPortal.setAttribute('aria-describedby','homePassportHelp');const homeHelp=document.createElement('details');homeHelp.className='homePracticeHelp';homeHelp.innerHTML='<summary>Quale percorso scelgo?</summary><dl><div><dt>Dettato della classe</dt><dd id="homeDictationHelp">Le 12 parole della scheda: ascolta, componi e scrivi.</dd></div><div><dt>Allenamento</dt><dd id="homeTrainingHelp">Lettere italiane e inglesi, parole, piccole frasi e consegne. Puoi fermarti e riprendere.</dd></div><div><dt>Il villaggio delle feste</dt><dd id="homeFestivalHelp">Sfide durante le feste, personaggi e premi da conservare.</dd></div><div><dt>Missione del Passaporto</dt><dd id="homePassportHelp">Un percorso di scoperte aperto tutto l’anno.</dd></div></dl>';homeRoutes.after(homeHelp);
  const visibilityNote=document.createElement('div');visibilityNote.id='playerVisibility';visibilityNote.className='playerVisibility';today.after(visibilityNote);
  function drawContinuations(){
    const session=window.wordylandAccount.info();visibilityNote.hidden=Boolean(profile.id);
    if(!profile.id)visibilityNote.innerHTML=session.username?'<b>Account collegato: '+esc(session.username)+'</b><p>Scegli o crea un profilo per salvare le tue avventure come giocatore.</p><button class="audio" id="chooseVisibleProfile">Scegli il profilo →</button>':'<b>Stai giocando come ospite</b><p>Per comparire tra gli iscritti e sfidare i compagni, apri il link della classe e iscriviti. Le partite ospite restano in questo browser.</p>';
    if(profile.id)visibilityNote.replaceChildren();else{const button=visibilityNote.querySelector('button');if(button)button.onclick=openAdults;}
    const classHint=document.querySelector('.startChoices a[href="#sfide"] small');
    if(classHint)classHint.textContent=profile.id&&pending.incomingInvites?pending.incomingInvites+' inviti ricevuti · apri le tue sfide':'Guarda chi è online e scegli un compagno';
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
      else{const draft=guestDraft();if(!draft)throw Error('La missione non è più disponibile in questo browser.');const pool=guestPool(draft.source),rows=draft.words.map(word=>pool.find(row=>row[0]===word)),questions=rows.map((row,index)=>makeLessonQuestion(row,index,rows.length,pool));activity=draft.activity;lessonSource=draft.source;mission={token:'guest',id:draft.id,questions,total:questions.length,step:draft.step,xp:Math.max(0,Math.min(150,Number(draft.xp)||0)),profile:null,activity,source:draft.source,expiresAt:draft.expiresAt};question=questions[draft.step];question.hadErrors=draft.hadErrors===true;question.assisted=draft.assisted===true;}
      tab='missions';history.replaceState(null,'','#missioni');window.dispatchEvent(new Event('wordyland-play-view'));setWorld(places[activity].world);render();root.querySelector('#missionStage').scrollIntoView({block:'start'});say('Missione ripresa: le risposte già confermate sono conservate.');
    }catch(error){const status=resumeHost.querySelector('#resumeStatus');if(status)status.textContent=error.message;}
    finally{busy=false;}
  }
  window.addEventListener('wordyland-progress-saved',()=>refreshPending());
  window.addEventListener('wordyland-presence',()=>{if(document.visibilityState==='visible'&&navigator.onLine&&!busy)refreshPending();});
  window.addEventListener('wordyland-continue',()=>refreshPending().then(()=>{if(!resumeHost.hidden)resumeHost.scrollIntoView({block:'start'});}));

  function mascot(w=wallet()) {const e=w?.equipped||{},pilot=['fox','panda','robot','dragon','octopus','lion','reindeer','penguin','snowpal','bunny','koala','elf-boy','elf-girl','polar-bear','gingerbread','silver-reindeer','mrs-claus','santa','nutcracker','yeti'].includes(e.avatar)?e.avatar:'fox';return '<span class="avatarHat">'+(item(e.hat)?.icon||'')+'</span><span class="questMascot racerModel '+(e.effect==='flight'?'canFly':'')+'" data-racer="'+pilot+'" role="img" aria-label="'+item(pilot).name+'"></span><span class="avatarEffect">'+(item(e.effect)?.icon||'')+'</span>';}
  async function refresh(forceRender=false) {
    const expected=profile.id;
    if(expected){let result=await api('hub&profile='+expected+(club?'&club='+club:''));if(profile.id!==expected)return;if(!club&&result.clubs?.length){club=Number(result.clubs[0].id);result=await api('hub&profile='+expected+'&club='+club);if(profile.id!==expected)return;}hub=result;}
    else hub=null;
    if((!busy||forceRender===true)&&!mission&&!resumeDuel&&!root.querySelector('#duelStage:not([hidden])')){render();if(forceRender===true)window.dispatchEvent(new Event('wordyland-route-ready'));}drawContinuations();adultTools();
  }
  function render() {
    if(!['#allenamento','#dettato'].includes(location.hash))window.wordylandUI.play();
    clearScene();
    const w=wallet();avatar=item(w?.equipped?.avatar||'fox')?.icon||'🦊';refreshPlayer();
    root.innerHTML='<div class="passport"><div class="avatarStage">'+mascot()+'</div><div><span class="questEyebrow">IL TUO PASSAPORTO DELLE AVVENTURE</span><h2>'+esc(profile.nickname||'Il tuo personaggio')+'</h2><p>'+(profile.id?'La tua avventura ti segue su ogni dispositivo.':'Gioca come ospite. Un adulto può creare un profilo per ritrovarti ovunque.')+'</p><div class="wallet"><span>🪙 <b>'+(w?.coins||0)+'</b> monete</span><span>✦ Livello '+(w?.level||1)+'</span><span>'+(w?.xp||0)+' XP</span></div>'+(w?.equipped?.badge?'<p class="passportBadge">'+item(w.equipped.badge).icon+' '+esc(item(w.equipped.badge).name)+'</p>':'')+'<div class="levelTrack" aria-label="Esperienza verso il prossimo livello"><i style="width:'+((w?.xp||0)%100)+'%"></i></div></div><div class="passportSticker">PLAY<br>YOUR<br>WAY ✦</div></div><nav class="questTabs" id="questSectionsList" aria-label="Passaporto"><button data-tab="lessons" aria-pressed="'+(tab==='lessons')+'">📚 Esercizi e temi</button><button data-tab="adventures" aria-pressed="'+(tab==='adventures')+'">🏝️ La mia isola</button><button data-tab="arena" aria-pressed="'+(tab==='arena')+'">⚔️ Sfida un compagno</button><button data-tab="missions" aria-pressed="'+(tab==='missions')+'">🧩 Missioni</button><button data-tab="shop" aria-pressed="'+(tab==='shop')+'">🎁 Personaggi e premi</button><button data-tab="journey" aria-pressed="'+(tab==='journey')+'">🧭 Missione di oggi</button><button data-tab="holiday" aria-pressed="'+(tab==='holiday')+'">🎄 Villaggi delle feste</button><button data-tab="festival" aria-pressed="'+(tab==='festival')+'">🏆 La tua classe</button></nav><div class="questSectionTools"><button type="button" class="audio" id="allQuestSections" aria-controls="questSectionsList">☰ Tutte le attività</button><span>Una scoperta alla volta</span></div><div id="questContent"></div><p id="questStatus" role="status" aria-live="polite"></p>';
    root.querySelector('#allQuestSections').onclick=()=>{const tabs=root.querySelector('.questTabs');tabs.scrollIntoView({block:'start',behavior:window.wordylandMotion.allowed()?'smooth':'instant'});tabs.querySelector('[aria-pressed=true]')?.focus({preventScroll:true});};
    root.querySelectorAll('[data-tab]').forEach(b=>b.onclick=()=>{if(busy)return;tab=b.dataset.tab;if(tab==='lessons')lessonGroup='all';render();root.querySelector('[data-tab="'+tab+'"]')?.focus({preventScroll:true});});
    window.dispatchEvent(new CustomEvent('wordyland-world-state',{detail:{activity,equipped:w?.equipped||{},adventures:profile.id?hub?.adventures||{}:guest.adventures}}));
    if(tab==='lessons')renderLessons();
    if(tab==='adventures')renderAdventures();
    if(tab==='arena')window.wordylandArena.mount(root.querySelector('#questContent'),profile,openAdults,resumeDuel);resumeDuel=null;if(tab==='missions')renderMissions();if(tab==='shop')renderShop();if(tab==='festival')renderFestival();if(tab==='holiday')renderHoliday();if(tab==='journey')renderHoliday(true);
  }
  window.addEventListener('wordyland-holiday',()=>{if(location.hash==='#natale')holidaySelection='christmas';tab='holiday';render();});
  window.addEventListener('wordyland-journey',()=>{tab='journey';render();});
  function chooseActivity(id,play=false){
    if(busy||!places[id])return;
    lessonSource=null;activity=id;setWorld(places[id].world);
    if(play&&mission?.activity!==id){mission=null;question=null;}
    tab=play?'missions':'adventures';render();
    revealSection(play?'#questContent':'.placePanel');
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
    content.innerHTML='<div class="adventureHeading"><div><span class="questEyebrow">'+(prepositions?'INGLESE · GUARDA, ASCOLTA E COMPLETA':'DALLA SCUOLA ALL’AVVENTURA')+'</span><h3>'+(prepositions?'Preposizioni di luogo':'Scegli cosa imparare oggi.')+'</h3></div><p>'+(prepositions?'In · on · under · behind · in front of · next to · between':'Conta, ascolta, completa e scrivi.<br>Una piccola missione alla volta.')+'</p></div>'+(prepositions?'<p><a href="#allenati" class="lessonShortcut">← Tutti gli esercizi</a></p>':'<a href="#preposizioni" class="prepositionsFeature"><span aria-hidden="true">📦</span><span><b>Preposizioni di luogo</b><small>In, on, under e le altre posizioni: esercizi con gatto, penna e topolino.</small></span><span aria-hidden="true">→</span></a>')+'<a href="#allenamento" class="trainingEntry"><span aria-hidden="true">🌱</span><span><b>Allenamento e Spelling</b><small>Stessa lettera, nomi italiano e inglese. Poi parole e piccole frasi, al tuo ritmo.</small></span><span aria-hidden="true">→</span></a><div class="lessonGrid">'+shown.map(([id,t])=>'<button type="button" class="lessonCard" data-lesson="'+id+'"><span aria-hidden="true">'+t.icon+'</span><small>'+(['catpositions','penpositions','mousepositions'].includes(id)?'PREPOSIZIONI':['focus','hello'].includes(id)?'RIPASSO':'NUOVO TEMA')+'</small><h4>'+t.name+'</h4><p>'+t.description+'</p><b>Apri la missione →</b></button>').join('')+'</div><p class="hint">Le frasi su nomi, età e famiglia sono esempi inventati. Puoi ripeterle con i tuoi dati durante il ripasso con un adulto.</p>';
    content.querySelectorAll('[data-lesson]').forEach(b=>b.onclick=()=>{
      if(busy)return;
      const id=b.dataset.lesson;launchLesson(id,topics[id].activity);
    });
  }
  function renderAdventures(){
    const p=places[activity],progress=profile.id?hub?.adventures||{}:guest.adventures;
    const count=Math.max(0,Number(progress[activity])||0),next=[1,3,5,10].find(n=>n>count);
    const content=root.querySelector('#questContent');
    content.innerHTML='<div class="adventureHeading"><div><span class="questEyebrow">OGNI CURIOSITÀ HA IL SUO POSTO</span><h3>Oggi, che avventura scegli?</h3></div><p>Tutto è esplorabile fin da subito.<br>Le scoperte crescono con te.</p></div><div class="adventureDestinations">'+Object.entries(places).map(([id,p])=>'<button class="destinationCard" data-destination="'+id+'" aria-pressed="'+(id===activity)+'" style="--place:'+p.color+'"><span class="destinationArt" aria-hidden="true"></span><span class="destinationIcon" aria-hidden="true">'+p.icon+'</span><b>'+p.name+'</b><small>'+(Number(progress[id])||0)+' mission'+(Number(progress[id])===1?'e completata':'i completate')+'</small></button>').join('')+'</div><section class="placePanel" aria-labelledby="placeTitle"><header class="placeHeading"><h3 id="placeTitle">'+p.icon+' '+p.name+'</h3><div class="placeEntryActions"><button type="button" class="audio" id="changeWorld">↶ Cambia mondo</button><button type="button" class="primary" id="playPlace">Gioca in inglese</button></div></header><div class="placeToy"><div class="placePreview" id="placePreview"><span class="sceneFallback">'+p.icon+'</span><span class="previewBadge">'+p.icon+' IL TUO PICCOLO MONDO</span><button type="button" class="scenePlayButton" id="tryScene">'+window.wordylandIsland.actions[activity].label+'</button></div><div id="placePlayground"></div></div><details class="placeInfo"><summary>Scoperte e personalizzazioni</summary><div class="placeCopy"><span class="questEyebrow">'+p.tag+'</span><p>'+p.description+'</p><p class="placeGoal">'+p.goal+'</p><div class="discoveryPath" aria-label="'+count+' missioni completate">'+[1,3,5,10].map((n,i)=>'<span class="'+(count>=n?'discovered':'')+'"><b>'+(count>=n?'★':'☆')+'</b><small>'+['Prima scoperta','Esplorazione','Avventura','Grande viaggio'][i]+'<em>'+n+' mission'+(n===1?'e':'i')+'</em></small></span>').join('')+'</div><p class="hint">'+(next?'Prossima scoperta: '+count+' / '+next+' mission'+(next===1?'e.':'i.'):'Hai raggiunto tutte le tappe! Puoi continuare a esplorare.')+'</p>'+(activity==='pets'?'<div class="petCare"><button class="audio" data-care="water">💧 Acqua</button><button class="audio" data-care="food">🥕 Spuntino</button><button class="audio" data-care="friend">💗 Carezza</button><p id="petCareStatus" role="status"></p></div>':'')+'<div class="placeActions">'+(['treehouse','pets','creative','kart'].includes(activity)?'<button class="audio" id="stylePlace">'+({treehouse:'Arreda la casa',pets:'Scegli il compagno',creative:'Scegli i colori',kart:'Personalizza il kart'}[activity])+'</button>':'')+'</div></div></details></section>';
    content.querySelector('#changeWorld').onclick=()=>{const choices=content.querySelector('.adventureDestinations');choices.scrollIntoView({block:'start',behavior:window.wordylandMotion.allowed()?'smooth':'instant'});choices.querySelector('[aria-pressed=true]')?.focus({preventScroll:true});};
    content.querySelectorAll('[data-destination]').forEach(b=>b.onclick=()=>chooseActivity(b.dataset.destination));
    content.querySelectorAll('[data-care]').forEach(b=>b.onclick=()=>{sceneView?.update({progress:1});sceneView?.react('success');content.querySelector('#petCareStatus').textContent={water:'Water = acqua. Una pausa per bere! 💧',food:'Food = cibo. Buono questo spuntino! 🥕',friend:'Friend = amico. Una carezza per te! 💗'}[b.dataset.care];});
    content.querySelector('#tryScene').onclick=()=>sceneView?.action();
    content.querySelector('#playPlace').onclick=()=>chooseActivity(activity,true);
    content.querySelector('#stylePlace')?.addEventListener('click',()=>{shopGroup={treehouse:'home',pets:'pet',creative:'palette',kart:'kart'}[activity];tab='shop';render();});
    sceneView=window.wordylandIsland.mount(content.querySelector('#placePreview'),{kind:activity,equipped:wallet()?.equipped,progress:0,preview:true,playground:content.querySelector('#placePlayground')});
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
    if(!question||!mission)return;
    if(!('speechSynthesis'in window)||typeof SpeechSynthesisUtterance!=='function'){say('Audio non disponibile. Guarda la parola con Un aiuto.');return;}
    window.dispatchEvent(new Event('wordyland-stop-audio'));speechSynthesis.cancel();
    const current=question,token=mission.token,owner=profile.id,generation=questSpeechEpoch,u=new SpeechSynthesisUtterance(useAnswer===true?current.word:['count','dialogue','gap'].includes(current.kind)&&current.prompt?current.prompt:current.word);questSpeech=u;u.lang='en-GB';u.rate=.82;
    const v=speechSynthesis.getVoices().find(x=>x.lang==='en-GB');if(v)u.voice=v;
    const valid=()=>questSpeech===u&&generation===questSpeechEpoch&&question===current&&mission?.token===token&&profile.id===owner;
    root.querySelector('#questListen')?.setAttribute('data-quest-speaking','true');
    const clear=()=>{questSpeech=null;root.querySelector('#questListen')?.removeAttribute('data-quest-speaking');};
    u.onend=()=>{if(valid())clear();};
    u.onerror=event=>{if(!valid())return;clear();if(!['interrupted','canceled'].includes(event?.error))say('La voce non è disponibile. Puoi guardare la parola con Un aiuto.');};
    try{speechSynthesis.speak(u);}catch{if(valid()){clear();say('La voce non è disponibile. Puoi guardare la parola con Un aiuto.');}}
  }
  function drawQuestion(challenge=false) {
    stopQuestAudio();window.wordylandLearning?.stopSpeech?.(root);
    if(!challenge){questionFailed=Boolean(question?.hadErrors);}
    const stage=root.querySelector('#missionStage');if(!stage)return;
    const previousWorld=stage.querySelector('#missionWorld');if(!previousWorld)clearScene();
    root.querySelector('.missionGrid').hidden=true;stage.hidden=false;
    window.wordylandUI.play('mission');stage.dataset.phase=challenge?'challenge':'learn';
    const q=question;stage.innerHTML='<div class="missionWorld" id="missionWorld"><span class="sceneFallback">'+places[mission.activity].icon+'</span><span class="worldProgressLabel">'+(q.number-1)+' / '+mission.total+' tappe</span></div><div class="missionPause"><button class="audio" id="pauseQuest">⏸ Pausa</button><small>Le risposte confermate si salvano automaticamente.</small></div><div class="questStep">PROVA '+q.number+' DI '+mission.total+'<span>'+currentWorld().icon+' '+currentWorld().name+'</span></div><div class="questTrack" role="progressbar" aria-label="Risposte confermate nella missione" aria-valuemin="0" aria-valuemax="'+mission.total+'" aria-valuenow="'+(q.number-1)+'" aria-valuetext="'+(q.number-1)+' di '+mission.total+' risposte confermate"><i style="width:'+((q.number-1)/mission.total*100)+'%"></i></div><div class="questPicture">'+picture(q.word,q.emoji)+'</div><p>'+esc(q.translation)+'</p><button class="audio" id="questListen">🔊 Ascolta</button><div id="questWork"></div><div id="questFeedback" role="status" aria-live="polite"></div><div id="questActions"></div>';
    if(previousWorld)stage.querySelector('#missionWorld').replaceWith(previousWorld);
    else sceneView=window.wordylandIsland.mount(stage.querySelector('#missionWorld'),{kind:mission.activity,equipped:wallet()?.equipped,progress:(q.number-1)/mission.total});
    stage.querySelector('#pauseQuest').onclick=async()=>{if(busy)return;stopQuestAudio();window.wordylandLearning?.stopSpeech?.(root);if(!profile.id&&!persistGuestMission()){say('Il browser non può salvare la missione: tieni aperta questa pagina.');return;}mission=null;question=null;tab='adventures';location.hash='#continua';render();await refreshPending();if(!resumeHost.hidden)resumeHost.scrollIntoView({block:'start'});};
    const toolbar=document.createElement('div');toolbar.className='exerciseToolbar';
    const pause=stage.querySelector('.missionPause');pause.querySelector('small').id='questSaveStatus';pause.querySelector('small').setAttribute('role','status');pause.querySelector('small').textContent=profile.id?'Le risposte confermate si salvano nel profilo.':'Le risposte confermate restano in questo browser.';
    stage.querySelector('#questFeedback').before(pause.querySelector('small'));
    toolbar.append(pause,stage.querySelector('#questListen'));stage.prepend(toolbar);
    stage.querySelector('#questListen').onclick=()=>audio();
    const work=stage.querySelector('#questWork'),actions=stage.querySelector('#questActions');
    if(!challenge){work.innerHTML='<h3>Guarda bene la parola</h3><div class="questWord">'+esc(q.word)+'</div><p>Ascolta e osserva. Quando vuoi, giochiamo!</p>';actions.innerHTML='<button class="primary" id="readyChallenge">Sono pronto! →</button>';actions.querySelector('button').onclick=()=>{drawQuestion(true);stage.querySelector('#questWork').scrollIntoView({block:'start'});};if(['count','dialogue'].includes(q.kind)){const listen=document.createElement('button');listen.className='audio';listen.textContent='🔊 Ascolta la risposta';listen.onclick=()=>audio(true);work.append(listen);}actions.querySelector('button').focus({preventScroll:true});return;}
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
      work.innerHTML+='<div id="questSlots" class="questSlots" role="group" aria-label="Parola da comporre"></div><div id="questTiles" class="questTiles" role="group" aria-label="Lettere disponibili"></div><p id="questBuildStatus" role="status" aria-live="polite" aria-atomic="true"></p><p class="hint">Tocca una lettera per inserirla, una casella per correggere. ␣ indica uno spazio.</p><button class="primary" id="checkQuest">Controlla ✓</button>';
      drawTiles();work.querySelector('#checkQuest').onclick=()=>submitAnswer(picked.map(x=>x.char).join(''));
    }else{
      work.innerHTML+=(['missing','gap'].includes(q.kind)?'<div class="questWord">'+esc(q.mask)+'</div>':'')+'<form id="questAnswerForm"><label for="questAnswer">'+(q.kind==='missing'?'La lettera mancante':q.kind==='gap'?'La parola o il gruppo di parole mancante':'Scrivi in inglese')+'</label><input id="questAnswer" autocomplete="off" autocorrect="off" autocapitalize="none" spellcheck="false" '+(q.kind==='missing'?'maxlength="1"':'maxlength="100"')+' required><button class="primary">Controlla ✓</button></form>';
      work.querySelector('form').onsubmit=e=>{e.preventDefault();submitAnswer(work.querySelector('input').value);};
    }
    actions.innerHTML='<button class="audio" id="questHint">💡 Un aiuto · sempre gratis</button><div id="questHelp" hidden class="questWord">'+esc(q.word)+'</div>';
    work.querySelector('input:not(:disabled),button:not(:disabled)')?.focus({preventScroll:true});
    actions.querySelector('button').onclick=()=>{
      const hint=actions.querySelector('#questHelp');hint.hidden=!hint.hidden;question.assisted=true;
      if(!profile.id){persistGuestMission();return;}
      const current=question,owner=profile.id,token=mission.token,step=current.number-1;
      if(current.helpSaved||current.helpSaving)return;
      current.helpSaving=true;
      api('quest-hint',{token,step}).then(()=>{current.helpSaved=true;}).catch(()=>{
        if(profile.id===owner&&question===current&&mission?.token===token&&(mission.step||0)===step)say('Puoi usare l’aiuto. Il salvataggio non è confermato: torna online prima di chiudere.');
      }).finally(()=>{current.helpSaving=false;});
    };
  }
  function drawTiles(){
    const work=root.querySelector('#questWork'),bank=work.querySelector('#questTiles');
    const spoken=char=>char===' '?'Spazio':'Lettera '+char.toUpperCase();
    work.querySelector('#questSlots').innerHTML=[...question.word].map((_,i)=>'<button type="button" data-slot="'+i+'" data-filled="'+Boolean(picked[i])+'" '+(!picked[i]?'disabled':'')+' aria-label="'+(picked[i]?'Togli '+esc(picked[i].char===' '?'lo spazio':'la lettera '+picked[i].char.toUpperCase())+' dalla casella '+(i+1):'Casella '+(i+1)+' vuota')+'">'+esc(picked[i]?.char===' '?'␣':picked[i]?.char||'')+'</button>').join('');
    // Keep bank nodes stable: rebuilding them discards keyboard focus after every letter.
    if(!bank.children.length){
      bank.innerHTML=tiles.map((t,i)=>'<button type="button" data-tile="'+t.id+'" aria-label="'+esc(spoken(t.char))+', tessera '+(i+1)+'">'+esc(t.char===' '?'␣':t.char)+'</button>').join('');
      bank.querySelectorAll('[data-tile]').forEach(button=>button.onclick=()=>{
        const index=tiles.findIndex(t=>t.id===Number(button.dataset.tile)),tile=tiles[index];
        if(busy||!tile||picked.some(t=>t.id===tile.id))return;
        picked.push(tile);drawTiles();
        const next=[...tiles.slice(index+1),...tiles.slice(0,index)].find(t=>!picked.some(p=>p.id===t.id));
        (next?bank.querySelector('[data-tile="'+next.id+'"]'):work.querySelector('#checkQuest')).focus();
      });
    }
    bank.querySelectorAll('[data-tile]').forEach(button=>{button.disabled=picked.some(t=>t.id===Number(button.dataset.tile));});
    work.querySelectorAll('[data-slot]:not(:disabled)').forEach(button=>button.onclick=()=>{
      if(busy)return;const index=Number(button.dataset.slot),removed=picked[index];if(!removed)return;
      picked.splice(index,1);drawTiles();bank.querySelector('[data-tile="'+removed.id+'"]')?.focus();
    });
    work.querySelector('#questBuildStatus').textContent=(picked.length?'Parola: '+picked.map(t=>t.char===' '?'spazio':t.char).join(' · ')+'. ':'')+picked.length+' di '+tiles.length+' tessere. '+(picked.length===tiles.length?'Ora premi Controlla.':'');
  }
  async function submitAnswer(answer,chosenButton=null){
    if(busy)return;if(!answer.trim()){say('Inserisci la risposta oppure usa Un aiuto.');return;}busy=true;
    const previousInventory=[...wallet().inventory],feedback=root.querySelector('#questFeedback'),owner=profile.id,token=mission.token;root.querySelector('#pauseQuest').disabled=true;const saveNote=root.querySelector('#questSaveStatus');saveNote.textContent=profile.id?'Salvo la risposta…':'Controllo la risposta…';
    try{
      let result;
      if(profile.id){result=await api('quest-answer',{token:mission.token,step:question.number-1,answer,assisted:question.assisted===true});}
      else{
        const correct=normalize(answer)===normalize(question.answer||question.word);
        const next=JSON.parse(JSON.stringify(guest));
        if(next.finished[mission.id])throw Error('Questa missione è già completata. Aprine una nuova.');
        if(!correct){
          if(!commitGuestMission(next,guestMissionSnapshot(mission.step||0,mission.xp,{...question,hadErrors:true})))throw guestSaveFailure();
          result={correct:false,message:'Riascolta e riprova con calma. Gli aiuti sono sempre disponibili.'};
        }
        else {
          const day=new Date().toISOString().slice(0,10),key=day+':'+normalize(question.word);
          let xp=mission.xp;
          if(!next.credits[key]&&Object.keys(next.credits).filter(x=>x.startsWith(day)).length<15){next.credits[key]=true;next.xp+=10;xp+=10;}
          const done=question.number===mission.total;
          let coins=0;if(done&&xp>0&&(next.paid[day]||0)<3){coins=15;next.coins+=coins;next.paid[day]=(next.paid[day]||0)+1;}
          if(done){next.adventures[mission.activity]=(Number(next.adventures[mission.activity])||0)+1;next.finished[mission.id]=Date.now();}
          if(!commitGuestMission(next,done?null:guestMissionSnapshot(question.number,xp)))throw guestSaveFailure();
          mission.xp=xp;mission.step=question.number;
          result={correct:true,independent:!question.assisted&&!question.hadErrors&&!questionFailed,done,xp,coins,wallet:guest,question:mission.questions[question.number]};
        }
      }
      if(owner!==profile.id||token!==mission?.token)return;
      // A confirmed server answer also persists any help carried with it.
      if(profile.id)say('');
      const word=question.word;stats[word]??={good:0,attempts:0,review:false};stats[word].attempts++;if(result.correct&&result.independent===true){stats[word].good++;stats[word].review=false;}else{stats[word].review=true;if(!result.correct)questionFailed=true;}save();updateStats();
      const learning={expected:window.wordylandLearning.expected(question),answer,word:question.word,translation:question.translation,kind:question.kind,prompt:question.prompt,chosenTranslation:question.options?.find(option=>option[0]===answer)?.[1],button:chosenButton,input:root.querySelector('#questAnswer')};
      saveNote.textContent=result.correct?(profile.id?'✓ Risposta salvata nel profilo':'✓ Risposta salvata qui'):'Puoi riprovare con calma.';
      if(!result.correct){question.hadErrors=true;window.wordylandLearning.show(feedback,false,learning);sceneView?.react('retry');return;}
      if(hub&&result.wallet)hub.wallet=result.wallet;
      if(!result.done)mission.step=question.number;
      refreshPending();
      root.querySelectorAll('#questWork button,#questWork input').forEach(b=>b.disabled=true);
      window.wordylandLearning.show(feedback,true,learning);
      sceneView?.update({progress:question.number/mission.total});
      if(!result.done)sceneView?.react('success');
      const progressLabel=root.querySelector('.worldProgressLabel');if(progressLabel)progressLabel.textContent=question.number+' / '+mission.total+' tappe';const progressBar=root.querySelector('.questTrack');if(progressBar){progressBar.setAttribute('aria-valuenow',question.number);progressBar.setAttribute('aria-valuetext',question.number+' di '+mission.total+' risposte confermate');progressBar.querySelector('i').style.width=(question.number/mission.total*100)+'%';}
      if(result.done){
        window.wordylandUI.play();
        if(hub)hub.wallet=result.wallet;
        const w=result.wallet;root.querySelector('.wallet').innerHTML='<span>🪙 <b>'+w.coins+'</b> monete</span><span>✦ Livello '+w.level+'</span><span>'+w.xp+' XP</span>';root.querySelector('.levelTrack i').style.width=(w.xp%100)+'%';
        const previousWorld=root.querySelector('#missionWorld');
        const completedActivity=mission.activity,place=places[completedActivity];
        const stage=root.querySelector('#missionStage');stage.dataset.phase='complete';
        stage.innerHTML='<div class="missionWorld" id="completedWorld"><span class="sceneFallback">'+place.icon+'</span></div><div class="openTreasure">🎉</div><div id="completedFeedback" role="status"></div><span class="questEyebrow">MISSIONE COMPLETATA</span><h3 id="missionCompleteTitle" tabindex="-1">'+place.name+': ce l’hai fatta!</h3><p>Ogni tentativo ti ha portato fin qui.</p><div class="missionRewards"><b>✦ '+result.xp+' XP</b><b>🪙 '+result.coins+' monete</b></div><p>'+(result.coins?'La tua isola cresce con te! Scegli un oggetto per il personaggio, la casa o il kart.':'Hai già raccolto i premi per queste parole o le monete di oggi. Puoi continuare a giocare, senza perdere nulla.')+'</p><button class="primary" id="rewardShop">Personalizza il tuo mondo ✨</button><button class="audio" id="anotherQuest">Un’altra avventura</button>';
        if(previousWorld){previousWorld.id='completedWorld';stage.querySelector('#completedWorld').replaceWith(previousWorld);previousWorld.querySelector('.worldProgressLabel').textContent='Tutte le tappe completate!';}
        else sceneView=window.wordylandIsland.mount(stage.querySelector('#completedWorld'),{kind:completedActivity,equipped:w.equipped,progress:1});
        const earnedBadges=catalog.filter(it=>it.unlock&&w.inventory.includes(it.id)&&!previousInventory.includes(it.id));
        if(earnedBadges.length){const notice=document.createElement('div');notice.className='earnedBadges';notice.setAttribute('role','status');notice.innerHTML='<h4>Nuovi distintivi per te!</h4>'+earnedBadges.map(it=>'<p>'+it.icon+' '+esc(it.name)+'</p>').join('')+'<button class="audio" id="openBadges">Guarda i distintivi →</button>';stage.querySelector('.missionRewards').after(notice);notice.querySelector('button').onclick=()=>{shopGroup='badge';tab='shop';render();};}
        window.wordylandLearning.show(stage.querySelector('#completedFeedback'),true,{...learning,message:'Missione completata! Ogni parola è una nuova scoperta.'});
        sceneView?.react('complete');
        window.dispatchEvent(new CustomEvent('wordyland-celebrate'));
        mission=null;question=null;
        stage.querySelector('#rewardShop').onclick=()=>{shopGroup={treehouse:'home',pets:'pet',creative:'palette',kart:'kart'}[completedActivity]||'avatar';tab='shop';render();};stage.querySelector('#anotherQuest').onclick=()=>render();
        stage.querySelector('#missionCompleteTitle').focus({preventScroll:true});stage.scrollIntoView({block:'start'});if(profile.id){const result=await api('hub&profile='+profile.id+(club?'&club='+club:''));if(owner===profile.id)hub=result;}
      }else{
        root.querySelector('#questActions').innerHTML='<button class="primary" id="questNext">Continua →</button>';
        const next=root.querySelector('#questNext');next.onclick=()=>{question=result.question;drawQuestion();};next.focus({preventScroll:true});mission.nextQuestion=result.question;
      }
    }catch(e){saveNote.textContent=e.guestConflict?'Progressi cambiati · ricarica e riprendi':e.guestStorageFailure?'Risposta non salvata · rimani qui e riprova':'Risposta da verificare · usa Riprendi dal salvataggio';feedback.textContent=e.message;if(owner===profile.id&&mission?.token===token&&!e.guestConflict&&(profile.id||e.guestStorageFailure)){const retry=document.createElement('button');retry.className='audio';retry.textContent=e.guestStorageFailure?'Riprova il salvataggio':'Riprendi dal salvataggio';retry.onclick=e.guestStorageFailure?()=>submitAnswer(answer,chosenButton):()=>resumeQuest(token);root.querySelector('#questActions')?.append(retry);}}finally{busy=false;const pause=root.querySelector('#pauseQuest');if(pause)pause.disabled=false;}
  }
  function showSelectedWardrobeCategory(){
    const tabs=root.querySelector('.styleTabs'),chosen=tabs?.querySelector('[aria-pressed=true]');if(!tabs||!chosen||tabs.scrollWidth<=tabs.clientWidth)return;
    const left=chosen.offsetLeft,right=left+chosen.offsetWidth,current=tabs.scrollLeft,width=tabs.clientWidth;if(left<current+10)tabs.scrollLeft=Math.max(0,left-10);else if(right>current+width-10)tabs.scrollLeft=right-width+10;
  }
  function renderShop(){
    clearScene();
    const groups={christmasCharacters:'🎅 Personaggi Natale',journey:'🧭 Collezioni',christmas:'🎄 Natale',avatar:'Personaggio',home:'Casa',pet:'Compagno',kart:'Kart',palette:'Atelier',trophy:'Trofei',ball:'Calcio',rocket:'Razzi',badge:'Distintivi'},w=wallet();
    const previewKind={christmasCharacters:'pets',journey:'pets',christmas:'pets',avatar:'pets',home:'treehouse',pet:'pets',kart:'kart',palette:'creative',trophy:'treehouse',ball:'football',rocket:'space',badge:'pets'}[shopGroup];
    const shown=catalog.filter(it=>shopGroup==='christmasCharacters'?it.season==='christmas'&&it.slot==='avatar':shopGroup==='journey'?it.event==='journey':shopGroup==='christmas'?it.season==='christmas':shopGroup==='avatar'?['avatar','hat','effect','neck'].includes(it.slot):shopGroup==='home'?['room','plant','rug','lamp'].includes(it.slot):it.slot===shopGroup);
    const controlName=(it,owned,equipped)=>equipped?it.name+' in uso':(it.unlock||it.event)&&!owned?'Da conquistare: '+it.name:owned?(it.slot==='avatar'?'Usa personaggio ':'Scegli ')+it.name:it.price===0?'Scegli '+it.name+' gratis':'Sblocca '+it.name+' con '+it.price+' monete di gioco';
    root.querySelector('#questContent').innerHTML='<div class="wardrobeHeader"><div class="shopHeading"><div><h3>Personaggi e premi</h3><p>Guarda gratis, poi scegli cosa usare.</p></div><button type="button" class="primary" id="chooseWardrobeItem" aria-controls="wardrobeChoices">Guarda le scelte</button></div><details class="wardrobeHelp"><summary>Premi e anteprime</summary><p>Scegli personaggi, accessori, trofei, palloni e razzi con le monete delle missioni. I distintivi si conquistano completando le avventure.</p><p>Nessun acquisto con denaro reale. Tutte le attività sono già aperte. Nella vista illustrata ritratto e accessori sono pedine e distintivi; scegli 3D classico per ruotare il modello e vedere anche gli arredi. La collezione Natale si conquista con gli esercizi del villaggio e resta tua anche dopo le feste.</p><p>Il personaggio ti accompagna nelle avventure. Il compagno del rifugio si sceglie a parte.</p><div class="wardrobeRewardLinks"><a class="lessonShortcut" href="#festivita">🎄 Conquista i premi negli esercizi del villaggio →</a><a class="lessonShortcut" href="#scoperte">🧭 Collezioni e missioni per tutto l’anno →</a></div></details></div><nav class="styleTabs" aria-label="Cosa vuoi personalizzare?">'+Object.entries(groups).map(([id,name])=>'<button class="audio" data-style="'+id+'" aria-pressed="'+(shopGroup===id)+'">'+name+'</button>').join('')+'</nav><div class="wardrobeWorkspace"><div class="wardrobePreviewPane"><div class="shopPreviewFrame" role="group" aria-labelledby="shopPreviewLabel"><p class="previewBadge" id="shopPreviewLabel">'+groups[shopGroup]+' · la tua scelta</p><div class="stylePreview" id="stylePreview" role="region" tabindex="-1" aria-label="Anteprima della tua scelta"><span class="sceneFallback">'+places[previewKind].icon+'</span></div><div class="shopPreviewControls" id="shopPreviewControls"></div></div><p id="shopPreviewStatus" class="shopPreviewStatus" role="status" aria-live="polite">Le anteprime sono gratis e non cambiano la tua scelta.</p><button type="button" class="audio" id="returnToReward" hidden>Torna all’oggetto</button>'+(['avatar','journey','christmas','christmasCharacters'].includes(shopGroup)?'<div class="characterPlay"><p><b>Giochi con: '+esc(item(w?.equipped?.avatar||'fox').name)+'.</b></p><div><button type="button" class="audio" data-character-play="kart" aria-label="Guida il kart"><span aria-hidden="true">🏎️</span> Kart</button><button type="button" class="audio" data-character-play="football" aria-label="Gioca a calcio"><span aria-hidden="true">⚽</span> Calcio</button><button type="button" class="audio" data-character-play="space" aria-label="Parti per lo spazio"><span aria-hidden="true">🚀</span> Spazio</button></div></div>':'')+'</div><section class="wardrobeChoicesPane" aria-label="Personaggi e oggetti da scegliere"><div class="shopGrid" id="wardrobeChoices">'+shown.map(it=>{const owned=w?.inventory.includes(it.id),equipped=w?.equipped[it.slot]===it.id;return '<article class="shopItem '+(equipped?'equipped':'')+'" data-reward-card="'+it.id+'" aria-labelledby="reward-title-'+it.id+'"><span '+(it.slot==='avatar'?'class="racerModel" data-racer="'+it.id+'"':'')+' aria-hidden="true">'+(it.slot==='avatar'?'':it.icon)+'</span><h4 id="reward-title-'+it.id+'" tabindex="-1">'+esc(it.name)+'</h4><small>'+(it.event?(it.event==='journey'?'Passaporto · ':'Villaggio della festa · ')+(it.eventExercises?it.eventExercises+' esercizi':it.eventDays+' giornate'):it.unlock?(it.unlock.activities?'Esplora '+it.unlock.activities+' mondi diversi':'Completa '+it.unlock.missions+' mission'+(it.unlock.missions===1?'e':'i')):it.price===0?'Sempre disponibile':it.slot==='effect'?'Effetto scenico':'Per il tuo mondo')+'</small><button type="button" class="audio" data-preview-item="'+it.id+'" aria-label="Anteprima di '+esc(it.name)+'">👀 Anteprima</button><button class="'+(owned?'audio':'primary')+'" data-item="'+it.id+'" aria-label="'+esc(controlName(it,owned,equipped))+'" '+(equipped||(it.unlock||it.event)&&!owned?'disabled':'')+'>'+(equipped?'In uso ✓':owned?(it.slot==='avatar'?'Usa personaggio':'Scegli'):(it.unlock||it.event)?'Da conquistare':it.price===0?'Scegli · gratis':'🪙 '+it.price+' · Sblocca')+'</button></article>';}).join('')+'</div></section></div><p class="hint">Gli oggetti cambiano l’aspetto del tuo mondo. Gli aiuti negli esercizi restano gratis per tutti.</p>';
    const previewHost=root.querySelector('#stylePreview');
    root.querySelector('#chooseWardrobeItem').onclick=()=>{const first=root.querySelector('[data-reward-card]');if(!first)return;first.querySelector('h4')?.focus({preventScroll:true});first.scrollIntoView({block:'start',behavior:'instant'});};
    function previewReward(candidate=null){
      if(!candidate||previewHost.dataset.previewChoice!==candidate.id){
        sceneView?.dispose();
        const eq={...w?.equipped};if(candidate)eq[candidate.slot]=candidate.id;
        const kind=['christmas','journey','christmasCharacters'].includes(shopGroup)?({kart:'kart',trophy:'treehouse',rocket:'space'}[candidate?.slot]||'pets'):previewKind;
        if(shopGroup==='avatar'||shopGroup==='badge'||['christmas','journey','christmasCharacters'].includes(shopGroup))eq.pet=eq.avatar||'fox';
        previewHost.querySelector('.sceneFallback').textContent=candidate?.icon||places[previewKind].icon;
        sceneView=window.wordylandIsland.mount(previewHost,{kind,equipped:eq,preview:true,controlsDock:root.querySelector('#shopPreviewControls')});
      }
      if(candidate){
        previewHost.dataset.previewChoice=candidate.id;previewHost.setAttribute('aria-label','Anteprima di '+candidate.name);
        root.querySelector('#shopPreviewLabel').textContent='Solo anteprima · '+candidate.name;
        root.querySelector('#shopPreviewStatus').textContent='Solo anteprima, gratis. La tua scelta non cambia.';
        const back=root.querySelector('#returnToReward');back.hidden=false;back.textContent='Torna a '+candidate.name;
        root.querySelectorAll('[data-reward-card]').forEach(card=>card.classList.toggle('previewing',card.dataset.rewardCard===candidate.id));
        previewHost.focus({preventScroll:true});const bounds=previewHost.getBoundingClientRect();if(bounds.top<16||bounds.bottom>window.innerHeight-16)previewHost.scrollIntoView({block:'nearest',behavior:window.wordylandMotion.allowed()?'smooth':'auto'});
      }
    }
    previewReward();showSelectedWardrobeCategory();const categoryRow=root.querySelector('.styleTabs');document.fonts?.ready.then(()=>{if(categoryRow.isConnected)showSelectedWardrobeCategory();});
    root.querySelectorAll('[data-preview-item]').forEach(button=>button.onclick=()=>{if(!busy)previewReward(item(button.dataset.previewItem));});
    root.querySelector('#returnToReward').onclick=()=>{const button=root.querySelector('button[data-preview-item="'+previewHost.dataset.previewChoice+'"]');button?.focus({preventScroll:true});button?.closest('article')?.scrollIntoView({block:'nearest',behavior:'auto'});};
    root.querySelectorAll('[data-character-play]').forEach(b=>b.onclick=()=>chooseActivity(b.dataset.characterPlay,true));
    root.querySelectorAll('[data-style]').forEach(b=>b.onclick=()=>{if(busy)return;const previousScroll=b.closest('.styleTabs').scrollLeft;shopGroup=b.dataset.style;renderShop();const tabs=root.querySelector('.styleTabs'),chosen=root.querySelector('[data-style="'+shopGroup+'"]');tabs.scrollLeft=previousScroll;chosen?.focus({preventScroll:true});showSelectedWardrobeCategory();});
    root.querySelectorAll('[data-item]').forEach(b=>b.onclick=async()=>{
      if(busy)return;busy=true;purchasePending=true;let outcome='';const owner=profile.id,it=item(b.dataset.item),owned=w.inventory.includes(it.id);b.closest('article')?.querySelector('.shopPurchaseMessage')?.remove();b.removeAttribute('aria-describedby');b.disabled=true;
      try{
        if(it.event&&!owned)throw Error(it.event==='journey'?'Questo premio si conquista nel Passaporto delle scoperte.':'Questo ricordo si conquista nel villaggio della sua festività.');
        if(profile.id){const result=await api(owned?'equip':'buy',{item:it.id});if(owner!==profile.id)return;hub.wallet=result.wallet;}
        else{const next={...guest,inventory:[...guest.inventory],equipped:{...guest.equipped}};if(!owned){if(next.coins<it.price)throw new Error('Ti mancano '+(it.price-next.coins)+' monete. Puoi scegliere un oggetto gratis o continuare a giocare.');next.coins-=it.price;next.inventory.push(it.id);}next.equipped[it.slot]=it.id;if(!storeGuest(next))throw new Error(guestWriteConflict?'Gli oggetti sono cambiati in un’altra scheda. Ricarica per vedere l’ultima scelta: non sovrascriviamo gli oggetti già salvati.':'Il browser non ha salvato la scelta. Saldo e oggetti restano come prima. Libera spazio o riprova.');guest=next;}
        render();const heading=root.querySelector('[data-reward-card="'+it.id+'"] h4');heading?.focus({preventScroll:true});heading?.scrollIntoView({block:'nearest',behavior:'auto'});outcome=it.name+' è pronto per l’avventura!';say(outcome);
      }catch(e){
        if(owner!==profile.id)return;
        const message=owner&&(!e.code||e.code>=500)?'La scelta non è confermata. Ricarica la pagina per verificare saldo e oggetti prima di riprovare.':e.message;
        outcome=message;say(message);
        if(b.isConnected){b.disabled=false;const note=document.createElement('p');note.className='shopPurchaseMessage';note.id='purchase-message-'+it.id;note.textContent=message;b.after(note);b.setAttribute('aria-describedby',note.id);b.focus({preventScroll:true});note.scrollIntoView({block:'nearest',behavior:'auto'});}
      }finally{busy=false;purchasePending=false;if(deferredNavigation){deferredNavigation=false;const status=document.querySelector('#appStatus');if(status&&outcome)status.textContent=outcome;window.dispatchEvent(new Event('wordyland-route-ready'));}}
    });
  }
  // Display only dates/status supplied by the server; the device clock never opens an event.
  function holidayCalendarDate(value){try{return new Intl.DateTimeFormat('it-IT',{day:'numeric',month:'long',year:'numeric',timeZone:'Europe/Rome'}).format(new Date(value));}catch{return '';}}
  function holidayCalendarPeriod(event){return event.opens?'Dal '+holidayCalendarDate(event.opens)+' al '+event.lastDay+' compreso':'Sempre aperto';}
  function holidayCalendarMarkup(data,selected,open){
    const active=data.events.filter(e=>e.active).length,future=data.events.length-active;
    return '<details class="holidayCalendar"'+(open?' open':'')+'><summary><b>Il calendario delle feste</b><span>'+active+' '+(active===1?'villaggio aperto':'villaggi aperti')+' · '+future+' in arrivo</span></summary><p class="holidayCalendarToday">Oggi: <time datetime="'+esc(data.day)+'">'+esc(holidayCalendarDate(data.day+'T12:00:00Z'))+'</time> · orario italiano ('+esc(data.timezone)+')</p><div class="holidayCalendarGrid">'+data.events.map(e=>'<article data-calendar-event="'+esc(e.id)+'" data-calendar-state="'+(e.active?'active':'upcoming')+'"'+(e.id===selected?' aria-current="true"':'')+'><span class="holidayCalendarState">'+(e.active?'● Aperto adesso':'◷ In arrivo')+'</span><h4>'+esc(e.icon+' '+e.name)+'</h4><p>'+esc(holidayCalendarPeriod(e))+'</p><button type="button" class="audio" data-calendar-visit="'+esc(e.id)+'">'+(e.active?'Visita il villaggio':'Guarda cosa arriva')+'</button></article>').join('')+'</div><p class="holidayCalendarKeeps">Accessori e personaggi conquistati restano tuoi anche quando la festa finisce.</p></details>';
  }
  function elfArrivalMarkup(event,guest=false){
    const schedule=guest?null:event.elfSchedule||event.elf,active=Boolean(schedule?.active&&event.elf?.active),phase=guest?'annual':active?'active':schedule?'upcoming':'annual';
    const period=schedule?'Dall’'+holidayCalendarDate(schedule.opens)+' al '+(schedule.lastDay||event.lastDay)+' compreso':'Dall’8 dicembre al 7 gennaio';
    return '<section id="elfArrivalCard" class="elfArrivalCard'+(active?'':' elfTeaser')+'" data-elf-arrival="'+phase+'" aria-labelledby="elfArrivalTitle"><span class="elfArrivalIcon" aria-hidden="true">🧝</span><div><p class="elfArrivalState">'+(active?'Birillo è nel villaggio!':guest?'Un amico delle feste':'Prossima visita')+'</p><h4 id="elfArrivalTitle">Birillo, l’elfo birichino</h4><p class="elfArrivalDates">'+esc(period)+'</p><p>'+(active?'Ti aspetta con uno scherzo facoltativo. Puoi giocare con lui oppure continuare le missioni.':guest?'Accedi con il tuo profilo per vedere le missioni e gli arrivi del giorno.':'Quando arriva, qui trovi piccoli scherzi e giochi facoltativi. Le altre attività restano disponibili.')+'</p><p class="elfArrivalIdentity">Birillo viene a giocare qui nel villaggio. Elio e Stella sono invece personaggi del guardaroba.</p>'+(active?'<button type="button" class="primary" id="openElf" aria-controls="elfPanel">Vai da Birillo →</button>':'')+'</div></section>';
  }
  let holidaySelection='christmas',holidayGeneration=0;
  async function renderHoliday(journey=false){
    const host=root.querySelector('#questContent'),owner=profile.id,generation=++holidayGeneration;
    const request=(action,data)=>api(journey?action.replace(/^holiday-/,'journey-'):action,data);
    const viewTab=journey?'journey':'holiday';
    const reopen=()=>renderHoliday(journey),elfResolved=new Set();
    const valid=()=>host.isConnected&&tab===viewTab&&profile.id===owner&&generation===holidayGeneration;
    host.innerHTML='<section class="holidayPanel holidayPlayFirst"><header class="holidayWelcome holidayPlayHeader"><div><span class="holidayWelcomeIcon" aria-hidden="true">'+(journey?'🧭':'🎄')+'</span><h3 id="holidayEventTitle" tabindex="-1">'+(journey?'Passaporto delle scoperte':'Il villaggio delle feste')+'</h3><p>'+(journey?'Una piccola missione al giorno, al tuo ritmo.':'Puoi giocare ancora oggi: i premi restano tuoi.')+'</p><span class="holidaySelectedState" id="holidayHeaderState"></span></div><button type="button" class="primary holidayActionLink" id="holidayJump" aria-controls="holidayChallenge" aria-busy="true" disabled>Prepariamo la sfida…</button></header><div class="holidayPlayMain"><div class="holidayStage"><div class="missionWorld" id="holidayWorld"><span class="sceneFallback">🎄</span></div></div><div id="holidayBody"><p role="status">Controlliamo il calendario del villaggio…</p></div></div></section>';
    let villageSignature='';const drawVillage=(event,elf=null,resolved=false)=>{const next=JSON.stringify([event,wallet().equipped,elf?.active?elf:null,resolved]);if(next===villageSignature)return;villageSignature=next;sceneView?.dispose();sceneView=window.wordylandIsland.mount(host.querySelector('#holidayWorld'),{kind:journey?'treehouse':'holiday',holiday:event,equipped:wallet().equipped,elf:elf?.active?elf:null,elfResolved:resolved});};drawVillage(holidaySelection);
    const body=host.querySelector('#holidayBody'),jump=host.querySelector('#holidayJump');
    function revealHolidayAction(){
      if(!valid()||jump.disabled)return;const target=body.querySelector('#holidayVerify')||body.querySelector('#holidayPrompt')||body.querySelector('#holidayAnother')||body.querySelector('#holidayStart')||body.querySelector('#holidayCompleteTitle')||body.querySelector('#holidayLogin')||body.querySelector('.holidayCalendar>summary')||body.querySelector('button')||host.querySelector('#holidayEventTitle');
      if(target?.matches('.holidayCalendar>summary'))target.parentElement.open=true;
      target?.scrollIntoView({block:'start',behavior:'instant'});target?.focus({preventScroll:true});
    }
    jump.onclick=revealHolidayAction;
    if(!owner){body.innerHTML='<section class="holidayActionPane holidayGuestAction" aria-label="Entra per giocare"><h4>Entra con il tuo profilo</h4><button class="primary" id="holidayLogin">Scegli o accedi al profilo</button><p>Le missioni e i premi si salvano nel tuo profilo online.</p><a class="lessonShortcut" href="#allenati">Tutti gli esercizi restano disponibili →</a></section><div class="holidayInfo"><p>'+(journey?'Il Passaporto è aperto tutto l’anno. Gli esercizi fatti e le missioni interrotte restano salvati anche se fai una pausa.':'Natale apre dal 1° novembre al 7 gennaio compreso; poi arrivano le altre feste.')+'</p></div>';if(!journey&&holidaySelection==='christmas')body.querySelector('.holidayInfo').insertAdjacentHTML('beforeend',elfArrivalMarkup({},true));body.querySelector('#holidayLogin').onclick=openAdults;jump.disabled=false;jump.setAttribute('aria-busy','false');jump.textContent='Entra per giocare';jump.setAttribute('aria-controls','holidayLogin');return;}
    try{
      const data=await request('holiday-state&profile='+owner);if(!valid())return;if(hub&&data.wallet)hub.wallet=data.wallet;
      let event=data.events.find(e=>e.id===(journey?'journey':holidaySelection))||data.events[0],current=event.session,working=false,calendarOpen=false;
      function draw(){
        if(!valid())return;drawVillage(event.id,event.elf,elfResolved.has(event.season+'|'+event.elf?.day));
        host.querySelector('#holidayEventTitle').textContent=event.name;host.querySelector('#holidayHeaderState').textContent=journey?'Sempre aperto':event.active?'● Aperto adesso':'◷ In arrivo';jump.disabled=false;jump.setAttribute('aria-busy','false');jump.textContent=!event.active?'Vedi il calendario':current&&!current.done?'Riprendi la sfida':current?.done?journey?'La tua missione':'Continua le sfide':'Vai alla sfida';jump.setAttribute('aria-controls',event.active?'holidayChallenge':'holidayCalendar');
        body.innerHTML='<section class="holidayActionPane" aria-label="La tua sfida"><div id="holidayChallenge"></div><p id="holidayMessage" role="status" aria-live="polite"></p><a href="#personaggi" class="lessonShortcut holidayWardrobeLink">Indossa i tuoi premi nel guardaroba →</a></section><section class="holidayInfo" aria-label="Calendario, regole e collezioni"><div class="holidayInfoHeading"><h4>Esplora il villaggio</h4><button class="audio" id="holidayRefresh">Aggiorna il villaggio</button></div><nav class="holidayTabs" aria-label="Festività">'+data.events.map(e=>'<button class="audio" data-holiday="'+e.id+'" aria-pressed="'+(e.id===event.id)+'">'+esc(e.icon+' '+e.name)+'</button>').join('')+'</nav>'+(journey?'':holidayCalendarMarkup(data,event.id,calendarOpen))+'<p class="holidayDates">'+(journey?'Sempre aperto':holidayCalendarPeriod(event))+' · orario italiano</p><details class="holidayRules"><summary>Come si gioca e come si conquistano i premi</summary><p>'+(journey?'Tre piccole prove al giorno e 3 collezioni da scoprire. I premi dipendono dagli esercizi fatti: nessun azzeramento se salti giorni. Aiuti e correzioni contano. Puoi sempre scegliere anche gli altri giochi.':'Tre prove per ogni sfida. Puoi iniziarne un’altra nello stesso giorno finché il villaggio è aperto. Gli esercizi fatti contano per personaggi e accessori; i distintivi delle giornate contano una sola volta per data. Gli aiuti contano e gli errori non tolgono premi.')+'</p></details><div class="holidayRewards">'+event.rewards.map(r=>'<article><span aria-hidden="true">'+esc(r.icon)+'</span><b>'+esc(r.name)+'</b><small>'+(r.owned?'Già tuo · resta nell’inventario':r.progress+' / '+(r.exercises||r.days)+(r.exercises?' esercizi':' giornate'))+'</small></article>').join('')+'</div></section>';
        body.querySelector('#holidayRefresh').textContent=journey?'Aggiorna percorso':'Aggiorna il villaggio';body.querySelector('#holidayRefresh').onclick=reopen;
        const calendar=body.querySelector('.holidayCalendar');if(calendar){calendar.id='holidayCalendar';calendar.addEventListener('toggle',()=>{if(valid()&&calendar.isConnected)calendarOpen=calendar.open;});}
        body.querySelectorAll('[data-holiday],[data-calendar-visit]').forEach(b=>b.onclick=()=>{if(working)return;const next=data.events.find(e=>e.id===(b.dataset.holiday||b.dataset.calendarVisit));if(!next)return;event=next;holidaySelection=event.id;current=event.session;draw();if(b.dataset.calendarVisit){const title=host.querySelector('#holidayEventTitle');title.focus({preventScroll:true});title.scrollIntoView({block:'start',behavior:'instant'});}else body.querySelector('[data-holiday="'+event.id+'"]').focus({preventScroll:true});});
        if(event.id==='christmas'&&!journey){
          body.querySelector('.holidayInfo').insertAdjacentHTML('beforeend',elfArrivalMarkup(event));
          if(event.elf?.active&&event.active){
            const elfPanel=document.createElement('section');elfPanel.id='elfPanel';elfPanel.className='elfPanel';body.querySelector('#elfArrivalCard').after(elfPanel);drawElf();
            body.querySelector('#openElf').onclick=()=>{const heading=elfPanel.querySelector('h4');heading.tabIndex=-1;heading.focus({preventScroll:true});elfPanel.scrollIntoView({block:'start',behavior:'instant'});};
          }
        }
        if(journey){
          const grid=body.querySelector('.holidayRewards'),album=document.createElement('details'),summary=document.createElement('summary');album.className='journeyAlbum';summary.textContent='🎁 Le tue 3 collezioni · Bosco, Viaggio e Sogni';album.append(summary,grid);body.querySelector('.holidayInfo').append(album);
          const names={bosco:'🌳 Bosco',viaggio:'🧭 Viaggio',sogni:'🌙 Sogni'};grid.querySelectorAll('article').forEach((card,i)=>{const label=document.createElement('small');label.textContent=names[event.rewards[i].collection]||'';card.prepend(label);});
          const next=event.rewards.find(r=>!r.owned);const goal=document.createElement('section');goal.className='journeyGoal';goal.setAttribute('aria-label','Il prossimo premio');
          goal.innerHTML=next?'<span aria-hidden="true">'+esc(next.icon)+'</span><div><b>Prossima scoperta: '+esc(next.name)+'</b><p>'+next.progress+' / '+next.exercises+' esercizi fatti. Puoi arrivarci al tuo ritmo.</p><progress max="'+next.exercises+'" value="'+next.progress+'" aria-label="Esercizi per '+esc(next.name)+'"></progress></div>':'<b>🌟 Hai esplorato tutte e tre le collezioni!</b><p>I premi restano tuoi. Le missioni continuano per esercitarti; per nuovi oggetti aggiungeremo altre collezioni.</p>';body.querySelector('#holidayChallenge').before(goal);
        }
        if(!journey){
          const grid=body.querySelector('.holidayRewards'),album=document.createElement('details'),summary=document.createElement('summary');album.className='holidayAlbum';summary.textContent='🎁 La collezione del villaggio · '+event.rewards.length+' premi';album.append(summary,grid);body.querySelector('.holidayInfo').append(album);
          const exerciseRewards=event.rewards.filter(r=>Number.isFinite(r.exercises)&&r.exercises>0),next=exerciseRewards.filter(r=>!r.owned).sort((a,b)=>a.exercises-b.exercises)[0];
          if(exerciseRewards.length){
            const goal=document.createElement('section');goal.className='holidayExerciseGoal';goal.setAttribute('aria-label','Il prossimo premio con gli esercizi');
            if(next){goal.dataset.holidayNextReward=next.id;goal.innerHTML='<span aria-hidden="true">'+esc(next.icon)+'</span><div><h4>Prossimo premio: '+esc(next.name)+'</h4><p>'+Number(next.progress)+' / '+Number(next.exercises)+' esercizi fatti</p><progress max="'+Number(next.exercises)+'" value="'+Number(next.progress)+'" aria-label="Esercizi per '+esc(next.name)+'"></progress></div>';}
            else goal.innerHTML='<span aria-hidden="true">🎁</span><div><h4>I premi a esercizi sono già tuoi!</h4><p>Personaggi e accessori restano nel guardaroba. Puoi ancora giocare per esercitarti.</p></div>';
            body.querySelector('#holidayChallenge').before(goal);
          }
        }
        const exercise=body.querySelector('#holidayChallenge');
        if(!event.active){exercise.innerHTML='<p>Le missioni di questa festa sono chiuse. I premi già ottenuti si possono usare tutto l’anno.</p>';return;}
        if(current?.done){
          const another=!journey&&event.repeatable===true;
          exercise.innerHTML='<div class="trainingSuccess holidayRoundComplete"><strong id="holidayCompleteTitle" tabindex="-1">🌟 '+(!journey&&current.round>1?'Sfida completata!':'La missione di oggi è completata!')+'</strong><p>Hai fatto un bel passo. '+(journey?'La prossima missione cambia domani. Puoi riposare o scegliere gli altri giochi. Nessun premio va perso.':another?'Puoi fare altre tre prove per sbloccare personaggi e accessori, oppure fermarti qui.':'Puoi scegliere qualsiasi altro gioco. I premi ottenuti restano tuoi.')+'</p>'+(another?'<button type="button" class="primary" id="holidayAnother">Un’altra sfida</button><p class="holidayRewardNote">I distintivi per 1, 3 e 5 giornate richiedono date diverse.</p>':'')+'</div>';
          exercise.querySelector('#holidayAnother')?.addEventListener('click',()=>send('holiday-start',{event:event.id,another:true,after:current.token}));return;
        }
        if(!current){exercise.innerHTML='<button class="primary" id="holidayStart">'+(journey?'Apri la missione di oggi →':'Inizia la sfida')+'</button>';exercise.querySelector('button').onclick=()=>send('holiday-start',{event:event.id});return;}
        const q=current.question;
        exercise.innerHTML='<div class="holidayStep"><strong>'+current.step+' / 3 prove fatte</strong><button class="audio" id="holidayPause">⏸ Pausa</button></div><p class="holidayGameTitle">'+(q.review?'Ripassiamo una parola già incontrata · ':'')+esc(q.title||'Una piccola avventura')+'</p><h4 tabindex="-1" id="holidayPrompt">'+esc(q.prompt)+'</h4>'+(q.mode==='build'?'<div class="holidayBuildSlots" aria-label="Parola composta"></div><div class="holidayBuildTiles">'+q.tiles.map((t,i)=>'<button class="audio" data-holiday-tile="'+i+'" aria-label="'+(t===' '?'Spazio':'Lettera '+esc(t))+'">'+esc(t===' '?'␣':t)+'</button>').join('')+'</div><button class="primary" id="holidayBuildCheck">'+(journey?'Controlla il puzzle':'Controlla i biscotti')+'</button>':q.options.length?'<div class="holidayOptions">'+q.options.map(o=>'<button class="audio" data-holiday-answer="'+esc(o)+'">'+esc(o)+'</button>').join('')+'</div>':'<form id="holidayWrite"><label for="holidayAnswer">La tua parola</label><input id="holidayAnswer" maxlength="100" required autocomplete="off" autocapitalize="none" spellcheck="false"><button class="primary">Controlla</button></form>')+'<button class="audio" id="holidayHint">💡 Un aiuto</button>'+(q.hint?'<p class="holidayHint">Guardiamo insieme: <b>'+esc(q.hint)+'</b></p>':'');
        if(q.mode==='build'){
          const picks=[],slots=exercise.querySelector('.holidayBuildSlots');
          function showTiles(){slots.innerHTML=picks.map((id,i)=>'<button class="audio" data-holiday-undo="'+i+'" aria-label="Togli '+esc(q.tiles[id]===' '?'spazio':q.tiles[id])+'">'+esc(q.tiles[id]===' '?'␣':q.tiles[id])+'</button>').join('');exercise.querySelectorAll('[data-holiday-tile]').forEach(b=>b.disabled=picks.includes(Number(b.dataset.holidayTile)));slots.querySelectorAll('[data-holiday-undo]').forEach(b=>b.onclick=()=>{if(working)return;const id=picks.splice(Number(b.dataset.holidayUndo),1)[0];showTiles();exercise.querySelector('[data-holiday-tile="'+id+'"]').focus();});}
          exercise.querySelectorAll('[data-holiday-tile]').forEach(b=>b.onclick=()=>{const id=Number(b.dataset.holidayTile);if(working||picks.includes(id))return;picks.push(id);showTiles();(exercise.querySelector('[data-holiday-tile]:not(:disabled)')||exercise.querySelector('#holidayBuildCheck')).focus();});exercise.querySelector('#holidayBuildCheck').onclick=()=>answer(picks.map(id=>q.tiles[id]).join(''));
        }
        exercise.querySelectorAll('[data-holiday-answer]').forEach(b=>b.onclick=()=>answer(b.dataset.holidayAnswer));exercise.querySelector('form')?.addEventListener('submit',e=>{e.preventDefault();answer(exercise.querySelector('input').value);});exercise.querySelector('#holidayHint').onclick=()=>send('holiday-hint',{token:current.token,step:current.step});
        exercise.querySelector('#holidayPause').onclick=()=>{location.hash='#allenati';};
      }
      function drawElf(){
        const panel=body.querySelector('#elfPanel');if(!panel||!valid())return;const elf=event.elf;if(!elf?.active)return;
        const prank=elf.prank,key=event.season+'|'+elf.day,resolved=elfResolved.has(key);
        panel.dataset.elfPrank=prank.id;panel.dataset.elfResolved=String(resolved);
        panel.innerHTML='<div class="elfHeading"><span aria-hidden="true">🧝</span><div><h4>Birillo, l’elfo birichino</h4><p>'+esc(prank.title)+'</p></div></div><p>'+esc(prank.story)+'</p><div id="elfToy"></div><p id="elfStatus" role="status" aria-live="polite">'+(resolved?'Scherzo sistemato! Birillo ride con te.':'Un piccolo scherzo facoltativo: puoi giocare o passare agli esercizi.')+'</p><div class="elfControls">'+(resolved?'<button class="audio" id="elfReplay">Rifai lo scherzo</button>':'')+'<button class="audio" id="elfContinue">Vai agli esercizi</button></div><small>I premi si conquistano con le missioni del villaggio. Rifare lo scherzo non cambia monete o progressi.</small>';
        const toy=panel.querySelector('#elfToy');
        const finish=()=>{if(!valid())return;elfResolved.add(key);drawVillage(event.id,elf,true);drawElf();sceneView?.react('success');panel.querySelector('#elfReplay')?.focus({preventScroll:true});};
        if(resolved)toy.innerHTML='<p class="elfModel">'+esc(prank.model)+'</p>';
        else if(prank.mode==='build'){
          toy.innerHTML='<p>Parola da ricomporre: <b>CAT · gatto</b></p><div id="elfSlots" class="elfSlots" aria-label="Le lettere scelte"></div><div class="elfTiles">'+prank.tiles.map((letter,i)=>'<button class="audio" data-elf-tile="'+i+'" aria-label="Pacco con la lettera '+esc(letter)+'">🎁 '+esc(letter)+'</button>').join('')+'</div><button class="primary" id="elfCheck">Controlla i pacchi</button>';
          const picks=[];const update=()=>{toy.querySelector('#elfSlots').innerHTML=picks.map((id,i)=>'<button class="audio" data-elf-remove="'+i+'" aria-label="Togli '+esc(prank.tiles[id])+'">'+esc(prank.tiles[id])+'</button>').join('');toy.querySelectorAll('[data-elf-tile]').forEach(b=>b.disabled=picks.includes(Number(b.dataset.elfTile)));toy.querySelectorAll('[data-elf-remove]').forEach(b=>b.onclick=()=>{picks.splice(Number(b.dataset.elfRemove),1);update();});};
          toy.querySelectorAll('[data-elf-tile]').forEach(b=>b.onclick=()=>{const id=Number(b.dataset.elfTile);if(!valid()||picks.includes(id))return;picks.push(id);update();(toy.querySelector('[data-elf-tile]:not(:disabled)')||toy.querySelector('#elfCheck')).focus();});
          toy.querySelector('#elfCheck').onclick=()=>{if(picks.map(id=>prank.tiles[id]).join('')===prank.model)finish();else panel.querySelector('#elfStatus').textContent='Quasi! Guardiamo CAT: prima C, poi A, poi T. Puoi togliere una lettera toccandola.';};
        }else if(prank.mode==='letter'){
          toy.innerHTML='<p class="elfModel">_EN</p><div class="elfTiles">'+prank.options.map(letter=>'<button class="audio" data-elf-letter="'+esc(letter)+'">'+esc(letter)+'</button>').join('')+'</div>';
          toy.querySelectorAll('[data-elf-letter]').forEach(b=>b.onclick=()=>{if(!valid())return;if(b.dataset.elfLetter===prank.answer)finish();else panel.querySelector('#elfStatus').textContent='PEN comincia con P. Guarda il modello e riprova con calma.';});
        }else{
          toy.innerHTML=prank.id==='sign'?'<p class="elfModel">KOOB</p>':prank.id==='moustache'?'<div class="elfSnowman" aria-label="Pupazzo con baffi disegnati"><span aria-hidden="true">☃️</span><b aria-hidden="true">〰</b></div>':'<div class="elfColors" aria-label="Fiocchi colorati"><span>❄</span><span>❄</span><span>❄</span></div>';
          const button=document.createElement('button');button.className='primary';button.id='elfFix';button.textContent=prank.button;button.onclick=finish;toy.append(button);
        }
        panel.querySelector('#elfReplay')?.addEventListener('click',()=>{if(!valid())return;elfResolved.delete(key);drawVillage(event.id,elf,false);drawElf();panel.querySelector('button')?.focus({preventScroll:true});});
        panel.querySelector('#elfContinue').onclick=()=>{const exercise=body.querySelector('#holidayChallenge');exercise.scrollIntoView({block:'center',behavior:'instant'});(exercise.querySelector('button,input')||exercise).focus({preventScroll:true});};
      }
      function answer(answer){send('holiday-answer',{token:current.token,step:current.step,answer,attempt:Array.from(crypto.getRandomValues(new Uint8Array(16)),b=>b.toString(16).padStart(2,'0')).join('')});}
      async function send(action,payload){
        if(working||!valid())return;working=true;jump.disabled=true;jump.setAttribute('aria-busy','true');jump.textContent=action==='holiday-start'?'Prepariamo la sfida…':action==='holiday-hint'?'Apriamo l’aiuto…':'Salviamo la risposta…';body.querySelectorAll('button,input').forEach(b=>b.disabled=true);
        try{const result=await request(action,payload);if(!valid())return;current=result.session;event.session=current;if(result.rewards)event.rewards=result.rewards;if(result.wallet&&hub)hub.wallet=result.wallet;
          if(current.done){const completed=current,completedSeason=event.season,fresh=await request('holiday-state&profile='+owner);if(!valid())return;data.events=fresh.events;if(hub&&fresh.wallet)hub.wallet=fresh.wallet;event=data.events.find(e=>e.id===event.id);current=event.session||(event.active&&event.season===completedSeason?completed:null);}
          working=false;draw();const msg=body.querySelector('#holidayMessage');msg.textContent=result.correct===false?'❌ Proviamo insieme: guarda il modello e riprova. Non perdi premi o progressi.':result.correct?'✓ Ben fatto! La risposta è salvata.':result.replayed?'Il salvataggio è già confermato.':'';if(result.earned?.length)msg.textContent+=' 🎁 Hai sbloccato: '+result.earned.map(id=>item(id)?.name||'un premio').join(', ')+'. Resta tuo anche dopo le feste.';const destination=body.querySelector('#holidayPrompt')||body.querySelector('#holidayCompleteTitle');destination?.focus({preventScroll:true});if(current?.done||action==='holiday-start')destination?.scrollIntoView({block:'start',behavior:'instant'});
        }catch(error){if(valid()){working=false;body.querySelector('#holidayMessage').textContent=(action==='holiday-start'?'L’apertura della sfida non è confermata qui: ':'La risposta non è confermata qui: ')+error.message+' Riapri il '+(journey?'percorso':'villaggio')+' per verificare il salvataggio.';const retry=document.createElement('button');retry.id='holidayVerify';retry.type='button';retry.className='audio';retry.textContent='Verifica e riprendi';retry.onclick=reopen;body.querySelector('#holidayMessage').append(retry);jump.disabled=false;jump.setAttribute('aria-busy','false');jump.textContent='Vai al recupero';jump.setAttribute('aria-controls','holidayVerify');retry.focus({preventScroll:true});}}
      }
      draw();
    }catch(error){if(valid()){body.innerHTML='<section class="holidayActionPane"><p role="status">'+esc(error.message)+' Nessun premio viene inventato offline.</p><button class="audio">Riprova</button></section>';body.querySelector('button').onclick=reopen;jump.disabled=false;jump.setAttribute('aria-busy','false');jump.textContent='Verifica la connessione';jump.setAttribute('aria-controls','holidayBody');}}
  }
  function renderFestival(){
    const content=root.querySelector('#questContent');
    if(!profile.id||!hub?.clubs?.length){content.innerHTML='<div class="festivalWelcome"><span>🏆</span><h3>Un festival per la tua classe</h3><p>L’insegnante o un adulto può creare il gruppo classe e invitare i partecipanti con un codice. Qui compaiono solo soprannomi e avatar.</p><button class="primary" id="festivalLogin">Apri l’area adulti</button></div>';content.querySelector('button').onclick=openAdults;return;}
    const board=hub?.board||[],team=hub?.team||0;
    content.innerHTML='<div class="festivalHeader"><div><span class="questEyebrow">IL FESTIVAL DELLE SCOPERTE</span><h3>Una settimana, tante conquiste</h3><p>Esperienza, miglioramenti e coraggio. Ogni lunedì una nuova avventura.</p></div><label>La tua classe<select id="festivalClub">'+(hub?.clubs||[]).map(c=>'<option value="'+c.id+'" '+(club===c.id?'selected':'')+'>'+esc(c.name)+'</option>').join('')+'</select></label></div><div class="teamQuest"><span>🚀</span><div><b>Costruiamo insieme la stazione spaziale</b><p>'+team+' / '+(hub?.teamGoal||300)+' XP di squadra</p><div class="levelTrack"><i style="width:'+Math.min(100,team/3)+'%"></i></div></div><span>'+(team>=300?'🌟':'🪐')+'</span></div><div class="missionWorld" id="teamWorld"><span class="sceneFallback">🚀</span><span class="worldProgressLabel">LA STAZIONE DELLA CLASSE</span></div><ol class="festivalBoard">'+board.map((p,i)=>'<li class="'+(p.mine?'myRank':'')+'"><span class="rankMedal">'+(['🥇','🥈','🥉'][i]||'✦')+'</span><span class="rankAvatar racerModel" data-racer="'+(['fox','panda','robot','dragon','octopus','lion','reindeer','penguin','snowpal','bunny','koala','elf-boy','elf-girl','polar-bear','gingerbread','silver-reindeer','mrs-claus','santa','nutcracker','yeti'].includes(p.equipped?.avatar)?p.equipped.avatar:'fox')+'" aria-hidden="true"></span><div><b>'+esc(p.nickname)+(p.mine?' · tu':'')+'</b><small>'+(p.improvement?'🌱 '+p.improvement+' difficoltà superate':p.missions?'💪 '+p.missions+' missioni completate':'🌟 La tua prima scoperta ti aspetta')+'</small></div><strong>'+p.points+' XP</strong></li>').join('')+'</ol><p class="hint">Contano fino a 15 parole nuove al giorno. Nessun punto viene tolto per gli errori. La partecipazione ai gruppi è gestita dagli adulti.</p>';
    sceneView=window.wordylandIsland.mount(content.querySelector('#teamWorld'),{kind:'space',progress:Math.min(1,team/(hub?.teamGoal||300))});
    content.querySelector('#festivalClub').onchange=async e=>{club=Number(e.target.value);try{await refresh();}catch(e){say(e.message);}};
  }
  function openAdults(){const area=document.querySelector('.accountArea');if(!area)return;window.wordylandUI?.play();area.open=true;area.dataset.exposed='true';area.scrollIntoView({behavior:window.wordylandMotion.allowed()?'smooth':'auto',block:'start'});(area.querySelector('[data-profile][aria-pressed="true"]')||area.querySelector('[data-profile]')||area.querySelector('input'))?.focus({preventScroll:true});}
  function parseStudy(text){
    const known=new Map(allWords().map(w=>[normalize(w[0]),w]));const found=new Map();
    text.split(/\n|;/).forEach(line=>{const parts=line.split(/\s*=\s*|\t|\s*:\s*/);if(parts.length===2&&/^[a-z][a-z ’'?,.!-]{0,79}$/i.test(parts[0].trim())&&parts[1].trim())found.set(normalize(parts[0]),[parts[0].trim(),parts[1].trim(),'📚']);else{const word=known.get(normalize(line));if(word)found.set(normalize(line),word);}});
    return [...found.values()].slice(0,80);
  }
  function bindLearningSummary(host){
    const detail=host.querySelector('#learningSummary');if(!detail)return;
    const owner=profile.id,username=window.wordylandAccount.info().username,content=detail.querySelector('#learningSummaryContent'),status=detail.querySelector('#learningSummaryStatus'),button=detail.querySelector('#refreshLearningSummary');let loading=false;
    const valid=()=>detail.isConnected&&profile.id===owner&&window.wordylandAccount.info().username===username;
    async function load(){
      if(loading||!valid())return;loading=true;button.setAttribute('aria-disabled','true');content.setAttribute('aria-busy','true');status.textContent='Caricamento del riepilogo…';
      try{
        const data=await api('learning-summary&profile='+owner);if(!valid())return;
        if(data.profile!==owner)throw new Error('Il profilo è cambiato. Riapri il riepilogo del profilo scelto.');
        detail.querySelector('#learningSummaryName').textContent=data.nickname;
        content.innerHTML='<dl class="learningMetrics">'+[['Senza aiuto né errori',data.totals.independent],['Con un aiuto',data.totals.assisted],['Dopo un errore',data.totals.corrected],['Risposte corrette registrate',data.totals.observed],['Missioni completate',data.completedMissions],['Missioni da continuare',data.pendingMissions]].map(([label,value])=>'<div><dt>'+label+'</dt><dd>'+Number(value)+'</dd></div>').join('')+'</dl>'+(data.legacyCorrect?'<p>Altre '+Number(data.legacyCorrect)+' risposte corrette precedenti sono conservate, senza il nuovo dettaglio sugli aiuti.</p>':'')+'<h4>Parole da allenare con calma</h4>'+(data.reviewWords.length?'<ul class="parentReviewWords">'+data.reviewWords.map(word=>'<li>'+esc(word)+'</li>').join('')+'</ul>'+(data.reviewTotal>data.reviewWords.length?'<p>Mostrate '+data.reviewWords.length+' su '+Number(data.reviewTotal)+' parole/frasi da ripassare.</p>':''):'<p>Nessuna parola segnalata dalle attività registrate. Puoi continuare con nuovi temi.</p>')+'<p>Il ripasso può includere parole incontrate nelle missioni e nell’Allenamento. I totali delle missioni restano distinti dai progressi dell’Allenamento.</p><p>Gli aiuti fanno parte del gioco. Aiuti e correzioni possono sovrapporsi: questi dati non sono un voto.</p><p>'+Number(data.xp)+' XP e '+Number(data.coins)+' monete di gioco. Non vengono tolti punti per gli errori.</p><a class="lessonShortcut" href="#allenati">Apri gli esercizi →</a> <a class="lessonShortcut" href="#continua">Missioni da continuare →</a>';
        status.textContent='Riepilogo aggiornato per '+data.nickname+'.';
      }catch(error){if(valid()){content.replaceChildren();status.textContent='Riepilogo non aggiornato. '+error.message;}}
      finally{loading=false;if(valid()){button.setAttribute('aria-disabled','false');content.setAttribute('aria-busy','false');}}
    }
    detail.addEventListener('toggle',()=>{if(detail.open)load();});button.onclick=load;
  }
  // Mixed asset versions must leave the existing manual workflow usable.
  function manualStudyReview(form,{valid,invalidate}){
    const note=document.createElement('div');
    note.innerHTML='<p>Il lettore locale non è disponibile. Puoi inserire il testo a mano; nessun file viene letto automaticamente.</p><label class="adultCheck"><input id="studyKeepAttachment" type="checkbox"> Salva anche il file come allegato privato alla conferma finale</label><label class="adultCheck"><input id="studyReviewText" type="checkbox"> Ho controllato il testo e le traduzioni per gli esercizi</label>';
    form.querySelector('#studyText').closest('label').after(note);
    const review=note.querySelector('#studyReviewText'),keep=note.querySelector('#studyKeepAttachment');let revision=0,disposed=false;
    const changed=e=>{revision++;if(['studyText','studyFile'].includes(e.target.id)){review.checked=false;invalidate();}else if(['studyReviewText','studyKeepAttachment'].includes(e.target.id))invalidate();};
    form.addEventListener('input',changed);form.addEventListener('change',changed);
    return {revision:()=>revision,checked:()=>!disposed&&form.isConnected&&valid()&&review.checked,attachment:()=>!disposed&&valid()&&keep.checked?form.querySelector('#studyFile').files[0]:null,dispose(){disposed=true;form.removeEventListener('input',changed);form.removeEventListener('change',changed);form.querySelector('#studyFile').value='';}};
  }
  let studyImport=null;
  function adultTools(){
    studyImport?.dispose();studyImport=null;
    const host=document.querySelector('#studyTools');if(!host||!profile.id)return;
    host.innerHTML='<details class="studyBox"><summary>📚 Materiali di scuola e missioni personali</summary><p>Scegli una foto o un PDF e prepara le parole nel formato <b>inglese = italiano</b>. Puoi leggere localmente i PDF con testo oppure trascrivere le foto. Nessun esercizio viene creato prima del tuo controllo. L’allegato sul sito è facoltativo e richiede una scelta esplicita.</p><form id="studyForm"><label>Titolo della scheda<input id="studyTitle" maxlength="60" required placeholder="Il corpo · settimana 1"></label><label>Foto o PDF · facoltativo, massimo 4 MB<input id="studyFile" type="file" accept="image/jpeg,image/png,image/webp,application/pdf"></label><label>Parole e frasi<textarea id="studyText" rows="5" placeholder="eye = occhio&#10;ear = orecchio&#10;the cat is on the box = il gatto è sopra la scatola"></textarea></label><button class="audio" type="button" id="previewStudy">Prepara le missioni</button><div id="studyPreview"></div><button class="primary" id="confirmStudy" hidden>Conferma e salva il programma</button></form><div class="savedStudies">'+(hub?.studies||[]).map(s=>'<div><b>'+esc(s.title)+'</b><small>'+JSON.parse(s.words).length+' parole confermate</small>'+(s.original_name?'<a target="_blank" rel="noopener" href="api.php?action=study-file&profile='+profile.id+'&study='+s.id+'">Scarica allegato</a>':'')+'<button class="audio" data-remove-study="'+s.id+'">Rimuovi scheda</button></div>').join('')+'</div></details><details class="studyBox"><summary>🏫 La classe e il link di iscrizione</summary><p>Il profilo scelto condividerà soprannome, personaggio e punti con gli altri partecipanti. Puoi uscire quando vuoi.</p><form id="clubForm"><label>Nome della classe<input name="name" maxlength="40" placeholder="Gli esploratori della 2ª"></label><label>Oppure codice o link della classe<input name="code" autocomplete="off" placeholder="Incolla qui il link ricevuto"></label><label class="adultCheck"><input name="consent" type="checkbox" required> Confermo la partecipazione di questo profilo con soprannome e avatar</label><button class="primary" value="club-create">Crea classe</button><button class="audio" value="club-join">Entra con il codice</button></form><p id="clubMessage" role="status"></p>'+(hub?.clubs||[]).map(c=>'<div class="classManageRow"><b>'+esc(c.name)+'</b> '+(c.managed?'<button class="audio" data-class-share="'+c.id+'">Mostra link della classe</button>':'')+' <button class="audio" data-leave-club="'+c.id+'">Esci dalla classe</button><div data-class-link="'+c.id+'"></div></div>').join('')+'</details>';
    host.insertAdjacentHTML('afterbegin','<details class="studyBox" id="learningSummary"><summary>🌱 Progressi nelle missioni · per l’adulto</summary><p>Profilo scelto: <b id="learningSummaryName">'+esc(profile.nickname||'Il tuo profilo')+'</b>. Vedi soltanto i profili del tuo account.</p><p>Il riepilogo riguarda le missioni online confermate. Ospiti, ripasso offline e altre modalità non sono inclusi.</p><button type="button" class="audio" id="refreshLearningSummary">Aggiorna riepilogo</button><p id="learningSummaryStatus" role="status" aria-live="polite">Apri questa sezione per caricare i progressi.</p><div id="learningSummaryContent"></div></details>');
    bindLearningSummary(host);
    window.wordylandTraining?.mountParent(host,profile);
    let proposal=[];const studyOwner=profile.id,studyUsername=window.wordylandAccount.info().username,form=host.querySelector('#studyForm');
    const studyValid=()=>form.isConnected&&profile.id===studyOwner&&window.wordylandAccount.info().username===studyUsername;
    const clearProposal=()=>{proposal=[];host.querySelector('#confirmStudy').hidden=true;host.querySelector('#studyPreview').replaceChildren();};
    const importer=window.wordylandStudyImport?.mount(form,{valid:studyValid,invalidate:clearProposal})||manualStudyReview(form,{valid:studyValid,invalidate:clearProposal});studyImport=importer;
    host.querySelector('#previewStudy').onclick=()=>{if(!studyValid()||!importer.checked()){clearProposal();const note=document.createElement('p');note.textContent='Controlla il testo e spunta la revisione adulta prima di preparare le missioni.';host.querySelector('#studyPreview').append(note);return;}proposal=parseStudy(host.querySelector('#studyText').value);const preview=host.querySelector('#studyPreview');preview.innerHTML=proposal.length?'<h4>Controlla il programma proposto</h4>'+proposal.map((w,i)=>'<label class="adultCheck"><input type="checkbox" data-word="'+i+'" checked> '+esc(w[0])+' → '+esc(w[1])+'</label>').join(''):'<p>Inserisci una parola per riga: inglese = italiano. Puoi anche inserire una parola già presente nel gioco.</p>';host.querySelector('#confirmStudy').hidden=!proposal.length;};
    host.querySelector('#studyText').oninput=clearProposal;
    host.querySelector('#studyForm').onsubmit=async e=>{
      e.preventDefault();const button=host.querySelector('#confirmStudy');if(button.disabled)return;button.disabled=true;
      try{if(!studyValid()||!importer.checked())throw new Error('Controlla il testo e conferma la revisione adulta.');const reviewRevision=importer.revision(),words=[...host.querySelectorAll('[data-word]:checked')].map(b=>proposal[Number(b.dataset.word)]);if(!words.length)throw new Error('Seleziona almeno una parola da confermare.');const payload={title:host.querySelector('#studyTitle').value,words,confirmed:true};const file=importer.attachment();if(file){if(file.size>4000000)throw new Error('La scheda supera 4 MB.');payload.attachment=await new Promise((resolve,reject)=>{const r=new FileReader();r.onerror=()=>reject(new Error('Non riesco a leggere il file.'));r.onload=()=>resolve({name:file.name,data:String(r.result).split(',')[1]});r.readAsDataURL(file);});}if(!studyValid()||!importer.checked()||importer.revision()!==reviewRevision)throw new Error('Il profilo o il testo sono cambiati. Ricontrolla la scheda.');await api('study-save',payload);if(!studyValid())return;await refresh();say('📚 Programma confermato! Lo trovi tra le missioni personali.');}catch(e){if(studyValid()){say(e.message);button.disabled=false;}}
    };
    host.querySelectorAll('[data-remove-study]').forEach(b=>b.onclick=async()=>{if(!confirm('Rimuovere questa scheda e il suo allegato? I progressi già ottenuti rimangono.'))return;try{await api('study-remove',{study:Number(b.dataset.removeStudy)});await refresh();}catch(e){say(e.message);}});
    const classForm=host.querySelector('#clubForm'),classOwner=profile.id,classUsername=window.wordylandAccount.info().username;
    const classMessage=host.querySelector('#clubMessage');classMessage.classList.add('formFeedback');classMessage.setAttribute('aria-atomic','true');classMessage.tabIndex=-1;
    const sameClassOwner=()=>profile.id===classOwner&&window.wordylandAccount.info().username===classUsername;
    classForm.addEventListener('input',event=>event.target.removeAttribute('aria-invalid'));
    classForm.onsubmit=async e=>{
      e.preventDefault();if(classForm.getAttribute('aria-busy')==='true'||!sameClassOwner())return;
      const action=e.submitter?.value;if(!['club-create','club-join'].includes(action))return;
      const fields=Object.fromEntries(new FormData(classForm)),field=classForm.elements[action==='club-create'?'name':'code'];
      let code=String(fields.code||'').trim();
      // Pasting the class link must not send a request to an arbitrary URL.
      if(action==='club-join'&&/^https?:\/\//i.test(code)){
        try{const link=new URL(code);if(link.origin===location.origin)code=new URLSearchParams(link.hash.slice(1)).get('classe')||code;}catch{}
      }
      const failField=text=>{classMessage.textContent=text;field.setAttribute('aria-invalid','true');field.setAttribute('aria-describedby','clubMessage');field.focus({preventScroll:true});classMessage.scrollIntoView({block:'nearest',behavior:'auto'});};
      if(action==='club-create'&&!String(fields.name||'').trim()){failField('Scrivi il nome della classe che vuoi creare.');return;}
      if(action==='club-join'&&!/^(?:[a-f0-9]{12}|[a-f0-9]{24})$/i.test(code)){failField('Incolla il link WordyLand della classe oppure il suo codice di 12 o 24 caratteri.');return;}
      classForm.setAttribute('aria-busy','true');classForm.querySelectorAll('button').forEach(button=>button.disabled=true);classMessage.textContent=action==='club-create'?'Creazione della classe in corso.':'Iscrizione alla classe in corso.';
      let uncertain=false,mutationConfirmed=false;
      try{
        const r=await api(action,{name:fields.name,code,consent:fields.consent==='on'});mutationConfirmed=true;if(!sameClassOwner())return;club=r.id;await refresh();if(!sameClassOwner())return;
        document.querySelector('.accountArea').open=true;const message=document.querySelector('#clubMessage');message.tabIndex=-1;message.closest('details').open=true;
        if(r.code){message.textContent='Classe creata! Ecco il link da condividere.';window.wordylandClassroom.share(r.code,document.querySelector('[data-class-link="'+r.id+'"]'));}else message.textContent='Profilo aggiunto alla classe.';
        message.focus({preventScroll:true});message.scrollIntoView({block:'nearest',behavior:'auto'});
      }catch(error){
        if(!sameClassOwner()||!classForm.isConnected)return;
        uncertain=mutationConfirmed||!error.code||error.code>=500;
        classMessage.textContent=uncertain?'Esito non confermato. Verifica le tue classi prima di inviare di nuovo.':error.message;
        if(uncertain){const check=document.createElement('button');check.type='button';check.className='audio';check.textContent='Verifica le mie classi';check.onclick=async()=>{check.disabled=true;try{await refresh();document.querySelector('.accountArea').open=true;document.querySelector('#clubForm').closest('details').open=true;}catch(error){if(check.isConnected){classMessage.firstChild.textContent='Verifica non riuscita. '+error.message;check.disabled=false;}}};classMessage.append(document.createTextNode(' '),check);check.focus({preventScroll:true});}
        else{classMessage.focus({preventScroll:true});classMessage.scrollIntoView({block:'nearest',behavior:'auto'});}
      }finally{if(classForm.isConnected&&!uncertain){classForm.setAttribute('aria-busy','false');classForm.querySelectorAll('button').forEach(button=>button.disabled=false);}}
    };
    host.querySelectorAll('[data-class-share]').forEach(b=>b.onclick=async()=>{b.disabled=true;try{const r=await api('class-link',{club:Number(b.dataset.classShare)});if(b.isConnected)window.wordylandClassroom.share(r.code,host.querySelector('[data-class-link="'+b.dataset.classShare+'"]'));}catch(e){say(e.message);}finally{b.disabled=false;}});
    host.querySelectorAll('[data-leave-club]').forEach(b=>b.onclick=async()=>{try{await api('club-leave',{club:Number(b.dataset.leaveClub)});club=0;await refresh();}catch(e){say(e.message);}});
  }
  window.addEventListener('wordyland-profile',async e=>{
    const changed=profile.id!==e.detail.id;
    const unchangedGuest=!changed&&!profile.id&&!profile.username&&!e.detail.username;
    profile=e.detail;
    // Session readiness does not change an existing guest world; keep its scene alive.
    if(unchangedGuest){drawContinuations();adultTools();return;}
    if(changed){studyImport?.dispose();studyImport=null;document.querySelector('#studyTools')?.replaceChildren();pendingEpoch++;pending={quests:[],duels:[]};drawContinuations();mission=null;question=null;club=0;hub=null;activity='treehouse';lessonSource=null;clearScene();root.innerHTML='<p role="status">Carico il tuo personaggio…</p>';}
    refreshPending();try{await refresh(changed);}catch(e){render();say(e.message);}
  });
  profile=window.wordylandAccount?.info()||profile;drawContinuations();refreshPending();render();if(profile.id)refresh().catch(e=>say(e.message));
})();
