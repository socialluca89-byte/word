import fs from 'node:fs';
import vm from 'node:vm';
import os from 'node:os';
import path from 'node:path';
import assert from 'node:assert/strict';
import {spawnSync} from 'node:child_process';
const source=fs.readFileSync('dist/training.js','utf8'),boundary=source.indexOf('/* Small, private practice paths.');assert(boundary>0,'The recommendation policy stays pure and separate from browser state');
const context=vm.createContext({});vm.runInContext(source.slice(0,boundary),context);
const choose=(content,evidence={},sessions=[])=>JSON.parse(JSON.stringify(context.wordylandTrainingRecommendation(content,evidence,sessions)));
const content=JSON.parse(fs.readFileSync('dist/training.json','utf8')),cases=JSON.parse(fs.readFileSync('scripts/fixtures/training-guidance.json','utf8'));
for(const fixture of cases){const before=JSON.stringify(fixture);assert.deepEqual(choose(content,fixture.evidence,fixture.sessions),fixture.expected,fixture.name);assert.equal(JSON.stringify(fixture),before,'Policy never mutates observations or sessions');}
const allSeen=[...content.letters.map(l=>'letter:'+l.id),...content.foundationWords.map(w=>'word:'+w.id)];assert.equal(choose(content,{seen:allSeen}).reason,'familiar','Explored catalog yields a gentle existing-topic repeat, never an invented level');assert.equal(choose({}),null);
// Read a finite fixture file: PHP CLI stream_get_contents(STDIN) can block on Node's synchronous pipe.
const temporary=fs.mkdtempSync(path.join(os.tmpdir(),'wordyland-guidance-policy-'));try{const input=path.join(temporary,'input.json');fs.writeFileSync(input,JSON.stringify({content,cases}));const php=spawnSync('php',['-r',`define('WORDYLAND_BOOTSTRAPPED',true);$action='__training_policy_test';require 'dist/training.php';$input=json_decode(file_get_contents($argv[1]),true,64,JSON_THROW_ON_ERROR);$out=[];foreach($input['cases'] as $case)$out[]=trainingRecommendation($input['content'],$case['evidence']??[],$case['sessions']??[]);echo json_encode($out,JSON_THROW_ON_ERROR);`,input],{encoding:'utf8',timeout:10000});assert.equal(php.status,0,php.stderr||php.error?.message);assert.deepEqual(JSON.parse(php.stdout),cases.map(f=>f.expected),'PHP and guest policies share the same expected decisions');}finally{fs.rmSync(temporary,{recursive:true,force:true});}
const guest={items:['letter:A','letter:E'],itemCounts:{'letter:A':2,'word:cat':1},letterPractice:{'A:reading':{recent:[{day:'2026-11-01',errors:1,independent:0},{day:'2026-11-02',errors:1,independent:0},{day:'2099-01-01',errors:100,independent:0}]}},wordPractice:{cat:{errors:100}}};
const evidence=context.wordylandGuestTrainingEvidence(guest,'2026-11-02');assert.equal(evidence.practice[0].errorDays,2);assert.equal(evidence.practice[0].errors,2);assert(evidence.practice.every(row=>row.item.startsWith('letter:')),'Absent guest word-error history is never invented');assert.equal(choose(content,evidence).reason,'review');guest.letterPractice['A:reading'].recent[0].day='2026-11-02';assert.notEqual(choose(content,context.wordylandGuestTrainingEvidence(guest,'2026-11-02')).reason,'review','Repeated rows on one date do not become multiple recorded days');
console.log('Training guidance policy passed: resume priority, repeated observed days, help/one-error safeguards, separate skills, existing blocks/packs, honest guest limits, novelty balance and JS/PHP parity. No time or mastery guarantee.');
