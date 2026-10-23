import fs from 'node:fs';
const html=fs.readFileSync('dist/index.html','utf8');
const expected=['index.html','app.js','data.js','worlds.js','accounts.js','api.php','quests.js','quests.css','platform.php','curriculum.json','arena.php','arena.js'];
for(const name of ['app.js','data.js','worlds.js','accounts.js','quests.js','arena.js']) {
  if(!fs.existsSync('dist/'+name)||!html.includes('src="'+name+'"')) throw Error('Missing public dependency: '+name);
}
for(const name of fs.readdirSync('dist')) if(!expected.includes(name)) throw Error('Unexpected public file: '+name);
for(const name of expected) if(!fs.statSync('dist/'+name).isFile()) throw Error('Missing public file: '+name);
if(!html.includes('WordyLand')||!html.includes('href="quests.css"')) throw Error('Title or styles missing');
const curriculum=JSON.parse(fs.readFileSync('dist/curriculum.json','utf8'));
if(!curriculum.body?.length||!curriculum.catpositions?.length) throw Error('School curriculum missing');
console.log('Public bundle verified: twelve application files, no configuration, database or keys.');
