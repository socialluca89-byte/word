// Curated classroom grammar and immutable legacy catalogs; no account/server/network.
import assert from 'node:assert/strict';
import fs from 'node:fs';
import {execFileSync} from 'node:child_process';
import {createHash} from 'node:crypto';

const baseline='38434fc64717b8ba9d68ae3b3deaefa7a76dbeae';
const previous=execFileSync('git',['show',baseline+':dist/training.json'],{encoding:'utf8'});
const raw=fs.readFileSync('dist/training.json','utf8'),content=JSON.parse(raw),allGrammar=content.grammarLessons;
const original=JSON.parse(previous),legacy={...content};delete legacy.grammarLessons;
for(const [field,value] of Object.entries(original)){
 if(field==='foundationWords')assert.deepEqual(content[field].slice(0,53),value,'All53 old foundation records retain every value');
 else if(field==='wordPacks')assert.deepEqual(content[field].slice(0,8),value,'All8 old word packs retain every value');
 else assert.deepEqual(legacy[field],value,'Legacy field remains immutable: '+field);
}
assert.deepEqual(Object.keys(legacy).sort(),Object.keys(original).sort(),'No unrelated top-level learning catalog introduced');
const grammarBaseline=JSON.parse(execFileSync('git',['show','7f03b579c14e647191779df685b6de4c45bd3beb:dist/training.json'],{encoding:'utf8'})).grammarLessons;
assert.deepEqual(allGrammar.nouns.slice(0,16),grammarBaseline.nouns,'The16 existing noun records retain every value');
assert.deepEqual(allGrammar.packs.slice(0,5),grammarBaseline.packs,'All40 existing cases, models, hints and answers retain every value');
const grammar={...allGrammar,nouns:allGrammar.nouns.slice(0,16),packs:allGrammar.packs.slice(0,5)};
assert.equal(content.foundationWords.length,64);assert.equal(content.wordPacks.length,9);assert.equal(content.sentenceActivities.length,12);assert.equal(content.instructionActivities.length,8);
assert.equal(allGrammar.nouns.length,30);assert.equal(allGrammar.packs.length,11);assert.equal(allGrammar.packs.reduce((count,pack)=>count+pack.cases.length,0),75);
assert.equal(grammar.version,1);assert.equal(grammar.title,'Grammatica della classe');
assert.deepEqual(Object.keys(grammar).sort(),['nouns','packs','title','version']);

// Independent linguistic oracle: no plural-generation algorithm or legacy noun inference.
const expected=[
 ['pencil','pencil','pencils','a','pencil'],['door','door','doors','a','grammar-door'],
 ['ruler','ruler','rulers','a','grammar-ruler'],['chair','chair','chairs','a','grammar-chair'],
 ['book','book','books','a','book'],['table','table','tables','a','grammar-table'],
 ['egg','egg','eggs','an','grammar-egg'],['apple','apple','apples','an','grammar-apple'],
 ['cup','cup','cups','a','grammar-cup'],['notebook','notebook','notebooks','a','notebook'],
 ['pen','pen','pens','a','pen'],['eraser','eraser','erasers','an','eraser'],
 ['pencil-sharpener','pencil sharpener','pencil sharpeners','a','sharpener'],
 ['book-bag','book bag','book bags','a','bookbag'],['glue-stick','glue stick','glue sticks','a','glue stick'],
 ['desk','desk','desks','a','desk']
];
assert.equal(grammar.nouns.length,16);
assert.deepEqual(grammar.nouns.map(n=>[n.id,n.singular,n.plural,n.article,n.art]),expected);
const nouns=new Map(grammar.nouns.map(n=>[n.id,n]));assert.equal(nouns.size,16);
const norm=s=>s.normalize('NFKC').replace(/[’‘]/g,"'").toLowerCase().trim().replace(/[,]/g,'').replace(/[.!?]+$/,'').replace(/\s+/g,' ');
const validText=value=>assert(typeof value==='string'&&value.trim().length>0);
const newArt=[];
for(const noun of nouns.values()){
 assert.deepEqual(Object.keys(noun).sort(),['art','article','id','meaning','plural','pluralAliases','pluralMeaning','singular','singularAliases']);
 assert.match(noun.id,/^[a-z][a-z-]+$/);validText(noun.meaning);validText(noun.pluralMeaning);
 assert.equal(noun.singular,noun.singular.trim());assert.equal(noun.plural,noun.plural.trim());
 assert(!['scissors','crayons','boy'].includes(noun.singular),'Plural-only vocabulary and people do not become automatically generated singular-object tasks');
 for(const field of ['singularAliases','pluralAliases']){assert(Array.isArray(noun[field]));assert.equal(new Set(noun[field].map(norm)).size,noun[field].length);noun[field].forEach(validText);}
 if(noun.art.startsWith('grammar-'))newArt.push(noun.art);else assert(Object.hasOwn(content.classroomArt.cells,noun.art),'Reused art refers to one known Classroom object');
}
assert.deepEqual(newArt,['grammar-door','grammar-ruler','grammar-chair','grammar-table','grammar-egg','grammar-apple','grammar-cup']);
assert.equal(grammar.nouns.filter(n=>!n.art.startsWith('grammar-')).length,9);
assert.deepEqual(nouns.get('book-bag').singularAliases,['bookbag']);assert.deepEqual(nouns.get('book-bag').pluralAliases,['bookbags']);
assert.deepEqual(nouns.get('pencil-sharpener').singularAliases,['sharpener']);assert.deepEqual(nouns.get('pencil-sharpener').pluralAliases,['sharpeners']);

