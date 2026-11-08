// Independent transcription of the five teacher worksheets shared on8November2026.
// This is content verification only: no accounts, browser, network, or generated curriculum.
import assert from 'node:assert/strict';
import fs from 'node:fs';
import vm from 'node:vm';

const content=JSON.parse(fs.readFileSync('dist/training.json','utf8'));
const grammar=content.grammarLessons;
const nouns=new Map(grammar.nouns.map(noun=>[noun.id,noun]));
const packs=grammar.packs.slice(5);
assert.deepEqual(packs.map(pack=>pack.id),['toys-yes-no','whats-this','it-they-choice','it-they-write','is-this','short-answer-gap']);
assert.deepEqual(packs.map(pack=>pack.cases.length),[5,6,6,6,8,4]);
const all=packs.flatMap(pack=>pack.cases);
assert.equal(all.length,35);
assert.equal(new Set(grammar.packs.flatMap(pack=>pack.cases.map(row=>row.id))).size,75);
assert.deepEqual(grammar.nouns.slice(16).map(noun=>noun.id),['bag','rubber','doll','car','ball','puzzle','teddy','rabbit','cat','rat','dog','lizard','hat','pencil-case']);
assert.equal(nouns.get('rubber').article,'a');
assert.equal(nouns.get('rubber').art,'eraser');
assert.equal(nouns.get('bag').art,'bookbag');
assert.deepEqual(nouns.get('rubber').singularAliases,[]);
assert.deepEqual(nouns.get('bag').singularAliases,[]);
assert.equal(nouns.get('pencil-case').targetOnly,true);
assert.equal(nouns.get('pencil-case').art,null);
assert(!all.some(row=>row.noun==='pencil-case'),'The photographed pencil-case word is only a question target, never a new pictured exercise');

// These rows are hand-transcribed from the images, independently of case-building code.
const toys=[['doll','doll',true],['car','teddy',false],['ball','car',false],['puzzle','puzzle',true],['teddy','teddy',true]];
const school=[['pencil-sharpener','pen',false],['pencil','pencil',true],['bag','bag',true],['pen','notebook',false],['desk','pencil-case',false],['rubber','rubber',true],['book','desk',false],['chair','chair',true]];
function shortQuestions(pack,rows,stem){
 assert.equal(pack.cases.length,rows.length);
 for(const [index,[pictured,asked,yes]] of rows.entries()){
  const row=pack.cases[index],target=nouns.get(asked);
  assert.equal(row.task,'short-question');assert.equal(row.noun,pictured);assert.equal(row.askedNoun,asked);assert.equal(row.count,1);
  assert.equal(row.question,stem+' '+target.article+' '+target.singular+'?');
  assert.equal(row.answer,yes?'Yes, it is.':"No, it isn't.");
  assert.deepEqual(row.choices,['Yes, it is.',"No, it isn't."]);
  assert.deepEqual(row.aliases,yes?[]:['No, it is not.',"No, it's not."]);
  assert.equal(row.questionTokens.join(' '),row.question);assert.equal(row.audio,row.question);assert.equal(row.model,row.answer);
 }
}
shortQuestions(packs[0],toys,'Is it');
shortQuestions(packs[4],school,'Is this');

const identified=['bag','pencil','pen','rubber','book','desk'];
assert.deepEqual(packs[1].cases.map(row=>row.noun),identified);
for(const row of packs[1].cases){
 const noun=nouns.get(row.noun);
 assert.equal(row.task,'identify');assert.equal(row.count,1);assert.equal(row.question,"What's this?");assert.equal(row.audio,"What's this?");
 assert.equal(row.answer,"It's a "+noun.singular+'.');assert.equal(row.model,row.answer);
 assert.deepEqual(row.aliases,['It is a '+noun.singular+'.']);assert.deepEqual(row.choices,[]);
 assert(!row.aliases.some(value=>/eraser|bookbag|book bag/.test(value)),'New classroom words are not silently replaced with a different lexical choice');
}

