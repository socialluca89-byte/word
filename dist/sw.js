/* Public offline revision only. API calls, accounts and private documents never enter CacheStorage. */
const CACHE_NAME='wordyland-offline-509c0c2c069ba176';
const ASSETS={"/offline.html":"offline.html?v=c90140adec95","/learning.js":"learning.js?v=5197fad07a98","/offline.js":"offline.js?v=7fe23ecb081e","/pwa.css":"pwa.css?v=ad42e2881d36","/curriculum.json":"curriculum.json?v=caec47ff5b7d","/manifest.webmanifest":"manifest.webmanifest?v=5e1522f35a54","/icon-192.png":"icon-192.png?v=1f9b3f6f1b02","/icon-512.png":"icon-512.png?v=73f342b30736","/icon-maskable-512.png":"icon-maskable-512.png?v=73f342b30736"};
const assetURL=path=>new URL(ASSETS[path],self.registration.scope).href;
self.addEventListener('install',event=>{
 event.waitUntil(caches.open(CACHE_NAME).then(cache=>cache.addAll(Object.keys(ASSETS).map(path=>new Request(assetURL(path),{cache:'reload',credentials:'omit'})))));
});
self.addEventListener('activate',event=>{
 event.waitUntil(caches.keys().then(keys=>Promise.all(keys.filter(key=>key.startsWith('wordyland-offline-')&&key!==CACHE_NAME).map(key=>caches.delete(key)))).then(()=>self.clients.claim()));
});
self.addEventListener('message',event=>{if(event.data?.type==='SKIP_WAITING')self.skipWaiting();});
self.addEventListener('fetch',event=>{
 const request=event.request,url=new URL(request.url);
 if(request.method!=='GET'||url.origin!==self.location.origin||url.pathname.endsWith('.php'))return;
 if(request.mode==='navigate'){
  if(!['/','/index.html','/offline.html'].includes(url.pathname))return;
  event.respondWith(fetch(request).catch(async()=>{
   const cache=await caches.open(CACHE_NAME),page=await cache.match(assetURL('/offline.html'));
   return page||new Response('Ripasso non ancora scaricato. Collegati a Internet e riapri WordyLand.',{status:503,headers:{'Content-Type':'text/plain; charset=utf-8'}});
  }));return;
 }
 if(!Object.hasOwn(ASSETS,url.pathname))return;
 const canonical=assetURL(url.pathname);
 if(url.search && url.href!==canonical)return;
 event.respondWith(caches.open(CACHE_NAME).then(async cache=>(await cache.match(canonical))||fetch(request)));
});
