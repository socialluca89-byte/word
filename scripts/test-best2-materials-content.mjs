// Independent source matrix for the 13 teacher photos shared for Best2 on 14 November 2026.
// No browser, account, document upload or network request is used.
import assert from 'node:assert/strict';
import fs from 'node:fs';
import vm from 'node:vm';
import {execFileSync} from 'node:child_process';

const baseline='3614c4476101814b307dd72a80b935ca7883e2fd';
const before=JSON.parse(execFileSync('git',['show',baseline+':dist/training.json'],{encoding:'utf8'}));
const previousUnits=JSON.parse(execFileSync('git',['show',baseline+':dist/class-program-catalog.json'],{encoding:'utf8'}));
const content=JSON.parse(fs.readFileSync('dist/training.json','utf8'));
const catalog=JSON.parse(fs.readFileSync('dist/class-program-catalog.json','utf8'));
const grammar=content.grammarLessons,nouns=new Map(grammar.nouns.map(noun=>[noun.id,noun]));
for(const [key,value] of Object.entries(before)){
 if(key==='foundationWords')assert.deepEqual(content[key].slice(0,64),value,'All 64 old word records retain their exact values');
 else if(key==='wordPacks')assert.deepEqual(content[key].slice(0,9),value,'All 9 old word packs retain their exact values');
 else if(key==='grammarLessons'){
  assert.deepEqual(grammar.nouns.slice(0,30),value.nouns,'All 30 old noun records retain their exact values');
  assert.deepEqual(grammar.packs.slice(0,11),value.packs,'All 75 old cases, models, aliases and help retain their exact values');
  for(const field of Object.keys(value).filter(field=>!['nouns','packs'].includes(field)))assert.deepEqual(grammar[field],value[field]);
 }else assert.deepEqual(content[key],value,'Unrelated content remains unchanged: '+key);
}
assert.deepEqual(Object.keys(content).sort(),Object.keys(before).sort(),'No unrelated top-level curriculum is introduced');
assert.deepEqual(catalog.units.slice(0,9),previousUnits.units,'All 9 earlier class units stay exact');
assert.deepEqual(Object.keys(catalog).sort(),Object.keys(previousUnits).sort(),'No unrelated catalogue field is introduced');
for(const key of Object.keys(previousUnits).filter(key=>key!=='units'))assert.deepEqual(catalog[key],previousUnits[key],'Unrelated catalogue field stays exact: '+key);
assert.equal(content.foundationWords.length,71);assert.equal(content.wordPacks.length,10);
assert.equal(grammar.nouns.length,34);assert.equal(grammar.packs.length,14);assert.equal(catalog.units.length,13);
assert.equal(grammar.packs.reduce((sum,pack)=>sum+pack.cases.length,0),103);
const newPacks=grammar.packs.slice(11),packIds=['best2-what-questions','best2-this-these','best2-it-they-sentences'];
assert.deepEqual(newPacks.map(pack=>pack.id),packIds);assert.deepEqual(newPacks.map(pack=>pack.cases.length),[10,8,10]);
const newCases=newPacks.flatMap(pack=>pack.cases),allCases=grammar.packs.flatMap(pack=>pack.cases);
assert.equal(new Set(allCases.map(row=>row.id)).size,103,'Every case has a distinct stable identity');
assert.equal(new Set(grammar.nouns.map(noun=>noun.id)).size,34);
assert.equal(new Set(content.foundationWords.map(word=>word.id)).size,71);

// New nouns are explicitly supported by the written examples, not extrapolated from new singular vocabulary.
const appendedNouns=grammar.nouns.slice(30);
assert.deepEqual([...appendedNouns.map(noun=>noun.id)].sort(),['bookbag','boy','hand','tree']);
for(const [id,singular,plural,article,meaning,pluralMeaning] of [
 ['tree','tree','trees','a','albero','alberi'],['boy','boy','boys','a','bambino','bambini'],
 ['hand','hand','hands','a','mano','mani'],['bookbag','bookbag','bookbags','a','zaino','zaini']
]){
 const noun=nouns.get(id);assert.equal(noun.singular,singular);assert.equal(noun.plural,plural);assert.equal(noun.article,article);
 assert.equal(noun.meaning,meaning);assert.equal(noun.pluralMeaning,pluralMeaning);
}
assert.equal(nouns.get('bookbag').art,'bookbag');
assert(nouns.get('bookbag').singularAliases.includes('book bag'));
assert(nouns.get('bookbag').pluralAliases.includes('book bags'));
assert(!nouns.get('bookbag').singularAliases.includes('bag'),'The corrected bookbag does not become bare bag');
assert(!nouns.get('bookbag').pluralAliases.includes('bags'),'The corrected bookbags do not become bare bags');

