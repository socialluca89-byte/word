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
 const workerURL='sw.js?v=d14a98c443a2';
 let prompt=null,registration=null,reloading=false;
 const standalone=()=>matchMedia('(display-mode: standalone)').matches||navigator.standalone===true;
 function installation(){install.hidden=standalone();if(standalone())help.hidden=true;install.textContent=prompt?'Installa WordyLand':'Come installare';}
 function connection(){const offline=!navigator.onLine;document.querySelector('#connectionNotice').hidden=!offline;document.querySelectorAll('[data-online-only]').forEach(a=>a.setAttribute('aria-disabled',String(offline)));}
 document.querySelectorAll('[data-online-only]').forEach(a=>a.addEventListener('click',event=>{if(!navigator.onLine){event.preventDefault();status.textContent='Le sfide hanno bisogno di Internet. Puoi aprire il ripasso offline.';}}));
 install.onclick=async()=>{
  if(prompt){const pending=prompt;prompt=null;await pending.prompt();await pending.userChoice;installation();}
  else{help.hidden=!help.hidden;install.setAttribute('aria-expanded',String(!help.hidden));}
 };
 window.addEventListener('beforeinstallprompt',event=>{event.preventDefault();prompt=event;installation();});
 window.addEventListener('appinstalled',()=>{prompt=null;install.hidden=true;help.hidden=true;status.textContent='WordyLand è stata installata. La trovi tra le tue app!';});
 function readyUpdate(){if(registration?.waiting)update.hidden=false;}
 reload.onclick=async()=>{
  if(!registration?.waiting)return;reload.disabled=true;
  try{await window.wordylandAccount?.flush();registration.waiting.postMessage({type:'SKIP_WAITING'});}
  catch{reload.disabled=false;status.textContent='Prima di aggiornare, torna online e salva i progressi.';}
 };
 installation();connection();window.addEventListener('online',connection);window.addEventListener('offline',connection);
 if(!('serviceWorker'in navigator)){status.textContent='Puoi giocare nel browser. Il ripasso offline non è disponibile su questo dispositivo.';return;}
 navigator.serviceWorker.addEventListener('controllerchange',()=>{if(reload.disabled&&!reloading){reloading=true;location.reload();}});
 navigator.serviceWorker.register(workerURL,{scope:'/',updateViaCache:'none'}).then(async reg=>{
  registration=reg;readyUpdate();reg.addEventListener('updatefound',()=>{const worker=reg.installing;worker?.addEventListener('statechange',()=>{if(worker.state==='installed'&&navigator.serviceWorker.controller)readyUpdate();});});
  await navigator.serviceWorker.ready;document.querySelector('#offlineReady').hidden=false;
 }).catch(()=>{status.textContent='Il ripasso offline non è ancora pronto. Riprova quando sei online.';});
})();
