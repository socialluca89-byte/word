// Curated, additive content contracts; no server, account or remote request.
import assert from 'node:assert/strict';
import fs from 'node:fs';
import {createHash} from 'node:crypto';

const content=JSON.parse(fs.readFileSync('dist/training.json','utf8'));
const stable=v=>Array.isArray(v)?v.map(stable):v&&typeof v==='object'?Object.fromEntries(Object.keys(v).sort().map(k=>[k,stable(v[k])])):v;
const digest=v=>createHash('sha256').update(JSON.stringify(stable(v))).digest('hex');
const checks=[];
const pass=name=>checks.push(name);
const normalize=s=>s.trim().replace(/[.!?]+$/,'').replace(/\s+/g,' ').toLowerCase();
const originalCore=Object.fromEntries(['version','title','letters','blocks','words','stickers','phonics'].map(k=>[k,content[k]]));
assert.equal(digest(originalCore),'55ecbd6e8c2cd6e0b665f4699986397ca433f37a385810ee56c8f34531f7cebd','Letters, old six-word clients, phonics, rewards and core metadata remain unchanged');
assert.equal(digest(content.foundationWords.slice(0,43)),'b0a0754baf6c476b90429be28258f20b20fa1f984bcc927e9061c5b0cb6cc95e','The original43word records keep spelling, meaning, phrases and hints');
assert.equal(digest(content.wordPacks.slice(0,7)),'67884808a5ffdebd068fcea92ef9d846086bc9f7ffc2d3b5c9d24f0b6d560564','All seven original pack IDs, order and contents remain unchanged');
pass('legacy43words/sevenpacks/letters/phonics/stickers preserved');

assert.equal(content.foundationWords.length,53);
assert.equal(content.wordPacks.length,8);
const words=new Map(content.foundationWords.map(w=>[w.id,w]));
assert.equal(words.size,53,'No repeated word IDs');
assert.equal(new Set(content.wordPacks.map(p=>p.id)).size,8);
for(const p of content.wordPacks){assert(p.words.length>0);assert.equal(new Set(p.words).size,p.words.length);for(const id of p.words)assert(words.has(id),'Every referenced word exists: '+id);}
const numbers=['one','two','three','four','five','six','seven','eight','nine','ten','eleven','twelve','thirteen','fourteen','fifteen','sixteen','seventeen','eighteen','nineteen','twenty'];
const italian=['undici','dodici','tredici','quattordici','quindici','sedici','diciassette','diciotto','diciannove','venti'];
assert.deepEqual(content.wordPacks.find(p=>p.id==='numbers').words,numbers.slice(0,10));
assert.deepEqual(content.wordPacks.find(p=>p.id==='numbers-teens').words,numbers.slice(10));
numbers.forEach(id=>assert(words.has(id),'Complete guided1–20 coverage: '+id));
numbers.slice(10).forEach((id,i)=>{const w=words.get(id);assert.equal(w.meaning,italian[i]);assert.equal(w.emoji,String(i+11));assert.equal(w.phrase,'I see '+id+' stars.');assert.equal(w.phraseMeaning,'Vedo '+italian[i]+' stelle.');assert.equal(w.gap.replace('___',id),w.phrase);});
assert.equal(words.get('one').phrase,'I see one star.','Singular one stays distinct from plural numbers');
pass('ten new number spellings and quantities complete1–20 without replacing old pack');

const sentences=content.sentenceActivities;
assert.equal(sentences.length,12);assert.equal(new Set(sentences.map(s=>s.id)).size,12);
assert.equal(new Set(sentences.map(s=>normalize(s.answer))).size,12);
for(const s of sentences){
 assert.match(s.id,/^[a-z][a-z0-9-]{1,39}$/);
 assert.match(s.answer,/^[A-Z][A-Za-z ]+\.$/);
 assert(Array.isArray(s.tokens)&&s.tokens.length>=4&&s.tokens.length<=8);
 assert(s.tokens.every(t=>/^[A-Za-z]+$/.test(t)),'Whole word tiles, not punctuation or phonemes');
 assert.equal(normalize(s.tokens.join(' ')),normalize(s.answer),'No missing/repeated/misordered source token: '+s.id);
 assert(typeof s.meaning==='string'&&s.meaning.length>=8);
}
for(const relation of ['in','on','under'])assert(sentences.some(s=>s.answer==='The cat is '+relation+' the box.'),'Three distinct, already taught position phrases');
assert(sentences.some(s=>s.answer==='I have blue crayons.'),'Plural crayons takes no indefinite singular article');
assert(sentences.some(s=>s.answer==='This is my bookbag.'),'Worksheet bookbag remains one word');
pass('twelve original sentence models have exact whole-word reconstruction and curated grammar');

