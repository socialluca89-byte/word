/* Foreground, short-lived class presence. No background tracking or private offline cache. */
(()=>{
 const account=window.wordylandAccount,tab=Array.from(crypto.getRandomValues(new Uint8Array(16)),b=>b.toString(16).padStart(2,'0')).join('');
 const labels={offline:'Non online',online:'Online',ready:'Pronto a giocare',busy:'In partita',unknown:'Stato non aggiornato'};
 const icons={fox:'🦊',panda:'🐼',robot:'🤖',dragon:'🐉',octopus:'🐙',lion:'🦁'};
 const text=value=>String(value??'').replace(/[&<>"']/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]));
 let profile=null,username=null,ready=false,timer=null,inflight=false,lastState=null,lastAt=0,verified=false,debounce=null;
 const foreground=()=>document.visibilityState==='visible'&&navigator.onLine;
 const playing=()=>Array.from(document.querySelectorAll('#missionStage #questWork,#duelStage .duelOptions')).some(node=>!node.closest('[hidden]'));
 const state=()=>playing()?'busy':ready?'ready':'online';
 const badge=value=>{const valid=Object.hasOwn(labels,value)?value:'unknown';return '<span class="presenceBadge presence-'+valid+'">'+labels[valid]+'</span>';};
 function controls(){document.querySelectorAll('[data-presence-hint]').forEach(node=>node.textContent=profile?'Online significa app aperta in primo piano. Pronto è una tua scelta. Senza aggiornamenti la presenza scade entro 90 secondi.':'Scegli il tuo profilo nell’area account per apparire online e renderti disponibile a una sfida.');document.querySelectorAll('[data-ready-toggle]').forEach(input=>{input.checked=ready;input.disabled=!profile||!foreground();});document.querySelectorAll('[data-own-presence]').forEach(node=>node.innerHTML=badge(profile&&foreground()?(verified?state():'unknown'):'offline'));}
 const tick=()=>window.dispatchEvent(new CustomEvent('wordyland-presence',{detail:{verified}}));
 async function pulse(force=false){
  controls();if(!foreground())return;
  if(!profile){tick();return;}if(inflight)return;
  const currentState=state();if(!force&&currentState===lastState&&Date.now()-lastAt<20000)return;
  const expected=profile,owner=username;inflight=true;
  try{await account.request('presence-heartbeat',{profile:expected,tab,state:currentState});if(profile!==expected||username!==owner)return;verified=true;lastAt=Date.now();lastState=currentState;}
  catch{verified=false;lastState=currentState;lastAt=Date.now();}
  finally{inflight=false;controls();tick();}
 }
 function leave(){if(profile)account.request('presence-leave',{profile,tab},{keepalive:true}).catch(()=>{});verified=false;lastState=null;lastAt=0;}
 function start(){clearInterval(timer);timer=null;if(foreground()){pulse(true);timer=setInterval(()=>pulse(true),25000);}}
 function changed(){const info=account.info();if(info.id!==profile||info.username!==username){leave();profile=info.id;username=info.username;ready=false;lastState=null;}start();controls();}
 function mountControls(host){host.insertAdjacentHTML('afterbegin','<div class="presenceControls"><label><input type="checkbox" data-ready-toggle> Sono pronto a una sfida</label><span data-own-presence></span><small data-presence-hint>Online significa app aperta in primo piano. “Pronto” è una tua scelta. La presenza scade entro 90 secondi senza aggiornamenti.</small></div>');controls();}
 document.addEventListener('change',event=>{if(!event.target.matches('[data-ready-toggle]'))return;ready=event.target.checked;controls();pulse(true);});
 document.addEventListener('visibilitychange',()=>{if(!foreground()){leave();ready=false;}start();controls();});
 window.addEventListener('offline',()=>{leave();ready=false;start();controls();tick();});window.addEventListener('online',start);
 window.addEventListener('pagehide',()=>{leave();ready=false;clearInterval(timer);});window.addEventListener('pageshow',start);
 window.addEventListener('wordyland-profile',changed);
 const observer=new MutationObserver(()=>{if(profile&&foreground()&&state()!==lastState){clearTimeout(debounce);debounce=setTimeout(()=>pulse(),150);}});observer.observe(document.querySelector('main'),{subtree:true,childList:true,attributes:true,attributeFilter:['hidden']});
 function mountRoster(host){
  const owner=account.info().username,all=account.info().role==='admin';let offset=0,loading=false,sequence=0,signature='';
  const valid=()=>host.isConnected&&account.info().username===owner;
  host.innerHTML='<div class="rosterIntro"><p>'+(all?'Tutti i profili iscritti. Il filtro “Iscritti oggi” mostra gli alunni con account creato oggi, ora italiana.':'Qui vedi soltanto i tuoi profili e i compagni delle tue classi.')+'</p><div class="rosterCounts" aria-live="polite"></div><label>Mostra<select id="rosterFilter"><option value="all">Tutti gli iscritti</option><option value="online">Online adesso</option>'+(all?'<option value="today">Iscritti oggi</option>':'')+'</select></label><button class="audio" id="rosterRefresh">Aggiorna elenco</button><a class="communityButton" href="#sfide">Scegli un compagno da sfidare →</a></div><p id="rosterStatus" role="status"></p><div class="rosterResults"></div><div class="communityPager"><button class="audio" id="rosterPrevious" disabled>← Precedenti</button><span id="rosterPage"></span><button class="audio" id="rosterNext" disabled>Successivi →</button></div>';
  mountControls(host);
  const status=message=>{if(valid())host.querySelector('#rosterStatus').textContent=message;};
  async function load(){
   if(!valid()||!foreground()||host.closest('[hidden]')||loading)return;loading=true;const current=++sequence;host.querySelector('#rosterRefresh').disabled=true;
   try{const data=await account.request('roster&scope='+(all?'all':'class')+'&filter='+encodeURIComponent(host.querySelector('#rosterFilter').value)+'&offset='+offset);if(!valid()||current!==sequence)return;
    host.querySelector('.rosterCounts').innerHTML=Object.entries({registered:'Iscritti',online:'Online',ready:'Pronti',today:'Alunni iscritti oggi'}).filter(([key])=>key in data.counts).map(([key,label])=>'<span><b>'+data.counts[key]+'</b> '+label+'</span>').join('');
    const next=JSON.stringify(data.items);if(signature!==next){signature=next;host.querySelector('.rosterResults').innerHTML=data.items.length?'<div class="rosterList">'+data.items.map(person=>'<article class="rosterPerson"><span class="rosterAvatar" aria-hidden="true">'+(icons[person.equipped?.avatar]||icons.fox)+'</span><div><h3>'+text(person.nickname)+'</h3>'+badge(person.presence)+'<p>'+text(person.classes.join(' · ')||'Ancora senza classe')+'</p>'+(all?'<small>Account: '+text(person.username)+' · '+text(person.role==='learner'?'Alunno':person.role==='admin'?'Amministratore':'Adulto')+' · Account dal '+new Date(person.account_created_at*1000).toLocaleDateString('it-IT',{timeZone:'Europe/Rome'})+'</small>':'')+'</div></article>').join('')+'</div>':'<p>Nessun iscritto corrisponde a questo filtro.</p>';}
    host.querySelector('#rosterPrevious').disabled=offset===0;host.querySelector('#rosterNext').disabled=offset+data.pageSize>=data.total;host.querySelector('#rosterPage').textContent=Math.min(offset+data.items.length,data.total)+' / '+data.total;status('Elenco aggiornato. Gli stati si aggiornano automaticamente mentre questa pagina è aperta.');
   }catch(error){signature='';if(valid()){host.querySelectorAll('.presenceBadge').forEach(node=>node.outerHTML=badge('unknown'));host.querySelector('.rosterCounts').textContent='Conteggi non aggiornati.';}status(error.message);}
   finally{if(current===sequence){loading=false;if(valid())host.querySelector('#rosterRefresh').disabled=false;}}
  }
  host.querySelector('#rosterRefresh').onclick=load;host.querySelector('#rosterFilter').onchange=()=>{offset=0;sequence++;loading=false;load();};host.querySelector('#rosterPrevious').onclick=()=>{offset=Math.max(0,offset-20);load();};host.querySelector('#rosterNext').onclick=()=>{offset+=20;load();};
  const update=()=>{if(valid())load();};window.addEventListener('wordyland-presence',update);
  const removed=new MutationObserver(()=>{if(!valid()){removed.disconnect();window.removeEventListener('wordyland-presence',update);}});removed.observe(document.querySelector('main'),{childList:true,subtree:true});load();
 }
 window.wordylandPresence={badge,mountControls,mountRoster};account.ready.then(changed);
})();
