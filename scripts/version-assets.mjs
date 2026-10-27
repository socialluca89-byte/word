import fs from 'node:fs';
import {createHash} from 'node:crypto';

// Run after changing browser assets, before committing a release.
const assets=['data.js','worlds.js','learning.js','app.js','accounts.js','classroom.js','arena.js','quests.js','quests.css','arcade.js','arcade.css','island.css','island.js','community.js','presence.js','three.min.js','pwa.css','pwa.js','training.js','study-import.js','manifest.webmanifest','icon-192.png'];
for(const name of ['race-circuits.webp','race-racers.webp']){
  const hash=createHash('sha256').update(fs.readFileSync('dist/'+name)).digest('hex').slice(0,12);
  const css=fs.readFileSync('dist/arcade.css','utf8').replace(new RegExp(name.replaceAll('.','\\.')+'(?:\\?v=[a-f0-9]+)?','g'),name+'?v='+hash);
  fs.writeFileSync('dist/arcade.css',css);
}
const islandArt='island-places.webp';
const islandHash=createHash('sha256').update(fs.readFileSync('dist/'+islandArt)).digest('hex').slice(0,12);
fs.writeFileSync('dist/island.css',fs.readFileSync('dist/island.css','utf8').replace(/island-places\.webp(?:\?v=[a-f0-9]+)?/g,islandArt+'?v='+islandHash));
// Update offline dependencies first, then the worker, then its registration URL.
const digest=name=>createHash('sha256').update(fs.readFileSync('dist/'+name)).digest('hex').slice(0,12);
const versioned=name=>name+'?v='+digest(name);
fs.writeFileSync('dist/study-ocr.js',fs.readFileSync('dist/study-ocr.js','utf8').replace(/const workerURL='[^']+';/,"const workerURL='"+versioned('ocr-worker.min.js')+"';"));
let importer=fs.readFileSync('dist/study-import.js','utf8');
for(const name of ['pdf.min.mjs','pdf.worker.min.mjs','study-ocr.js'])importer=importer.replace(new RegExp(name.replaceAll('.','\\.')+'(?:\\?v=[a-f0-9]+)?','g'),versioned(name));
fs.writeFileSync('dist/study-import.js',importer);
fs.writeFileSync('dist/training.js',fs.readFileSync('dist/training.js','utf8').replace(/const contentURL='[^']+';/,"const contentURL='"+versioned('training.json')+"';"));
const manifest=JSON.parse(fs.readFileSync('dist/manifest.webmanifest','utf8'));
manifest.icons.forEach(icon=>{icon.src=versioned(icon.src.split('?')[0]);});
fs.writeFileSync('dist/manifest.webmanifest',JSON.stringify(manifest,null,2)+'\n');
let offline=fs.readFileSync('dist/offline.html','utf8');
for(const name of ['pwa.css','learning.js','offline.js','icon-192.png'])offline=offline.replace(new RegExp('((?:src|href)=")'+name.replaceAll('.','\\.')+'(?:\\?v=[a-f0-9]+)?(")','g'),'$1'+versioned(name)+'$2');
fs.writeFileSync('dist/offline.html',offline);
const offlineAssets=Object.fromEntries(['offline.html','learning.js','offline.js','pwa.css','curriculum.json','training.json','manifest.webmanifest','icon-192.png','icon-512.png','icon-maskable-512.png'].map(name=>['/'+name,versioned(name)]));
const release=createHash('sha256').update(JSON.stringify(offlineAssets));
for(const name of fs.readdirSync('dist').sort().filter(name=>!['sw.js','pwa.js','index.html'].includes(name)&&!name.endsWith('.php')))release.update(name).update(fs.readFileSync('dist/'+name));
release.update(fs.readFileSync('dist/pwa.js','utf8').replace(/const workerURL='[^']+';/,"const workerURL='sw.js';"));
release.update(fs.readFileSync('dist/index.html','utf8').replace(/\?v=[a-f0-9]+/g,''));
const revision=release.digest('hex').slice(0,16);
let worker=fs.readFileSync('dist/sw.js','utf8').replace(/const CACHE_NAME=.*?;/,"const CACHE_NAME='wordyland-offline-"+revision+"';").replace(/const ASSETS=.*?;/,'const ASSETS='+JSON.stringify(offlineAssets)+';');
fs.writeFileSync('dist/sw.js',worker);
fs.writeFileSync('dist/pwa.js',fs.readFileSync('dist/pwa.js','utf8').replace(/const workerURL='[^']+';/,"const workerURL='"+versioned('sw.js')+"';"));
let html=fs.readFileSync('dist/index.html','utf8');
for(const name of assets){
  const hash=createHash('sha256').update(fs.readFileSync('dist/'+name)).digest('hex').slice(0,12);
  const pattern=new RegExp('((?:src|href)=")'+name.replaceAll('.','\\.')+'(?:\\?v=[a-f0-9]+)?(")','g');
  if(!pattern.test(html))throw Error('Missing browser asset: '+name);
  html=html.replace(pattern,'$1'+name+'?v='+hash+'$2');
}
fs.writeFileSync('dist/index.html',html);
console.log('Browser asset versions refreshed.');