const choose=[['book',3,'They are','books.'],['rabbit',1,'It is','a rabbit.'],['pen',2,'They are','pens.'],['doll',2,'They are','dolls.'],['cat',1,'It is','a cat.'],['rat',1,'It is','a rat.']];
const write=[['car',1,'It is','a car.'],['dog',2,'They are','dogs.'],['lizard',2,'They are','lizards.'],['bag',2,'They are','bags.'],['desk',1,'It is','a desk.'],['hat',1,'It is','a hat.']];
for(const [pack,rows,task] of [[packs[2],choose,'prefix-choice'],[packs[3],write,'prefix-write']]){
 assert.deepEqual(pack.cases.map(row=>[row.noun,row.count,row.answer,row.ending]),rows);
 for(const row of pack.cases){
  assert.equal(row.task,task);assert.equal(row.model,row.answer+' '+row.ending);assert.deepEqual(row.aliases,[]);
  assert.deepEqual(row.choices,task==='prefix-choice'?['It is','They are']:[]);
  assert.equal(row.audio,nouns.get(row.noun).singular,'Reading the noun does not provide the grammatical subject');
  assert.equal(row.answer,row.count===1?'It is':'They are');
 }
 assert.equal(pack.cases.filter(row=>row.count===1).length,3);
}

const gaps=[['puzzle','puzzle','Yes, it ___.','is'],['teddy','ball','No, it ___.',"isn't"],['doll','puzzle','No, it ___.',"isn't"],['car','car','Yes, it ___.','is']];
assert.deepEqual(packs[5].cases.map(row=>[row.noun,row.askedNoun,row.frame,row.answer]),gaps);
for(const row of packs[5].cases){
 assert.equal(row.task,'short-gap');assert.equal(row.count,1);assert.deepEqual(row.aliases,[]);assert.deepEqual(row.choices,['is',"isn't"]);
 assert.equal(row.model,row.frame.replace('___',row.answer));assert.equal(row.audio,row.question);
 const target=nouns.get(row.askedNoun);assert.equal(row.question,'Is it '+target.article+' '+target.singular+'?');
}

for(const row of all){
 assert.match(row.id,/^worksheet08-[a-z0-9-]+$/);assert(nouns.has(row.noun));assert(!nouns.get(row.noun).targetOnly);
 assert.equal(row.tokens.join(' '),row.answer,'Tiles compose this exact written answer');
 assert(Number.isInteger(row.count)&&row.count>=1&&row.count<=4);
 assert(typeof row.explanation==='string'&&row.explanation.length>=20);
 assert(typeof row.prompt==='string'&&row.prompt.length>0);
 if(row.choices.length)assert.equal(row.choices.filter(value=>value===row.answer).length,1);
 assert(!row.aliases.includes("Yes, it's."),'A positive short answer is not contracted at its end');
}
// No new regular-plural practice is generated from unassigned noun metadata.
assert(!all.some(row=>row.task==='plural'));
assert.deepEqual(new Set(all.filter(row=>row.count>1).map(row=>nouns.get(row.noun).plural)),new Set(['books','pens','dolls','dogs','lizards','bags']));

const foundation=content.foundationWords.slice(53);
assert.deepEqual(foundation.map(word=>word.id),['rubber','doll','car','ball','puzzle','teddy','rabbit','rat','lizard','hat','chair']);
assert.equal(content.foundationWords.length,64);assert(!content.foundationWords.some(word=>word.id==='pencil case'));
for(const word of foundation){assert.equal(word.phrase,"It's a "+word.id+'.');assert.equal(word.gap,"It's a ___.");}
const wordPack=content.wordPacks[8];
assert.equal(wordPack.id,'worksheet-nov8');assert.equal(wordPack.wordOnly,true);
assert.deepEqual(wordPack.words,['bag','pencil','pen','rubber','book','desk','doll','car','ball','puzzle','teddy','rabbit','cat','rat','dog','lizard','hat','sharpener','notebook','chair']);
assert.equal(new Set(wordPack.words).size,20);assert(wordPack.words.every(id=>content.foundationWords.some(word=>word.id===id)));

