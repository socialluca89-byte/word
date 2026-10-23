import fs from 'node:fs';
import {createHash} from 'node:crypto';
const html=fs.readFileSync('dist/index.html','utf8');
const expected=['index.html','app.js','data.js','worlds.js','accounts.js','api.php','quests.js','quests.css','platform.php','curriculum.json','arena.php','arena.js','classroom.php','classroom.js'];
for(const name of ['app.js','data.js','worlds.js','accounts.js','quests.js','arena.js','classroom.js']) {
  const hash=createHash('sha256').update(fs.readFileSync('dist/'+name)).digest('hex').slice(0,12);
  if(!html.includes('src="'+name+'?v='+hash+'"')) throw Error('Missing or outdated public dependency: '+name+'; run node scripts/version-assets.mjs');
}
for(const name of fs.readdirSync('dist')) if(!expected.includes(name)) throw Error('Unexpected public file: '+name);
for(const name of expected) if(!fs.statSync('dist/'+name).isFile()) throw Error('Missing public file: '+name);
const styleHash=createHash('sha256').update(fs.readFileSync('dist/quests.css')).digest('hex').slice(0,12);
if(!html.includes('WordyLand')||!html.includes('href="quests.css?v='+styleHash+'"')) throw Error('Title or styles missing/outdated; run node scripts/version-assets.mjs');
const curriculum=JSON.parse(fs.readFileSync('dist/curriculum.json','utf8'));
if(!curriculum.body?.length||!curriculum.catpositions?.length) throw Error('School curriculum missing');
console.log('Public bundle verified: fourteen application files, no configuration, database or keys.');
