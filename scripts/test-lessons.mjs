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