// These quantities are copied only when clear. Pens 2 and demonstrative plurals 2 are representative plurality,
// not claims about obscured source counts. There is no new numeric answer or how-many task.
const questions=[
 ['desk',1,'What is this?','It is a desk.'],['desk',2,'What are they?','They are desks.'],
 ['bookbag',1,'What is this?','It is a bookbag.'],['bookbag',2,'What are they?','They are bookbags.'],
 ['pencil-sharpener',1,'What is this?','It is a pencil sharpener.'],['pencil-sharpener',3,'What are they?','They are pencil sharpeners.'],
 ['pen',1,'What is this?','It is a pen.'],['pen',2,'What are they?','They are pens.'],
 ['apple',1,"What's this?","It's an apple."],['apple',3,'What are they?','They are apples.']
];
assert.deepEqual(newPacks[0].cases.map(row=>[row.noun,row.count,row.question,row.answer]),questions,'Exact photographed question/answer families');
for(const row of newPacks[0].cases){
 assert.equal(row.task,'identify');assert.equal(row.audio,row.question);assert.equal(row.model,row.answer);
 assert.equal(row.tokens.join(' '),row.answer);assert.deepEqual(row.choices,[]);
 assert(!row.aliases.some(answer=>/\b(?:this|these|that|those)\b/i.test(answer)),'Question answers keep their own taught It/They family');
 if(row.noun==='bookbag')for(const answer of [row.answer,...row.aliases])assert(!/\b(?:a bag|are bags)\b/.test(answer),'The corrected noun remains bookbag/book bag');
}
assert(newPacks[0].cases.at(-2).aliases.includes('It is an apple.'));

const demonstratives=[
 ['apple',1,'This is','an apple.','This is an apple.'],['apple',2,'These are','apples.','These are apples.'],
 ['ball',1,'This is','a ball.','This is a ball.'],['ball',2,'These are','balls.','These are balls.'],
 ['dog',1,'This is','a dog.','This is a dog.'],['dog',2,'These are','dogs.','These are dogs.'],
 ['tree',1,'This is','a tree.','This is a tree.'],['tree',2,'These are','trees.','These are trees.']
];
assert.deepEqual(newPacks[1].cases.map(row=>[row.noun,row.count,row.prefix,row.ending,row.answer]),demonstratives,'This/These source matrix, distinct from It/They');
for(const row of newPacks[1].cases){
 assert.equal(row.task,'demonstrative');assert.equal(row.model,row.answer);assert.equal(row.answer,row.prefix+' '+row.ending);
 assert.deepEqual(row.choices,['This is','These are']);assert.deepEqual(row.aliases,[]);assert.equal(row.tokens.join(' '),row.model);
 assert.equal(row.prefix,row.count===1?'This is':'These are');
 assert.equal(row.audio,nouns.get(row.noun).singular,'Choice listening never speaks the grammatical answer');
}
const statements=[
 ['pencil',1,'It is a pencil.'],['pencil',3,'They are pencils.'],
 ['pencil-sharpener',1,'It is a pencil sharpener.'],['pencil-sharpener',3,'They are pencil sharpeners.'],
 ['desk',1,'It is a desk.'],['desk',3,'They are desks.'],
 ['boy',1,'It is a boy.'],['boy',2,'They are boys.'],['hand',1,'It is a hand.'],['hand',2,'They are hands.']
];
assert.deepEqual(newPacks[2].cases.map(row=>[row.noun,row.count,row.answer]),statements,'Only missing It/They examples are appended');
for(const row of newPacks[2].cases){assert.equal(row.task,'sentence');assert.equal(row.tokens.join(' '),row.answer);assert(!row.aliases.some(answer=>/\b(?:this|these|that|those)\b/i.test(answer)));}
for(const row of newCases){
 assert(nouns.has(row.noun));assert(Number.isInteger(row.count)&&row.count>=1&&row.count<=3);
 assert(typeof row.prompt==='string'&&row.prompt.length>0);assert(typeof row.explanation==='string'&&row.explanation.length>0);
 assert(!/\b(?:how many|that|those|he|she)\b/i.test([row.prompt,row.answer,row.question||'',row.model||''].join(' ')),'Unprovided rules and ambiguous margin numerals do not become tasks');
}

const words=[['slide',['scivolo']],['scooter',['monopattino']],['swing',['altalena']],['shelf',['mensola','ripiano','scaffale']],['cupboard',['armadietto','credenza','armadio']],['computer',['computer','calcolatore']],['tree',['albero']]];
assert.deepEqual(content.foundationWords.slice(64).map(word=>word.id),words.map(row=>row[0]),'Seven source-supported spelling words');
for(const word of content.foundationWords.slice(64))assert(words.find(([id])=>id===word.id)[1].includes(word.meaning),'Accurate original Italian gloss: '+word.id);
const pack=content.wordPacks[9];assert.equal(pack.id,'best2-new-words');assert.equal(pack.wordOnly,true);assert.deepEqual(pack.words,words.map(row=>row[0]));
for(const word of content.foundationWords.slice(64)){
 assert.equal(word.wordOnly,true);assert.equal(word.phrase,word.id);assert.equal(word.phraseMeaning,word.meaning);assert.equal(word.gap,'___');
 assert(typeof word.emoji==='string'&&word.emoji.length>0);
}
assert(!JSON.stringify({newCases,appendedNouns,words:content.foundationWords.slice(64),pack}).match(/\b(?:shelves|cupboards|computers|scooters|slides|swings)\b/i),'Unprovided plurals are not invented');
const units=catalog.units.slice(9);
assert.deepEqual(units.map(unit=>unit.id),['best2-20261114-words','best2-20261114-questions','best2-20261114-this-these','best2-20261114-statements']);
for(const unit of units){assert(/best\s?2/i.test(unit.title));assert(/2026-11-14/.test(unit.source));}
assert.deepEqual(units[0].wordPacks,['best2-new-words']);
assert.deepEqual(units.slice(1).map(unit=>unit.grammarPacks),packIds.map(id=>[id]));
assert(units.every(unit=>!('club' in unit)&&!('classId' in unit)&&!('profile' in unit)),'Provenance never guesses a production class ID');

