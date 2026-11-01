/* Original low-poly world, rendered locally with Three.js. No network assets. */
(()=>{
'use strict';
const places={
 treehouse:{name:'Casa sull’albero',icon:'🏡',tag:'IL TUO POSTO SPECIALE',description:'Scegli i colori della casa e arredala con le monete delle missioni.',goal:'Ogni risposta aggiunge un pezzetto alla tua casa.',category:'home',world:'creative',color:'#e79961'},
 pets:{name:'Rifugio degli animali',icon:'🐾',tag:'UN PICCOLO GRANDE AMICO',description:'Scegli un compagno e impara a conoscere gli animali in inglese.',goal:'Rispondi e riempi di cuori il rifugio.',category:'animals',world:'animals',color:'#39ae8b'},
 creative:{name:'Atelier dei colori',icon:'🎨',tag:'SPAZIO ALLA FANTASIA',description:'Scegli la tua tavolozza e dai colore alle parole.',goal:'Ogni risposta colora una parte della tua creazione.',category:'colors',world:'creative',color:'#b56be4'},
 kart:{name:'Circuito dei kart',icon:'🏎️',tag:'PRONTI ALLA PARTENZA?',description:'Personalizza il kart e fai un giro sul circuito delle parole.',goal:'Ogni risposta corretta fa avanzare il kart. Nessun cronometro.',category:'transport',world:'sport',color:'#efad35'},
 football:{name:'Stadio delle parole',icon:'⚽',tag:'SI GIOCA IN SQUADRA',description:'Scendi in campo: ascolta, trova la parola e tira in porta!',goal:'Ogni risposta corretta è un gol. Puoi sempre riprovare.',category:'sport',world:'sport',color:'#4baa56'},
 space:{name:'Base spaziale',icon:'🚀',tag:'DESTINAZIONE: LE STELLE',description:'Accendi i motori e parti alla scoperta di pianeti e parole.',goal:'Ogni risposta dà energia al razzo per il decollo.',category:'space',world:'space',color:'#6578de'},
 ocean:{name:'Baia dei tesori',icon:'🐠',tag:'SOTTO IL MARE',description:'Esplora la baia e incontra gli abitanti dell’oceano.',goal:'Ogni risposta ti avvicina al tesoro sommerso.',category:'ocean',world:'ocean',color:'#2d9fc5'},
 dino:{name:'Valle dei dinosauri',icon:'🦕',tag:'UNA SCOPERTA GIGANTE',description:'Segui le impronte e scopri una valle piena di sorprese.',goal:'Ogni risposta è una nuova impronta sul sentiero.',category:'dino',world:'dino',color:'#8ea747'}
};
// Feedback is cosmetic: progress and rewards still come from the learning APIs.
const reactions=new WeakMap();
const motionAllowed=()=>!matchMedia('(prefers-reduced-motion: reduce)').matches&&document.documentElement.dataset.animations!=='paused';
function clearFeedback(host){const old=reactions.get(host);if(old){clearTimeout(old.timer);old.node.remove();reactions.delete(host);}}
function feedback(host,type='success',kind='pets'){
 if(!host?.isConnected)return;
 clearFeedback(host);
 const labels={kart:'VIAAA! 🏁',football:'GOOOL! ⚽',space:'VERSO LE STELLE! 🚀',pets:'CHE FELICITÀ! 💗',creative:'CHE COLORI! 🎨',treehouse:'UN’ALTRA SCOPERTA! ✨',ocean:'TESORO IN VISTA! 🐚',dino:'GRANDE SCOPERTA! 🦕'};
 const node=document.createElement('div');node.className='sceneReaction '+(type==='retry'?'reactionRetry':type==='complete'?'reactionComplete':'');node.setAttribute('aria-hidden','true');
 node.textContent=type==='retry'?'Con calma, riproviamo 💡':type==='complete'?'AVVENTURA COMPLETATA! ✨':labels[kind]||'EVVIVA! ✨';
 host.append(node);reactions.set(host,{node,timer:setTimeout(()=>clearFeedback(host),2000)});
}
window.wordylandMotion={feedback,allowed:motionAllowed};
const actions={treehouse:{label:'Accendi le luci',message:'La tua casa si illumina! 🏡'},pets:{label:'Fallo saltare',message:'Un salto per te! 💗'},creative:{label:'Mescola i colori',message:'Una nuova combinazione! 🎨'},kart:{label:'TURBO! Tieni forte',message:'TURBO! 🏁'},football:{label:'Tira in porta!',message:'GOOOL! ⚽'},space:{label:'Lancia il razzo!',message:'3, 2, 1… VIA! 🚀'},ocean:{label:'Esplora il tesoro',message:'Trova conchiglia, pesce e perla per aprire il tesoro! 🐚'},dino:{label:'Chiama il dinosauro',message:'Eccomi! 🦕'}};
function showAction(host,kind){
 feedback(host,'success',kind);const node=reactions.get(host)?.node;if(node)node.textContent=actions[kind]?.message||'Si parte!';
}
const palette={sun:[0xffcb55,0xff806d,0x70cfc0],ocean:[0x58bfee,0x8c83eb,0x57d6bd],berry:[0xef87b7,0xac83ed,0xffce79],forest:[0x4fa978,0xb2d86c,0xdfa463],candy:[0xf29fc5,0x9e8ce8,0x8bdad0]};
// Small, finite games in the world itself. These never write learning/wallet state.
const toyColors=[['🔴','red','rosso',0xda6279,'orb'],['🔵','blue','blu',0x629dcd,'orb'],['🟡','yellow','giallo',0xffd36e,'orb']];
const toyGames={
 treehouse:{title:'Una casa piena di luci',verb:'Accendi la luce',items:toyColors},
 pets:{title:'Prenditi cura del tuo amico',verb:'Trova per il tuo amico',items:[['💧','water','acqua',0x629dcd,'drop'],['🥕','food','cibo',0xec9a53,'food'],['💗','friend','amico',0xda6279,'heart']]},
 creative:{title:'Dipingi il tuo piccolo mondo',verb:'Scegli il colore',items:toyColors},
 kart:{title:'Un giro tra i segnali',verb:'Guida fino al segnale',items:toyColors},
 football:{title:'Tre tiri in porta',verb:'Mira al bersaglio',items:toyColors},
 space:{title:'Un viaggio tra le stelle',verb:'Raggiungi',items:[['⭐','star','stella',0xffd36e,'star'],['🌙','moon','luna',0xd3d9e4,'moon'],['🪐','planet','pianeta',0xab9cd8,'planet']]},
 ocean:{title:'Cerca il tesoro della baia',verb:'Raccogli',items:[['🐚','shell','conchiglia',0xeba5b9,'shell'],['🐟','fish','pesce',0x629dcd,'fish'],['⚪','pearl','perla',0xfff4df,'orb']]},
 dino:{title:'Le sorprese dei dinosauri',verb:'Scopri',items:[['🥚','egg','uovo',0xf6d9a4,'egg'],['🍃','leaf','foglia',0x78b994,'leaf'],['🐾','footprint','impronta',0xb78b69,'foot']]}
};
function mountToy(panel,kind,handlers={}){
 const game=toyGames[kind];if(!panel||!game)return null;
 let disposed=false,step=0,order=[],found=new Set();
 const wrap=document.createElement('section');wrap.className='worldToy';wrap.dataset.toyKind=kind;wrap.setAttribute('aria-label',game.title);
 wrap.innerHTML='<h4>'+game.title+'</h4><p class="toyObjective"></p><div class="toyChoices">'+game.items.map(([icon,en,it,color],i)=>'<button type="button" data-toy-choice="'+i+'" style="--toy-color:#'+color.toString(16).padStart(6,'0')+'"><span aria-hidden="true">'+icon+'</span><b lang="en">'+en+'</b><small>'+it+'</small></button>').join('')+'</div><p class="toyStatus" role="status" aria-live="polite" aria-atomic="true"></p><p class="toyHelp"></p><button class="audio toyReplay" type="button" hidden>Rigioca nel mondo</button><button class="primary toyLearn" type="button" hidden>Continua con gli esercizi</button><small class="toyNote">Gioco libero · nessuna moneta spesa. I premi si conquistano negli esercizi. Uscendo da questa scena ricominci.</small>';
 panel.append(wrap);const buttons=[...wrap.querySelectorAll('[data-toy-choice]')],objective=wrap.querySelector('.toyObjective'),status=wrap.querySelector('.toyStatus'),replay=wrap.querySelector('.toyReplay');
 function describe(){wrap.dataset.toyStep=String(step);wrap.dataset.toyTarget=step<3?String(order[step]):'';objective.innerHTML=step===3?'✨ Hai completato la scoperta!':game.verb+' <strong lang="en">'+game.items[order[step]][1]+'</strong><small>'+game.items[order[step]][0]+' '+game.items[order[step]][2]+'</small>';buttons.forEach((b,i)=>{b.disabled=found.has(i);b.classList.toggle('toyFound',found.has(i));b.setAttribute('aria-label',(found.has(i)?'Trovato: ':'Scegli ')+game.items[i][1]+' · '+game.items[i][2]);});replay.hidden=step!==3;wrap.querySelector('.toyLearn').hidden=step!==3;}
 function reset(){if(disposed)return;step=0;found=new Set();order=[0,1,2];for(let i=2;i>0;i--){const j=Math.floor(Math.random()*(i+1));[order[i],order[j]]=[order[j],order[i]];}describe();status.textContent='0 / 3 scoperte. Puoi giocare con calma.';handlers.reset?.();}
 function choose(index){
  if(disposed||!Number.isInteger(index)||index<0||index>2||found.has(index)||step===3)return false;
  const correct=index===order[step],hadFocus=wrap.contains(document.activeElement);
  if(!correct){status.textContent='Hai scelto '+game.items[index][1]+' ('+game.items[index][2]+'). Cerca '+game.items[order[step]][1]+' ('+game.items[order[step]][2]+'): puoi riprovare.';handlers.choose?.(index,false,step);return false;}
  found.add(index);step++;describe();status.textContent=step===3?'3 / 3 · Scoperta completata! Puoi rigiocare o aprire la missione in inglese.':step+' / 3 · Trovato! Ora cerca il prossimo oggetto.';handlers.choose?.(index,true,step);
  if(hadFocus)(step===3?replay:buttons.find(b=>!b.disabled))?.focus({preventScroll:true});return true;
 }
 wrap.querySelector('.toyLearn').onclick=()=>{if(!disposed)window.dispatchEvent(new CustomEvent('wordyland-play-place',{detail:kind}));};buttons.forEach((b,i)=>b.onclick=()=>choose(i));replay.onclick=()=>{reset();buttons[0].focus({preventScroll:true});};
 function scene(available){wrap.querySelector('.toyHelp').textContent=available?'Tocca gli oggetti nella scena oppure usa i pulsanti.':'Scena 3D non disponibile: puoi giocare con i pulsanti.';}
 reset();scene(Boolean(handlers.scene));return {choose,scene,dispose(){disposed=true;wrap.remove();}};
}
function mount3D(host,options={}){
 if(!host)return {dispose(){},update(){},rotate(){}};
 let toy=null;
 function fallback(){
  host.dataset.render='fallback';
  let choices=null;
  if((options.kind||'island')==='island'&&options.onSelect){
   choices=document.createElement('nav');choices.className='islandFallbackChoices';choices.setAttribute('aria-label','Scegli un luogo nella mappa semplificata');
   Object.entries(places).forEach(([id,place])=>{const b=document.createElement('button');b.type='button';b.dataset.place=id;b.textContent=place.icon+' '+place.name;b.setAttribute('aria-pressed',String(id===options.selected));b.onclick=()=>options.onSelect(id);choices.append(b);});host.append(choices);
  }
  toy=mountToy(options.playground,options.kind,{choose:(_i,correct)=>feedback(host,correct?'success':'retry',options.kind)});
  return {dispose(){toy?.dispose();clearFeedback(host);choices?.remove();},action(){if(options.preview)showAction(host,options.kind);},react(type){feedback(host,type,options.kind);},update(next={}){if(next.selected)choices?.querySelectorAll('button').forEach(b=>b.setAttribute('aria-pressed',String(b.dataset.place===next.selected)));},rotate(){}};
 }
 const T=window.THREE;
 // Missing scene-only APIs must not prevent the games or the lightweight map.
 if(!T||!window.ResizeObserver||!window.IntersectionObserver)return fallback();
 let renderer;
 try{renderer=new T.WebGLRenderer({antialias:true,alpha:true,powerPreference:'low-power'});}catch{return fallback();}
 host.dataset.render='3d';
 const canvas=renderer.domElement;canvas.setAttribute('aria-hidden','true');canvas.className='islandCanvas';host.prepend(canvas);
 renderer.setPixelRatio(Math.min(devicePixelRatio||1,1.5));renderer.shadowMap.enabled=true;renderer.shadowMap.type=T.PCFSoftShadowMap;renderer.outputColorSpace=T.SRGBColorSpace;
 const scene=new T.Scene(),camera=new T.PerspectiveCamera(37,1,.1,180),root=new T.Group();scene.add(root);
 const ambient=new T.HemisphereLight(0xe2f8ff,0xa6b799,1.8);scene.add(ambient);
 const sun=new T.DirectionalLight(0xfff2df,2.2);sun.position.set(-8,18,12);sun.castShadow=true;sun.shadow.mapSize.set(1024,1024);Object.assign(sun.shadow.camera,{left:-17,right:17,top:17,bottom:-17,near:1,far:60});sun.shadow.bias=-.001;scene.add(sun);
 const materials=new Map(),geometries=new Set();let disposed=false,visible=true,frame=0,last=0,angle=-.32,zoom=.88,phase=0,startX=0,startY=0,dragging=false,moved=false,selected=options.selected||'treehouse';
 const motion=matchMedia('(prefers-reduced-motion: reduce)');
 const pins=[],animations=[],colliders=[],progressObjects=[],effects=[],toyTargets=[];
 let toyAim=0,toyStep=0,contextLost=false;
 let reactionAge=10,reactionKind='success',intro=0,interactedAt=0,actionAge=10,kartDistance=0,paintIndex=0,lightsOn=false;
 let paused=Boolean(options.paused)||document.documentElement.dataset.animations==='paused';
 const material=color=>{if(!materials.has(color))materials.set(color,new T.MeshStandardMaterial({color,roughness:.78,metalness:.03}));return materials.get(color);};
 function mesh(geometry,color,parent=root,x=0,y=0,z=0){geometries.add(geometry);const m=new T.Mesh(geometry,material(color));m.position.set(x,y,z);m.castShadow=true;m.receiveShadow=true;parent.add(m);return m;}
 const box=(w,h,d,c,p,x=0,y=0,z=0)=>mesh(new T.BoxGeometry(w,h,d),c,p,x,y,z);
 const sphere=(r,c,p,x=0,y=0,z=0,sx=1,sy=1,sz=1)=>{const m=mesh(new T.SphereGeometry(r,20,14),c,p,x,y,z);m.scale.set(sx,sy,sz);return m;};
 const cylinder=(rt,rb,h,c,p,x=0,y=0,z=0,n=24)=>mesh(new T.CylinderGeometry(rt,rb,h,n),c,p,x,y,z);
 const group=(p,x=0,y=0,z=0)=>{const g=new T.Group();g.position.set(x,y,z);p.add(g);return g;};
 function tree(p,x,z,s=1){const g=group(p,x,0,z);g.scale.setScalar(s);cylinder(.2,.3,2.2,0x9e7151,g,0,1,0,7);sphere(1.2,0x69bf91,g,0,2.6,0,1,1.1,1);sphere(.85,0x99d49b,g,-.6,2.4,.3);sphere(.75,0x55ab85,g,.6,2.45,.1);animations.push(t=>g.rotation.z=Math.sin(t*1.2+x)*.025);return g;}
 function animal(p,type='fox',x=0,y=0,z=0,scale=1){const g=group(p,x,y,z);g.userData.character=type;g.scale.setScalar(scale);const blinkers=[];const hatY=type==='robot'?2.1:type==='snowpal'?1.68:['elf-boy','elf-girl','santa','mrs-claus','nutcracker','gingerbread'].includes(type)?1.73:['polar-bear','yeti'].includes(type)?1.92:1.82;const decorate=()=>{if(type.startsWith('pet-'))return;if(options.equipped?.hat==='crown')cylinder(.27,.27,.2,0xffd16b,g,0,hatY,0,6);if(options.equipped?.hat==='cap'){sphere(.35,0x7dabe3,g,0,hatY-.14,.03,1,.5,.9);box(.45,.05,.35,0x7dabe3,g,0,hatY-.16,.35);}if(options.equipped?.hat==='hat-wizard'){cylinder(.48,.48,.06,0x8172c8,g,0,hatY-.1,0);cylinder(0,.33,.85,0x8172c8,g,0,hatY+.3,0,12);}if(options.equipped?.hat==='hat-flowers')for(let i=0;i<8;i++){const a=i*Math.PI/4;sphere(.11,i%2?0xffcf65:0xf293b8,g,Math.cos(a)*.32,hatY-.08,Math.sin(a)*.3);}if(options.equipped?.badge){const badge=cylinder(.16,.16,.055,options.equipped.badge==='badge-explorer'?0x6dbeb6:options.equipped.badge==='badge-persistence'?0xb997de:0xffce65,g,0,.65,.42,12);badge.rotation.x=Math.PI/2;badge.userData.reward=options.equipped.badge;if(options.equipped.badge.startsWith('souvenir-')){const gem=mesh(new T.OctahedronGeometry(.09),options.equipped.badge.includes('christmas')?0x75c6c8:options.equipped.badge.includes('easter')?0xe9a4c5:options.equipped.badge.includes('carnival')?0xaf91db:0xf0a35a,g,0,.65,.48);gem.userData.reward=options.equipped.badge;}}
// Festive meshes share the existing character transform and disposal lifecycle.
if(['hat-santa','hat-elf','hat-reindeer'].includes(options.equipped?.hat)){
 const id=options.equipped.hat,h=group(g,0,hatY-.08,0);h.userData.reward=id;
 if(id==='hat-reindeer'){
  const band=mesh(new T.TorusGeometry(.35,.055,6,16),0xbd794b,h);band.rotation.x=Math.PI/2;
  for(const sign of[-1,1]){const stem=cylinder(.035,.055,.6,0x9f6945,h,sign*.3,.27,0,6);stem.rotation.z=-sign*.25;for(let j=0;j<2;j++){const branch=cylinder(.025,.035,.22,0x9f6945,h,sign*(.4+j*.035),.2+j*.2,0,6);branch.rotation.z=-sign*.95;}}
 }else{const color=id==='hat-santa'?0xe84c60:0x309c74;cylinder(.38,.38,.14,0xfff4e7,h,0,0,0,16);const cone=cylinder(0,.33,.6,color,h,.04,.33,0,16);cone.rotation.z=-.22;sphere(.11,id==='hat-santa'?0xfff4e7:0xffd269,h,.11,.63,0);}
}
if(['neck-scarf','neck-ocean'].includes(options.equipped?.neck)){
 const scarf=group(g,0,.85,0);const scarfColor=options.equipped.neck==='neck-ocean'?0x4b9fca:0xd83c56;scarf.userData.reward=options.equipped.neck;const ring=mesh(new T.TorusGeometry(type==='octopus'?.56:.4,.085,6,20),scarfColor,scarf);ring.rotation.x=Math.PI/2;
 box(.15,.48,.08,scarfColor,scarf,.2,-.2,.42);for(let i=0;i<3;i++)box(.16,.045,.09,0xfff1df,scarf,.2,-.06-i*.13,.43);
}
if(options.equipped?.effect==='effect-snow')for(let i=0;i<6;i++){
 const flake=group(g,Math.cos(i*1.7)*.85,.4+i*.27,Math.sin(i*1.7)*.7);flake.userData.reward='effect-snow';
 for(let j=0;j<3;j++){const arm=box(.16,.022,.022,0xd3edf5,flake);arm.rotation.z=j*Math.PI/3;}
 animations.push(t=>{flake.position.y=.25+(2-(t*.22+i*.28)%2);});
}
if(['hat-snowman','hat-cookie','hat-gift'].includes(options.equipped?.hat)){
 const id=options.equipped.hat,h=group(g,0,hatY-.06,0);h.userData.reward=id;
 if(id==='hat-snowman'){cylinder(.4,.4,.07,0x6a8fc5,h);cylinder(.28,.28,.4,0x6a8fc5,h,0,.2,0,14);cylinder(.285,.285,.07,0xfff1d6,h,0,.07,0,14);}
 else if(id==='hat-cookie'){const cookie=cylinder(.36,.36,.14,0xc99a67,h,0,.13,0,16);cookie.rotation.x=Math.PI/2;for(let i=0;i<5;i++){const a=i*Math.PI*.4;sphere(.045,0x795246,h,Math.cos(a)*.21,.13+Math.sin(a)*.21,.09);}}
 else{box(.55,.4,.5,0xe85c79,h,0,.2,0);box(.12,.42,.52,0xffe5a6,h,0,.2,0);box(.57,.42,.1,0xffe5a6,h,0,.2,0);for(const sign of[-1,1]){const bow=mesh(new T.TorusGeometry(.12,.035,6,14),0xffe5a6,h,sign*.1,.47,0);bow.scale.y=.6;}}
}
if(options.equipped?.effect==='effect-stars')for(let i=0;i<5;i++){
 const sparkle=mesh(new T.OctahedronGeometry(.09),0xffd76a,g,Math.cos(i*1.25)*.85,.5+i*.25,Math.sin(i*1.25)*.7);sparkle.userData.reward='effect-stars';animations.push(t=>{sparkle.rotation.y=t*.5;});
}
if(['hat-leaf','hat-explorer'].includes(options.equipped?.hat)){
 const id=options.equipped.hat,h=group(g,0,hatY-.04,0);h.userData.reward=id;
 if(id==='hat-leaf'){const leaf=sphere(.48,0x69b98b,h,0,.09,0,1,.24,.8);leaf.rotation.z=.13;cylinder(.015,.015,.45,0xe0e7aa,h,0,.12,0,6).rotation.x=Math.PI/2;}
 else{cylinder(.43,.43,.06,0xe4c28c,h);cylinder(.27,.32,.3,0xe4c28c,h,0,.16,0,16);cylinder(.29,.32,.06,0x936d4b,h,0,.055,0,16);}
}
if(['effect-fireflies','effect-comets'].includes(options.equipped?.effect))for(let i=0;i<5;i++){
 const id=options.equipped.effect,glow=group(g,Math.cos(i*1.25)*.85,.45+i*.27,Math.sin(i*1.25)*.7);glow.userData.reward=id;sphere(.065,id==='effect-comets'?0x97d5e3:0xffd96d,glow);
 if(id==='effect-comets'){const tail=box(.035,.035,.22,0xc2e8ee,glow,0,0,-.12);tail.rotation.x=.4;}
 animations.push(t=>{glow.position.y=.45+i*.27+Math.sin(t*.7+i)*.07;});
}
if(options.equipped?.effect==='effect-bubbles')for(let i=0;i<4;i++){const bubble=sphere(.13,0xa9dfed,g,Math.cos(i*1.7)*.8,.5+i*.35,Math.sin(i*1.7)*.65);bubble.userData.reward='effect-bubbles';animations.push(t=>{bubble.position.y=.45+(t*.3+i*.35)%1.8;});}
if(options.equipped?.effect==='effect-rainbow')for(let i=0;i<3;i++){const ring=mesh(new T.TorusGeometry(.85+i*.09,.035,6,32),[0xf4a0b7,0xffd574,0x84d4bb][i],g,0,1,-.35);ring.userData.reward='effect-rainbow';}
};decorate();animations.push(t=>{const blink=Math.sin(t*1.4+x*2)>.993?.15:1;blinkers.forEach(e=>e.scale.y=blink);});
if(['elf-boy','elf-girl','santa','mrs-claus','nutcracker'].includes(type)){
 const elven=type.startsWith('elf-'),girl=type==='elf-girl',santa=type==='santa',grandma=type==='mrs-claus',toy=type==='nutcracker';g.userData.castFamily=elven?'elves':toy?'wooden-toy':'claus-family';
 const coat=toy?0x5478a9:grandma?0xb74d70:santa?0xd95164:girl?0xb28bca:0x4da383,skin=toy?0xe6bd88:girl?0xf1c3a9:santa||grandma?0xf3c8ad:0xdcb18b;
 if(santa)sphere(.43,coat,g,0,.61,0,1,1.1,.8);else cylinder(grandma||girl?.22:.27,grandma||girl?.44:.31,.72,coat,g,0,.64,0,16);
 box(.62,.08,.12,toy?0xe4bf6c:0x715848,g,0,.51,.25);box(.13,.11,.05,0xffd26f,g,0,.51,.33);
 for(const sign of[-1,1]){box(.14,.32,.14,toy?0xe9c56f:0xb79cbf,g,sign*.15,.2,0);sphere(.14,toy?0x506d91:0x74594d,g,sign*.15,.07,.08,1,.5,1.4);const sleeve=cylinder(.075,.085,.4,coat,g,sign*.34,.7,0,8);sleeve.rotation.z=-sign*.25;sphere(.09,skin,g,sign*.39,.48,.015);}
 sphere(.34,skin,g,0,1.25,0,1,.98,.85);sphere(.055,skin,g,0,1.18,.3,1,.8,1.2);
 if(elven)for(const sign of[-1,1])sphere(.13,skin,g,sign*.37,1.32,0,1.5,.55,.65);
 for(const sign of[-1,1]){blinkers.push(sphere(.045,0x344557,g,sign*.12,1.3,.28));sphere(.045,0xf1a5a2,g,sign*.2,1.18,.25,1,.6,.3);}
 if(santa){sphere(.29,0xfff4e8,g,0,1.06,.27,1,.8,.5);for(const sign of[-1,1])sphere(.13,0xfff4e8,g,sign*.08,1.18,.31,1.2,.45,.5);}
 if(grandma){sphere(.35,0xeee9e2,g,0,1.36,-.11,1,1,.55);sphere(.19,0xeee9e2,g,0,1.65,-.13);for(const sign of[-1,1])mesh(new T.TorusGeometry(.075,.013,6,16),0xb4935c,g,sign*.12,1.29,.31);box(.1,.02,.02,0xb4935c,g,0,1.29,.31);}
 if(girl)for(const sign of[-1,1])sphere(.1,0x9a6c53,g,sign*.27,1.08,-.12,.8,1.8,.7);
 if(toy){for(let i=0;i<3;i++)sphere(.025,0xf9d36f,g,0,.65+i*.11,.28);const drum=cylinder(.23,.23,.2,0xeac57a,g,0,.63,.37,16);drum.rotation.x=Math.PI/2;drum.userData.detail='toy-drum';for(const sign of[-1,1]){const stick=box(.025,.3,.025,0xb38a5d,g,sign*.13,.88,.4);stick.rotation.z=sign*.45;}}
 if(!options.equipped?.hat&&!grandma){
  const head=group(g,0,1.58,0);head.userData.detail='native-festive-hat';
  if(toy){cylinder(.28,.28,.4,0x5478a9,head,0,.2,0,16);cylinder(.3,.3,.06,0xeac57a,head);sphere(.06,0xeac57a,head,0,.36,.27);}
  else{const color=santa?0xd95164:girl?0xb28bca:0x4da383;const cone=cylinder(0,.3,.6,color,head,.04,.3,0,16);cone.rotation.z=-.15;cylinder(.31,.31,.1,0xfff4df,head);sphere(.08,0xffdf8b,head,.08,.6,0);}
 }
 return g;
}
if(type==='polar-bear'||type==='yeti'){
 const yeti=type==='yeti',fur=yeti?0xe5f1ee:0xf3f8f4;g.userData.castFamily=yeti?'friendly-yeti':'polar-bear';sphere(.54,fur,g,0,.55,0,1,1,.8);sphere(.57,fur,g,0,1.22,0,1,.98,.88);sphere(.27,0xe1ecea,g,0,1.08,.43,1,.65,.4);sphere(.075,yeti?0x99bbcb:0x35495e,g,0,1.12,.56,1.2,.8,.6);
 for(const sign of[-1,1]){sphere(.22,fur,g,sign*.4,1.66,0,1,.9,.6);blinkers.push(sphere(.06,0x344557,g,sign*.2,1.3,.47));sphere(.16,fur,g,sign*.47,.54,0,.8,1.5,.8);sphere(.19,0xd5e4e1,g,sign*.28,.13,.22,1,.6,1.25);if(yeti){cylinder(0,.1,.2,0xa9cabc,g,sign*.29,1.83,0,10);sphere(.12,fur,g,sign*.48,.85,0);}}
 return g;
}
if(type==='gingerbread'){
 g.userData.castFamily='gingerbread';const dough=0xbe8b5a,icing=0xfff0d8;box(.52,.6,.18,dough,g,0,.7,0);const head=cylinder(.35,.35,.18,dough,g,0,1.3,0,24);head.rotation.x=Math.PI/2;
 for(const sign of[-1,1]){const arm=cylinder(.11,.11,.52,dough,g,sign*.36,.82,0,12);arm.rotation.z=-sign*.85;sphere(.12,dough,g,sign*.55,.98,0,1,1,.8);const leg=cylinder(.12,.12,.45,dough,g,sign*.17,.22,0,12);leg.rotation.z=sign*.2;sphere(.13,dough,g,sign*.21,.06,0,1,.8,.8);sphere(.06,icing,g,sign*.12,1.36,.1);blinkers.push(sphere(.026,0x6b4c3c,g,sign*.12,1.36,.155));box(.15,.04,.025,icing,g,sign*.18,.2,.13);}
 const smile=mesh(new T.TorusGeometry(.13,.02,6,18,Math.PI),icing,g,0,1.2,.11);smile.rotation.z=Math.PI;for(let i=0;i<3;i++)sphere(.045,[0xd67985,0x83b89e,0xd67985][i],g,0,.53+i*.16,.12);box(.5,.035,.025,icing,g,0,.91,.11);return g;
}
if(type==='pet-turtle'){sphere(.7,0x69ab88,g,0,.65,0,1,.65,1.2);sphere(.32,0xafd08b,g,0,.53,.8);for(const x of[-.48,.48])for(const z of[-.48,.48])sphere(.19,0xafd08b,g,x,.2,z,1,.6,1);for(const x of[-.12,.12])sphere(.045,0x253e47,g,x,.64,1.05);return g;}
if(type==='pet-penguin'||type==='penguin'){sphere(.58,0x344b63,g,0,.65,0,1,1.2,.8);sphere(.43,0xfff6e7,g,0,.58,.3,1,1.2,.3);sphere(.42,0x344b63,g,0,1.33,0);for(const x of[-.15,.15]){sphere(.05,0x223644,g,x,1.4,.37);sphere(.19,0xf4bf70,g,x,.09,.2,1,.5,1.5);}cylinder(0,.15,.3,0xf4bf70,g,0,1.2,.43,4).rotation.x=Math.PI/2;return g;}
if(type==='snowpal'){
 sphere(.5,0xf4faf8,g,0,.5,0,1,1,.9);sphere(.35,0xf4faf8,g,0,1.25,0);for(const sign of[-1,1]){blinkers.push(sphere(.045,0x334b60,g,sign*.12,1.3,.31));const arm=cylinder(.025,.035,.55,0x916b50,g,sign*.54,.8,0,6);arm.rotation.z=-sign*.9;}const nose=cylinder(0,.075,.3,0xf0a24e,g,0,1.2,.4,6);nose.rotation.x=Math.PI/2;for(let i=0;i<3;i++)sphere(.045,0x334b60,g,0,.4+i*.2,.45);return g;
}
if(type==='reindeer'||type==='silver-reindeer'){
 const silver=type==='silver-reindeer',fur=silver?0xc1d2df:0xb88865,antler=silver?0xcbb989:0x8b6549;g.userData.castFamily='reindeer';
 sphere(.45,fur,g,0,.48,0,.9,1.05,.8);sphere(.55,fur,g,0,1.14,0,1,1,.85);sphere(.29,silver?0xe9f0f5:0xe0bc93,g,0,1,.43,1,.7,.7);sphere(.09,silver?0x83adc7:0xd85061,g,0,1.04,.66);
 for(const sign of[-1,1]){sphere(.18,fur,g,sign*.43,1.6,0,1.5,.7,.5);blinkers.push(sphere(.065,0x334b60,g,sign*.22,1.26,.45));sphere(.14,0x785747,g,sign*.27,.12,.15,1,.7,1.3);const stem=cylinder(.035,.05,.6,antler,g,sign*.26,1.9,-.03,7);stem.rotation.z=-sign*.25;for(let j=0;j<2;j++){const twig=cylinder(.025,.03,.2,antler,g,sign*(.35+j*.04),1.86+j*.18,-.03,6);twig.rotation.z=-sign*.9;}}return g;
}
if(type==='robot'){box(.8,.7,.55,0xa7beca,g,0,.55,0);box(1,.75,.65,0xcbdce0,g,0,1.25,0);box(.78,.36,.06,0x3e5a70,g,0,1.3,.36);for(const sign of[-1,1]){sphere(.075,0x8be4e4,g,sign*.22,1.32,.42);box(.2,.5,.3,0x7796ab,g,sign*.58,.62,0);box(.23,.25,.35,0x7796ab,g,sign*.23,.11,.05);}cylinder(.03,.03,.3,0x869fae,g,0,1.75,0);sphere(.1,0xf5ac9c,g,0,1.95,0);return g;}
if(type==='octopus'){sphere(.64,0xc39bd6,g,0,1,0,1,1.2,1);for(let i=0;i<8;i++){const a=i*Math.PI/4;sphere(.19,0xc39bd6,g,Math.sin(a)*.6,.25,Math.cos(a)*.6,1,.7,1.8);}for(const sign of[-1,1]){sphere(.09,0x33455b,g,sign*.23,1.15,.57);sphere(.025,0xffffff,g,sign*.21,1.18,.64);}return g;}
if(type==='lion')sphere(.75,0xb77d43,g,0,1.18,-.05,1.1,1,.7);
if(type==='dragon'){for(const sign of[-1,1]){const wing=box(.65,.65,.12,0xb7d99e,g,sign*.62,.75,-.18);wing.rotation.z=-sign*.6;cylinder(0,.1,.4,0xffdda1,g,sign*.3,1.82,0,8);}}
const bunny=type.includes('bunny'),cat=type.includes('cat'),panda=type==='panda';const fur=panda?0xe7edf2:type==='koala'?0xa8b5bd:cat?0xb6addb:bunny?0xf8d4de:type==='dragon'?0x89bd96:type==='lion'?0xefbf65:0xef9854; sphere(.48,fur,g,0,.47,0,.9,1.05,.75);sphere(.6,fur,g,0,1.15,.02,1,1,.86);sphere(.4,0xfff6e9,g,0,.94,.42,1,.65,.35);for(const sign of[-1,1]){const ear=sphere(bunny?.17:type==='koala'?.29:.23,fur,g,sign*.35,bunny?1.98:1.67,0,bunny?1:.8,bunny?2.7:type==='koala'?1:1.35,.55);ear.rotation.z=-sign*.23;animations.push(t=>ear.rotation.z=-sign*.23+Math.sin(t*2+sign)*.055);blinkers.push(sphere(.075,0x24314c,g,sign*.23,1.22,.49));sphere(.023,0xffffff,g,sign*.21,1.25,.55);sphere(.13,0xf2ad9c,g,sign*.37,.99,.45,1,.6,.25);sphere(.15,fur,g,sign*.35,.14,.2,1,.7,1.3);if(panda)sphere(.19,0x334052,g,sign*.23,1.22,.43,1,1.3,.4);}sphere(type==='koala'?.12:.07,0x503a51,g,0,1.02,.59,1,type==='koala'?1.25:.7,.6);if(!bunny&&!panda&&type!=='koala'){const tail=sphere(.35,fur,g,.45,.45,-.35,1,1.4,1);tail.rotation.z=-.7;}return g;}
 function kart(p,x=0,z=0,color=0x55c5dd){color=({'kart-blue':0x55c5dd,'kart-pink':0xf193a9,'kart-mint':0x75d4a9,'kart-gold':0xffca57,'kart-purple':0xa48be0,'kart-christmas':0xd83c56,'kart-leaf':0x56a381})[options.equipped?.kart]||color;const g=group(p,x,0,z);g.userData.reward=options.equipped?.kart;if(options.equipped?.kart==='kart-christmas'){box(1.38,.08,.16,0xffeac7,g,0,.75,-.7);box(.13,.08,1.4,0xffeac7,g,0,.75,-.3);}box(1.35,.35,2,color,g,0,.55,0);sphere(.7,color,g,0,.7,-.5,1,.45,1);box(.8,.5,.6,0x243653,g,0,.85,.3);for(const sign of[-1,1])for(const zz of[-.55,.65]){const tire=cylinder(.3,.3,.25,0x26364c,g,sign*.75,.35,zz,18);tire.rotation.z=Math.PI/2;const hub=cylinder(.14,.14,.27,0xb8d2e2,g,sign*.75,.35,zz,12);hub.rotation.z=Math.PI/2;}const driver=animal(g,options.equipped?.avatar||'fox',0,.83,.12,.5);driver.rotation.y=Math.PI;box(1.2,.12,.25,0xffe6a2,g,0,.9,1.05);return g;}
 function rocket(p,x=0,z=0){const g=group(p,x,0,z);g.userData.reward=options.equipped?.rocket;const rocketColor=({'rocket-mint':0x8cd8be,'rocket-galaxy':0x9c83dd,'rocket-christmas':0xc99a67,'rocket-ocean':0x4b9fca})[options.equipped?.rocket]||0xf7efe9;cylinder(.48,.48,2,rocketColor,g,0,1.45,0);cylinder(0,.49,.85,0xf58c96,g,0,2.86,0);cylinder(.58,.38,.4,0x6777d8,g,0,.35,0);sphere(.25,0x7ccfee,g,0,1.8,.41,1,1,.3);for(const sign of[-1,1]){const fin=box(.17,.75,.75,0x9c9bea,g,sign*.5,.65,0);fin.rotation.z=-sign*.3;}const flame=sphere(.3,0xffbf57,g,0,-.05,0,1,1.5,1);return {g,flame};}
 function football(p){const g=group(p);box(4.8,.08,6.3,0x62bb91,g,0,.04,0);for(const xx of[-2.2,2.2])box(.04,.02,5.8,0xe9fff0,g,xx,.1,0);for(const zz of[-2.85,0,2.85])box(4.4,.02,.04,0xe9fff0,g,0,.1,zz);const ring=mesh(new T.TorusGeometry(.65,.025,6,28),0xe9fff0,g,0,.11,0);ring.rotation.x=Math.PI/2;for(const xx of[-1.15,1.15])box(.1,1.2,.1,0xfffaf0,g,xx,.6,-2.5);box(2.4,.1,.1,0xfffaf0,g,0,1.2,-2.5);for(let i=0;i<9;i++)box(.025,1.1,.025,0xd9eae9,g,-1.1+i*.275,.58,-2.8);for(let i=0;i<5;i++)box(2.3,.025,.025,0xd9eae9,g,0,.1+i*.27,-2.8);const ball=group(g,0,.28,1.7);ball.userData.reward=options.equipped?.ball;sphere(.24,({'ball-sun':0xffc15c,'ball-ocean':0x65b9e9})[options.equipped?.ball]||0xffffff,ball);for(let i=0;i<6;i++){const a=i*Math.PI/3;sphere(.075,0x263d50,ball,Math.sin(a)*.2,Math.cos(a)*.2,.12,1,1,.45);}return {g,ball};}
 function house(p,preview=false){const g=group(p);const room=options.equipped?.room||'room-sky',wall=room==='room-peach'?0xffc6b0:room==='room-mint'?0xb7dfbb:room==='room-lavender'?0xc8b6e8:room==='room-sunset'?0xf3b080:0xb8dcef;g.userData.reward=room;box(3.8,.18,3,0xc89b72,g,0,.2,0);box(3.8,2.1,.12,wall,g,0,1.3,-1.5);box(.12,2.1,3,wall,g,-1.9,1.3,0);g.userData.window=box(1,.8,.1,0x63a8ce,g,.6,1.45,-1.4);box(1.1,.05,.15,0xfff4d5,g,.6,1.85,-1.3);box(.05,.9,.15,0xfff4d5,g,.6,1.45,-1.3);box(1.4,.45,.7,0xf8ae99,g,-.9,.55,-.8);box(1.4,.8,.2,0xffceb6,g,-.9,1,-1.1);cylinder(.48,.48,.13,0xfff3da,g,.45,.65,.3);cylinder(.08,.08,.5,0xb58768,g,.45,.4,.3);if(options.equipped?.rug)box(1.8,.04,1.1,0xa9b0e9,g,0,.32,.55);if(options.equipped?.plant){cylinder(.21,.15,.4,0xf7ad8b,g,1.35,.5,-.9);sphere(.38,0x70b893,g,1.35,.99,-.9,.8,1.3,.8);}if(options.equipped?.lamp){cylinder(.035,.05,1.2,0xe0b66a,g,-1.35,.9,1);cylinder(.17,.32,.4,0xffe8a6,g,-1.35,1.6,1);}if(options.equipped?.trophy){const trophy=group(g,-.8,.65,.65),id=options.equipped.trophy;trophy.scale.setScalar(1.3);trophy.userData.reward=id;cylinder(.25,.3,.12,0xdec383,trophy);if(id==='trophy-book'){box(.65,.1,.45,0xdb8c8f,trophy,0,.25,0);box(.6,.09,.4,0xfff5dc,trophy,0,.35,0);box(.025,.12,.42,0xc7a57b,trophy,0,.36,0);}else if(id==='trophy-moon'){const moon=new T.Shape();moon.moveTo(.12,.42);moon.quadraticCurveTo(-.65,.2,-.2,-.4);moon.quadraticCurveTo(.1,-.65,.42,-.2);moon.quadraticCurveTo(-.1,-.35,.12,.42);mesh(new T.ExtrudeGeometry(moon,{depth:.08,bevelEnabled:false}),0xffd77f,trophy,0,.7,0);}else if(id==='trophy-garden'){box(.65,.25,.42,0xc89c75,trophy,0,.25,0);for(let i=0;i<3;i++){cylinder(.02,.02,.45,0x6dad85,trophy,-.22+i*.22,.55,0,6);sphere(.13,[0xf0a7b8,0xe9ce80,0xb49bce][i],trophy,-.22+i*.22,.8,0);}}else if(id==='trophy-tree'){for(let j=0;j<3;j++)cylinder(0,.42-j*.1,.48,0x369574,trophy,0,.35+j*.28,0,10);sphere(.09,0xffd269,trophy,0,1.2,0);for(let j=0;j<6;j++){const a=j*Math.PI/3;sphere(.055,j%2?0xffd269:0xe84c60,trophy,Math.cos(a)*.24,.4+(j%3)*.18,Math.sin(a)*.24);}}else if(id==='trophy-flower'){cylinder(.035,.035,.9,0x74b990,trophy,0,.5,0);for(let i=0;i<8;i++){const a=i*Math.PI/4;sphere(.17,0xffd46d,trophy,Math.cos(a)*.28,1+Math.sin(a)*.28,0);}sphere(.18,0xb98b55,trophy,0,1,.05);}else if(id==='trophy-crystal'){const jewel=mesh(new T.OctahedronGeometry(.48),0x7bcde0,trophy,0,.62,0);jewel.rotation.z=.2;}else{cylinder(.045,.045,.35,0xe3b756,trophy,0,.27,0);const outline=new T.Shape();for(let i=0;i<10;i++){const a=i*Math.PI/5+Math.PI/2,r=i%2?.18:.42;if(i===0)outline.moveTo(Math.cos(a)*r,Math.sin(a)*r);else outline.lineTo(Math.cos(a)*r,Math.sin(a)*r);}outline.closePath();mesh(new T.ExtrudeGeometry(outline,{depth:.12,bevelEnabled:false}),0xffd267,trophy,0,.7,0);}}
if(!preview){cylinder(.38,.55,3,0x996947,g,0,-1.3,0,8);sphere(2.3,0x75bf96,g,-.5,3,-1,1,.55,.8);const roof=cylinder(0,3,1.2,0xf1b880,g,0,2.8,0,4);roof.rotation.y=Math.PI/4;}return g;}
 function creative(p){const g=group(p);g.userData.reward=options.equipped?.palette;const colors=palette[(options.equipped?.palette||'paint-sun').slice(6)]||palette.sun;box(3.1,.18,2,0xf4c599,g,0,.9,0);for(const xx of[-1.2,1.2])for(const zz of[-.7,.7])box(.12,.9,.12,0xbf8b69,g,xx,.45,zz);const paper=box(1.4,.04,1.3,0xfffaf0,g,0,1.02,0);for(let i=0;i<3;i++)sphere(.23,colors[i],g,-.42+i*.42,1.08,0,1,.15,1);for(let i=0;i<3;i++)cylinder(.16,.16,.4,colors[i],g,-1+i*.45,1.2,-.6);return {g,paper};}
 function dino(p){const g=group(p);sphere(.85,0x85bb88,g,0,.7,0,1.3,.8,.6);cylinder(.27,.38,1.6,0x85bb88,g,.7,1.6,0);sphere(.42,0x85bb88,g,.9,2.35,.12,1.3,1,.8);for(const xx of[-.5,.5])for(const zz of[-.3,.3])cylinder(.16,.2,.6,0x78aa7f,g,xx,.25,zz,10);sphere(.06,0x2e4850,g,1.17,2.5,.39);const tail=cylinder(0,.32,1.5,0x85bb88,g,-1.35,.6,0,10);tail.rotation.z=-1.2;return g;}
 function location(id,x,z,model){const g=group(root,x,.55,z);g.userData.place=id;model(g);colliders.push(g);
const count=Number(options.adventures?.[id])||0;
if(count>=1){cylinder(.035,.035,1.8,0xb8a27d,g,1.6,.9,.8,8);box(.65,.4,.05,0xffd577,g,1.9,1.5,.8);}
if(count>=3){sphere(.18,0xffdca0,g,-1.2,1.6,1);cylinder(.025,.025,1.5,0xa69a7a,g,-1.2,.8,1,8);}
if(count>=5){sphere(.33,0xf2b7cd,g,1.6,3.8,.8,1,1.3,1);cylinder(.015,.015,2.6,0xc9b2a4,g,1.6,2.2,.8,6);}
if(count>=10){cylinder(.28,.32,.25,0xe7bd65,g,-1.5,.2,.4,10);sphere(.3,0xffd574,g,-1.5,.6,.4,1,1.3,.6);}
const pin=document.createElement('button');pin.type='button';pin.className='islandPin';pin.dataset.place=id;pin.innerHTML='<span>'+places[id].icon+'</span><b>'+places[id].name+'</b>';pin.style.setProperty('--pin',places[id].color);pin.setAttribute('aria-label','Esplora: '+places[id].name);pin.onclick=()=>options.onSelect?.(id);host.append(pin);pins.push({pin,point:new T.Vector3(x,3.9,z),id});return g;}
 const kind=options.kind||'island';let model,ball,flame,progress=Number(options.progress)||0,currentProgress=progress,kick=progress===1?1:0,kickTarget=kick;
 if(kind==='island'){
  camera.position.set(17,19,24);camera.lookAt(0,0,0);
  cylinder(10.7,10.2,.8,0x9bd6a6,root,0,0,0,64);cylinder(10.2,7,2,0xcca783,root,0,-1.4,0,14);cylinder(7,2,2,0xb8977c,root,0,-3.2,0,12);
  const water=cylinder(90,90,.1,0x8fbcc8,scene,0,-5,0,64);water.receiveShadow=false;
  // Little paths connect places without hiding or locking any activity.
  for(const [x,z,r] of[[-3,0,-.4],[2,-2,.7],[1,4,0]]){const path=box(1.1,.05,8,0xf9e5b5,root,x,.45,z);path.rotation.y=r;}
  location('treehouse',-5,-3,g=>{house(g).scale.setScalar(.85);});
  location('pets',-5,3,g=>{cylinder(2,2,.12,0xb7e0b0,g);const a=animal(g,options.equipped?.pet||'pet-fox',0,0,.2,.95);animations.push(t=>{a.rotation.y=Math.sin(t*.8)*.35;a.position.y=Math.max(0,Math.sin(t*1.7))*.2;});box(1.3,1.2,.2,0xd6b5dc,g,0,.6,-1.2);cylinder(0,1.2,.6,0xf5bdca,g,0,1.5,-1.1,4);});
  location('creative',-.5,-5.8,g=>{creative(g).g.scale.setScalar(.9);sphere(.75,0xd5b4ef,g,1.8,.75,0);});
  location('football',5,1.5,g=>{const f=football(g);f.g.scale.setScalar(.85);animations.push(t=>{const u=(t*.23)%1;f.ball.position.z=1.7-u*4.1;f.ball.position.y=.28+Math.sin(u*Math.PI)*.65;f.ball.rotation.x=-u*10;});});
  location('kart',.3,5.6,g=>{const track=mesh(new T.TorusGeometry(2.3,.55,4,48),0x7696ad,g,0,.08,0);track.rotation.x=Math.PI/2;const k=kart(g,0,0);k.scale.setScalar(.65);animations.push(t=>{k.position.set(Math.sin(t*.8)*2.3,.12,Math.cos(t*.8)*2.3);k.rotation.y=t*.8+Math.PI/2;});});
  location('space',5.2,-5,g=>{cylinder(1.7,1.8,.2,0x96a5d3,g);const r=rocket(g);flame=r.flame;animations.push(t=>{r.g.position.y=.16+Math.sin(t*1.7)*.15;r.g.rotation.z=Math.sin(t*.8)*.035;});});
  location('ocean',-8,0,g=>{cylinder(1.5,1.7,.2,0x72cada,g);box(1.6,.1,.7,0xe4ba86,g,0,.2,0);const fish=sphere(.38,0xffc96f,g,0,.65,0,1.4,.7,.7);animations.push(t=>{fish.position.x=Math.sin(t)*.65;fish.position.y=.65+Math.sin(t*2)*.13;fish.rotation.y=Math.cos(t)*.4;});});
  location('dino',.1,-.3,g=>{const d=dino(g);d.scale.setScalar(.8);animations.push(t=>{d.rotation.y=Math.sin(t*.6)*.3;d.position.y=Math.max(0,Math.sin(t))* .09;});});
  for(const [x,z,s]of[[-7,-5,1],[-7,5,.8],[7,5,.85],[2,-8,.8],[-2,8,.7],[8,-2,.7]])tree(root,x,z,s);
  for(const[x,y,z,s]of[[-11,6,-10,1],[11,5,-8,.8],[-9,6,9,.7]]){const c=group(scene,x,y,z);sphere(1.3,0xffffff,c,0,0,0,1.6,.6,.9);sphere(.9,0xffffff,c,.9,.2,0);c.scale.setScalar(s);animations.push(t=>{c.position.x=x+Math.sin(t*.18+z)*1.8;c.position.y=y+Math.sin(t*.4+z)*.18;});}
  for(let i=0;i<3;i++){const bird=group(scene);const wingA=box(.55,.07,.17,0xfff5db,bird,-.22,0,0),wingB=box(.55,.07,.17,0xfff5db,bird,.22,0,0);animations.push(t=>{const a=t*.24+i*2;bird.position.set(Math.sin(a)*12,5.5+Math.sin(t+i)*.4,Math.cos(a)*10);bird.rotation.y=a;wingA.rotation.z=Math.sin(t*5+i)*.5;wingB.rotation.z=-wingA.rotation.z;});}
  for(let i=0;i<4;i++){const ring=mesh(new T.TorusGeometry(1+i*.65,.025,4,48),0xc3e9e8,scene,-11+i*7,-4.9,10-i*5);ring.rotation.x=Math.PI/2;animations.push(t=>ring.scale.setScalar(1+Math.sin(t*.8+i)*.12));}
 }else{
  camera.position.set(7,6.5,9);camera.lookAt(0,.7,0);
  cylinder(4.5,4.2,.4,kind==='holiday'&&options.holiday==='christmas'?0xe4f0ee:kind==='space'?0xb8b6df:kind==='ocean'?0x88d1e0:0xc3e0c2,root,0,-.25,0,48);
  if(kind==='holiday'){
   const theme=options.holiday||'christmas',village=group(root);village.userData.holiday=theme;model=village;
   const elf=theme==='christmas'&&options.elf?.active?options.elf:null,prank=elf&&!options.elfResolved?elf.prank?.id:null;
   const colors=theme==='christmas'?[0xc74f60,0x498e73]:theme==='carnival'?[0xb785dc,0xf4b74c]:theme==='easter'?[0xf2b8c9,0xa8cfa6]:[0xc58546,0x8071af];
   for(const [i,x,z]of[[0,-1.7,-.5],[1,1.6,-.9]]){
    const home=group(village,x,0,z);box(1.25,1.15,1.15,colors[i],home,0,.58,0);const roof=cylinder(0,1.05,.65,theme==='christmas'?0xfff5e8:colors[1-i],home,0,1.47,0,4);roof.rotation.y=Math.PI/4;
    box(.3,.65,.06,0x785750,home,0,.33,.6);for(const sign of[-1,1]){box(.22,.25,.07,0xffe5a5,home,sign*.38,.77,.6);box(.025,.27,.09,0xfff5df,home,sign*.38,.77,.65);}
    for(let j=0;j<5;j++)sphere(.045,[0xffd36e,0xef86a4,0xa4dfca][j%3],home,-.5+j*.25,1.1,.64);
   }
   if(theme==='christmas'){
    const fir=group(village,0,0,-1.4);for(let j=0;j<3;j++)cylinder(0,.75-j*.16,.85,0x369574,fir,0,.5+j*.47,0,12);sphere(.14,0xffd269,fir,0,1.93,0);
    for(let j=0;j<8;j++){const a=j*Math.PI/4;sphere(.08,j%2?0xffd269:0xe84c60,fir,Math.cos(a)*.46,.6+(j%3)*.22,Math.sin(a)*.46);}
    const snowman=group(village,-1.2,0,1.3);sphere(.38,0xfff9ef,snowman,0,.38,0);sphere(.26,0xfff9ef,snowman,0,.9,0);for(const x of[-.09,.09])sphere(.028,0x344b63,snowman,x,.95,.23);cylinder(0,.06,.2,0xf0aa59,snowman,0,.86,.32,6).rotation.x=Math.PI/2;
    if(prank==='moustache'){const whiskers=group(snowman,0,.86,.26);whiskers.userData.elfPrank='moustache';for(const sign of[-1,1]){const curl=sphere(.085,0x79564d,whiskers,sign*.065,0,0,1.4,.45,.45);curl.rotation.z=sign*.25;}}
    for(let i=0;i<10;i++){const flake=sphere(.035,prank==='colors'?[0xf4b6d0,0xaad8e7,0xf9d988][i%3]:0xffffff,village,Math.sin(i*2.4)*2.8,.4+i*.25,Math.cos(i*2.4)*2.2);flake.userData.elfSnow=true;animations.push(t=>{flake.position.y=.3+(3-(t*.18+i*.3)%3);});}
   }else for(let i=0;i<5;i++){
    const x=-1.2+i*.6,z=.6+(i%2)*.4;
    if(theme==='carnival'){const flag=box(.35,.4,.04,[0xe89bac,0xffd269,0xa3d9cd][i%3],village,x,1.8,z);flag.rotation.z=.15*(i%2?1:-1);}
    else if(theme==='easter')sphere(.22,colors[i%2],village,x,.28,z,1,1.4,1);
    else{sphere(.28,0xeea34e,village,x,.28,z,1,.8,1);box(.06,.13,.06,0x698862,village,x,.55,z);}
   }
   if(elf){
    const e=group(village,-.25,0,.35);e.userData.character='elf-prankster';e.userData.elfDay=elf.day;
    cylinder(.23,.32,.6,0x3b9a78,e,0,.6,0,12);sphere(.26,0xffd6b5,e,0,1.18,0);for(const sign of[-1,1]){sphere(.11,0xffd6b5,e,sign*.3,1.2,0,1.4,.6,.6);sphere(.035,0x344b60,e,sign*.09,1.23,.24);box(.12,.28,.12,0xe995a5,e,sign*.12,.19,0);sphere(.11,0x8a6350,e,sign*.12,.055,.08,1,.55,1.4);}
    cylinder(0,.3,.5,0x3b9a78,e,.04,1.65,0,12).rotation.z=-.17;sphere(.07,0xffd77b,e,.08,1.91,0);cylinder(.3,.3,.07,0xfff4de,e,0,1.41,0,12);box(.47,.075,.13,0xe995a5,e,0,.88,.2);
    const arm=group(e,.23,.86,0);cylinder(.055,.07,.35,0x3b9a78,arm,.12,.1,0,8).rotation.z=-.7;sphere(.07,0xffd6b5,arm,.23,.25,0);animations.push(t=>{arm.rotation.z=.1+Math.sin(t*1.4)*.12;});
    if(elf.prank?.id==='sign'){const post=group(village,.85,0,.55);cylinder(.03,.03,.7,0xa27c58,post,0,.35,0,6);const sign=group(post,0,.9,0);sign.userData.elfPrank='sign';sign.rotation.z=prank==='sign'?Math.PI:0;box(.65,.32,.06,0xdfbf88,sign);cylinder(0,.12,.2,0x499879,sign,0,.25,0,3);}
   }
   for(let i=0;i<3;i++){const gift=group(village,-.4+(prank==='packages'?[1,2,0][i]:i)*.5,0,prank==='packages'?1.3+(i%2)*.35:1.5);gift.userData.elfPrank=prank==='packages'?'packages':null;box(.34,.32,.34,[0xd85d74,0xa89cd3,0x78bdb1][i],gift,0,.16,0);box(.07,.33,.35,0xffe9bd,gift,0,.17,0);box(.35,.33,.07,0xffe9bd,gift,0,.17,0);}
  }
  if(kind==='treehouse'){model=house(root,true);model.position.y=.05;for(let i=0;i<3;i++){const b=box(.45,.45,.45,[0xf3bc85,0xb5c4e9,0xa3d4af][i],root,1.25,.5+i*.46,.75);progressObjects.push(b);}}
  if(kind==='pets'){model=animal(root,options.equipped?.pet||'pet-fox',0,0,0,1.5);for(let i=0;i<3;i++){const h=group(root,-1+i,2.8,.1);sphere(.16,0xf3a5bd,h,-.1,0,0);sphere(.16,0xf3a5bd,h,.1,0,0);const point=box(.24,.24,.18,0xf3a5bd,h,0,-.12,0);point.rotation.z=Math.PI/4;progressObjects.push(h);}}
  if(kind==='kart'){const road=mesh(new T.TorusGeometry(2.5,.55,4,48),0x8399b0,root,0,.04,0);road.rotation.x=Math.PI/2;const kc=options.equipped?.kart;model=kart(root,0,0,kc==='kart-pink'?0xf193a9:kc==='kart-mint'?0x75d4a9:0x55c5dd);}
  if(kind==='football'){const f=football(root);ball=f.ball;model=f.g;}
  if(kind==='space'){const r=rocket(root);model=r.g;flame=r.flame;for(let i=0;i<7;i++){const star=sphere(.13,0xffdf8c,root,Math.sin(i*2.4)*3,1+i*.45,Math.cos(i*2.4)*2);star.scale.y=1.4;}}
  if(kind==='creative'){model=creative(root).g;const colors=palette[(options.equipped?.palette||'paint-sun').slice(6)]||palette.sun;for(let i=0;i<3;i++)progressObjects.push(sphere(.42,colors[i],root,-1.4+i*1.4,1.8,-.2,1,.35,1));}
  if(kind==='dino'){model=dino(root);for(let i=0;i<3;i++)progressObjects.push(sphere(.24,0xc29b7b,root,-1+i,.02,1.5,1,.12,1.5));}
  if(kind==='ocean'){for(let i=0;i<3;i++)progressObjects.push(sphere(.18,0xffd875,root,-.6+i*.6,1.5,0));model=group(root);box(1.3,.6,.8,0xd2a45f,model,0,.4,0);const lid=group(model,0,.65,-.4);box(1.4,.16,.9,0xedc273,lid,0,0,.4);model.userData.lid=lid;sphere(.3,0xffd875,root,-1.7,1.2,.3,1.6,.7,.6);}
  if(kind==='space')for(let i=0;i<3;i++){const panel=box(.7,.08,1.2,0x7287c5,root,-2+i*2,.5,2);progressObjects.push(panel);}
  if(model&&kind!=='football')animations.push(t=>{
   if(kind==='pets'||kind==='dino'){model.rotation.y=Math.sin(t*.8)*.35;model.position.y=Math.max(0,Math.sin(t*1.8))*.15;}
   if(kind==='creative')model.rotation.y=Math.sin(t*.5)*.06;
  });
 }
 if(kind!=='island'&&kind!=='kart'&&!(kind==='pets'&&options.preview)){const player=animal(root,options.equipped?.avatar||'fox',2.25,0,1.2,.8);animations.push(t=>{player.rotation.y=Math.sin(t*.8)*.18;player.position.y=Math.max(0,Math.sin(t*1.8))*.12;});}
 if(options.playground&&toyGames[kind])toyGames[kind].items.forEach((entry,i)=>{
  const [, , ,color,shape]=entry,angle=(i-1)*1.35;
  const target=group(root,kind==='football'?(i-1)*.8:kind==='kart'?Math.sin(angle)*2.5:(i-1)*2.1,kind==='football'?.72:.8,kind==='football'?-2.48:kind==='kart'?Math.cos(angle)*2.5:2.1);
  target.userData.toyIndex=i;target.userData.toyKind=kind;toyTargets.push(target);
  const base=cylinder(.46,.46,.1,0xfff4df,target,0,-.36,0,20);base.userData.toyBase=true;
  if(shape==='heart'){sphere(.2,color,target,-.12,.09,0);sphere(.2,color,target,.12,.09,0);box(.29,.29,.22,color,target,0,-.06,0).rotation.z=Math.PI/4;}
  else if(shape==='food'){cylinder(0,.18,.65,color,target,0,0,0,10).rotation.z=Math.PI;box(.08,.2,.08,0x78b994,target,0,.37,0);}
  else if(shape==='star'){const outline=new T.Shape();for(let j=0;j<10;j++){const a=j*Math.PI/5+Math.PI/2,r=j%2?.18:.38;if(j===0)outline.moveTo(Math.cos(a)*r,Math.sin(a)*r);else outline.lineTo(Math.cos(a)*r,Math.sin(a)*r);}outline.closePath();mesh(new T.ExtrudeGeometry(outline,{depth:.12,bevelEnabled:false}),color,target);}
  else if(shape==='planet'){sphere(.3,color,target);const ring=mesh(new T.TorusGeometry(.42,.045,6,20),0xffd36e,target);ring.rotation.x=1.15;}
  else if(shape==='fish'){sphere(.3,color,target,0,0,0,1.35,.7,.6);cylinder(0,.22,.3,color,target,-.4,0,0,3).rotation.z=Math.PI/2;sphere(.035,0x193e55,target,.2,.07,.16);}
  else if(shape==='leaf'){sphere(.35,color,target,0,0,0,.6,1,.2).rotation.z=-.5;box(.025,.4,.025,0xfff4df,target,0,-.05,.08).rotation.z=-.5;}
  else if(shape==='foot'){sphere(.26,color,target,0,-.07,0,.8,1,.35);for(let j=0;j<3;j++)sphere(.085,color,target,-.18+j*.18,.22,0,1,1,.6);}
  else sphere(.3,color,target,0,0,0,shape==='shell'?1.25:1,shape==='egg'||shape==='drop'?1.4:1,shape==='shell'?.45:1);
 });
 // Reuse a small effect pool instead of allocating geometry on every answer.
 for(let i=0;i<12;i++){const particle=sphere(.065,[0xffcf75,0xf6aaca,0x91d9cd][i%3],root);particle.visible=false;particle.castShadow=false;effects.push(particle);}
 const initialCamera=camera.position.clone();
 function render(now=0){
  frame=0;if(disposed)return;
  const dt=last?Math.min(.06,(now-last)/1000):0;last=now;
  const moving=!motion.matches&&!paused;
  if(moving){phase+=dt;actionAge+=dt;intro=Math.min(1,intro+dt*1.6);reactionAge+=dt;}
  else{intro=1;reactionAge=10;}
  kick=moving?Math.min(kickTarget,kick+dt*1.8):kickTarget;
  currentProgress=moving?currentProgress+(progress-currentProgress)*Math.min(1,dt*5):progress;
  if(Math.abs(progress-currentProgress)<.001)currentProgress=progress;
  const pulse=moving&&reactionKind!=='retry'?Math.max(0,1-reactionAge/1.4):0;
  progressObjects.forEach((o,i)=>{o.visible=options.progress===undefined||(options.preview&&paintIndex>0)||currentProgress>=(i+1)/3-.01;});
  root.rotation.y=angle+(kind==='island'&&moving&&now-interactedAt>3500?Math.sin(phase*.3)*.24:0);
  root.position.y=kind==='island'&&moving?Math.sin(phase*.7)*.16:0;
  if(moving)animations.forEach(fn=>fn(phase));
  if(options.preview&&moving&&!toy)kartDistance+=dt*(actionAge<2.3?5.5:.65);
  if(kind==='kart'&&model){const a=options.preview?kartDistance:-currentProgress*Math.PI*1.7;model.position.set(Math.sin(a)*2.5,.13+(moving?Math.sin(phase*18)*.015:0),Math.cos(a)*2.5);model.rotation.y=a+Math.PI/2;model.rotation.z=moving?Math.sin(phase*2)*.035:0;}
  if(kind==='football'&&ball){const u=kick;ball.position.x=toy?toyAim*u:0;ball.position.z=1.7-u*4.1;ball.rotation.x=-u*9;ball.position.y=.28+Math.sin(u*Math.PI)*.65;}
  if(kind==='space'&&model&&toy)model.position.x=toyAim;
  if(kind==='space'&&model){model.position.y=(options.preview&&actionAge<3.2?(moving?Math.min(7,Math.max(0,actionAge-.35)**2*3):4):currentProgress*2.8)+(moving?Math.sin(phase*1.7)*.13:0)+pulse*.5;model.rotation.z=moving?Math.sin(phase*1.2)*.025:0;}
  if(kind==='pets'&&model&&pulse>0){model.position.y=Math.abs(Math.sin(reactionAge*9))*pulse*.65;model.rotation.z=Math.sin(reactionAge*11)*pulse*.1;}
  if(kind==='dino'&&model){model.rotation.z=pulse*Math.sin(reactionAge*7)*.08;if(pulse>0)model.position.y=Math.abs(Math.sin(reactionAge*7))*pulse*.55;}
  if(kind==='creative'&&model&&actionAge<1.2&&moving)model.rotation.y=Math.sin(actionAge*6)*.15;
  if(kind==='ocean'&&model?.userData.lid)model.userData.lid.rotation.x=options.preview&&(toy?toyStep===3:paintIndex>0)?-(moving?Math.min(1,actionAge*2):1)*1.2:0;
  if(kind==='treehouse'&&model)model.rotation.y=moving?Math.sin(phase*.5)*.04:0;
  effects.forEach((o,i)=>{o.visible=pulse>0;if(o.visible){const a=i*Math.PI/6;o.position.set(Math.cos(a)*(1-pulse)*3,1.1+(1-pulse)*2.3+Math.sin(a)*.3,Math.sin(a)*(1-pulse)*3);o.scale.setScalar(pulse*1.8);}});
  if(flame)flame.scale.y=moving?1.3+Math.sin(phase*8)*.35+pulse:1;
  const introEase=1-Math.pow(1-intro,3);
  camera.position.copy(initialCamera).multiplyScalar(zoom*(1+(1-introEase)*.13)-pulse*.015);camera.lookAt(0,kind==='island'?0:kind==='space'&&options.preview&&actionAge<3.2?1.3:.7,0);
  renderer.render(scene,camera);
  for(const {pin,point,id}of pins){const v=point.clone().applyMatrix4(root.matrixWorld).project(camera);pin.style.left='clamp(var(--pin-x-inset,34px),'+(v.x*.5+.5)*100+'%,calc(100% - var(--pin-x-inset,34px)))';pin.style.top='clamp(var(--pin-y-inset,34px),'+(-v.y*.5+.5)*100+'%,calc(100% - var(--pin-y-inset,34px)))';pin.setAttribute('aria-pressed',String(selected===id));}
  if(moving&&visible&&!document.hidden)frame=requestAnimationFrame(tick);
 }
 function tick(now){frame=0;if(disposed||!visible||document.hidden)return;if(now-last>=32)render(now);else frame=requestAnimationFrame(tick);}
 function requestDraw(){if(!frame&&!disposed&&!contextLost)frame=requestAnimationFrame(render);}
 function resize(){const w=host.clientWidth,h=host.clientHeight;if(!w||!h)return;renderer.setSize(w,h,false);camera.aspect=w/h;camera.updateProjectionMatrix();requestDraw();}
 // Pin labels grow on selection/focus. Measure only when their size changes,
 // keeping their full touch target and focus ring inside the clipped map.
 const ro=new ResizeObserver(entries=>{let hostChanged=false;for(const entry of entries){if(entry.target===host){hostChanged=true;continue;}const box=Array.isArray(entry.borderBoxSize)?entry.borderBoxSize[0]:entry.borderBoxSize;entry.target.style.setProperty('--pin-x-inset',((box?.inlineSize||entry.target.offsetWidth)/2+12)+'px');entry.target.style.setProperty('--pin-y-inset',((box?.blockSize||entry.target.offsetHeight)/2+12)+'px');}if(hostChanged)resize();});ro.observe(host);pins.forEach(({pin})=>ro.observe(pin));
 const io=new IntersectionObserver(entries=>{visible=entries[0].isIntersecting;if(visible)requestDraw();else{cancelAnimationFrame(frame);frame=0;last=0;}},{rootMargin:'80px'});io.observe(host);
 const onVisibility=()=>{if(document.hidden){cancelAnimationFrame(frame);frame=0;last=0;}else if(visible)requestDraw();};document.addEventListener('visibilitychange',onVisibility);
 const onMotion=()=>{cancelAnimationFrame(frame);frame=0;requestDraw();};motion.addEventListener('change',onMotion);
 const onPause=e=>{paused=Boolean(e.detail);cancelAnimationFrame(frame);frame=0;requestDraw();};window.addEventListener('wordyland-motion',onPause);
 const onDown=e=>{interactedAt=performance.now();startX=e.clientX;startY=e.clientY;dragging=true;moved=false;};
 const onMove=e=>{if(!dragging)return;const dx=e.clientX-startX,dy=e.clientY-startY;if(Math.abs(dx)>5&&Math.abs(dx)>Math.abs(dy)){angle+=dx*.006;startX=e.clientX;startY=e.clientY;moved=true;requestDraw();}};
 const ray=new T.Raycaster();
 const onUp=e=>{if(!dragging)return;dragging=false;if(moved)return;const r=canvas.getBoundingClientRect();ray.setFromCamera(new T.Vector2((e.clientX-r.left)/r.width*2-1,-(e.clientY-r.top)/r.height*2+1),camera);if(toy){const hit=ray.intersectObjects(toyTargets.filter(t=>t.visible),true)[0];if(hit){let o=hit.object;while(o&&o.userData.toyIndex===undefined)o=o.parent;if(o)toy.choose(o.userData.toyIndex);}return;}if(kind!=='island'){if(options.preview)control.action();return;}const hit=ray.intersectObjects(colliders,true)[0];if(hit){let o=hit.object;while(o&&!o.userData.place)o=o.parent;if(o)options.onSelect?.(o.userData.place);}};
 canvas.addEventListener('pointerdown',onDown);canvas.addEventListener('pointermove',onMove);canvas.addEventListener('pointerup',onUp);canvas.addEventListener('pointercancel',()=>dragging=false);canvas.addEventListener('pointerleave',()=>dragging=false);
 const onLost=e=>{e.preventDefault();contextLost=true;host.dataset.render='fallback';toy?.scene(false);cancelAnimationFrame(frame);frame=0;};canvas.addEventListener('webglcontextlost',onLost);
 resize();
 const control={action(){
 if(!options.preview)return;
 actionAge=0;reactionAge=0;reactionKind='success';paintIndex++;showAction(host,kind);
 if(motion.matches||paused){if(kind==='kart')kartDistance+=Math.PI*.7;if(model&&['pets','dino'].includes(kind))model.rotation.y+=.5;}
 if(kind==='football'){kick=0;kickTarget=1;if(motion.matches||paused)kick=1;}
 if(kind==='treehouse'&&model?.userData.window){lightsOn=!lightsOn;model.userData.window.material=material(lightsOn?0xffdc78:0x63a8ce);}
 if(kind==='creative')progressObjects.forEach((o,i)=>o.material=material(palette[['sun','ocean','berry'][paintIndex%3]][i%3]));
 requestDraw();
 },react(type='success'){reactionAge=0;reactionKind=type;feedback(host,type,kind);requestDraw();},update(next={}){if(Number.isFinite(next.progress)){if(next.progress>progress&&kind==='football'){kick=0;kickTarget=1;}progress=Math.max(0,Math.min(1,next.progress));}if(next.selected)selected=next.selected;if(typeof next.paused==='boolean')paused=next.paused;requestDraw();},rotate(delta){interactedAt=performance.now();angle+=delta;requestDraw();},zoom(delta){zoom=Math.max(.75,Math.min(1.4,zoom+delta));requestDraw();},dispose(){if(disposed)return;disposed=true;toy?.dispose();clearFeedback(host);cancelAnimationFrame(frame);ro.disconnect();io.disconnect();removed.disconnect();document.removeEventListener('visibilitychange',onVisibility);motion.removeEventListener('change',onMotion);window.removeEventListener('wordyland-motion',onPause);for(const g of geometries)g.dispose();for(const m of materials.values())m.dispose();canvas.removeEventListener('webglcontextlost',onLost);renderer.dispose();renderer.forceContextLoss();canvas.remove();pins.forEach(x=>x.pin.remove());}};
 if(options.playground&&ball)ball.userData.toyBall=true;
toy=mountToy(options.playground,kind,{scene:true,reset(){
  toyStep=0;toyAim=0;kartDistance=0;kick=0;kickTarget=0;paintIndex=0;progress=0;actionAge=10;reactionAge=10;
  toyTargets.forEach(t=>{t.visible=true;t.userData.found=false;});
  if(model){model.userData.toyStep=0;if(['pets','dino'].includes(kind)){model.position.y=0;model.rotation.z=0;}if(kind==='treehouse'&&model.userData.window)model.userData.window.material=material(0x63a8ce);}
  requestDraw();
 },choose(index,correct,step){
  if(!correct){control.react('retry');return;}
  control.action();toyStep=step;progress=step/3;toyTargets[index].visible=false;toyTargets[index].userData.found=true;
  if(model)model.userData.toyStep=step;
  if(kind==='kart')kartDistance=(index-1)*1.35;
  if(kind==='football')toyAim=(index-1)*.8;
  if(kind==='space')toyAim=(index-1)*2.1;
  if(kind==='treehouse'&&model?.userData.window)model.userData.window.material=material(toyGames[kind].items[index][3]);
  if(kind==='creative')progressObjects.forEach(o=>o.material=material(toyGames[kind].items[index][3]));
  requestDraw();
 }});
 const removed=new MutationObserver(()=>{if(!host.isConnected)control.dispose();});removed.observe(document.body,{childList:true,subtree:true});
 return control;
}
// Default scenes reuse the exact public illustrations shown in the cards.
const illustratedArt={worlds:'island-places.webp?v=caee87979db0',holidays:'holiday-worlds.png?v=286124dff4a8',circuits:'race-circuits.webp?v=34b59b21f510'};
const worldCells={treehouse:[0,0],pets:[1,0],creative:[2,0],kart:[3,0],football:[0,1],space:[1,1],ocean:[2,1],dino:[3,1]};
const holidayCells={christmas:[0,0],carnival:[1,0],easter:[0,1],halloween:[1,1]};
const actorIds=['fox','panda','robot','dragon','octopus','lion','reindeer','penguin','snowpal','bunny','koala','elf-boy','elf-girl','polar-bear','gingerbread','silver-reindeer','mrs-claus','santa','nutcracker','yeti'];
let sceneStyle='illustrated';try{if(localStorage.getItem('wordylandSceneStyle')==='3d')sceneStyle='3d';}catch{}
function illustratedView(host,options={}){
 const art=options.artwork,circuit=art?.source==='race-circuits.webp?v=34b59b21f510'&&art.columns===3&&art.rows===2&&Array.isArray(art.cell)&&art.cell.length===2&&art.cell.every(Number.isInteger)&&art.cell[0]>=0&&art.cell[0]<3&&art.cell[1]>=0&&art.cell[1]<2;
 const kind=options.kind||'pets',event=options.holiday||'christmas',isHoliday=kind==='holiday',cell=circuit?art.cell:isHoliday?(holidayCells[event]||holidayCells.christmas):(worldCells[kind]||worldCells.pets),columns=circuit?3:isHoliday?2:4,rows=2,cellHeight=isHoliday&&!circuit?50:100;
 const layer=document.createElement('div');layer.className='illustratedLayer';layer.dataset.illustratedWorld=isHoliday?event:kind;layer.setAttribute('aria-label',isHoliday?'Villaggio illustrato':places[kind]?.name||'Mondo illustrato');
 layer.classList.toggle('illustratedPaused',Boolean(options.paused));host.prepend(layer);host.classList.add('illustratedScene');if(options.playground)host.classList.add('illustratedPlayable');host.dataset.render='illustrated';host.dataset.artReady='loading';
 const ns='http://www.w3.org/2000/svg',svg=document.createElementNS(ns,'svg'),image=document.createElementNS(ns,'image');svg.classList.add('illustratedArt');svg.setAttribute('viewBox',cell[0]*100+' '+cell[1]*cellHeight+' 100 '+cellHeight);svg.setAttribute('preserveAspectRatio','xMidYMid slice');svg.setAttribute('aria-hidden','true');image.setAttribute('width',columns*100);image.setAttribute('height',rows*cellHeight);image.setAttribute('preserveAspectRatio','none');const artURL=circuit?illustratedArt.circuits:isHoliday?illustratedArt.holidays:illustratedArt.worlds;image.setAttribute('href',artURL);layer.dataset.artSource=artURL;svg.append(image);layer.append(svg);
 const loading=document.createElement('p');loading.className='illustratedLoading';loading.setAttribute('role','status');loading.textContent='Apriamo l’illustrazione…';layer.append(loading);let disposed=false;
 image.addEventListener('load',()=>{if(!disposed){host.dataset.artReady='ready';loading.remove();}});image.addEventListener('error',()=>{if(!disposed){host.dataset.artReady='error';loading.textContent='Illustrazione non caricata. Puoi continuare con i comandi.';}});
 let progress=Number(options.progress)||0,pan=0,zoom=1,toy=null;
 const eq=options.equipped||{},rawActor=kind==='pets'&&options.preview?(eq.pet||eq.avatar||'fox'):(eq.avatar||'fox'),actorId=actorIds.includes(rawActor)?rawActor:rawActor==='pet-bunny'?'bunny':rawActor==='pet-penguin'?'penguin':rawActor==='pet-fox'?'fox':null;
 const actor=document.createElement('div');actor.className='illustratedActor';actor.dataset.character=rawActor;actor.setAttribute('role','img');actor.setAttribute('aria-label',({fox:'Volpe esploratrice',panda:'Panda delle stelle',robot:'Robot inventore',dragon:'Drago delle parole',octopus:'Polpo creativo',lion:'Leone coraggioso'})[rawActor]||window.wordylandRewardExtras?.find(i=>i.id===rawActor)?.name||'Il tuo compagno');
 if(actorId){const portrait=document.createElement('span');portrait.className='racerModel';portrait.dataset.racer=actorId;portrait.setAttribute('aria-hidden','true');actor.append(portrait);}else{actor.classList.add('illustratedCompanion');actor.textContent=rawActor==='pet-cat'?'🐱':rawActor==='pet-turtle'?'🐢':'🐾';}
 layer.append(actor);
 const accessories=document.createElement('div');accessories.className='illustratedAccessories';
 for(const slot of ['hat','neck','effect']){const id=eq[slot];if(!id||id==='neck-none')continue;const item=window.wordylandRewardExtras?.find(i=>i.id===id),icon=item?.icon||({cap:'🧢',crown:'👑',sparkles:'✨',flight:'🪽',confetti:'🎉'})[id];if(icon){const badge=document.createElement('span');badge.dataset.reward=id;badge.setAttribute('role','img');badge.setAttribute('aria-label',item?.name||id);badge.title=item?.name||id;badge.textContent=icon;accessories.append(badge);}}
 actor.append(accessories);
 const roomItems=['room','plant','rug','lamp','trophy','kart','palette','ball','rocket'].map(slot=>eq[slot]).filter(Boolean);
 if(roomItems.length){const strip=document.createElement('div');strip.className='illustratedDecor';strip.setAttribute('aria-label','Le tue personalizzazioni');roomItems.forEach(id=>{const item=window.wordylandRewardExtras?.find(i=>i.id===id),icon=item?.icon||({plant:'🪴',rug:'🟪',lamp:'💡','room-sky':'🩵','room-mint':'🟩','room-peach':'🟠','kart-blue':'🏎️','kart-pink':'🏎️','kart-mint':'🏎️'})[id];if(icon){const b=document.createElement('span');b.dataset.reward=id;b.title=item?.name||id;b.textContent=icon;strip.append(b);}});layer.append(strip);}
 const targets=[],points=kind==='ocean'?[[23,83],[60,75],[20,49]]:kind==='football'?[[28,39],[50,36],[72,39]]:kind==='space'?[[24,24],[70,32],[75,66]]:[[23,61],[50,47],[76,66]];
 if(options.playground&&toyGames[kind])toyGames[kind].items.forEach(([icon,en,it],i)=>{const b=document.createElement('button');b.type='button';b.className='illustratedTarget';b.dataset.illustratedTarget=i;b.style.left=points[i][0]+'%';b.style.top=points[i][1]+'%';b.setAttribute('aria-label','Scegli '+en+' · '+it);b.innerHTML='<span aria-hidden="true">'+icon+'</span><b lang="en">'+en+'</b>';layer.append(b);targets.push(b);b.onclick=()=>toy?.choose(i);b.addEventListener('pointerup',e=>{if(e.pointerType==='touch'){e.preventDefault();toy?.choose(i);}});});
 if(isHoliday&&event==='christmas'){
  const snowman=document.createElement('div');snowman.className='illustratedSnowman';snowman.innerHTML='<span class="racerModel" data-racer="snowpal" aria-label="Pupazzo del villaggio" role="img"></span>';layer.append(snowman);
  const elf=options.elf?.active?options.elf:null,prank=elf&&!options.elfResolved?elf.prank?.id:null;
  if(elf){const visitor=document.createElement('div');visitor.className='illustratedVisitor';visitor.dataset.visitor='elf-prankster';visitor.innerHTML='<span class="racerModel" data-racer="elf-boy" aria-hidden="true"></span><b>Birillo</b>';visitor.setAttribute('aria-label','Birillo, l’elfo birichino');layer.append(visitor);}
  if(prank==='moustache'){const moustache=document.createElement('span');moustache.className='illustratedMoustache';moustache.dataset.elfPrank='moustache';snowman.append(moustache);}
  if(prank==='sign'){const sign=document.createElement('span');sign.className='illustratedSign';sign.dataset.elfPrank='sign';sign.textContent='KOOB';layer.append(sign);}else if(elf?.prank?.id==='sign'){const sign=document.createElement('span');sign.className='illustratedSign';sign.textContent='BOOK';layer.append(sign);}
  if(prank==='packages'){const packages=document.createElement('span');packages.className='illustratedPackages';packages.dataset.elfPrank='packages';packages.textContent='🎁 T · 🎁 C · 🎁 A';layer.append(packages);}
  if(prank==='colors'){const snow=document.createElement('span');snow.className='illustratedPastelSnow';snow.dataset.elfPrank='colors';snow.setAttribute('aria-label','La neve colorata da Birillo');layer.append(snow);}
 }
 function position(p){progress=Math.max(0,Math.min(1,p));host.dataset.sceneProgress=String(progress);actor.style.left=(isHoliday?50:kind==='space'?70-progress*40:kind==='kart'?18+progress*62:80-progress*60)+'%';actor.style.top=(isHoliday?82:kind==='space'?77-progress*45:kind==='kart'?72-Math.sin(progress*Math.PI)*22:77)+'%';if(options.playground){actor.style.left=(kind==='ocean'?80:46)+'%';actor.style.top=(kind==='ocean'?35:84)+'%';}}
 position(progress);if(kind==='pets'&&options.preview&&!options.playground){actor.classList.add('illustratedPortrait');actor.style.left='50%';actor.style.top='44%';}
 function action(){
  if(disposed)return;
  clearTimeout(action.timer);action.node?.remove();action.count=(action.count||0)+1;
  showAction(host,kind);layer.classList.remove('illustratedReact');void layer.offsetWidth;layer.classList.add('illustratedReact');
  const visual=document.createElement('div');visual.className='illustratedWorldAction';visual.dataset.actionKind=kind;visual.dataset.actionState='active';visual.dataset.motion=String(motionAllowed()&&!layer.classList.contains('illustratedPaused'));
  const vector=(classes,body,viewBox='0 0 140 100')=>'<svg class="'+classes+'" viewBox="'+viewBox+'" aria-hidden="true" focusable="false">'+body+'</svg>';
  const ball=vector('actionBall','<circle cx="50" cy="50" r="45" fill="#fffdf0" stroke="#253955" stroke-width="5"/><path d="M50 27 72 43 64 69H36L28 43Z" fill="#253955"/><path d="m17 20 13 23-15 19M83 20 70 43l15 19M18 82l18-13M82 82 64 69M50 4v23" fill="none" stroke="#253955" stroke-width="5"/>','0 0 100 100');
  let label='';
  if(kind==='football'){
   visual.innerHTML=vector('actionGoal','<path d="M15 90V15h110v75M15 15l20 20h70l20-20M35 35v55m70-55v55M15 60h110M15 90h110M50 15v75m40-75v75" fill="none" stroke="#fffdf2" stroke-width="5"/><path d="M15 90V15h110v75" fill="none" stroke="#245975" stroke-width="3"/>')+ball;label='Il pallone è in porta!';
  }else if(kind==='kart'){
   visual.innerHTML=vector('actionKart','<path class="actionFlame" d="M28 53 1 41l13 19L1 77l33-9" fill="#ffcf54" stroke="#f08940" stroke-width="4"/><path d="M28 48h74l23 16v16H19V62Z" fill="'+(eq.kart==='kart-pink'?'#ef8eb6':eq.kart==='kart-mint'?'#67c7a1':'#52acd8')+'" stroke="#253955" stroke-width="5"/><path d="M51 48V26h35l15 22" fill="#e3f4f6" stroke="#253955" stroke-width="5"/><path d="M37 60h55" stroke="#fffdf0" stroke-width="7"/><g class="actionWheel"><circle cx="41" cy="80" r="14" fill="#253955"/><circle cx="41" cy="80" r="6" fill="#e5f1ed"/></g><g class="actionWheel"><circle cx="103" cy="80" r="14" fill="#253955"/><circle cx="103" cy="80" r="6" fill="#e5f1ed"/></g>');label='Il kart ha fatto un’accelerata!';
  }else if(kind==='space'){
   visual.innerHTML=vector('actionRocket','<path class="actionFlame" d="m39 107 16 47 17-47" fill="#ffcf54" stroke="#f08a48" stroke-width="4"/><path d="M34 78 12 119l25-7m40-34 22 41-25-7" fill="#dd7791" stroke="#253955" stroke-width="4"/><path d="M55 5Q20 39 33 108h44Q90 39 55 5Z" fill="#fff5df" stroke="#253955" stroke-width="5"/><path d="M55 5Q39 18 34 37h42Q71 18 55 5Z" fill="#dd7791"/><circle cx="55" cy="62" r="14" fill="#75c9df" stroke="#253955" stroke-width="5"/>','0 0 110 160');label='Il razzo è decollato!';
  }else if(kind==='treehouse'){
   visual.innerHTML=vector('actionHouseLights','<path d="M15 43 70 5l55 38v50H15Z" fill="#9d6549" stroke="#543d35" stroke-width="5"/><path d="M4 43 70 0l66 43" fill="none" stroke="#fff4d8" stroke-width="7"/><rect x="29" y="49" width="30" height="30" rx="5" fill="#ffdc68"/><rect x="81" y="49" width="30" height="30" rx="5" fill="#ffdc68"/><path d="M44 49v30m52-30v30M29 64h30m22 0h30" stroke="#8e5c42" stroke-width="4"/>');label='Le finestre della casa sono illuminate!';
  }else if(kind==='creative'){
   const colors=action.count%3===1?['#f6c755','#ec7794','#70c6bd']:action.count%3===2?['#67bedf','#9b88de','#ed9b77']:['#8bc77c','#e9b95d','#ce8bbd'];
   visual.innerHTML=vector('actionPainting','<rect x="10" y="9" width="120" height="83" rx="8" fill="#fff9e7" stroke="#8c694f" stroke-width="5"/><path class="actionPaintStroke" d="m29 37 58-7" stroke="'+colors[0]+'" stroke-width="17" stroke-linecap="round"/><path class="actionPaintStroke" d="m38 57 63-6" stroke="'+colors[1]+'" stroke-width="17" stroke-linecap="round"/><path class="actionPaintStroke" d="m29 76 56-4" stroke="'+colors[2]+'" stroke-width="17" stroke-linecap="round"/>');label='Hai mescolato una nuova tavolozza!';
  }else if(kind==='pets'){
   visual.innerHTML=vector('actionPetHearts','<path d="M70 85 21 43C-4 14 36-6 70 24c34-30 74-10 49 19Z" fill="#ef92b6" stroke="#fff5e4" stroke-width="6"/>');label='Il tuo amico ha fatto un salto!';
  }else if(kind==='dino'){
   visual.innerHTML=vector('actionDinosaur','<path d="M15 70Q1 72 5 50l15 7Q35 23 66 44l12-27Q79 1 98 6l28 10-3 21-25 1-8 28 21 20H88L75 72H53L42 89H24l7-25" fill="#82bd82" stroke="#285655" stroke-width="5" stroke-linejoin="round"/><circle cx="107" cy="19" r="4" fill="#253955"/><path d="m39 37 5-12 12 10m12 6 9-12" fill="#f3cb6e" stroke="#285655" stroke-width="3"/>');label='Il dinosauro è arrivato a salutarti!';
  }else if(kind==='ocean'){
   const opened=Number(host.dataset.sceneProgress)>=1;visual.dataset.chestOpen=String(opened);
   visual.innerHTML=vector('actionChest','<path class="actionChestLid" d="M19 47V26Q70-7 121 26v21Z" fill="#b87d43" stroke="#5c4534" stroke-width="5"/><path d="M18 46h104v43H18Z" fill="#b87d43" stroke="#5c4534" stroke-width="5"/><path d="M37 17v72m66-72v72" stroke="#f6d371" stroke-width="9"/><rect x="60" y="45" width="20" height="22" rx="4" fill="#f7d777"/><g class="actionTreasure" fill="#ffe57f" stroke="#fff8cc" stroke-width="2"><path d="m47 15 3 8 8 3-8 3-3 8-3-8-8-3 8-3Z"/><path d="m85 1 3 8 8 3-8 3-3 8-3-8-8-3 8-3Z"/></g>');label=opened?'Il forziere si è aperto: scoperta completata!':'Il forziere brilla: trova i tre oggetti per aprirlo!';
  }
  const caption=document.createElement('span');caption.className='illustratedActionLabel';caption.setAttribute('role','status');caption.textContent=label;visual.append(caption);layer.append(visual);action.node=visual;host.dataset.lastAction=kind;host.dataset.actionCount=String(action.count);
  action.timer=setTimeout(()=>{if(!disposed&&action.node===visual)visual.dataset.actionState='settled';},950);
 }
 toy=mountToy(options.playground,kind,{scene:true,reset(){clearTimeout(action.timer);action.node?.remove();action.node=null;delete host.dataset.lastAction;delete host.dataset.actionCount;targets.forEach(b=>{b.disabled=false;b.classList.remove('found');});position(0);},choose(index,correct,step){if(!correct){feedback(host,'retry',kind);return;}targets[index].disabled=true;targets[index].classList.add('found');actor.style.left=points[index][0]+'%';actor.style.top=points[index][1]+'%';host.dataset.sceneProgress=String(step/3);action();}});
 return {action,react(type='success'){feedback(host,type,kind);},update(next={}){if(Number.isFinite(next.progress))position(next.progress);if(typeof next.paused==='boolean')layer.classList.toggle('illustratedPaused',next.paused);},rotate(delta){pan=Math.max(-5,Math.min(5,pan+delta*5));svg.style.transform='translateX('+pan+'%) scale('+zoom+')';},zoom(delta){zoom=Math.max(1,Math.min(1.3,zoom+delta));svg.style.transform='translateX('+pan+'%) scale('+zoom+')';},dispose(){if(disposed)return;disposed=true;clearTimeout(action.timer);action.node?.remove();action.node=null;toy?.dispose();clearFeedback(host);layer.remove();host.classList.remove('illustratedScene','illustratedPlayable');}};
}
function mount(host,options={}){
 const kind=options.kind||'island';if(!host||kind==='island')return mount3D(host,options);
 let settings={...options},view=null,disposed=false;const modes=document.createElement('nav');modes.className='sceneViewModes';modes.setAttribute('aria-label','Aspetto della scena');modes.innerHTML='<button type="button" data-scene-style="illustrated">Illustrazioni</button><button type="button" data-scene-style="3d">3D classico</button>';
 if(options.playground)options.playground.append(modes);else if(kind==='holiday')host.after(modes);else{host.append(modes);modes.classList.add('sceneViewOverlay');}
 const demonstration=options.playground?host.querySelector('.scenePlayButton'):null,dock=document.createElement('div');dock.className='sceneDemoActions';if(demonstration)options.playground.append(dock);
 function draw(){if(disposed)return;view?.dispose();if(demonstration)(sceneStyle==='illustrated'?dock:host).append(demonstration);view=sceneStyle==='3d'?mount3D(host,settings):illustratedView(host,settings);modes.querySelectorAll('button').forEach(b=>b.setAttribute('aria-pressed',String(b.dataset.sceneStyle===sceneStyle)));}
 function changed(){draw();}window.addEventListener('wordyland-scene-style',changed);
 modes.querySelectorAll('button').forEach(b=>b.onclick=()=>{if(disposed||sceneStyle===b.dataset.sceneStyle)return;sceneStyle=b.dataset.sceneStyle;try{localStorage.setItem('wordylandSceneStyle',sceneStyle);}catch{}window.dispatchEvent(new Event('wordyland-scene-style'));b.focus({preventScroll:true});});
 const removed=new MutationObserver(()=>{if(!host.isConnected)proxy.dispose();});removed.observe(document.body,{childList:true,subtree:true});
 const proxy={action(){return view?.action?.();},react(type){view?.react?.(type);},update(next={}){settings={...settings,...next};view?.update?.(next);},rotate(delta){view?.rotate?.(delta);},zoom(delta){view?.zoom?.(delta);},dispose(){if(disposed)return;disposed=true;removed.disconnect();window.removeEventListener('wordyland-scene-style',changed);view?.dispose();if(demonstration)host.append(demonstration);dock.remove();modes.remove();}};draw();return proxy;
}

window.wordylandIsland={places,actions,mount};
const mapHost=document.querySelector('#islandMap');
if(mapHost){
 let view=null,signature='',equipped={},adventures={},selected='treehouse',liveKind='island',paused=false,close=false,sound=false,audio=null,started=false,visibilityObserver=null;
 const hud=document.querySelector('#heroSceneHUD'),liveStatus=document.querySelector('#heroSceneStatus');
 const rebuild=()=>{
  view?.dispose();mapHost.querySelectorAll('.sceneFallback').forEach(e=>e.remove());
  mapHost.dataset.kind=liveKind;
  if(liveKind!=='island'){const icon=document.createElement('span');icon.className='sceneFallback';icon.textContent=places[liveKind].icon;mapHost.append(icon);}
  view=mount(mapHost,{kind:liveKind,equipped,adventures,selected,paused,preview:liveKind!=='island',playground:liveKind!=='island'?document.querySelector('#heroPlayground'):null,onSelect:id=>showLive(id)});
  if(close)view.zoom?.(-.22);
  hud.hidden=liveKind==='island';
  document.querySelectorAll('[data-live-place]').forEach(b=>b.setAttribute('aria-pressed',String(b.dataset.livePlace===liveKind)));
  mapHost.setAttribute('aria-label',liveKind==='island'?'Mappa tridimensionale di WordyLand':'Scena interattiva: '+places[liveKind].name);
  liveStatus.textContent=liveKind==='island'?'Scegli un luogo o prova una delle attività.':places[liveKind].name;
  if(liveKind!=='island')document.querySelector('#heroSceneAction').textContent=actions[liveKind].label;
 };
 function start(){if(started)return;started=true;visibilityObserver?.disconnect();rebuild();}
 function showLive(id){if(id!=='island'&&!places[id])return;liveKind=id;selected=id==='island'?selected:id;if(started)rebuild();else start();}
 document.querySelectorAll('[data-live-place]').forEach(b=>b.onclick=()=>showLive(b.dataset.livePlace));
 document.querySelector('#heroSceneAction').onclick=()=>{start();view?.action?.();liveStatus.textContent=actions[liveKind].message;};
 document.querySelector('#heroSceneLearn').onclick=()=>window.dispatchEvent(new CustomEvent('wordyland-play-place',{detail:liveKind}));
 if('IntersectionObserver'in window){visibilityObserver=new IntersectionObserver(entries=>{if(entries.some(entry=>entry.isIntersecting))start();},{rootMargin:'120px'});visibilityObserver.observe(mapHost);}else start();
 window.addEventListener('wordyland-world-state',e=>{equipped=e.detail.equipped;adventures=e.detail.adventures;selected=e.detail.activity||selected;view?.update({selected});const next=JSON.stringify([equipped,adventures]);if(next!==signature){signature=next;if(started)rebuild();}});
 window.addEventListener('wordyland-place',e=>{selected=e.detail;view?.update({selected});});
 document.querySelector('#islandLeft').onclick=()=>{start();view?.rotate(-.35);};
 document.querySelector('#islandRight').onclick=()=>{start();view?.rotate(.35);};
 document.querySelector('#islandZoom').onclick=e=>{start();close=!close;view?.zoom?.(close?-.22:.22);e.currentTarget.setAttribute('aria-pressed',String(close));};
 document.querySelector('#islandMotion').onclick=e=>{paused=!paused;document.documentElement.dataset.animations=paused?'paused':'running';window.dispatchEvent(new CustomEvent('wordyland-motion',{detail:paused}));e.currentTarget.setAttribute('aria-pressed',String(paused));e.currentTarget.setAttribute('aria-label',paused?'Riprendi le animazioni':'Metti in pausa le animazioni');e.currentTarget.textContent=paused?'▷':'Ⅱ';};
 document.querySelector('#islandSound').onclick=e=>{sound=!sound;e.currentTarget.setAttribute('aria-pressed',String(sound));e.currentTarget.setAttribute('aria-label',sound?'Disattiva i suoni':'Attiva i suoni');e.currentTarget.textContent=sound?'🔊':'🔇';try{if(sound){const A=window.AudioContext||window.webkitAudioContext;if(A){audio??=new A();audio.resume().catch(()=>{});}}}catch{sound=false;e.currentTarget.setAttribute('aria-pressed','false');e.currentTarget.textContent='🔇';}};
 window.addEventListener('wordyland-celebrate',()=>{
  if(sound&&audio){try{[523,659,784].forEach((frequency,i)=>{const o=audio.createOscillator(),g=audio.createGain(),t=audio.currentTime+i*.13;o.type='sine';o.frequency.value=frequency;g.gain.setValueAtTime(0,t);g.gain.linearRampToValueAtTime(.055,t+.025);g.gain.exponentialRampToValueAtTime(.001,t+.3);o.connect(g);g.connect(audio.destination);o.start(t);o.stop(t+.32);});}catch{}}
  if(matchMedia('(prefers-reduced-motion: reduce)').matches)return;
  const confetti=document.createElement('div');confetti.className='islandConfetti';confetti.setAttribute('aria-hidden','true');
  for(let i=0;i<24;i++){const piece=document.createElement('i');piece.style.cssText='--i:'+i+';--x:'+((i*37)%100)+'%;--c:'+['#ffc96d','#a6e4d4','#cfb4ee','#ff9fac'][i%4];confetti.append(piece);}document.body.append(confetti);setTimeout(()=>confetti.remove(),1800);
 });
}

})();
