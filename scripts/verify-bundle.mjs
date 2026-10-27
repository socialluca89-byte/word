import fs from 'node:fs';
import {createHash} from 'node:crypto';
const html=fs.readFileSync('dist/index.html','utf8');
const expected=['index.html','learning.js','app.js','data.js','worlds.js','accounts.js','api.php','quests.js','quests.css','platform.php','curriculum.json','arena.php','arena.js','classroom.php','classroom.js','arcade.js','arcade.css','race-world.webp','race-circuits.webp','race-racers.webp','island.js','island.css','island-places.webp','three.min.js','community.php','community.js','presence.js','manifest.webmanifest','icon-192.png','icon-512.png','icon-maskable-512.png','offline.html','offline.js','pwa.css','pwa.js','sw.js','training.js','training.php','training.json','study-import.js','pdf.min.js','pdf.worker.min.js','study-ocr.js','ocr-worker.min.js','ocr-core-775a35df6f2a.js','ocr-eng-45b4cb346724.traineddata.gz','ocr-ita-f702fcfad297.traineddata.gz'];
for(const name of ['learning.js','app.js','data.js','worlds.js','accounts.js','quests.js','arena.js','classroom.js','arcade.js','island.js','community.js','presence.js','three.min.js','pwa.js','training.js','study-import.js']) {
  const hash=createHash('sha256').update(fs.readFileSync('dist/'+name)).digest('hex').slice(0,12);
  if(!html.includes('src="'+name+'?v='+hash+'"')) throw Error('Missing or outdated public dependency: '+name+'; run node scripts/version-assets.mjs');
}
for(const name of fs.readdirSync('dist')) if(!expected.includes(name)) throw Error('Unexpected public file: '+name);
for(const name of expected) if(!fs.statSync('dist/'+name).isFile()) throw Error('Missing public file: '+name);
const styleHash=createHash('sha256').update(fs.readFileSync('dist/quests.css')).digest('hex').slice(0,12);
if(!html.includes('WordyLand')||!html.includes('href="quests.css?v='+styleHash+'"')) throw Error('Title or styles missing/outdated; run node scripts/version-assets.mjs');
const curriculum=JSON.parse(fs.readFileSync('dist/curriculum.json','utf8'));
if(!curriculum.body?.length||!curriculum.catpositions?.length) throw Error('School curriculum missing');
for(const name of ['arcade.css','island.css','pwa.css']){
  const hash=createHash('sha256').update(fs.readFileSync('dist/'+name)).digest('hex').slice(0,12);
  if(!html.includes('href="'+name+'?v='+hash+'"')) throw Error('Outdated stylesheet: '+name);
}
for(const name of ['race-circuits.webp','race-racers.webp']){
  const hash=createHash('sha256').update(fs.readFileSync('dist/'+name)).digest('hex').slice(0,12);
  if(!fs.readFileSync('dist/arcade.css','utf8').includes(name+'?v='+hash)) throw Error('Outdated illustration: '+name);
}
const islandHash=createHash('sha256').update(fs.readFileSync('dist/island-places.webp')).digest('hex').slice(0,12);
if(!fs.readFileSync('dist/island.css','utf8').includes('island-places.webp?v='+islandHash))throw Error('Outdated island illustration');
console.log('Public bundle verified: forty-seven application files, no configuration, database or keys.');

const manifest=JSON.parse(fs.readFileSync('dist/manifest.webmanifest','utf8'));
if(manifest.start_url!=='/'||manifest.scope!=='/'||manifest.display!=='standalone')throw Error('Invalid PWA entry point');
for(const icon of manifest.icons){
 const name=icon.src.split('?')[0],hash=createHash('sha256').update(fs.readFileSync('dist/'+name)).digest('hex').slice(0,12);
 if(icon.src!==name+'?v='+hash)throw Error('Outdated app icon');
}
const workerHash=createHash('sha256').update(fs.readFileSync('dist/sw.js')).digest('hex').slice(0,12);
if(!fs.readFileSync('dist/pwa.js','utf8').includes("sw.js?v="+workerHash))throw Error('Outdated service worker registration');
if(!html.includes('rel="manifest"'))throw Error('PWA manifest missing');

const trainingHash=createHash('sha256').update(fs.readFileSync('dist/training.json')).digest('hex').slice(0,12);
if(!fs.readFileSync('dist/training.js','utf8').includes('training.json?v='+trainingHash))throw Error('Outdated training content');

const importer=fs.readFileSync('dist/study-import.js','utf8');
for(const name of ['pdf.min.js','pdf.worker.min.js']){
 const hash=createHash('sha256').update(fs.readFileSync('dist/'+name)).digest('hex').slice(0,12);
 if(!importer.includes(name+'?v='+hash))throw Error('Outdated local PDF library: '+name);
}

const pdfSource=JSON.parse(fs.readFileSync('docs/PDFJS_SOURCE.json','utf8'));
for(const [name,expectedHash] of Object.entries(pdfSource.files)){
 if(createHash('sha256').update(fs.readFileSync('dist/'+name)).digest('hex')!==expectedHash)throw Error('Official PDF.js bytes differ: '+name);
}
if(!fs.readFileSync('docs/PDFJS_LICENSE.txt','utf8').includes('Apache License'))throw Error('Missing PDF.js license');

const ocrSource=JSON.parse(fs.readFileSync('docs/OCR_SOURCE.json','utf8'));
for(const [name,entry] of Object.entries(ocrSource.files))if(createHash('sha256').update(fs.readFileSync('dist/'+name)).digest('hex')!==entry.sha256)throw Error('Official OCR bytes differ: '+name);
const ocrCode=fs.readFileSync('dist/study-ocr.js','utf8');
if(!importer.includes('study-ocr.js?v='+createHash('sha256').update(ocrCode).digest('hex').slice(0,12)))throw Error('Outdated OCR module');
if(!ocrCode.includes('ocr-worker.min.js?v='+createHash('sha256').update(fs.readFileSync('dist/ocr-worker.min.js')).digest('hex').slice(0,12)))throw Error('Outdated OCR worker');

for(const [name,hash] of Object.entries(ocrSource.licenses))if(createHash('sha256').update(fs.readFileSync('docs/'+name)).digest('hex')!==hash)throw Error('Missing/changed OCR license: '+name);
