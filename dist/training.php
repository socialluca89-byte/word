<?php
/** Private profile training. No wallet, points, rankings, diagnosis, or recorded voice. */
declare(strict_types=1);
if(!defined('WORDYLAND_BOOTSTRAPPED')){http_response_code(404);exit;}
if(in_array($action,['phonics-state','phonics-start','phonics-hint','phonics-answer','phonics-progress'],true))phonicsHandle($db,$id,$method,$body,$accountRole,$action);
$trainingActions=['training-state','training-start','training-hint','training-answer','training-progress'];
if(!in_array($action,$trainingActions,true))return;
$db->exec('CREATE TABLE IF NOT EXISTS training_totals(profile_id INTEGER PRIMARY KEY REFERENCES profiles(id) ON DELETE CASCADE,sessions INTEGER NOT NULL,first_day TEXT NOT NULL,last_day TEXT NOT NULL);
CREATE TABLE IF NOT EXISTS training_items(profile_id INTEGER NOT NULL REFERENCES profiles(id) ON DELETE CASCADE,item TEXT NOT NULL,skill TEXT NOT NULL,completed INTEGER NOT NULL DEFAULT 0,independent INTEGER NOT NULL DEFAULT 0,guided INTEGER NOT NULL DEFAULT 0,errors INTEGER NOT NULL DEFAULT 0,replays INTEGER NOT NULL DEFAULT 0,independent_days INTEGER NOT NULL DEFAULT 0,last_independent_day TEXT,PRIMARY KEY(profile_id,item,skill));
CREATE TABLE IF NOT EXISTS training_sessions(token TEXT PRIMARY KEY,profile_id INTEGER NOT NULL REFERENCES profiles(id) ON DELETE CASCADE,track TEXT NOT NULL,plan TEXT NOT NULL,step INTEGER NOT NULL DEFAULT 0,helped INTEGER NOT NULL DEFAULT 0,errors INTEGER NOT NULL DEFAULT 0,hint INTEGER NOT NULL DEFAULT 0,last_attempt TEXT,created_at INTEGER NOT NULL,completed_at INTEGER);
CREATE TABLE IF NOT EXISTS training_daily(profile_id INTEGER NOT NULL REFERENCES profiles(id) ON DELETE CASCADE,day TEXT NOT NULL,item TEXT NOT NULL,skill TEXT NOT NULL,completed INTEGER NOT NULL DEFAULT 0,independent INTEGER NOT NULL DEFAULT 0,guided INTEGER NOT NULL DEFAULT 0,errors INTEGER NOT NULL DEFAULT 0,replays INTEGER NOT NULL DEFAULT 0,PRIMARY KEY(profile_id,day,item,skill));
CREATE TABLE IF NOT EXISTS training_stickers(profile_id INTEGER NOT NULL REFERENCES profiles(id) ON DELETE CASCADE,sticker TEXT NOT NULL,earned_day TEXT NOT NULL,PRIMARY KEY(profile_id,sticker));');
$db->exec('CREATE TABLE IF NOT EXISTS training_choice_steps(profile_id INTEGER NOT NULL REFERENCES profiles(id) ON DELETE CASCADE,item TEXT NOT NULL,skill TEXT NOT NULL,choice_count INTEGER NOT NULL CHECK(choice_count IN (3,4)),independent INTEGER NOT NULL DEFAULT 0,independent_days INTEGER NOT NULL DEFAULT 0,last_day TEXT NOT NULL,PRIMARY KEY(profile_id,item,skill,choice_count));');
$trainingProfile=ownedProfile($db,$id,$method==='GET'?($_GET['profile']??0):($body['profile']??0));$tp=(int)$trainingProfile['id'];
if($action==='training-progress'){
    if(!in_array($accountRole,['adult','admin'],true))fail('I progressi sono riservati all’adulto che gestisce i propri profili.',403);
    if($method!=='GET')fail('Metodo non consentito.',405);
    respond(trainingProgress($db,$tp));
}
if($action==='training-state'){
    if($method!=='GET')fail('Metodo non consentito.',405);
    if(isset($_GET['token']))respond(['session'=>trainingSnapshot(trainingOwnedSession($db,$tp,(string)$_GET['token'])),'stickers'=>trainingStickers($db,$tp)]);
    $active=rows($db,'SELECT * FROM training_sessions WHERE profile_id=? AND completed_at IS NULL AND created_at>=? ORDER BY rowid DESC LIMIT 32',[$tp,time()-604800]);
    respond(['sessions'=>array_map('trainingSnapshot',$active),'stickers'=>trainingStickers($db,$tp)]);
}
if($method!=='POST')fail('Metodo non consentito.',405);
if($action==='training-start'){
    $track=$body['track']??'letters';$block=$body['block']??'ae';$content=trainingContent();
    if(!in_array($track,['letters','words'],true))fail('Scegli un percorso disponibile.');
    if($track==='letters'&&!in_array($block,array_column($content['blocks'],'id'),true))fail('Scegli un blocco disponibile.');
    $pack=$track==='words'?($body['pack']??'first'):'first';
    if($track==='words'&&(!is_string($pack)||!in_array($pack,array_column($content['wordPacks'],'id'),true)))fail('Scegli un gruppo di parole disponibile.');
    $key=$track==='letters'?'letters:'.$block:($pack==='first'?'words':'words:'.$pack);limitAttempts($db,'training-start:'.$tp,60);
    $db->exec('BEGIN IMMEDIATE');
    $old=one($db,'SELECT * FROM training_sessions WHERE profile_id=? AND track=? AND completed_at IS NULL AND created_at>=? ORDER BY rowid DESC LIMIT 1',[$tp,$key,time()-604800]);
    if($old){$db->exec('COMMIT');respond(['session'=>trainingSnapshot($old),'stickers'=>trainingStickers($db,$tp)]);}
    $plan=trainingPlan($db,$tp,$track,$block,$content,$pack);$token=bin2hex(random_bytes(24));
    runSql($db,'INSERT INTO training_sessions(token,profile_id,track,plan,created_at) VALUES(?,?,?,?,?)',[$token,$tp,$key,json_encode($plan,JSON_THROW_ON_ERROR),time()]);
    // Only the new training data has retention; no game/account/progress table is pruned.
    runSql($db,'DELETE FROM training_sessions WHERE profile_id=? AND created_at<?',[$tp,time()-2592000]);
    runSql($db,'DELETE FROM training_daily WHERE profile_id=? AND day<?',[$tp,gmdate('Y-m-d',time()-90*86400)]);
    $db->exec('COMMIT');respond(['session'=>trainingSnapshot(trainingOwnedSession($db,$tp,$token)),'stickers'=>trainingStickers($db,$tp)]);
}
$token=is_string($body['token']??null)?$body['token']:'';$step=$body['step']??null;
if(!is_int($step)||$step<0)fail('Domanda non valida.');
$session=trainingOwnedSession($db,$tp,$token);
$db->exec('BEGIN IMMEDIATE');$session=trainingOwnedSession($db,$tp,$token);
if($step>(int)$session['step']){$db->exec('ROLLBACK');fail('Riprendi la domanda corrente.',409);}
if($step<(int)$session['step']||$session['completed_at']!==null){$db->exec('COMMIT');respond(['replayed'=>true,'session'=>trainingSnapshot($session),'stickers'=>trainingStickers($db,$tp)]);}
if($step!==(int)$session['step']){$db->exec('ROLLBACK');fail('Riprendi la domanda corrente.',409);}
if($action==='training-hint'){
    $level=$body['level']??1;if(!is_int($level)||!in_array($level,[1,2],true)){$db->exec('ROLLBACK');fail('Aiuto non valido.');}
    runSql($db,'UPDATE training_sessions SET helped=1,hint=MAX(hint,CAST(? AS INTEGER)) WHERE token=?',[$level,$token]);$db->exec('COMMIT');
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
$correct=$q['mode']==='model'||normalWord($answer)===normalWord($q['answer']);
if(!$correct){runSql($db,'UPDATE training_sessions SET errors=errors+1,helped=MAX(helped,?),last_attempt=? WHERE token=?',[(int)(($body['helped']??false)===true),$attempt,$token]);$db->exec('COMMIT');respond(['correct'=>false,'session'=>trainingSnapshot(trainingOwnedSession($db,$tp,$token))]);}
$helped=(int)$session['helped']===1||($body['helped']??false)===true||in_array($q['mode'],['model','build'],true);
$independent=!$helped&&(int)$session['errors']===0;
$audio=($body['audioUsed']??false)===true;
$skill=match($q['mode']){'letter'=>'letter-reading.letter','recognize'=>'word-reading.meaning','build'=>'spelling.compose','recall'=>'spelling.recall','phrase'=>'phrase.match',default=>'model.explore'};
if($audio&&$q['mode']==='letter'&&($body['letterAudioVerified']??false)===true)$skill='letter-name.letter';
if($audio&&$q['mode']==='recognize')$skill='heard-word.meaning';
if($q['mode']==='letter'&&$independent&&$choiceCount>=3){
    runSql($db,'INSERT INTO training_choice_steps(profile_id,item,skill,choice_count,independent,independent_days,last_day) VALUES(?,?,?,?,1,1,?) ON CONFLICT(profile_id,item,skill,choice_count) DO UPDATE SET independent=independent+1,independent_days=independent_days+CASE WHEN last_day!=excluded.last_day THEN 1 ELSE 0 END,last_day=excluded.last_day',[$tp,$q['item'],$skill,$choiceCount,gmdate('Y-m-d')]);
}
$replays=$body['replays']??0;$replays=is_int($replays)?max(0,min(20,$replays)):0;
runSql($db,'INSERT INTO training_daily(profile_id,day,item,skill,completed,independent,guided,errors,replays) VALUES(?,?,?,?,1,?,?,?,?) ON CONFLICT(profile_id,day,item,skill) DO UPDATE SET completed=completed+1,independent=independent+excluded.independent,guided=guided+excluded.guided,errors=errors+excluded.errors,replays=replays+excluded.replays',[$tp,gmdate('Y-m-d'),$q['item'],$skill,(int)$independent,(int)!$independent,(int)$session['errors'],$replays]);
runSql($db,'INSERT INTO training_items(profile_id,item,skill,completed,independent,guided,errors,replays,independent_days,last_independent_day) VALUES(?,?,?,1,?,?,?,?,?,?) ON CONFLICT(profile_id,item,skill) DO UPDATE SET completed=completed+1,independent=independent+excluded.independent,guided=guided+excluded.guided,errors=errors+excluded.errors,replays=replays+excluded.replays,independent_days=independent_days+CASE WHEN excluded.independent>0 AND COALESCE(last_independent_day,"")!=excluded.last_independent_day THEN 1 ELSE 0 END,last_independent_day=CASE WHEN excluded.independent>0 THEN excluded.last_independent_day ELSE last_independent_day END',[$tp,$q['item'],$skill,(int)$independent,(int)!$independent,(int)$session['errors'],$replays,(int)$independent,$independent?gmdate('Y-m-d'):null]);
$next=$step+1;$done=$next>=count($plan);
runSql($db,'UPDATE training_sessions SET step=?,helped=0,errors=0,hint=0,last_attempt=NULL,completed_at=? WHERE token=?',[$next,$done?time():null,$token]);
if($done){runSql($db,'INSERT INTO training_totals(profile_id,sessions,first_day,last_day) VALUES(?,1,?,?) ON CONFLICT(profile_id) DO UPDATE SET sessions=sessions+1,last_day=excluded.last_day',[$tp,gmdate('Y-m-d'),gmdate('Y-m-d')]);trainingGrantStickers($db,$tp);}
$db->exec('COMMIT');respond(['correct'=>true,'independent'=>$independent,'session'=>trainingSnapshot(trainingOwnedSession($db,$tp,$token)),'stickers'=>trainingStickers($db,$tp)]);

function trainingContent():array{$content=json_decode(file_get_contents(__DIR__.'/training.json'),true,32,JSON_THROW_ON_ERROR);$content['words']=$content['foundationWords']??$content['words'];$content['wordPacks']??=[['id'=>'first','words'=>array_column($content['words'],'id')]];return $content;}
function trainingOwnedSession(PDO $db,int $pid,string $token):array{
    $s=one($db,'SELECT * FROM training_sessions WHERE token=? AND profile_id=?',[$token,$pid]);
    if(!$s)fail('Allenamento non trovato.',404);
    if((int)$s['created_at']<time()-604800)fail('Questo allenamento è terminato. Puoi iniziarne uno nuovo.',410);
    return $s;
}
function trainingSnapshot(array $s):array{
    $plan=json_decode($s['plan'],true,32,JSON_THROW_ON_ERROR);$step=(int)$s['step'];
    return ['token'=>$s['token'],'track'=>$s['track'],'step'=>$step,'total'=>count($plan),'done'=>$s['completed_at']!==null,'question'=>$plan[$step]??null,'hint'=>(int)$s['hint'],'helped'=>(bool)$s['helped'],'errors'=>(int)$s['errors']];
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
    if($track==='letters'){
        $pair=$content['blocks'][array_search($block,array_column($content['blocks'],'id'),true)]['letters'];$letters=array_column($content['letters'],null,'id');
        foreach($pair as $id){$base=['item'=>'letter:'.$id,'letter'=>$letters[$id],'answer'=>$id,'choices'=>$pair,'topic'=>'nomi delle lettere'];
            if(!trainingFamiliar($db,$pid,$base['item'],'letter-name.letter'))$plan[]=$base+['mode'=>'model'];
            $choice=$base;shuffle($choice['choices']);$choice['choiceSets']=trainingLetterChoiceSets($db,$pid,$id,$pair,$content);$plan[]=$choice+['mode'=>'letter'];
        }
    }else{
        $review=array_column(rows($db,'SELECT item FROM training_daily WHERE profile_id=? AND day>=? AND skill="spelling.recall" GROUP BY item HAVING SUM(errors)>=2 OR SUM(guided)>=2',[$pid,gmdate('Y-m-d',time()-7*86400)]),'item');
        $ids=$content['wordPacks'][array_search($pack,array_column($content['wordPacks'],'id'),true)]['words'];$pool=array_values(array_filter($content['words'],fn($w)=>in_array($w['id'],$ids,true)));
        $words=$pool;$counts=array_column(rows($db,'SELECT item,SUM(completed) AS n FROM training_items WHERE profile_id=? GROUP BY item',[$pid]),'n','item');
        usort($words,fn($a,$b)=>((int)in_array('word:'.$b['id'],$review,true)<=>(int)in_array('word:'.$a['id'],$review,true))?:((int)($counts['word:'.$a['id']]??0)<=>(int)($counts['word:'.$b['id']]??0)));
        $selected=array_slice($words,0,2);$unseen=array_values(array_filter($words,fn($w)=>(int)($counts['word:'.$w['id']]??0)===0));
        if($unseen&&!array_filter($selected,fn($w)=>(int)($counts['word:'.$w['id']]??0)===0))$selected[1]=$unseen[0];
        foreach($selected as $word){$base=['item'=>'word:'.$word['id'],'word'=>$word,'answer'=>$word['id'],'choices'=>array_slice(array_values(array_filter($pool,fn($w)=>$w['id']!==$word['id'])),0,2),'topic'=>$word['topic']];$base['choices'][]=$word;shuffle($base['choices']);
            if(!trainingFamiliar($db,$pid,$base['item'],'spelling.recall'))$plan[]=$base+['mode'=>'model'];
            foreach(['recognize','build','recall'] as $mode)$plan[]=$base+['mode'=>$mode];
        }
        $word=$selected[0];$choices=array_slice(array_values(array_filter($pool,fn($w)=>$w['id']!==$word['id'])),0,2);$choices[]=$word;shuffle($choices);$plan[]=['item'=>'word:'.$word['id'],'word'=>$word,'answer'=>$word['id'],'mode'=>'phrase','choices'=>$choices,'topic'=>'piccole frasi'];
    }
    return $plan;
}
function trainingStickers(PDO $db,int $pid):array{return array_column(rows($db,'SELECT sticker FROM training_stickers WHERE profile_id=? ORDER BY earned_day,sticker',[$pid]),'sticker');}
function trainingGrantStickers(PDO $db,int $pid):void{
    $totals=one($db,'SELECT * FROM training_totals WHERE profile_id=?',[$pid]);
    $items=(int)one($db,'SELECT COUNT(DISTINCT item) AS n FROM training_items WHERE profile_id=?',[$pid])['n'];
    foreach(['first'=>(int)($totals['sessions']??0)>=1,'explore'=>$items>=4,'return'=>(int)($totals['sessions']??0)>=3&&$totals['first_day']!==$totals['last_day']] as $sticker=>$earned)if($earned)runSql($db,'INSERT OR IGNORE INTO training_stickers(profile_id,sticker,earned_day) VALUES(?,?,?)',[$pid,$sticker,gmdate('Y-m-d')]);
}
function trainingProgress(PDO $db,int $pid):array{
    $aggregate=rows($db,'SELECT * FROM training_items WHERE profile_id=?',[$pid]);
    $choicePractice=rows($db,'SELECT item,skill,choice_count,independent,independent_days FROM training_choice_steps WHERE profile_id=? ORDER BY choice_count',[$pid]);
    $daily=rows($db,'SELECT day,item,skill,completed,independent,guided,errors,replays FROM training_daily WHERE profile_id=? AND day>=? ORDER BY day,item,skill',[$pid,gmdate('Y-m-d',time()-90*86400)]);$items=[];$weeks=[];
    foreach($daily as $row){
        $week=gmdate('o-\WW',strtotime($row['day'].' UTC'));
        $weeks[$week]??=['week'=>$week,'independent'=>0,'guided'=>0,'completed'=>0];
        foreach(['completed','independent','guided'] as $field)$weeks[$week][$field]+=(int)$row[$field];
    }
    $items=[];foreach($aggregate as $row){$key=$row['item'];$items[$key]??=['item'=>$key,'completed'=>0,'independent'=>0,'guided'=>0,'errors'=>0,'replays'=>0,'skills'=>[],'days'=>[],'lastDay'=>null,'independentDays'=>0,'competencies'=>[]];$items[$key]['competencies'][]=['skill'=>$row['skill'],'completed'=>(int)$row['completed'],'independent'=>(int)$row['independent'],'guided'=>(int)$row['guided'],'errors'=>(int)$row['errors'],'replays'=>(int)$row['replays'],'independentDays'=>(int)$row['independent_days'],'choicePractice'=>array_values(array_map(fn($c)=>['choices'=>(int)$c['choice_count'],'independent'=>(int)$c['independent'],'independentDays'=>(int)$c['independent_days']],array_filter($choicePractice,fn($c)=>$c['item']===$key&&$c['skill']===$row['skill'])))];foreach(['completed','independent','guided','errors','replays'] as $field)$items[$key][$field]+=(int)$row[$field];$items[$key]['skills'][$row['skill']]=true;$items[$key]['independentDays']=max($items[$key]['independentDays'],(int)$row['independent_days']);}
    foreach($items as &$item){unset($item['days']);$item['skills']=array_keys($item['skills']);$recent=array_filter($daily,fn($r)=>$r['item']===$item['item']&&$r['day']>=gmdate('Y-m-d',time()-7*86400));$item['reviewSuggested']=array_sum(array_column($recent,'errors'))>=2&&array_sum(array_column($recent,'independent'))<3;$item['repeatedIndependently']=(bool)array_filter($item['competencies'],fn($c)=>$c['independent']>=3&&$c['independentDays']>=2);}unset($item);
    return ['profile'=>$pid,'scope'=>'owned-training-only','historyDays'=>90,'items'=>array_values($items),'weeks'=>array_values($weeks),'stickers'=>trainingStickers($db,$pid)];
}

/** Guided visual onset practice; never phoneme discrimination or pronunciation scoring. */
function phonicsContent():array{return trainingContent();}
function phonicsPlan(string $lesson,array $content):array{
    $groups=$content['phonics']['groups'];$g=$groups[array_search($lesson,array_column($groups,'id'),true)];$words=array_column($content['words'],null,'id');
    $other=array_values(array_filter($groups,fn($x)=>$x['id']!==$lesson));$distractors=array_map(fn($x)=>$x['words'][0],array_slice($other,0,2));
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
function phonicsSnapshot(array $s):array{$plan=json_decode($s['plan'],true,32,JSON_THROW_ON_ERROR);return ['token'=>$s['token'],'lesson'=>$s['lesson'],'step'=>(int)$s['step'],'total'=>count($plan),'done'=>$s['completed_at']!==null,'question'=>$plan[(int)$s['step']]??null,'hint'=>(int)$s['hint'],'errors'=>(int)$s['errors'],'guidedOnly'=>true];}
function phonicsOwnedSession(PDO $db,int $pid,string $token):array{$s=one($db,'SELECT * FROM phonics_sessions WHERE profile_id=? AND token=?',[$pid,$token]);if(!$s)fail('Percorso non trovato.',404);if((int)$s['created_at']<time()-604800)fail('Questo percorso è scaduto. Le attività confermate restano conservate.',410);return $s;}
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
      respond(['sessions'=>array_map('phonicsSnapshot',rows($db,'SELECT * FROM phonics_sessions WHERE profile_id=? AND completed_at IS NULL AND created_at>=? ORDER BY rowid DESC LIMIT 4',[$pid,time()-604800])),'lessons'=>rows($db,'SELECT lesson,sessions FROM phonics_totals WHERE profile_id=? ORDER BY lesson',[$pid])]);
    }
    if($action==='phonics-start'){
      $lesson=$body['lesson']??null;$content=phonicsContent();if(!is_string($lesson)||!in_array($lesson,array_column($content['phonics']['groups'],'id'),true))fail('Scegli un gruppo disponibile.');limitAttempts($db,'phonics-start:'.$pid,40);
      $db->exec('BEGIN IMMEDIATE');$old=one($db,'SELECT * FROM phonics_sessions WHERE profile_id=? AND lesson=? AND completed_at IS NULL AND created_at>=? ORDER BY rowid DESC LIMIT 1',[$pid,$lesson,time()-604800]);if($old){$db->exec('COMMIT');respond(['session'=>phonicsSnapshot($old)]);}
      $token=bin2hex(random_bytes(24));runSql($db,'INSERT INTO phonics_sessions(token,profile_id,lesson,plan,created_at) VALUES(?,?,?,?,?)',[$token,$pid,$lesson,json_encode(phonicsPlan($lesson,$content),JSON_THROW_ON_ERROR),time()]);runSql($db,'DELETE FROM phonics_sessions WHERE profile_id=? AND created_at<?',[$pid,time()-2592000]);$db->exec('COMMIT');respond(['session'=>phonicsSnapshot(phonicsOwnedSession($db,$pid,$token))]);
    }
    $token=is_string($body['token']??null)?$body['token']:'';$step=$body['step']??null;if(!is_int($step)||$step<0)fail('Attività non valida.');phonicsOwnedSession($db,$pid,$token);
    $db->exec('BEGIN IMMEDIATE');$s=phonicsOwnedSession($db,$pid,$token);if($step>(int)$s['step']){$db->exec('ROLLBACK');fail('Riprendi l’attività corrente.',409);}if($step<(int)$s['step']||$s['completed_at']!==null){$db->exec('COMMIT');respond(['replayed'=>true,'session'=>phonicsSnapshot($s)]);}
    if($action==='phonics-hint'){$level=$body['level']??1;if(!is_int($level)||!in_array($level,[1,2],true)){$db->exec('ROLLBACK');fail('Aiuto non valido.');}runSql($db,'UPDATE phonics_sessions SET hint=MAX(hint,CAST(? AS INTEGER)) WHERE token=?',[$level,$token]);$db->exec('COMMIT');respond(['session'=>phonicsSnapshot(phonicsOwnedSession($db,$pid,$token))]);}
    $attempt=$body['attempt']??null;$answer=$body['answer']??null;if(!is_string($attempt)||!preg_match('/^[a-f0-9]{16,64}$/',$attempt)||!is_string($answer)||strlen($answer)>100){$db->exec('ROLLBACK');fail('Risposta non valida.');}
    if($s['last_attempt']===$attempt){$db->exec('COMMIT');respond(['correct'=>false,'replayed'=>true,'session'=>phonicsSnapshot($s)]);}
    $plan=json_decode($s['plan'],true,32,JSON_THROW_ON_ERROR);$q=$plan[$step];$correct=$q['kind']==='model'||normalWord($q['answer'])===normalWord($answer);
    if(!$correct){runSql($db,'UPDATE phonics_sessions SET errors=errors+1,hint=MAX(hint,CAST(? AS INTEGER)),last_attempt=? WHERE token=?',[(int)$s['errors']>=1?2:0,$attempt,$token]);$db->exec('COMMIT');respond(['correct'=>false,'session'=>phonicsSnapshot(phonicsOwnedSession($db,$pid,$token))]);}
    $skill=match($q['kind']){'concept'=>'concept-'.$q['answer'],'match'=>'visual-initial-match','gap'=>'initial-letter',default=>'guided-model'};
    $replays=is_int($body['replays']??null)?max(0,min(20,$body['replays'])):0;$help=(int)$s['hint']>0||(int)$s['errors']>0||($body['helped']??false)===true;
    runSql($db,'INSERT INTO phonics_practice(profile_id,lesson,skill,completed,with_help,errors,replays,last_day) VALUES(?,?,?,1,?,?,?,?) ON CONFLICT(profile_id,lesson,skill) DO UPDATE SET completed=completed+1,with_help=with_help+excluded.with_help,errors=errors+excluded.errors,replays=replays+excluded.replays,last_day=excluded.last_day',[$pid,$s['lesson'],$skill,(int)$help,(int)$s['errors'],$replays,gmdate('Y-m-d')]);
    $next=$step+1;$done=$next===count($plan);runSql($db,'UPDATE phonics_sessions SET step=?,hint=0,errors=0,last_attempt=NULL,completed_at=? WHERE token=?',[$next,$done?time():null,$token]);if($done)runSql($db,'INSERT INTO phonics_totals(profile_id,lesson,sessions,last_day) VALUES(?,?,1,?) ON CONFLICT(profile_id,lesson) DO UPDATE SET sessions=sessions+1,last_day=excluded.last_day',[$pid,$s['lesson'],gmdate('Y-m-d')]);$db->exec('COMMIT');respond(['correct'=>true,'guidedOnly'=>true,'independent'=>false,'session'=>phonicsSnapshot(phonicsOwnedSession($db,$pid,$token))]);
}