const instructions=content.instructionActivities,positions=new Set();
assert.equal(instructions.length,8);assert.equal(new Set(instructions.map(s=>s.id)).size,8);
assert.equal(new Set(instructions.map(s=>s.instruction)).size,8);
for(const activity of instructions){
 assert.match(activity.id,/^[a-z][a-z0-9-]{1,39}$/);
 assert.match(activity.instruction,/^[A-Z][A-Za-z ]+\.$/);
 assert(typeof activity.meaning==='string'&&activity.meaning.length>=8);
 assert.equal(activity.choices.length,3);
 assert.equal(new Set(activity.choices.map(c=>c.id)).size,3,'No equivalent duplicate choice');
 assert.equal(new Set(activity.choices.map(c=>c.label)).size,3);
 assert(activity.choices.every(c=>typeof c.id==='string'&&typeof c.label==='string'&&typeof c.icon==='string'&&!/https?:|data:/i.test(c.icon)));
 const right=activity.choices.findIndex(c=>c.id===activity.answer);assert(right>=0);positions.add(right);
}
assert.equal(positions.size,3,'Correct source answer is not a fixed slot; API must also shuffle');
const stars=instructions.find(s=>s.id==='point-three-stars');assert.equal(stars.answer,'three-stars');
for(const c of stars.choices){const n=(c.icon.match(/⭐/g)||[]).length;assert.equal(n,{'three-stars':3,'one-star':1,'two-stars':2}[c.id]);}
assert.equal(instructions.find(s=>s.id==='point-red-circle').answer,'red-circle');
assert.equal(instructions.find(s=>s.id==='open-book').choices.find(c=>c.id==='open-book').icon,'📖');
pass('eight instructions offer three distinct accurate choices, varied correct slots and real visual counts');

const classroom=['pencil','pen','book','eraser','scissors','glue stick','crayons','notebook','sharpener','marker','bookbag','desk'];
const art=content.classroomArt;
assert.deepEqual(content.wordPacks.find(p=>p.id==='classroom').words,classroom);
assert.deepEqual(Object.keys(art.cells),classroom);
assert.equal(art.columns,4);assert.equal(art.rows,3);
classroom.forEach((word,i)=>assert.deepEqual(art.cells[word],[i%4,Math.floor(i/4)]));
for(const field of ['source','sourcePng','sourceWebp'])if(art[field])assert.match(art[field],/^classroom-objects\.(?:png|webp)(?:\?v=[a-f0-9]{12})?$/,'Only a local attested asset URL');
const png=fs.readFileSync('dist/classroom-objects.png');
assert.equal(png.subarray(0,8).toString('hex'),'89504e470d0a1a0a');
const width=png.readUInt32BE(16),height=png.readUInt32BE(20);
assert.equal(width%4,0);assert.equal(height%3,0);assert.equal(width/4,height/3,'Square sprite cells aligned exactly');
const source=JSON.parse(fs.readFileSync('docs/CLASSROOM_ART_SOURCE.json','utf8'));
assert.equal(createHash('sha256').update(png).digest('hex'),source.original_sha256,'Generated PNG is preserved without retouch');
assert.deepEqual(source.order,classroom);
assert.equal(words.get('glue stick').id,'glue stick');assert.equal(words.get('scissors').id,'scissors');assert.equal(words.get('crayons').id,'crayons');
pass('twelve worksheet objects map to twelve distinct original atlas cells; sourcePNG retained');

assert.equal(content.phonics.phonemeAudioAvailable,false,'Content never pretends new phoneme recordings exist');
assert.equal(content.phonics.guidedOnly,true);
assert(!JSON.stringify(content).toLowerCase().includes('grinch'),'Unrelated denied character is not silently activated');
pass('audio limitations explicit; no denied or substitute character activated');
console.log(JSON.stringify({status:'passed',checks,words:words.size,packs:content.wordPacks.length,sentences:sentences.length,instructions:instructions.length,art:{width,height,columns:4,rows:3},scope:'Static curated-content contracts only; UI/API/real voice review remain separate.'}));
