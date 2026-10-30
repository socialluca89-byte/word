/* Install and update controls. No private data is stored by the service worker. */
(()=>{
 // Optional typography must never hold the first page load or offline play.
 // Start after load; optional display keeps slow fonts from moving readable controls.
 window.addEventListener('load',()=>setTimeout(()=>{
  if(document.querySelector('link[data-wordyland-fonts]'))return;
  const fonts=document.createElement('link');fonts.rel='stylesheet';fonts.dataset.wordylandFonts='optional';
  fonts.href='https://fonts.googleapis.com/css2?family=DM+Sans:wght@400;500;600;700&family=Outfit:wght@400;500;600;700&display=optional';
  document.head.append(fonts);
 },0),{once:true});
 const install=document.querySelector('#installApp'),help=document.querySelector('#installHelp'),status=document.querySelector('#appStatus'),update=document.querySelector('#appUpdate'),reload=document.querySelector('#updateApp');
 const workerURL='sw.js?v=15d5b581cfa2';
 let prompt=null,registration=null,reloading=false,reloadRequired=false,hadController=!!navigator.serviceWorker?.controller;
 const standalone=()=>matchMedia('(display-mode: standalone)').matches||navigator.standalone===true;
 function installation(){install.hidden=standalone();if(standalone())help.hidden=true;install.textContent=prompt?'Installa WordyLand':'Come installare';}
 function connection(){const offline=!navigator.onLine;document.querySelector('#connectionNotice').hidden=!offline;document.querySelectorAll('[data-online-only]').forEach(a=>a.setAttribute('aria-disabled',String(offline)));}
 document.querySelectorAll('[data-online-only]').forEach(a=>a.addEventListener('click',event=>{if(!navigator.onLine){event.preventDefault();status.textContent='Le sfide hanno bisogno di Internet. Puoi aprire il ripasso offline.';}}));
 install.onclick=async()=>{
  if(prompt){const pending=prompt;prompt=null;install.disabled=true;try{await pending.prompt();await pending.userChoice;}
   catch{help.hidden=false;install.setAttribute('aria-expanded','true');status.textContent='La finestra di installazione non si è aperta. Puoi seguire le istruzioni qui sotto e continuare a giocare.';}
   finally{install.disabled=false;installation();}}
  else{help.hidden=!help.hidden;install.setAttribute('aria-expanded',String(!help.hidden));}
 };
 window.addEventListener('beforeinstallprompt',event=>{event.preventDefault();prompt=event;installation();});
 window.addEventListener('appinstalled',()=>{prompt=null;install.hidden=true;help.hidden=true;status.textContent='WordyLand è stata installata. La trovi tra le tue app!';});
 function readyUpdate(){update.hidden=!(registration?.waiting||reloadRequired);}
 function updateFailed(message){reload.disabled=false;update.removeAttribute('aria-busy');reload.textContent='Ricarica per aggiornare';status.textContent=message;readyUpdate();}
 function updateError(error){
  if(window.wordylandAccount?.info()?.authExpired)return 'Prima di aggiornare, conferma di nuovo il tuo accesso nell’area account. I progressi restano su questa pagina.';
  if(error.message==='unfinished-operation')return 'Prima di aggiornare, termina l’operazione in corso e conferma di aver conservato gli eventuali codici di recupero. La pagina resta aperta.';
  return 'Prima di aggiornare, torna online e salva i progressi. Se c’è un conflitto, controlla l’area account. La pagina resta aperta.';
 }
 function checkReloadSafety(){
  const state=window.wordylandAccount?.info();
  if(state?.working||state?.recoveryPending||document.querySelector('main [aria-busy="true"], [data-recovery-pending="true"]'))throw new Error('unfinished-operation');
  if(state&&(state.pending||state.saving||state.locked||state.authExpired))throw new Error('unsaved-progress');
 }
 async function saveBeforeReload(){await window.wordylandAccount?.flush();checkReloadSafety();}
 async function finishReload(){
  try{const state=window.wordylandAccount?.info();if(state?.pending||state?.saving)await saveBeforeReload();else checkReloadSafety();if(reloading)return;reloading=true;location.reload();}
  catch(error){updateFailed(updateError(error));}
 }
 reload.onclick=async()=>{
  if(reload.disabled||(!registration?.waiting&&!reloadRequired))return;
  reload.disabled=true;update.setAttribute('aria-busy','true');reload.textContent='Preparo l’aggiornamento…';status.textContent='Salvo i progressi prima di aggiornare. La pagina resta aperta fino al termine.';
  try{await saveBeforeReload();if(reloading)return;if(registration?.waiting)registration.waiting.postMessage({type:'SKIP_WAITING'});else if(reloadRequired)await finishReload();else updateFailed('L’aggiornamento non è più in attesa. Puoi continuare a giocare.');}
  catch(error){updateFailed(updateError(error));}
 };
 installation();connection();window.addEventListener('online',connection);window.addEventListener('offline',connection);
 if(!('serviceWorker'in navigator)){status.textContent='Puoi giocare nel browser. Il ripasso offline non è disponibile su questo dispositivo.';return;}
 navigator.serviceWorker.addEventListener('controllerchange',()=>{const replacing=hadController;hadController=true;if(replacing)reloadRequired=true;if(reload.disabled&&!reloading)finishReload();else if(replacing)readyUpdate();});
 navigator.serviceWorker.register(workerURL,{scope:'/',updateViaCache:'none'}).then(async reg=>{
  registration=reg;readyUpdate();reg.addEventListener('updatefound',()=>{const worker=reg.installing;worker?.addEventListener('statechange',()=>{if(worker.state==='installed'&&navigator.serviceWorker.controller)readyUpdate();});});
  await navigator.serviceWorker.ready;document.querySelector('#offlineReady').hidden=false;
 }).catch(()=>{status.textContent='Il ripasso offline non è ancora pronto. Riprova quando sei online.';});
})();
