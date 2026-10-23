import fs from 'node:fs';
const html=fs.readFileSync('dist/index.html','utf8');
for(const name of ['app.js','data.js','worlds.js','accounts.js']) {
  if(!fs.existsSync('dist/'+name)||!html.includes('src="'+name+'"')) throw Error('Missing public dependency: '+name);
}
for(const name of fs.readdirSync('dist')) {
  if(!['index.html','app.js','data.js','worlds.js','accounts.js','api.php'].includes(name)) throw Error('Unexpected public file: '+name);
}
if(!html.includes('WordyLand')) throw Error('Application title missing');
console.log('Public bundle verified: six application files, no configuration, database or keys.');