const packs=grammar.packs;
assert.deepEqual(packs.map(p=>p.id),['number','plurals','articles','sentences','questions']);
assert.deepEqual(packs.map(p=>p.cases.length),[8,16,6,6,4]);
const taskByPack={number:'number',plurals:'plural',articles:'article',sentences:'sentence',questions:'question'},all=packs.flatMap(p=>p.cases);
assert.equal(all.length,40);assert.equal(new Set(all.map(c=>c.id)).size,40);
const keys=['id','noun','count','task','prompt','answer','aliases','explanation','choices','tokens','audio'];
for(const pack of packs){
 assert.deepEqual(Object.keys(pack).sort(),['cases','description','icon','id','tip','title']);
 for(const field of ['title','description','icon','tip'])validText(pack[field]);
 for(const c of pack.cases){
  const n=nouns.get(c.noun);assert(n,'Every case uses one explicit curated noun');
  assert.deepEqual(Object.keys(c).sort(),[...keys,...(pack.id==='questions'?['question','questionTokens','questionExplanation']:[])].sort());
  assert.match(c.id,/^[a-z][a-z0-9-]{2,63}$/);assert(Number.isInteger(c.count)&&c.count>=1&&c.count<=4);
  assert.equal(c.task,taskByPack[pack.id]);for(const field of ['prompt','answer','explanation','audio'])validText(c[field]);
  assert(c.explanation.length>=20);assert(Array.isArray(c.aliases)&&Array.isArray(c.choices)&&Array.isArray(c.tokens));
  assert(c.tokens.length>0&&c.tokens.length<=6);assert(c.tokens.every(t=>typeof t==='string'&&t.length>0&&!/\s/.test(t)));
  assert.equal(c.tokens.join(' '),c.answer,'Canonical word tiles reconstruct the complete answer: '+c.id);
  const accepted=[c.answer,...c.aliases].map(norm);assert.equal(new Set(accepted).size,accepted.length,'No duplicated normalized alias');
  assert.equal(new Set(c.choices.map(norm)).size,c.choices.length,'Choices do not duplicate equivalent forms');
  assert.equal(c.choices.length?c.choices.filter(x=>accepted.includes(norm(x))).length:1,1,'Exactly one visible answer, not a synonym treated as a wrong choice');
  if(pack.id!=='questions')assert.equal(c.audio,n.singular,'The input audio names the noun, not the article or completed grammatical answer');
  if(c.task==='number'){
   assert.equal(c.answer,c.count===1?n.singular:n.plural);assert.deepEqual(c.choices,[n.singular,n.plural]);assert.equal(c.aliases.length,0);
  }else if(c.task==='plural'){
   assert(c.count>1);assert.equal(c.answer,n.plural);assert.equal(c.choices.length,3);
   for(const option of c.choices.filter(x=>x!==c.answer))assert(!n.pluralAliases.map(norm).includes(norm(option)),'A valid alternate plural is never a wrong distractor');
  }else if(c.task==='article'){
   assert.equal(c.count,1);assert.equal(c.answer,n.article);assert.deepEqual(c.choices,['a','an']);assert.deepEqual(c.aliases,[]);
  }else if(c.task==='sentence'){
   const wanted=c.count===1?'It is '+n.article+' '+n.singular+'.':'They are '+n.plural+'.';
   assert.equal(c.answer,wanted);assert.deepEqual(c.choices,[]);
   assert.deepEqual(c.aliases,c.count===1?["It's "+n.article+' '+n.singular+'.']:[]);
   if(c.count>1)assert(!/\b(?:a|an)\b/.test(c.answer),'Plural sentence has no singular indefinite article');
  }else{
   assert.equal(c.count,1);assert.deepEqual(c.choices,['Yes, it is.',"No, it isn't."]);
   assert.equal(c.questionTokens.join(' '),c.question);assert(c.questionTokens.every(t=>typeof t==='string'&&t.length>0&&!/\s/.test(t)));
   assert.equal(c.audio,c.question,'Question audio asks, never gives the yes/no answer');
   assert.match(c.question,/^Is it (?:a|an) [a-z ]+\?$/);validText(c.questionExplanation);assert(c.questionExplanation.includes(c.question));
   const match=c.question.match(/^Is it (a|an) ([a-z ]+)\?$/),asked=grammar.nouns.find(x=>x.singular===match[2]);assert(asked,'The named question object is independently curated');assert.equal(match[1],asked.article);
   const yes=asked.id===n.id;assert.equal(c.answer,yes?'Yes, it is.':"No, it isn't.");assert.deepEqual(c.aliases,yes?[]:['No, it is not.',"No, it's not."]);
  }
 }
}
assert.deepEqual(packs[0].cases.map(c=>[c.noun,c.count]),[['pencil',1],['pencil',3],['book',1],['book',2],['chair',1],['chair',4],['apple',1],['apple',2]]);
assert.equal(packs[0].cases.filter(c=>c.count===1).length,4);assert.equal(packs[0].cases.filter(c=>c.count>1).length,4);
assert.deepEqual(packs[1].cases.map(c=>c.noun),expected.map(r=>r[0]),'Every one of the16 nouns has exactly one plural case');
assert.deepEqual(packs[1].cases.find(c=>c.noun==='pencil-sharpener').aliases,[],'Full-expression transformation asks for pencil sharpeners; the legitimate short form is explained, not offered as an error');
assert(packs[1].cases.find(c=>c.noun==='pencil-sharpener').explanation.includes('Anche sharpeners è corretto'));
assert.deepEqual(packs[1].cases.find(c=>c.noun==='book-bag').aliases,['bookbags']);
const pluralSlots=packs[1].cases.map(c=>c.choices.indexOf(c.answer));
assert.deepEqual([0,1,2].map(slot=>pluralSlots.filter(x=>x===slot).length),[6,5,5],'Plural choices balance the correct position instead of always putting it first');
assert.equal(packs[2].cases.filter(c=>c.answer==='a').length,3);assert.equal(packs[2].cases.filter(c=>c.answer==='an').length,3);
assert.equal(packs[3].cases.filter(c=>c.count===1).length,3);assert.equal(packs[3].cases.filter(c=>c.count>1).length,3);
assert.equal(packs[4].cases.filter(c=>c.answer==='Yes, it is.').length,2);assert.equal(packs[4].cases.filter(c=>c.answer==="No, it isn't.").length,2);
const accepted=new Set(all.flatMap(c=>[c.answer,...c.aliases]).map(norm));
for(const error of ['a books','they is books','it are a book',"yes it's",'bookss','scissorss','crayonss','a eraser','an book','pencils sharpener'])assert(!accepted.has(norm(error)),'No invalid grammatical form becomes an accepted answer: '+error);
assert(packs[1].tip.includes('Per queste parole'),'The regular-s rule is scoped rather than claimed universal');
console.log(JSON.stringify({status:'passed',nouns:16,cases:40,packs:[8,16,6,6,4],reusedArt:9,newArt:7,legacyComparedTo:baseline,legacySHA256:createHash('sha256').update(previous).digest('hex'),checks:['manual noun/article/plural oracle','single-object art identifiers and counts1–4','all five task meanings and balanced article/yes-no cases','exact word/question token reconstruction','aliases retained without false distractors','prompt audio does not reveal grammatical answers','invalid forms excluded','all legacy values retained; new teacher materials append to immutable prefixes'],network:false,realAccounts:false}));