const source=fs.readFileSync('dist/grammar.js','utf8');
const helperStart=source.indexOf('function phases('),helperEnd=source.indexOf(' function question(',helperStart);
assert(helperStart>=0&&helperEnd>helperStart);
const helpers=vm.runInNewContext('(()=>{'+source.slice(helperStart,helperEnd)+';return {phases,phaseMode};})()',Object.create(null));
const sequences={
 'short-question':[['model','grammar-model'],['short-answer','grammar-choice'],['short-write','grammar-write']],
 identify:[['model','grammar-model'],['identify-build','grammar-build'],['identify-write','grammar-write']],
 'prefix-choice':[['model','grammar-model'],['prefix-choice','grammar-choice']],
 'prefix-write':[['model','grammar-model'],['prefix-write','grammar-write']],
 'short-gap':[['model','grammar-model'],['short-gap','grammar-choice']]
};
for(const [task,sequence] of Object.entries(sequences)){
 assert.deepEqual([...helpers.phases({task})],sequence.map(row=>row[0]),'An exercise type has its own pedagogically accurate steps');
 assert.deepEqual(sequence.map(([phase])=>helpers.phaseMode(phase)),sequence.map(row=>row[1]));
}
// A saved plan is validated as a snapshot, without looking up an active/live pack.
const canonicalStart=source.indexOf('function canonical('),canonicalEnd=source.indexOf(' function snapshot(',canonicalStart);
assert(canonicalStart>=0&&canonicalEnd>canonicalStart);
const canonical=vm.runInNewContext('('+source.slice(canonicalStart,canonicalEnd).trim()+')',{
 MAX_AGE:604800000,trackValid:value=>/^grammar:(?:number|plurals|articles|sentences|questions|toys-yes-no|whats-this|it-they-choice|it-they-write|is-this|short-answer-gap)$/.test(value||''),
 phases:helpers.phases,phaseMode:helpers.phaseMode
});
for(const pack of grammar.packs){
 const row=pack.cases[0],noun=nouns.get(row.noun),sequence=[...helpers.phases(row)];
 const plan=sequence.map(phase=>({item:'grammar:'+row.id,mode:helpers.phaseMode(phase),grammar:{...row,nounData:noun,pack:pack.id,phase},answer:phase==='question-build'?row.question:row.answer,aliases:phase==='question-build'?[]:[...row.aliases],choices:[...row.choices],tokens:[...(phase==='question-build'?row.questionTokens:row.tokens)],topic:pack.title}));
 const frozen={token:'ab'.repeat(16),track:'grammar:'+pack.id,plan,step:1,total:plan.length,createdAt:Date.now(),hint:1,helped:true,errors:0,done:false};
 const resumed=canonical(frozen);
 assert.equal(JSON.stringify(resumed.plan),JSON.stringify(plan),'Resuming preserves the old word, quantity, model, choices and phases for '+pack.id);
 assert.equal(resumed.hint,1);assert.equal(resumed.helped,true);
}
const start=source.indexOf('function grammarObjectSvg('),end=source.indexOf('\n function objectArt',start);
assert(start>=0&&end>start);
const art=vm.runInNewContext('('+source.slice(start,end).trim()+')',Object.create(null));
const newArt=['doll','car','ball','puzzle','teddy','rabbit','cat','rat','dog','lizard','hat'];
const drawings=newArt.map(name=>art('grammar-'+name));
assert.equal(new Set(drawings).size,11,'Eleven distinct original shapes, not one placeholder reused');
for(const [index,svg] of drawings.entries()){
 assert(svg.startsWith('<svg xmlns='));assert.equal((svg.match(/<svg/g)||[]).length,1);
 assert(svg.includes('viewBox="0 0 120 120"'));assert(svg.includes('data-grammar-art="grammar-'+newArt[index]+'"'));
 assert(!/<script|<image|\bon\w+=|https?:\/\/(?!www\.w3\.org)/i.test(svg),'SVG uses only local vector geometry, without scripts or remote content');
}
assert.equal(art('grammar-pencil-case'),'','The source does not manufacture an unpictured pencil-case activity');
console.log(JSON.stringify({status:'passed',newCases:35,totalCases:75,totalNouns:30,totalGrammarPacks:11,newDrawings:11,newFoundationWords:11,newWordPackWords:20,source:'five teacher worksheets shared8November2026',checks:['hand-transcribed picture/question/answer matrix','Is it and Is this remain distinct','British rubber and bag retained','It is / They are balanced one-many exercises','complete is/isn’t response frames','pencil case remains question target only','no automatically generated plural drills','word-only spelling pack preserves previous records','eleven original countable SVG illustrations','all eleven frozen task plans retain their values and saved help'],network:false,realAccounts:false}));
