const $=s=>document.querySelector(s),esc=s=>String(s).replace(/[&<>"']/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]));
let saved={};try{saved=JSON.parse(localStorage.getItem('chloeGardenV2')||'{}')}catch{}let stats=saved.stats||{},custom=saved.custom||[],stars=saved.stars||0,voiceName=saved.voice||'',voices=[],mode='journey',queue=[],pos=0,phase=0,selected=[],tiles=[],mistakes=[],helped=false,done=false,maskIndex=0,sessionCorrect=0,sessionDone=0,failedThisStep=false;
const names={focus:'🎯 Ripasso mirato · Il corpo',body:'👀 Il corpo',toys:'🧸 Giocattoli',colors:'🎨 Colori',school:'✏️ A scuola',abc:'🍎 Parole A–E',fgh:'🦒 Parole F–L',mno:'🐒 Parole M–S',numbers:'🔢 Numeri 1–10',teens:'🔢 Numeri 13–15',hello:'👋 Presentiamoci',place:'📦 Dove si trova?',catpositions:'🐈 Il gatto e la scatola',sentences:'💬 Piccole frasi',review:'🎯 Da ripassare',custom:'✨ Le mie parole'};
Object.assign(names,Object.fromEntries(Object.entries(lessonTopics).map(([id,t])=>[id,t.icon+' '+t.name])));
// The classic practice box uses the same scene and owned appearance as the rest of the game.
// Scene changes are cosmetic: question queues, saved answers, stars and wallet stay untouched.
const classicWorldArt={space:{kind:'space',cell:[0,0]},animals:{kind:'pets',cell:[1,0]},dino:{kind:'dino',cell:[2,0]},sport:{kind:'football',cell:[0,1]},ocean:{kind:'ocean',cell:[1,1]},creative:{kind:'creative',cell:[2,1]}};
let classicScene=null,classicEquipped={avatar:'fox'},classicProgress=0;
function disposeClassicScene(){classicScene?.dispose();classicScene=null;$('#classicWorldFrame')?.remove();$('#game').classList.remove('hasClassicScene');}
function mountClassicScene(progress=classicProgress){
 classicProgress=Math.max(0,Math.min(1,progress));disposeClassicScene();
 if(!window.wordylandIsland||!document.querySelector('.practiceZone')?.open)return;
 const art=classicWorldArt[worldId]||classicWorldArt.space,frame=document.createElement('div'),host=document.createElement('div');
 frame.id='classicWorldFrame';frame.className='classicWorldFrame';host.id='classicWorldScene';host.className='classicWorldScene';host.dataset.classicWorld=worldId;host.setAttribute('aria-label',currentWorld().name+' · il tuo personaggio');
 frame.append(host);$('#game').prepend(frame);
 classicScene=window.wordylandIsland.mount(host,{kind:art.kind,equipped:{...classicEquipped},progress:classicProgress,artwork:{source:'race-circuits.webp',columns:3,rows:2,cell:art.cell}});
 $('#game').classList.add('hasClassicScene');const modes=host.querySelector('.sceneViewModes');if(modes){modes.classList.remove('sceneViewOverlay');frame.append(modes);}
}
const normalize=s=>s.toLowerCase().replace(/[’‘]/g,"'").replace(/[?!.,]+$/g,'').replace(/\s+/g,' ').trim();
function shuffle(a){let b=[...a];for(let i=b.length-1;i>0;i--){let j=Math.floor(Math.random()*(i+1));[b[i],b[j]]=[b[j],b[i]]}return b}
let classicProgramKey=null,classicProgramStart=0,classicSavedCategory=null;
const classicProgramIdentity=()=>{const m=window.wordylandClassProgram?.state();return m?.mode==='class'?String(m.active.club)+':'+String(m.active.revision):m?.mode||'legacy';};
function classicProgramMessage(text){stopClassicAudio();disposeClassicScene();queue=[];done=true;$('#game').dataset.active='false';$('#game').innerHTML='<h2>Il programma della classe</h2><p>'+esc(text)+'</p><a class="lessonShortcut" href="#programma-classe">Apri il programma della classe</a>';}
function syncProgrammeOfflineEntry(manifest){
 const link=document.querySelector('.appTools a[data-class-offline],.appTools a[href="offline.html"]');if(!link)return;
 if(!link.dataset.classOffline){link.dataset.classOffline='true';link.dataset.publicLabel=link.textContent;}
 const scoped=manifest&&manifest.mode!=='legacy';link.href=scoped?'#programma-classe':'offline.html';link.textContent=scoped?'Ripasso offline della classe':link.dataset.publicLabel;
}
function syncClassicProgramCategory(){
 const cp=window.wordylandClassProgram,select=$('#category');if(!cp||!select)return;
 const m=cp.state();syncProgrammeOfflineEntry(m);if(m?.mode==='class'){
  let option=select.querySelector('[data-program-category]');if(!option){classicSavedCategory=select.value;option=document.createElement('option');option.value='program';option.dataset.programCategory='true';option.textContent='📘 Programma della classe';select.prepend(option);}
  for(const option of select.options)option.disabled=!['program','review'].includes(option.value)&&cp.filterRows(option.value==='custom'?custom:lists[option.value]||[]).length===0;
  if(classicProgramKey!==classicProgramIdentity()||select.selectedOptions[0]?.disabled)select.value='program';
 }else if(m?.mode==='legacy'){
  const was=select.value==='program';select.querySelector('[data-program-category]')?.remove();for(const option of select.options)option.disabled=false;
  if(was)select.value=classicSavedCategory&&[...select.options].some(o=>o.value===classicSavedCategory)?classicSavedCategory:'focus';
 }
}
function allWords(){const cp=window.wordylandClassProgram;if(cp?.isClass())return cp.wordPool();const rows=[...new Map(Object.entries(lists).filter(([k])=>k!=='all').flatMap(([,v])=>v).concat(custom).map(x=>[x[0],x])).values()];return cp?cp.filterRows(rows):rows;}
function save(){let stored=false;try{localStorage.setItem('chloeGardenV2',JSON.stringify({stats,custom,stars,voice:voiceName}));stored=true;}catch{}const notice=$('#classicStorageNotice');if(notice)notice.hidden=stored;return stored;}
function updateStats(){$('#total').textContent='⭐ '+stars+' stelle';let mastered=Object.values(stats).filter(x=>(x.good||0)>=3).length;$('#learned').textContent=mastered;$('#reviewCount').textContent=Object.values(stats).filter(x=>x.review).length}
function loadVoices(){if(!('speechSynthesis'in window)){$('#audioStatus').textContent='Audio non disponibile. Usa le immagini e la modalità Scopri.';return}voices=speechSynthesis.getVoices().filter(x=>/^en[-_]/i.test(x.lang));$('#voice').innerHTML=voices.length?voices.map(v=>'<option>'+esc(v.name)+'</option>').join(''):'<option>Voce inglese automatica</option>';if(voices.some(x=>x.name===voiceName))$('#voice').value=voiceName;else{let british=voices.find(x=>x.lang==='en-GB');if(british)$('#voice').value=british.name}$('#audioStatus').textContent='La voce dipende dal dispositivo. Premi Ascolta per provarla.'}
let classicSpeech=null,classicSpeechEpoch=0;
function clearClassicSpeaking(){document.querySelectorAll('#game [data-classic-speaking]').forEach(button=>button.removeAttribute('data-classic-speaking'));}
function stopClassicAudio(){const own=classicSpeech;classicSpeech=null;classicSpeechEpoch++;clearClassicSpeaking();window.wordylandLearning?.stopSpeech?.($('#game'));if(own&&'speechSynthesis'in window)speechSynthesis.cancel();}
function speak(slow=false){
 if(!queue[pos])return;if(!('speechSynthesis'in window)){message('Audio non disponibile su questo browser. Puoi usare Un aiuto.');return;}
 window.dispatchEvent(new Event('wordyland-stop-audio'));stopClassicAudio();speechSynthesis.cancel();const generation=classicSpeechEpoch,current=queue[pos],currentStage=stage(),u=new SpeechSynthesisUtterance(current[0]);classicSpeech=u;
 u.lang='en-GB';u.rate=slow?.65:.88;const voice=voices.find(x=>x.name===$('#voice').value);if(voice)u.voice=voice;
 const speakingButton=$(slow?'#slow':'#listen');if(speakingButton)speakingButton.dataset.classicSpeaking='true';
 const currentSpeech=()=>classicSpeech===u&&generation===classicSpeechEpoch&&queue[pos]===current&&stage()===currentStage;
 u.onend=()=>{if(currentSpeech()){classicSpeech=null;clearClassicSpeaking();}};
 u.onerror=event=>{if(!currentSpeech())return;classicSpeech=null;clearClassicSpeaking();if(!['interrupted','canceled'].includes(event.error))message('L’audio non è partito. Controlla volume e voce del dispositivo.');};
 try{speechSynthesis.speak(u);}catch{if(currentSpeech()){classicSpeech=null;clearClassicSpeaking();message('L’audio non è partito. Controlla volume e voce del dispositivo.');}}
}
function message(t){$('#feedback').textContent=t}
function source(){const cp=window.wordylandClassProgram,k=$('#category').value;if(cp?.isClass()&&k==='program')return cp.wordPool();const rows=k==='custom'?custom:k==='review'?allWords().filter(x=>stats[x[0]]?.review):lists[k]||[];return cp?cp.filterRows(rows):rows;}
async function start(){
 const ticket=++classicProgramStart,cp=window.wordylandClassProgram,owner=window.wordylandAccount?.info?.().id||null;
 if(!cp&&document.querySelector('#classProgramRuntime')){classicProgramMessage('Il programma si sta caricando. Attendi un momento e riprova.');return;}
 if(cp){
  const known=cp.state(),expected=known?.mode==='class'?JSON.stringify(known.expected):null;
  try{const m=await cp.ready();if(ticket!==classicProgramStart||owner!==(window.wordylandAccount?.info?.().id||null))return;
   if(!['legacy','class'].includes(m.mode)){classicProgramMessage('Scegli una classe con un programma pubblicato per iniziare.');return;}
   if(expected&&expected!==JSON.stringify(m.expected)){classicProgramMessage('Il programma è cambiato. Scegli una nuova attività nel percorso aggiornato.');return;}
   syncClassicProgramCategory();classicProgramKey=classicProgramIdentity();
  }catch{if(ticket===classicProgramStart)classicProgramMessage('Il programma non è disponibile. Riprova con Internet dal programma della classe.');return;}
 }
 if('speechSynthesis'in window)speechSynthesis.cancel();let pool=shuffle(source());pool.sort((a,b)=>(stats[b[0]]?.review?1:0)-(stats[a[0]]?.review?1:0));queue=pool.slice(0,Number($('#length').value));pos=0;phase=0;mistakes=[];sessionCorrect=0;sessionDone=0;render();const game=$('#game');game.tabIndex=-1;game.focus({preventScroll:true});game.scrollIntoView({block:'start',behavior:window.wordylandMotion?.allowed()?'smooth':'instant'});}
function stage(){return mode==='journey'?(phase===1&&queue[pos]?.[0].includes(' ')?'gap':['look','missing','write'][phase]):mode}
function picture(w,emoji){
const count=lists.counting?.find(r=>r[0].toLowerCase()===w.toLowerCase());
if(count){const meta=count[3];return '<div class="countScene" role="img" aria-label="'+esc(count[1])+'">'+Array.from({length:meta.count},()=>'<span aria-hidden="true">'+meta.symbol+'</span>').join('')+'</div>';}

const place=w.match(/(?:^| )(in front of|next to|between|behind|under|on|in|by)(?: |$)/)?.[1];
if(!place||!lists.place.some(x=>x[0]===w)&&!w.includes('box')&&!w.includes('desk')&&!w.includes('table')&&!w.includes('book'))return '<div class="emoji" aria-hidden="true">'+esc(emoji)+'</div>';
const isMouse=w.includes('mouse'),isCat=w.includes('cat')||isMouse,isPen=w.includes('pen')||emoji==='🖊️',isBook=w.includes('book'),isTable=w.includes('table')||w.includes('desk');
const object=isBook?'<rect x="65" y="80" width="100" height="38" rx="5" fill="#82b8bf" stroke="#477783" stroke-width="3"/><path d="M70 90H162M70 98H162M70 106H162" stroke="#fff4d7" stroke-width="5"/><path d="M65 80H165" stroke="#477783" stroke-width="6"/>':isTable?'<path d="M55 70H160M65 73V133M150 73V133" stroke="#987349" stroke-width="9" stroke-linecap="round"/>':'<rect x="65" y="62" width="94" height="63" rx="7" fill="#e7c691" stroke="#9e7949" stroke-width="3"/><path d="M65 62L82 47H176L159 62" fill="#f5deb3" stroke="#9e7949" stroke-width="3"/>';
function subject(x,y){return isPen?'<g transform="translate('+(x-4)+','+(y-35)+') rotate(-15)"><path d="M0 0H8V28L4 35L0 28Z" fill="#ffc95d" stroke="#956538" stroke-width="2"/><path d="M0 0H8V6H0Z" fill="#f6a5b3"/><path d="M2 31L4 35L6 31" fill="#3c5063"/></g>':isCat?'<text x="'+x+'" y="'+y+'" text-anchor="middle" font-size="39">'+(isMouse?'🐭':'🐈')+'</text>':'<circle cx="'+x+'" cy="'+(y-12)+'" r="14" fill="#e58b75" stroke="#a95c4c" stroke-width="2"/>'}
let content='';
if(place==='between'){content='<rect x="15" y="65" width="55" height="60" rx="5" fill="#e7c691" stroke="#9e7949" stroke-width="3"/><rect x="145" y="65" width="55" height="60" rx="5" fill="#e7c691" stroke="#9e7949" stroke-width="3"/>'+subject(107,110)}
else if(place==='behind')content=subject(140,65)+object;
else if(place==='in front of')content=object+subject(108,137);
else if(place==='in')content=object+subject(110,82)+'<rect x="66" y="83" width="92" height="41" fill="#e7c691"/><path d="M66 83H158" stroke="#9e7949" stroke-width="2"/>';
else {let xy={on:[110,isTable?69:isBook?78:47],under:[110,164],by:[30,117],'next to':[30,117]}[place];content=object+subject(xy[0],xy[1])}
return '<svg viewBox="0 0 215 175" width="215" height="150" role="img" aria-label="'+(isPen?'Penna e ':isMouse?'Topolino e ':isCat?'Gatto e ':'Pallina e ')+(isBook?'libro':isTable?'tavolo':'scatola')+'">'+content+'</svg>'}
let gapAnswer='';
function gapModel(w){let counted=lists.counting?.some(r=>r[0].toLowerCase()===w.toLowerCase())?w.split(' ')[0]:null;let phrase=w.match(/(?:^| )(in front of|next to|between|behind|under|on|in|by)(?= |$)/);let token=counted|| (phrase?phrase[1]:(w.toLowerCase().includes('name')?'name':w.toLowerCase().includes('old')?'old':w.toLowerCase().includes('fine')?'fine':w.split(' ').find(x=>x.length>2)||w.split(' ')[0]));let index=w.toLowerCase().indexOf(token.toLowerCase());gapAnswer=w.slice(index,index+token.length);return esc(w.slice(0,index))+'<span class="blank">'+Array.from({length:token.length},()=> '_').join('')+'</span>'+esc(w.slice(index+token.length))}
function render(){stopClassicAudio();disposeClassicScene();$('#game').dataset.active='true';selected=[];done=false;helped=false;failedThisStep=false;$('#game').classList.remove('celebrate');if(!queue.length){$('#game').innerHTML='<div class="empty">🌱</div><h2>'+($('#category').value==='review'?'Tutto ripassato!':'Qui iniziano nuove avventure')+'</h2><p>'+($('#category').value==='review'?'Le parole da allenare compariranno qui dopo i giochi di scrittura.':'Aggiungi le parole della scuola nella sezione per i grandi.')+'</p>';return}if(pos>=queue.length){finish();return}let [w,it,emoji]=queue[pos],st=stage();tiles=shuffle([...w].map((c,i)=>({c,i})));let indices=[...w].flatMap((c,i)=>/[a-z]/i.test(c)?[i]:[]);maskIndex=indices[Math.floor(Math.random()*indices.length)];let title={look:'Guarda, ascolta, ricorda',missing:'Quale lettera manca?',gap:'Completa la frase',write:'Ascolta e scrivi',build:'Rimetti in ordine',paper:'Una parola sul quaderno',match:'Ascolta e trova l’immagine'}[st];$('#game').innerHTML='<div id="worldLabel" class="homeWord">'+currentWorld().icon+' '+currentWorld().name+'</div><div class="topline"><span>PAROLA '+(pos+1)+' DI '+queue.length+'</span><span>'+(mode==='journey'?'PASSO '+(phase+1)+' / 3':'SI GIOCA!')+'</span></div><div class="track"><div class="fill" style="width:'+((pos+(mode==='journey'?phase/3:0))/queue.length*100)+'%"></div></div><h2>'+title+'</h2>'+(st==='match'?'': '<div class="visual">'+picture(w,emoji)+'</div><div class="translation">'+esc(it)+'</div>')+'<div class="audioRow"><button class="audio" id="listen">🔊 Ascolta</button><button class="audio slow" id="slow">🐢 Più piano</button></div><div id="work"></div><div id="feedback" role="status" aria-live="polite"></div><div id="comparison"></div><div id="actions"></div>';
mountClassicScene((pos+(mode==='journey'?phase/3:0))/queue.length);
$('#listen').onclick=()=>speak();$('#slow').onclick=()=>speak(true);
if(st==='look'){$('#work').innerHTML='<div class="word">'+esc(w)+'</div><p>Ascolta e guarda bene ogni lettera.</p><p class="hint">'+esc(hints[w]||'Osserva l’inizio e la fine. Ci sono lettere ripetute?')+'</p>';nextButton('L’ho osservata →',advance)}
if(st==='write'||st==='missing'||st==='gap'){$('#work').innerHTML=(st==='gap'?'<div class="word">'+gapModel(w)+'</div><p>Scrivi la parola o il gruppo di parole mancante.</p>':st==='missing'?'<div class="word">'+esc(w.slice(0,maskIndex))+'<span class="blank">_</span>'+esc(w.slice(maskIndex+1))+'</div>':'<p>Scrivi la parola che senti. Puoi ascoltarla di nuovo.</p>')+'<form id="form"><input id="answer" class="answer" aria-label="'+(st==='missing'?'Lettera mancante':'Scrivi in inglese')+'" '+(st==='missing'?'maxlength="1"':'')+' autocomplete="off" autocapitalize="none" autocorrect="off" spellcheck="false" placeholder="'+(st==='missing'?'?':'Scrivi qui…')+'"><button class="primary" type="submit">Controlla ✓</button></form>';$('#form').onsubmit=e=>{e.preventDefault();check()};helpButton()}
if(st==='build'){$('#work').innerHTML='<div id="slots" class="slots" role="group" aria-label="La parola composta"></div><div id="tiles" class="tiles" role="group" aria-label="Lettere disponibili"></div><p id="classicBuildStatus" role="status" aria-live="polite"></p><p class="hint">Tocca le lettere. Tocca una casella per correggere. ␣ = spazio.</p>';drawTiles();$('#actions').innerHTML='<button class="primary" id="check">Controlla ✓</button>';$('#check').onclick=check;helpButton()}
if(st==='paper'){$('#work').innerHTML='<div class="word" id="model">'+esc(w)+'</div><p id="paperTip">Prendi il quaderno. Guarda la parola, poi nascondila e scrivila a mano.</p>';nextButton('Nascondi e scrivi ✏️',()=>{$('#model').style.visibility='hidden';$('#paperTip').textContent='Scrivi senza copiare. Poi confrontiamo insieme!';nextButton('Ho scritto: confronta',()=>{$('#model').style.visibility='visible';$('#paperTip').textContent='Controlla ogni lettera con un adulto. La verifica è sul quaderno.';$('#actions').innerHTML='<button class="primary" id="paperYes">Uguale! →</button><button class="audio" id="paperNo">Da riprovare</button>';$('#paperYes').onclick=()=>{record(true,false);advance()};$('#paperNo').onclick=()=>{record(false,false);message('Guarda le lettere, copri e prova di nuovo con calma.');nextButton('Ho riprovato →',advance)}})})}
if(st==='match'){let spatial=lists.place.some(x=>x[0]===w)||lists.catpositions.some(x=>x[0]===w);let pool=spatial?source().filter(x=>x[0]!==w):allWords().filter(x=>x[0]!==w&&x[2]!==emoji&&!x[0].includes(' '));let options=shuffle([queue[pos],...shuffle(pool).slice(0,3)]);$('#work').innerHTML='<p>Premi Ascolta, poi scegli la figura.</p><div class="choices">'+options.map((x,i)=>'<button class="choice" data-choice="'+i+'">'+picture(x[0],x[2])+'<span>'+esc(x[1])+'</span></button>').join('')+'</div>';document.querySelectorAll('[data-choice]').forEach(b=>b.onclick=()=>{if(done)return;if(options[Number(b.dataset.choice)][0]===w){done=true;classicScene?.react('success');window.wordylandLearning.show($('#feedback'),true,{expected:w,word:w,translation:it,button:b});nextButton('Continua →',advance)}else {classicScene?.react('retry');window.wordylandLearning.show($('#feedback'),false,{expected:w,word:w,translation:it,kind:'choice',answer:options[Number(b.dataset.choice)][0],chosenTranslation:options[Number(b.dataset.choice)][1],button:b});}})}}
function nextButton(label,fn){$('#actions').innerHTML='<button class="primary" id="next">'+label+'</button>';$('#next').onclick=fn;$('#next').focus({preventScroll:true});}
function helpButton(){let b=document.createElement('button');b.className='secondary';b.textContent='💡 Un aiuto';b.onclick=()=>{helped=true;message(hints[queue[pos][0]]||'Osserva la parola, poi nascondila e riprova.');$('#comparison').innerHTML='<div class="word">'+esc(queue[pos][0])+'</div>';b.textContent='Nascondi l’aiuto';b.onclick=()=>{$('#comparison').innerHTML='';b.remove()}};$('#actions').appendChild(b)}
function drawTiles(){
 const w=queue[pos][0],bank=$('#tiles'),slots=$('#slots');
 slots.innerHTML=[...w].map((_,i)=>'<button class="slot" data-slot="'+i+'" '+(!selected[i]?'disabled':'')+' aria-label="'+(selected[i]?'Togli '+esc(selected[i].c===' '?'lo spazio':'la lettera '+selected[i].c.toUpperCase())+' dalla casella '+(i+1):'Casella '+(i+1)+' vuota')+'">'+esc(selected[i]?(selected[i].c===' '?'␣':selected[i].c):'')+'</button>').join('');
 // Keep the bank nodes stable so using a tile does not discard keyboard focus.
 if(!bank.children.length)bank.innerHTML=tiles.map(l=>'<button class="tile" data-tile="'+l.i+'" aria-label="Lettera '+esc(l.c===' '?'spazio':l.c.toUpperCase())+', tessera '+(l.i+1)+'">'+esc(l.c===' '?'␣':l.c)+'</button>').join('');
 bank.querySelectorAll('[data-tile]').forEach(button=>{button.disabled=selected.some(x=>x.i===Number(button.dataset.tile));button.onclick=()=>{if(done||button.disabled)return;const tile=tiles.find(x=>x.i===Number(button.dataset.tile));if(!tile)return;selected.push(tile);drawTiles();(bank.querySelector('[data-tile]:not(:disabled)')||$('#check'))?.focus({preventScroll:true});};});
 slots.querySelectorAll('[data-slot]:not(:disabled)').forEach(button=>button.onclick=()=>{if(done)return;const removed=selected.splice(Number(button.dataset.slot),1)[0];drawTiles();if(removed)bank.querySelector('[data-tile="'+removed.i+'"]').focus({preventScroll:true});});
 $('#classicBuildStatus').textContent=selected.length+' di '+tiles.length+' lettere. '+(selected.length===tiles.length?'Ora premi Controlla.':'Tocca o scegli la prossima lettera.');
}
function record(ok,assisted){let w=queue[pos][0];stats[w]??={good:0,review:false,attempts:0};stats[w].attempts++;if(ok&&!assisted){if(['write','build','paper'].includes(stage())){stats[w].good++;stats[w].review=false}sessionCorrect++}else{stats[w].review=true;if(!mistakes.includes(w))mistakes.push(w)}save();updateStats()}
function check(){if(done)return;let w=queue[pos][0],st=stage(),a=st==='build'?selected.map(x=>x.c).join(''):$('#answer').value;let expected=st==='gap'?gapAnswer:st==='missing'?w[maskIndex]:w;if(!a.trim()){message('Scrivi qualcosa oppure chiedi un aiuto.');return}if(normalize(a)===normalize(expected)){done=true;classicScene?.react('success');record(true,helped||failedThisStep);$('#comparison').innerHTML='';window.wordylandLearning.show($('#feedback'),true,{expected,answer:a,word:w,translation:queue[pos][1],kind:st,input:$('#answer')});$('#game').classList.add('celebrate');nextButton('Continua →',advance)}else{classicScene?.react('retry');failedThisStep=true;record(false,false);window.wordylandLearning.show($('#feedback'),false,{expected,answer:a,word:w,translation:queue[pos][1],kind:st,input:$('#answer')});let correct=0;while(correct<Math.min(a.length,expected.length)&&normalize(a[correct])===normalize(expected[correct]))correct++;$('#comparison').innerHTML='<p class="hint">'+(correct?'Le prime '+correct+' lettere sono giuste. Ricontrolla da lì.':'Riparti dalla prima lettera con calma.')+'</p>'}}
function focusClassicStep(){($('#game').querySelector('#tiles button:not(:disabled),#next,#again')||$('#game')).focus({preventScroll:true});}
function advance(){if(mode==='journey'&&phase<2){phase++;render();focusClassicStep();return}stars++;sessionDone++;save();updateStats();pos++;phase=0;render();focusClassicStep();}
function finish(){disposeClassicScene();$('#game').dataset.active='false';let world=currentWorld();$('#game').innerHTML='<div class="missionMascot">'+world.reward+'</div><div class="eyebrow">MISSIONE COMPLETATA</div><h2>'+esc(world.success)+'</h2><p>'+sessionDone+' parole allenate · '+sessionDone+' stelle per il tuo impegno</p><div class="reward">'+Array.from({length:Math.min(sessionDone,10)},()=> '⭐').join(' ')+'</div><p>'+(mistakes.length?'Ci sono '+mistakes.length+' parole da allenare ancora. Le trovi nel ripasso.':'Ottimo lavoro! Ora puoi fare una pausa o scegliere un altro mondo.')+'</p><button class="primary" id="again">Un’altra missione</button><button class="audio" id="rest">Scegli l’avventura</button>';mountClassicScene(1);classicScene?.react('complete');$('#again').onclick=start;$('#rest').onclick=home;if(mistakes.length){let b=document.createElement('button');b.className='audio';b.textContent='🎯 Ripassa queste parole';b.onclick=()=>{queue=allWords().filter(x=>mistakes.includes(x[0]));pos=0;phase=0;mistakes=[];sessionDone=0;render()};$('#game').appendChild(b)}}
function home(){stopClassicAudio();disposeClassicScene();$('#game').dataset.active='false';let world=currentWorld();$('#game').innerHTML='<div class="missionMascot classicAvatarFallback">'+avatar+' '+world.icon+'</div><div class="eyebrow">'+esc(playerName?'CIAO, '+playerName.toUpperCase():'LA TUA MISSIONE TI ASPETTA')+'</div><h2>Pronti per un’avventura<br>nel mondo '+esc(world.name.toLowerCase())+'?</h2><p class="worldMission">'+esc(world.mission)+'</p><div class="path"><span>👀 Guarda</span><i>→</i><span>🧩 Completa</span><i>→</i><span>✏️ Scrivi</span></div><button class="primary" id="begin">Partiamo! →</button><p class="hint">Nessuna fretta. Puoi chiedere aiuto e riprovare.</p>';mountClassicScene(0);$('#begin').onclick=start}
$('#category').innerHTML=Object.entries(names).map(([k,v])=>'<option value="'+k+'">'+v+'</option>').join('');document.querySelectorAll('[data-mode]').forEach(b=>b.onclick=()=>{mode=b.dataset.mode;document.querySelectorAll('[data-mode]').forEach(x=>{x.classList.toggle('active',x===b);x.setAttribute('aria-pressed',x===b)});home()});$('#category').onchange=home;$('#start').onclick=start;$('#voice').onchange=()=>{stopClassicAudio();voiceName=$('#voice').value;save()};$('#customWords').value=custom.map(x=>x[0]+' = '+x[1]).join('\n');$('#save').onclick=()=>{let rows=$('#customWords').value.split('\n').filter(x=>x.trim()),parsed=rows.map(x=>x.split('=').map(y=>y.trim()));if(parsed.some(x=>x.length!==2||!(/^[a-z][a-z '’?,.!-]{0,79}$/i.test(x[0]))||!x[1])){$('#saved').textContent='Usa inglese = italiano, una voce per riga (massimo 80 caratteri).';return}custom=parsed.map(x=>[x[0],x[1],'✨']);const stored=save();$('#saved').textContent=stored?'Salvato!':'La copia su questo dispositivo non è salvata. Tieni aperta la pagina e riprova.';$('#category').value='custom';home()};updateStats();loadVoices();if('speechSynthesis'in window)speechSynthesis.onvoiceschanged=loadVoices;initWorlds();home();

window.addEventListener('wordyland-world-state',event=>{classicEquipped={...(event.detail?.equipped||{avatar:'fox'})};mountClassicScene();});
window.addEventListener('wordyland-classic-world',()=>{if($('#game').dataset.active==='true')mountClassicScene();});
document.querySelector('.practiceZone').addEventListener('toggle',()=>{if(document.querySelector('.practiceZone').open)mountClassicScene();else{stopClassicAudio();disposeClassicScene();}});
window.addEventListener('pagehide',()=>{stopClassicAudio();disposeClassicScene();});
window.addEventListener('wordyland-stop-audio',stopClassicAudio);window.addEventListener('hashchange',stopClassicAudio);window.addEventListener('wordyland-profile',stopClassicAudio);window.addEventListener('wordyland-play-view',stopClassicAudio);document.addEventListener('visibilitychange',()=>{if(document.hidden)stopClassicAudio();});window.addEventListener('pageshow',event=>{if(event.persisted)mountClassicScene();});

// Keep storage failures visible across question redraws, without losing the open activity.
const classicStorageNotice=document.createElement('p');classicStorageNotice.id='classicStorageNotice';classicStorageNotice.className='classicStorageNotice';classicStorageNotice.hidden=true;classicStorageNotice.setAttribute('role','alert');classicStorageNotice.textContent='La copia su questo dispositivo non è stata salvata. Tieni aperta la partita e chiedi a un adulto di controllare lo spazio del browser. Se usi un profilo, controlla anche il salvataggio online nell’area account.';$('#game').after(classicStorageNotice);

// A class switch stops only the unconfirmed local queue; saved answers and rewards remain.
window.addEventListener('wordyland-program',()=>{
 const next=classicProgramIdentity();syncClassicProgramCategory();
 if(classicProgramKey!==null&&next!==classicProgramKey&&$('#game').dataset.active==='true'){++classicProgramStart;classicProgramMessage('Il programma è cambiato. Le attività salvate restano nel tuo profilo: scegli un nuovo giro.');}
 classicProgramKey=next;
});
window.addEventListener('wordyland-profile',()=>{++classicProgramStart;const cp=window.wordylandClassProgram;if(cp)cp.ready().then(()=>syncClassicProgramCategory()).catch(()=>syncProgrammeOfflineEntry({mode:'blocked'}));});
window.addEventListener('load',()=>{const cp=window.wordylandClassProgram;if(cp)cp.ready().then(()=>syncClassicProgramCategory()).catch(()=>{});});

/* Explicit offline export contains lessons only, never an API response or identity. */
(()=>{
 let exporting=false;
 const safeText=(value,max)=>typeof value==='string'&&value.length<=max?value:'';
 function lessonPack(snapshot){
  const rows=(snapshot?.words||[]).filter(row=>Array.isArray(row)&&safeText(row[0],120)&&safeText(row[1],300)).map(row=>[row[0],row[1],safeText(row[2],32)||'📖']);
  if(rows.length>500)throw Error('Il programma contiene troppe parole per questo ripasso offline. Gli esercizi restano disponibili online.');
  const source=snapshot.training||{},ids=new Set(rows.map(row=>row[0]));
  const words=rows.map(row=>({id:row[0],meaning:row[1],emoji:row[2],topic:'parole assegnate',wordOnly:true,phrase:row[0],phraseMeaning:row[1],gap:'___'}));
  const letters=(source.letters||[]).filter(letter=>/^[A-Z]$/.test(letter.id)).map(letter=>({id:letter.id,lower:safeText(letter.lower,1),it:safeText(letter.it,40),en:safeText(letter.en,40)}));
  if(!rows.length&&!letters.length)throw Error('Il programma non contiene parole o lettere scaricabili. Gli esercizi restano disponibili online.');
  const letterIds=new Set(letters.map(letter=>letter.id));
  const blocks=(source.blocks||[]).filter(block=>Array.isArray(block.letters)&&block.letters.length&&block.letters.every(id=>letterIds.has(id))).map(block=>({id:safeText(block.id,80),title:safeText(block.title,120),letters:[...block.letters]}));
  const packs=(source.wordPacks||[]).map(pack=>({id:safeText(pack.id,80),title:safeText(pack.title,120),icon:safeText(pack.icon,32)||'📘',wordOnly:true,words:(pack.words||[]).filter(id=>ids.has(id))})).filter(pack=>pack.id&&pack.words.length>=3);
  if(!packs.length&&words.length>=3)packs.push({id:'assigned-words',title:'Le parole scaricate',icon:'📘',wordOnly:true,words:words.map(word=>word.id)});
  return {words:rows,training:{letters,blocks,words,foundationWords:words,wordPacks:packs}};
 }
 document.addEventListener('click',async event=>{
  const offlineLink=event.target.closest('.appTools a[data-class-offline],.appTools a[href="offline.html"]');
  if(offlineLink&&window.wordylandAccount?.info?.().id&&window.wordylandClassProgram?.state()?.mode!=='legacy'){event.preventDefault();window.wordylandClassProgram?.open();return;}
  const button=event.target.closest('#programDownloadOffline');if(!button||exporting)return;
  exporting=true;button.disabled=true;let notice=document.querySelector('#programOfflineStatus');if(!notice){notice=document.createElement('p');notice.id='programOfflineStatus';notice.setAttribute('role','status');button.parentNode.after(notice);}notice.textContent='Preparo soltanto le parole assegnate…';
  const owner=window.wordylandAccount?.info?.().id;
  try{
   const cp=window.wordylandClassProgram,m=await cp.refresh();if(m.mode!=='class')throw Error('Scegli prima un programma pubblicato.');
   const generation=cp.generation(),data=lessonPack(cp.snapshot());
   if(!crypto.subtle||!crypto.getRandomValues)throw Error('Questo browser non può preparare il pacchetto offline. Puoi usare gli esercizi online.');
   const bytes=new TextEncoder().encode(JSON.stringify(data));if(bytes.length>2000000)throw Error('Il materiale è troppo grande per il ripasso offline. Usa il percorso online.');
   const fingerprint=Array.from(new Uint8Array(await crypto.subtle.digest('SHA-256',bytes)),n=>n.toString(16).padStart(2,'0')).join('');
   if(owner!==window.wordylandAccount?.info?.().id||generation!==cp.generation()||!button.isConnected)return;
   const key='wordylandClassOfflinePacksV1';let stored;try{stored=JSON.parse(localStorage.getItem(key)||'null');}catch{}if(stored?.version!==1||!stored.packs||typeof stored.packs!=='object'||Array.isArray(stored.packs))stored={version:1,packs:{}};
   let id=Object.keys(stored.packs).find(id=>/^[a-f0-9]{32}$/.test(id)&&stored.packs[id]?.fingerprint===fingerprint);
   if(!id){id=Array.from(crypto.getRandomValues(new Uint8Array(16)),n=>n.toString(16).padStart(2,'0')).join('');stored.packs[id]={version:1,fingerprint,...data};localStorage.setItem(key,JSON.stringify(stored));}
   notice.textContent='Pronto. Solo parole e lettere assegnate, salvate su questo dispositivo: chi lo usa potrà leggerle. Il ripasso offline non aggiorna il registro della classe. ';
   const link=document.createElement('a');link.className='lessonShortcut';link.href='offline.html?programma='+id;link.textContent='Apri il ripasso scaricato →';notice.append(link);
  }catch(error){if(notice.isConnected)notice.textContent=error.message||'Il salvataggio non è riuscito. Gli esercizi online restano disponibili.';}finally{exporting=false;if(button.isConnected)button.disabled=false;}
 });
})();
