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
const actions={treehouse:{label:'Accendi le luci',message:'La tua casa si illumina! 🏡'},pets:{label:'Fallo saltare',message:'Un salto per te! 💗'},creative:{label:'Mescola i colori',message:'Una nuova combinazione! 🎨'},kart:{label:'TURBO! Tieni forte',message:'TURBO! 🏁'},football:{label:'Tira in porta!',message:'GOOOL! ⚽'},space:{label:'Lancia il razzo!',message:'3, 2, 1… VIA! 🚀'},ocean:{label:'Apri il tesoro',message:'Ecco il tesoro! 🪙'},dino:{label:'Chiama il dinosauro',message:'Eccomi! 🦕'}};
function showAction(host,kind){
 feedback(host,'success',kind);const node=reactions.get(host)?.node;if(node)node.textContent=actions[kind]?.message||'Si parte!';
}
const palette={sun:[0xffcb55,0xff806d,0x70cfc0],ocean:[0x58bfee,0x8c83eb,0x57d6bd],berry:[0xef87b7,0xac83ed,0xffce79]};
function mount(host,options={}){
 if(!host)return {dispose(){},update(){},rotate(){}};
 function fallback(){host.dataset.render='fallback';return {dispose(){clearFeedback(host);},action(){if(options.preview)showAction(host,options.kind);},react(type){feedback(host,type,options.kind);},update(){},rotate(){}};}
 const T=window.THREE;
 if(!T)return fallback();
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
 const pins=[],animations=[],colliders=[],progressObjects=[],effects=[];
 let reactionAge=10,reactionKind='success',intro=0,interactedAt=0,actionAge=10,kartDistance=0,paintIndex=0,lightsOn=false;
 let paused=Boolean(options.paused)||document.documentElement.dataset.animations==='paused';
 const material=color=>{if(!materials.has(color))materials.set(color,new T.MeshStandardMaterial({color,roughness:.78,metalness:.03}));return materials.get(color);};
 function mesh(geometry,color,parent=root,x=0,y=0,z=0){geometries.add(geometry);const m=new T.Mesh(geometry,material(color));m.position.set(x,y,z);m.castShadow=true;m.receiveShadow=true;parent.add(m);return m;}
 const box=(w,h,d,c,p,x=0,y=0,z=0)=>mesh(new T.BoxGeometry(w,h,d),c,p,x,y,z);
 const sphere=(r,c,p,x=0,y=0,z=0,sx=1,sy=1,sz=1)=>{const m=mesh(new T.SphereGeometry(r,20,14),c,p,x,y,z);m.scale.set(sx,sy,sz);return m;};
 const cylinder=(rt,rb,h,c,p,x=0,y=0,z=0,n=24)=>mesh(new T.CylinderGeometry(rt,rb,h,n),c,p,x,y,z);
 const group=(p,x=0,y=0,z=0)=>{const g=new T.Group();g.position.set(x,y,z);p.add(g);return g;};
 function tree(p,x,z,s=1){const g=group(p,x,0,z);g.scale.setScalar(s);cylinder(.2,.3,2.2,0x9e7151,g,0,1,0,7);sphere(1.2,0x69bf91,g,0,2.6,0,1,1.1,1);sphere(.85,0x99d49b,g,-.6,2.4,.3);sphere(.75,0x55ab85,g,.6,2.45,.1);animations.push(t=>g.rotation.z=Math.sin(t*1.2+x)*.025);return g;}
 function animal(p,type='fox',x=0,y=0,z=0,scale=1){const g=group(p,x,y,z);g.scale.setScalar(scale);const blinkers=[];animations.push(t=>{const blink=Math.sin(t*1.4+x*2)>.993?.15:1;blinkers.forEach(e=>e.scale.y=blink);});
if(type==='robot'){box(.8,.7,.55,0xa7beca,g,0,.55,0);box(1,.75,.65,0xcbdce0,g,0,1.25,0);box(.78,.36,.06,0x3e5a70,g,0,1.3,.36);for(const sign of[-1,1]){sphere(.075,0x8be4e4,g,sign*.22,1.32,.42);box(.2,.5,.3,0x7796ab,g,sign*.58,.62,0);box(.23,.25,.35,0x7796ab,g,sign*.23,.11,.05);}cylinder(.03,.03,.3,0x869fae,g,0,1.75,0);sphere(.1,0xf5ac9c,g,0,1.95,0);return g;}
if(type==='octopus'){sphere(.64,0xc39bd6,g,0,1,0,1,1.2,1);for(let i=0;i<8;i++){const a=i*Math.PI/4;sphere(.19,0xc39bd6,g,Math.sin(a)*.6,.25,Math.cos(a)*.6,1,.7,1.8);}for(const sign of[-1,1]){sphere(.09,0x33455b,g,sign*.23,1.15,.57);sphere(.025,0xffffff,g,sign*.21,1.18,.64);}return g;}
if(type==='lion')sphere(.75,0xb77d43,g,0,1.18,-.05,1.1,1,.7);
if(type==='dragon'){for(const sign of[-1,1]){const wing=box(.65,.65,.12,0xb7d99e,g,sign*.62,.75,-.18);wing.rotation.z=-sign*.6;cylinder(0,.1,.4,0xffdda1,g,sign*.3,1.82,0,8);}}
const bunny=type.includes('bunny'),cat=type.includes('cat'),panda=type==='panda';const fur=panda?0xe7edf2:cat?0xb6addb:bunny?0xf8d4de:type==='dragon'?0x89bd96:type==='lion'?0xefbf65:0xef9854; sphere(.48,fur,g,0,.47,0,.9,1.05,.75);sphere(.6,fur,g,0,1.15,.02,1,1,.86);sphere(.4,0xfff6e9,g,0,.94,.42,1,.65,.35);for(const sign of[-1,1]){const ear=sphere(bunny?.17:.23,fur,g,sign*.35,bunny?1.98:1.67,0,bunny?1:.8,bunny?2.7:1.35,.55);ear.rotation.z=-sign*.23;animations.push(t=>ear.rotation.z=-sign*.23+Math.sin(t*2+sign)*.055);blinkers.push(sphere(.075,0x24314c,g,sign*.23,1.22,.49));sphere(.023,0xffffff,g,sign*.21,1.25,.55);sphere(.13,0xf2ad9c,g,sign*.37,.99,.45,1,.6,.25);sphere(.15,fur,g,sign*.35,.14,.2,1,.7,1.3);if(panda)sphere(.19,0x334052,g,sign*.23,1.22,.43,1,1.3,.4);}sphere(.07,0x503a51,g,0,1.02,.59,1,.7,.6);if(options.equipped?.hat==='crown')cylinder(.27,.27,.2,0xffd16b,g,0,1.82,0,6);if(options.equipped?.hat==='cap'){sphere(.35,0x7dabe3,g,0,1.68,.03,1,.5,.9);box(.45,.05,.35,0x7dabe3,g,0,1.66,.35);}if(!bunny&&!panda){const tail=sphere(.35,fur,g,.45,.45,-.35,1,1.4,1);tail.rotation.z=-.7;}return g;}
 function kart(p,x=0,z=0,color=0x55c5dd){const g=group(p,x,0,z);box(1.35,.35,2,color,g,0,.55,0);sphere(.7,color,g,0,.7,-.5,1,.45,1);box(.8,.5,.6,0x243653,g,0,.85,.3);for(const sign of[-1,1])for(const zz of[-.55,.65]){const tire=cylinder(.3,.3,.25,0x26364c,g,sign*.75,.35,zz,18);tire.rotation.z=Math.PI/2;const hub=cylinder(.14,.14,.27,0xb8d2e2,g,sign*.75,.35,zz,12);hub.rotation.z=Math.PI/2;}const driver=animal(g,options.equipped?.avatar||'fox',0,.83,.12,.5);driver.rotation.y=Math.PI;box(1.2,.12,.25,0xffe6a2,g,0,.9,1.05);return g;}
 function rocket(p,x=0,z=0){const g=group(p,x,0,z);cylinder(.48,.48,2,0xf7efe9,g,0,1.45,0);cylinder(0,.49,.85,0xf58c96,g,0,2.86,0);cylinder(.58,.38,.4,0x6777d8,g,0,.35,0);sphere(.25,0x7ccfee,g,0,1.8,.41,1,1,.3);for(const sign of[-1,1]){const fin=box(.17,.75,.75,0x9c9bea,g,sign*.5,.65,0);fin.rotation.z=-sign*.3;}const flame=sphere(.3,0xffbf57,g,0,-.05,0,1,1.5,1);return {g,flame};}
 function football(p){const g=group(p);box(4.8,.08,6.3,0x62bb91,g,0,.04,0);for(const xx of[-2.2,2.2])box(.04,.02,5.8,0xe9fff0,g,xx,.1,0);for(const zz of[-2.85,0,2.85])box(4.4,.02,.04,0xe9fff0,g,0,.1,zz);const ring=mesh(new T.TorusGeometry(.65,.025,6,28),0xe9fff0,g,0,.11,0);ring.rotation.x=Math.PI/2;for(const xx of[-1.15,1.15])box(.1,1.2,.1,0xfffaf0,g,xx,.6,-2.5);box(2.4,.1,.1,0xfffaf0,g,0,1.2,-2.5);for(let i=0;i<9;i++)box(.025,1.1,.025,0xd9eae9,g,-1.1+i*.275,.58,-2.8);for(let i=0;i<5;i++)box(2.3,.025,.025,0xd9eae9,g,0,.1+i*.27,-2.8);const ball=group(g,0,.28,1.7);sphere(.24,0xffffff,ball);for(let i=0;i<6;i++){const a=i*Math.PI/3;sphere(.075,0x263d50,ball,Math.sin(a)*.2,Math.cos(a)*.2,.12,1,1,.45);}return {g,ball};}
 function house(p,preview=false){const g=group(p);const room=options.equipped?.room||'room-sky',wall=room==='room-peach'?0xffc6b0:room==='room-mint'?0xb7dfbb:0xb8dcef;box(3.8,.18,3,0xc89b72,g,0,.2,0);box(3.8,2.1,.12,wall,g,0,1.3,-1.5);box(.12,2.1,3,wall,g,-1.9,1.3,0);g.userData.window=box(1,.8,.1,0x63a8ce,g,.6,1.45,-1.4);box(1.1,.05,.15,0xfff4d5,g,.6,1.85,-1.3);box(.05,.9,.15,0xfff4d5,g,.6,1.45,-1.3);box(1.4,.45,.7,0xf8ae99,g,-.9,.55,-.8);box(1.4,.8,.2,0xffceb6,g,-.9,1,-1.1);cylinder(.48,.48,.13,0xfff3da,g,.45,.65,.3);cylinder(.08,.08,.5,0xb58768,g,.45,.4,.3);if(options.equipped?.rug)box(1.8,.04,1.1,0xa9b0e9,g,0,.32,.55);if(options.equipped?.plant){cylinder(.21,.15,.4,0xf7ad8b,g,1.35,.5,-.9);sphere(.38,0x70b893,g,1.35,.99,-.9,.8,1.3,.8);}if(options.equipped?.lamp){cylinder(.035,.05,1.2,0xe0b66a,g,-1.35,.9,1);cylinder(.17,.32,.4,0xffe8a6,g,-1.35,1.6,1);}if(!preview){cylinder(.38,.55,3,0x996947,g,0,-1.3,0,8);sphere(2.3,0x75bf96,g,-.5,3,-1,1,.55,.8);const roof=cylinder(0,3,1.2,0xf1b880,g,0,2.8,0,4);roof.rotation.y=Math.PI/4;}return g;}
 function creative(p){const g=group(p),colors=palette[(options.equipped?.palette||'paint-sun').slice(6)]||palette.sun;box(3.1,.18,2,0xf4c599,g,0,.9,0);for(const xx of[-1.2,1.2])for(const zz of[-.7,.7])box(.12,.9,.12,0xbf8b69,g,xx,.45,zz);const paper=box(1.4,.04,1.3,0xfffaf0,g,0,1.02,0);for(let i=0;i<3;i++)sphere(.23,colors[i],g,-.42+i*.42,1.08,0,1,.15,1);for(let i=0;i<3;i++)cylinder(.16,.16,.4,colors[i],g,-1+i*.45,1.2,-.6);return {g,paper};}
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
  cylinder(4.5,4.2,.4,kind==='space'?0xb8b6df:kind==='ocean'?0x88d1e0:0xc3e0c2,root,0,-.25,0,48);
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
  if(options.preview&&moving)kartDistance+=dt*(actionAge<2.3?5.5:.65);
  if(kind==='kart'&&model){const a=options.preview?kartDistance:-currentProgress*Math.PI*1.7;model.position.set(Math.sin(a)*2.5,.13+(moving?Math.sin(phase*18)*.015:0),Math.cos(a)*2.5);model.rotation.y=a+Math.PI/2;model.rotation.z=moving?Math.sin(phase*2)*.035:0;}
  if(kind==='football'&&ball){const u=kick;ball.position.z=1.7-u*4.1;ball.rotation.x=-u*9;ball.position.y=.28+Math.sin(u*Math.PI)*.65;}
  if(kind==='space'&&model){model.position.y=(options.preview&&actionAge<3.2?(moving?Math.min(7,Math.max(0,actionAge-.35)**2*3):4):currentProgress*2.8)+(moving?Math.sin(phase*1.7)*.13:0)+pulse*.5;model.rotation.z=moving?Math.sin(phase*1.2)*.025:0;}
  if(kind==='pets'&&model&&pulse>0){model.position.y=Math.abs(Math.sin(reactionAge*9))*pulse*.65;model.rotation.z=Math.sin(reactionAge*11)*pulse*.1;}
  if(kind==='dino'&&model){model.rotation.z=pulse*Math.sin(reactionAge*7)*.08;if(pulse>0)model.position.y=Math.abs(Math.sin(reactionAge*7))*pulse*.55;}
  if(kind==='creative'&&model&&actionAge<1.2&&moving)model.rotation.y=Math.sin(actionAge*6)*.15;
  if(kind==='ocean'&&model?.userData.lid)model.userData.lid.rotation.x=options.preview&&paintIndex>0?-(moving?Math.min(1,actionAge*2):1)*1.2:0;
  if(kind==='treehouse'&&model)model.rotation.y=moving?Math.sin(phase*.5)*.04:0;
  effects.forEach((o,i)=>{o.visible=pulse>0;if(o.visible){const a=i*Math.PI/6;o.position.set(Math.cos(a)*(1-pulse)*3,1.1+(1-pulse)*2.3+Math.sin(a)*.3,Math.sin(a)*(1-pulse)*3);o.scale.setScalar(pulse*1.8);}});
  if(flame)flame.scale.y=moving?1.3+Math.sin(phase*8)*.35+pulse:1;
  const introEase=1-Math.pow(1-intro,3);
  camera.position.copy(initialCamera).multiplyScalar(zoom*(1+(1-introEase)*.13)-pulse*.015);camera.lookAt(0,kind==='island'?0:kind==='space'&&options.preview&&actionAge<3.2?1.3:.7,0);
  renderer.render(scene,camera);
  for(const {pin,point,id}of pins){const v=point.clone().applyMatrix4(root.matrixWorld).project(camera);pin.style.left=(v.x*.5+.5)*100+'%';pin.style.top=(-v.y*.5+.5)*100+'%';pin.setAttribute('aria-pressed',String(selected===id));}
  if(moving&&visible&&!document.hidden)frame=requestAnimationFrame(tick);
 }
 function tick(now){frame=0;if(disposed||!visible||document.hidden)return;if(now-last>=32)render(now);else frame=requestAnimationFrame(tick);}
 function requestDraw(){if(!frame&&!disposed)frame=requestAnimationFrame(render);}
 function resize(){const w=host.clientWidth,h=host.clientHeight;if(!w||!h)return;renderer.setSize(w,h,false);camera.aspect=w/h;camera.updateProjectionMatrix();requestDraw();}
 const ro=new ResizeObserver(resize);ro.observe(host);
 const io=new IntersectionObserver(entries=>{visible=entries[0].isIntersecting;if(visible)requestDraw();else{cancelAnimationFrame(frame);frame=0;last=0;}},{rootMargin:'80px'});io.observe(host);
 const onVisibility=()=>{if(document.hidden){cancelAnimationFrame(frame);frame=0;last=0;}else if(visible)requestDraw();};document.addEventListener('visibilitychange',onVisibility);
 const onMotion=()=>{cancelAnimationFrame(frame);frame=0;requestDraw();};motion.addEventListener('change',onMotion);
 const onPause=e=>{paused=Boolean(e.detail);cancelAnimationFrame(frame);frame=0;requestDraw();};window.addEventListener('wordyland-motion',onPause);
 const onDown=e=>{interactedAt=performance.now();startX=e.clientX;startY=e.clientY;dragging=true;moved=false;};
 const onMove=e=>{if(!dragging)return;const dx=e.clientX-startX,dy=e.clientY-startY;if(Math.abs(dx)>5&&Math.abs(dx)>Math.abs(dy)){angle+=dx*.006;startX=e.clientX;startY=e.clientY;moved=true;requestDraw();}};
 const ray=new T.Raycaster();
 const onUp=e=>{if(!dragging)return;dragging=false;if(moved)return;if(kind!=='island'){if(options.preview)control.action();return;}const r=canvas.getBoundingClientRect();ray.setFromCamera(new T.Vector2((e.clientX-r.left)/r.width*2-1,-(e.clientY-r.top)/r.height*2+1),camera);const hit=ray.intersectObjects(colliders,true)[0];if(hit){let o=hit.object;while(o&&!o.userData.place)o=o.parent;if(o)options.onSelect?.(o.userData.place);}};
 canvas.addEventListener('pointerdown',onDown);canvas.addEventListener('pointermove',onMove);canvas.addEventListener('pointerup',onUp);canvas.addEventListener('pointercancel',()=>dragging=false);canvas.addEventListener('pointerleave',()=>dragging=false);
 const onLost=e=>{e.preventDefault();host.dataset.render='fallback';cancelAnimationFrame(frame);frame=0;};canvas.addEventListener('webglcontextlost',onLost);
 resize();
 const control={action(){
 if(!options.preview)return;
 actionAge=0;reactionAge=0;reactionKind='success';paintIndex++;showAction(host,kind);
 if(motion.matches||paused){if(kind==='kart')kartDistance+=Math.PI*.7;if(model&&['pets','dino'].includes(kind))model.rotation.y+=.5;}
 if(kind==='football'){kick=0;kickTarget=1;if(motion.matches||paused)kick=1;}
 if(kind==='treehouse'&&model?.userData.window){lightsOn=!lightsOn;model.userData.window.material=material(lightsOn?0xffdc78:0x63a8ce);}
 if(kind==='creative')progressObjects.forEach((o,i)=>o.material=material(palette[['sun','ocean','berry'][paintIndex%3]][i%3]));
 requestDraw();
 },react(type='success'){reactionAge=0;reactionKind=type;feedback(host,type,kind);requestDraw();},update(next={}){if(Number.isFinite(next.progress)){if(next.progress>progress&&kind==='football'){kick=0;kickTarget=1;}progress=Math.max(0,Math.min(1,next.progress));}if(next.selected)selected=next.selected;if(typeof next.paused==='boolean')paused=next.paused;requestDraw();},rotate(delta){interactedAt=performance.now();angle+=delta;requestDraw();},zoom(delta){zoom=Math.max(.75,Math.min(1.4,zoom+delta));requestDraw();},dispose(){if(disposed)return;disposed=true;clearFeedback(host);cancelAnimationFrame(frame);ro.disconnect();io.disconnect();removed.disconnect();document.removeEventListener('visibilitychange',onVisibility);motion.removeEventListener('change',onMotion);window.removeEventListener('wordyland-motion',onPause);for(const g of geometries)g.dispose();for(const m of materials.values())m.dispose();canvas.removeEventListener('webglcontextlost',onLost);renderer.dispose();renderer.forceContextLoss();canvas.remove();pins.forEach(x=>x.pin.remove());}};
 const removed=new MutationObserver(()=>{if(!host.isConnected)control.dispose();});removed.observe(document.body,{childList:true,subtree:true});
 return control;
}
window.wordylandIsland={places,actions,mount};
const mapHost=document.querySelector('#islandMap');
if(mapHost){
 let view=null,signature='',equipped={},adventures={},selected='treehouse',liveKind='island',paused=false,close=false,sound=false,audio=null;
 const hud=document.querySelector('#heroSceneHUD'),liveStatus=document.querySelector('#heroSceneStatus');
 const rebuild=()=>{
  view?.dispose();mapHost.querySelectorAll('.sceneFallback').forEach(e=>e.remove());
  mapHost.dataset.kind=liveKind;
  if(liveKind!=='island'){const icon=document.createElement('span');icon.className='sceneFallback';icon.textContent=places[liveKind].icon;mapHost.append(icon);}
  view=mount(mapHost,{kind:liveKind,equipped,adventures,selected,paused,preview:liveKind!=='island',onSelect:id=>showLive(id)});
  if(close)view.zoom?.(-.22);
  hud.hidden=liveKind==='island';
  document.querySelectorAll('[data-live-place]').forEach(b=>b.setAttribute('aria-pressed',String(b.dataset.livePlace===liveKind)));
  mapHost.setAttribute('aria-label',liveKind==='island'?'Mappa tridimensionale di WordyLand':'Scena interattiva: '+places[liveKind].name);
  liveStatus.textContent=liveKind==='island'?'Scegli un luogo o prova una delle attività.':places[liveKind].name;
  if(liveKind!=='island')document.querySelector('#heroSceneAction').textContent=actions[liveKind].label;
 };
 function showLive(id){if(id!=='island'&&!places[id])return;liveKind=id;selected=id==='island'?selected:id;rebuild();}
 document.querySelectorAll('[data-live-place]').forEach(b=>b.onclick=()=>showLive(b.dataset.livePlace));
 document.querySelector('#heroSceneAction').onclick=()=>{view.action?.();liveStatus.textContent=actions[liveKind].message;};
 document.querySelector('#heroSceneLearn').onclick=()=>window.dispatchEvent(new CustomEvent('wordyland-play-place',{detail:liveKind}));
 rebuild();
 window.addEventListener('wordyland-world-state',e=>{equipped=e.detail.equipped;adventures=e.detail.adventures;selected=e.detail.activity||selected;view.update({selected});const next=JSON.stringify([equipped,adventures]);if(next!==signature){signature=next;rebuild();}});
 window.addEventListener('wordyland-place',e=>{selected=e.detail;view.update({selected});});
 document.querySelector('#islandLeft').onclick=()=>view.rotate(-.35);
 document.querySelector('#islandRight').onclick=()=>view.rotate(.35);
 document.querySelector('#islandZoom').onclick=e=>{close=!close;view.zoom?.(close?-.22:.22);e.currentTarget.setAttribute('aria-pressed',String(close));};
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