// Exercise real pure rendering/plan helpers, without loading the DOM or browser runtime.
const source=fs.readFileSync('dist/grammar.js','utf8');
const artStart=source.indexOf('function grammarObjectSvg('),artEnd=source.indexOf('\n function objectArt',artStart);
assert(artStart>=0&&artEnd>artStart);
const art=vm.runInNewContext('('+source.slice(artStart,artEnd).trim()+')',Object.create(null));
const artIds=['slide','scooter','swing','shelf','cupboard','computer','tree','boy','hand'];
const drawings=artIds.map(id=>art('grammar-'+id));
assert.equal(new Set(drawings.map(svg=>svg.replace(/data-grammar-art="[^"]+"/g,''))).size,9,'Nine distinct original object drawings');
for(const [index,svg] of drawings.entries()){
 assert(svg.startsWith('<svg xmlns='));assert.equal((svg.match(/<svg/g)||[]).length,1);
 assert(svg.includes('viewBox="0 0 120 120"'));assert(svg.includes('data-grammar-art="grammar-'+artIds[index]+'"'));
 assert(/<(?:path|rect|circle|ellipse)\b/.test(svg));assert(!/<script|<image|\bon\w+=|https?:\/\/(?!www\.w3\.org)/i.test(svg));
}
const helperStart=source.indexOf('function phases('),helperEnd=source.indexOf(' function canonical(',helperStart),canonicalEnd=source.indexOf(' function snapshot(',helperEnd);
assert(helperStart>=0&&helperEnd>helperStart&&canonicalEnd>helperEnd);
const context={MAX_AGE:604800000,nounById:id=>nouns.get(id),shuffle:rows=>[...rows],trackValid:value=>typeof value==='string'&&grammar.packs.some(pack=>'grammar:'+pack.id===value)};
const helpers=vm.runInNewContext('(()=>{'+source.slice(helperStart,canonicalEnd)+';return {phases,phaseMode,question,canonical};})()',context);
assert.deepEqual([...helpers.phases({task:'demonstrative'})],['model','demonstrative-choice','demonstrative-build','demonstrative-write']);
assert.deepEqual(['model','demonstrative-choice','demonstrative-build','demonstrative-write'].map(phase=>helpers.phaseMode(phase)),['grammar-model','grammar-choice','grammar-build','grammar-write']);
let snapshots=0;
for(const pack of grammar.packs){
 const row=pack.cases[0],sequence=[...helpers.phases(row)],plan=sequence.map(phase=>helpers.question(row,pack,phase));
 for(const q of plan){
  const expected=q.grammar.phase==='question-build'?row.question:q.grammar.phase==='demonstrative-choice'?row.prefix:row.answer;
  assert.equal(q.answer,expected,'Phase-specific expected response is independent of renderer generation');
  if(q.mode==='grammar-build')assert.deepEqual([...q.tokens].sort(),(q.grammar.phase==='question-build'?row.questionTokens:row.tokens).slice().sort());
 }
 const frozen={token:'ab'.repeat(16),track:'grammar:'+pack.id,plan,step:1,total:plan.length,createdAt:Date.now(),hint:1,helped:true,errors:1,done:false};
 const resumed=helpers.canonical(frozen);assert.equal(JSON.stringify(resumed.plan),JSON.stringify(plan),'Frozen phases/model/quantity remain unchanged for '+pack.id);assert.equal(resumed.hint,1);assert.equal(resumed.helped,true);snapshots++;
}
console.log(JSON.stringify({status:'passed',source:'13 teacher photos shared for Best2 on 14 November 2026',newCases:28,totalCases:103,newFoundationWords:7,totalFoundationWords:71,totalNouns:34,totalGrammarPacks:14,programmeUnits:13,originalDrawings:9,frozenSnapshots:snapshots,checks:['all 3614 prefixes exact','independent 10 question / 8 demonstrative / 10 statement matrix','teacher-corrected bookbag wording','representative plurality without invented counting','seven singular-only spelling words','no shelves/That/Those/He/She expansion','explicit programme units without guessed class assignment','distinct local SVG objects','real phase helpers and frozen saved plans'],network:false,realAccounts:false}));
