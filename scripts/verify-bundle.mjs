import fs from 'node:fs';
import {createHash} from 'node:crypto';
const html=fs.readFileSync('dist/index.html','utf8');
const expected=['index.html','app.js','data.js','worlds.js','accounts.js','api.php','quests.js','quests.css','platform.php','curriculum.json','arena.php','arena.js','classroom.php','classroom.js','arcade.js','arcade.css','race-world.webp','race-circuits.webp','race-racers.webp'];
for(const name of ['app.js','data.js','worlds.js','accounts.js','quests.js','arena.js','classroom.js','arcade.js','race-world.webp']) {
  const hash=createHash('sha256').update(fs.readFileSync('dist/'+name)).digest('hex').slice(0,12);
  if(!html.includes('src="'+name+'?v='+hash+'"')) throw Error('Missing or outdated public dependency: '+name+'; run node scripts/version-assets.mjs');
}
for(const name of fs.readdirSync('dist')) if(!expected.includes(name)) throw Error('Unexpected public file: '+name);
for(const name of expected) if(!fs.statSync('dist/'+name).isFile()) throw Error('Missing public file: '+name);
const styleHash=createHash('sha256').update(fs.readFileSync('dist/quests.css')).digest('hex').slice(0,12);
if(!html.includes('WordyLand')||!html.includes('href="quests.css?v='+styleHash+'"')) throw Error('Title or styles missing/outdated; run node scripts/version-assets.mjs');
const curriculum=JSON.parse(fs.readFileSync('dist/curriculum.json','utf8'));
if(!curriculum.body?.length||!curriculum.catpositions?.length) throw Error('School curriculum missing');
for(const name of ['arcade.css']){
  const hash=createHash('sha256').update(fs.readFileSync('dist/'+name)).digest('hex').slice(0,12);
  if(!html.includes('href="'+name+'?v='+hash+'"')) throw Error('Outdated stylesheet: '+name);
}
for(const name of ['race-circuits.webp','race-racers.webp']){
  const hash=createHash('sha256').update(fs.readFileSync('dist/'+name)).digest('hex').slice(0,12);
  if(!fs.readFileSync('dist/arcade.css','utf8').includes(name+'?v='+hash)) throw Error('Outdated illustration: '+name);
}
console.log('Public bundle verified: nineteen application files, no configuration, database or keys.');
