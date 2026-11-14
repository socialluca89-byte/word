<?php
/** Private profile training. No wallet, points, rankings, diagnosis, or recorded voice. */
declare(strict_types=1);
if(!defined('WORDYLAND_BOOTSTRAPPED')){http_response_code(404);exit;}
if(in_array($action,['phonics-state','phonics-start','phonics-hint','phonics-answer','phonics-progress'],true)){require_once __DIR__.'/class-program.php';phonicsHandle($db,$id,$method,$body,$accountRole,$action);}
$trainingActions=['training-state','training-start','training-hint','training-answer','training-progress'];
if(!in_array($action,$trainingActions,true))return;
require_once __DIR__.'/class-program.php';
$db->exec('CREATE TABLE IF NOT EXISTS training_totals(profile_id INTEGER PRIMARY KEY REFERENCES profiles(id) ON DELETE CASCADE,sessions INTEGER NOT NULL,first_day TEXT NOT NULL,last_day TEXT NOT NULL);
CREATE TABLE IF NOT EXISTS training_items(profile_id INTEGER NOT NULL REFERENCES profiles(id) ON DELETE CASCADE,item TEXT NOT NULL,skill TEXT NOT NULL,completed INTEGER NOT NULL DEFAULT 0,independent INTEGER NOT NULL DEFAULT 0,guided INTEGER NOT NULL DEFAULT 0,errors INTEGER NOT NULL DEFAULT 0,replays INTEGER NOT NULL DEFAULT 0,independent_days INTEGER NOT NULL DEFAULT 0,last_independent_day TEXT,PRIMARY KEY(profile_id,item,skill));
CREATE TABLE IF NOT EXISTS training_sessions(token TEXT PRIMARY KEY,profile_id INTEGER NOT NULL REFERENCES profiles(id) ON DELETE CASCADE,track TEXT NOT NULL,plan TEXT NOT NULL,step INTEGER NOT NULL DEFAULT 0,helped INTEGER NOT NULL DEFAULT 0,errors INTEGER NOT NULL DEFAULT 0,hint INTEGER NOT NULL DEFAULT 0,last_attempt TEXT,created_at INTEGER NOT NULL,completed_at INTEGER);
CREATE TABLE IF NOT EXISTS training_daily(profile_id INTEGER NOT NULL REFERENCES profiles(id) ON DELETE CASCADE,day TEXT NOT NULL,item TEXT NOT NULL,skill TEXT NOT NULL,completed INTEGER NOT NULL DEFAULT 0,independent INTEGER NOT NULL DEFAULT 0,guided INTEGER NOT NULL DEFAULT 0,errors INTEGER NOT NULL DEFAULT 0,replays INTEGER NOT NULL DEFAULT 0,PRIMARY KEY(profile_id,day,item,skill));
CREATE TABLE IF NOT EXISTS training_stickers(profile_id INTEGER NOT NULL REFERENCES profiles(id) ON DELETE CASCADE,sticker TEXT NOT NULL,earned_day TEXT NOT NULL,PRIMARY KEY(profile_id,sticker));');
$db->exec('CREATE TABLE IF NOT EXISTS training_choice_steps(profile_id INTEGER NOT NULL REFERENCES profiles(id) ON DELETE CASCADE,item TEXT NOT NULL,skill TEXT NOT NULL,choice_count INTEGER NOT NULL CHECK(choice_count IN (3,4)),independent INTEGER NOT NULL DEFAULT 0,independent_days INTEGER NOT NULL DEFAULT 0,last_day TEXT NOT NULL,PRIMARY KEY(profile_id,item,skill,choice_count));');
// Separate additive storage keeps new plans invisible if application files are rolled back.
$db->exec('CREATE TABLE IF NOT EXISTS training_grammar_sessions(token TEXT PRIMARY KEY,profile_id INTEGER NOT NULL REFERENCES profiles(id) ON DELETE CASCADE,track TEXT NOT NULL CHECK(track LIKE "grammar:%"),plan TEXT NOT NULL,step INTEGER NOT NULL DEFAULT 0,helped INTEGER NOT NULL DEFAULT 0,errors INTEGER NOT NULL DEFAULT 0,hint INTEGER NOT NULL DEFAULT 0,last_attempt TEXT,created_at INTEGER NOT NULL,completed_at INTEGER);');
$db->exec('CREATE TABLE IF NOT EXISTS training_worksheet_sessions(token TEXT PRIMARY KEY,profile_id INTEGER NOT NULL REFERENCES profiles(id) ON DELETE CASCADE,track TEXT NOT NULL CHECK(track LIKE "grammar:%"),plan TEXT NOT NULL,step INTEGER NOT NULL DEFAULT 0,helped INTEGER NOT NULL DEFAULT 0,errors INTEGER NOT NULL DEFAULT 0,hint INTEGER NOT NULL DEFAULT 0,last_attempt TEXT,created_at INTEGER NOT NULL,completed_at INTEGER);');
// Version3 plans stay invisible to3614 rollback and cached clients without capability.
$db->exec('CREATE TABLE IF NOT EXISTS training_best2_word_sessions(token TEXT PRIMARY KEY,profile_id INTEGER NOT NULL REFERENCES profiles(id) ON DELETE CASCADE,track TEXT NOT NULL CHECK(track LIKE "words:%"),plan TEXT NOT NULL,step INTEGER NOT NULL DEFAULT 0,helped INTEGER NOT NULL DEFAULT 0,errors INTEGER NOT NULL DEFAULT 0,hint INTEGER NOT NULL DEFAULT 0,last_attempt TEXT,created_at INTEGER NOT NULL,completed_at INTEGER);
CREATE TABLE IF NOT EXISTS training_best2_grammar_sessions(token TEXT PRIMARY KEY,profile_id INTEGER NOT NULL REFERENCES profiles(id) ON DELETE CASCADE,track TEXT NOT NULL CHECK(track LIKE "grammar:%"),plan TEXT NOT NULL,step INTEGER NOT NULL DEFAULT 0,helped INTEGER NOT NULL DEFAULT 0,errors INTEGER NOT NULL DEFAULT 0,hint INTEGER NOT NULL DEFAULT 0,last_attempt TEXT,created_at INTEGER NOT NULL,completed_at INTEGER);');
$trainingProfile=ownedProfile($db,$id,$method==='GET'?($_GET['profile']??0):($body['profile']??0));$tp=(int)$trainingProfile['id'];
if($action==='training-progress'){
    if(!in_array($accountRole,['adult','admin'],true))fail('I progressi sono riservati all’adulto che gestisce i propri profili.',403);
    if($method!=='GET')fail('Metodo non consentito.',405);
    respond(trainingProgress($db,$tp));
}
if($action==='training-state'){
    if($method!=='GET')fail('Metodo non consentito.',405);
    if(isset($_GET['token']))respond(['session'=>trainingSnapshot(trainingOwnedSession($db,$tp,(string)$_GET['token'])),'stickers'=>trainingStickers($db,$tp)]);
    // Select trusted storage before LIMIT32; old application code only knows training_sessions.
    $grammar=($_GET['grammar']??null)==='1';$sessionTables=$grammar?['training_grammar_sessions','training_worksheet_sessions']:['training_sessions'];$active=[];
    if(trainingSchemaReady())$sessionTables[]=$grammar?'training_best2_grammar_sessions':'training_best2_word_sessions';
    $hasWorksheets=false;foreach($sessionTables as $sessionTable){$incoming=rows($db,'SELECT t.rowid AS _rowid,t.* FROM '.$sessionTable.' t WHERE t.profile_id=? AND t.completed_at IS NULL AND t.created_at>=? AND '.cpVisibleSessionSql('training','t.token','t.profile_id').' ORDER BY t.rowid DESC LIMIT 32',[$tp,time()-604800]);if(in_array($sessionTable,['training_worksheet_sessions','training_best2_word_sessions','training_best2_grammar_sessions'],true)&&$incoming)$hasWorksheets=true;$active=array_merge($active,array_map(fn($s)=>trainingMarkSession($s,$sessionTable),$incoming));}
    $active=array_values(array_filter($active,fn($s)=>trainingProgramAccessible($db,$tp,'training',$s['token'])));
    if($hasWorksheets)usort($active,fn($a,$b)=>((int)$b['created_at']<=>(int)$a['created_at'])?:((int)$b['_rowid']<=>(int)$a['_rowid']));$active=array_slice($active,0,32);
    $snapshots=array_map('trainingSnapshot',$active);$context=cpResolveContext($db,$tp);$recommendation=null;
    if(in_array($context['mode'],['legacy','class'],true)){$eligible=array_values(array_filter($active,fn($s)=>cpSessionMatches($db,$tp,'training',$s['token'],$context)));$recommendation=trainingRecommendation(trainingCompatibleContent(cpFilterTrainingContent(trainingContent(),$context),trainingSchemaReady()),trainingRecommendationEvidence($db,$tp),array_map('trainingSnapshot',$eligible));}
    respond(['sessions'=>$snapshots,'stickers'=>trainingStickers($db,$tp),'recommendation'=>$recommendation]);
}
if($method!=='POST')fail('Metodo non consentito.',405);
if($action==='training-start'){
    $track=$body['track']??'letters';$block=$body['block']??'ae';
    if(in_array($track,['words','grammar'],true)&&is_string($body['pack']??null)&&trainingPlanNeedsV3($track,$body['pack'],[]))trainingRequireSchema();
    $context=cpResolveContext($db,$tp,$body);cpRequirePlayable($context);$content=cpFilterTrainingContent(trainingContent(),$context);
    if(!is_string($track)||!in_array($track,['letters','words','sentences','instructions','grammar'],true))fail('Scegli un percorso disponibile.');
    if($track==='letters'&&!in_array($block,array_column($content['blocks'],'id'),true))fail('Scegli un blocco disponibile.');
    $pack=in_array($track,['words','grammar'],true)?($body['pack']??'first'):'first';
    if($track==='words'&&(!is_string($pack)||!in_array($pack,array_column($content['wordPacks'],'id'),true)))fail('Scegli un gruppo di parole disponibile.');
    if($track==='grammar'&&(!is_string($pack)||!in_array($pack,array_column($content['grammarLessons']['packs']??[],'id'),true)))fail('Scegli un percorso di grammatica disponibile.');
    $newPlan=trainingPlanNeedsV3($track,$pack,$content);if($newPlan)trainingRequireSchema();
    $key=$track==='letters'?'letters:'.$block:($track==='words'?($pack==='first'?'words':'words:'.$pack):($track==='grammar'?'grammar:'.$pack:$track.':basics'));limitAttempts($db,'training-start:'.$tp,60);
    $sessionTable=$newPlan?($track==='grammar'?'training_best2_grammar_sessions':'training_best2_word_sessions'):($track==='grammar'?(in_array($pack,['number','plurals','articles','sentences','questions'],true)?'training_grammar_sessions':'training_worksheet_sessions'):'training_sessions');
    $db->exec('BEGIN IMMEDIATE');$context=cpResolveContext($db,$tp,$body);cpRequirePlayable($context);$content=cpFilterTrainingContent(trainingContent(),$context);if(trainingPlanNeedsV3($track,$pack,$content))trainingRequireSchema();
    $old=null;foreach(rows($db,'SELECT * FROM '.$sessionTable.' WHERE profile_id=? AND track=? AND completed_at IS NULL AND created_at>=? ORDER BY rowid DESC LIMIT 32',[$tp,$key,time()-604800]) as $candidate)if(cpSessionMatches($db,$tp,'training',$candidate['token'],$context)){$old=$candidate;break;}
    if($old){$db->exec('COMMIT');respond(['session'=>trainingSnapshot(trainingMarkSession($old,$sessionTable)),'stickers'=>trainingStickers($db,$tp)]);}
    $plan=trainingPlan($db,$tp,$track,$block,$content,$pack);if(!$plan){$db->exec('ROLLBACK');fail('Questo percorso non contiene ancora attività assegnate.',409);}$token=bin2hex(random_bytes(24));
    runSql($db,'INSERT INTO '.$sessionTable.'(token,profile_id,track,plan,created_at) VALUES(?,?,?,?,?)',[$token,$tp,$key,json_encode($plan,JSON_THROW_ON_ERROR),time()]);cpBindSession($db,$tp,'training',$token,$context);
    // Only the new training data has retention; no game/account/progress table is pruned.
    runSql($db,'DELETE FROM '.$sessionTable.' WHERE profile_id=? AND created_at<?',[$tp,time()-2592000]);
    runSql($db,'DELETE FROM training_daily WHERE profile_id=? AND day<?',[$tp,gmdate('Y-m-d',time()-90*86400)]);
    $db->exec('COMMIT');respond(['session'=>trainingSnapshot(trainingOwnedSession($db,$tp,$token)),'stickers'=>trainingStickers($db,$tp)]);
}
$token=is_string($body['token']??null)?$body['token']:'';$step=$body['step']??null;
if(!is_int($step)||$step<0)fail('Domanda non valida.');
$session=trainingOwnedSession($db,$tp,$token);
$db->exec('BEGIN IMMEDIATE');$session=trainingOwnedSession($db,$tp,$token);$sessionTable=trainingSessionTable($session);
if($step>(int)$session['step']){$db->exec('ROLLBACK');fail('Riprendi la domanda corrente.',409);}
if($step<(int)$session['step']||$session['completed_at']!==null){$db->exec('COMMIT');respond(['replayed'=>true,'session'=>trainingSnapshot($session),'stickers'=>trainingStickers($db,$tp)]);}
if($step!==(int)$session['step']){$db->exec('ROLLBACK');fail('Riprendi la domanda corrente.',409);}
if($action==='training-hint'){
    $level=$body['level']??1;if(!is_int($level)||!in_array($level,[1,2],true)){$db->exec('ROLLBACK');fail('Aiuto non valido.');}
    runSql($db,'UPDATE '.$sessionTable.' SET helped=1,hint=MAX(hint,CAST(? AS INTEGER)) WHERE token=?',[$level,$token]);$db->exec('COMMIT');
    respond(['session'=>trainingSnapshot(trainingOwnedSession($db,$tp,$token))]);
}
$attempt=$body['attempt']??'';
if(!is_string($attempt)||!preg_match('/^[a-f0-9]{16,64}$/',$attempt)){$db->exec('ROLLBACK');fail('Tentativo non valido.');}
if($session['last_attempt']===$attempt){$db->exec('COMMIT');respond(['correct'=>false,'replayed'=>true,'session'=>trainingSnapshot($session),'stickers'=>trainingStickers($db,$tp)]);}
$plan=json_decode($session['plan'],true,32,JSON_THROW_ON_ERROR);$q=$plan[$step];$answer=$body['answer']??'';
if(!is_string($answer)||strlen($answer)>100){$db->exec('ROLLBACK');fail('Risposta non valida.');}
$choiceCount=$body['choiceCount']??2;
if($q['mode']==='letter'){
    $mode=($body['audioUsed']??false)===true&&($body['letterAudioVerified']??false)===true?'listening':'reading';
    $maximum=count($q['choiceSets'][$mode]??$q['choices']);
    if(!is_int($choiceCount)||!in_array($choiceCount,[2,3,4],true)||$choiceCount>$maximum||((int)$session['hint']>0&&$choiceCount!==2)){$db->exec('ROLLBACK');fail('Riprendi il salvataggio per ritrovare le scelte di questa attività.',409);}
}
$isGrammar=str_starts_with($session['track'],'grammar:');
$correct=$isGrammar?trainingGrammarCorrect($q,$answer):($q['mode']==='model'||normalWord($answer)===normalWord($q['answer']));
if(!$correct){runSql($db,'UPDATE '.$sessionTable.' SET errors=errors+1,helped=MAX(helped,?),last_attempt=? WHERE token=?',[(int)(($body['helped']??false)===true),$attempt,$token]);cpRecordStep($db,$tp,'training',$token,$step,['item'=>$q['item'],'skill'=>trainingEvidenceSkill($q,$body,$isGrammar),'correct'=>false,'completed'=>false,'helped'=>(bool)$session['helped']||($body['helped']??false)===true||(int)$session['hint']>0,'errors'=>(int)$session['errors']+1,'replays'=>trainingReplays($body)]);$db->exec('COMMIT');respond(['correct'=>false,'session'=>trainingSnapshot(trainingOwnedSession($db,$tp,$token))]);}
$helped=(int)$session['helped']===1||($body['helped']??false)===true||in_array($q['mode'],['model','build','grammar-model'],true);
$independent=!$helped&&(int)$session['errors']===0;
$audio=($body['audioUsed']??false)===true;
$skill=trainingEvidenceSkill($q,$body,$isGrammar);
if($q['mode']==='letter'&&$independent&&$choiceCount>=3){
    runSql($db,'INSERT INTO training_choice_steps(profile_id,item,skill,choice_count,independent,independent_days,last_day) VALUES(?,?,?,?,1,1,?) ON CONFLICT(profile_id,item,skill,choice_count) DO UPDATE SET independent=independent+1,independent_days=independent_days+CASE WHEN last_day!=excluded.last_day THEN 1 ELSE 0 END,last_day=excluded.last_day',[$tp,$q['item'],$skill,$choiceCount,gmdate('Y-m-d')]);
}
$replays=trainingReplays($body);
runSql($db,'INSERT INTO training_daily(profile_id,day,item,skill,completed,independent,guided,errors,replays) VALUES(?,?,?,?,1,?,?,?,?) ON CONFLICT(profile_id,day,item,skill) DO UPDATE SET completed=completed+1,independent=independent+excluded.independent,guided=guided+excluded.guided,errors=errors+excluded.errors,replays=replays+excluded.replays',[$tp,gmdate('Y-m-d'),$q['item'],$skill,(int)$independent,(int)!$independent,(int)$session['errors'],$replays]);
runSql($db,'INSERT INTO training_items(profile_id,item,skill,completed,independent,guided,errors,replays,independent_days,last_independent_day) VALUES(?,?,?,1,?,?,?,?,?,?) ON CONFLICT(profile_id,item,skill) DO UPDATE SET completed=completed+1,independent=independent+excluded.independent,guided=guided+excluded.guided,errors=errors+excluded.errors,replays=replays+excluded.replays,independent_days=independent_days+CASE WHEN excluded.independent>0 AND COALESCE(last_independent_day,"")!=excluded.last_independent_day THEN 1 ELSE 0 END,last_independent_day=CASE WHEN excluded.independent>0 THEN excluded.last_independent_day ELSE last_independent_day END',[$tp,$q['item'],$skill,(int)$independent,(int)!$independent,(int)$session['errors'],$replays,(int)$independent,$independent?gmdate('Y-m-d'):null]);
$next=$step+1;$done=$next>=count($plan);
runSql($db,'UPDATE '.$sessionTable.' SET step=?,helped=0,errors=0,hint=0,last_attempt=NULL,completed_at=? WHERE token=?',[$next,$done?time():null,$token]);
if($done){runSql($db,'INSERT INTO training_totals(profile_id,sessions,first_day,last_day) VALUES(?,1,?,?) ON CONFLICT(profile_id) DO UPDATE SET sessions=sessions+1,last_day=excluded.last_day',[$tp,gmdate('Y-m-d'),gmdate('Y-m-d')]);trainingGrantStickers($db,$tp);}
cpRecordStep($db,$tp,'training',$token,$step,['item'=>$q['item'],'skill'=>$skill,'correct'=>true,'completed'=>true,'helped'=>!$independent,'errors'=>(int)$session['errors'],'replays'=>$replays]);
$db->exec('COMMIT');respond(['correct'=>true,'independent'=>$independent,'session'=>trainingSnapshot(trainingOwnedSession($db,$tp,$token)),'stickers'=>trainingStickers($db,$tp)]);

function trainingSchemaReady():bool{global $method,$body;return $method==='GET'?($_GET['trainingSchema']??null)==='3':($body['trainingSchema']??null)===3;}
function trainingRequireSchema():void{if(!trainingSchemaReady())fail('Queste attività richiedono la versione aggiornata del gioco. Ricarica WordyLand prima di iniziare o riprendere.',409);}
function trainingBest2WordIds():array{return ['slide','scooter','swing','shelf','cupboard','computer','tree'];}
function trainingPlanNeedsV3(string $track,string $pack,array $content):bool{
    if($track==='grammar')return in_array($pack,['best2-what-questions','best2-this-these','best2-it-they-sentences'],true);
    if($track!=='words')return false;if($pack==='best2-new-words')return true;
    foreach($content['wordPacks']??[] as $row)if(($row['id']??null)===$pack)return (bool)array_intersect($row['words']??[],trainingBest2WordIds());return false;
}
function trainingCompatibleContent(array $content,bool $capable):array{
    if($capable)return $content;
    $content['wordPacks']=array_values(array_filter($content['wordPacks']??[],fn($p)=>!trainingPlanNeedsV3('words',$p['id'],$content)));
    if(isset($content['grammarLessons']['packs']))$content['grammarLessons']['packs']=array_values(array_filter($content['grammarLessons']['packs'],fn($p)=>!trainingPlanNeedsV3('grammar',$p['id'],$content)));
    return $content;
}
function trainingMarkSession(array $s,string $table):array{
    if($table==='training_best2_word_sessions')$s['_best2WordStorage']=true;
    if($table==='training_best2_grammar_sessions')$s['_best2GrammarStorage']=true;
    return $s;
}
function trainingProgramAccessible(PDO $db,int $pid,string $kind,string $token):bool{$meta=cpSessionMetadata($db,$pid,$kind,$token);return $meta===null||($meta['accessible']??false)===true;}
function trainingReplays(array $body):int{$n=$body['replays']??0;return is_int($n)?max(0,min(20,$n)):0;}
function trainingEvidenceSkill(array $q,array $body,bool $grammar):string{
    if($grammar)return trainingGrammarSkill($q);
    $skill=match($q['mode']){'letter'=>'letter-reading.letter','recognize'=>'word-reading.meaning','build'=>'spelling.compose','recall'=>'spelling.recall','phrase'=>'phrase.match','sentence-build'=>'sentence.compose','instruction-choice'=>'instruction-reading.meaning',default=>'model.explore'};
    if(($body['audioUsed']??false)===true){if($q['mode']==='letter'&&($body['letterAudioVerified']??false)===true)return 'letter-name.letter';if($q['mode']==='recognize')return 'heard-word.meaning';if($q['mode']==='instruction-choice')return 'heard-instruction.meaning';}return $skill;
}

function trainingContent():array{$content=json_decode(file_get_contents(__DIR__.'/training.json'),true,32,JSON_THROW_ON_ERROR);$content['words']=$content['foundationWords']??$content['words'];$content['wordPacks']??=[['id'=>'first','words'=>array_column($content['words'],'id')]];return $content;}
function trainingOwnedSession(PDO $db,int $pid,string $token):array{
    $s=one($db,'SELECT * FROM training_sessions WHERE token=? AND profile_id=?',[$token,$pid]);
    if(!$s){$s=one($db,'SELECT * FROM training_grammar_sessions WHERE token=? AND profile_id=?',[$token,$pid]);if($s)$s['_grammarStorage']=true;}
    if(!$s){$s=one($db,'SELECT * FROM training_worksheet_sessions WHERE profile_id=? AND token=?',[$pid,$token]);if($s)$s['_worksheetStorage']=true;}
    if(!$s){$s=one($db,'SELECT * FROM training_best2_word_sessions WHERE profile_id=? AND token=?',[$pid,$token]);if($s)$s['_best2WordStorage']=true;}
    if(!$s){$s=one($db,'SELECT * FROM training_best2_grammar_sessions WHERE profile_id=? AND token=?',[$pid,$token]);if($s)$s['_best2GrammarStorage']=true;}
    if(!$s)fail('Allenamento non trovato.',404);
    if(($s['_best2WordStorage']??false)||($s['_best2GrammarStorage']??false))trainingRequireSchema();
    if((int)$s['created_at']<time()-604800)fail('Questo allenamento è terminato. Puoi iniziarne uno nuovo.',410);
    cpAssertSessionAccess($db,$pid,'training',$token);return $s;
}
function trainingSessionTable(array $session):string{return ($session['_best2WordStorage']??false)===true?'training_best2_word_sessions':(($session['_best2GrammarStorage']??false)===true?'training_best2_grammar_sessions':(($session['_worksheetStorage']??false)===true?'training_worksheet_sessions':(($session['_grammarStorage']??false)===true?'training_grammar_sessions':'training_sessions')));}
function trainingSnapshot(array $s):array{
    $plan=json_decode($s['plan'],true,32,JSON_THROW_ON_ERROR);$step=(int)$s['step'];
    global $db;$out=['token'=>$s['token'],'track'=>$s['track'],'step'=>$step,'total'=>count($plan),'done'=>$s['completed_at']!==null,'question'=>$plan[$step]??null,'hint'=>(int)$s['hint'],'helped'=>(bool)$s['helped'],'errors'=>(int)$s['errors']];$meta=cpSessionMetadata($db,(int)$s['profile_id'],'training',$s['token']);if($meta!==null)$out['program']=$meta;if(($s['_best2WordStorage']??false)||($s['_best2GrammarStorage']??false))$out['trainingSchema']=3;return $out;
}
function trainingFamiliar(PDO $db,int $pid,string $item,string $skill):bool{
    $r=one($db,'SELECT COALESCE(SUM(independent),0) AS successes,COALESCE(MAX(independent_days),0) AS days FROM training_items WHERE profile_id=? AND item=? AND skill=?',[$pid,$item,$skill]);
    return (int)$r['successes']>=3&&(int)$r['days']>=2;
}
function trainingLetterChoiceSets(PDO $db,int $pid,string $id,array $pair,array $content):array{
    // Reading and heard English letter names have separate practice histories.
    $known=array_column(rows($db,'SELECT DISTINCT item FROM training_items WHERE profile_id=? AND item LIKE "letter:%" AND completed>0',[$pid]),'item');
    $extra=array_values(array_filter(array_column($content['letters'],'id'),fn($letter)=>!in_array($letter,$pair,true)&&in_array('letter:'.$letter,$known,true)));shuffle($extra);
    $sets=[];
    foreach(['reading'=>'letter-reading.letter','listening'=>'letter-name.letter'] as $mode=>$skill){
        $stats=one($db,'SELECT independent,independent_days FROM training_items WHERE profile_id=? AND item=? AND skill=?',[$pid,'letter:'.$id,$skill]);
        $recent=one($db,'SELECT COALESCE(SUM(errors),0) AS errors,COALESCE(SUM(independent),0) AS independent FROM training_daily WHERE profile_id=? AND item=? AND skill=? AND day>=?',[$pid,'letter:'.$id,$skill,gmdate('Y-m-d',time()-7*86400)]);
        $three=one($db,'SELECT independent,independent_days FROM training_choice_steps WHERE profile_id=? AND item=? AND skill=? AND choice_count=3',[$pid,'letter:'.$id,$skill]);
        $count=(int)($stats['independent']??0)>=6&&(int)($stats['independent_days']??0)>=3&&(int)($three['independent']??0)>=2&&(int)($three['independent_days']??0)>=2?4:((int)($stats['independent']??0)>=3&&(int)($stats['independent_days']??0)>=2?3:2);
        if((int)$recent['errors']>=2&&(int)$recent['independent']<3)$count=2;
        $sets[$mode]=array_merge($pair,array_slice($extra,0,$count-2));shuffle($sets[$mode]);
    }
    return $sets;
}
function trainingPlan(PDO $db,int $pid,string $track,string $block,array $content,string $pack='first'):array{
    $plan=[];
    if($track==='grammar')return trainingGrammarPlan($db,$pid,$pack,$content);
    if(in_array($track,['sentences','instructions'],true)){
        $key=$track==='sentences'?'sentenceActivities':'instructionActivities';$activities=$content[$key]??[];
        if(count($activities)<3)fail('Questo percorso non è ancora disponibile.',409);
        $prefix=$track==='sentences'?'sentence:':'instruction:';
        $counts=array_column(rows($db,'SELECT item,SUM(completed) AS n FROM training_items WHERE profile_id=? GROUP BY item',[$pid]),'n','item');
        usort($activities,fn($a,$b)=>(int)($counts[$prefix.$a['id']]??0)<=>(int)($counts[$prefix.$b['id']]??0));
        foreach(array_slice($activities,0,3) as $activity){
            if($track==='sentences'){$sentence=$activity;shuffle($sentence['tokens']);$plan[]=['item'=>$prefix.$activity['id'],'mode'=>'sentence-build','sentence'=>$sentence,'answer'=>$activity['answer'],'topic'=>'piccole frasi'];}
            else{$choices=$activity['choices'];shuffle($choices);$plan[]=['item'=>$prefix.$activity['id'],'mode'=>'instruction-choice','instruction'=>['id'=>$activity['id'],'english'=>$activity['instruction'],'meaning'=>$activity['meaning']],'choices'=>$choices,'answer'=>$activity['answer'],'topic'=>'capire le consegne'];}
        }
        return $plan;
    }
    if($track==='letters'){
        $pair=$content['blocks'][array_search($block,array_column($content['blocks'],'id'),true)]['letters'];$letters=array_column($content['letters'],null,'id');
        foreach($pair as $id){$base=['item'=>'letter:'.$id,'letter'=>$letters[$id],'answer'=>$id,'choices'=>$pair,'topic'=>'nomi delle lettere'];
            if(!trainingFamiliar($db,$pid,$base['item'],'letter-name.letter'))$plan[]=$base+['mode'=>'model'];
            $choice=$base;shuffle($choice['choices']);$choice['choiceSets']=trainingLetterChoiceSets($db,$pid,$id,$pair,$content);$plan[]=$choice+['mode'=>'letter'];
        }
    }else{
        $review=array_column(rows($db,'SELECT item FROM training_daily WHERE profile_id=? AND day>=? AND skill="spelling.recall" GROUP BY item HAVING SUM(errors)>=2 OR SUM(guided)>=2',[$pid,gmdate('Y-m-d',time()-7*86400)]),'item');
        $review=array_values(array_unique(array_merge($review,array_map(fn($row)=>'word:'.$row['word'],array_filter(practiceReviewRows($db,$pid),fn($row)=>in_array('missions',$row['sources'],true))))));
        $selectedPack=$content['wordPacks'][array_search($pack,array_column($content['wordPacks'],'id'),true)];$ids=$selectedPack['words'];$pool=array_values(array_filter($content['words'],fn($w)=>in_array($w['id'],$ids,true)));if(!$pool)fail('Queste parole non sono assegnate nel programma attivo.',409);if($selectedPack['wordOnly']??false)$pool=array_map(fn($w)=>array_merge($w,['wordOnly'=>true,'phrase'=>$w['id'],'phraseMeaning'=>$w['meaning'],'gap'=>'___']),$pool);
        $words=$pool;$counts=array_column(rows($db,'SELECT item,SUM(completed) AS n FROM training_items WHERE profile_id=? GROUP BY item',[$pid]),'n','item');
        // A new worksheet rotates through its own complete set; old pack histories stay unchanged.
        if(($selectedPack['wordOnly']??false)||trainingPlanNeedsV3('words',$pack,$content)){$counts=[];$wordTable=trainingPlanNeedsV3('words',$pack,$content)?'training_best2_word_sessions':'training_sessions';foreach(rows($db,'SELECT plan,step FROM '.$wordTable.' WHERE profile_id=? AND track=? ORDER BY rowid DESC LIMIT 64',[$pid,'words:'.$pack]) as $past){$seen=[];foreach(array_slice(json_decode($past['plan'],true,32,JSON_THROW_ON_ERROR),0,(int)$past['step']) as $answered)$seen[$answered['item']]=true;foreach($seen as $item=>$unused)$counts[$item]=($counts[$item]??0)+1;}}
        usort($words,fn($a,$b)=>((int)in_array('word:'.$b['id'],$review,true)<=>(int)in_array('word:'.$a['id'],$review,true))?:((int)($counts['word:'.$a['id']]??0)<=>(int)($counts['word:'.$b['id']]??0)));
        $selected=array_slice($words,0,2);$unseen=array_values(array_filter($words,fn($w)=>(int)($counts['word:'.$w['id']]??0)===0));
        if($unseen&&!array_filter($selected,fn($w)=>(int)($counts['word:'.$w['id']]??0)===0))$selected[1]=$unseen[0];
        foreach($selected as $word){$base=['item'=>'word:'.$word['id'],'word'=>$word,'answer'=>$word['id'],'choices'=>array_slice(array_values(array_filter($pool,fn($w)=>$w['id']!==$word['id'])),0,2),'topic'=>$word['topic']];$base['choices'][]=$word;shuffle($base['choices']);
            if(!trainingFamiliar($db,$pid,$base['item'],'spelling.recall'))$plan[]=$base+['mode'=>'model'];
            foreach(['recognize','build','recall'] as $mode)$plan[]=$base+['mode'=>$mode];
        }
        $word=$selected[0];if(!($word['wordOnly']??false)){$choices=array_slice(array_values(array_filter($pool,fn($w)=>$w['id']!==$word['id'])),0,2);$choices[]=$word;shuffle($choices);$plan[]=['item'=>'word:'.$word['id'],'word'=>$word,'answer'=>$word['id'],'mode'=>'phrase','choices'=>$choices,'topic'=>'piccole frasi'];}
    }
    return $plan;
}
/** Grammar is an additive track. Existing catalogs, plans and comparison rules stay unchanged. */
function trainingGrammarNormalize(string $answer):string{
    $answer=trim(preg_replace('/\s+/u',' ',strtolower(str_replace(['’','‘',','],["'","'",' '],$answer))));
    return trim(preg_replace('/[.!?]+$/u','',$answer));
}
function trainingGrammarCorrect(array $q,string $answer):bool{
    if($q['mode']==='grammar-model')return true;
    $normal=trainingGrammarNormalize($answer);
    foreach(array_merge([$q['answer']],$q['aliases']??[]) as $candidate)if(is_string($candidate)&&trainingGrammarNormalize($candidate)===$normal)return true;
    return false;
}
function trainingGrammarSkill(array $q):string{
    return match($q['grammar']['phase']??''){
        'model'=>'model.explore',
        'number'=>'grammar.number',
        'plural-choice'=>'grammar.plural.recognize',
        'plural-write'=>'grammar.plural.write',
        'article'=>'grammar.article',
        'sentence'=>'grammar.sentence.compose',
        'question-build'=>'grammar.question.compose',
        'short-answer'=>'grammar.question.answer',
        'short-write'=>'grammar.question.write',
        'identify-build'=>'grammar.identify.compose',
        'identify-write'=>'grammar.identify.write',
        'prefix-choice'=>'grammar.subject.recognize',
        'prefix-write'=>'grammar.subject.write',
        'short-gap'=>'grammar.short-answer.complete',
        'demonstrative-choice'=>'grammar.demonstrative.recognize',
        'demonstrative-build'=>'grammar.demonstrative.compose',
        'demonstrative-write'=>'grammar.demonstrative.write',
        default=>'grammar.guided',
    };
}
function trainingGrammarQuestion(array $case,array $noun,array $pack,string $mode,string $phase):array{
    $questionBuild=$phase==='question-build';$demonstrativeChoice=$phase==='demonstrative-choice';$answer=$questionBuild?$case['question']:($demonstrativeChoice?$case['prefix']:$case['answer']);
    $choices=$case['choices']??[];if($mode==='grammar-choice')shuffle($choices);
    $tokens=$questionBuild?($case['questionTokens']??[]):($case['tokens']??[]);if($mode==='grammar-build')shuffle($tokens);
    return ['item'=>'grammar:'.$case['id'],'mode'=>$mode,'grammar'=>array_merge($case,['nounData'=>$noun,'pack'=>$pack['id'],'phase'=>$phase]),'answer'=>$answer,'aliases'=>($questionBuild||$demonstrativeChoice)?[]:($case['aliases']??[]),'choices'=>$choices,'tokens'=>$tokens,'topic'=>$pack['title']];
}
function trainingGrammarPlan(PDO $db,int $pid,string $pack,array $content):array{
    $grammar=$content['grammarLessons']??[];$packs=$grammar['packs']??[];$index=array_search($pack,array_column($packs,'id'),true);
    if($index===false)fail('Scegli un percorso di grammatica disponibile.');
    $selectedPack=$packs[$index];$cases=$selectedPack['cases']??[];$nouns=array_column($grammar['nouns']??[],null,'id');
    if(!$cases)fail('Questo percorso non è ancora disponibile.',409);
    $counts=array_column(rows($db,'SELECT item,SUM(completed) AS n FROM training_items WHERE profile_id=? AND item LIKE "grammar:%" GROUP BY item',[$pid]),'n','item');
    usort($cases,fn($a,$b)=>(int)($counts['grammar:'.$a['id']]??0)<=>(int)($counts['grammar:'.$b['id']]??0));
    $plan=[];
    foreach(array_slice($cases,0,3) as $case){
        if(!isset($nouns[$case['noun']]))fail('Questo percorso non è ancora disponibile.',409);
        $noun=$nouns[$case['noun']];$plan[]=trainingGrammarQuestion($case,$noun,$selectedPack,'grammar-model','model');
        foreach(match($case['task']){
            'number'=>[['grammar-choice','number']],
            'plural'=>[['grammar-choice','plural-choice'],['grammar-write','plural-write']],
            'article'=>[['grammar-choice','article']],
            'sentence'=>[['grammar-build','sentence']],
            'question'=>[['grammar-build','question-build'],['grammar-choice','short-answer']],
            'short-question'=>[['grammar-choice','short-answer'],['grammar-write','short-write']],
            'identify'=>[['grammar-build','identify-build'],['grammar-write','identify-write']],
            'prefix-choice'=>[['grammar-choice','prefix-choice']],
            'prefix-write'=>[['grammar-write','prefix-write']],
            'short-gap'=>[['grammar-choice','short-gap']],
            'demonstrative'=>[['grammar-choice','demonstrative-choice'],['grammar-build','demonstrative-build'],['grammar-write','demonstrative-write']],
            default=>[],
        } as [$mode,$phase])$plan[]=trainingGrammarQuestion($case,$noun,$selectedPack,$mode,$phase);
    }
    return $plan;
}
/** Existing activities only; a suggestion is neither a grade nor an exam-readiness score. */
function trainingRecommendation(array $content,array $evidence=[],array $sessions=[]):?array{
    $letters=$content['letters']??[];$words=$content['foundationWords']??$content['words']??[];$blocks=$content['blocks']??[];$packs=$content['wordPacks']??[['id'=>'first','words'=>array_column($words,'id')]];
    $valid=array_fill_keys(array_merge(array_map(fn($r)=>'letter:'.$r['id'],$letters),array_map(fn($r)=>'word:'.$r['id'],$words)),true);$counts=is_array($evidence['counts']??null)?$evidence['counts']:[];$seen=[];
    foreach(is_array($evidence['seen']??null)?$evidence['seen']:[] as $item)if(is_string($item)&&isset($valid[$item]))$seen[$item]=true;
    foreach($counts as $item=>$count)if(isset($valid[$item])&&(is_int($count)||is_float($count))&&is_finite((float)$count)&&$count>0)$seen[$item]=true;
    $target=function(mixed $track)use($blocks,$packs):?array{if(!is_string($track))return null;if(in_array($track,['sentences:basics','instructions:basics'],true))return ['kind'=>explode(':',$track)[0],'track'=>$track];if(str_starts_with($track,'letters:')){foreach($blocks as $block)if($block['id']===substr($track,8))return ['kind'=>'letters','track'=>$track,'block'=>$block['id']];return null;}$pack=$track==='words'?'first':(str_starts_with($track,'words:')?substr($track,6):null);foreach($packs as $row)if($pack!==null&&$row['id']===$pack)return ['kind'=>'words','track'=>$pack==='first'?'words':'words:'.$pack,'pack'=>$pack];return null;};
    foreach($sessions as $session){$choice=$target($session['track']??null);if($choice&&!($session['done']??false)&&is_string($session['token']??null)&&preg_match('/^[a-f0-9]{16,64}$/',$session['token'])&&is_int($session['step']??null)&&is_int($session['total']??null)&&$session['step']>=0&&$session['step']<$session['total']&&$session['total']<=12)return array_merge($choice,['kind'=>'resume','reason'=>'resume','token'=>$session['token'],'step'=>$session['step'],'total'=>$session['total']]);}
    $review=[];foreach(is_array($evidence['practice']??null)?$evidence['practice']:[] as $row){$item=$row['item']??'';$skill=$row['skill']??'';$eligible=is_string($item)&&str_starts_with($item,'letter:')?in_array($skill,['letter-reading.letter','letter-name.letter'],true):$skill==='spelling.recall';if($eligible&&isset($valid[$item],$seen[$item])&&(is_int($row['errors']??null)||is_float($row['errors']??null))&&is_finite((float)$row['errors'])&&$row['errors']>=2&&(is_int($row['errorDays']??null)||is_float($row['errorDays']??null))&&is_finite((float)$row['errorDays'])&&$row['errorDays']>=2&&(is_int($row['independent']??null)||is_float($row['independent']??null))&&is_finite((float)$row['independent'])&&$row['independent']>=0&&$row['independent']<3)$review[$item]=true;}
    $choices=[];foreach($blocks as $block)$choices[]=array_merge($target('letters:'.$block['id']),['items'=>array_map(fn($id)=>'letter:'.$id,$block['letters'])]);foreach($packs as $pack)$choices[]=array_merge($target($pack['id']==='first'?'words':'words:'.$pack['id']),['items'=>array_map(fn($id)=>'word:'.$id,$pack['words'])]);$choices=array_values(array_filter($choices,fn($choice)=>count($choice['items'])>0&&count(array_filter($choice['items'],fn($item)=>isset($valid[$item])))===count($choice['items'])));
    $selected=null;$score=0;foreach($choices as $choice){$n=count(array_filter($choice['items'],fn($item)=>isset($review[$item])));if($n>$score){$selected=$choice;$score=$n;}}if($selected){unset($selected['items']);return $selected+['reason'=>'review'];}
    $nextLetters=null;$nextWords=null;foreach($choices as $choice)if(array_filter($choice['items'],fn($item)=>!isset($seen[$item]))){if($choice['kind']==='letters'&&$nextLetters===null)$nextLetters=$choice;if($choice['kind']==='words'&&$nextWords===null)$nextWords=$choice;}
    if($nextLetters||$nextWords){$lettersSeen=count(array_filter($letters,fn($letter)=>isset($seen['letter:'.$letter['id']])));$wordsSeen=count(array_filter($words,fn($word)=>isset($seen['word:'.$word['id']])));$selected=$nextWords===null||$nextLetters!==null&&$lettersSeen<=$wordsSeen?$nextLetters:$nextWords;unset($selected['items']);return $selected+['reason'=>'new'];}
    $least=INF;foreach($choices as $choice){$n=array_sum(array_map(fn($item)=>isset($counts[$item])&&(is_int($counts[$item])||is_float($counts[$item]))&&is_finite((float)$counts[$item])?max(0,$counts[$item]):0,$choice['items']))/count($choice['items']);if($n<$least){$selected=$choice;$least=$n;}}if(!$selected)return null;unset($selected['items']);return $selected+['reason'=>'familiar'];
}
function trainingRecommendationEvidence(PDO $db,int $pid):array{
    $counts=[];foreach(rows($db,'SELECT item,SUM(completed) AS n FROM training_items WHERE profile_id=? GROUP BY item',[$pid]) as $row)$counts[$row['item']]=(int)$row['n'];
    $practice=rows($db,'SELECT item,skill,SUM(errors) AS errors,SUM(independent) AS independent,COUNT(DISTINCT CASE WHEN errors>0 THEN day END) AS errorDays FROM training_daily WHERE profile_id=? AND day>=? AND day<=? GROUP BY item,skill',[$pid,gmdate('Y-m-d',time()-7*86400),gmdate('Y-m-d')]);
    foreach($practice as &$row)foreach(['errors','independent','errorDays'] as $field)$row[$field]=(int)$row[$field];unset($row);
    return ['counts'=>$counts,'seen'=>array_keys(array_filter($counts,fn($n)=>$n>0)),'practice'=>$practice];
}

function trainingStickers(PDO $db,int $pid):array{return array_column(rows($db,'SELECT sticker FROM training_stickers WHERE profile_id=? ORDER BY earned_day,sticker',[$pid]),'sticker');}
function trainingGrantStickers(PDO $db,int $pid):void{
    $totals=one($db,'SELECT * FROM training_totals WHERE profile_id=?',[$pid]);
    $items=(int)one($db,'SELECT COUNT(DISTINCT item) AS n FROM training_items WHERE profile_id=?',[$pid])['n'];
    foreach(['first'=>(int)($totals['sessions']??0)>=1,'explore'=>$items>=4,'return'=>(int)($totals['sessions']??0)>=3&&$totals['first_day']!==$totals['last_day']] as $sticker=>$earned)if($earned)runSql($db,'INSERT OR IGNORE INTO training_stickers(profile_id,sticker,earned_day) VALUES(?,?,?)',[$pid,$sticker,gmdate('Y-m-d')]);
}
function trainingProgress(PDO $db,int $pid):array{
    $aggregate=rows($db,'SELECT * FROM training_items WHERE profile_id=?',[$pid]);
    $grammarLabels=[];
    if(array_filter($aggregate,fn($row)=>str_starts_with($row['item'],'grammar:'))){$content=trainingContent();foreach($content['grammarLessons']['packs']??[] as $pack)foreach($pack['cases']??[] as $case)$grammarLabels['grammar:'.$case['id']]=$pack['title'].' · '.$case['answer'];}
    $choicePractice=rows($db,'SELECT item,skill,choice_count,independent,independent_days FROM training_choice_steps WHERE profile_id=? ORDER BY choice_count',[$pid]);
    $daily=rows($db,'SELECT day,item,skill,completed,independent,guided,errors,replays FROM training_daily WHERE profile_id=? AND day>=? ORDER BY day,item,skill',[$pid,gmdate('Y-m-d',time()-90*86400)]);$items=[];$weeks=[];
    foreach($daily as $row){
        $week=gmdate('o-\WW',strtotime($row['day'].' UTC'));
        $weeks[$week]??=['week'=>$week,'independent'=>0,'guided'=>0,'completed'=>0];
        foreach(['completed','independent','guided'] as $field)$weeks[$week][$field]+=(int)$row[$field];
    }
    $items=[];foreach($aggregate as $row){$key=$row['item'];$items[$key]??=['item'=>$key,'completed'=>0,'independent'=>0,'guided'=>0,'errors'=>0,'replays'=>0,'skills'=>[],'days'=>[],'lastDay'=>null,'independentDays'=>0,'competencies'=>[]];$items[$key]['competencies'][]=['skill'=>$row['skill'],'completed'=>(int)$row['completed'],'independent'=>(int)$row['independent'],'guided'=>(int)$row['guided'],'errors'=>(int)$row['errors'],'replays'=>(int)$row['replays'],'independentDays'=>(int)$row['independent_days'],'choicePractice'=>array_values(array_map(fn($c)=>['choices'=>(int)$c['choice_count'],'independent'=>(int)$c['independent'],'independentDays'=>(int)$c['independent_days']],array_filter($choicePractice,fn($c)=>$c['item']===$key&&$c['skill']===$row['skill'])))];foreach(['completed','independent','guided','errors','replays'] as $field)$items[$key][$field]+=(int)$row[$field];$items[$key]['skills'][$row['skill']]=true;$items[$key]['independentDays']=max($items[$key]['independentDays'],(int)$row['independent_days']);}
    foreach($items as &$item){unset($item['days']);$item['skills']=array_keys($item['skills']);$recent=array_filter($daily,fn($r)=>$r['item']===$item['item']&&$r['day']>=gmdate('Y-m-d',time()-7*86400));$item['reviewSuggested']=array_sum(array_column($recent,'errors'))>=2&&array_sum(array_column($recent,'independent'))<3;$item['repeatedIndependently']=(bool)array_filter($item['competencies'],fn($c)=>$c['independent']>=3&&$c['independentDays']>=2);if(str_starts_with($item['item'],'grammar:'))$item['label']=$grammarLabels[$item['item']]??'Grammatica della classe';}unset($item);
    return ['profile'=>$pid,'scope'=>'owned-training-only','historyDays'=>90,'items'=>array_values($items),'weeks'=>array_values($weeks),'stickers'=>trainingStickers($db,$pid)];
}

/** Guided visual onset practice; never phoneme discrimination or pronunciation scoring. */
function phonicsContent():array{return trainingContent();}
function phonicsPlan(string $lesson,array $content):array{
    $groups=$content['phonics']['groups']??[];$index=array_search($lesson,array_column($groups,'id'),true);if($index===false)fail('Questo gruppo non è assegnato nel programma attivo.',409);$g=$groups[$index];$words=array_column($content['words'],null,'id');
    if(count($g['words']??[])<2||array_diff($g['words'],array_keys($words)))fail('Questo gruppo non contiene ancora tutte le parole assegnate.',409);
    $other=array_values(array_filter($groups,fn($x)=>$x['id']!==$lesson&&isset($words[$x['words'][0]??''])));$distractors=array_map(fn($x)=>$x['words'][0],array_slice($other,0,2));
    $optionWords=function(string $correct)use($distractors,$words):array{$ids=array_merge([$correct],$distractors);shuffle($ids);return array_map(fn($id)=>['id'=>$id,'label'=>$id,'meaning'=>$words[$id]['meaning'],'emoji'=>$words[$id]['emoji']],$ids);};
    $concept=function(string $answer)use($g,$words):array{$options=[['id'=>'name','label'=>'I nomi delle lettere'],['id'=>'sound','label'=>'I suoni nella parola']];shuffle($options);return ['kind'=>'concept','group'=>$g,'word'=>$words[$g['words'][0]],'answer'=>$answer,'options'=>$options];};
    $letters=array_merge([$g['letter']],array_column(array_slice($other,0,2),'letter'));shuffle($letters);
    $match=function(string $correct,string $anchor)use($g,$words,$optionWords):array{return ['kind'=>'match','group'=>$g,'word'=>$words[$correct],'modelWord'=>$words[$anchor],'answer'=>$correct,'options'=>$optionWords($correct)];};
    return [
      ['kind'=>'model','group'=>$g,'word'=>$words[$g['words'][0]],'answer'=>'continue','options'=>[]],$concept('name'),
      $match($g['words'][1],$g['words'][0]),
      ['kind'=>'gap','group'=>$g,'word'=>$words[$g['words'][0]],'answer'=>$g['letter'],'options'=>array_map(fn($id)=>['id'=>$id,'label'=>$id],$letters)],
      $match($g['words'][2]??$g['words'][0],$g['words'][1]),$concept('sound')
    ];
}
function phonicsEvidenceSkill(array $q):string{return match($q['kind']){'concept'=>'concept-'.$q['answer'],'match'=>'visual-initial-match','gap'=>'initial-letter',default=>'model.explore'};}
function phonicsSnapshot(array $s):array{global $db;$plan=json_decode($s['plan'],true,32,JSON_THROW_ON_ERROR);$out=['token'=>$s['token'],'lesson'=>$s['lesson'],'step'=>(int)$s['step'],'total'=>count($plan),'done'=>$s['completed_at']!==null,'question'=>$plan[(int)$s['step']]??null,'hint'=>(int)$s['hint'],'errors'=>(int)$s['errors'],'guidedOnly'=>true];$meta=cpSessionMetadata($db,(int)$s['profile_id'],'phonics',$s['token']);if($meta!==null)$out['program']=$meta;return $out;}
function phonicsOwnedSession(PDO $db,int $pid,string $token):array{$s=one($db,'SELECT * FROM phonics_sessions WHERE profile_id=? AND token=?',[$pid,$token]);if(!$s)fail('Percorso non trovato.',404);if((int)$s['created_at']<time()-604800)fail('Questo percorso è scaduto. Le attività confermate restano conservate.',410);cpAssertSessionAccess($db,$pid,'phonics',$token);return $s;}
function phonicsHandle(PDO $db,int $account,string $method,array $body,string $role,string $action):void{
    if($method!==(in_array($action,['phonics-state','phonics-progress'],true)?'GET':'POST'))fail('Metodo non consentito.',405);
    $p=ownedProfile($db,$account,$method==='GET'?($_GET['profile']??0):($body['profile']??0));$pid=(int)$p['id'];
    if($action==='phonics-progress'&&!in_array($role,['adult','admin'],true))fail('Le attività guidate sono riservate all’adulto che gestisce questo profilo.',403);
    $db->exec('CREATE TABLE IF NOT EXISTS phonics_sessions(token TEXT PRIMARY KEY,profile_id INTEGER NOT NULL REFERENCES profiles(id) ON DELETE CASCADE,lesson TEXT NOT NULL,plan TEXT NOT NULL,step INTEGER NOT NULL DEFAULT 0,hint INTEGER NOT NULL DEFAULT 0,errors INTEGER NOT NULL DEFAULT 0,last_attempt TEXT,created_at INTEGER NOT NULL,completed_at INTEGER);
    CREATE TABLE IF NOT EXISTS phonics_practice(profile_id INTEGER NOT NULL REFERENCES profiles(id) ON DELETE CASCADE,lesson TEXT NOT NULL,skill TEXT NOT NULL,completed INTEGER NOT NULL DEFAULT 0,with_help INTEGER NOT NULL DEFAULT 0,errors INTEGER NOT NULL DEFAULT 0,replays INTEGER NOT NULL DEFAULT 0,last_day TEXT NOT NULL,PRIMARY KEY(profile_id,lesson,skill));
    CREATE TABLE IF NOT EXISTS phonics_totals(profile_id INTEGER NOT NULL REFERENCES profiles(id) ON DELETE CASCADE,lesson TEXT NOT NULL,sessions INTEGER NOT NULL DEFAULT 0,last_day TEXT NOT NULL,PRIMARY KEY(profile_id,lesson));');
    if($action==='phonics-progress')respond(['profile'=>$pid,'scope'=>'owned-guided-phonics-only','guidedOnly'=>true,'assessesPronunciation'=>false,'assessesPhonemeListening'=>false,'items'=>rows($db,'SELECT lesson,skill,completed,with_help,errors,replays,last_day FROM phonics_practice WHERE profile_id=? ORDER BY lesson,skill',[$pid]),'lessons'=>rows($db,'SELECT lesson,sessions,last_day FROM phonics_totals WHERE profile_id=? ORDER BY lesson',[$pid])]);
    if($action==='phonics-state'){
      if(isset($_GET['token'])){if(!is_string($_GET['token']))fail('Percorso non valido.');respond(['session'=>phonicsSnapshot(phonicsOwnedSession($db,$pid,$_GET['token']))]);}
      respond(['sessions'=>array_map('phonicsSnapshot',array_values(array_filter(rows($db,'SELECT t.* FROM phonics_sessions t WHERE t.profile_id=? AND t.completed_at IS NULL AND t.created_at>=? AND '.cpVisibleSessionSql('phonics','t.token','t.profile_id').' ORDER BY t.rowid DESC LIMIT 4',[$pid,time()-604800]),fn($s)=>trainingProgramAccessible($db,$pid,'phonics',$s['token'])))),'lessons'=>rows($db,'SELECT lesson,sessions FROM phonics_totals WHERE profile_id=? ORDER BY lesson',[$pid])]);
    }
    if($action==='phonics-start'){
      $lesson=$body['lesson']??null;$context=cpResolveContext($db,$pid,$body);cpRequirePlayable($context);$content=cpFilterTrainingContent(phonicsContent(),$context);if(!is_string($lesson)||!in_array($lesson,array_column($content['phonics']['groups']??[],'id'),true))fail('Scegli un gruppo disponibile.');limitAttempts($db,'phonics-start:'.$pid,40);
      $db->exec('BEGIN IMMEDIATE');$context=cpResolveContext($db,$pid,$body);cpRequirePlayable($context);$content=cpFilterTrainingContent(phonicsContent(),$context);$old=null;foreach(rows($db,'SELECT * FROM phonics_sessions WHERE profile_id=? AND lesson=? AND completed_at IS NULL AND created_at>=? ORDER BY rowid DESC LIMIT 32',[$pid,$lesson,time()-604800]) as $candidate)if(cpSessionMatches($db,$pid,'phonics',$candidate['token'],$context)){$old=$candidate;break;}if($old){$db->exec('COMMIT');respond(['session'=>phonicsSnapshot($old)]);}
      $token=bin2hex(random_bytes(24));runSql($db,'INSERT INTO phonics_sessions(token,profile_id,lesson,plan,created_at) VALUES(?,?,?,?,?)',[$token,$pid,$lesson,json_encode(phonicsPlan($lesson,$content),JSON_THROW_ON_ERROR),time()]);cpBindSession($db,$pid,'phonics',$token,$context);runSql($db,'DELETE FROM phonics_sessions WHERE profile_id=? AND created_at<?',[$pid,time()-2592000]);$db->exec('COMMIT');respond(['session'=>phonicsSnapshot(phonicsOwnedSession($db,$pid,$token))]);
    }
    $token=is_string($body['token']??null)?$body['token']:'';$step=$body['step']??null;if(!is_int($step)||$step<0)fail('Attività non valida.');phonicsOwnedSession($db,$pid,$token);
    $db->exec('BEGIN IMMEDIATE');$s=phonicsOwnedSession($db,$pid,$token);if($step>(int)$s['step']){$db->exec('ROLLBACK');fail('Riprendi l’attività corrente.',409);}if($step<(int)$s['step']||$s['completed_at']!==null){$db->exec('COMMIT');respond(['replayed'=>true,'session'=>phonicsSnapshot($s)]);}
    if($action==='phonics-hint'){$level=$body['level']??1;if(!is_int($level)||!in_array($level,[1,2],true)){$db->exec('ROLLBACK');fail('Aiuto non valido.');}runSql($db,'UPDATE phonics_sessions SET hint=MAX(hint,CAST(? AS INTEGER)) WHERE token=?',[$level,$token]);$db->exec('COMMIT');respond(['session'=>phonicsSnapshot(phonicsOwnedSession($db,$pid,$token))]);}
    $attempt=$body['attempt']??null;$answer=$body['answer']??null;if(!is_string($attempt)||!preg_match('/^[a-f0-9]{16,64}$/',$attempt)||!is_string($answer)||strlen($answer)>100){$db->exec('ROLLBACK');fail('Risposta non valida.');}
    if($s['last_attempt']===$attempt){$db->exec('COMMIT');respond(['correct'=>false,'replayed'=>true,'session'=>phonicsSnapshot($s)]);}
    $plan=json_decode($s['plan'],true,32,JSON_THROW_ON_ERROR);$q=$plan[$step];$correct=$q['kind']==='model'||normalWord($q['answer'])===normalWord($answer);
    if(!$correct){runSql($db,'UPDATE phonics_sessions SET errors=errors+1,hint=MAX(hint,CAST(? AS INTEGER)),last_attempt=? WHERE token=?',[(int)$s['errors']>=1?2:0,$attempt,$token]);cpRecordStep($db,$pid,'phonics',$token,$step,['item'=>'phonics:'.$s['lesson'],'skill'=>phonicsEvidenceSkill($q),'correct'=>false,'completed'=>false,'helped'=>true,'errors'=>(int)$s['errors']+1,'replays'=>trainingReplays($body)]);$db->exec('COMMIT');respond(['correct'=>false,'session'=>phonicsSnapshot(phonicsOwnedSession($db,$pid,$token))]);}
    $skill=match($q['kind']){'concept'=>'concept-'.$q['answer'],'match'=>'visual-initial-match','gap'=>'initial-letter',default=>'guided-model'};
    $replays=is_int($body['replays']??null)?max(0,min(20,$body['replays'])):0;$help=(int)$s['hint']>0||(int)$s['errors']>0||($body['helped']??false)===true;
    runSql($db,'INSERT INTO phonics_practice(profile_id,lesson,skill,completed,with_help,errors,replays,last_day) VALUES(?,?,?,1,?,?,?,?) ON CONFLICT(profile_id,lesson,skill) DO UPDATE SET completed=completed+1,with_help=with_help+excluded.with_help,errors=errors+excluded.errors,replays=replays+excluded.replays,last_day=excluded.last_day',[$pid,$s['lesson'],$skill,(int)$help,(int)$s['errors'],$replays,gmdate('Y-m-d')]);
    $next=$step+1;$done=$next===count($plan);runSql($db,'UPDATE phonics_sessions SET step=?,hint=0,errors=0,last_attempt=NULL,completed_at=? WHERE token=?',[$next,$done?time():null,$token]);if($done)runSql($db,'INSERT INTO phonics_totals(profile_id,lesson,sessions,last_day) VALUES(?,?,1,?) ON CONFLICT(profile_id,lesson) DO UPDATE SET sessions=sessions+1,last_day=excluded.last_day',[$pid,$s['lesson'],gmdate('Y-m-d')]);cpRecordStep($db,$pid,'phonics',$token,$step,['item'=>'phonics:'.$s['lesson'],'skill'=>phonicsEvidenceSkill($q),'correct'=>true,'completed'=>true,'helped'=>true,'errors'=>(int)$s['errors'],'replays'=>$replays]);$db->exec('COMMIT');respond(['correct'=>true,'guidedOnly'=>true,'independent'=>false,'session'=>phonicsSnapshot(phonicsOwnedSession($db,$pid,$token))]);
}
