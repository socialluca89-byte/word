import fs from 'node:fs';
import vm from 'node:vm';
import assert from 'node:assert/strict';
const context=vm.createContext({document:{querySelector(){return null}},localStorage:{getItem(){return null}}});
vm.runInContext(fs.readFileSync('dist/data.js','utf8'),context);
vm.runInContext(fs.readFileSync('dist/worlds.js','utf8'),context);
const app=fs.readFileSync('dist/app.js','utf8');
vm.runInContext(app.slice(0,app.indexOf("$('#category').innerHTML=")),context);
const evaluate=s=>vm.runInContext(s,context);
assert.equal(evaluate("normalize(\"I'm fine, thanks!\") === normalize(\"I’m fine, thanks\")"),true);
for(const [phrase,expected] of [['the cat is on the box','on'],['the cat is in the box','in'],['the cat is under the box','under'],['in front of','in front of'],['how old are you?','old']]) {
  evaluate('gapModel('+JSON.stringify(phrase)+')');
  assert.equal(evaluate('gapAnswer'),expected);
}
for(const position of ['on','in','under','behind','between','in front of','next to']) {
  assert.ok(evaluate('picture('+JSON.stringify(position)+',"📦")').startsWith('<svg'));
}
assert.equal(evaluate('lists.hello.some(x=>x[0].includes("Chloe"))'),false);
console.log('Lesson checks passed: phrase gaps, punctuation, spatial scenes and generic content.');

const curriculum=JSON.parse(fs.readFileSync('dist/curriculum.json','utf8'));
for(const topic of ['counting','penpositions','conversation','aboutme','family','food','clothes','weather','routines','mousepositions']) {
  assert.deepEqual(JSON.parse(evaluate('JSON.stringify(lists.'+topic+')')),curriculum[topic],topic+' must match the server curriculum');
}
assert.equal(evaluate('lists.numbers.length'),10);
for(const word of ['shoulder','finger'])assert.equal(evaluate('lists.focus.some(r=>r[0]==='+JSON.stringify(word)+')'),true);
for(const word of ['head','mouth','shoulder','ear'])assert.equal(evaluate('typeof hints['+JSON.stringify(word)+']'), 'string');
for(const row of curriculum.counting){
  const q=JSON.parse(evaluate('JSON.stringify(makeLessonQuestion('+JSON.stringify(row)+',0,3,lists.counting))'));
  assert.equal(q.kind,'count');assert.equal(q.options.length,4);
  assert.equal(q.options.filter(r=>r[0]===row[0]).length,1);
  assert.equal(new Set(q.options.map(r=>r[0])).size,4);
  assert.ok(q.options.every(r=>r[0].split(' ').slice(1).join(' ')===(r[0].startsWith('one ')?row[3].singular:row[3].plural)));
  const rendered=evaluate('picture('+JSON.stringify(row[0])+','+JSON.stringify(row[2])+')');
  assert.equal((rendered.match(/aria-hidden="true"/g)||[]).length,row[3].count);
}
const position=curriculum.penpositions.find(r=>r[0].includes('in front of'));
const gap=JSON.parse(evaluate('JSON.stringify(makeLessonQuestion('+JSON.stringify(position)+',1,3,lists.penpositions))'));
assert.equal(gap.kind,'gap');assert.equal(gap.answer,'in front of');assert.ok(!gap.mask.includes('in front of'));
assert.ok(evaluate('picture("it\'s behind the book","🖊️")').includes('Penna e libro'));
const dialogue=JSON.parse(evaluate('JSON.stringify(makeLessonQuestion(lists.conversation[0],0,3,lists.conversation))'));
assert.equal(dialogue.kind,'dialogue');assert.equal(dialogue.prompt,'How are you?');assert.equal(dialogue.options.filter(r=>r[3]?.prompt===dialogue.prompt).length,1);
assert.ok(!JSON.stringify(curriculum).match(/Chloe|Claudia|Luca/i),'Personal worksheet names must not enter the shared curriculum');
console.log('New lesson checks passed: shared vocabulary, 1–10, count quantities/plurals/options, multiword gaps, pen/book scenes, dialogue prompts and generic example names.');

assert.ok(evaluate('picture("the mouse is between the boxes","🐭")').includes("Topolino e scatola"));
