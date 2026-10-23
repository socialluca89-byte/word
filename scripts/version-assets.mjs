import fs from 'node:fs';
import {createHash} from 'node:crypto';

// Run after changing browser assets, before committing a release.
const assets=['data.js','worlds.js','app.js','accounts.js','classroom.js','arena.js','quests.js','quests.css','arcade.js','arcade.css','race-world.webp'];
for(const name of ['race-circuits.webp','race-racers.webp']){
  const hash=createHash('sha256').update(fs.readFileSync('dist/'+name)).digest('hex').slice(0,12);
  const css=fs.readFileSync('dist/arcade.css','utf8').replace(new RegExp(name.replaceAll('.','\\.')+'(?:\\?v=[a-f0-9]+)?','g'),name+'?v='+hash);
  fs.writeFileSync('dist/arcade.css',css);
}
let html=fs.readFileSync('dist/index.html','utf8');
for(const name of assets){
  const hash=createHash('sha256').update(fs.readFileSync('dist/'+name)).digest('hex').slice(0,12);
  const pattern=new RegExp('((?:src|href)=")'+name.replaceAll('.','\\.')+'(?:\\?v=[a-f0-9]+)?(")','g');
  if(!pattern.test(html))throw Error('Missing browser asset: '+name);
  html=html.replace(pattern,'$1'+name+'?v='+hash+'$2');
}
fs.writeFileSync('dist/index.html',html);
console.log('Browser asset versions refreshed.');
