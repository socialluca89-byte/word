import fs from 'node:fs';
import vm from 'node:vm';
import assert from 'node:assert/strict';
import {createHash} from 'node:crypto';
const code=fs.readFileSync('dist/sw.js','utf8'),events={},storage=new Map();let offline=false,skipped=0,claimed=0;
const scope='https://wordyland.eu/';
const cache={async addAll(requests){for(const r of requests){assert.equal(r.credentials,'omit');storage.set(r.url,new Response(r.url));}},async match(url){return storage.get(url);}};
let names=['another-app-cache','wordyland-offline-obsolete'];const deleted=[];
const context=vm.createContext({Request,Response,URL,Object,Promise,
 self:{registration:{scope},location:{origin:new URL(scope).origin},clients:{async claim(){claimed++;}},skipWaiting(){skipped++;},addEventListener(name,fn){events[name]=fn;}},
 caches:{async open(){return cache;},async keys(){return names;},async delete(key){deleted.push(key);return true;}},
 fetch:async request=>{if(offline)throw Error('offline');return new Response('network:'+request.url);}
});
vm.runInContext(code,context);
const assets=vm.runInContext('ASSETS',context),name=vm.runInContext('CACHE_NAME',context);
assert.equal(skipped,0,'Updates must wait for the user');
let pending;events.install({waitUntil(promise){pending=promise;}});await pending;
assert.equal(storage.size,8);for(const [pathname,url] of Object.entries(assets)){
 assert(!pathname.includes('api')&&!pathname.includes('account')&&!pathname.includes('admin'));
 const hash=createHash('sha256').update(fs.readFileSync('dist'+pathname)).digest('hex').slice(0,12);
 assert.equal(url,pathname.slice(1)+'?v='+hash);
}
async function fetchTest(path,{method='GET',mode='cors'}={}){
 let response;
 const request={url:new URL(path,scope).href,method,mode};events.fetch({request,respondWith(promise){response=promise;}});return response?await response:undefined;
}
for(const path of ['/api.php?action=session','/api.php?action=study-file&profile=1','/accounts.js','/.wordyland-managed','https://other.example/offline.js','/curriculum.json?private=anything'])assert.equal(await fetchTest(path),undefined,path);
assert.equal(await fetchTest('/offline.html',{method:'POST'}),undefined);
assert.match(await (await fetchTest('/',{mode:'navigate'})).text(),/^network:/);
offline=true;
assert((await (await fetchTest('/#admin-attiva=not-a-real-token',{mode:'navigate'})).text()).includes('offline.html'));
assert.equal(await fetchTest('/api.php?action=session',{mode:'navigate'}),undefined);
assert.equal(await fetchTest('/unrecognized',{mode:'navigate'}),undefined);
assert((await (await fetchTest('/curriculum.json')).text()).includes('curriculum.json'));
assert.equal(storage.size,8,'Browsing must not add private or arbitrary URLs');
names.push(name);events.activate({waitUntil(promise){pending=promise;}});await pending;assert.deepEqual(deleted,['wordyland-offline-obsolete']);assert.equal(claimed,1);
events.message({data:{type:'unexpected'}});assert.equal(skipped,0);events.message({data:{type:'SKIP_WAITING'}});assert.equal(skipped,1);
for(const size of [192,512]){const image=fs.readFileSync('dist/icon-'+size+'.png');assert.equal(image.readUInt32BE(16),size);assert.equal(image.readUInt32BE(20),size);}
console.log('PWA checks passed: public-only precache, current asset hashes/icons, no private/API/POST caching, network-first entry, offline fallback, waiting updates and isolated cleanup.');
